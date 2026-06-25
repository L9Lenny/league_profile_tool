import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";

export interface LcuInfo {
    port: string;
    token: string;
}

export function useLcu(addLog: (msg: string) => void) {
    const [lcu, setLcu] = useState<LcuInfo | null>(null);
    const prevLcuRef = useRef<LcuInfo | null>(null);
    // Use a ref so checkConnection never needs addLog in its dependency array,
    // avoiding the interval being torn down and recreated on every log call.
    const addLogRef = useRef(addLog);
    addLogRef.current = addLog;

    const checkConnection = useCallback(async () => {
        try {
            const info = await invoke<LcuInfo>("get_lcu_connection");
            if (!prevLcuRef.current && info) {
                addLogRef.current("League client connected.");
            }
            if (
                prevLcuRef.current?.port !== info.port ||
                prevLcuRef.current?.token !== info.token
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
        }
    }, []); // stable reference — addLog accessed via ref

    useEffect(() => {
        checkConnection();
        const interval = setInterval(checkConnection, 2000);
        return () => clearInterval(interval);
    }, [checkConnection]);

    const lcuRequest = useCallback(async (method: string, endpoint: string, body?: unknown): Promise<unknown> => {
        if (!lcu) throw new Error("LCU not connected");
        const payload: Record<string, unknown> = { method, endpoint, port: lcu.port, token: lcu.token };
        if (body !== undefined) payload.body = body;
        return invoke("lcu_request", payload);
    }, [lcu]);

    return { lcu, lcuRequest };
}
