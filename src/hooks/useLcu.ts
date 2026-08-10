import { useEffect, useRef, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from '../store';
import type { LcuInfo } from '../store';

export type { LcuInfo };

export function useLcu(addLog: (msg: string) => void) {
    const setLcu = useAppStore(s => s.setLcu);
    const prevLcuRef = useRef<LcuInfo | null>(null);
    const checkingRef = useRef(false);
    const addLogRef = useRef(addLog);
    addLogRef.current = addLog;

    const checkConnection = useCallback(async () => {
        if (checkingRef.current) return;
        checkingRef.current = true;
        try {
            const info = await invoke<LcuInfo>("get_lcu_connection");
            if (!prevLcuRef.current && info) {
                addLogRef.current("League client connected.");
            }
            if (
                prevLcuRef.current?.port !== info?.port ||
                prevLcuRef.current?.token !== info?.token
            ) {
                prevLcuRef.current = info;
                setLcu(info);
            }
        } catch {
            if (prevLcuRef.current) {
                addLogRef.current("League client disconnected.");
                prevLcuRef.current = null;
                setLcu(null);
            }
        } finally {
            checkingRef.current = false;
        }
    }, [setLcu]);

    useEffect(() => {
        checkConnection();
        const interval = setInterval(checkConnection, 2000);
        return () => clearInterval(interval);
    }, [checkConnection]);

    const lcu = useAppStore(s => s.lcu);
    const lcuRequest = useAppStore(s => s.lcuRequest);

    return { lcu, lcuRequest };
}
