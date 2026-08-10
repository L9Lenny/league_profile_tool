import { useEffect, useRef } from 'react';
import { LcuInfo } from './useLcu';
import { patchChatLol, LcuRequestFn } from '../utils/chatMe';
import {
    SAVED_AUTO_ENFORCE_KEY,
    SAVED_ENFORCE_OFFLINE_KEY,
    SAVED_AVAILABILITY_KEY,
    SAVED_BIO_KEY,
    SAVED_ICON_KEY,
    SAVED_BACKGROUND_KEY,
    SAVED_TOKENS_KEY,
    SAVED_TITLE_KEY,
    SAVED_RANK_QUEUE_KEY,
    SAVED_RANK_TIER_KEY,
    SAVED_RANK_DIV_KEY,
    SAVED_CHALLENGE_CRYSTAL_KEY,
    SAVED_CHALLENGE_POINTS_KEY
} from '../storageKeys';

/** Interval between enforcement cycles (ms). */
const ENFORCE_INTERVAL_MS = 15_000;

interface ChallengeSummary {
    bannerId?: string;
    crestId?: string;
    bannerAccent?: string;
    crestBorder?: string;
    prestigeCrestBorderLevel?: number;
    preferences?: {
        bannerId?: string;
        crestId?: string;
        bannerAccent?: string;
        crestBorder?: string;
        prestigeCrestBorderLevel?: number;
    };
}

export function useProfileEnforcer(
    lcu: LcuInfo | null,
    lcuRequest: LcuRequestFn,
    addLog: (msg: string) => void,
    musicSyncActive: boolean = false
) {
    const sessionActive = useRef(false);
    // Track whether the initial enforcement (with full logging) has run this session.
    const hasLoggedInitial = useRef(false);
    // Prevent overlapping enforcement cycles.
    const cycleRunningRef = useRef(false);
    // Track music sync state without re-triggering the interval effect.
    const musicSyncActiveRef = useRef(false);
    useEffect(() => { musicSyncActiveRef.current = musicSyncActive; }, [musicSyncActive]);

    // Reset state when the LCU disconnects
    useEffect(() => {
        if (lcu) {
            sessionActive.current = true;
        } else {
            hasLoggedInitial.current = false;
            sessionActive.current = false;
            cycleRunningRef.current = false;
        }
    }, [lcu]);

    useEffect(() => {
        if (!lcu) return;

        const runSilent = async (
            name: string,
            operation: () => Promise<unknown>,
            verbose: boolean
        ) => {
            try {
                await operation();
                if (verbose) addLog(`Auto-Enforcer: Applied custom ${name}.`);
            } catch (err) {
                if (verbose) addLog(`Auto-Enforcer error: Failed to apply ${name} - ${err}`);
            }
        };

        const enforceProfile = async () => {
            if (!sessionActive.current) return;
            if (cycleRunningRef.current) return;

            // Check autoEnforce on every cycle so toggling it in Settings
            // takes effect within one interval without needing a reconnect.
            const autoEnforce = localStorage.getItem(SAVED_AUTO_ENFORCE_KEY) === 'true'
                || localStorage.getItem(SAVED_ENFORCE_OFFLINE_KEY) === 'true';
            if (!autoEnforce) return;

            cycleRunningRef.current = true;

            try {
                const isInitial = !hasLoggedInitial.current;
                if (isInitial) {
                    addLog("LCU connected. Auto-Enforcer applying saved profile settings...");
                    hasLoggedInitial.current = true;
                }

                // 1. Icon (PFP)
                const savedIcon = localStorage.getItem(SAVED_ICON_KEY);
                if (savedIcon) {
                    await runSilent("Icon", () => lcuRequest("PUT", "/lol-chat/v1/me", { icon: Number.parseInt(savedIcon, 10) }), isInitial);
                }

                // 2. Status & Bio
                const savedStatus = localStorage.getItem(SAVED_AVAILABILITY_KEY);
                const savedBio = localStorage.getItem(SAVED_BIO_KEY);
                const skipBio = musicSyncActiveRef.current;
                if (skipBio && isInitial) {
                    addLog("Auto-Enforcer: Skipping bio enforcement — Music Sync is active.");
                }
                if (savedStatus || (savedBio !== null && !skipBio)) {
                    const statusBody: Record<string, unknown> = {};
                    if (savedStatus) statusBody.availability = savedStatus;
                    if (savedBio !== null && !skipBio) statusBody.statusMessage = savedBio;
                    await runSilent("Status & Bio", () => lcuRequest("PUT", "/lol-chat/v1/me", statusBody), isInitial);
                }

                // 3. Tokens, Title
                const savedTokens = localStorage.getItem(SAVED_TOKENS_KEY);
                const savedTitle = localStorage.getItem(SAVED_TITLE_KEY);

                if (savedTokens || savedTitle !== null) {
                    await runSilent("Tokens & Regalia", async () => {
                        const challengeIds: unknown = savedTokens ? JSON.parse(savedTokens) : undefined;
                        const prefBody: Record<string, unknown> = {};
                        if (challengeIds) prefBody.challengeIds = challengeIds;
                        if (savedTitle !== null && savedTitle !== "-1") prefBody.title = savedTitle;

                        // The update endpoint does a FULL REPLACE — merge current
                        // preferences so we don't reset banner/crest/prestige.
                        let mergeOk = false;
                        try {
                            const summary = await lcuRequest("GET", "/lol-challenges/v1/summary-player-data/local-player") as ChallengeSummary | null;
                            if (summary) {
                                prefBody.bannerAccent = summary.bannerId ?? summary.preferences?.bannerId ?? summary.bannerAccent ?? summary.preferences?.bannerAccent ?? "";
                                prefBody.crestBorder = summary.crestId ?? summary.preferences?.crestId ?? summary.crestBorder ?? summary.preferences?.crestBorder ?? "";
                                prefBody.prestigeCrestBorderLevel = summary.prestigeCrestBorderLevel ?? summary.preferences?.prestigeCrestBorderLevel ?? 0;
                                mergeOk = true;
                            }
                        } catch (err) {
                            if (isInitial) addLog(`Auto-Enforcer warning: Could not read current preferences to merge: ${err}`);
                        }

                        if (!mergeOk && !savedTokens && savedTitle === null) return;
                        await lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", prefBody);
                    }, isInitial);
                }

                // 4. Rank & Challenge overrides (via chat presence lol object)
                const savedRankTier = localStorage.getItem(SAVED_RANK_TIER_KEY);
                const savedRankDiv = localStorage.getItem(SAVED_RANK_DIV_KEY);
                const savedRankQueue = localStorage.getItem(SAVED_RANK_QUEUE_KEY);
                const savedCrystal = localStorage.getItem(SAVED_CHALLENGE_CRYSTAL_KEY);
                const savedPoints = localStorage.getItem(SAVED_CHALLENGE_POINTS_KEY);

                if (savedRankTier || savedRankDiv || savedRankQueue || savedCrystal || savedPoints) {
                    await runSilent("Rank & Challenge Stats", async () => {
                        await patchChatLol(lcuRequest, (current) => {
                            const updated: Record<string, unknown> = { ...current };
                            if (savedRankTier) updated.rankedLeagueTier = savedRankTier;
                            if (savedRankDiv) updated.rankedLeagueDivision = savedRankDiv;
                            if (savedRankQueue) updated.rankedLeagueQueue = savedRankQueue;
                            if (savedCrystal) updated.challengeCrystalLevel = savedCrystal;
                            if (savedPoints) updated.challengePoints = savedPoints;
                            return updated;
                        });
                    }, isInitial);
                }

                // 5. Background
                const savedBackground = localStorage.getItem(SAVED_BACKGROUND_KEY);
                if (savedBackground) {
                    await runSilent("Profile Background", async () => {
                        try {
                            // Try official method first
                            await lcuRequest("POST", "/lol-summoner/v1/current-summoner/summoner-profile/", {
                                key: "backgroundSkinId",
                                value: Number.parseInt(savedBackground, 10)
                            });
                        } catch (err) {
                            if (isInitial) addLog(`Auto-Enforcer Background: Official update failed (${err}). Trying force chat fallback...`);
                            // Fallback to chat presence force method via serialized RMW
                            await patchChatLol(lcuRequest, (current) => ({
                                ...current,
                                backgroundSkinId: savedBackground.toString()
                            }));
                        }
                    }, isInitial);
                }

                if (isInitial) {
                    addLog("Auto-Enforcer restoration flow completed.");
                }
            } finally {
                cycleRunningRef.current = false;
            }
        };

        // Initial enforcement after a short delay to let LCU initialize
        const initialTimer = setTimeout(enforceProfile, 5000);

        // Continuous polling to re-apply settings after game resets them
        const interval = setInterval(enforceProfile, ENFORCE_INTERVAL_MS);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [lcu, lcuRequest, addLog]);
}
