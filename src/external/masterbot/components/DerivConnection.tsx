'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, Input, Button, StatusIndicator } from './ui';
import { useDerivStore } from '@/masterbot/store/useDerivStore';
import { Power, ExternalLink, Shield, Key, AlertCircle, Bug } from 'lucide-react';
import { validateToken } from '@/masterbot/lib/deriv/security';

export function DerivConnection() {
    const {
        status,
        account,
        connect,
        disconnect,
        authorize,
        forceReconnect,
        setAppId,
        token: storeToken,
        debugInfo,
        backendStatus,
        lastBackendMessage,
        tradeWsStatus,
        isTradeAuthorized,
        tradeMetrics,
        testPing
    } = useDerivStore();
    const [token, setToken] = useState(storeToken);
    const [error, setError] = useState('');
    const [showDebug, setShowDebug] = useState(false);



    const handleConnect = () => {
        if (!validateToken(token)) {
            setError('Invalid API Token format');
            return;
        }
        setError('');
        authorize(token);
    };

    const isConnected = status === 'connected' || status === 'connecting';

    return (
        <Card>
            <CardHeader
                icon={<Shield className="w-5 h-5" />}
                badge={<StatusIndicator status={status === 'connected' ? 'online' : status === 'connecting' ? 'connecting' : 'offline'} />}
            >
                Deriv Connection
            </CardHeader>
            <CardContent className="space-y-4">
                {account && status === 'connected' ? (
                    <div className="p-3 bg-dark-secondary rounded-lg border border-dark flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-500/10 rounded-full flex items-center justify-center border border-teal-500/20">
                                <span className="text-teal-400 font-bold">{account.currency[0]}</span>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Account ID</p>
                                <p className="text-sm font-mono font-bold text-gray-200">{account.loginid}</p>
                            </div>
                        </div>
                        <Button variant="danger" size="sm" onClick={() => disconnect()}>
                            <Power className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Input
                            label="API Token"
                            type="password"
                            placeholder="Paste your Deriv API token here"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                        />

                        {error && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400">
                                    <AlertCircle className="w-3 h-3" />
                                    {error}
                                </div>
                                <Button
                                    variant="danger"
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-400/20"
                                    onClick={() => forceReconnect()}
                                >
                                    Retry Connection
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-400/20"
                                    onClick={() => setAppId('1')}
                                >
                                    Use Public App ID (1)
                                </Button>
                            </div>
                        )}

                        {(debugInfo || error) && (
                            <div className="pt-2">
                                <button
                                    onClick={() => setShowDebug(!showDebug)}
                                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300"
                                >
                                    <Bug className="w-3 h-3" />
                                    {showDebug ? 'Hide Debug Details' : 'Show Debug Details'}
                                </button>
                                {showDebug && (
                                    <div className="mt-2 p-2 bg-black/50 rounded text-[10px] font-mono text-gray-400 overflow-x-auto whitespace-pre-wrap border border-gray-800">
                                        {debugInfo ? JSON.stringify(debugInfo, null, 2) : error}
                                    </div>
                                )}
                            </div>
                        )}

                        <a
                            href="http://api.deriv.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[10px] text-teal-400 hover:text-teal-300 transition-colors uppercase font-bold tracking-wider"
                        >
                            Get Token from Deriv <ExternalLink className="w-3 h-3" />
                        </a>

                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleConnect}
                            disabled={status === 'connecting'}
                        >
                            {status === 'connecting' ? 'Authorizing...' : 'Authorize Bot'}
                        </Button>
                    </div>
                )}

                <div className="bg-teal-500/5 p-3 rounded-lg border border-teal-500/10">
                    <div className="flex items-start gap-2">
                        <Key className="w-4 h-4 text-teal-400 mt-0.5" />
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            Your token is used locally via <strong>App ID 123448</strong>. Always use tokens with <strong>Read</strong> and <strong>Trade</strong> scope.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
