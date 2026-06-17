import React, { useState, useEffect, useMemo } from 'react';
import { LcuInfo } from '../../hooks/useLcu';
import { SAVED_TOKENS_KEY } from '../../hooks/useAutoRestore';
import { Search, Award, Info, RotateCw, Trash2, Layers, CheckCircle2 } from 'lucide-react';

interface TokensTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: any) => Promise<any>;
}

interface TokenDef {
    id: number;
    name: string;
    level: string;
    description: string;
}

const TIERS = ["ALL", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

const TokensTab: React.FC<TokensTabProps> = ({ lcu, showToast, addLog, lcuRequest }) => {
    const [loading, setLoading] = useState(false);
    const [tokens, setTokens] = useState<TokenDef[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<number>(1);
    const [slots, setSlots] = useState<[number, number, number]>([-1, -1, -1]);
    const [search, setSearch] = useState("");
    const [tierFilter, setTierFilter] = useState("ALL");
    const [fetching, setFetching] = useState(false);
    const [challengeDefs, setChallengeDefs] = useState<Record<number, { name: string, description: string }>>({});

    const fetchCurrentSelection = async () => {
        if (!lcu) return;
        try {
            const summary: any = await lcuRequest("GET", "/lol-challenges/v1/summary-player-data/local-player");
            if (summary?.topChallenges && Array.isArray(summary.topChallenges)) {
                setSlots([
                    summary.topChallenges[0]?.id ?? -1,
                    summary.topChallenges[1]?.id ?? -1,
                    summary.topChallenges[2]?.id ?? -1
                ]);
            }
        } catch (err) {
            addLog(`Failed to fetch current tokens: ${err}`);
        }
    };

    const fetchTokens = async () => {
        if (!lcu) return;
        setFetching(true);
        try {
            addLog("Syncing challenges from LCU...");
            const challengesRes: any = await lcuRequest("GET", "/lol-challenges/v1/challenges/local-player");
            
            if (!challengesRes) {
                addLog("Empty response from challenges API.");
                setFetching(false);
                return;
            }

            // Fetch definitions from Community Dragon for accurate English names
            let defs = challengeDefs;
            if (Object.keys(defs).length === 0) {
                try {
                    const cdRes = await fetch("https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/en_gb/v1/challenges.json");
                    if (cdRes.ok) {
                        const cdData = await cdRes.json();
                        const record: Record<number, { name: string, description: string }> = {};
                        cdData.forEach((def: any) => record[def.id] = { name: def.name, description: def.description });
                        defs = record;
                        setChallengeDefs(record);
                    }
                } catch (e) {
                    addLog(`CD definitions fetch failed (using client names): ${e}`);
                }
            }

            const tokenList: TokenDef[] = [];
            
            // Robust parsing: handles both Array and Object/Map responses
            let entries: any[] = [];
            if (Array.isArray(challengesRes)) {
                entries = challengesRes;
            } else if (typeof challengesRes === 'object') {
                // If it's a map, we might need the keys as IDs if values don't have them
                entries = Object.entries(challengesRes).map(([key, val]: [string, any]) => {
                    if (val && typeof val === 'object') {
                        return { ...val, _idFromKey: key };
                    }
                    return val;
                });
            }

            entries.forEach((ch: any) => {
                if (!ch || typeof ch !== 'object') return;

                const rawId = ch.id || ch.challengeId || ch._idFromKey;
                const id = typeof rawId === 'number' ? rawId : parseInt(String(rawId));
                const level = ch.currentLevel || ch.level;
                
                const cdDef = defs[id];
                const name = cdDef?.name || ch.name;

                if (id > 0 && level && level !== 'NONE' && name) {
                    tokenList.push({
                        id,
                        name,
                        level,
                        description: cdDef?.description || ch.description || ""
                    });
                }
            });

            setTokens(tokenList.sort((a, b) => a.name.localeCompare(b.name)));
            addLog(`Successfully parsed ${tokenList.length} tokens.`);
            fetchCurrentSelection();
        } catch (err) {
            addLog(`Error syncing tokens: ${err}`);
            showToast("Failed to sync tokens", "error");
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (lcu) fetchTokens();
    }, [lcu]);

    const filteredTokens = useMemo(() => {
        return tokens.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
            const matchesTier = tierFilter === "ALL" || t.level.toUpperCase() === tierFilter;
            return matchesSearch && matchesTier;
        });
    }, [tokens, search, tierFilter]);

    const handleApply = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            const challengeIds = slots.filter(id => id !== -1);
            
            let bannerAccent = "";
            let title = "";
            let crestBorder = "";
            let prestigeCrestBorderLevel = 0;
            
            try {
                const summary: any = await lcuRequest("GET", "/lol-challenges/v1/summary-player-data/local-player");
                if (summary) {
                    const rawBanner = summary.bannerAccent ?? summary.preferences?.bannerAccent;
                    bannerAccent = rawBanner !== undefined && rawBanner !== null ? String(rawBanner) : "";

                    const rawTitle = summary.title ?? summary.preferences?.title;
                    title = rawTitle !== undefined && rawTitle !== null ? String(rawTitle) : "";

                    const rawCrest = summary.crestBorder ?? summary.preferences?.crestBorder;
                    crestBorder = rawCrest !== undefined && rawCrest !== null ? String(rawCrest) : "";

                    prestigeCrestBorderLevel = summary.prestigeCrestBorderLevel ?? summary.preferences?.prestigeCrestBorderLevel ?? 0;
                }
            } catch (err) {
                addLog(`Failed to fetch current player preferences to merge: ${err}`);
            }

            const payload = {
                challengeIds,
                bannerAccent,
                title,
                crestBorder,
                prestigeCrestBorderLevel
            };

            await lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", payload);
            localStorage.setItem(SAVED_TOKENS_KEY, JSON.stringify(challengeIds));
            showToast("Tokens updated successfully!", "success");
            addLog(`Equipped tokens: [${challengeIds.join(", ")}]`);
        } catch (err) {
            showToast("Failed to update tokens", "error");
            addLog(`Tokens update failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const fillAllSlots = (id: number) => {
        setSlots([id, id, id]);
        showToast("Token applied to all slots!", "success");
    };

    const clearAll = () => {
        setSlots([-1, -1, -1]);
        showToast("All slots cleared locally", "info");
    };

    const setSlot = (id: number) => {
        const newSlots = [...slots] as [number, number, number];
        newSlots[selectedSlot - 1] = id;
        setSlots(newSlots);
    };

    const getTokenImgUrl = (id: number, level: string) => {
        if (id === -1) return "";
        return `https://raw.communitydragon.org/latest/game/assets/challenges/config/${id}/tokens/${level.toLowerCase()}.png`;
    };

    return (
        <div className="tab-content fadeIn" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* LEFT SIDEBAR: Selection & Controls */}
            <div className="card" style={{ position: 'sticky', top: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={20} color="var(--hextech-gold)" />
                    <h3 className="card-title" style={{ margin: 0 }}>Active Selection</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                    {[1, 2, 3].map(i => {
                        const tokenId = slots[i-1];
                        const token = tokens.find(t => t.id === tokenId);
                        return (
                            <div 
                                key={i} 
                                onClick={() => setSelectedSlot(i)}
                                style={{ 
                                    width: '100px', 
                                    height: '100px', 
                                    borderRadius: '50%', 
                                    background: 'rgba(0,0,0,0.4)', 
                                    border: `2px ${selectedSlot === i ? 'solid' : 'dashed'} ${selectedSlot === i ? 'var(--hextech-gold)' : 'rgba(200, 155, 60, 0.3)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    boxShadow: selectedSlot === i ? '0 0 15px rgba(200, 155, 60, 0.2)' : 'none'
                                }}
                            >
                                {tokenId !== -1 ? (
                                    <img src={getTokenImgUrl(tokenId, token?.level || 'IRON')} alt="Token" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                ) : (
                                    <span style={{ fontSize: '1.5rem', opacity: 0.2 }}>+</span>
                                )}
                                <div style={{ 
                                    position: 'absolute', 
                                    bottom: '-5px', 
                                    right: '-5px', 
                                    background: 'var(--league-blue-deep)', 
                                    border: '1px solid var(--hextech-gold)',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    color: 'var(--hextech-gold)'
                                }}>{i}</div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button className="primary-btn" onClick={handleApply} disabled={!lcu || loading} style={{ width: '100%' }}>
                        {loading ? 'SYNCING...' : 'APPLY CHANGES'}
                    </button>
                    <button 
                        onClick={clearAll}
                        style={{ background: 'transparent', border: '1px solid rgba(255, 80, 80, 0.3)', color: '#ff6b6b', fontSize: '0.7rem', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Trash2 size={14} /> CLEAR ALL SLOTS
                    </button>
                </div>
                
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>
                    *Select a slot then pick a token from the grid.
                </div>
            </div>

            {/* MAIN CONTENT: Token Grid & Search */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Award size={24} color="var(--hextech-gold)" />
                        <h3 className="card-title" style={{ margin: 0 }}>Unlocked Tokens</h3>
                    </div>
                    <button 
                        className={`refresh-icon-btn ${fetching ? 'loading' : ''}`}
                        onClick={fetchTokens}
                        disabled={!lcu || fetching}
                    >
                        <RotateCw size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <div className="token-picker-search" style={{ flex: 1, padding: '8px 15px', borderRadius: '8px' }}>
                        <Search size={18} color="var(--text-secondary)" />
                        <input 
                            type="text" 
                            placeholder="Search by token name..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', marginLeft: '10px' }}
                        />
                    </div>
                    <select 
                        value={tierFilter} 
                        onChange={(e) => setTierFilter(e.target.value)}
                        style={{ 
                            background: 'rgba(0,0,0,0.3)', 
                            border: '1px solid var(--glass-border)', 
                            color: 'white', 
                            padding: '0 15px', 
                            borderRadius: '8px',
                            fontSize: '0.8rem'
                        }}
                    >
                        {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div style={{ 
                    flex: 1, 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                    gap: '15px',
                    overflowY: 'auto',
                    maxHeight: '500px',
                    paddingRight: '10px'
                }}>
                    {filteredTokens.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>
                            <Info size={40} style={{ opacity: 0.2, marginBottom: '15px' }} />
                            <p>No tokens found for your criteria.</p>
                        </div>
                    ) : (
                        filteredTokens.map(token => (
                            <div 
                                key={token.id}
                                className="token-item"
                                onClick={() => setSlot(token.id)}
                                onContextMenu={(e) => { e.preventDefault(); fillAllSlots(token.id); }}
                                style={{ 
                                    padding: '15px', 
                                    background: slots.includes(token.id) ? 'rgba(200, 155, 60, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid',
                                    borderColor: slots.includes(token.id) ? 'var(--hextech-gold)' : 'transparent',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                }}
                                title={`${token.name} (${token.level})\nRight click to fill all 3 slots.`}
                            >
                                <img src={getTokenImgUrl(token.id, token.level)} alt={token.name} style={{ width: '64px', height: '64px', margin: '0 auto 10px' }} />
                                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.name}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{token.level}</div>
                                
                                {slots.includes(token.id) && (
                                    <div style={{ position: 'absolute', top: '5px', right: '5px' }}>
                                        <CheckCircle2 size={14} color="var(--hextech-gold)" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {!lcu && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px' }}>
                    <p style={{ color: '#ff3232', fontSize: '0.8rem' }}>⚠ League client connection required to manage tokens.</p>
                </div>
            )}
        </div>
    );
};

export default TokensTab;
