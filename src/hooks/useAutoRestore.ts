import { useEffect, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { LcuInfo } from './useLcu';

export const SAVED_AVAILABILITY_KEY = "profile_saved_availability_v1";
export const SAVED_BIO_KEY = "profile_saved_bio_v1";
export const SAVED_ICON_KEY = "profile_saved_icon_v1";
export const SAVED_BACKGROUND_KEY = "profile_saved_background_v1";
export const SAVED_TOKENS_KEY = "profile_saved_tokens_v1";

export function useAutoRestore(
    lcu: LcuInfo | null, 
    addLog: (msg: string) => void, 
    lcuRequest: (method: string, endpoint: string, body?: any) => Promise<any>
) {
    const syncInProgressRef = useRef<string | null>(null);

    useEffect(() => {
        if (!lcu) {
            syncInProgressRef.current = null;
            return;
        }

        const connectionId = `${lcu.port}-${lcu.token}`;
        if (syncInProgressRef.current === connectionId) return;
        syncInProgressRef.current = connectionId;

        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let initialSyncDone = false;

        const attemptRestore = async (attempt = 0) => {
            try {
                // Fetch fresh chat and summoner state
                const chatRes: any = await lcuRequest("GET", "/lol-chat/v1/me");
                const summonerRes: any = await lcuRequest("GET", "/lol-summoner/v1/current-summoner/summoner-profile");

                if (!chatRes || !summonerRes || !('backgroundSkinId' in summonerRes)) {
                    throw new Error("Services not fully initialized.");
                }

                if (!initialSyncDone) {
                    addLog("[Auto-Restore] Services ready. Waiting 5s for LCU initial sync...");
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    if (syncInProgressRef.current !== connectionId) return;
                    initialSyncDone = true;
                    // Refetch after delay
                    const freshChat: any = await lcuRequest("GET", "/lol-chat/v1/me");
                    if (freshChat) Object.assign(chatRes, freshChat);
                }

                const updates: any = {};
                let hasUpdates = false;

                // 1. Availability restore
                const savedAvail = localStorage.getItem(SAVED_AVAILABILITY_KEY);
                if (savedAvail && chatRes?.availability !== savedAvail) {
                    updates.availability = savedAvail;
                    hasUpdates = true;
                }

                if (hasUpdates) {
                    await lcuRequest("PUT", "/lol-chat/v1/me", updates).catch(() => {});
                }

                // 2. Bio restore
                const savedBio = localStorage.getItem(SAVED_BIO_KEY);
                const currentBio = chatRes?.statusMessage || "";
                if (savedBio && currentBio !== savedBio) {
                    await invoke("update_bio", { port: lcu.port, token: lcu.token, newBio: savedBio }).catch(() => {});
                }

                // 3. Icon restore
                const savedIconStr = localStorage.getItem(SAVED_ICON_KEY);
                if (savedIconStr) {
                    const iconId = parseInt(savedIconStr, 10);
                    // Check if current icon differs (Riot server reset it)
                    const currentIcon = chatRes?.icon;
                    if (!isNaN(iconId) && currentIcon !== iconId) {
                        await invoke("lcu_request", {
                            method: "PUT", endpoint: "/lol-summoner/v1/current-summoner/icon",
                            body: { profileIconId: iconId }, port: lcu.port, token: lcu.token
                        }).catch(() => {});
                        await invoke("lcu_request", {
                            method: "PUT", endpoint: "/lol-chat/v1/me",
                            body: { icon: iconId }, port: lcu.port, token: lcu.token
                        }).catch(() => {});
                    }
                }

                // 4. Background restore
                const savedBgStr = localStorage.getItem(SAVED_BACKGROUND_KEY);
                if (savedBgStr) {
                    const bgId = parseInt(savedBgStr, 10);
                    const currentBg = summonerRes?.backgroundSkinId;
                    if (!isNaN(bgId) && currentBg !== bgId) {
                        await lcuRequest("POST", "/lol-summoner/v1/current-summoner/summoner-profile", {
                            key: "backgroundSkinId", value: bgId
                        }).catch(() => {});
                    }
                }

                // 5. Tokens restore
                // (Only enforce tokens on initial sync to avoid spamming the challenges endpoint)
                if (attempt === 0) {
                    const savedTokensStr = localStorage.getItem(SAVED_TOKENS_KEY);
                    if (savedTokensStr) {
                        try {
                            const challengeIds = JSON.parse(savedTokensStr);
                            if (Array.isArray(challengeIds) && challengeIds.length > 0) {
                                await lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", { challengeIds }).catch(() => {});
                            }
                        } catch (e) {}
                    }
                }

            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (!initialSyncDone) {
                    addLog(`[Auto-Restore] Waiting for LCU readiness... (${msg})`);
                }
            }

            if (syncInProgressRef.current === connectionId) {
                // Poll every 10 seconds to enforce overrides
                pollTimer = setTimeout(() => attemptRestore(attempt + 1), 10000);
            }
        };

        attemptRestore(0);

        return () => {
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [lcu, addLog, lcuRequest]);
}
