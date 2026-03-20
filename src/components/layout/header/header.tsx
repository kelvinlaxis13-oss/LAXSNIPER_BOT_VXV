import { useCallback } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import PWAInstallButton from '@/components/pwa-install-button';
import { generateOAuthURL, standalone_routes } from '@/components/shared';
import Button from '@/components/shared_ui/button';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import useTMB from '@/hooks/useTMB';
import { clearAuthData, handleOidcAuthFailure } from '@/utils/auth-utils';
import { requestOidcAuthentication } from '@deriv-com/auth-client';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { AppLogo } from '../app-logo';
import AccountsInfoLoader from './account-info-loader';
import AccountSwitcher from './account-switcher';
import MobileMenu from './mobile-menu';
import useActiveAccount from '@/hooks/api/account/useActiveAccount';
import './header.scss';

type TAppHeaderProps = {
    isAuthenticating?: boolean;
};

const AppHeader = observer(({ isAuthenticating }: TAppHeaderProps) => {
    const { isDesktop } = useDevice();
    const { isAuthorizing, activeLoginid } = useApiBase();
    const { client } = useStore() ?? {};

    const { data: activeAccount } = useActiveAccount({ 
        allBalanceData: client?.all_accounts_balance ?? null 
    });

    const { isSingleLoggingIn } = useOauth2();

    const { onRenderTMBCheck, isTmbEnabled } = useTMB();
    const is_tmb_enabled = isTmbEnabled() || window.is_tmb_enabled === true;
    // No need for additional state management here since we're handling it in the layout component

    const renderAccountSection = useCallback(() => {
        const store = useStore();
        if (!store) return null;

        const { client } = store;
        const is_logged_in = client.is_logged_in || !!localStorage.getItem('authToken');

        console.log('[Header] Auth State:', {
            is_logged_in,
            hasActiveAccount: !!activeAccount,
            hasAuthToken: !!localStorage.getItem('authToken'),
            clientLoginid: client?.loginid
        });

        // Show loader during authentication processes or while waiting for account data
        if (
            isAuthenticating ||
            isAuthorizing ||
            (isSingleLoggingIn && !is_tmb_enabled) ||
            (is_logged_in && !activeAccount)
        ) {
            return <AccountsInfoLoader isLoggedIn isMobile={!isDesktop} speed={3} />;
        }

        if (activeAccount) {
            return <AccountSwitcher activeAccount={activeAccount} />;
        }

        return (
            <div className='auth-actions'>
                <Button
                    tertiary
                    className='header-login-btn'
                    onClick={async () => {
                        clearAuthData(false);
                        const getQueryParams = new URLSearchParams(window.location.search);
                        const currency = getQueryParams.get('account') ?? '';
                        const query_param_currency =
                            currency || sessionStorage.getItem('query_param_currency') || 'USD';

                        try {
                            const tmbEnabled = await isTmbEnabled();
                            if (tmbEnabled) {
                                await onRenderTMBCheck(true);
                            } else {
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
                            console.error(error);
                        }
                    }}
                >
                    <Localize i18n_default_text='Log in' />
                </Button>
                <Button
                    primary
                    className='header-signup-btn'
                    onClick={() => {
                        window.open(standalone_routes.signup);
                    }}
                >
                    <Localize i18n_default_text='Sign up' />
                </Button>
            </div>
        );
    }, [
        isAuthenticating,
        isAuthorizing,
        isSingleLoggingIn,
        isDesktop,
        activeLoginid,
        activeAccount,
        standalone_routes,
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
