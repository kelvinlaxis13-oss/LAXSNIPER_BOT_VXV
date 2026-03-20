'use client';

import React from 'react';
import { useDerivStore } from '@/masterbot/store/useDerivStore';
import { Toggle, Badge } from '@/masterbot/components/ui';
import { RefreshCw, ArrowRightLeft } from 'lucide-react';

export function AdaptiveSwitch() {
    const { triggers, updateTriggers, toggleAdaptiveSide } = useDerivStore();
    const config = triggers.adaptiveEvenOdd;

    const toggleEnabled = () => {
        updateTriggers({
            adaptiveEvenOdd: {
                ...config,
                enabled: !config.enabled
            }
        });
    };

    const setCurrentSide = (side: 'Even' | 'Odd') => {
        updateTriggers({
            adaptiveEvenOdd: {
                ...config,
                currentSide: side
            }
        });
    };

    return (
        <div className="bg-dark-accent/30 rounded-lg p-3 space-y-3 border border-dark-border/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-warning" />
                    <span
                        className="text-sm font-medium cursor-pointer text-gray-200"
                        onClick={toggleEnabled}
                    >
                        Adaptive E/O Switch
                    </span>
                    {config.enabled && (
                        <Badge variant="warning">ACTIVE</Badge>
                    )}
                </div>
                <Toggle
                    enabled={config.enabled}
                    onChange={toggleEnabled}
                />
            </div>

            <p className="text-[11px] text-gray-400 leading-tight">
                Automatically switches between Even/Odd on loss to target the winning side.
            </p>

            {config.enabled && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-dark-border/20">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setCurrentSide('Even')}
                            className={`px-3 py-1 text-[11px] rounded transition-all ${config.currentSide === 'Even'
                                    ? 'bg-indigo-500 text-white font-bold'
                                    : 'bg-dark-hover text-gray-400 hover:text-white'
                                }`}
                        >
                            EVEN
                        </button>
                        <button
                            onClick={() => setCurrentSide('Odd')}
                            className={`px-3 py-1 text-[11px] rounded transition-all ${config.currentSide === 'Odd'
                                    ? 'bg-orange-500 text-white font-bold'
                                    : 'bg-dark-hover text-gray-400 hover:text-white'
                                }`}
                        >
                            ODD
                        </button>
                    </div>

                    <button
                        onClick={toggleAdaptiveSide}
                        className="p-1.5 hover:bg-dark-hover rounded text-gray-400 hover:text-warning transition-colors"
                        title="Manual Toggle"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}
