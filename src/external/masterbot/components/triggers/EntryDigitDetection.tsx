'use client';

import React from 'react';
import { Toggle, Select } from '../ui';
import { useDerivStore } from '@/masterbot/store/useDerivStore';
import { DIGIT_VALUES } from '@/masterbot/lib/deriv/constants';

const MONITOR_TICK_OPTIONS = [1, 2, 3, 4, 5, 8, 10, 15, 20].map(v => ({ value: v.toString(), label: v.toString() }));
const CONSECUTIVE_OPTIONS = [1, 2, 3, 4, 5].map(v => ({ value: v.toString(), label: v.toString() }));
const TYPE_OPTIONS = [
    { value: 'Over', label: 'Over' },
    { value: 'Under', label: 'Under' },
    { value: 'Even', label: 'Even' },
    { value: 'Odd', label: 'Odd' },
    { value: 'Match', label: 'Matches' },
    { value: 'Diff', label: 'Differs' },
];

export function EntryDigitDetection() {
    const { triggers, setTrigger } = useDerivStore();
    const config = triggers.entryDigit;

    const update = (fields: any) => setTrigger('entryDigit', fields);

    return (
        <div className="space-y-4 pt-2 border-t border-dark/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-teal-400 font-bold">#</span>
                    <span className="text-sm font-medium">Entry Digit Detection</span>
                </div>
                <Toggle
                    enabled={config.enabled}
                    onChange={(enabled) => update({ enabled })}
                />
            </div>

            {config.enabled && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    <Select
                        label="Entry Digit"
                        options={DIGIT_VALUES}
                        value={config.entryDigit.toString()}
                        onChange={(val) => update({ entryDigit: parseInt(val) })}
                        className="col-span-2"
                    />

                    {/* Mode Toggle */}
                    <div className="col-span-2 flex items-center justify-between p-3 rounded-lg bg-dark-secondary/50 border border-dark">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-200">Instant Trigger Mode</span>
                            <span className="text-[10px] text-gray-500">Fire immediately upon detecting entry digit (bypasses monitor)</span>
                        </div>
                        <Toggle
                            enabled={config.triggerOnEntry}
                            onChange={(enabled) => update({ triggerOnEntry: enabled })}
                        />
                    </div>

                    {!config.triggerOnEntry && (
                        <>
                            <Select
                                label="Monitor Ticks"
                                options={MONITOR_TICK_OPTIONS}
                                value={config.monitorTicks.toString()}
                                onChange={(val) => update({ monitorTicks: parseInt(val) })}
                            />
                            <Select
                                label="Consecutive"
                                options={CONSECUTIVE_OPTIONS}
                                value={config.consecutive.toString()}
                                onChange={(val) => update({ consecutive: parseInt(val) })}
                            />
                            <Select
                                label="Type"
                                options={TYPE_OPTIONS}
                                value={config.type}
                                onChange={(val: any) => update({ type: val })}
                            />
                            <Select
                                label={`${config.type} Digit`}
                                options={DIGIT_VALUES}
                                value={config.targetValue.toString()}
                                onChange={(val) => update({ targetValue: parseInt(val) })}
                            />
                        </>
                    )}

                    <div className="col-span-2 text-[10px] text-gray-500 italic p-2 bg-dark/30 rounded border border-dark/50">
                        {config.triggerOnEntry ? (
                            <span>detect <span className="text-teal-400 font-bold">{config.entryDigit}</span> → instantly passed</span>
                        ) : (
                            <span>After <span className="text-teal-400">{config.monitorTicks}</span> ticks →
                                detect <span className="text-teal-400">{config.consecutive} {config.type} {config.targetValue}</span> →
                                passed</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
