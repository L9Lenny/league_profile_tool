import React, { useState, useEffect, useCallback } from 'react';
import { LcuInfo } from '../../hooks/useLcu';
import { Shield, Award, Sparkles, RefreshCw } from 'lucide-react';

interface RankTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: any) => Promise<any>;
}

interface TitleDef {
    id: number;
    name: string;
    description: string;
    state: string;
}

const safeExtractString = (val: any): string => {
    if (val === undefined || val === null) return "";
    if (typeof val === 'object') {
        const id = val.id ?? val.itemId ?? val.titleId ?? val.value ?? val.name;
        return id !== undefined && id !== null ? String(id) : "";
    }
    return String(val);
};

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["I", "II", "III", "IV"];
const QUEUES = [
    { value: "RANKED_SOLO_5x5", label: "Ranked Solo/Duo" },
    { value: "RANKED_FLEX_SR", label: "Ranked Flex 5v5" },
    { value: "RANKED_FLEX_TT", label: "Ranked Flex 3v3" },
    { value: "RANKED_TFT", label: "Ranked TFT" }
];
const CRYSTAL_TIERS = ["NONE", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

const REGALIA_TIERS = [
    { value: "", label: "Default / None" },
    { value: "1", label: "Iron" },
    { value: "2", label: "Bronze" },
    { value: "3", label: "Silver" },
    { value: "4", label: "Gold" },
    { value: "5", label: "Platinum" },
    { value: "6", label: "Emerald" },
    { value: "7", label: "Diamond" },
    { value: "8", label: "Master" },
    { value: "9", label: "Grandmaster" },
    { value: "10", label: "Challenger" }
];

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

    // Customization states
    const [bannerAccent, setBannerAccent] = useState("");
    const [crestBorder, setCrestBorder] = useState("");
    const [title, setTitle] = useState("");
    const [customTitleId, setCustomTitleId] = useState("");

    // Unlocked titles list
    const [titlesList, setTitlesList] = useState<TitleDef[]>([]);

    const fetchCurrentData = useCallback(async () => {
        if (!lcu) return;
        setFetching(true);
        try {
            addLog("Syncing profile & rank customization from LCU...");
            
            // 1. Fetch chat status
            const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as any;
            if (chatRes?.lol) {
                const lol = chatRes.lol;
                if (lol.rankedLeagueTier) setSoloTier(lol.rankedLeagueTier);
                if (lol.rankedLeagueDivision) setSoloDiv(lol.rankedLeagueDivision);
                if (lol.rankedLeagueQueue) setQueueType(lol.rankedLeagueQueue);
                if (lol.challengeCrystalLevel) setChallengeCrystalLevel(lol.challengeCrystalLevel);
                if (lol.challengePoints) setChallengePoints(String(lol.challengePoints));
            }

            // 2. Fetch challenge/preferences summary
            const summaryRes = await lcuRequest("GET", "/lol-challenges/v1/summary-player-data/local-player") as any;
            if (summaryRes) {
                const accent = safeExtractString(summaryRes.bannerAccent ?? summaryRes.preferences?.bannerAccent);
                const border = safeExtractString(summaryRes.crestBorder ?? summaryRes.preferences?.crestBorder);
                const activeTitle = safeExtractString(summaryRes.title ?? summaryRes.preferences?.title);
                setBannerAccent(accent);
                setCrestBorder(border);
                setTitle(activeTitle);
                setCustomTitleId(activeTitle);
            }

            // 3. Fetch unlocked titles
            const titlesRes = await lcuRequest("GET", "/lol-challenges/v2/titles/local-player") as any;
            if (Array.isArray(titlesRes)) {
                // Keep only unlocked or equipped titles to populate the selector
                const filteredTitles = titlesRes.filter(t => t.state === "UNLOCKED" || t.state === "EQUIPPED");
                setTitlesList(filteredTitles);
            }

            addLog("Profile customization synced successfully.");
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
            // First update chat presence status (ranked indicators, challenge level/points)
            const chatBody = {
                lol: {
                    rankedLeagueTier: soloTier,
                    rankedLeagueDivision: soloDiv,
                    rankedLeagueQueue: queueType,
                    challengeCrystalLevel: challengeCrystalLevel,
                    challengePoints: parseInt(challengePoints) || 0
                }
            };
            await lcuRequest("PUT", "/lol-chat/v1/me", chatBody);

            // Fetch current equipped challengeIds to merge them and avoid clearing tokens
            let challengeIds: number[] = [];
            let prestigeCrestBorderLevel = 0;
            try {
                const summary: any = await lcuRequest("GET", "/lol-challenges/v1/summary-player-data/local-player");
                if (summary) {
                    if (summary.topChallenges && Array.isArray(summary.topChallenges)) {
                        challengeIds = summary.topChallenges.map((c: any) => c.id).filter((id: number) => id && id !== -1);
                    }
                    prestigeCrestBorderLevel = summary.prestigeCrestBorderLevel ?? summary.preferences?.prestigeCrestBorderLevel ?? 0;
                }
            } catch (err) {
                // If it fails, fallback to empty tokens rather than failing the whole apply
                addLog(`Could not load topChallenges to merge: ${err}`);
            }

            // Update customization preferences (banner, crest border, title)
            const prefBody = {
                challengeIds,
                bannerAccent: safeExtractString(bannerAccent),
                title: safeExtractString(customTitleId || title),
                crestBorder: safeExtractString(crestBorder),
                prestigeCrestBorderLevel
            };
            await lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", prefBody);

            showToast("Profile Customizations Applied!", "success");
            addLog(`Rank overrides & profile customizations updated successfully.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showToast(`Customization failed: ${errorMessage}`, "error");
            addLog(`Customization application failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tab-content fadeIn" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* LEFT PANEL: Ranks & Challenge Stats */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
                    Modify your visible rank, queue type, and challenge stats displayed in the client chat and hover cards.
                </p>

                {/* Queue & Tier/Division Selection */}
                <div className="input-group">
                    <label htmlFor="queue-select">Rank Queue Type</label>
                    <select id="queue-select" value={queueType} onChange={(e) => setQueueType(e.target.value)} disabled={!lcu}>
                        {QUEUES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                    </select>
                </div>

                <div className="input-group">
                    <label htmlFor="solo-tier-select">Rank Override (Tier &amp; Division)</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select id="solo-tier-select" value={soloTier} onChange={(e) => setSoloTier(e.target.value)} style={{ flex: 2 }} disabled={!lcu}>
                            {TIERS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={soloDiv} onChange={(e) => setSoloDiv(e.target.value)} style={{ flex: 1 }} disabled={!lcu}>
                            {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '8px 0' }} />

                {/* Challenge Crystal Level & Points */}
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

            {/* RIGHT PANEL: Banners, Crests & Titles */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Award size={20} color="var(--hextech-gold)" />
                    <h3 className="card-title" style={{ margin: 0 }}>Identity &amp; Regalia Overrides</h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
                    Customize your profile card decoration, including your title, crest border, and banner accent.
                </p>

                {/* Title Selector */}
                <div className="input-group">
                    <label htmlFor="title-select">Equipped Title</label>
                    <select 
                        id="title-select" 
                        value={title} 
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setCustomTitleId(e.target.value);
                        }}
                        disabled={!lcu}
                    >
                        <option value="">None / Hide Title</option>
                        {titlesList.map(t => (
                            <option key={t.id} value={String(t.id)}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label htmlFor="custom-title-input">Custom Title ID Override</label>
                    <input 
                        id="custom-title-input" 
                        type="text" 
                        value={customTitleId} 
                        onChange={(e) => setCustomTitleId(e.target.value)} 
                        placeholder="Paste numeric Title ID (exploit/manual override)"
                        disabled={!lcu}
                    />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '8px 0' }} />

                {/* Banner Accent Selector */}
                <div className="input-group">
                    <label htmlFor="banner-select">Banner Accent Preset</label>
                    <select id="banner-select" value={bannerAccent} onChange={(e) => setBannerAccent(e.target.value)} disabled={!lcu}>
                        {REGALIA_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                <div className="input-group">
                    <label htmlFor="custom-banner-input">Custom Banner Accent ID</label>
                    <input 
                        id="custom-banner-input" 
                        type="text" 
                        value={bannerAccent} 
                        onChange={(e) => setBannerAccent(e.target.value)} 
                        placeholder="e.g. 10 (Challenger)"
                        disabled={!lcu}
                    />
                </div>

                {/* Crest Border Selector */}
                <div className="input-group">
                    <label htmlFor="crest-select">Crest Border Preset</label>
                    <select id="crest-select" value={crestBorder} onChange={(e) => setCrestBorder(e.target.value)} disabled={!lcu}>
                        {REGALIA_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                <div className="input-group">
                    <label htmlFor="custom-crest-input">Custom Crest Border ID</label>
                    <input 
                        id="custom-crest-input" 
                        type="text" 
                        value={crestBorder} 
                        onChange={(e) => setCrestBorder(e.target.value)} 
                        placeholder="e.g. 10 (Challenger)"
                        disabled={!lcu}
                    />
                </div>
            </div>

            {/* FULL WIDTH PREVIEW & APPLY BUTTON */}
            <div className="card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={18} color="var(--hextech-gold)" />
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)' }}>
                        Draft Override Preview
                    </span>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '15px', 
                    padding: '12px', 
                    background: 'rgba(0, 0, 0, 0.3)', 
                    borderRadius: '8px',
                    fontSize: '0.8rem'
                }}>
                    <div>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Rank / Queue</div>
                        <div style={{ fontWeight: 700, color: 'white' }}>
                            {soloTier} {soloDiv} <span style={{ fontSize: '0.7rem', color: 'var(--hextech-gold)', fontWeight: 400 }}>({QUEUES.find(q => q.value === queueType)?.label})</span>
                        </div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Challenge Level</div>
                        <div style={{ fontWeight: 700, color: 'white' }}>
                            {challengeCrystalLevel} <span style={{ fontSize: '0.7rem', color: 'var(--hextech-gold)', fontWeight: 400 }}>({challengePoints} pts)</span>
                        </div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Title ID</div>
                        <div style={{ fontWeight: 700, color: 'white' }}>
                            {customTitleId || title ? (
                                <span style={{ color: 'var(--hextech-gold)' }}>
                                    {titlesList.find(t => String(t.id) === (customTitleId || title))?.name || `ID: ${customTitleId || title}`}
                                </span>
                            ) : (
                                <span style={{ opacity: 0.3 }}>None</span>
                            )}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Banner / Crest</div>
                        <div style={{ fontWeight: 700, color: 'white' }}>
                            Accent: {bannerAccent || 'None'} / Crest: {crestBorder || 'None'}
                        </div>
                    </div>
                </div>

                <button 
                    className="primary-btn" 
                    style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }} 
                    onClick={applyChanges} 
                    disabled={!lcu || loading}
                >
                    {loading ? 'APPLYING CUSTOMIZATIONS...' : 'APPLY OVERRIDES'}
                </button>
            </div>

            {!lcu && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '10px' }}>
                    <p style={{ color: '#ff3232', fontSize: '0.85rem', margin: 0 }}>⚠ League client connection required to apply overrides.</p>
                </div>
            )}
        </div>
    );
};

export default RankTab;
