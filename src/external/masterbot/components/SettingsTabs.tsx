'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, Input, Toggle } from './ui';
import { Settings, BarChart2, DollarSign, Zap, FlaskConical, Target, AlertTriangle, ShieldCheck, LifeBuoy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDerivStore } from '@/masterbot/store/useDerivStore';
import { TradeSetup } from './TradeSetup';
import { VirtualSettings } from './VirtualSettings';
import { RecoverySettings } from './RecoverySettings';
import { ALL_MARKETS, CONTRACT_TYPES, DIGIT_VALUES } from '@/masterbot/lib/deriv/constants';

type TabType = 'trade' | 'money' | 'mgale' | 'virtual' | 'recovery';

export function SettingsTabs() {
    const [activeTab, setActiveTab] = useState<TabType>('trade');
    const settings = useDerivStore();
    const { market, contractType, prediction, setMarket, setContractType, setPrediction, setRiskSettings } = settings;
    const virtual = settings.virtualSettings;

    const tabs = [
        { id: 'trade', label: 'Trade', icon: <BarChart2 className="w-4 h-4" /> },
        { id: 'money', label: 'Money', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'mgale', label: 'M-Gale', icon: <Zap className="w-4 h-4" /> },
        { id: 'virtual', label: 'Virtual', icon: <FlaskConical className="w-4 h-4" /> },
        { id: 'recovery', label: 'Recovery', icon: <LifeBuoy className="w-4 h-4" /> },
    ];

    const isDigitType = ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(contractType);

    return (
        <Card className="min-h-[500px] flex flex-col border-indigo-500/10 transition-all duration-500 overflow-hidden">
            <div className="flex-none flex flex-wrap bg-dark-secondary/50 border-b border-dark p-1 gap-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex-1 min-w-[80px] flex flex-col md:flex-row items-center justify-center gap-1.5 py-3 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 relative ${activeTab === tab.id
                            ? 'text-white bg-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)] border border-indigo-500/30'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-dark-hover/50 border border-transparent'
                            }`}
                    >
                        <span className={activeTab === tab.id ? 'text-indigo-400' : ''}>{tab.icon}</span>
                        <span className="truncate">{tab.label}</span>
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute -bottom-1 left-1 right-1 h-0.5 bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]"
                            />
                        )}
                    </button>
                ))}
            </div>

            <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar max-h-[calc(100vh-150px)]">
                {activeTab === 'trade' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Market Selection</span>
                            <select
                                value={market}
                                onChange={(e) => setMarket(e.target.value)}
                                className="w-full bg-dark-secondary border-2 border-dark rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all"
                            >
                                {ALL_MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contract</span>
                                <select
                                    value={contractType}
                                    onChange={(e) => setContractType(e.target.value)}
                                    className="w-full bg-dark-secondary border-2 border-dark rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all"
                                >
                                    {CONTRACT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>

                            {isDigitType && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Prediction</span>
                                    <select
                                        value={prediction.toString()}
                                        onChange={(e) => setPrediction(parseInt(e.target.value))}
                                        className="w-full bg-dark-secondary border-2 border-dark rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all"
                                    >
                                        {DIGIT_VALUES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'money' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 p-4 bg-dark-secondary/50 rounded-2xl border border-dark">
                                <span className="text-[10px] font-black text-teal-400 uppercase tracking-tighter">Initial Stake</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.initialStake}
                                    onChange={(e) => setRiskSettings({ initialStake: parseFloat(e.target.value) })}
                                    className="w-full bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0 outline-none"
                                />
                            </div>
                            <div className="space-y-1.5 p-4 bg-dark-secondary/50 rounded-2xl border border-dark">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Currency</span>
                                <div className="text-xl font-black text-white py-1">{settings.account?.currency || 'USD'}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3 p-4 bg-dark-secondary/30 rounded-2xl border border-dark">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 px-1">
                                        <Target className="w-4 h-4 text-teal-400" />
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Wins Limit</span>
                                    </div>
                                    <Toggle
                                        enabled={settings.stopAfterTotalWins.enabled}
                                        onChange={(val) => setRiskSettings({ stopAfterTotalWins: { ...settings.stopAfterTotalWins, enabled: val } })}
                                    />
                                </div>
                                {settings.stopAfterTotalWins.enabled && (
                                    <input
                                        type="number"
                                        min="1"
                                        value={settings.stopAfterTotalWins.value}
                                        onChange={(e) => setRiskSettings({ stopAfterTotalWins: { ...settings.stopAfterTotalWins, value: parseInt(e.target.value) || 1 } })}
                                        className="w-full bg-dark-card border-2 border-dark rounded-xl px-4 py-3 text-xl font-black text-teal-400 focus:border-teal-500/50 outline-none transition-all text-center"
                                    />
                                )}
                            </div>

                            <div className="space-y-3 p-4 bg-dark-secondary/30 rounded-2xl border border-dark">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 px-1">
                                        <AlertTriangle className="w-4 h-4 text-red-400" />
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Loss Limit</span>
                                    </div>
                                    <Toggle
                                        enabled={settings.stopAfterTotalLosses?.enabled || false}
                                        onChange={(val) => setRiskSettings({ stopAfterTotalLosses: { ...(settings.stopAfterTotalLosses || { value: 5 }), enabled: val } })}
                                    />
                                </div>
                                {(settings.stopAfterTotalLosses?.enabled) && (
                                    <input
                                        type="number"
                                        min="1"
                                        value={settings.stopAfterTotalLosses.value}
                                        onChange={(e) => setRiskSettings({ stopAfterTotalLosses: { ...settings.stopAfterTotalLosses, value: parseInt(e.target.value) || 1 } })}
                                        className="w-full bg-dark-card border-2 border-dark rounded-xl px-4 py-3 text-xl font-black text-red-400 focus:border-red-500/50 outline-none transition-all text-center"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-teal-500/5 rounded-2xl border border-teal-500/10 flex items-center justify-between group hover:border-teal-500/30 transition-all duration-500">
                            <div className="space-y-0.5">
                                <span className="text-sm font-bold text-teal-400">Compound Wins</span>
                                <p className="text-[10px] text-gray-500 font-medium">Add profit to the next stake upon winning</p>
                            </div>
                            <Toggle enabled={settings.compoundProfits} onChange={(val) => setRiskSettings({ compoundProfits: val })} />
                        </div>
                    </div>
                )}

                {activeTab === 'mgale' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 p-4 bg-dark-secondary/50 rounded-2xl border border-dark">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Multiplier</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={settings.martingaleMultiplier}
                                    onChange={(e) => setRiskSettings({ martingaleMultiplier: parseFloat(e.target.value) })}
                                    className="w-full bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0 outline-none"
                                />
                            </div>
                            <div className="space-y-1.5 p-4 bg-dark-secondary/50 rounded-2xl border border-dark">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Max Steps</span>
                                <input
                                    type="number"
                                    value={settings.maxMartingaleSteps}
                                    onChange={(e) => setRiskSettings({ maxMartingaleSteps: parseInt(e.target.value) })}
                                    className="w-full bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0 outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-500">
                            <div className="space-y-0.5">
                                <span className="text-sm font-bold text-indigo-400">Reset on Loss</span>
                                <p className="text-[10px] text-gray-500 font-medium">Restart sequence after max steps</p>
                            </div>
                            <Toggle enabled={settings.resetOnLoss} onChange={(val) => setRiskSettings({ resetOnLoss: val })} />
                        </div>
                    </div>
                )}

                {activeTab === 'virtual' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 -mt-2 space-y-6">
                        {/* Initial Mode Selection */}
                        <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 flex items-center justify-between group hover:border-indigo-500/40 transition-all duration-500">
                            <div className="space-y-0.5">
                                <span className="text-sm font-bold text-white uppercase tracking-tighter">Initial Bot Mode</span>
                                <p className="text-[10px] text-gray-500 font-medium">Which mode to start with</p>
                            </div>
                            <div className="flex bg-dark rounded-xl p-1 border border-dark-hover">
                                <button
                                    onClick={() => settings.setVirtualSettings({ isVirtualMode: true })}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${virtual.isVirtualMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    VIRTUAL
                                </button>
                                <button
                                    onClick={() => settings.setVirtualSettings({ isVirtualMode: false })}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${!virtual.isVirtualMode ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    REAL
                                </button>
                            </div>
                        </div>

                        {/* Virtual -> Real Section */}
                        <div className="space-y-4 p-4 bg-dark-secondary/30 rounded-2xl border border-dark">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-sm font-bold text-indigo-400 uppercase tracking-tighter">Virtual → Real</span>
                                    <p className="text-[10px] text-gray-500 font-medium">Automatic switch to live trading</p>
                                </div>
                                <Toggle
                                    enabled={virtual.startVirtualToReal}
                                    onChange={(val) => settings.setVirtualSettings({ startVirtualToReal: val })}
                                />
                            </div>

                            {virtual.startVirtualToReal && (
                                <div className="space-y-4 pt-2 animate-in zoom-in-95 duration-300">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Threshold</span>
                                            <input
                                                type="number"
                                                value={virtual.vThreshold}
                                                onChange={(e) => settings.setVirtualSettings({ vThreshold: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-dark border-2 border-dark-hover rounded-xl px-4 py-2 text-sm font-bold text-indigo-400 focus:border-indigo-500/50 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Mode</span>
                                            <select
                                                value={virtual.vTriggerMode}
                                                onChange={(e) => settings.setVirtualSettings({ vTriggerMode: e.target.value as any })}
                                                className="w-full bg-dark border-2 border-dark-hover rounded-xl px-4 py-2 text-sm font-bold text-indigo-400 focus:border-indigo-500/50 outline-none"
                                            >
                                                <option value="consec">Consecutive</option>
                                                <option value="total">Total</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => settings.setVirtualSettings({ vTriggerType: 'wins' })}
                                            className={`py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${virtual.vTriggerType === 'wins' ? 'bg-teal-500/10 border-teal-500/50 text-teal-400' : 'bg-dark border-dark-hover text-gray-500'}`}
                                        >
                                            Wins
                                        </button>
                                        <button
                                            onClick={() => settings.setVirtualSettings({ vTriggerType: 'losses' })}
                                            className={`py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${virtual.vTriggerType === 'losses' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-dark border-dark-hover text-gray-500'}`}
                                        >
                                            Losses
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Real -> Virtual Section */}
                        <div className="space-y-4 p-4 bg-dark-secondary/30 rounded-2xl border border-dark">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-sm font-bold text-teal-400 uppercase tracking-tighter">Real → Virtual</span>
                                    <p className="text-[10px] text-gray-500 font-medium">Automatic switch back to virtual</p>
                                </div>
                                <Toggle
                                    enabled={virtual.startRealToVirtual}
                                    onChange={(val) => settings.setVirtualSettings({ startRealToVirtual: val })}
                                />
                            </div>

                            {virtual.startRealToVirtual && (
                                <div className="space-y-4 pt-2 animate-in zoom-in-95 duration-300">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Threshold</span>
                                            <input
                                                type="number"
                                                value={virtual.rThreshold}
                                                onChange={(e) => settings.setVirtualSettings({ rThreshold: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-dark border-2 border-dark-hover rounded-xl px-4 py-2 text-sm font-bold text-teal-400 focus:border-teal-500/50 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Mode</span>
                                            <select
                                                value={virtual.rTriggerMode}
                                                onChange={(e) => settings.setVirtualSettings({ rTriggerMode: e.target.value as any })}
                                                className="w-full bg-dark border-2 border-dark-hover rounded-xl px-4 py-2 text-sm font-bold text-teal-400 focus:border-teal-500/50 outline-none"
                                            >
                                                <option value="consec">Consecutive</option>
                                                <option value="total">Total</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => settings.setVirtualSettings({ rTriggerType: 'wins' })}
                                            className={`py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${virtual.rTriggerType === 'wins' ? 'bg-teal-500/10 border-teal-500/50 text-teal-400' : 'bg-dark border-dark-hover text-gray-500'}`}
                                        >
                                            Wins
                                        </button>
                                        <button
                                            onClick={() => settings.setVirtualSettings({ rTriggerType: 'losses' })}
                                            className={`py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${virtual.rTriggerType === 'losses' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-dark border-dark-hover text-gray-500'}`}
                                        >
                                            Losses
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status Monitor */}
                        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-700 ${virtual.isVirtualMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-teal-500/10 border-teal-500/20'
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full animate-pulse ${virtual.isVirtualMode ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]'}`} />
                                <div>
                                    <span className={`text-xs font-black italic tracking-tighter block leading-none ${virtual.isVirtualMode ? 'text-indigo-400' : 'text-teal-400'}`}>
                                        {virtual.isVirtualMode ? 'VIRTUAL TRACKING' : 'REAL EXECUTION'}
                                    </span>
                                    <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1 block">Active Machine</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-white">
                                    {virtual.isVirtualMode
                                        ? `${virtual.vConsecWins}W / ${virtual.vConsecLosses}L`
                                        : `${virtual.rConsecWins}W / ${virtual.rConsecLosses}L`}
                                </div>
                                <div className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Active Streak</div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'recovery' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <RecoverySettings />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
