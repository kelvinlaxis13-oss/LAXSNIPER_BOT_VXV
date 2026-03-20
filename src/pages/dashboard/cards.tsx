import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import GoogleDrive from '@/components/load-modal/google-drive';
import Dialog from '@/components/shared_ui/dialog';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import {
    DerivLightBotBuilderIcon,
    DerivLightGoogleDriveIcon,
    DerivLightMyComputerIcon,
    DerivLightQuickStrategyIcon,
} from '@deriv/quill-icons/Illustration';
import { 
    Zap, 
    ShieldCheck, 
    PieChart, 
} from 'lucide-react';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { rudderStackSendDashboardClickEvent } from '../../analytics/rudderstack-dashboard';

type TCardProps = {
    has_dashboard_strategies?: boolean;
    is_mobile: boolean;
};

const Cards = observer(({ is_mobile }: TCardProps) => {
    const store = useStore();
    if (!store) return null;
    
    const { dashboard, load_modal, quick_strategy } = store;
    const { toggleLoadModal, setActiveTabIndex } = load_modal;
    const { onCloseDialog, dialog_options, is_dialog_open, setActiveTab } = dashboard;
    const { setFormVisibility } = quick_strategy || {};

    const openGoogleDriveDialog = () => {
        toggleLoadModal();
        setActiveTabIndex(is_mobile ? 1 : 2);
    };

    const ddbot_actions = [
        {
            id: 'import',
            label: localize('Import Strategy'),
            title: localize('My computer'),
            status: localize('Local'),
            icon: <DerivLightMyComputerIcon height={24} width={24} />,
            glowClass: 'shadow-[0_0_20px_rgba(20,184,166,0.3)] border-teal-500/30',
            bgClass: 'bg-teal-500/10',
            iconColor: 'text-teal-400',
            dotColor: 'bg-teal-400',
            callback: () => {
                rudderStackSendDashboardClickEvent({ dashboard_click_name: 'import_strategy' });
                toggleLoadModal();
                setActiveTabIndex(0);
            },
        },
        {
            id: 'google',
            label: localize('Cloud Storage'),
            title: localize('Google Drive'),
            status: localize('Connected'),
            icon: <DerivLightGoogleDriveIcon height={24} width={24} />,
            glowClass: 'shadow-[0_0_20px_rgba(59,130,246,0.3)] border-blue-500/30',
            bgClass: 'bg-blue-500/10',
            iconColor: 'text-blue-400',
            dotColor: 'bg-blue-400',
            callback: () => {
                rudderStackSendDashboardClickEvent({ dashboard_click_name: 'google_drive' });
                openGoogleDriveDialog();
            },
        },
        {
            id: 'bot',
            label: localize('Automation'),
            title: localize('Bot builder'),
            status: localize('Active'),
            icon: <DerivLightBotBuilderIcon height={24} width={24} />,
            glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-500/30',
            bgClass: 'bg-amber-500/10',
            iconColor: 'text-amber-400',
            dotColor: 'bg-amber-400',
            callback: () => {
                rudderStackSendDashboardClickEvent({ dashboard_click_name: 'bot_builder' });
                setActiveTab(DBOT_TABS.BOT_BUILDER);
            },
        },
        {
            id: 'quick',
            label: localize('Templates'),
            title: localize('Quick strategy'),
            status: localize('Ready'),
            icon: <DerivLightQuickStrategyIcon height={24} width={24} />,
            glowClass: 'shadow-[0_0_20px_rgba(168,85,247,0.3)] border-purple-500/30',
            bgClass: 'bg-purple-500/10',
            iconColor: 'text-purple-400',
            dotColor: 'bg-purple-400',
            callback: () => {
                rudderStackSendDashboardClickEvent({ dashboard_click_name: 'quick_strategy' });
                setFormVisibility?.(true);
            },
        },
    ];

    return (
        <div className='flex flex-col items-center justify-center w-full py-12'>
            <div className='w-full max-w-[1400px] px-8'>
                <div className='flex flex-row overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 pb-6 md:pb-0 snap-x snap-mandatory scrollbar-hide'>
                    {ddbot_actions.map(({ id, icon, label, title, status, glowClass, bgClass, iconColor, dotColor, callback }) => (
                        <div
                            key={id}
                            onClick={callback}
                            className={classNames(
                                'group relative flex flex-col p-6 md:p-8 rounded-2xl bg-[#161b22] border transition-all duration-300 cursor-pointer hover:scale-[1.05] h-[180px] md:h-[220px] min-w-[240px] md:min-w-0 snap-center',
                                glowClass
                            )}
                        >
                            <div className='flex justify-between items-start mb-auto'>
                                <div className={classNames('p-2 md:p-3 rounded-xl', bgClass)}>
                                    {React.cloneElement(icon as React.ReactElement, { className: classNames('w-6 h-6 md:w-8 md:h-8', iconColor) })}
                                </div>
                                <div className='flex items-center gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-gray-400'>
                                    <span className={classNames('w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse', dotColor)}></span>
                                    {status}
                                </div>
                            </div>
                            <div className='mt-6 md:mt-10'>
                                <p className='text-[10px] md:text-[12px] font-semibold text-gray-500 uppercase tracking-[0.15em] md:tracking-[0.2em] mb-1 md:mb-2'>{label}</p>
                                <h3 className='text-xl md:text-3xl font-black text-white leading-tight tracking-tight whitespace-nowrap'>{title}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {is_dialog_open && (
                <Dialog
                    title={dialog_options.title}
                    is_visible={is_dialog_open}
                    onCancel={onCloseDialog}
                    is_mobile_full_width
                    className='dc-dialog-load-strategy'
                    has_close_icon
                >
                    <GoogleDrive />
                </Dialog>
            )}
        </div>
    );
});

export default Cards;
