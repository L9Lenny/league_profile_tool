import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LcuInfo } from '../../hooks/useLcu';
import { SAVED_BACKGROUND_KEY } from '../../hooks/useAutoRestore';
import { Search, Image, Loader2, Hash } from 'lucide-react';
import supplementalSkins from '../../data/supplemental-skins.json';

interface BackgroundTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<unknown>;
}

interface ChampionSummary {
    id: number;
    name: string;
    alias: string;
    squarePortraitPath: string;
}

interface SkinEntry {
    id: number;
    name: string;
    isBase: boolean;
    splashPath: string;
}

const CDRAGON_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

function cdnUrl(path: string): string {
    return CDRAGON_BASE + path.replace('/lol-game-data/assets', '').toLowerCase();
}

const FALLBACK_SPLASH = "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
        <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0f0f23"/>
                <stop offset="100%" stop-color="#1a1a2e"/>
            </linearGradient>
            <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#c8aa6e" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#c8aa6e" stop-opacity="0"/>
            </linearGradient>
        </defs>
        <rect width="400" height="225" fill="url(#bg)"/>
        <rect x="120" y="65" width="160" height="96" rx="8" fill="none" stroke="#c8aa6e" stroke-opacity="0.25" stroke-width="1.5"/>
        <path d="M160 130 L180 110 L200 130 L230 100 L260 120" fill="none" stroke="#c8aa6e" stroke-opacity="0.12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="160" y1="90" x2="240" y2="130" stroke="#c8aa6e" stroke-opacity="0.2" stroke-width="1.5"/>
        <circle cx="220" cy="93" r="3" fill="#c8aa6e" fill-opacity="0.2"/>
        <rect x="150" y="78" width="100" height="2" rx="1" fill="#c8aa6e" fill-opacity="0.08" transform="rotate(-20 200 79)"/>
        <rect x="150" y="78" width="100" height="2" rx="1" fill="#c8aa6e" fill-opacity="0.08" transform="rotate(20 200 79)"/>
        <text x="200" y="192" fill="#c8aa6e" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" letter-spacing="1.5" opacity="0.5">PREVIEW NOT AVAILABLE</text>
    </svg>`
);

const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = FALLBACK_SPLASH;
};

const BackgroundTab: React.FC<BackgroundTabProps> = ({ lcu, showToast, addLog, lcuRequest }) => {
    const [loading, setLoading] = useState(false);
    const [champions, setChampions] = useState<ChampionSummary[]>([]);
    const [champSearch, setChampSearch] = useState('');
    const [selectedChampion, setSelectedChampion] = useState<ChampionSummary | null>(null);
    const [skins, setSkins] = useState<SkinEntry[]>([]);
    const [selectedSkin, setSelectedSkin] = useState<SkinEntry | null>(null);
    const [currentBgId, setCurrentBgId] = useState<number | null>(null);
    const [loadingChamps, setLoadingChamps] = useState(false);
    const [loadingSkins, setLoadingSkins] = useState(false);
    const [champsLoaded, setChampsLoaded] = useState(false);
    const [directId, setDirectId] = useState('');
    const skinCacheRef = useRef<Map<number, SkinEntry[]>>(new Map());
    const skinGridRef = useRef<HTMLDivElement>(null);

    // Fetch current background skin ID from LCU
    const fetchCurrentBackground = useCallback(async () => {
        if (!lcu) return;
        try {
            const res = await lcuRequest('GET', '/lol-summoner/v1/current-summoner/summoner-profile');
            if (res && typeof res === 'object' && 'backgroundSkinId' in res) {
                setCurrentBgId(res.backgroundSkinId as number);
            }
        } catch (err) {
            console.error('Failed to fetch current background:', err);
        }
    }, [lcu, lcuRequest]);

    // Fetch champion list only (single request, instant)
    const fetchChampions = useCallback(async () => {
        if (champsLoaded || loadingChamps) return;
        setLoadingChamps(true);
        try {
            const res = await fetch(`${CDRAGON_BASE}/v1/champion-summary.json`);
            if (!res.ok) throw new Error('Failed to fetch champion list');
            const list: ChampionSummary[] = await res.json();
            const valid = list.filter(c => c.id > 0 && c.id < 66600).sort((a, b) => a.name.localeCompare(b.name));
            setChampions(valid);
            addLog(`Loaded ${valid.length} champions.`);
        } catch (err) {
            addLog(`Error fetching champions: ${err}`);
            showToast('Failed to load champion list', 'error');
        } finally {
            setLoadingChamps(false);
            setChampsLoaded(true);
        }
    }, [champsLoaded, loadingChamps, addLog, showToast]);

    useEffect(() => {
        if (!champsLoaded && !loadingChamps) fetchChampions();
        if (lcu) fetchCurrentBackground();
    }, [champsLoaded, loadingChamps, fetchChampions, lcu, fetchCurrentBackground]);

    // Fetch skins for a specific champion (lazy, cached)
    const selectChampion = useCallback(async (champ: ChampionSummary) => {
        setSelectedChampion(champ);
        setSelectedSkin(null);

        // Check cache first
        const cached = skinCacheRef.current.get(champ.id);
        if (cached) {
            setSkins(cached);
            return;
        }

        setLoadingSkins(true);
        setSkins([]);
        try {
            const res = await fetch(`${CDRAGON_BASE}/v1/champions/${champ.id}.json`);
            if (!res.ok) throw new Error(`Failed to fetch skins for ${champ.name}`);
            const data = await res.json();
            const skinList: SkinEntry[] = (data.skins || []).map((s: { id: number; name: string; isBase: boolean; splashPath: string }) => ({
                id: s.id,
                name: s.name,
                isBase: s.isBase,
                splashPath: s.splashPath,
            }));

            // Merge supplemental skins (missing from CommunityDragon)
            const extras = (supplementalSkins as Record<string, SkinEntry[]>)[String(champ.id)];
            if (extras) {
                const existingIds = new Set(skinList.map(s => s.id));
                for (const extra of extras) {
                    if (!existingIds.has(extra.id)) {
                        skinList.push(extra);
                    }
                }
            }

            skinCacheRef.current.set(champ.id, skinList);
            setSkins(skinList);
        } catch (err) {
            addLog(`Error loading skins: ${err}`);
        } finally {
            setLoadingSkins(false);
        }
    }, [addLog]);

    // Scroll skin grid to top when champion changes
    useEffect(() => {
        if (skinGridRef.current) skinGridRef.current.scrollTop = 0;
    }, [selectedChampion]);

    const filteredChampions = champSearch.trim()
        ? champions.filter(c =>
            c.name.toLowerCase().includes(champSearch.toLowerCase()) ||
            c.alias.toLowerCase().includes(champSearch.toLowerCase())
        )
        : champions;

    const applyBackground = async (skinId: number, skinName: string) => {
        if (!lcu) return;
        setLoading(true);
        try {
            await lcuRequest('POST', '/lol-summoner/v1/current-summoner/summoner-profile', {
                key: 'backgroundSkinId',
                value: skinId,
            });
            localStorage.setItem(SAVED_BACKGROUND_KEY, skinId.toString());
            showToast(`Background set to ${skinName}!`, 'success');
            addLog(`Profile background updated: ${skinName} (ID: ${skinId})`);
            setCurrentBgId(skinId);
        } catch (err) {
            addLog(`Official background update failed (${err}). Trying force method...`);
            try {
                const chatMe: any = await lcuRequest("GET", "/lol-chat/v1/me");
                let currentLol = {};
                if (chatMe?.lol) {
                    currentLol = typeof chatMe.lol === 'string' ? JSON.parse(chatMe.lol) : chatMe.lol;
                }
                const newLol = { ...currentLol, backgroundSkinId: skinId.toString() };
                await lcuRequest("PUT", "/lol-chat/v1/me", { lol: newLol });
                
                localStorage.setItem(SAVED_BACKGROUND_KEY, skinId.toString());
                showToast(`Background forced to ${skinName}!`, 'success');
                addLog(`Profile background forced: ${skinName} (ID: ${skinId})`);
                setCurrentBgId(skinId);
            } catch (forceErr) {
                const msg = forceErr instanceof Error ? forceErr.message : String(forceErr);
                showToast('Failed to set background', 'error');
                addLog(`Background update failed: ${msg}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // Correctly extract the label logic
    const getApplyButtonLabel = () => {
        if (loading) return 'APPLYING...';
        if (selectedSkin) return `APPLY — ${selectedSkin.name}`;
        return 'SELECT A SKIN';
    };

    return (
        <div className="tab-content fadeIn">
            {/* 1. Direct Skin ID Card (Always at the top) */}
            <div className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Hash size={18} style={{ color: 'var(--hextech-gold)' }} />
                    <h3 className="card-title" style={{ margin: 0 }}>Direct Skin ID</h3>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <input
                            type="number"
                            id="direct-skin-id-input"
                            placeholder="Enter specific skin ID (e.g. 147001)"
                            value={directId}
                            onChange={(e) => setDirectId(e.target.value)}
                            style={{ width: '100%', padding: '10px' }}
                        />
                    </div>
                    <button
                        className="primary-btn"
                        onClick={() => {
                            const id = Number.parseInt(directId, 10);
                            if (!Number.isNaN(id) && id > 0) applyBackground(id, `Skin ${id}`);
                        }}
                        disabled={!lcu || loading || !directId.trim()}
                        style={{ padding: '10px 25px' }}
                    >
                        APPLY
                    </button>
                </div>
            </div>

            {/* 2. Main Browser Card */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <Image size={20} style={{ color: 'var(--hextech-gold)' }} />
                            <h3 className="card-title" style={{ margin: 0 }}>Profile Background</h3>
                        </div>
                        <p className="music-subtitle" style={{ margin: 0 }}>Browse champions and select a skin.</p>
                    </div>
                    {lcu && currentBgId !== null && (
                        <div className="bg-current-equipped">
                            <div className="bg-current-equipped-info">
                                <span className="bg-current-equipped-label">EQUIPPED BACKGROUND</span>
                                <span className="bg-current-equipped-value">{currentBgId === 0 ? 'DEFAULT' : `ID ${currentBgId}`}</span>
                            </div>
                        </div>
                    )}
                </div>

                {selectedChampion ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <button
                                className="ghost-btn"
                                onClick={() => { setSelectedChampion(null); setSkins([]); setSelectedSkin(null); }}
                            >
                                ← BACK
                            </button>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {selectedChampion.name} — select a skin
                            </span>
                        </div>

                        {loadingSkins && (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <Loader2 className="intel-spinner" size={24} style={{ color: 'var(--hextech-gold)' }} />
                            </div>
                        )}

                        {skins.length > 0 && (
                            <div ref={skinGridRef} className="bg-skin-grid">
                                {skins.map(skin => (
                                    <button
                                        key={skin.id}
                                        type="button"
                                        className={`bg-skin-item ${selectedSkin?.id === skin.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedSkin(skin)}
                                        title={`${skin.name} (ID: ${skin.id})`}
                                    >
                                        <img src={cdnUrl(skin.splashPath)} alt={skin.name} loading="lazy" onError={handleImgError} />
                                        <div className="bg-skin-overlay">
                                            <div className="bg-skin-name">{skin.name}</div>
                                            <div className="bg-skin-id">ID: {skin.id}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedSkin && (
                            <div className="bg-preview-strip fadeIn">
                                <img src={cdnUrl(selectedSkin.splashPath)} className="bg-preview-thumb" alt="" onError={handleImgError} />
                                <div className="bg-preview-text">
                                    <span className="bg-preview-name">{selectedSkin.name}</span>
                                    <span className="bg-preview-meta">ID: {selectedSkin.id}</span>
                                </div>
                            </div>
                        )}

                        <button
                            className="primary-btn"
                            id="apply-background-btn"
                            onClick={() => selectedSkin && applyBackground(selectedSkin.id, selectedSkin.name)}
                            disabled={!lcu || loading || !selectedSkin}
                            style={{ width: '100%', marginTop: '12px' }}
                        >
                            {getApplyButtonLabel()}
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ marginBottom: '12px', position: 'relative', width: '100%' }}>
                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                id="bg-search-input"
                                placeholder="Search by champion name..."
                                value={champSearch}
                                onChange={(e) => setChampSearch(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px 8px 35px', fontSize: '0.85rem' }}
                            />
                        </div>

                        {loadingChamps && (
                            <div style={{ textAlign: 'center', padding: '30px' }}>
                                <Loader2 className="intel-spinner" size={32} style={{ color: 'var(--hextech-gold)', marginBottom: '10px' }} />
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loading champions...</p>
                            </div>
                        )}

                        {champsLoaded && (
                            <div className="bg-champ-grid">
                                {filteredChampions.map(champ => (
                                    <button
                                        key={champ.id}
                                        type="button"
                                        className="bg-champ-item"
                                        onClick={() => selectChampion(champ)}
                                        title={champ.name}
                                    >
                                        <img src={cdnUrl(champ.squarePortraitPath)} alt={champ.name} loading="lazy" />
                                        <div className="bg-champ-name">{champ.name}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {!lcu && (
                <p style={{ color: '#ff3232', fontSize: '0.8rem', marginTop: '15px', textAlign: 'center' }}>
                    ⚠ Start League of Legends to enable this feature.
                </p>
            )}
        </div>
    );
};

export default BackgroundTab;
