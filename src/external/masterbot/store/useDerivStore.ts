import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ConnectionStatus, AccountInfo, TickData, DerivMessage } from '../lib/deriv/types';
import { derivWS } from '../lib/deriv/websocket';
import { ticksToDecimals } from '../lib/deriv/constants';
import { tradeEngine } from '../lib/deriv/trade-engine';
import { tradeWS } from '../lib/deriv/trade-ws';
import { backendWS } from '../lib/backend-ws';

interface DerivState {
    status: ConnectionStatus;
    token: string;
    account: AccountInfo | null;
    lastTick: TickData | null;
    ticks: number[];
    market: string;
    contractType: string;
    prediction: number;
    isRunning: boolean;
    isSwitchingMarket: boolean;
    rtt: number;
    triggers: {
        entryDigit: {
            enabled: boolean;
            entryDigit: number;
            triggerOnEntry: boolean;
            monitorTicks: number;
            consecutive: number;
            type: 'Over' | 'Under' | 'Even' | 'Odd' | 'Match' | 'Diff';
            targetValue: number;
        };
        digitPattern: {
            enabled: boolean;
            pattern: string[];
            compareDigit: number;
        };
        adaptiveEvenOdd: {
            enabled: boolean;
            currentSide: 'Even' | 'Odd';
        };
    };
    triggerSequence: ('virtual' | 'entry' | 'pattern')[];
    triggerMode: 'sequential' | 'simultaneous';
    currentPipelineStep: number;
    tradePattern: ('trade' | 'skip')[];
    currentStep: number;
    tradingMode: 'after_first' | 'continuous_check';

    // Admin State
    admin: {
        isKillSwitchActive: boolean;
        totalUsers: number;
        platformVolume: number;
        platformCommission: number;
    };

    // Risk Settings
    initialStake: number;
    martingaleMultiplier: number;
    maxMartingaleSteps: number;
    takeProfit: number;
    stopLoss: number;
    stopAfterTotalWins: { enabled: boolean; value: number };
    stopAfterTotalLosses: { enabled: boolean; value: number };
    stopAfterConsecutiveLosses: { enabled: boolean; value: number };
    compoundProfits: boolean;
    resetOnLoss: boolean;

    // Statistics
    stats: {
        totalTrades: number;
        won: number;
        lost: number;
        winRate: number;
        totalProfit: number;
        maxStake: number;
        currentStep: number;
    };
    lastTickReceived: number | null;
    totalTicksReceived: number;
    error: string | null;
    debugInfo: any | null;
    triggerStatus: string | null;

    // Trade Logs
    tradeLogs: any[];

    // Backend Debug
    backendStatus: 'connected' | 'disconnected' | 'error' | 'handshaking' | 'authenticating' | 'ready';
    isBackendAuthorized: boolean;
    lastBackendMessage: any | null;

    // Direct Execution State
    tradeWsStatus: ConnectionStatus;
    isTradeAuthorized: boolean;
    tradeMetrics: {
        proposalLatency: number;
        buyLatency: number;
        settlementLatency: number;
    };

    // Actions
    setStatus: (status: ConnectionStatus) => void;
    setToken: (token: string) => void;
    setAccount: (account: AccountInfo | null) => void;
    addTick: (tick: TickData) => void;
    setMarket: (market: string) => void;
    setContractType: (type: string) => void;
    setPrediction: (prediction: number) => void;
    setTrigger: (type: 'entryDigit' | 'digitPattern', config: any) => void;
    setTriggerSequence: (sequence: ('virtual' | 'entry' | 'pattern')[]) => void;
    setTriggerMode: (mode: 'sequential' | 'simultaneous') => void;
    setPipelineStep: (step: number) => void;
    setTradePattern: (pattern: ('trade' | 'skip')[]) => void;
    setCurrentStep: (step: number) => void;
    setTradingMode: (mode: 'after_first' | 'continuous_check') => void;
    setTriggerStatus: (status: string | null) => void;
    setBackendStatus: (status: 'connected' | 'disconnected' | 'error' | 'handshaking' | 'authenticating' | 'ready') => void;
    setIsBackendAuthorized: (isAuthorized: boolean) => void;
    setLastBackendMessage: (message: any) => void;
    toggleKillSwitch: () => void;
    setRiskSettings: (settings: Partial<{
        initialStake: number;
        martingaleMultiplier: number;
        maxMartingaleSteps: number;
        takeProfit: number;
        stopLoss: number;
        stopAfterTotalWins: { enabled: boolean; value: number };
        stopAfterTotalLosses: { enabled: boolean; value: number };
        stopAfterConsecutiveLosses: { enabled: boolean; value: number };
        compoundProfits: boolean;
        resetOnLoss: boolean;
    }>) => void;
    advanceStep: () => void;
    addTradeLog: (log: any) => void;
    updateTradeLog: (requestId: string, updates: any) => void;
    setTradeLogBackendId: (localId: string, backendId: string) => void;
    clearLogs: () => void;
    resetStats: () => void;
    setStats: (stats: any) => void;
    updateAdminStats: (volume: number) => void;
    setAdminStats: (stats: { totalUsers?: number; platformVolume?: number; platformCommission?: number }) => void;
    startBot: () => void;
    stopBot: () => void;
    connect: () => void;
    disconnect: () => void;
    forceReconnect: () => void;
    authorize: (token: string) => void;
    subscribeToMarket: (market: string) => void;
    resetTicks: () => void;
    setAppId: (id: string) => void;
    virtualSettings: {
        isVirtualMode: boolean;

        // Virtual -> Real
        startVirtualToReal: boolean;
        vThreshold: number;
        vTriggerMode: 'consec' | 'total';
        vTriggerType: 'wins' | 'losses';

        // Real -> Virtual
        startRealToVirtual: boolean;
        rThreshold: number;
        rTriggerMode: 'consec' | 'total';
        rTriggerType: 'wins' | 'losses';

        // Trackers
        virtualWins: number;
        virtualLosses: number;
        vConsecWins: number;
        vConsecLosses: number;

        realWins: number;
        realLosses: number;
        rConsecWins: number;
        rConsecLosses: number;
    };
    setVirtualSettings: (settings: Partial<DerivState['virtualSettings']>) => void;
    recoverySettings: {
        enabled: boolean;
        lossThreshold: number;
        winThreshold: number;
        recoveryMarket: string;
        recoveryContractType: string;
        recoveryPrediction: number;
        recoveryStake: number;
    };
    isRecoveryActive: boolean;
    marketBeforeRecovery: string | null;
    setRecoverySettings: (settings: Partial<DerivState['recoverySettings']>) => void;
    toggleRecovery: (active: boolean) => void;

    // Direct Execution Actions
    setTradeWsStatus: (status: ConnectionStatus) => void;
    setTradeAuthorized: (authorized: boolean) => void;
    updateTradeMetrics: (metrics: Partial<DerivState['tradeMetrics']>) => void;

    testPing: () => void;
    toggleAdaptiveSide: () => void;
    updateTriggers: (updates: Partial<DerivState['triggers']>) => void;
}

export const useDerivStore = create<DerivState>()(
    persist(
        (set, get) => ({
            status: 'disconnected',
            token: '',
            account: null,
            lastTick: null,
            lastTickReceived: null,
            totalTicksReceived: 0,
            error: null,

            triggerStatus: null,
            debugInfo: null,
            ticks: [],
            market: 'R_100',
            contractType: 'DIGITOVER',
            prediction: 5,
            isRunning: false,
            isSwitchingMarket: false,
            rtt: 0,
            isBackendAuthorized: false,

            // Direct Execution Init
            tradeWsStatus: 'disconnected',
            isTradeAuthorized: false,
            tradeMetrics: {
                proposalLatency: 0,
                buyLatency: 0,
                settlementLatency: 0
            },

            triggers: {
                entryDigit: {
                    enabled: false,
                    entryDigit: 5,
                    triggerOnEntry: false,
                    monitorTicks: 5,
                    consecutive: 2,
                    type: 'Under',
                    targetValue: 4,
                },
                digitPattern: {
                    enabled: true,
                    pattern: ['D', 'D', 'M', 'D', 'D'],
                    compareDigit: 2,
                },
                adaptiveEvenOdd: {
                    enabled: false,
                    currentSide: 'Even',
                },
            },
            triggerSequence: ['virtual', 'entry', 'pattern'], // Default pipeline
            triggerMode: 'sequential',
            currentPipelineStep: 0,
            tradePattern: ['trade', 'skip', 'skip', 'skip', 'trade', 'skip', 'skip', 'skip'],
            currentStep: 1,
            tradingMode: 'after_first',

            admin: {
                isKillSwitchActive: false,
                totalUsers: 1, // Self
                platformVolume: 0,
                platformCommission: 0,
            },

            initialStake: 0.35,
            martingaleMultiplier: 2.1,
            maxMartingaleSteps: 5,
            takeProfit: 10,
            stopLoss: 30,
            stopAfterTotalWins: { enabled: true, value: 50 },
            stopAfterTotalLosses: { enabled: true, value: 50 },
            stopAfterConsecutiveLosses: { enabled: false, value: 5 },
            compoundProfits: true,
            resetOnLoss: true,

            stats: {
                totalTrades: 0,
                won: 0,
                lost: 0,
                winRate: 0,
                totalProfit: 0,
                maxStake: 0,
                currentStep: 1,
            },
            virtualSettings: {
                isVirtualMode: true,

                startVirtualToReal: false,
                vThreshold: 3,
                vTriggerMode: 'consec',
                vTriggerType: 'wins',

                startRealToVirtual: false,
                rThreshold: 2,
                rTriggerMode: 'consec',
                rTriggerType: 'wins',

                virtualWins: 0,
                virtualLosses: 0,
                vConsecWins: 0,
                vConsecLosses: 0,

                realWins: 0,
                realLosses: 0,
                rConsecWins: 0,
                rConsecLosses: 0,
            },
            recoverySettings: {
                enabled: false,
                lossThreshold: 3,
                winThreshold: 1,
                recoveryMarket: 'R_100',
                recoveryContractType: 'DIGITEVEN',
                recoveryPrediction: 1,
                recoveryStake: 0.35
            },
            isRecoveryActive: false,
            marketBeforeRecovery: null,
            tradeLogs: [],

            backendStatus: 'disconnected',
            lastBackendMessage: null,

            setBackendStatus: (status: 'connected' | 'disconnected' | 'error' | 'handshaking' | 'authenticating' | 'ready') => set({ backendStatus: status }),
            setIsBackendAuthorized: (isAuthorized: boolean) => set({ isBackendAuthorized: isAuthorized }),
            setLastBackendMessage: (message: any) => set({ lastBackendMessage: message }),
            setStatus: (status: ConnectionStatus) => set({ status, error: status === 'error' ? (get().error || 'WebSocket Error') : null }),
            setToken: (token: string) => {
                const currentToken = get().token;
                if (currentToken === token && token !== '') return;
                get().authorize(token);
            },

            setTriggerStatus: (triggerStatus: string | null) => set({ triggerStatus }),
            setAccount: (account: AccountInfo | null) => set({ account }),
            setMarket: (market: string) => {
                const currentMarket = get().market;
                if (currentMarket === market && get().ticks.length > 0) {
                    // Already on this market and has data, don't reset
                    get().subscribeToMarket(market);
                    return;
                }
                set({ market, isSwitchingMarket: true, ticks: [] });
                get().subscribeToMarket(market);

                // Watchdog
                setTimeout(() => {
                    if (get().isSwitchingMarket) {
                        console.warn('[DerivStore] Market switch watchdog triggered - clearing syncing state');
                        set({ isSwitchingMarket: false });
                    }
                }, 10000);
            },
            setContractType: (contractType: string) => set({ contractType }),
            setPrediction: (prediction: number) => set({ prediction }),
            setTrigger: (type: 'entryDigit' | 'digitPattern', config: any) => set((state: DerivState) => ({
                triggers: { ...state.triggers, [type]: { ...state.triggers[type], ...config } }
            })),
            setTriggerSequence: (sequence: ('virtual' | 'entry' | 'pattern')[]) => set({ triggerSequence: sequence, currentPipelineStep: 0 }),
            setTriggerMode: (mode: 'sequential' | 'simultaneous') => set({ triggerMode: mode, currentPipelineStep: 0 }),
            setPipelineStep: (step: number) => set({ currentPipelineStep: step }),
            setTradePattern: (tradePattern: ('trade' | 'skip')[]) => set({ tradePattern }),
            setCurrentStep: (currentStep: number) => set({ currentStep }),
            setTradingMode: (tradingMode: 'after_first' | 'continuous_check') => set({ tradingMode }),
            toggleKillSwitch: () => set((state: DerivState) => ({
                admin: { ...state.admin, isKillSwitchActive: !state.admin.isKillSwitchActive }
            })),
            setRiskSettings: (settings) => set((state: DerivState) => ({
                ...state,
                ...settings
            })),
            advanceStep: () => set((state: DerivState) => ({
                currentStep: (state.currentStep % state.tradePattern.length) + 1,
                stats: { ...state.stats, currentStep: (state.currentStep % state.tradePattern.length) + 1 }
            })),

            addTradeLog: (log: any) => set((state: DerivState) => ({
                tradeLogs: [log, ...state.tradeLogs].slice(0, 100)
            })),

            updateTradeLog: (requestId: string, updates: any) => set((state: DerivState) => {
                const reqIdStr = requestId?.toString();
                return {
                    tradeLogs: state.tradeLogs.map(log => {
                        const logIdStr = log.requestId?.toString();
                        if (logIdStr === reqIdStr) {
                            return { ...log, ...updates };
                        }
                        return log;
                    })
                };
            }),

            setTradeLogBackendId: (localId: string, backendId: string) => set((state: DerivState) => {
                const locIdStr = localId?.toString();
                const backIdStr = backendId?.toString();
                return {
                    tradeLogs: state.tradeLogs.map(log => {
                        if (log.requestId?.toString() === locIdStr) {
                            return { ...log, requestId: backIdStr };
                        }
                        return log;
                    })
                };
            }),

            clearLogs: () => {
                tradeEngine.stop(); // Reset internal execution state
                set((state) => ({
                    tradeLogs: [],
                    stats: {
                        ...state.stats,
                        totalTrades: 0,
                        won: 0,
                        lost: 0,
                        winRate: 0,
                        totalProfit: 0,
                        maxStake: 0,
                        currentStep: 1,
                    },
                    virtualSettings: {
                        ...state.virtualSettings,
                        virtualWins: 0,
                        virtualLosses: 0,
                        vConsecWins: 0,
                        vConsecLosses: 0,
                        realWins: 0,
                        realLosses: 0,
                        rConsecWins: 0,
                        rConsecLosses: 0
                    }
                }));
            },

            resetStats: () => {
                tradeEngine.stop(); // Reset internal execution state
                set((state) => ({
                    stats: {
                        ...state.stats,
                        totalTrades: 0,
                        won: 0,
                        lost: 0,
                        winRate: 0,
                        totalProfit: 0,
                        maxStake: 0,
                        currentStep: 1,
                    },
                    tradeLogs: [],
                    virtualSettings: {
                        ...state.virtualSettings,
                        virtualWins: 0,
                        virtualLosses: 0,
                        vConsecWins: 0,
                        vConsecLosses: 0,
                        realWins: 0,
                        realLosses: 0,
                        rConsecWins: 0,
                        rConsecLosses: 0
                    }
                }));
            },

            setStats: (stats: any) => set({ stats }),

            updateAdminStats: (volume: number) => set((state: DerivState) => {
                const newVolume = state.admin.platformVolume + volume;
                const newCommission = state.admin.platformCommission + (volume * 0.03);
                return {
                    admin: {
                        ...state.admin,
                        platformVolume: newVolume,
                        platformCommission: newCommission
                    }
                };
            }),

            setAdminStats: (stats: { totalUsers?: number; platformVolume?: number; platformCommission?: number }) => set((state: DerivState) => ({
                admin: { ...state.admin, ...stats }
            })),

            setVirtualSettings: (settings: any) => set((state: DerivState) => ({
                virtualSettings: { ...state.virtualSettings, ...settings }
            })),

            setRecoverySettings: (settings: any) => set((state: DerivState) => ({
                recoverySettings: { ...state.recoverySettings, ...settings }
            })),

            toggleRecovery: (isRecoveryActive: boolean) => set((state: DerivState) => {
                if (isRecoveryActive) {
                    // Entering Recovery: Save current market and switch
                    const currentMarket = state.market;
                    const recoveryMarket = state.recoverySettings.recoveryMarket;
                    console.log(`[DerivStore] 🚨 ACTIVATING RECOVERY: Switching Market ${currentMarket} -> ${recoveryMarket}`);

                    // Direct setMarket to ensure subscription and state updates
                    get().setMarket(recoveryMarket);

                    return {
                        isRecoveryActive,
                        marketBeforeRecovery: currentMarket
                    };
                } else {
                    // Exiting Recovery: Revert to original market
                    const originalMarket = state.marketBeforeRecovery || state.market;
                    console.log(`[DerivStore] ✅ RECOVERY COMPLETE: Reverting Market -> ${originalMarket}`);

                    get().setMarket(originalMarket);

                    return {
                        isRecoveryActive,
                        marketBeforeRecovery: null
                    };
                }
            }),

            startBot: () => set((state: DerivState) => ({
                isRunning: true,
                currentPipelineStep: 0,
                virtualSettings: {
                    ...state.virtualSettings,
                    virtualWins: 0,
                    virtualLosses: 0,
                    vConsecWins: 0,
                    vConsecLosses: 0,
                    realWins: 0,
                    realLosses: 0,
                    rConsecWins: 0,
                    rConsecLosses: 0
                },
                triggers: {
                    ...state.triggers,
                    adaptiveEvenOdd: {
                        ...state.triggers.adaptiveEvenOdd,
                        currentSide: 'Even'
                    }
                }
            })),
            stopBot: () => {
                set((state) => ({
                    isRunning: false,
                    currentStep: 1,
                    currentPipelineStep: 0,
                    stats: { ...state.stats, currentStep: 1 }
                }));
                tradeEngine.stop();
            },

            addTick: (tick: TickData) => set((state: DerivState) => {
                // Symbol Guard
                if (tick.symbol !== state.market) {
                    return state;
                }

                // Timestamp Guard
                if (state.lastTick && tick.epoch === state.lastTick.epoch && tick.quote === state.lastTick.quote) {
                    return state;
                }

                // Extract Digit
                // Extract Digit (Robust Strategy provided by User)
                const precision = (tick.pip_size !== undefined && tick.pip_size > 0 && tick.pip_size < 1)
                    ? Math.abs(Math.round(Math.log10(1 / tick.pip_size)))
                    : (tick.pip_size || ticksToDecimals(state.market));
                const priceString = tick.quote.toFixed(precision);
                const digit = parseInt(priceString.charAt(priceString.length - 1), 10);

                // console.log(`[DerivStore] Tick: ${tick.quote} (${precision}) -> ${digit}`);

                // Performance
                const newTicks = state.ticks.slice(-19);
                newTicks.push(digit);

                // Notify Trade Engine synchronously
                tradeEngine.onTick(tick, state); // PASSING STATE HERE

                // Console log to debug UI issue
                if (['1HZ15V', '1HZ30V', '1HZ90V'].includes(tick.symbol)) {
                    // console.log(`[DerivStore] ADDED TICK: ${tick.symbol} D:${digit} L:${newTicks.length}`);
                }

                return {
                    lastTick: tick,
                    lastTickReceived: Date.now(),
                    totalTicksReceived: state.totalTicksReceived + 1,
                    ticks: newTicks,
                    isSwitchingMarket: false
                };
            }),

            connect: () => {
                const { status } = get();
                if (status === 'connected' || status === 'connecting') {
                    // Even if main is connected, ensure backend is triggered
                    if (backendWS.isConnected === false) backendWS.connect();
                    return;
                }

                if (!(get() as any).isInitialized) {
                    (set as any)({ isInitialized: true });

                    // Cleanup: Clear old callbacks from global sockets
                    derivWS.clearCallbacks();
                    tradeWS.clearListeners();

                    // Initialize Trade Engine with store access (AFTER cleanup)
                    tradeEngine.init(get, set);

                    derivWS.onStatusChange((status: ConnectionStatus) => {
                        const previousStatus = get().status;
                        set({ status });
                        if (status === 'disconnected' || status === 'error') {
                            set({ account: null, isSwitchingMarket: false });
                            if (status === 'error') {
                                set({ error: 'Connection lost. Auto-reconnecting...' });
                            }
                        }
                        if (status === 'connected' && previousStatus !== 'connected') {
                            const state = get();
                            const storedToken = typeof window !== 'undefined' ? localStorage.getItem('deriv_token') : null;
                            if (storedToken && !state.account) {
                                get().authorize(storedToken);
                            }
                            get().subscribeToMarket(state.market);
                        }
                    });

                    derivWS.onMessage((message: DerivMessage) => {
                        // 1. Handle Errors First
                        if (message.error) {
                            if (message.error.code === 'AlreadySubscribed' || message.msg_type === 'ticks_history') {
                                // Silent suppression
                            } else {
                                console.error('[DerivStore] Full Error Message:', JSON.stringify(message, null, 2));

                                if (message.msg_type === 'authorize') {
                                    const errorMsg = message.error.message || message.error.code || 'Unknown Auth Error';
                                    set({
                                        error: `Auth Error: ${errorMsg}`,
                                        debugInfo: message,
                                        status: 'error',
                                        account: null
                                    });
                                }
                            }
                            return;
                        }

                        // 2. Success Conditionals
                        if (message.msg_type === 'pong') {
                            set({ rtt: derivWS.getLatency() });
                            return;
                        }

                        if (message.msg_type === 'authorize' && message.authorize) {
                            const { balance, currency, loginid, email } = message.authorize;
                            const balanceNum = parseFloat(balance || '0');

                            set({
                                account: {
                                    balance: isNaN(balanceNum) ? 0 : balanceNum,
                                    currency: currency || 'USD',
                                    loginid,
                                    email
                                },
                                error: null,
                                status: 'connected'
                            });

                            if (typeof window !== 'undefined' && get().token) {
                                localStorage.setItem('deriv_token', get().token);
                            }
                            const state = get();
                            if (state.market) {
                                derivWS.subscribeTicks(state.market);
                            }
                            // Subscribe to real-time balance updates separately
                            derivWS.send({ balance: 1, subscribe: 1 });
                            return;
                        }

                        if (message.msg_type === 'tick' && message.tick) {
                            get().addTick(message.tick);
                            return;
                        }

                        if (message.msg_type === 'balance' && message.balance) {
                            set((state: DerivState) => ({
                                account: state.account ? { ...state.account, balance: message.balance.balance } : null
                            }));
                            return;
                        }
                    });

                    setInterval(() => {
                        const state = get();
                        if (state.status === 'disconnected' && (state as any).isInitialized) {
                            console.log('[DerivStore] Watchdog: Detected hung disconnected state. Retrying...');
                            derivWS.connect();
                            backendWS.connect();
                        }
                    }, 15000);
                }

                // These should run every time connect() is called if they are not already active
                derivWS.connect();
                backendWS.connect();
            },

            disconnect: () => {
                derivWS.disconnect();
                tradeWS.disconnect();
                backendWS.disconnect(); // Disconnect backend WS too
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('deriv_token');
                }
                set({
                    status: 'disconnected',
                    account: null,
                    token: '',
                    error: null,
                    isTradeAuthorized: false,
                    tradeWsStatus: 'disconnected',
                    backendStatus: 'disconnected'
                });
            },

            forceReconnect: () => {
                console.log('[DerivStore] Manually triggering force reconnect...');
                derivWS.disconnect();
                backendWS.disconnect(); // Disconnect backend WS too
                set({ status: 'disconnected', error: null });
                setTimeout(() => get().connect(), 500);
            },

            authorize: async (token: string) => {
                console.log('[DerivStore] Unified Authorize -> Forcing Hard Reset...');

                // 1. Safety: Stop Bot instantly
                get().stopBot();

                // 2. Kill existing sessions
                tradeWS.disconnect();
                const { backendWS } = await import('../lib/backend-ws');
                backendWS.disconnect();

                // 3. Clear state for fresh start
                set({
                    token,
                    account: null,
                    status: 'connecting',
                    error: null,
                    debugInfo: null,
                    isTradeAuthorized: false,
                    tradeWsStatus: 'disconnected',
                    backendStatus: 'disconnected',
                    isBackendAuthorized: false
                });

                // 4. Persistence redundancy
                if (typeof window !== 'undefined' && token) {
                    localStorage.setItem('deriv_token', token);
                }

                // 5. Update Tick Channel (triggers its own internal logic)
                derivWS.setToken(token);

                // 5. Re-initiate fresh connections after cleanup buffer
                setTimeout(async () => {
                    console.log('[DerivStore] Re-initiating fresh trading channels...');
                    tradeWS.connect();
                    // tradeWS.authorize(token) is handled inside tradeWS.connect()'s onopen

                    backendWS.connect();
                    // backendWS.authorize(token) is handled inside backendWS.connect()'s onopen
                }, 1200);
            },

            setTradeWsStatus: (tradeWsStatus: ConnectionStatus) => set({ tradeWsStatus }),
            setTradeAuthorized: (isTradeAuthorized: boolean) => set({ isTradeAuthorized }),
            updateTradeMetrics: (metrics: any) => set((state: DerivState) => ({
                tradeMetrics: { ...state.tradeMetrics, ...metrics }
            })),

            subscribeToMarket: (symbol: string) => {
                const { status } = get();

                console.log(`[DerivStore] Requesting Market Switch: ${symbol}`);

                // 1. Subscribe Direct (DerivWS)
                if (status === 'connected') {
                    derivWS.subscribeTicks(symbol);
                }

                // 2. Request via Backend (Execution Engine)
                import('../lib/backend-ws').then(({ backendWS }) => {
                    backendWS.subscribeToMarket(symbol);
                });
            },

            resetTicks: () => set({ ticks: [], lastTick: null }),

            setAppId: (id: string) => {
                console.log(`[DerivStore] Manually switching App ID to: ${id}`);
                derivWS.setAppId(id);
            },

            testPing: () => {
                import('../lib/backend-ws').then(({ backendWS }) => {
                    backendWS.testPing();
                });
            },

            toggleAdaptiveSide: () => set((state: DerivState) => ({
                triggers: {
                    ...state.triggers,
                    adaptiveEvenOdd: {
                        ...state.triggers.adaptiveEvenOdd,
                        currentSide: state.triggers.adaptiveEvenOdd.currentSide === 'Even' ? 'Odd' : 'Even'
                    }
                }
            })),

            updateTriggers: (updates) => set((state: DerivState) => ({
                triggers: {
                    ...state.triggers,
                    ...updates
                }
            })),
        }),
        {
            name: 'deriv-store',
            version: 5, // Bump version to clear old storage data
            storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { },
            })),
            migrate: (persistedState: any, version: number) => {
                if (version < 5) {
                    // Force clear or reset triggers if structure changed
                    return {
                        ...persistedState,
                        triggers: {
                            entryDigit: {
                                enabled: false,
                                entryDigit: 5,
                                triggerOnEntry: false,
                                monitorTicks: 5,
                                consecutive: 2,
                                type: 'Under',
                                targetValue: 4,
                            },
                            digitPattern: {
                                enabled: true,
                                pattern: ['D', 'D', 'M', 'D', 'D'],
                                compareDigit: 2,
                            },
                            adaptiveEvenOdd: {
                                enabled: false,
                                currentSide: 'Even',
                            },
                        }
                    };
                }
                return persistedState;
            },
            partialize: (state) => ({
                token: state.token,
                market: state.market,
                contractType: state.contractType,
                prediction: state.prediction,
                triggerSequence: state.triggerSequence,
                triggerMode: state.triggerMode,
                initialStake: state.initialStake,
                martingaleMultiplier: state.martingaleMultiplier,
                maxMartingaleSteps: state.maxMartingaleSteps,
                takeProfit: state.takeProfit,
                stopLoss: state.stopLoss,
                stopAfterTotalWins: state.stopAfterTotalWins,
                stopAfterConsecutiveLosses: state.stopAfterConsecutiveLosses,
                compoundProfits: state.compoundProfits,
                resetOnLoss: state.resetOnLoss,
                triggers: state.triggers,
                tradePattern: state.tradePattern,
                tradingMode: state.tradingMode,
                virtualSettings: state.virtualSettings,
                recoverySettings: state.recoverySettings
            })
        }
    )
);


// Export the store
// (Cleanup: removed top-level init calls to prevent SSR crashes)
