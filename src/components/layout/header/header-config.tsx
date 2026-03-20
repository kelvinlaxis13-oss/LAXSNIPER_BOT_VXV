import { ReactNode } from 'react';
import { standalone_routes } from '@/components/shared';
import {
    LegacyCashierIcon as CashierLogo,
    LegacyChartsIcon as AnalyticsLogo,
    LegacyDerivIcon as RobotLogo,
    LegacyHomeNewIcon as TradershubLogo,
    LegacyReportsIcon as ReportsLogo,
} from '@deriv/quill-icons/Legacy';
import {
    DerivProductBrandLightDerivBotLogoWordmarkIcon as DerivBotLogo,
    DerivProductBrandLightDerivTraderLogoWordmarkIcon as DerivTraderLogo,
    PartnersProductBrandLightSmarttraderLogoWordmarkIcon as SmarttraderLogo,
} from '@deriv/quill-icons/Logo';
import { localize } from '@deriv-com/translations';

export type PlatformsConfig = {
    active: boolean;
    buttonIcon: ReactNode;
    description: string;
    href: string;
    icon: ReactNode;
    showInEU: boolean;
};

export type MenuItemsConfig = {
    as: 'a' | 'button';
    href: string;
    icon: ReactNode;
    label: string;
};

export type TAccount = {
    balance: string;
    currency: string;
    icon: React.ReactNode;
    isActive: boolean;
    isEu: boolean;
    isVirtual: boolean;
    loginid: string;
    token: string;
    type: string;
};

const LaxDollarLogo = ({ width = 32, height = 32 }) => (
    <svg width={width} height={height} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
        <defs>
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <g filter="url(#neon-glow)" stroke="#32c5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 8 20 C 8 12, 16 10, 32 10 C 48 10, 56 12, 56 20 C 56 28, 52 32, 44 32 C 38 32, 34 26, 32 26 C 30 26, 26 32, 20 32 C 12 32, 8 28, 8 20 Z" />
            <path d="M 12 20 C 12 16, 18 14, 32 14 C 46 14, 52 16, 52 20 C 52 24, 48 28, 42 28 C 36 28, 34 22, 32 22 C 30 22, 28 28, 22 28 C 16 28, 12 24, 12 20 Z" />
            <path d="M 18 36 L 24 50 C 26 54, 38 54, 40 50 L 46 36" />
            <path d="M 22 36 L 26 46 C 28 48, 36 48, 38 46 L 42 36" />
            <path d="M 32 34 L 32 52" />
            <path d="M 34 38 C 34 38, 28 38, 28 41 C 28 44, 34 44, 34 44 C 34 44, 36 44, 36 47 C 36 50, 30 50, 30 50" />
        </g>
    </svg>
);

export const platformsConfig: PlatformsConfig[] = [
    {
        active: false,
        buttonIcon: <DerivTraderLogo height={25} width={114.97} />,
        description: localize('A whole new trading experience on a powerful yet easy to use platform.'),
        href: standalone_routes.trade,
        icon: <DerivTraderLogo height={32} width={148} />,
        showInEU: true,
    },
    {
        active: true,
        buttonIcon: <></>,
        description: localize('Automated trading at your fingertips. No coding needed.'),
        href: standalone_routes.bot,
        icon: <></>,
        showInEU: false,
    },
    {
        active: false,
        buttonIcon: <SmarttraderLogo height={24} width={115} />,
        description: localize('Trade the world’s markets with our popular user-friendly platform.'),
        href: standalone_routes.smarttrader,
        icon: <SmarttraderLogo height={32} width={153} />,
        showInEU: false,
    },
];

export const TRADERS_HUB_LINK_CONFIG = {
    as: 'a',
    href: standalone_routes.traders_hub,
    icon: <LaxDollarLogo width={32} height={32} />,
    label: "LAXDOLLAR",
};

import {
    LayoutDashboard,
    Zap,
} from 'lucide-react';

export const MenuItems: MenuItemsConfig[] = [
    {
        as: 'a',
        href: '/',
        icon: <LayoutDashboard size={16} />,
        label: localize('DASHBOARD'),
    },
    {
        as: 'a',
        href: standalone_routes.bot,
        icon: <RobotLogo iconSize='xs' />,
        label: localize('LIVE TICKS'),
    },
    {
        as: 'a',
        href: standalone_routes.chart,
        icon: <AnalyticsLogo iconSize='xs' />,
        label: localize('REVERSAL SCANNER'),
    },
    {
        as: 'a',
        href: '/laxsniper-xv',
        icon: <Zap size={16} />,
        label: localize('LAXSNIPER XV'),
    },
    {
        as: 'a',
        href: standalone_routes.analysis_tool,
        icon: <AnalyticsLogo iconSize='xs' />,
        label: localize('ANALYSIS'),
    },
    {
        as: 'a',
        href: standalone_routes.free_bots,
        icon: <RobotLogo iconSize='xs' />,
        label: localize('BOTS'),
    },
    {
        as: 'a',
        href: standalone_routes.reports,
        icon: <ReportsLogo iconSize='xs' />,
        label: localize('ADMIN'),
    },
];
