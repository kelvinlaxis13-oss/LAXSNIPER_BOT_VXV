import { tradeEngine } from './deriv/trade-engine';
import { ticksToDecimals } from './deriv/constants';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'wss://backend.laxdollar.pro/ui';

class BackendWS {
    private socket: WebSocket | null = null;
    public isConnected = false;
    public isAuthorized = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private activeMarket = 'R_100';
    private activeTrades = new Map<string, any>();
    private contractMap = new Map<string, string>();
    private pendingTradeId: string | null = null;
    private processedTradeIds = new Set<string>();

    private getState: (() => any) | null = null;

    constructor() { }

    public init(getState: () => any) {
        this.getState = getState;
    }

    public connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log('[BackendWS] Connecting to Fast Execution Engine:', BACKEND_URL);

        try {
            this.socket = new WebSocket(BACKEND_URL);
        } catch (e) {
            console.error('[BackendWS] Connection Failed:', e);
            this.scheduleReconnect();
            return;
        }

        this.socket.onopen = () => {
            console.log('[BackendWS] Connected to /ui. Waiting for hello...');
            this.isConnected = true;
            this.reconnectTimer = null;
            const store = this.getState ? this.getState() : null;
            if (store) store.setBackendStatus('handshaking');

            // Safety Fallback: If no "hello" in 10s, silently reconnect rather than permanently erroring
            setTimeout(() => {
                const currentStore = this.getState ? this.getState() : null;
                const status = currentStore ? currentStore.backendStatus : 'disconnected';
                if (this.isConnected && status === 'handshaking') {
                    console.warn('[BackendWS] No "hello" after 10s — reconnecting silently...');
                    // Close and let scheduleReconnect handle re-connection
                    this.socket?.close();
                }
            }, 10000);
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                const store = this.getState ? this.getState() : null;
                if (store && store.backendStatus === 'handshaking' && message.type !== 'hello') {
                    console.log('[BackendWS] Handshake DEBUG: Received unexpected message instead of hello:', message.type, message);
                }

                // Low-level protocol handling
                if (message.type === 'hello') {
                    console.log('[BackendWS] RX: hello. Sending auth_session...');
                    const store = this.getState ? this.getState() : null;
                    const token = store ? store.token : null;
                    const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || '123448';

                    if (token) {
                        if (store) store.setBackendStatus('authenticating');
                        this.send({
                            type: 'auth_session',
                            token: token,
                            appId: appId
                        });
                    } else {
                        console.warn('[BackendWS] Cannot authenticate: No token in store.');
                    }
                    return;
                }

                if (message.type === 'session_auth_started') {
                    console.log('[BackendWS] RX: session_auth_started');
                    const store = this.getState ? this.getState() : null;
                    if (store) store.setBackendStatus('authenticating');
                    return;
                }

                if (message.type === 'session_auth_ok') {
                    console.log('[BackendWS] RX: session_auth_ok. READY.');
                    this.isAuthorized = true;
                    const store = this.getState ? this.getState() : null;
                    if (store) {
                        store.setBackendStatus('ready');
                        const backendLoginId = message.auth?.loginid || message.loginid;
                        store.setIsBackendAuthorized(true);

                        if (backendLoginId) {
                            console.log(`[BackendWS] Active Account: ${backendLoginId}`);
                            const currentAccount = store.account;
                            store.setAccount(currentAccount ? { ...currentAccount, loginid: backendLoginId } : { loginid: backendLoginId, balance: 0, currency: 'USD' });
                        }

                        // Subscribe to current market
                        if (store.market) {
                            this.subscribeToMarket(store.market);
                        }
                    }
                    return;
                }

                if (message.type === 'session_auth_failed') {
                    console.error('[BackendWS] RX: session_auth_failed!', message.error);
                    this.isAuthorized = false;
                    const store = this.getState ? this.getState() : null;
                    if (store) {
                        store.setBackendStatus('error');
                        store.setIsBackendAuthorized(false);
                        store.setStatus('error');
                        // Directly setting error on store for visibility if possible
                        if ((store as any).set) {
                            (store as any).set({ error: `Backend Auth Failed: ${message.error}` });
                        }
                    }
                    return;
                }

                if (message.type === 'status') {
                    const store = this.getState ? this.getState() : null;
                    if (store && message.auth?.authorized === true) {
                        console.log('[BackendWS] Status: Session is authorized.');
                        this.isAuthorized = true;
                        store.setIsBackendAuthorized(true);
                    }
                }

                this.handleMessage(message);
            } catch (e) {
                console.error('[BackendWS] Message processing error:', e);
            }
        };

        this.socket.onclose = (event) => {
            console.log(`[BackendWS] Disconnected. Code: ${event.code}`);
            this.isConnected = false;
            this.isAuthorized = false;
            const store = this.getState ? this.getState() : null;
            if (store) {
                store.setBackendStatus('disconnected');
                store.setIsBackendAuthorized(false);
            }
            this.scheduleReconnect();
        };

        this.socket.onerror = (err: any) => {
            const msg = err.message || err.type || err.code;
            if (msg === 'error' || !msg || Object.keys(err).length === 0) {
                console.warn('[BackendWS] Connection dropped/failed.');
            } else {
                console.error('[BackendWS] Error:', msg, err);
            }
            this.socket?.close();
        };
    }

    public disconnect() {
        if (this.socket) {
            this.isConnected = false;
            this.socket.close();
            this.socket = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, 3000);
    }

    private handleMessage(msg: any) {
        const msgType = msg.type || msg.msg_type || (msg.tick ? 'tick' : 'unknown');

        if (msgType === 'pong') return;

        const store = this.getState ? this.getState() : null;

        if (msgType !== 'tick' && msgType !== 'stats' && msgType !== 'pong') {
            console.group(`%c[BackendWS RX] ${msgType}`, 'background: #222; color: #bada55; font-weight: bold; padding: 2px 5px; border-radius: 3px;');
            console.log('Raw Message:', msg);
            if (msg.error) console.error('BACKEND ERROR:', msg.error);
            console.groupEnd();
            if (store && store.setLastBackendMessage) store.setLastBackendMessage(msg);
        }

        const updateLogWithAnyId = (ids: (string | undefined | null)[], updates: any) => {
            if (!store) return;
            let success = false;
            for (const id of ids) {
                if (!id) continue;

                const existingLog = store.tradeLogs?.find((l: any) => l.requestId === id);
                if (updates.exit === '-' && existingLog && existingLog.exit && existingLog.exit !== '-') {
                    delete updates.exit;
                }

                if (existingLog) {
                    store.updateTradeLog(id, updates);
                    success = true;
                }
            }

            const hasDigit = (updates.exit !== undefined && updates.exit !== null && updates.exit !== '-');
            if (!success && (updates.result || hasDigit)) {
                const targetId = updates.requestId || updates.req_id || this.pendingTradeId;
                if (targetId) {
                    store.updateTradeLog(targetId, updates);
                }
            }
        };

        const findDeep = (obj: any, targetKeys: string[]): any => {
            if (!obj || typeof obj !== 'object') return null;
            for (const key of targetKeys) {
                if (obj[key] !== undefined && obj[key] !== null) return obj[key];
            }
            for (const key in obj) {
                const found = findDeep(obj[key], targetKeys);
                if (found !== null) return found;
            }
            return null;
        };

        if (msg.error) {
            const errorId = msg.req_id || msg.requestId || this.pendingTradeId;
            if (errorId) {
                console.log(`[BackendWS] Nullifying Request ${errorId} due to API error.`);
                updateLogWithAnyId([errorId], { result: 'ERROR', exit: '-', profit: 0 });
                if (errorId === this.pendingTradeId) this.pendingTradeId = null;
            }
        }

        if (msgType === 'trade_ack') {
            const backId = (msg.request_id || msg.requestId || msg.req_id)?.toString();
            if (msg.ok && backId && this.pendingTradeId) {
                console.log(`[BackendWS] ID UPGRADE -> Migrating ${this.pendingTradeId} to Backend ID ${backId}`);
                if (store && store.setTradeLogBackendId) store.setTradeLogBackendId(this.pendingTradeId, backId);
                this.contractMap.set(backId, backId);
                this.pendingTradeId = backId;
            } else if (!msg.ok) {
                const error = msg.error || 'Unknown Trade Error';
                const errorId = backId || this.pendingTradeId;
                console.error('[BackendWS] TRADE FAILED:', error);
                if (errorId) updateLogWithAnyId([errorId], { result: 'ERROR', error });
                this.pendingTradeId = null;
            }
            return;
        }

        if (msgType === 'trade_started') {
            const tradePayload = msg.trade || msg.payload || msg;
            const contractId = tradePayload.contract_id?.toString() || tradePayload.contractId?.toString();
            const backId = (tradePayload.request_id || tradePayload.req_id || msg.request_id || msg.req_id || this.pendingTradeId)?.toString();

            if (backId && contractId) {
                console.log(`[BackendWS] DIRECT BIND -> Contract [${contractId}] to ID [${backId}]`);
                this.contractMap.set(contractId, backId);
                if (store && store.setTradeLogBackendId) store.setTradeLogBackendId(backId, contractId);
                updateLogWithAnyId([backId, contractId], { result: '' });
                if (backId === this.pendingTradeId) this.pendingTradeId = null;
            }
            return;
        }

        if (msgType === 'contract_update' || msgType === 'proposal_open_contract') {
            const update = msg.update || msg.payload || msg.proposal_open_contract || msg;
            if (update) {
                const contractId = (update.contract_id || update.contractId)?.toString();
                const requestId = contractId ? this.contractMap.get(contractId) : null;
                const isSold = update.is_sold === 1 || update.status === 'sold' || msg.is_sold === 1 || msg.status === 'sold';
                const profit = parseFloat(update.profit || update.bid_price || '0');

                // ⚡ STRICT SETTLEMENT: Only trigger result when contract is actually SOLD
                if (isSold && contractId && !this.processedTradeIds.has(contractId)) {
                    this.processedTradeIds.add(contractId);
                    // Standardize: A win is strictly positive profit.
                    const isWin = profit > 0;
                    console.log(`[BackendWS] Contract ${contractId} SETTLED. Win: ${isWin}, Profit: ${profit}`);
                    tradeEngine.handleTradeResult(isWin, profit);
                    setTimeout(() => this.processedTradeIds.delete(contractId!), 15000);
                }

                const finalFields = ['exit_tick_digit', 'final_tick_digit', 'exit_tick_display_value', 'display_value', 'exit_tick', 'sell_price'];
                const liveFields = ['digit', 'last_tick_digit', 'current_spot', 'spot'];

                let rawDigit = findDeep(update, finalFields);
                const isFinalDigit = rawDigit !== null;

                if (!isFinalDigit && !isSold) {
                    rawDigit = findDeep(update, liveFields);
                }

                let exitDigit = '-';
                if (rawDigit !== null) {
                    // Single integer digit sent by backend (0-9) — use directly
                    if (typeof rawDigit === 'number' && Number.isInteger(rawDigit) && rawDigit >= 0 && rawDigit <= 9) {
                        exitDigit = rawDigit.toString();
                    } else if (typeof rawDigit === 'string' && rawDigit.length > 0) {
                        // Display value string like "1234.567" — last char is the digit
                        exitDigit = rawDigit.charAt(rawDigit.length - 1);
                    } else if (typeof rawDigit === 'number') {
                        // Float price — use market-correct precision
                        const market = store?.market || 'R_100';
                        const precision = ticksToDecimals(market);
                        exitDigit = rawDigit.toFixed(precision).slice(-1);
                    }
                }

                const finalResultLabel = (profit !== 0 || isSold)
                    ? (profit > 0 ? 'WON' : 'LOST')
                    : '';

                updateLogWithAnyId([requestId, contractId], {
                    profit: profit,
                    exit: (isSold || isFinalDigit) ? exitDigit : '-',
                    result: finalResultLabel
                });

                // Update Admin Stats on settlement
                if (isSold && store && store.updateAdminStats) {
                    const stake = parseFloat(update.amount || update.buy_price || '0');
                    if (stake > 0) store.updateAdminStats(stake);
                }
            }
            return;
        }

        if (msgType === 'result') {
            const result = msg.result || msg.payload || msg;
            if (result) {
                const contractId = (result.contract_id || result.contractId)?.toString();
                const backId = (result.req_id || result.requestId || result.request_id ||
                    (contractId ? this.contractMap.get(contractId) : null) || this.pendingTradeId)?.toString();
                const profit = parseFloat(result.profit || '0');
                const isExplWin = profit > 0 || result.won === true || result.won === 1 || result.status === 'won';

                if (contractId && !this.processedTradeIds.has(contractId)) {
                    this.processedTradeIds.add(contractId);
                    tradeEngine.handleTradeResult(isExplWin, profit);
                    setTimeout(() => this.processedTradeIds.delete(contractId!), 15000);
                }

                const rawDigit = findDeep(result, [
                    'exit_tick_digit', 'final_tick_digit', 'exit_tick_display_value', 'display_value',
                    'exit_tick', 'digit', 'last_tick_digit', 'spot', 'price', 'bid'
                ]);

                let exitDigit = '-';
                if (rawDigit !== null) {
                    const market = store?.market || 'R_100';
                    const precision = ticksToDecimals(market);
                    const formatted = (typeof rawDigit === 'number' && rawDigit < 10 && rawDigit >= 0 && Number.isInteger(rawDigit))
                        ? rawDigit.toString()
                        : (typeof rawDigit === 'number' ? rawDigit.toFixed(precision) : rawDigit.toString());
                    exitDigit = formatted.charAt(formatted.length - 1);
                }

                if (backId || contractId) {
                    updateLogWithAnyId([backId, contractId], {
                        result: isExplWin ? 'WON' : 'LOST',
                        profit: profit,
                        exit: exitDigit
                    });

                    // Update Admin Stats on settlement
                    if (store && store.updateAdminStats) {
                        const stake = parseFloat(result.amount || result.stake || '0');
                        if (stake > 0) store.updateAdminStats(stake);
                    }
                }
                if (backId === this.pendingTradeId) this.pendingTradeId = null;
            }
            return;
        }

        if (msgType === 'backend_error') {
            console.error('[BackendWS] CORE BACKEND ERROR:', msg.error);
            if (store && store.setBackendStatus) store.setBackendStatus('error');
            return;
        }

        if (msgType === 'platform_stats' || msgType === 'stats') {
            if (store && store.setAdminStats) {
                const volume = parseFloat(msg.volume || msg.total_volume || '0');
                const users = parseInt(msg.users || msg.total_users || '0');
                store.setAdminStats({
                    platformVolume: volume,
                    totalUsers: users,
                    platformCommission: volume * 0.03
                });
            }
            return;
        }
    }

    public authorize(token: string) {
        if (!this.isConnected || !this.socket) return;
        console.log('[BackendWS] >>> AUTHORIZING...');
        this.send({
            type: 'authorize',
            token: token
        });
    }

    public testPing() {
        this.send({ type: 'ping' });
    }

    public sendTrade(payload: any) {
        if (!this.isConnected || !this.socket || !this.isAuthorized) {
            console.error('[BackendWS] FATAL: Connection or Authorization not active.');
            // Note: We bypass setters here as this is a fatal UI error we want to propagate
            const store = this.getState ? this.getState() : null;
            if (store && (store as any).set) {
                (store as any).set({ error: 'Trade rejected: Backend session not authorized.' });
            }
            return;
        }

        const store = this.getState ? this.getState() : null;

        if (store && store.backendStatus !== 'connected') {
            console.warn(`[BackendWS] Sending trade while status is: ${store.backendStatus}. Execution may fail if auth is not complete.`);
        }

        const localId = `loc_${Date.now()}`;
        this.pendingTradeId = localId;

        const finalPayload = {
            type: 'trade',
            payload: {
                requestId: localId,
                req_id: localId,
                symbol: payload.symbol,
                contract_type: payload.contract_type,
                stake: payload.stake,
                duration: payload.duration || 1,
                duration_unit: payload.duration_unit || 't',
                barrier: (payload.barrier !== undefined && payload.barrier !== null) ? payload.barrier.toString() : undefined,
                prediction: payload.prediction !== undefined ? payload.prediction : undefined,
                currency: payload.currency || "USD"
            }
        };

        this.activeTrades.set(localId, finalPayload);

        if (store && store.addTradeLog) {
            store.addTradeLog({
                requestId: localId,
                time: Date.now(),
                contract: payload.contract_type,
                result: '',
                stake: payload.stake.toString(),
                profit: null,
                digit: payload.barrier || payload.prediction || '-',
                exit: '-',
                currency: payload.currency || 'USD'
            });
        }

        console.log(`[BackendWS TX] %c>>> SENDING TRADE: ${localId}`, 'color: #f472b6; font-weight: bold; font-size: 12px;', finalPayload);
        this.send(finalPayload);
    }

    private send(data: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    public subscribeToMarket(symbol: string) {
        this.activeMarket = symbol;
        if (this.isConnected) {
            this.send({ type: 'subscribe', symbol });
        }
    }
}

const G = globalThis as any;
if (!G.__backendWS) {
    G.__backendWS = new BackendWS();
}
export const backendWS = G.__backendWS as BackendWS;
