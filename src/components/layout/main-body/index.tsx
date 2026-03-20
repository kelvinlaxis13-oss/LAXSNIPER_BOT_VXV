import { useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../../hooks/useStore';
import { useDevice } from '@deriv-com/ui';
import './main-body.scss';

type TMainBodyProps = {
    children: React.ReactNode;
};

const MainBody: React.FC<TMainBodyProps> = observer(({ children }) => {
    const { ui } = useStore() ?? {
        ui: {
            setDevice: () => {},
            setDarkMode: () => {},
        },
    };
    const { setDevice, setDarkMode } = ui;
    const { isDesktop, isMobile, isTablet } = useDevice();

    const forceDarkTheme = useCallback(() => {
        // Theme switching disabled as per user requirement - always dark
        const body = document.querySelector('body');
        if (!body) return;
        localStorage.setItem('theme', 'dark');
        body.classList.remove('theme--light');
        body.classList.add('theme--dark');
        setDarkMode(true);
    }, [setDarkMode]);

    useEffect(() => {
        forceDarkTheme();
    }, [forceDarkTheme]);

    useEffect(() => {
        if (isMobile) {
            setDevice('mobile');
        } else if (isTablet) {
            setDevice('tablet');
        } else {
            setDevice('desktop');
        }
    }, [isDesktop, isMobile, isTablet, setDevice]);

    return <div className='main-body'>{children}</div>;
});

export default MainBody;
