import { standalone_routes } from '@/components/shared';
import { DerivLogo, useDevice } from '@deriv-com/ui';
import './app-logo.scss';

export const AppLogo = () => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '16px' }} onClick={() => window.location.href = '/'}>
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <g filter="url(#neon-glow)" stroke="#32c5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {/* Goggles Frame */}
                    <path d="M 12 24 Q 12 14, 32 14 Q 52 14, 52 24 L 52 34 Q 52 40, 44 40 Q 38 40, 35 34 L 32 34 L 29 34 Q 26 40, 20 40 Q 12 40, 12 34 Z" fill="none" />
                    
                    {/* Lenses */}
                    <path d="M 18 24 L 30 24 L 30 32 L 22 32 Q 18 32, 18 28 Z" fill="rgba(50, 197, 255, 0.1)" strokeWidth="1" />
                    <path d="M 34 24 L 46 24 L 46 28 Q 46 32, 42 32 L 34 32 Z" fill="rgba(50, 197, 255, 0.1)" strokeWidth="1" />
                    
                    {/* Lower Jaw / Tray */}
                    <path d="M 26 44 L 38 44 L 36 54 Q 32 58, 28 54 Z" fill="none" />
                    
                    {/* Dollar Sign */}
                    <path d="M 32 46 V 52 M 29 47.5 H 35 L 29 50.5 H 35" strokeWidth="1.5" />
                </g>
            </svg>
            <span style={{
                color: '#32c5ff',
                fontWeight: '900',
                fontFamily: '"Orbitron", sans-serif',
                fontSize: '18px',
                letterSpacing: '2px',
                marginLeft: '12px',
                textShadow: '0 0 8px rgba(50, 197, 255, 0.5)',
                textTransform: 'uppercase'
            }}>LAXDOLLAR</span>
        </div>
    );
};
