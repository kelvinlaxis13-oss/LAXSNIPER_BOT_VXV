'use client';

import React from 'react';
import { Card, CardHeader, CardContent, Button, StatusIndicator } from './ui';
import { Bot, Play, Square, Loader2, Sparkles, Zap } from 'lucide-react';
import { useDerivStore } from '@/masterbot/store/useDerivStore';

export function BotControl() {
    const { isRunning, status, startBot, stopBot, account, stats, triggerStatus, backendStatus, isBackendAuthorized, token } = useDerivStore();
    const isConnected = status === 'connected' && (backendStatus === 'ready' || backendStatus === 'connected') && isBackendAuthorized;
    const isConnecting = status === 'connecting' || backendStatus === 'handshaking' || backendStatus === 'authenticating';

    // Determine the most relevant status to show
    const displayStatus = isRunning ? 'running' :
        isConnected ? 'ready' :
            status === 'connecting' ? 'connecting' :
                (backendStatus === 'handshaking' || backendStatus === 'authenticating' || backendStatus === 'error') ? backendStatus :
                    'offline';

    return (
        <Card className={isRunning ? 'border-teal-500/50 shadow-lg shadow-teal-500/10' : ''}>
            <CardHeader
                icon={<Bot className={`w-5 h-5 ${isRunning ? 'text-teal-400 animate-bounce' : ''}`} />}
            >
                Bot Control
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-xl border border-dark">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">System Status</span>
                        <StatusIndicator status={displayStatus as any} />
                    </div>
                    {isRunning && (
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2 px-3 py-1 bg-teal-500/10 rounded-full border border-teal-500/20">
                                <Loader2 className="w-3 h-3 text-teal-400 animate-spin" />
                                <span className="text-[10px] font-bold text-teal-400 uppercase">{triggerStatus || 'Analyzing Market'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">
                                <Zap className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                                <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">High Frequency</span>
                            </div>
                        </div>
                    )}
                </div>



                <div className="grid grid-cols-2 gap-4">
                    {!isRunning ? (
                        <Button
                            variant="success"
                            className="w-full h-14 text-lg font-bold group relative overflow-hidden"
                            disabled={!isConnected}
                            onClick={startBot}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Play className="w-5 h-5 mr-2 fill-current" />
                            START BOT
                        </Button>
                    ) : (
                        <Button
                            variant="danger"
                            className="w-full h-14 text-lg font-bold group relative overflow-hidden"
                            onClick={stopBot}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Square className="w-5 h-5 mr-2 fill-current" />
                            STOP BOT
                        </Button>
                    )}

                    <div className="flex flex-col gap-2">
                        <div className="flex-1 flex flex-col justify-center px-4 bg-dark-secondary rounded-xl border border-dark group transition-all hover:border-teal-500/30">
                            <span className="text-[9px] uppercase text-gray-500 font-bold">Active Step</span>
                            <div className="flex items-center gap-2">
                                <Sparkles className={`w-3 h-3 ${isRunning ? 'text-amber-400 animate-pulse' : 'text-gray-600'}`} />
                                <span className={`text-lg font-mono font-bold ${isRunning ? 'text-white' : 'text-gray-500'}`}>
                                    {stats.currentStep}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {isRunning && (
                    <div className="space-y-2 animate-fade-in">
                        <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold px-1">
                            <span>Session Target</span>
                            <span>{Math.min(100, Math.round((stats.won / (useDerivStore.getState().stopAfterTotalWins.value || 1)) * 100))}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-dark-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-1000"
                                style={{ width: `${Math.min(100, (stats.won / (useDerivStore.getState().stopAfterTotalWins.value || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="text-[10px] text-gray-500 text-center italic px-2">
                    {!token
                        ? 'Please enter your API token to begin.'
                        : !isConnected
                            ? (backendStatus === 'authenticating' ? 'Backend is verifying your account...' : 'Waiting for system to be READY...')
                            : isRunning
                                ? 'Bot is actively monitoring triggers and patterns...'
                                : 'System is READY. Press Start to begin automated sequence.'}
                </div>
            </CardContent>
        </Card >
    );
}
