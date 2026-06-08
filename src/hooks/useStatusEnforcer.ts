import { useEffect, useRef } from 'react';
import { LcuInfo } from './useLcu';
import { SAVED_ENFORCE_OFFLINE_KEY } from '../storageKeys';

export function useStatusEnforcer(
    lcu: LcuInfo | null,
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<unknown>,
    addLog: (msg: string) => void
) {
    useEffect(() => {
        if (!lcu) return;

        const interval = setInterval(async () => {
            const enforceOffline = localStorage.getItem(SAVED_ENFORCE_OFFLINE_KEY) === 'true';
            if (!enforceOffline) return;

            try {
                const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as Record<string, unknown>;
                if (chatRes?.availability !== 'offline') {
                    addLog("Enforcing offline status...");
                    await lcuRequest("PUT", "/lol-chat/v1/me", { availability: 'offline' });
                }
            } catch (err) {
                // Ignore errors
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [lcu, lcuRequest, addLog]);
}
