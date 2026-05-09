import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trophy, Gem, Sparkles, Star, DollarSign, Info, RotateCw, Filter } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface CollectionTabProps {
    lcu: LcuInfo | null;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<any>;
}

interface SkinMetadata {
    id: number;
    name: string;
    tilePath: string;
    rarity: string;
}

interface OwnedSkin {
    itemId: number;
}

interface SkinItem {
    id: number;
    name: string;
    rarity: string;
    imgUrl: string;
    price: number;
}

const RARITY_MAP: Record<string, { label: string, color: string, price: number }> = {
    'kEpic': { label: 'EPIC', color: '#00ccff', price: 1350 },
    'kLegendary': { label: 'LEGENDARY', color: '#ff00ff', price: 1820 },
    'kUltimate': { label: 'ULTIMATE', color: '#ffcc00', price: 3250 },
    'kMythic': { label: 'MYTHIC', color: '#ff0055', price: 2500 }, // Estimated
    'kNone': { label: 'NORMAL', color: '#888', price: 975 }
};

const CollectionTab: React.FC<CollectionTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [skins, setSkins] = useState<SkinItem[]>([]);
    const [search, setSearch] = useState("");
    const [filterRarity, setFilterRarity] = useState<string>("all");
    const [fetching, setFetching] = useState(false);
    const [stats, setStats] = useState({ total: 0, rpValue: 0, epic: 0, legendary: 0, ultimate: 0, mythic: 0 });

    const fetchCollection = async () => {
        if (!lcu) return;
        setFetching(true);
        try {
            addLog("Syncing skins from LCU...");
            
            // 1. Get owned items (skins) - Using a simpler call to avoid parameter escaping issues
            const inventory: any = await lcuRequest("GET", "/lol-inventory/v1/inventory");
            if (!inventory || !Array.isArray(inventory)) {
                addLog("Invalid inventory response.");
                setFetching(false);
                return;
            }
            
            const ownedIds = new Set(
                inventory
                    .filter((item: any) => item.inventoryType === "CHAMPION_SKIN")
                    .map((item: any) => item.itemId)
            );

            // 2. Get skin metadata from CommunityDragon (more reliable names/rarities)
            const cdRes = await fetch("https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json");
            const metadata: Record<string, SkinMetadata> = await cdRes.json();

            // 3. Match and calculate
            const ownedList: SkinItem[] = [];
            let totalRp = 0;
            let epicCount = 0;
            let legendaryCount = 0;
            let ultimateCount = 0;
            let mythicCount = 0;

            Object.values(metadata).forEach(skin => {
                if (ownedIds.has(skin.id)) {
                    const rarityInfo = RARITY_MAP[skin.rarity] || RARITY_MAP['kNone'];
                    
                    ownedList.push({
                        id: skin.id,
                        name: skin.name,
                        rarity: skin.rarity,
                        imgUrl: `https://raw.communitydragon.org/latest/game/${skin.tilePath.toLowerCase().replace('/lol-game-data/assets/', '')}`,
                        price: rarityInfo.price
                    });

                    totalRp += rarityInfo.price;
                    if (skin.rarity === 'kEpic') epicCount++;
                    if (skin.rarity === 'kLegendary') legendaryCount++;
                    if (skin.rarity === 'kUltimate') ultimateCount++;
                    if (skin.rarity === 'kMythic') mythicCount++;
                }
            });

            setSkins(ownedList.sort((a, b) => b.price - a.price)); // Sort by price/rarity
            setStats({
                total: ownedList.length,
                rpValue: totalRp,
                epic: epicCount,
                legendary: legendaryCount,
                ultimate: ultimateCount,
                mythic: mythicCount
            });
            addLog(`Found ${ownedList.length} skins in your collection.`);
        } catch (err) {
            addLog(`Collection sync error: ${err}`);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (lcu) fetchCollection();
    }, [lcu]);

    const filteredSkins = useMemo(() => {
        return skins.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
            const matchesRarity = filterRarity === "all" || s.rarity === filterRarity;
            return matchesSearch && matchesRarity;
        });
    }, [skins, search, filterRarity]);

    return (
        <div className="tab-content fadeIn" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
            
            {/* Main Skin Grid */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Trophy size={24} color="var(--hextech-gold)" />
                        <h3 className="card-title" style={{ margin: 0 }}>Skin Collection</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="token-picker-search" style={{ width: '250px' }}>
                            <Search size={16} />
                            <input 
                                type="text" 
                                placeholder="Filter skins..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button 
                            className={`refresh-icon-btn ${fetching ? 'loading' : ''}`}
                            onClick={fetchCollection}
                            disabled={!lcu || fetching}
                        >
                            <RotateCw size={18} />
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', overflowX: 'auto', padding: '0 5px 10px 5px' }}>
                    {['all', 'kEpic', 'kLegendary', 'kMythic', 'kUltimate'].map(r => (
                        <button
                            key={r}
                            onClick={() => setFilterRarity(r)}
                            style={{ 
                                padding: '6px 14px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 'bold',
                                border: '1px solid', 
                                borderColor: filterRarity === r ? (RARITY_MAP[r]?.color || 'var(--hextech-gold)') : 'rgba(255,255,255,0.1)',
                                background: filterRarity === r ? (RARITY_MAP[r]?.color + '22' || 'rgba(200,155,60,0.1)') : 'rgba(0,0,0,0.2)',
                                color: filterRarity === r ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                            }}
                        >
                            {r === 'all' ? 'ALL SKINS' : RARITY_MAP[r].label}
                        </button>
                    ))}
                </div>

                <div style={{ 
                    flex: 1, 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                    gap: '12px',
                    overflowY: 'auto',
                    maxHeight: '550px',
                    paddingRight: '5px'
                }}>
                    {filteredSkins.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>
                            <Filter size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
                            <p>{lcu ? "No skins found matching your search." : "Connect to League to view your collection."}</p>
                        </div>
                    ) : (
                        filteredSkins.map(skin => {
                            const info = RARITY_MAP[skin.rarity] || RARITY_MAP['kNone'];
                            return (
                                <div 
                                    key={skin.id}
                                    className="feature-card"
                                    style={{ 
                                        padding: '5px', 
                                        flexDirection: 'column', 
                                        background: 'rgba(0,0,0,0.3)',
                                        border: `1px solid ${skin.rarity !== 'kNone' ? info.color + '44' : 'var(--glass-border)'}`,
                                        cursor: 'default'
                                    }}
                                >
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '6px' }}>
                                        <img src={skin.imgUrl} alt={skin.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        {skin.rarity !== 'kNone' && (
                                            <div style={{ 
                                                position: 'absolute', top: '5px', right: '5px', 
                                                background: info.color, color: 'white', 
                                                fontSize: '0.55rem', fontWeight: 'bold', 
                                                padding: '2px 6px', borderRadius: '4px',
                                                boxShadow: `0 0 10px ${info.color}`
                                            }}>
                                                {info.label}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '8px 4px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skin.name}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Sidebar Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, rgba(200, 155, 60, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%)', border: '1px solid var(--hextech-gold)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <DollarSign size={20} color="var(--hextech-gold)" />
                        <h3 className="card-title" style={{ margin: 0 }}>Account Value</h3>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--hextech-gold)', textShadow: '0 0 20px rgba(200, 155, 60, 0.4)' }}>{stats.rpValue.toLocaleString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total RP Investment</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Owned Skins</span>
                            <span style={{ color: 'white', fontWeight: 'bold' }}>{stats.total}</span>
                        </div>
                        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                        <StatRow label="Ultimate" count={stats.ultimate} color={RARITY_MAP['kUltimate'].color} icon={<Star size={14} />} />
                        <StatRow label="Mythic" count={stats.mythic} color={RARITY_MAP['kMythic'].color} icon={<Sparkles size={14} />} />
                        <StatRow label="Legendary" count={stats.legendary} color={RARITY_MAP['kLegendary'].color} icon={<Gem size={14} />} />
                        <StatRow label="Epic" count={stats.epic} color={RARITY_MAP['kEpic'].color} icon={<Info size={14} />} />
                    </div>
                </div>

                <div className="card" style={{ padding: '15px' }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
                        *RP values are based on base store prices and are estimated.
                    </p>
                </div>
            </div>

        </div>
    );
};

const StatRow = ({ label, count, color, icon }: { label: string, count: number, color: string, icon: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: color }}>
            {icon}
            <span>{label}</span>
        </div>
        <span style={{ color: 'white', fontWeight: 'bold' }}>{count}</span>
    </div>
);

export default CollectionTab;
