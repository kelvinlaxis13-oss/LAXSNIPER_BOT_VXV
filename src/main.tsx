import ReactDOM from 'react-dom/client';
import { AuthWrapper } from './app/AuthWrapper';
import { AnalyticsInitializer } from './utils/analytics';
import { registerPWA } from './utils/pwa-utils';
import './styles/index.scss';
import './styles/masterbot-globals.css';

// Polyfill process for browser compatibility with libraries that expect it
if (typeof window !== 'undefined' && !window.process) {
    (window as any).process = { env: {} };
}

AnalyticsInitializer();
registerPWA()
    .then(registration => {
        if (registration) {
            console.log('PWA service worker registered successfully for Chrome');
        } else {
            console.log('PWA service worker disabled for non-Chrome browser');
        }
    })
    .catch(error => {
        console.error('PWA service worker registration failed:', error);
    });

// Fallback error component for catastrophic failures
const RootErrorFallback = ({ error }: { error: Error }) => (
    <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#0e1117',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'sans-serif'
    }}>
        <h1 style={{ color: '#ff444f' }}>Something went wrong</h1>
        <p>The application failed to load correctly.</p>
        <pre style={{ 
            backgroundColor: '#161b22', 
            padding: '15px', 
            borderRadius: '8px', 
            maxWidth: '100%', 
            overflow: 'auto',
            marginTop: '20px'
        }}>
            {error.message}
        </pre>
        <button 
            onClick={() => window.location.reload()}
            style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#ff444f',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
            }}
        >
            Reload Page
        </button>
    </div>
);

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Catastrophic failure:', error, errorInfo);
    }

    render() {
        if (this.state.hasError && this.state.error) {
            return <RootErrorFallback error={this.state.error} />;
        }
        return this.props.children;
    }
}

import React from 'react';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <RootErrorBoundary>
        <AuthWrapper />
    </RootErrorBoundary>
);

