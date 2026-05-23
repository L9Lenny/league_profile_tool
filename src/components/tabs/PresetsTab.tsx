import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
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

/** Legacy key used before disk persistence — kept for migration */
const PRESETS_LS_KEY = "profile_presets_list_v1";

const PresetsTab: React.FC<PresetsTabProps> = ({ lcu: _lcu, showToast, addLog }) => {
    const [presets, setPresets] = useState<ProfilePreset[]>([]);
    const [newPresetName, setNewPresetName] = useState("");
    const [saving, setSaving] = useState(false);

    /** Write presets to disk via Tauri; falls back to localStorage on error */
    const persistPresets = useCallback(async (updated: ProfilePreset[]) => {
        const json = JSON.stringify(updated);
        try {
            await invoke("save_presets", { data: json });
        } catch (err) {
            addLog(`Disk save failed, using localStorage fallback: ${err}`);
            localStorage.setItem(PRESETS_LS_KEY, json);
        }
        setPresets(updated);
    }, [addLog]);

    useEffect(() => {
        const load = async () => {
            // 1. Try to load from disk (Tauri AppData)
            try {
                const raw = await invoke<string>("load_presets");
                const parsed: ProfilePreset[] = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setPresets(parsed);
                    return;
                }
            } catch (err) {
                addLog(`Disk load failed, checking localStorage: ${err}`);
            }

            // 2. Migrate from localStorage for existing users
            const lsData = localStorage.getItem(PRESETS_LS_KEY);
            if (lsData) {
                try {
                    const parsed: ProfilePreset[] = JSON.parse(lsData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setPresets(parsed);
                        // Migrate to disk silently
                        await invoke("save_presets", { data: lsData }).catch(() => {});
                        localStorage.removeItem(PRESETS_LS_KEY);
                        addLog(`Migrated ${parsed.length} preset(s) from localStorage to disk.`);
                    }
                } catch { /* ignore parse errors */ }
            }
        };
        load();
    }, [addLog]);

    const handleSaveCurrentAsPreset = async () => {
        if (!newPresetName.trim()) {
            showToast("Please enter a name for the preset", "error");
            return;
        }
        setSaving(true);
        const newPreset: ProfilePreset = {
            id: Date.now().toString(),
            name: newPresetName.trim(),
            bio:          localStorage.getItem(SAVED_BIO_KEY),
            availability: localStorage.getItem(SAVED_AVAILABILITY_KEY),
            iconId:       localStorage.getItem(SAVED_ICON_KEY),
            backgroundId: localStorage.getItem(SAVED_BACKGROUND_KEY),
            tokens:       localStorage.getItem(SAVED_TOKENS_KEY)
        };
        const updated = [...presets, newPreset];
        await persistPresets(updated);
        setNewPresetName("");
        showToast(`Preset "${newPreset.name}" saved!`, "success");
        addLog(`Saved preset: ${newPreset.name}`);
        setSaving(false);
    };

    const handleLoadPreset = (preset: ProfilePreset) => {
        if (preset.bio !== null)          localStorage.setItem(SAVED_BIO_KEY, preset.bio);
        else                              localStorage.removeItem(SAVED_BIO_KEY);

        if (preset.availability !== null) localStorage.setItem(SAVED_AVAILABILITY_KEY, preset.availability);
        else                              localStorage.removeItem(SAVED_AVAILABILITY_KEY);

        if (preset.iconId !== null)       localStorage.setItem(SAVED_ICON_KEY, preset.iconId);
        else                              localStorage.removeItem(SAVED_ICON_KEY);

        if (preset.backgroundId !== null) localStorage.setItem(SAVED_BACKGROUND_KEY, preset.backgroundId);
        else                              localStorage.removeItem(SAVED_BACKGROUND_KEY);

        if (preset.tokens !== null)       localStorage.setItem(SAVED_TOKENS_KEY, preset.tokens);
        else                              localStorage.removeItem(SAVED_TOKENS_KEY);

        showToast(`Preset "${preset.name}" loaded! Navigate to each tab to apply.`, "success");
        addLog(`Loaded preset: ${preset.name}.`);
    };

    const handleDeletePreset = async (id: string) => {
        const updated = presets.filter(p => p.id !== id);
        await persistPresets(updated);
        showToast("Preset deleted.", "success");
    };

    return (
        <div className="tab-content fadeIn">
            {/* Save current setup */}
            <div className="card" style={{ marginBottom: '12px' }}>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FolderOpen size={20} style={{ color: 'var(--hextech-gold)' }} />
                    Profile Presets
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    Save your current profile setup (Bio, Icon, Background, Tokens, Status).
                    Presets are stored on disk and persist across reinstalls and future updates.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="e.g. 'Edgy Setup' or 'Ranked Mode'"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrentAsPreset()}
                        style={{ flex: 1 }}
                    />
                    <button
                        className="primary-btn"
                        onClick={handleSaveCurrentAsPreset}
                        disabled={saving || !newPresetName.trim()}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px 20px' }}
                    >
                        <Save size={16} />
                        {saving ? 'SAVING...' : 'SAVE PRESET'}
                    </button>
                </div>
            </div>

            {/* Preset list */}
            <div className="card">
                <h3 className="card-title">Your Presets</h3>

                {presets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        <FolderOpen size={48} style={{ margin: '0 auto 15px auto', opacity: 0.5 }} />
                        <p style={{ margin: '0 0 8px 0' }}>No presets saved yet.</p>
                        <p style={{ fontSize: '0.8rem', margin: 0 }}>Customize your profile in the other tabs, then save it here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {presets.map(preset => {
                            const iconUrl = preset.iconId
                                ? `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${preset.iconId}.jpg`
                                : null;

                            let bgUrl: string | null = null;
                            if (preset.backgroundId) {
                                const bgIdNum = parseInt(preset.backgroundId, 10);
                                if (!isNaN(bgIdNum)) {
                                    const champId = Math.floor(bgIdNum / 1000);
                                    bgUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/${champId}/${bgIdNum}.jpg`;
                                }
                            }

                            return (
                                <div
                                    key={preset.id}
                                    style={{
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
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {bgUrl && (
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundImage: `url(${bgUrl})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center 20%',
                                            opacity: 0.5, zIndex: 0
                                        }} />
                                    )}
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'linear-gradient(to bottom, rgba(10,10,12,0.1) 0%, rgba(10,10,12,0.95) 100%)',
                                        zIndex: 1
                                    }} />

                                    <div style={{ position: 'relative', zIndex: 2, padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '15px' }}>
                                            <div style={{
                                                width: '60px', height: '60px', borderRadius: '50%',
                                                border: '2px solid var(--hextech-gold)',
                                                background: '#0a0a0c', overflow: 'hidden', flexShrink: 0
                                            }}>
                                                {iconUrl ? (
                                                    <img src={iconUrl} alt="Icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>?</div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#fff', letterSpacing: '0.5px' }}>{preset.name}</h4>
                                                {preset.availability && (
                                                    <span style={{
                                                        fontSize: '0.7rem', textTransform: 'uppercase', padding: '2px 6px',
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

                                        {preset.bio && (
                                            <p style={{ margin: '0 0 15px 0', fontSize: '0.82rem', color: '#ddd', fontStyle: 'italic', textShadow: '0 1px 3px rgba(0,0,0,0.8)', flex: 1 }}>
                                                "{preset.bio}"
                                            </p>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid rgba(200, 170, 110, 0.2)', paddingTop: '12px' }}>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {preset.tokens && (
                                                    <div style={{ display: 'flex', gap: '4px' }} title="Has equipped tokens">
                                                        {[0,1,2].map(i => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--hextech-gold)' }} />)}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="primary-btn"
                                                    onClick={() => handleLoadPreset(preset)}
                                                    style={{ padding: '6px 14px', fontSize: '0.75rem', display: 'flex', gap: '5px', alignItems: 'center' }}
                                                    disabled={!lcu}
                                                    title={!lcu ? 'Connect League client first' : 'Load preset'}
                                                >
                                                    <CheckCircle2 size={13} /> LOAD
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePreset(preset.id)}
                                                    style={{ padding: '6px', background: 'rgba(220, 53, 69, 0.2)', color: '#ff6b6b', border: '1px solid rgba(220, 53, 69, 0.4)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    title="Delete preset"
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
