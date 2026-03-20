'use client';

import React from 'react';
import { Toggle, Select, Button } from '../ui';
import { useDerivStore } from '@/masterbot/store/useDerivStore';
import { DIGIT_VALUES } from '@/masterbot/lib/deriv/constants';
import { Plus, Minus, RotateCcw } from 'lucide-react';

const PATTERN_TYPES = [
    { value: 'E', label: 'E=Even', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
    { value: 'O', label: 'O=Odd', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { value: 'D', label: 'D=Differs', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    { value: 'M', label: 'M=Matches', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    { value: 'V', label: 'V=Over', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
    { value: 'U', label: 'U=Under', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { value: 'SE', label: 'SE=Same Even', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    { value: 'SO', label: 'SO=Same Odd', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
];

const PATTERN_COLORS: Record<string, string> = {
    E: 'bg-teal-500',
    O: 'bg-amber-500',
    D: 'bg-red-500',
    M: 'bg-green-500',
    V: 'bg-teal-600',
    U: 'bg-blue-600',
    SE: 'bg-cyan-600',
    SO: 'bg-purple-600',
};

export function DigitPattern() {
    const { triggers, setTrigger } = useDerivStore();
    const config = triggers.digitPattern;

    const update = (fields: any) => setTrigger('digitPattern', fields);

    const addStep = () => {
        if (config.pattern.length < 8) {
            update({ pattern: [...config.pattern, 'D'] });
        }
    };

    const removeStep = () => {
        if (config.pattern.length > 1) {
            update({ pattern: config.pattern.slice(0, -1) });
        }
    };

    const cycleStep = (index: number) => {
        const types = ['E', 'O', 'D', 'M', 'V', 'U', 'SE', 'SO'];
        const current = config.pattern[index];
        const next = types[(types.indexOf(current) + 1) % types.length];
        const newPattern = [...config.pattern];
        newPattern[index] = next;
        update({ pattern: newPattern });
    };

    return (
        <div className="space-y-4 pt-4 border-t border-dark/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">👁</span>
                    <span className="text-sm font-medium">Digit Pattern</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <button onClick={removeStep} className="p-1 hover:text-white text-gray-400"><Minus className="w-4 h-4" /></button>
                        <button onClick={addStep} className="p-1 hover:text-white text-gray-400"><Plus className="w-4 h-4" /></button>
                        <button onClick={() => update({ pattern: ['D', 'D', 'M', 'D', 'D'] })} className="p-1 hover:text-white text-gray-400 ml-1"><RotateCcw className="w-4 h-4" /></button>
                    </div>
                    <Toggle
                        enabled={config.enabled}
                        onChange={(enabled) => update({ enabled })}
                    />
                </div>
            </div>

            {config.enabled && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-wrap gap-2">
                        {config.pattern.map((step, idx) => (
                            <button
                                key={idx}
                                onClick={() => cycleStep(idx)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white transition-all transform active:scale-90 ${PATTERN_COLORS[step] || 'bg-gray-600'}`}
                            >
                                {step}
                            </button>
                        ))}
                    </div>

                    <Select
                        label="Compare Digit (for D/M/V/U)"
                        options={DIGIT_VALUES}
                        value={config.compareDigit.toString()}
                        onChange={(val) => update({ compareDigit: parseInt(val) })}
                    />

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                        {PATTERN_TYPES.map(type => (
                            <div key={type.value} className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-sm ${PATTERN_COLORS[type.value]}`} />
                                <span className="text-[10px] text-gray-400">{type.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="text-[10px] text-gray-500 italic mt-2">
                        Detect pattern: {config.pattern.map((s, i) => (
                            <span key={i}>
                                <span className={s === 'M' ? 'text-green-400' : s === 'D' ? 'text-red-400' : 'text-teal-400'}>
                                    {s === 'E' ? 'Even' : s === 'O' ? 'Odd' : s === 'D' ? 'Differs' : s === 'M' ? 'Matches' : s === 'V' ? 'Over' : s === 'U' ? 'Under' : s === 'SE' ? 'SameEven' : 'SameOdd'}
                                </span>
                                {i < config.pattern.length - 1 && ' → '}
                            </span>
                        ))} (vs digit {config.compareDigit})
                    </div>
                </div>
            )}
        </div>
    );
}
