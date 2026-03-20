import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import OnboardTourHandler from '../tutorials/dbot-tours/onboarding-tour';
import Cards from './cards';

const DashboardComponent = observer(() => {
    const store = useStore();
    if (!store) return null;
    const { dashboard } = store;
    const { active_tab } = dashboard;
    const { isDesktop } = useDevice();

    return (
        <React.Fragment>
            <div className='flex flex-col items-center justify-center min-h-[calc(100vh-48px)] p-8 bg-[#0a0a0b]'>
                <div className='max-w-7xl mx-auto w-full'>
                    <div className='mb-12'>
                        <h1 className='text-5xl font-black bg-gradient-to-r from-teal-300 to-teal-500 bg-clip-text text-transparent mb-4 tracking-tight tracking-[-0.04em]'>
                            {localize('System Overview')}
                        </h1>
                        <p className='text-gray-400 text-xl font-medium tracking-wide opacity-80'>
                            {localize('Real-time performance and system health monitoring.')}
                        </p>
                    </div>
                    <Cards is_mobile={!isDesktop} />
                </div>
            </div>
            {active_tab === 0 && <OnboardTourHandler is_mobile={!isDesktop} />}
        </React.Fragment>
    );
});

export default DashboardComponent;
