'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Activity,
    Zap,
    History,
    TrendingUp,
    Settings,
    ShieldAlert,
    Menu,
    X,
    Wallet,
    ScanSearch
} from 'lucide-react';
import { useDerivStore } from '@/masterbot/store/useDerivStore';
import { useRelayStore } from '@/masterbot/store/useRelayStore';
import { Badge, StatusIndicator } from '../ui';

const NAV_ITEMS = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Live Ticks', path: '/live-ticks', icon: Activity },
    { name: 'Reversal Scanner', path: '/reversal-scanner', icon: ScanSearch, highlight: true },
    { name: 'LAXSNIPER XV', path: '/laxsniper-xv', icon: Zap },
    { name: 'Analysis', path: '/analysis', icon: TrendingUp },
    { name: 'Bots', path: '/bots', icon: Settings },
    { name: 'Admin', path: '/admin', icon: ShieldAlert, admin: true },
];

export function Header() {
    const pathname = usePathname();
    const { status: tradingStatus, account } = useDerivStore();
    const { status: relayStatus } = useRelayStore();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    return (
        <header className="sticky top-0 z-[100] w-full bg-dark/80 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative w-11 h-11 group-hover:scale-105 transition-transform">
                        <Image
                            src="/logo.png"
                            alt="LX Sniper"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="font-black text-lg tracking-tighter text-white uppercase italic">
                        LX <span className="text-teal-500">SNIPER</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`
                                    flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                    ${isActive
                                        ? 'bg-teal-500 text-dark shadow-lg shadow-teal-500/20'
                                        : item.highlight
                                            ? 'text-indigo-400 hover:bg-indigo-500/10'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                `}
                            >
                                <Icon className="w-4 h-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
                {/* Connection Status Bullets */}
                <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                    <div className="flex items-center gap-1.5" title="Tick Relay">
                        <div className={`w-1.5 h-1.5 rounded-full ${relayStatus === 'connected' ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'bg-gray-600'}`} />
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter">Relay</span>
                    </div>
                    <div className="w-px h-2 bg-white/10" />
                    <div className="flex items-center gap-1.5" title="Trading Hook">
                        <div className={`w-1.5 h-1.5 rounded-full ${tradingStatus === 'connected' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' :
                            tradingStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
                                'bg-gray-600'
                            }`} />
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter">Hook</span>
                    </div>
                </div>

                {/* Account Summary */}
                {account ? (
                    <div className="flex items-center gap-3 px-4 py-1.5 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border border-teal-500/20 rounded-lg">
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] text-teal-500/60 font-black uppercase leading-none">Balance</span>
                            <span className="text-sm font-black text-white leading-tight">
                                {account.currency} {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="p-1.5 bg-teal-500/20 rounded text-teal-400">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                ) : (
                    <Link href="/laxsniper-xv">
                        <Badge variant="outline" className="cursor-pointer hover:bg-white/5">Connect Engine</Badge>
                    </Link>
                )}

                {/* Mobile Toggle */}
                <button
                    className="lg:hidden p-2 text-gray-400 hover:text-white"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Nav Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 top-16 bg-dark z-[100] lg:hidden p-4 space-y-2">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsMenuOpen(false)}
                                className={`
                                    flex items-center gap-3 p-4 rounded-xl text-sm font-bold uppercase tracking-wider
                                    ${isActive ? 'bg-teal-500 text-dark' : 'text-gray-400 bg-white/5'}
                                `}
                            >
                                <Icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            )}
        </header>
    );
}
