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
    SAVED_TITLE_KEY,
    SAVED_RANK_QUEUE_KEY,
    SAVED_RANK_TIER_KEY,
    SAVED_RANK_DIV_KEY,
    SAVED_CHALLENGE_CRYSTAL_KEY,
    SAVED_CHALLENGE_POINTS_KEY
} from '../storageKeys';

export function useProfileEnforcer(
    lcu: LcuInfo | null,
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<unknown>,
    addLog: (msg: string) => void
) {
    const hasEnforcedThisSession = useRef(false);

    // Reset the enforcer state when the LCU disconnects
    useEffect(() => {
        if (!lcu) {
            hasEnforcedThisSession.current = false;
        }
    }, [lcu]);

    useEffect(() => {
        if (!lcu) return;
        if (hasEnforcedThisSession.current) return;

        const autoEnforce = localStorage.getItem(SAVED_AUTO_ENFORCE_KEY) === 'true' || localStorage.getItem(SAVED_ENFORCE_OFFLINE_KEY) === 'true';
        if (!autoEnforce) return;

        const enforceProfile = async () => {
            addLog("LCU connected. Auto-Enforcer applying saved profile settings...");
            hasEnforcedThisSession.current = true;

            try {
                // 1. Icon
                const savedIcon = localStorage.getItem(SAVED_ICON_KEY);
                if (savedIcon) {
                    await lcuRequest("PUT", "/lol-chat/v1/me", { icon: parseInt(savedIcon, 10) });
                }

                // 2. Status & Bio
                const savedStatus = localStorage.getItem(SAVED_AVAILABILITY_KEY);
                const savedBio = localStorage.getItem(SAVED_BIO_KEY);
                if (savedStatus || savedBio !== null) {
                    const statusBody: any = {};
                    if (savedStatus) statusBody.availability = savedStatus;
                    if (savedBio !== null) statusBody.statusMessage = savedBio;
                    await lcuRequest("PUT", "/lol-chat/v1/me", statusBody);
                }

                // 3. Tokens & Title
                const savedTokens = localStorage.getItem(SAVED_TOKENS_KEY);
                const savedTitle = localStorage.getItem(SAVED_TITLE_KEY);
                if (savedTokens || savedTitle !== null) {
                    const challengeIds = savedTokens ? JSON.parse(savedTokens) : undefined;
                    const prefBody: any = {};
                    if (challengeIds) prefBody.challengeIds = challengeIds;
                    if (savedTitle !== null) prefBody.title = savedTitle;
                    await lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", prefBody);
                }

                // 4. Rank & Challenge Crystals
                const savedQueue = localStorage.getItem(SAVED_RANK_QUEUE_KEY);
                const savedTier = localStorage.getItem(SAVED_RANK_TIER_KEY);
                const savedDiv = localStorage.getItem(SAVED_RANK_DIV_KEY);
                const savedCrystal = localStorage.getItem(SAVED_CHALLENGE_CRYSTAL_KEY);
                const savedPoints = localStorage.getItem(SAVED_CHALLENGE_POINTS_KEY);
                
                if (savedTier || savedCrystal) {
                    const rankLol: any = {};
                    if (savedQueue) rankLol.rankedLeagueQueue = savedQueue;
                    if (savedTier) rankLol.rankedLeagueTier = savedTier;
                    if (savedDiv) rankLol.rankedLeagueDivision = savedDiv;
                    if (savedCrystal) rankLol.challengeCrystalLevel = savedCrystal;
                    if (savedPoints) rankLol.challengePoints = savedPoints;

                    await lcuRequest("PUT", "/lol-chat/v1/me", { lol: rankLol });
                }

                // 5. Background
                const savedBackground = localStorage.getItem(SAVED_BACKGROUND_KEY);
                if (savedBackground) {
                    try {
                        // Try official method first
                        await lcuRequest("POST", "/lol-summoner/v1/current-summoner/summoner-profile/", {
                            key: "backgroundSkinId",
                            value: parseInt(savedBackground, 10)
                        });
                    } catch (err) {
                        // Fallback to chat presence force method
                        const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as any;
                        let baseLol = {};
                        if (chatRes?.lol) {
                            baseLol = typeof chatRes.lol === 'string' ? JSON.parse(chatRes.lol) : chatRes.lol;
                        }
                        const newLol = { ...baseLol, backgroundSkinId: savedBackground.toString() };
                        await lcuRequest("PUT", "/lol-chat/v1/me", { lol: newLol });
                    }
                }

                addLog("Auto-Enforcer successfully applied all saved settings.");
            } catch (err) {
                addLog(`Auto-Enforcer encountered an error: ${err}`);
            }
        };

        // Give the LCU a few seconds to initialize and fetch from server before overwriting
        const timer = setTimeout(enforceProfile, 5000);
        return () => clearTimeout(timer);
    }, [lcu, lcuRequest, addLog]);
}
