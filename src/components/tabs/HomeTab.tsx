import React, { useState } from 'react';
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
    Cpu
} from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface HomeTabProps {
    lcu: LcuInfo | null;
    clientVersion: string;
    setActiveTab: (tab: string) => void;
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

const HomeTab: React.FC<HomeTabProps> = ({ lcu, clientVersion, setActiveTab }) => {
    const [view, setView] = useState<'categories' | 'category-detail'>('categories');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    const categories: Category[] = [
        {
            id: 'customization',
            title: 'Customization',
            desc: 'Modify your profile visual elements.',
            icon: <Layers size={24} />,
            options: [
                { id: 'profile', title: 'Profile Bio', desc: 'Update status message and biography.', icon: <Layout size={24} /> },
                { id: 'background', title: 'Background', desc: 'Set any champion skin as your background.', icon: <Image size={24} /> },
                { id: 'icons', title: 'Icon Swapper', desc: 'Equip hidden summoner icons instantly.', icon: <UserCircle size={24} /> },
                { id: 'tokens', title: 'Profile Tokens', desc: 'Customize your profile badges.', icon: <Award size={24} /> },
            ]
        },
        {
            id: 'enhancements',
            title: 'Enhancements',
            desc: 'Advanced background automation and overrides.',
            icon: <Sparkles size={24} />,
            options: [
                { id: 'music', title: 'Music Sync', desc: 'Auto-update bio with your current track.', icon: <Disc3 size={24} /> },
                { id: 'rank', title: 'Rank Overrides', desc: 'Modify visible Solo/Duo rankings.', icon: <Trophy size={24} /> },
            ]
        },
        {
            id: 'system',
            title: 'System',
            desc: 'Manage application behavior and logs.',
            icon: <Cpu size={24} />,
            options: [
                { id: 'logs', title: 'System Logs', desc: 'View technical bridge communication.', icon: <Terminal size={24} /> },
                { id: 'settings', title: 'Settings', desc: 'Update app and toggle autostart.', icon: <Settings size={24} /> },
            ]
        }
    ];

    const handleCategoryClick = (cat: Category) => {
        setSelectedCategory(cat);
        setView('category-detail');
    };

    return (
        <div className="tab-content fadeIn">
            <div className="home-hero">
                {view === 'category-detail' && (
                    <button className="ghost-btn home-back-btn" onClick={() => setView('categories')}>
                        <ArrowLeft size={14} /> Back to Categories
                    </button>
                )}
                <h1 className="hero-title">
                    {view === 'categories' ? 'League Profile Tool' : selectedCategory?.title}
                </h1>
                <p className="hero-subtitle">
                    {view === 'categories' 
                        ? 'Elevate your presence in the League of Legends ecosystem with precision overrides.' 
                        : selectedCategory?.desc}
                </p>
                <div className={`connection-status-pill ${lcu ? 'connected' : 'disconnected'}`}>
                    <div className="status-dot"></div>
                    {lcu ? 'CLIENT CONNECTED' : 'WAITING FOR CLIENT'}
                </div>
            </div>

            <div className="quick-start-grid">
                {view === 'categories' ? (
                    categories.map(cat => (
                        <button key={cat.id} type="button" className="feature-card" onClick={() => handleCategoryClick(cat)}>
                            <div className="feature-icon">{cat.icon}</div>
                            <div className="feature-body">
                                <h3>{cat.title}</h3>
                                <p>{cat.desc}</p>
                            </div>
                            <ChevronRight size={18} className="feature-arrow" />
                        </button>
                    ))
                ) : (
                    selectedCategory?.options.map(opt => (
                        <button key={opt.id} type="button" className="feature-card" onClick={() => setActiveTab(opt.id)}>
                            <div className="feature-icon">{opt.icon}</div>
                            <div className="feature-body">
                                <h3>{opt.title}</h3>
                                <p>{opt.desc}</p>
                            </div>
                            <ChevronRight size={18} className="feature-arrow" />
                        </button>
                    ))
                )}
            </div>

            <div className="home-footer">
                <span className="version-label">Application Build</span>
                <span className="version-value">v{clientVersion}</span>
            </div>
        </div>
    );
};

export default HomeTab;
