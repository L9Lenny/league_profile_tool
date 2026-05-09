import React, { useState, useEffect } from 'react';
import { 
    ChevronRight, 
    Layout, 
    Disc3, 
    Image, 
    Trophy, 
    UserCircle, 
    Award, 
    ArrowLeft, 
    Settings, 
    Terminal, 
    Layers,
    Sparkles,
    Cpu,
    Users,
    UserMinus,
    ExternalLink
} from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface HomeTabProps {
    lcu: LcuInfo | null;
    clientVersion: string;
    setActiveTab: (tab: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<any>;
}

interface SummonerInfo {
    displayName: string;
    gameName: string;
    tagLine: string;
    summonerLevel: number;
    profileIconId: number;
}

interface FeatureOption {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
}

interface Category {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    options: FeatureOption[];
}

const HomeTab: React.FC<HomeTabProps> = ({ lcu, clientVersion, setActiveTab, lcuRequest }) => {
    const [view, setView] = useState<'categories' | 'category-detail'>('categories');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [summoner, setSummoner] = useState<SummonerInfo | null>(null);

    useEffect(() => {
        if (lcu) {
            const fetchSummoner = async () => {
                try {
                    const data = await lcuRequest("GET", "/lol-summoner/v1/current-summoner");
                    if (data) setSummoner(data);
                } catch (e) {
                    console.error("Failed to fetch summoner", e);
                }
            };
            fetchSummoner();
        }
    }, [lcu]);

    const categories: Category[] = [
        {
            id: 'customization',
            title: 'Profile Styling',
            desc: 'Overhaul your summoner identity and visuals.',
            icon: <Layers size={24} />,
            options: [
                { id: 'profile', title: 'Status & Bio', desc: 'Update presence message and bio.', icon: <Layout size={24} /> },
                { id: 'background', title: 'Background', desc: 'Set any champion skin as background.', icon: <Image size={24} /> },
                { id: 'collection', title: 'Collection', desc: 'View skins and account value.', icon: <Trophy size={24} /> },
                { id: 'icons', title: 'Icon Swapper', desc: 'Equip hidden summoner icons.', icon: <UserCircle size={24} /> },
                { id: 'tokens', title: 'Tokens', desc: 'Customize your profile badges.', icon: <Award size={24} /> },
            ]
        },
        {
            id: 'enhancements',
            title: 'Social & Management',
            desc: 'Optimize your lobby and friend interactions.',
            icon: <Users size={24} />,
            options: [
                { id: 'lobby', title: 'Lobby Manager', desc: 'Mass invite and lobby tools.', icon: <Users size={24} /> },
                { id: 'friends', title: 'Friend Cleaner', desc: 'Identify/Remove inactive friends.', icon: <UserMinus size={24} /> },
                { id: 'rank', title: 'Rank Overrides', desc: 'Modify visible Solo/Duo rankings.', icon: <Trophy size={24} /> },
                { id: 'music', title: 'Music Sync', desc: 'Auto-update bio with music.', icon: <Disc3 size={24} /> },
            ]
        },
        {
            id: 'system',
            title: 'System & Logs',
            desc: 'Monitor application status and tools.',
            icon: <Cpu size={24} />,
            options: [
                { id: 'logs', title: 'System Logs', desc: 'View technical bridge communication.', icon: <Terminal size={24} /> },
                { id: 'settings', title: 'Settings', desc: 'App config and preferences.', icon: <Settings size={24} /> },
            ]
        }
    ];

    const handleCategoryClick = (cat: Category) => {
        setSelectedCategory(cat);
        setView('category-detail');
    };

    return (
        <div className="tab-content fadeIn" style={{ padding: '0 20px 40px 20px' }}>
            
            {/* New UX Header: Profile Overview */}
            {view === 'categories' && (
                <div className="card profile-header-card" style={{ 
                    marginBottom: '25px', 
                    padding: '20px', 
                    background: 'linear-gradient(90deg, rgba(200, 155, 60, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%)',
                    border: '1px solid rgba(200, 155, 60, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    borderRadius: '12px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ 
                            width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', 
                            border: '3px solid var(--hextech-gold)', boxShadow: '0 0 20px rgba(200, 155, 60, 0.4)'
                        }}>
                            {summoner ? (
                                <img src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${summoner.profileIconId}.jpg`} alt="" style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: '#222' }} />
                            )}
                        </div>
                        <div style={{ 
                            position: 'absolute', bottom: '-5px', right: '-5px', 
                            background: 'var(--hextech-gold)', color: 'black', 
                            fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px'
                        }}>
                            LVL {summoner?.summonerLevel || '??'}
                        </div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, color: 'white', fontSize: '1.5rem', fontWeight: 700 }}>
                            {summoner ? (summoner.gameName ? `${summoner.gameName}#${summoner.tagLine}` : summoner.displayName) : 'Connect Client'}
                        </h2>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                            <div className={`connection-status-pill ${lcu ? 'connected' : 'disconnected'}`} style={{ margin: 0, fontSize: '0.6rem' }}>
                                <div className="status-dot"></div>
                                {lcu ? 'ACTIVE CONNECTION' : 'WAITING FOR LCU'}
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <ExternalLink size={12} /> v{clientVersion}
                            </span>
                        </div>
                    </div>

                    {/* Decorative Background Element */}
                    <Sparkles size={120} style={{ position: 'absolute', right: '-20px', bottom: '-40px', opacity: 0.05, transform: 'rotate(-20deg)' }} />
                </div>
            )}

            <div className="home-hero" style={{ textAlign: 'left', marginBottom: '30px' }}>
                {view === 'category-detail' && (
                    <button className="ghost-btn home-back-btn" onClick={() => setView('categories')} style={{ marginBottom: '15px', color: 'var(--hextech-gold)' }}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                )}
                <h1 className="hero-title" style={{ fontSize: '2.2rem', marginBottom: '10px' }}>
                    {view === 'categories' ? 'Command Center' : selectedCategory?.title}
                </h1>
                <p className="hero-subtitle" style={{ maxWidth: '600px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {view === 'categories' 
                        ? 'Select a module to modify your profile properties or automate lobby tasks.' 
                        : selectedCategory?.desc}
                </p>
            </div>

            <div className="quick-start-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                gap: '15px' 
            }}>
                {view === 'categories' ? (
                    categories.map(cat => (
                        <button key={cat.id} type="button" className="feature-card" onClick={() => handleCategoryClick(cat)} style={{ padding: '20px' }}>
                            <div className="feature-icon" style={{ background: 'rgba(200, 155, 60, 0.08)', borderRadius: '12px', padding: '15px' }}>{cat.icon}</div>
                            <div className="feature-body" style={{ marginLeft: '15px' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{cat.title}</h3>
                                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>{cat.desc}</p>
                            </div>
                            <ChevronRight size={18} className="feature-arrow" style={{ opacity: 0.3 }} />
                        </button>
                    ))
                ) : (
                    selectedCategory?.options.map(opt => (
                        <button key={opt.id} type="button" className="feature-card" onClick={() => setActiveTab(opt.id)} style={{ padding: '20px' }}>
                            <div className="feature-icon" style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '15px' }}>{opt.icon}</div>
                            <div className="feature-body" style={{ marginLeft: '15px' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{opt.title}</h3>
                                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>{opt.desc}</p>
                            </div>
                            <ChevronRight size={18} className="feature-arrow" style={{ opacity: 0.3 }} />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

export default HomeTab;
