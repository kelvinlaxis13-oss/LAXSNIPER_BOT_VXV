import { useCallback } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import PWAInstallButton from '@/components/pwa-install-button';
import { generateOAuthURL, standalone_routes } from '@/components/shared';
import Button from '@/components/shared_ui/button';
import Text from '@/components/shared_ui/text';
import useActiveAccount from '@/hooks/api/account/useActiveAccount';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import { useFirebaseCountriesConfig } from '@/hooks/firebase/useFirebaseCountriesConfig';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import useTMB from '@/hooks/useTMB';
import { clearAuthData, handleOidcAuthFailure } from '@/utils/auth-utils';
import { StandaloneCircleUserRegularIcon } from '@deriv/quill-icons/Standalone';
import { requestOidcAuthentication } from '@deriv-com/auth-client';
import { Localize, useTranslations } from '@deriv-com/translations';
import { Header, useDevice, Wrapper } from '@deriv-com/ui';
import { Tooltip } from '@deriv-com/ui';
import { AppLogo } from '../app-logo';
import AccountsInfoLoader from './account-info-loader';
import AccountSwitcher from './account-switcher';
import MenuItems from './menu-items';
import MobileMenu from './mobile-menu';
import PlatformSwitcher from './platform-switcher';
import './header.scss';

type TAppHeaderProps = {
    isAuthenticating?: boolean;
};

const AppHeader = observer(({ isAuthenticating }: TAppHeaderProps) => {
    const { isDesktop } = useDevice();
    const { isAuthorizing, activeLoginid } = useApiBase();
    const { client } = useStore() ?? {};

    const { data: activeAccount } = useActiveAccount({ allBalanceData: client?.all_accounts_balance });
    const { accounts, getCurrency, is_virtual } = client ?? {};
    const has_wallet = Object.keys(accounts ?? {}).some(id => accounts?.[id].account_category === 'wallet');

    const currency = getCurrency?.();
    const { localize } = useTranslations();

    const { isSingleLoggingIn } = useOauth2();

    const { hubEnabledCountryList } = useFirebaseCountriesConfig();
    const { onRenderTMBCheck, isTmbEnabled } = useTMB();
    const is_tmb_enabled = isTmbEnabled() || window.is_tmb_enabled === true;
    // No need for additional state management here since we're handling it in the layout component

    const renderAccountSection = useCallback(() => {
        const store = useStore();
        const is_running = store?.run_panel?.is_running;

        // Show loader during authentication processes or store initialization
        if (!store || isAuthenticating || isAuthorizing || (isSingleLoggingIn && !is_tmb_enabled)) {
            return <AccountsInfoLoader isLoggedIn isMobile={!isDesktop} speed={3} />;
        } else if (activeLoginid) {
            return (
                <div className='flex items-center gap-4'>
                    {/* Bot Status */}
                    <div className='hidden md:flex flex-col items-end mr-4'>
                        <div className='flex items-center gap-1.5'>
                            <div className={clsx('w-1.5 h-1.5 rounded-full shadow-[0_0_8px]', {
                                'bg-green-500 shadow-green-500/60': is_running,
                                'bg-gray-500 shadow-gray-500/40': !is_running,
                            })} />
                            <Text size='xxs' weight='bold' className={clsx('uppercase tracking-tighter', {
                                'text-green-400': is_running,
                                'text-gray-400': !is_running,
                            })}>
                                {is_running ? localize('Bot is running') : localize('Bot is not running')}
                            </Text>
                        </div>
                    </div>

                    {/* Balance Display styled as Screenshot 1 */}
                    <div className='flex items-center bg-[#0a0a0b] border border-[#1a2332] rounded-lg px-3 py-1 gap-3 hover:border-teal-500/30 transition-colors cursor-pointer'
                         onClick={() => client?.ui?.toggleAccountsDialog()}
                    >
                        <div className='flex flex-col items-start'>
                            <Text size='xxxs' className='text-teal-500/80 font-bold uppercase tracking-widest leading-none mb-0.5'>
                                {localize('Balance')}
                            </Text>
                            <div className='flex items-center gap-1'>
                                <Text size='s' weight='bold' className='text-white leading-none'>
                                    {activeAccount?.balance ? `${activeAccount.currency} ${activeAccount.balance}` : '---'}
                                </Text>
                            </div>
                        </div>
                        <div className='w-8 h-8 rounded bg-[#161b22] flex items-center justify-center border border-[#30363d]'>
                            <StandaloneCircleUserRegularIcon className='w-5 h-5 text-gray-400' />
                        </div>
                    </div>

                    {isDesktop &&
                        (() => {
                            let redirect_url = new URL(standalone_routes.personal_details);
                            const is_hub_enabled_country = hubEnabledCountryList.includes(client?.residence || '');

                            if (has_wallet && is_hub_enabled_country) {
                                redirect_url = new URL(standalone_routes.account_settings);
                            }
                            const urlParams = new URLSearchParams(window.location.search);
                            const account_param = urlParams.get('account');
                            const is_virtual = client?.is_virtual || account_param === 'demo';

                            if (is_virtual) {
                                redirect_url.searchParams.set('account', 'demo');
                            } else if (currency) {
                                redirect_url.searchParams.set('account', currency);
                            }
                            return null;
                        })()}
                </div>
            );
        } else {
            return (
                <div className='auth-actions'>
                    <Button
                        tertiary
                        onClick={async () => {
                            clearAuthData(false);
                            const getQueryParams = new URLSearchParams(window.location.search);
                            const currency = getQueryParams.get('account') ?? '';
                            const query_param_currency =
                                currency || sessionStorage.getItem('query_param_currency') || 'USD';

                            try {
                                // First, explicitly wait for TMB status to be determined
                                const tmbEnabled = await isTmbEnabled();
                                // Now use the result of the explicit check
                                if (tmbEnabled) {
                                    await onRenderTMBCheck(true); // Pass true to indicate it's from login button
                                } else {
                                    // Always use OIDC if TMB is not enabled
                                    try {
                                        await requestOidcAuthentication({
                                            redirectCallbackUri: `${window.location.origin}/callback`,
                                            ...(query_param_currency
                                                ? {
                                                      state: {
                                                          account: query_param_currency,
                                                      },
                                                  }
                                                : {}),
                                        });
                                    } catch (err) {
                                        handleOidcAuthFailure(err);
                                        window.location.replace(generateOAuthURL());
                                    }
                                }
                            } catch (error) {
                                // eslint-disable-next-line no-console
                                console.error(error);
                            }
                        }}
                    >
                        <Localize i18n_default_text='Log in' />
                    </Button>
                    <Button
                        primary
                        onClick={() => {
                            window.open(standalone_routes.signup);
                        }}
                    >
                        <Localize i18n_default_text='Sign up' />
                    </Button>
                </div>
            );
        }
    }, [
        isAuthenticating,
        isAuthorizing,
        isSingleLoggingIn,
        isDesktop,
        activeLoginid,
        standalone_routes,
        client,
        has_wallet,
        currency,
        localize,
        activeAccount,
        is_virtual,
        onRenderTMBCheck,
        is_tmb_enabled,
    ]);

    if (client?.should_hide_header) return null;
    return (
        <header
            className={clsx('app-header custom-dark-header', {
                'app-header--desktop': isDesktop,
                'app-header--mobile': !isDesktop,
            })}
        >
            <div className='header-container flex items-center justify-between w-full px-4 h-12 bg-[#000000] border-b border-[#1a2332]'>
                <div className='header-left flex items-center gap-6 h-full'>
                    <AppLogo />
                    {/* MenuItems are handled by fixed Tabs in main.tsx for 1:1 match */}
                    {isDesktop && <PlatformSwitcher />}
                </div>
                <div className='header-right flex items-center gap-4 h-full'>
                    {!isDesktop && <PWAInstallButton variant='primary' size='medium' />}
                    {renderAccountSection()}
                    <MobileMenu />
                </div>
            </div>
        </header>
    );
});

export default AppHeader;
