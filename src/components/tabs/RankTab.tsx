import React, { useState, useEffect, useCallback } from 'react';
import { LcuInfo } from '../../hooks/useLcu';
import { Shield, Sparkles, RefreshCw } from 'lucide-react';

interface RankTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: any) => Promise<any>;
}

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["I", "II", "III", "IV"];
const QUEUES = [
    { value: "RANKED_SOLO_5x5", label: "Solo/Duo" },
    { value: "RANKED_FLEX_SR", label: "Flex 5v5" },
    { value: "RANKED_FLEX_TT", label: "Flex 3v3" },
    { value: "RANKED_TFT", label: "TFT" }
];
const CRYSTAL_TIERS = ["NONE", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

const TIER_COLORS: Record<string, string> = {
    NONE: "#595959",
    IRON: "#595959",
    BRONZE: "#8b5a2b",
    SILVER: "#c0c0c0",
    GOLD: "#ffd700",
    PLATINUM: "#00ced1",
    EMERALD: "#2ecc71",
    DIAMOND: "#1e90ff",
    MASTER: "#8a2be2",
    GRANDMASTER: "#ff4500",
    CHALLENGER: "#00ffff"
};

const RankTab: React.FC<RankTabProps> = ({ lcu, showToast, addLog, lcuRequest }) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Rank states
    const [soloTier, setSoloTier] = useState("CHALLENGER");
    const [soloDiv, setSoloDiv] = useState("I");
    const [queueType, setQueueType] = useState("RANKED_SOLO_5x5");

    // Challenge stats
    const [challengeCrystalLevel, setChallengeCrystalLevel] = useState("CHALLENGER");
    const [challengePoints, setChallengePoints] = useState("1200");

    // Full lol object state to preserve other properties like background, icons, etc.
    const [currentLolObj, setCurrentLolObj] = useState<any>({});

    const fetchCurrentData = useCallback(async () => {
        if (!lcu) return;
        setFetching(true);
        try {
            addLog("Syncing rank status from LCU...");
            
            const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as any;
            if (chatRes?.lol) {
                const lol = typeof chatRes.lol === 'string' ? JSON.parse(chatRes.lol) : chatRes.lol;
                setCurrentLolObj(lol);
                if (lol.rankedLeagueTier) setSoloTier(lol.rankedLeagueTier);
                if (lol.rankedLeagueDivision) setSoloDiv(lol.rankedLeagueDivision);
                if (lol.rankedLeagueQueue) setQueueType(lol.rankedLeagueQueue);
                if (lol.challengeCrystalLevel) setChallengeCrystalLevel(lol.challengeCrystalLevel);
                if (lol.challengePoints !== undefined) setChallengePoints(String(lol.challengePoints));
            }

            addLog("Rank status synced successfully.");
        } catch (err) {
            addLog(`Failed to fetch current status: ${err}`);
        } finally {
            setFetching(false);
        }
    }, [lcu, lcuRequest, addLog]);

    useEffect(() => {
        if (lcu) {
            fetchCurrentData();
        }
    }, [lcu, fetchCurrentData]);

    const applyChanges = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            // Re-fetch latest to ensure we don't overwrite other recent changes
            const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as any;
            let baseLol = currentLolObj;
            if (chatRes?.lol) {
                baseLol = typeof chatRes.lol === 'string' ? JSON.parse(chatRes.lol) : chatRes.lol;
                setCurrentLolObj(baseLol);
            }

            const updatedLol = {
                ...baseLol,
                rankedLeagueTier: soloTier,
                rankedLeagueDivision: soloDiv,
                rankedLeagueQueue: queueType,
                challengeCrystalLevel: challengeCrystalLevel,
                challengePoints: String(challengePoints || "0")
            };

            const chatBody = {
                lol: updatedLol
            };
            
            await lcuRequest("PUT", "/lol-chat/v1/me", chatBody);

            showToast("Rank Overrides Applied!", "success");
            addLog(`Rank overrides updated successfully.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showToast(`Customization failed: ${errorMessage}`, "error");
            addLog(`Customization application failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const hasDivision = !["MASTER", "GRANDMASTER", "CHALLENGER"].includes(soloTier);

    return (
        <div className="tab-content fadeIn" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* LEFT PANEL: Ranks & Challenge Stats Selectors */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield size={20} color="var(--hextech-gold)" />
                        <h3 className="card-title" style={{ margin: 0 }}>Rank &amp; Stats Overrides</h3>
                    </div>
                    <button 
                        className={`refresh-icon-btn ${fetching ? 'loading' : ''}`}
                        onClick={fetchCurrentData}
                        disabled={!lcu || fetching}
                        title="Sync from Client"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '-10px 0 0 0' }}>
                    Modify your visible rank, queue type, and challenge stats displayed in the client chat and hover cards.
                </p>

                {/* Queue Selection (Segmented Control) */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Queue Type</label>
                    <div className="rank-queue-toggles">
                        {QUEUES.map(q => (
                            <button
                                key={q.value}
                                className={`rank-queue-btn ${queueType === q.value ? 'active' : ''}`}
                                onClick={() => setQueueType(q.value)}
                                disabled={!lcu}
                            >
                                {q.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tier Selection Grid */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rank Tier</label>
                    <div className="tier-grid">
                        {TIERS.map(t => {
                            const isActive = soloTier === t;
                            const color = TIER_COLORS[t] || "#ffffff";
                            return (
                                <button
                                    key={t}
                                    className={`tier-btn ${isActive ? 'active' : ''}`}
                                    style={isActive ? { color, borderColor: color, boxShadow: `0 0 15px ${color}40, inset 0 0 8px ${color}20` } : {}}
                                    onClick={() => setSoloTier(t)}
                                    disabled={!lcu}
                                >
                                    <Shield size={24} color={isActive ? color : "var(--text-secondary)"} />
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Division Selection Grid */}
                {hasDivision && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Division</label>
                        <div className="division-grid">
                            {DIVISIONS.map(d => (
                                <button
                                    key={d}
                                    className={`division-btn ${soloDiv === d ? 'active' : ''}`}
                                    onClick={() => setSoloDiv(d)}
                                    disabled={!lcu}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

                {/* Challenge Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="input-group">
                        <label htmlFor="crystal-tier-select">Challenge Crystal Level</label>
                        <select id="crystal-tier-select" value={challengeCrystalLevel} onChange={(e) => setChallengeCrystalLevel(e.target.value)} disabled={!lcu}>
                            {CRYSTAL_TIERS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="input-group">
                        <label htmlFor="challenge-points-input">Challenge Points</label>
                        <input 
                            id="challenge-points-input" 
                            type="number" 
                            value={challengePoints} 
                            onChange={(e) => setChallengePoints(e.target.value)} 
                            placeholder="e.g. 1200"
                            disabled={!lcu}
                        />
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Preview & Apply */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div className="profile-preview-card">
                    <div style={{ position: 'absolute', top: 15, left: 15, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <Sparkles size={14} color="var(--hextech-gold)" /> Preview
                    </div>
                    
                    <div className="profile-rank-display">
                        <div className="profile-rank-tier" style={{ color: TIER_COLORS[soloTier] || "#ffffff" }}>
                            {soloTier} {hasDivision ? soloDiv : ''}
                        </div>
                        <div className="profile-rank-queue">
                            {QUEUES.find(q => q.value === queueType)?.label || queueType}
                        </div>
                    </div>

                    <div className="profile-challenge-crystal">
                        <div className="profile-crystal-dot" style={{ color: TIER_COLORS[challengeCrystalLevel] || "#595959", backgroundColor: TIER_COLORS[challengeCrystalLevel] || "#595959" }}></div>
                        {challengeCrystalLevel} Crystal
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>• {challengePoints} pts</span>
                    </div>
                </div>

                <div className="card">
                    <button 
                        className="primary-btn" 
                        style={{ width: '100%', padding: '16px', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px' }} 
                        onClick={applyChanges} 
                        disabled={!lcu || loading}
                    >
                        {loading ? 'APPLYING...' : 'APPLY RANK OVERRIDES'}
                    </button>
                    {!lcu && (
                        <p style={{ color: '#ff3232', fontSize: '0.85rem', margin: '10px 0 0 0', textAlign: 'center' }}>
                            ⚠ League client connection required.
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
};

export default RankTab;
