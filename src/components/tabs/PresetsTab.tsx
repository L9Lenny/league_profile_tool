import React, { useState, useEffect } from 'react';
import { LcuInfo } from '../../hooks/useLcu';
import { Save, FolderOpen, Trash2, CheckCircle2 } from 'lucide-react';
import {
    SAVED_AVAILABILITY_KEY,
    SAVED_BIO_KEY,
    SAVED_ICON_KEY,
    SAVED_BACKGROUND_KEY,
    SAVED_TOKENS_KEY
} from '../../hooks/useAutoRestore';

interface PresetsTabProps {
    lcu: LcuInfo | null;
    showToast: (msg: string, type: 'success' | 'error') => void;
    addLog: (msg: string) => void;
}

interface ProfilePreset {
    id: string;
    name: string;
    bio: string | null;
    availability: string | null;
    iconId: string | null;
    backgroundId: string | null;
    tokens: string | null;
}

const PRESETS_STORAGE_KEY = "profile_presets_list_v1";

const PresetsTab: React.FC<PresetsTabProps> = ({ lcu: _lcu, showToast, addLog }) => {
    const [presets, setPresets] = useState<ProfilePreset[]>([]);
    const [newPresetName, setNewPresetName] = useState("");

    useEffect(() => {
        const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
        if (saved) {
            try {
                setPresets(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse presets", e);
            }
        }
    }, []);

    const savePresetsToStorage = (newPresets: ProfilePreset[]) => {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
        setPresets(newPresets);
    };

    const handleSaveCurrentAsPreset = () => {
        if (!newPresetName.trim()) {
            showToast("Please enter a name for the preset", "error");
            return;
        }

        const newPreset: ProfilePreset = {
            id: Date.now().toString(),
            name: newPresetName.trim(),
            bio: localStorage.getItem(SAVED_BIO_KEY),
            availability: localStorage.getItem(SAVED_AVAILABILITY_KEY),
            iconId: localStorage.getItem(SAVED_ICON_KEY),
            backgroundId: localStorage.getItem(SAVED_BACKGROUND_KEY),
            tokens: localStorage.getItem(SAVED_TOKENS_KEY)
        };

        const updatedPresets = [...presets, newPreset];
        savePresetsToStorage(updatedPresets);
        setNewPresetName("");
        showToast(`Preset "${newPreset.name}" saved!`, "success");
        addLog(`Saved current config as preset: ${newPreset.name}`);
    };

    const handleLoadPreset = (preset: ProfilePreset) => {
        // Apply to localStorage
        if (preset.bio !== null) localStorage.setItem(SAVED_BIO_KEY, preset.bio);
        else localStorage.removeItem(SAVED_BIO_KEY);

        if (preset.availability !== null) localStorage.setItem(SAVED_AVAILABILITY_KEY, preset.availability);
        else localStorage.removeItem(SAVED_AVAILABILITY_KEY);

        if (preset.iconId !== null) localStorage.setItem(SAVED_ICON_KEY, preset.iconId);
        else localStorage.removeItem(SAVED_ICON_KEY);

        if (preset.backgroundId !== null) localStorage.setItem(SAVED_BACKGROUND_KEY, preset.backgroundId);
        else localStorage.removeItem(SAVED_BACKGROUND_KEY);

        if (preset.tokens !== null) localStorage.setItem(SAVED_TOKENS_KEY, preset.tokens);
        else localStorage.removeItem(SAVED_TOKENS_KEY);

        showToast(`Preset "${preset.name}" loaded! It will apply automatically.`, "success");
        addLog(`Loaded preset: ${preset.name}. Auto-restore will apply it shortly.`);
        
        // We could manually trigger an update here, but the active polling in useAutoRestore 
        // will pick these changes up within 10 seconds anyway!
    };

    const handleDeletePreset = (id: string) => {
        const updatedPresets = presets.filter(p => p.id !== id);
        savePresetsToStorage(updatedPresets);
        showToast("Preset deleted.", "success");
    };

    return (
        <div className="tab-content fade-in">
            <div className="tab-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FolderOpen size={24} style={{ color: 'var(--hextech-gold)' }} />
                    Profile Presets
                </h2>
                <p style={{ opacity: 0.7, fontSize: '0.9rem', maxWidth: '600px' }}>
                    Save your current customized profile (Bio, Icon, Background, Tokens, Status) as a preset. 
                    You can load it later to instantly swap between different visual themes.
                </p>
            </div>

            <div className="panel" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--hextech-gold)' }}>Save Current Setup</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="e.g. 'Edgy Setup' or 'Tryhard Mode'"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="text-input"
                        style={{ flex: 1 }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrentAsPreset()}
                    />
                    <button className="btn btn-primary" onClick={handleSaveCurrentAsPreset} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Save size={18} />
                        Save Preset
                    </button>
                </div>
            </div>

            <div className="panel">
                <h3 style={{ marginBottom: '15px', color: 'var(--hextech-gold)' }}>Your Presets</h3>
                
                {presets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        <FolderOpen size={48} style={{ margin: '0 auto 15px auto', opacity: 0.5 }} />
                        <p>No presets saved yet.</p>
                        <p style={{ fontSize: '0.8rem' }}>Customize your profile in the other tabs, then save it here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {presets.map(preset => {
                            const iconUrl = preset.iconId ? `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${preset.iconId}.jpg` : null;
                            
                            let bgUrl = null;
                            if (preset.backgroundId) {
                                const bgIdNum = parseInt(preset.backgroundId, 10);
                                if (!isNaN(bgIdNum)) {
                                    const champId = Math.floor(bgIdNum / 1000);
                                    bgUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/${champId}/${bgIdNum}.jpg`;
                                }
                            }

                            return (
                                <div key={preset.id} style={{
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    background: '#1a1a1c',
                                    border: '1px solid rgba(200, 170, 110, 0.4)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    minHeight: '200px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                    transition: 'transform 0.2s',
                                    cursor: 'default'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {/* Background Splash */}
                                    {bgUrl && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundImage: `url(${bgUrl})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center 20%',
                                            opacity: 0.5,
                                            zIndex: 0
                                        }} />
                                    )}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'linear-gradient(to bottom, rgba(10,10,12,0.1) 0%, rgba(10,10,12,0.95) 100%)',
                                        zIndex: 1
                                    }} />

                                    {/* Content */}
                                    <div style={{ position: 'relative', zIndex: 2, padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '15px' }}>
                                            <div style={{
                                                width: '60px', height: '60px',
                                                borderRadius: '50%',
                                                border: '2px solid var(--hextech-gold)',
                                                background: '#0a0a0c',
                                                overflow: 'hidden',
                                                flexShrink: 0
                                            }}>
                                                {iconUrl ? (
                                                    <img src={iconUrl} alt="Icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>?</div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#fff', letterSpacing: '1px' }}>{preset.name}</h4>
                                                {preset.availability && (
                                                    <span style={{ 
                                                        fontSize: '0.75rem', 
                                                        textTransform: 'uppercase', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '3px',
                                                        background: preset.availability === 'chat' ? 'rgba(40, 167, 69, 0.2)' : 
                                                                    preset.availability === 'away' ? 'rgba(220, 53, 69, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                        color: preset.availability === 'chat' ? '#28a745' : 
                                                               preset.availability === 'away' ? '#dc3545' : '#aaa',
                                                        border: '1px solid currentColor'
                                                    }}>
                                                        {preset.availability}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            {preset.bio && (
                                                <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#ddd', fontStyle: 'italic', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                                                    "{preset.bio}"
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid rgba(200, 170, 110, 0.2)', paddingTop: '15px' }}>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {preset.tokens && (
                                                    <div style={{ display: 'flex', gap: '5px' }} title="Equipped Tokens">
                                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--hextech-gold)' }} />
                                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--hextech-gold)' }} />
                                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--hextech-gold)' }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={() => handleLoadPreset(preset)}
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', gap: '5px', alignItems: 'center' }}
                                                >
                                                    <CheckCircle2 size={14} /> LOAD
                                                </button>
                                                <button 
                                                    className="btn" 
                                                    onClick={() => handleDeletePreset(preset.id)}
                                                    style={{ padding: '6px', background: 'rgba(220, 53, 69, 0.2)', color: '#ff6b6b', border: '1px solid rgba(220, 53, 69, 0.4)' }}
                                                    title="Delete Preset"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PresetsTab;
