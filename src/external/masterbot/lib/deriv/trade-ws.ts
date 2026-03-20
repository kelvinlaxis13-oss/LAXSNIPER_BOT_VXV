import { ConnectionStatus, TickData, DerivMessage } from './types';
import { api_base } from '../../../bot-skeleton/services/api/api-base';

/**
 * TradeWS - Dedicated WebSocket for Direct Trade Execution
 * 
 * Rules:
 * 1. Proposal -> Buy -> POC (Subscribe)
 * 2. Instant Results (is_sold === 1)
 * 3. Heartbeat: 15s
 * 4. Reconnect: 1s -> 2s -> 4s -> 8s -> 15s (cap 30s)
 */
class TradeWS {
    private socket: WebSocket | null = null;
    private appId: string = '123448';
    private token: string | null = null;
    private status: ConnectionStatus = 'disconnected';
    private isAuthorized = false;
    private isAuthorizing = false;
    private eventListeners: ((type: string, data: any) => void)[] = [];
    private getState: (() => any) | null = null;

    public init(getState: () => any) {
        this.getState = getState;
    }

    public clearListeners() {
        this.eventListeners = [];
    }

    // Trade Pool: Support Concurrent Execution
    private tradePool = new Map<string, {
        requestId: string;
        startTime: number;
        proposalSentTime?: number;
        proposalRecvTime?: number;
        buySentTime?: number;
        buyRecvTime?: number;
        settleRecvTime?: number;
        contractId?: number;
    }>();

    // Reconnection State
    private reconnectAttempts = 0;
    private heartbeatTimer: NodeJS.Timeout | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '123448';
        }
    }

    public disconnect() {
        console.log('[TradeWS] Manually Disconnecting...');
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.onclose = null; // Prevent reconnect loop
            this.socket.close();
            this.socket = null;
        }
        this.status = 'disconnected';
        this.isAuthorized = false;
        this.isAuthorizing = false;

        // Mark pending trades as ERROR before clearing
        const store = this.getState ? this.getState() : null;
        if (store) {
            this.tradePool.forEach((trade, id) => {
                store.updateTradeLog(id, { result: 'ERROR', error: 'Disconnected manually' });
            });
        }
        this.tradePool.clear(); // Clear all pending trades

        if (store) {
            store.setTradeWsStatus('disconnected');
            store.setTradeAuthorized(false);
        }
    }

    public connect() {
        this.updateStatus('connecting');

        // Use site's shared connection if available
        if (api_base.api?.connection && api_base.api.connection.readyState <= 1) {
            console.log('[TradeWS] Hooking into site shared connection...');
            this.socket = api_base.api.connection as WebSocket;
            this.setupSocketHandlers();
            this.updateStatus('connected');
            
            // Auto-authorize if we have a token
            const store = this.getState ? this.getState() : null;
            const token = store ? store.token : null;
            if (token) this.authorize(token);
            return;
        }

        try {
            this.socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`);
            this.setupSocketHandlers();
        } catch (e) {
            console.error('[TradeWS] Failed to create socket:', e);
            this.handleReconnect();
        }
    }

    private setupSocketHandlers() {
        if (!this.socket) return;

        this.socket.addEventListener('open', () => {
            console.log('[TradeWS] Connection Opened');
            this.updateStatus('connected');
            this.reconnectAttempts = 0;
            this.startHeartbeat();

            // Auto-authorize if we have a token
            const store = this.getState ? this.getState() : null;
            const token = store ? store.token : null;
            if (token) this.authorize(token);
        });

        this.socket.addEventListener('message', (event) => {
            this.handleMessage(JSON.parse(event.data));
        });

        this.socket.addEventListener('close', (e) => {
            console.warn(`[TradeWS] Connection Closed. Code: ${e.code}, Reason: ${e.reason || 'None'}`);
            this.updateStatus('disconnected');
            this.isAuthorized = false;
            this.isAuthorizing = false;

            // Mark pending trades as ERROR before clearing
            const store = this.getState ? this.getState() : null;
            if (store) {
                this.tradePool.forEach((trade, id) => {
                    store.updateTradeLog(id, { result: 'ERROR', error: 'Connection Lost' });
                });
            }

            this.tradePool.clear(); // CRITICAL: Reset all pending trades on close
            this.stopHeartbeat();
            
            if (this.socket !== api_base.api?.connection) {
                this.handleReconnect();
            }
        });

        this.socket.addEventListener('error', (err: any) => {
            if (err && err.message) {
                console.warn('[TradeWS] Socket Error:', err.message);
            }
            this.updateStatus('error');
        });
    }

    private handleReconnect() {
        const delays = [1000, 2000, 4000, 8000, 15000];
        const delay = delays[this.reconnectAttempts] || 30000;

        if (this.reconnectAttempts % 5 === 0) {
            console.warn(`[TradeWS] Connection failed. Retrying in ${delay}ms... (Attempt ${this.reconnectAttempts + 1})`);
        }

        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ ping: 1 }));
            }
        }, 15000);
    }

    private stopHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    }

    private updateStatus(status: ConnectionStatus) {
        this.status = status;
        // Sync with store
        const store = this.getState ? this.getState() : null;
        if (store) {
            store.setTradeWsStatus(status);
        }
    }

    public onEvent(callback: (type: string, data: any) => void) {
        this.eventListeners.push(callback);
    }

    private emitEvent(type: string, data: any) {
        this.eventListeners.forEach(cb => cb(type, data));
    }


    public authorize(token: string) {
        if (!token || typeof token !== 'string' || token.trim().length < 8) {
            console.warn('[TradeWS] Aborted Authorize: Token is empty or invalid.');
            return;
        }
        if (this.socket?.readyState !== WebSocket.OPEN) return;

        // If we have a new token, force re-authorization even if already authorized
        if (this.isAuthorized && this.token === token) return;
        if (this.isAuthorizing && this.token === token) return;

        console.log('[TradeWS] >>> AUTHORIZING for token transition...');

        // Clear old state if token changed
        if (this.token && this.token !== token) {
            this.tradePool.clear();
            this.isAuthorized = false;
        }

        this.isAuthorizing = true;
        this.token = token;
        this.socket.send(JSON.stringify({
            authorize: token,
            req_id: 1 // Explicit ID for auth
        }));
    }

    private handleMessage(msg: any) {
        const store = this.getState ? this.getState() : null;
        if (!store) return;

        // Log basic info for all responses
        if (msg.error) {
            // Detailed message for UI log
            const errorMsg = msg.error.message || msg.error.code || 'Unknown Deriv Error';

            // Only log if it's not a benign AlreadySubscribed or double-auth error
            if (msg.error.code !== 'AlreadySubscribed' && !(msg.msg_type === 'authorize' && msg.error.code === 'WrongResponse')) {
                console.error(`[TradeWS RX ERROR] ${msg.msg_type}:`, JSON.stringify(msg.error, null, 2));
            }

            // Report to UI if we have a pending trade
            // Report to UI if we can identify the trade
            const errReqId = msg.echo_req?.passthrough?.requestId || msg.echo_req?.req_id;
            if (errReqId) {
                store.updateTradeLog(errReqId, {
                    result: 'ERROR',
                    error: errorMsg
                });
                this.tradePool.delete(String(errReqId));
            }

            if (msg.msg_type === 'authorize') {
                this.isAuthorizing = false;
                store.setTradeAuthorized(false);
            }
            return;
        }

        // 1. Auth Success
        if (msg.msg_type === 'authorize') {
            this.isAuthorizing = false;
            console.log('[TradeWS] Authorized Successfully');
            this.isAuthorized = true;
            store.setTradeAuthorized(true);
            return;
        }

        // Correlation via req_id or echo_req.passthrough
        const reqId = msg.req_id || msg.echo_req?.req_id;
        const passthrough = msg.echo_req?.passthrough;
        const requestId = passthrough?.requestId;

        // --- GLOBAL POC HANDLING (If not mapped via pass through) ---
        if (msg.msg_type === 'proposal_open_contract' && !requestId) {
            const poc = msg.proposal_open_contract;

            // Find Trade in Pool by contract_id
            let matchedTrade = null;
            for (const [id, trade] of this.tradePool.entries()) {
                if (trade.contractId === poc.contract_id) {
                    matchedTrade = trade;
                    break;
                }
            }

            if (!matchedTrade) return;

            // STREAM EVENT
            this.emitEvent('CONTRACT_UPDATE', {
                requestId: matchedTrade.requestId,
                data: poc
            });

            const isResolved = poc.is_sold === 1 || poc.status === 'won' || poc.status === 'lost' || (poc.profit && poc.profit !== 0);
            if (isResolved) {
                matchedTrade.settleRecvTime = Date.now();
                const settlementLatency = matchedTrade.settleRecvTime - matchedTrade.buyRecvTime!;

                store.updateTradeMetrics({ settlementLatency });

                const profit = poc.profit;
                const isWin = (profit !== undefined && profit !== null) ? profit > 0 : (poc.status === 'won');
                const finalProfit = profit;

                // EMIT FINAL RESULT INSTANTLY
                this.emitEvent('TRADE_RESULT', {
                    requestId: matchedTrade.requestId,
                    contractId: poc.contract_id,
                    isWin,
                    profit: finalProfit,
                    poc
                });

                const existingLog = store.tradeLogs?.find((l: any) => l.requestId === matchedTrade.requestId);
                let finalExit = poc.exit_tick_display_value?.toString().slice(-1) || poc.exit_tick_display?.toString().slice(-1) || '-';
                if (finalExit === '-' && existingLog && existingLog.exit && existingLog.exit !== '-') finalExit = existingLog.exit;

                // Update UI log to final state INSTANTLY
                store.updateTradeLog(matchedTrade.requestId, {
                    result: isWin ? 'WON' : 'LOST',
                    profit: finalProfit,
                    exit: finalExit
                });

                this.tradePool.delete(matchedTrade.requestId);
            }
            return;
        }


        if (!this.tradePool.has(String(requestId))) {
            return;
        }

        const pendingTrade = this.tradePool.get(String(requestId))!;

        // 2. Buy Response (Direct Execution)
        if (msg.msg_type === 'buy') {
            pendingTrade.buyRecvTime = Date.now();
            pendingTrade.contractId = msg.buy.contract_id;
            const latency = pendingTrade.buyRecvTime - pendingTrade.proposalSentTime!; // Used proposalSentTime as startTime for latency

            store.updateTradeMetrics({ buyLatency: latency });
            store.updateTradeLog(pendingTrade.requestId, { result: 'BUYING...' });

            // TRACE START EVENT
            this.emitEvent('TRADE_STARTED', {
                requestId: pendingTrade.requestId,
                contractId: pendingTrade.contractId
            });

            // STEP 3: SUBSCRIBE POC (Directly after buy)
            const subscribeReqId = Number(requestId) + 2;
            this.socket?.send(JSON.stringify({
                proposal_open_contract: 1,
                contract_id: pendingTrade.contractId,
                subscribe: 1,
                passthrough: { requestId: pendingTrade.requestId },
                req_id: subscribeReqId
            }));
            return;
        }

        // 3. POC (Targeted via matching passthrough)
        if (msg.msg_type === 'proposal_open_contract' && requestId) {
            const poc = msg.proposal_open_contract;

            // STREAM EVENT
            this.emitEvent('CONTRACT_UPDATE', {
                requestId: pendingTrade.requestId,
                data: poc
            });

            const isResolved = poc.is_sold === 1 || poc.status === 'won' || poc.status === 'lost' || (poc.profit && poc.profit !== 0);
            if (isResolved) {
                pendingTrade.settleRecvTime = Date.now();
                const settlementLatency = pendingTrade.settleRecvTime - pendingTrade.buyRecvTime!;

                store.updateTradeMetrics({ settlementLatency });

                const isWin = poc.profit > 0 || poc.status === 'won';
                const profit = poc.profit;

                // EMIT FINAL RESULT INSTANTLY
                this.emitEvent('TRADE_RESULT', {
                    requestId: pendingTrade.requestId,
                    contractId: poc.contract_id,
                    isWin,
                    profit,
                    poc
                });

                const existingLog = store.tradeLogs?.find((l: any) => l.requestId === pendingTrade.requestId);
                let finalExit = poc.exit_tick_display_value?.toString().slice(-1) || poc.exit_tick_display?.toString().slice(-1) || '-';
                if (finalExit === '-' && existingLog && existingLog.exit && existingLog.exit !== '-') finalExit = existingLog.exit;

                // Update UI log to final state INSTANTLY
                store.updateTradeLog(pendingTrade.requestId, {
                    result: isWin ? 'WON' : 'LOST',
                    profit: profit,
                    exit: finalExit
                });

                this.tradePool.delete(pendingTrade.requestId);
            }
            return;
        }
    }

    public executeDirectTrade(payload: any) {
        if (this.tradePool.size >= 5) {
            console.warn('[TradeWS] Max concurrent trades (5) reached. Skipping.');
            return;
        }

        const requestId = Date.now(); // MUST BE INTEGER
        const pendingTrade = {
            requestId: String(requestId),
            startTime: Date.now(),
            proposalSentTime: Date.now()
        };
        this.tradePool.set(pendingTrade.requestId, pendingTrade);

        // STEP 1: DIRECT BUY WITH PARAMETERS
        const buyReq = {
            buy: 1,
            price: Number(payload.stake),
            parameters: {
                amount: Number(payload.stake),
                basis: 'stake',
                contract_type: payload.contract_type,
                currency: payload.currency || 'USD',
                duration: payload.duration || 1,
                duration_unit: payload.duration_unit || 't',
                symbol: payload.symbol,
                barrier: payload.barrier ? String(payload.barrier) : undefined
            },
            passthrough: { requestId: pendingTrade.requestId },
            req_id: requestId // Numeric ID as required
        };

        this.socket?.send(JSON.stringify(buyReq));

        // UI Feedback
        const store = this.getState ? this.getState() : null;
        if (store) {
            store.addTradeLog({
                requestId,
                time: Date.now(),
                contract: payload.contract_type,
                result: '',
                stake: payload.stake.toString(),
                profit: null, // null = Pending (No flickering 0.00)
                digit: (payload.barrier !== undefined && payload.barrier !== null) ? payload.barrier : '-',
                exit: '-',
                currency: payload.currency || 'USD'
            });
        }
    }

}

const G = globalThis as any;
if (!G.__tradeWS) {
    G.__tradeWS = new TradeWS();
}
export const tradeWS = G.__tradeWS as TradeWS;
