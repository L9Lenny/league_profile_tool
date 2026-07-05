import { useEffect, useRef } from 'react';
import { LcuInfo } from './useLcu';
import {
    SAVED_AUTO_ENFORCE_KEY,
    SAVED_ENFORCE_OFFLINE_KEY,
    SAVED_AVAILABILITY_KEY,
    SAVED_BIO_KEY,
    SAVED_ICON_KEY,
    SAVED_BACKGROUND_KEY,
    SAVED_TOKENS_KEY,
    SAVED_TITLE_KEY
} from '../storageKeys';

export function useProfileEnforcer(
    lcu: LcuInfo | null,
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<unknown>,
    addLog: (msg: string) => void
) {
    const hasEnforcedThisSession = useRef(false);
    const sessionActive = useRef(false);

    // Reset the enforcer state when the LCU disconnects
    useEffect(() => {
        if (lcu) {
            sessionActive.current = true;
        } else {
            hasEnforcedThisSession.current = false;
            sessionActive.current = false;
        }
    }, [lcu]);

    useEffect(() => {
        if (!lcu) return;
        if (hasEnforcedThisSession.current) return;

        const autoEnforce = localStorage.getItem(SAVED_AUTO_ENFORCE_KEY) === 'true' || localStorage.getItem(SAVED_ENFORCE_OFFLINE_KEY) === 'true';
        if (!autoEnforce) return;

        const runWithRetry = async (
            name: string,
            operation: () => Promise<unknown>,
            intervalMs = 10000,
            maxDurationMs = 60000
        ) => {
            const startTime = Date.now();
            let attempt = 1;
            while (sessionActive.current) {
                try {
                    await operation();
                    addLog(`Auto-Enforcer: Applied custom ${name}.`);
                    return;
                } catch (err) {
                    const elapsed = Date.now() - startTime;
                    if (elapsed >= maxDurationMs || !sessionActive.current) {
                        addLog(`Auto-Enforcer error: Failed to apply ${name} after ${Math.round(elapsed / 1000)}s - ${err}`);
                        return;
                    }
                    addLog(`Auto-Enforcer warning: Failed to apply ${name} (attempt ${attempt}) - ${err}. Retrying in ${intervalMs / 1000}s...`);
                    attempt++;
                    await new Promise(resolve => setTimeout(resolve, intervalMs));
                }
            }
        };

        const enforceProfile = async () => {
            addLog("LCU connected. Auto-Enforcer applying saved profile settings...");
            hasEnforcedThisSession.current = true;

            // 1. Icon
            const savedIcon = localStorage.getItem(SAVED_ICON_KEY);
            if (savedIcon) {
                runWithRetry("Icon", () => lcuRequest("PUT", "/lol-chat/v1/me", { icon: Number.parseInt(savedIcon, 10) }));
            }

            // 2. Status & Bio
            const savedStatus = localStorage.getItem(SAVED_AVAILABILITY_KEY);
            const savedBio = localStorage.getItem(SAVED_BIO_KEY);
            if (savedStatus || savedBio !== null) {
                const statusBody: any = {};
                if (savedStatus) statusBody.availability = savedStatus;
                if (savedBio !== null) statusBody.statusMessage = savedBio;
                runWithRetry("Status & Bio", () => lcuRequest("PUT", "/lol-chat/v1/me", statusBody));
            }

            // 3. Tokens, Title
            const savedTokens = localStorage.getItem(SAVED_TOKENS_KEY);
            const savedTitle = localStorage.getItem(SAVED_TITLE_KEY);

            if (savedTokens || savedTitle !== null) {
                runWithRetry("Tokens & Regalia", async () => {
                    const challengeIds = savedTokens ? JSON.parse(savedTokens) : undefined;
                    const prefBody: any = {};
                    if (challengeIds) prefBody.challengeIds = challengeIds;
                    if (savedTitle !== null && savedTitle !== "-1") prefBody.title = savedTitle;

                    // The update endpoint does a FULL REPLACE — merge current
                    // preferences so we don't reset banner/crest/prestige.
                    try {
                        const summary: any = await lcuRequest("GET", "/lol-challenges/v1/summary-player-data/local-player");
                        if (summary) {
                            prefBody.bannerAccent = summary.bannerId ?? summary.preferences?.bannerId ?? summary.bannerAccent ?? summary.preferences?.bannerAccent ?? "";
                            prefBody.crestBorder = summary.crestId ?? summary.preferences?.crestId ?? summary.crestBorder ?? summary.preferences?.crestBorder ?? "";
                            prefBody.prestigeCrestBorderLevel = summary.prestigeCrestBorderLevel ?? summary.preferences?.prestigeCrestBorderLevel ?? 0;
                        }
                    } catch (err) {
                        addLog(`Auto-Enforcer warning: Could not read current preferences to merge: ${err}`);
                    }

                    await lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", prefBody);
                });
            }


            // 5. Background
            const savedBackground = localStorage.getItem(SAVED_BACKGROUND_KEY);
            if (savedBackground) {
                runWithRetry("Profile Background", async () => {
                    try {
                        // Try official method first
                        await lcuRequest("POST", "/lol-summoner/v1/current-summoner/summoner-profile/", {
                            key: "backgroundSkinId",
                            value: Number.parseInt(savedBackground, 10)
                        });
                    } catch (err) {
                        addLog(`Auto-Enforcer Background: Official update failed (${err}). Trying force chat fallback...`);
                        // Fallback to chat presence force method
                        const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as any;
                        let baseLol = {};
                        if (chatRes?.lol) {
                            baseLol = typeof chatRes.lol === 'string' ? JSON.parse(chatRes.lol) : chatRes.lol;
                        }
                        const newLol = { ...baseLol, backgroundSkinId: savedBackground.toString() };
                        await lcuRequest("PUT", "/lol-chat/v1/me", { lol: newLol });
                    }
                });
            }

            addLog("Auto-Enforcer restoration flow completed.");
        };

        // Give the LCU a few seconds to initialize and fetch from server before overwriting
        const timer = setTimeout(enforceProfile, 5000);
        return () => clearTimeout(timer);
    }, [lcu, lcuRequest, addLog]);
}
