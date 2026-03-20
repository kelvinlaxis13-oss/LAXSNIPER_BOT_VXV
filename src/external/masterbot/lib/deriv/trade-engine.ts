import { backendWS } from '../backend-ws';
import { derivWS } from './websocket';
import { DominanceFilter } from '../triggers/dominance-filter'; // Import
import { evaluateDigitPatternTrigger, evaluateEntryDigitStateful, EntryTriggerState } from '../triggers/evaluator';
import { TickData, DerivMessage } from './types';
import { sanitizeStake } from './security';
import { ticksToDecimals } from './constants';
import { tradeWS } from './trade-ws';

class TradeEngine {
    private currentStake = 0;
    private lossCount = 0;
    private hasFirstTriggerHit = false;
    private cumulativeSessionLoss = 0; // Tracks loss for Recovery Mode
    private originalSettingsBeforeRecovery: any = null;

    // Filters
    private dominanceFilter = new DominanceFilter(); // Persistent Instance

    // Concurrent Trade Tracking
    private activeContracts = new Map<number, {
        stake: number;
        prediction: number;
        contractType: string;
        startTime: number;
    }>();

    private virtualTrades: any[] = [];
    // Dependency Injection for Circular Fix
    private getState: (() => any) | null = null;
    private setState: ((state: any) => void) | null = null;

    // Stateful Trigger State
    private entryTriggerState: EntryTriggerState = { isActive: false, hasMatched: false, searchBuffer: [] };

    private isRegistered = false;

    constructor() {
        // Registration moved to init for singleton stability
    }

    public init(getState: () => any, setState: (state: any) => void) {
        this.getState = getState;
        this.setState = setState;

        // Re-register with tradeWS (Listeners are cleared in useDerivStore.connect)
        tradeWS.onEvent((type, data) => this.handleInternalEvent(type, data));
    }

    /**
     * Reset all internal mutable state when the bot is stopped.
     * CRITICAL: Without this, stale entryTriggerState / hasFirstTriggerHit
     * carries over to the next run and can block entries entirely.
     */
    public stop() {
        this.currentStake = 0;
        this.lossCount = 0;
        this.hasFirstTriggerHit = false;
        this.entryTriggerState = { isActive: false, hasMatched: false, searchBuffer: [] };
        this.virtualTrades = [];
        console.log('[TradeEngine] Engine state fully reset (stop called).');
    }

    public onTick(tick: TickData, state: any) {
        // 0. Global Safety (Bot Stopped or Disconnected)
        if (!state.isRunning || !derivWS.isStable || state.backendStatus !== 'connected') return;

        // Safety: ensure triggers are fully hydrated (prevents crash on stale localStorage)
        if (!state.triggers?.entryDigit || !state.triggers?.digitPattern || !state.triggers?.adaptiveEvenOdd) {
            console.warn('[TradeEngine] triggers not fully hydrated yet, skipping tick.');
            return;
        }

        const {
            ticks,
            triggers,
            tradePattern,
            currentStep,
            tradingMode,
            initialStake,
            takeProfit,
            stopLoss,
            stats
        } = state;

        // CRITICAL SYNC FIX: 
        // The store calls onTick() BEFORE updating its 'ticks' state.
        // So 'state.ticks' is lagging by 1 tick.
        // We must calculate the current digit from the raw 'tick' object here.

        const precision = (tick.pip_size !== undefined && tick.pip_size > 0 && tick.pip_size < 1)
            ? Math.abs(Math.round(Math.log10(1 / tick.pip_size)))
            : (tick.pip_size || ticksToDecimals(state.market));
        const factor = Math.pow(10, precision);
        const roundedPrice = Math.round(tick.quote * factor) / factor;
        const priceString = roundedPrice.toFixed(precision);
        const currentDigit = parseInt(priceString[priceString.length - 1]);

        // Construct the TRUE history including the potential new digit
        // We handle the array generically to match store limit (though only last N matter for patterns)
        const latestTicks = [...ticks, currentDigit];

        // 0. Update Dominance Filter
        const domState = this.dominanceFilter.update(currentDigit);

        // 1. Evaluate Triggers (Stateful)
        let triggersPassed = false;
        let isVirtualReady = false;

        const { triggerSequence, triggerMode, currentPipelineStep } = state;

        // Ensure triggers are properly instantiated
        const isEntryEnabled = triggers.entryDigit.enabled;
        const isPatternEnabled = triggers.digitPattern.enabled;
        const isVirtualEnabled = state.virtualSettings.isVirtualMode;

        // Filter out disabled modules from the theoretical sequence
        const activeSequence = triggerSequence.filter((mod: string) => {
            if (mod === 'entry') return isEntryEnabled;
            if (mod === 'pattern') return isPatternEnabled;
            if (mod === 'virtual') return isVirtualEnabled;
            return false;
        });

        // Evaluate conditions independently first so we can use them in either mode
        // A. Evaluate Entry Digit
        const entryResult = evaluateEntryDigitStateful(currentDigit, triggers.entryDigit, this.entryTriggerState);
        this.entryTriggerState = entryResult.newState;
        const entryDigitPassed = entryResult.isTriggered;

        // B. Evaluate Pattern
        // Use latestTicks so we check the pattern ending in the CURRENT digit
        const patternPassed = evaluateDigitPatternTrigger(latestTicks, triggers.digitPattern as any);

        let statusMsg = '';

        if (activeSequence.length === 0) {
            triggersPassed = true; // No triggers active, trade immediately on pattern
            statusMsg = "Pattern Mode (No Triggers)";
        } else {
            if (triggerMode === 'sequential') {
                // SEQUENTIAL PIPELINE LOGIC
                // We only check the module at `currentPipelineStep`
                if (currentPipelineStep >= activeSequence.length) {
                    // Sequence Complete!
                    triggersPassed = true;
                    statusMsg = `[Seq] SEQUENCE COMPLETE! Evaluating Action...`;
                } else {
                    const currentModule = activeSequence[currentPipelineStep];
                    statusMsg = `[Seq ${currentPipelineStep + 1}/${activeSequence.length}] Wait: ${currentModule.toUpperCase()}`;

                    if (currentModule === 'entry') {
                        if (entryDigitPassed) {
                            state.setPipelineStep(currentPipelineStep + 1);
                            statusMsg = `[Seq] Entry MATCH! Advancing...`;
                            if (currentPipelineStep + 1 >= activeSequence.length) {
                                triggersPassed = true;
                            }
                        } else if (this.entryTriggerState.isActive) {
                            const bufferLen = this.entryTriggerState.searchBuffer.length;
                            const remaining = triggers.entryDigit.monitorTicks - bufferLen;
                            statusMsg = `[Seq] Entry [${triggers.entryDigit.entryDigit}] Found! Expires in ${remaining}t`;
                        }
                    } else if (currentModule === 'pattern') {
                        if (patternPassed) {
                            console.log(`[TradeEngine] ✅ Pattern Trigger MATCHED for Step ${currentStep}`);
                            state.setPipelineStep(currentPipelineStep + 1);
                            statusMsg = `Pattern Mod ${currentStep} Done`;
                            if (currentPipelineStep + 1 >= activeSequence.length) {
                                triggersPassed = true;
                            }
                        } else {
                            statusMsg = `Waiting for Pattern Step ${currentStep}...`;
                            // Add debug logging for SE/SO pattern failures
                            // if (triggers.digitPattern.pattern.some(p => p.includes('S'))) {
                            //     // This will be caught by the evaluator's internal debug logs if I enabled them
                            // }
                        }
                    } else if (currentModule === 'virtual') {
                        // Virtual simply arms the 'isVirtualReady' flag which executeTrade will consume
                        // Once the virtual threshold is hit (handled inside processVirtualTrades or executeTrade), 
                        // it will manually advance currentPipelineStep.
                        isVirtualReady = true;
                        triggersPassed = true; // Temporary pass to trigger a virtual trade
                        statusMsg = `[Seq] Virtual Tracking Active...`;
                    }
                }
            } else {
                // SIMULTANEOUS LOGIC (AND gate)
                const passes = activeSequence.every((mod: string) => {
                    if (mod === 'entry') return entryDigitPassed;
                    if (mod === 'pattern') return patternPassed;
                    if (mod === 'virtual') return isVirtualEnabled; // Virtual is technically always "passing" to allow execution
                    return false;
                });

                if (passes) {
                    triggersPassed = true;
                    if (isVirtualEnabled) isVirtualReady = true;
                    statusMsg = `[Simul] ALL Triggers Matched! Trading...`;
                } else {
                    statusMsg = `[Simul] Waiting for conditions... ${entryDigitPassed ? 'E:(X)' : 'E:( )'} ${patternPassed ? 'P:(X)' : 'P:( )'}`;
                }
            }
        }

        // --- DOMINANCE FILTER DISABLED ---
        const isFilteredByDominance = false;

        // If NO triggers matches and no status set
        if (!statusMsg) statusMsg = 'Analyzing Market...';
        state.setTriggerStatus(statusMsg);

        // Sequence Mode 'after_first' adherence (Only affects real execution after sequence completion)
        if (tradingMode === 'after_first') {
            if (this.hasFirstTriggerHit) {
                triggersPassed = true; // Lock open
                state.setTriggerStatus("Sequence Locked Open");
            } else if (triggersPassed && currentPipelineStep >= activeSequence.length) {
                console.log(`[TradeEngine] Sequence COMPLETE at Tick ${tick.quote}! Starting Pattern IMMEDIATELY.`);
                this.hasFirstTriggerHit = true;
                state.setTriggerStatus("SEQUENCE COMPLETE! STARTING...");
            }
        } else {
            // Continuous check mode: If pipeline is complete, guarantee triggersPassed is true for this tick
            if (currentPipelineStep >= activeSequence.length) {
                triggersPassed = true;
            }
        }

        // Handle Virtual Trade Processing
        this.processVirtualTrades(tick, state);

        // --- STRICT PATTERN ADHERENCE BLOCK ---
        if (!triggersPassed) {
            // Wait patiently for the triggers to match the current pattern step criteria.
            return;
        }

        // 2. Execute Pattern Action
        const currentAction = tradePattern[currentStep - 1];

        if (currentAction === 'trade') {
            // Risk Checks
            if (stats.totalProfit >= takeProfit || stats.totalProfit <= -stopLoss) {
                state.stopBot();
                return;
            }

            if (state.stopAfterTotalWins.enabled && stats.won >= state.stopAfterTotalWins.value) {
                state.stopBot();
                return;
            }

            // Calculate Stake
            if (this.currentStake === 0) this.currentStake = initialStake;

            // Override with recovery stake if active
            let tradeStake = state.isRecoveryActive
                ? state.recoverySettings.recoveryStake
                : sanitizeStake(this.currentStake);

            // Execute
            this.executeTrade(state, tradeStake);
        }

        // 3. Always Advance Step (Since we passed triggers or executed an action)
        state.advanceStep();

        // 4. Pipeline Reset after trade fires
        // After the full sequence is complete and a trade/skip action fires, reset the
        // pipeline step so the next pattern step re-evaluates conditions fresh.
        // This ensures NO entries are skipped in after_first mode.
        if (triggersPassed && currentPipelineStep >= activeSequence.length) {
            // Pipeline was complete - reset for next cycle
            if (tradingMode === 'continuous_check') {
                state.setPipelineStep(0);
                this.entryTriggerState = { isActive: false, hasMatched: false, searchBuffer: [] };
            }
            // In after_first mode: hasFirstTriggerHit keeps it open, no reset needed
        }
    }

    private async executeTrade(state: any, stake: number) {
        // Snapshot current values
        const { virtualSettings } = state;
        const tradeStake = stake;
        let tradeContractType = state.contractType;

        // Adaptive Even/Odd Switching logic (with null guard)
        if (state.triggers?.adaptiveEvenOdd?.enabled) {
            tradeContractType = state.triggers.adaptiveEvenOdd.currentSide === 'Even' ? 'DIGITEVEN' : 'DIGITODD';
        }

        const tradePrediction = state.prediction;
        const symbol = state.market;

        console.log(`[TradeEngine] Attempting Execute -> isVirtual: ${virtualSettings.isVirtualMode} Stake: ${tradeStake} Market: ${symbol}`);

        if (virtualSettings.isVirtualMode) {
            console.log(`[TradeEngine] Placing VIRTUAL Trade. Stake: ${tradeStake}`);
            const vRequestId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            this.virtualTrades.push({
                requestId: vRequestId,
                startTime: Date.now(),
                contractType: tradeContractType,
                prediction: tradePrediction,
                stake: tradeStake,
                symbol: symbol,
                duration: 1, // Default to 1 tick
                currentTick: 0,
                entryTickQuote: state.lastTick?.quote
            });
            state.addTradeLog({
                requestId: vRequestId,
                isVirtual: true,
                time: Date.now(),
                contract: tradeContractType,
                digit: tradePrediction,
                stake: tradeStake,
                currency: state.account?.currency || 'USD',
                profit: null,
                result: '',
                exit: null
            });
            return; // Eject out of Real execution
        }

        console.log(`[TradeEngine] Executing REAL Trade Tick. Stake: ${tradeStake}`);

        const payload: any = {
            symbol: state.isRecoveryActive ? state.recoverySettings.recoveryMarket : symbol,
            contract_type: state.isRecoveryActive ? state.recoverySettings.recoveryContractType : tradeContractType,
            duration: 1,
            duration_unit: 't',
            stake: Number(tradeStake.toFixed(2)),
            currency: state.account?.currency || 'USD',
        };

        const BARRIER_TYPES = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'];
        const PREDICTION_TYPES = ['DIGITEVEN', 'DIGITODD']; // types that should NOT have prediction or barrier

        const activeContractType = payload.contract_type;
        const activePrediction = state.isRecoveryActive ? state.recoverySettings.recoveryPrediction : tradePrediction;

        if (BARRIER_TYPES.includes(activeContractType)) {
            payload.barrier = activePrediction;
        } else if (!PREDICTION_TYPES.includes(activeContractType)) {
            // For standard Rise/Fall or others, we don't send prediction digits.
        }

        backendWS.sendTrade(payload);
    }

    /**
     * Internal Event Contract - Driven by TradeWS
     */
    public handleInternalEvent(type: string, data: any) {
        const state = this.getState ? this.getState() : null;
        if (!state) return;

        switch (type) {
            case 'TRADE_STARTED':
                console.log(`[TradeEngine] Event: STARTED - Contract: ${data.contractId}`);
                // Could update UI state here if needed
                break;

            case 'CONTRACT_UPDATE':
                // Live updates if we want to show current price/spot
                break;

            case 'TRADE_RESULT':
                console.log(`[TradeEngine] Event: RESULT - Win: ${data.isWin}, Profit: ${data.profit}`);
                this.handleTradeResult(data.isWin, data.profit);
                break;
        }
    }

    private processVirtualTrades(tick: TickData, state: any) {
        if (this.virtualTrades.length === 0) return;

        this.virtualTrades = this.virtualTrades.filter(vt => {
            vt.currentTick++;
            if (vt.currentTick >= vt.duration) {
                // Settle
                const isWin = this.calculateVirtualResult(vt, tick);
                this.handleVirtualResult(isWin, vt.stake);

                const precision = (vt.pip_size !== undefined && vt.pip_size > 0 && vt.pip_size < 1)
                    ? Math.abs(Math.round(Math.log10(1 / vt.pip_size)))
                    : (vt.pip_size || ticksToDecimals(vt.symbol));
                const priceString = tick.quote.toFixed(precision);
                const exitDigit = parseInt(priceString.charAt(priceString.length - 1), 10);
                const profit = isWin ? vt.stake * 0.95 : -vt.stake;

                state.addTradeLog({
                    requestId: vt.requestId,
                    isVirtual: true,
                    time: Date.now(),
                    contract: vt.contractType,
                    digit: vt.prediction,
                    stake: vt.stake,
                    currency: state.account?.currency || 'USD',
                    profit: profit,
                    result: isWin ? 'WON' : 'LOST',
                    exit: exitDigit
                });

                return false;
            }
            return true;
        });
    }

    private calculateVirtualResult(vt: any, exitTick: TickData): boolean {
        const exitQuote = exitTick.quote;

        // Robust precision: convert pip_size multiplier (e.g. 0.001) to decimal count (3)
        // Same formula used in onTick() to guarantee consistency across all markets
        const rawPipSize = exitTick.pip_size;
        const precision = (rawPipSize !== undefined && rawPipSize > 0 && rawPipSize < 1)
            ? Math.abs(Math.round(Math.log10(1 / rawPipSize)))
            : (rawPipSize || ticksToDecimals(vt.symbol));

        const priceString = exitQuote.toFixed(precision);
        const exitDigit = parseInt(priceString.charAt(priceString.length - 1), 10);

        console.log(`[TradeEngine] Virtual Settlement: Quote=${exitQuote} Precision=${precision} ExitDigit=${exitDigit} Prediction=${vt.prediction} Type=${vt.contractType}`);

        switch (vt.contractType) {
            case 'DIGITOVER': return exitDigit > vt.prediction;
            case 'DIGITUNDER': return exitDigit < vt.prediction;
            case 'DIGITMATCH': return exitDigit === vt.prediction;
            case 'DIGITDIFF': return exitDigit !== vt.prediction;
            case 'DIGITEVEN': return exitDigit % 2 === 0;
            case 'DIGITODD': return exitDigit % 2 !== 0;
            default: return false;
        }
    }

    private handleVirtualResult(isWin: boolean, stake: number) {
        if (!this.getState || !this.setState) return;
        const state = this.getState();
        const { virtualSettings, setVirtualSettings } = state;

        let {
            virtualWins,
            virtualLosses,
            vConsecWins,
            vConsecLosses,
        } = virtualSettings;

        if (isWin) {
            vConsecWins++;
            vConsecLosses = 0;
            virtualWins++;
        } else {
            vConsecWins = 0;
            vConsecLosses++;
            virtualLosses++;
        }

        console.log(`[TradeEngine] Virtual Result: ${isWin ? 'WIN' : 'LOSS'}. Streak: W:${vConsecWins} L:${vConsecLosses}`);

        setVirtualSettings({ virtualWins, virtualLosses, vConsecWins, vConsecLosses });

        // Check Switch to Real
        if (virtualSettings.startVirtualToReal && virtualSettings.isVirtualMode) {
            const threshold = virtualSettings.vThreshold;
            const mode = virtualSettings.vTriggerMode;
            const type = virtualSettings.vTriggerType;
            let shouldSwitch = false;

            if (type === 'wins') {
                const val = (mode === 'consec') ? vConsecWins : virtualWins;
                if (val >= threshold) shouldSwitch = true;
            } else {
                const val = (mode === 'consec') ? vConsecLosses : virtualLosses;
                if (val >= threshold) shouldSwitch = true;
            }

            if (shouldSwitch) {
                console.log(`[TradeEngine] 🚀 VIRTUAL THRESHOLD MET: Switching to REAL Mode.`);
                setVirtualSettings({
                    isVirtualMode: false,
                    realWins: 0,
                    realLosses: 0,
                    rConsecWins: 0,
                    rConsecLosses: 0
                });
                // Reset Pattern Sequence so Real Mode follows strictly from the beginning
                state.setCurrentStep(1);

                // Pipeline Advancement Logic
                if (state.triggerMode === 'sequential') {
                    // Re-calculate active sequence assuming virtual WAS enabled to find our index
                    const activeSequence = state.triggerSequence.filter((mod: string) => {
                        if (mod === 'entry') return state.triggers.entryDigit.enabled;
                        if (mod === 'pattern') return state.triggers.digitPattern.enabled;
                        if (mod === 'virtual') return true; // It was enabled a millisecond ago
                        return false;
                    });

                    if (state.currentPipelineStep < activeSequence.length && activeSequence[state.currentPipelineStep] === 'virtual') {
                        state.setPipelineStep(state.currentPipelineStep + 1);
                        console.log(`[TradeEngine] Pipeline advanced past VIRTUAL.`);
                    }
                }
            }
        }
    }

    public stop() {
        this.hasFirstTriggerHit = false;
        this.currentStake = 0;
        this.lossCount = 0;
        this.cumulativeSessionLoss = 0;
        this.originalSettingsBeforeRecovery = null;
        this.activeContracts.clear();
        this.entryTriggerState = { isActive: false, hasMatched: false, searchBuffer: [] };
        this.virtualTrades = [];
    }

    public handleTradeResult(isWin: boolean, actualProfit: number) {
        if (!this.getState || !this.setState) return;
        const state = this.getState();
        const {
            initialStake,
            martingaleMultiplier,
            maxMartingaleSteps,
            compoundProfits,
            stopAfterTotalWins,
            stopAfterTotalLosses,
            stopAfterConsecutiveLosses,
            stats,
            virtualSettings,
            setVirtualSettings,
            takeProfit,
            stopLoss
        } = state;

        let profitToRecord = actualProfit;

        // ⚡ PROFIT FALLBACK: 
        // If it's a loss but the profit is 0 (or positive?), force it to -stake to ensure accuracy in Net Profit.
        if (!isWin && profitToRecord >= 0) {
            const currentStakeValue = this.currentStake || initialStake;
            console.warn(`[TradeEngine] Loss detected with non-negative profit [${profitToRecord}]. Falling back to -stake [-${currentStakeValue}]`);
            profitToRecord = -currentStakeValue;
        }

        console.log(`[TradeEngine] Result received: ${isWin ? 'WIN' : 'LOSS'}. Recorded Profit: ${profitToRecord}`);

        // Track Cumulative Session Loss for Recovery Mode (New Additions Kept)
        if (!isWin) {
            this.cumulativeSessionLoss += Math.abs(profitToRecord);
        } else {
            this.cumulativeSessionLoss -= profitToRecord;
            if (this.cumulativeSessionLoss < 0) this.cumulativeSessionLoss = 0;
        }

        // --- RECOVERY MODE LOGIC (New Additions Kept) ---
        if (state.recoverySettings.enabled) {
            if (!state.isRecoveryActive && this.lossCount >= state.recoverySettings.lossThreshold) {
                console.log(`[TradeEngine] 🚨 RECOVERY MODE ACTIVATED! Loss Threshold [${state.recoverySettings.lossThreshold}] hit.`);
                state.toggleRecovery(true);
            } else if (state.isRecoveryActive && this.cumulativeSessionLoss <= 0) {
                console.log(`[TradeEngine] ✅ RECOVERY COMPLETE! Returning to normal settings.`);
                state.toggleRecovery(false);
                this.lossCount = 0; // Reset loss count once recovered
                this.currentStake = initialStake;
            }
        }

        // 1. Calculate Next Stake (Original Fast Logic)
        const isTradeWin = isWin; // Standardize win detection

        // 1. Calculate Next Stake (Original Fast Logic)
        if (isTradeWin) {
            this.lossCount = 0;
            if (compoundProfits) {
                this.currentStake = (this.currentStake || initialStake) + profitToRecord;
            } else {
                this.currentStake = initialStake;
            }
        } else {
            this.lossCount++;
            if (this.lossCount > maxMartingaleSteps) {
                this.currentStake = initialStake;
                this.lossCount = 0;
            } else {
                this.currentStake = (this.currentStake || initialStake) * martingaleMultiplier;
            }
        }

        this.currentStake = sanitizeStake(this.currentStake);

        // 2. Update Store Statistics (Original Atomic Update)
        this.setState((state: any) => {
            const currentStats = state.stats;
            const newTotalTrades = currentStats.totalTrades + 1;
            const newWon = currentStats.won + (isTradeWin ? 1 : 0);
            const newLost = currentStats.lost + (isTradeWin ? 0 : 1);
            const newTotalProfit = currentStats.totalProfit + profitToRecord;

            return {
                stats: {
                    ...currentStats,
                    totalTrades: newTotalTrades,
                    won: newWon,
                    lost: newLost,
                    totalProfit: newTotalProfit,
                    maxStake: Math.max(currentStats.maxStake, this.currentStake),
                    winRate: Math.round((newWon / newTotalTrades) * 100)
                }
            };
        });

        // 3. ⚡ INSTANT STOP CONDITIONS
        // We fetch the state again to get the LATEST limits and the updated stats
        const finalState = this.getState();
        const finalStats = finalState.stats;

        const isStopLossHit = finalStats.totalProfit <= -stopLoss;
        const isTakeProfitHit = finalStats.totalProfit >= takeProfit;
        const isTotalWinsHit = stopAfterTotalWins.enabled && finalStats.won >= stopAfterTotalWins.value;
        const isTotalLossesHit = stopAfterTotalLosses?.enabled && finalStats.lost >= stopAfterTotalLosses.value;
        const isConsecutiveLossesHit = stopAfterConsecutiveLosses.enabled && this.lossCount >= stopAfterConsecutiveLosses.value;

        // Adaptive Switching (Handle BEFORE instant stop to ensure next start is on correct side)
        // Null guard required: triggers may not be fully hydrated from old localStorage
        if (finalState.triggers?.adaptiveEvenOdd?.enabled && !isTradeWin) {
            console.log(`[TradeEngine] Adaptive Switch: Loss detected. Toggling target side.`);
            finalState.toggleAdaptiveSide();
        }

        if (isStopLossHit || isTakeProfitHit || isTotalWinsHit || isTotalLossesHit || isConsecutiveLossesHit) {
            let reason = 'Stop limit reached';
            if (isStopLossHit) reason = `Stop Loss [${stopLoss}] reached`;
            if (isTakeProfitHit) reason = `Take Profit [${takeProfit}] reached`;
            if (isTotalWinsHit) reason = `Total Wins [${stopAfterTotalWins.value}] reached`;
            if (isTotalLossesHit) reason = `Total Losses [${stopAfterTotalLosses.value}] reached`;
            if (isConsecutiveLossesHit) reason = `Consecutive Losses [${stopAfterConsecutiveLosses.value}] reached`;

            console.log(`[TradeEngine] 🛑 HALTING BOT: ${reason}. Total Profit: ${finalStats.totalProfit}`);
            state.stopBot();
            return;
        }

        // 4. Track Virtual Stats (Original Logic)
        if (!virtualSettings.isVirtualMode) {
            let { realWins, realLosses, rConsecWins, rConsecLosses } = virtualSettings;
            if (isWin) {
                rConsecWins++;
                rConsecLosses = 0;
                realWins++;
            } else {
                rConsecWins = 0;
                rConsecLosses++;
                realLosses++;
            }
            setVirtualSettings({ realWins, realLosses, rConsecWins, rConsecLosses });
        }
    }
}
const G = globalThis as any;
if (!G.__tradeEngine) {
    G.__tradeEngine = new TradeEngine();
}
export const tradeEngine = G.__tradeEngine as TradeEngine;
