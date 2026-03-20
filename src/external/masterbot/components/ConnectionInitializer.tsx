'use client';

import { useEffect } from 'react';
import { useRelayStore } from '@/masterbot/store/useRelayStore';
import { useDerivStore } from '@/masterbot/store/useDerivStore';
import { backendWS } from '@/masterbot/lib/backend-ws';
import { tradeWS } from '@/masterbot/lib/deriv/trade-ws';

export function ConnectionInitializer() {
    const connectRelay = useRelayStore(state => state.connect);
    const connectDeriv = useDerivStore(state => state.connect);

    useEffect(() => {
        // Initialize singletons with store state access (Client Side Only)
        tradeWS.init(useDerivStore.getState);
        backendWS.init(useDerivStore.getState);

        connectRelay();
        connectDeriv();

        return () => { };
    }, [connectRelay, connectDeriv]);

    return null;
}
