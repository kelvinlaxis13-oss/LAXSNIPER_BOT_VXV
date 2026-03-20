import React from 'react';
import { Card, CardHeader, CardContent } from '@/masterbot/components/ui';
import { 
    Users, 
    TrendingUp, 
    DollarSign, 
    ShieldCheck, 
    Activity,
    ArrowUpRight,
    ArrowDownRight 
} from 'lucide-react';
import { useDerivStore } from '@/masterbot/store/useDerivStore';
import { observer } from 'mobx-react-lite';

const AdminPage = observer(() => {
    const { admin, stats, tradeLogs } = useDerivStore();

    // Real data from store
    const activeUsers = admin.totalUsers || 1;
    const platformVolume = admin.platformVolume || 0;
    const totalCommission = admin.platformCommission || 0;

    return (
        <div className="p-6 space-y-6 bg-[#0e0e0e] min-h-screen text-white">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                        <p className="text-gray-400 text-sm">System monitoring and commission tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                    <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">System Healthy</span>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[#161616] border-white/5 hover:border-cyan-500/30 transition-all duration-300">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">+12% from last wk</span>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium mb-1">Active Platform Users</h3>
                        <p className="text-4xl font-bold text-white tracking-tight">{activeUsers}</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#161616] border-white/5 hover:border-purple-500/30 transition-all duration-300">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-purple-400" />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">+8% from last wk</span>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium mb-1">Total Platform Volume</h3>
                        <p className="text-4xl font-bold text-white tracking-tight">
                            ${platformVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-[#161616] border-white/5 border-cyan-500/50 shadow-lg shadow-cyan-500/5 transition-all duration-300">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-cyan-500/10 rounded-lg">
                                <DollarSign className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div className="px-2 py-0.5 bg-cyan-500/20 rounded text-[10px] font-bold text-cyan-400">
                                3% COMMISSION
                            </div>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium mb-1">Accumulated Revenue</h3>
                        <p className="text-4xl font-bold text-cyan-400 tracking-tight">
                            ${totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Platform Monitor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#161616] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 py-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-cyan-500" />
                            Live Trade Feed
                        </h2>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">User ID</th>
                                        <th className="px-6 py-3 font-medium">Type</th>
                                        <th className="px-6 py-3 font-medium">Stake</th>
                                        <th className="px-6 py-3 font-medium">Commission</th>
                                        <th className="px-6 py-3 font-medium text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {[...Array(5)].map((_, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-300">CR4612***</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px]">DIGITOVER</span>
                                            </td>
                                            <td className="px-6 py-4 font-medium">$50.00</td>
                                            <td className="px-6 py-4 text-cyan-400 font-semibold">$1.50</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 text-green-400 text-[10px] font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                                    SETTLED
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#161616] border-white/5">
                    <CardHeader className="border-b border-white/5 py-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-500" />
                            Revenue Analytics
                        </h2>
                    </CardHeader>
                    <CardContent className="p-6 h-[300px] flex items-center justify-center border-t border-white/5">
                        <div className="text-center">
                            <p className="text-gray-500 text-sm mb-2">Revenue chart visualization</p>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-24 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full opacity-30" />
                                    <span className="text-[10px] text-gray-600 mt-2">Mon</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-32 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full opacity-50" />
                                    <span className="text-[10px] text-gray-600 mt-2">Tue</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-16 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full opacity-20" />
                                    <span className="text-[10px] text-gray-600 mt-2">Wed</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-40 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full opacity-80" />
                                    <span className="text-[10px] text-gray-600 mt-2">Thu</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-48 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full" />
                                    <span className="text-[10px] text-white font-bold mt-2 text-glow">Fri</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
});

export default AdminPage;
