import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { LcuInfo } from '../../hooks/useLcu';
import { SAVED_BIO_KEY, SAVED_AVAILABILITY_KEY } from '../../hooks/useAutoRestore';
import { SAVED_AUTO_ENFORCE_KEY, SAVED_TITLE_KEY, SAVED_ENFORCE_OFFLINE_KEY } from '../../storageKeys';

interface ProfileTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<unknown>;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ lcu, showToast, addLog, lcuRequest }) => {
    const [bio, setBio] = useState(() => localStorage.getItem(SAVED_BIO_KEY) ?? "");
    const [availability, setAvailability] = useState("chat");
    const [loading, setLoading] = useState(false);
    
    // Auto-Enforcer setting (migrate from old enforceOffline if needed)
    const [autoEnforce, setAutoEnforce] = useState(() => {
        return localStorage.getItem(SAVED_AUTO_ENFORCE_KEY) === 'true' || localStorage.getItem(SAVED_ENFORCE_OFFLINE_KEY) === 'true';
    });
    
    const [title, setTitle] = useState(() => localStorage.getItem(SAVED_TITLE_KEY) ?? "");

    const statusLabel = (value: string) => {
        switch (value) {
            case "chat":    return "ONLINE";
            case "away":    return "AWAY";
            case "mobile":  return "MOBILE";
            case "offline": return "OFFLINE";
            default:        return value.toUpperCase();
        }
    };

    const refreshProfileData = useCallback(async () => {
        if (!lcu) return;
        try {
            const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as Record<string, unknown>;
            if (chatRes?.availability) setAvailability(chatRes.availability as string);
            const lcuBio = (chatRes?.statusMessage as string) || "";
            if (lcuBio.trim()) {
                setBio(lcuBio);
                localStorage.setItem(SAVED_BIO_KEY, lcuBio);
            }

            const challengeRes = await lcuRequest("GET", "/lol-challenges/v1/challenges/local-player") as Record<string, unknown>;
            const lcuTitle = (challengeRes?.title as any)?.itemId?.toString() || "";
            if (lcuTitle && lcuTitle !== "-1") {
                setTitle(lcuTitle);
            }
        } catch (err) {
            addLog(`Profile sync failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }, [lcu, lcuRequest, addLog]);

    useEffect(() => {
        refreshProfileData();
    }, [refreshProfileData]);

    const handleUpdateBio = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            await invoke("update_bio", { port: lcu.port, token: lcu.token, newBio: bio });
            localStorage.setItem(SAVED_BIO_KEY, bio);
            addLog(`Bio updated: "${bio}"`);
            showToast("Bio Updated!", "success");
        } catch (err: unknown) {
            showToast("Failed to update bio", "error");
            addLog(`Bio update failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally { setLoading(false); }
    };

    const applyAvailability = async (next?: string) => {
        if (!lcu) return;
        const target = (next || availability).trim();
        if (!target) return;
        const previous = availability;
        if (next) setAvailability(next);
        setLoading(true);
        try {
            await lcuRequest("PUT", "/lol-chat/v1/me", { availability: target });
            localStorage.setItem(SAVED_AVAILABILITY_KEY, target);
            showToast(`Status set to ${statusLabel(target)}`, "success");
            addLog(`Status updated: ${statusLabel(target)}.`);
        } catch (err) {
            if (next) setAvailability(previous);
            showToast("Failed to update status", "error");
            addLog(`Status update failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleAutoEnforce = (checked: boolean) => {
        setAutoEnforce(checked);
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, checked.toString());
        addLog(`Auto-Enforcer ${checked ? 'enabled' : 'disabled'}.`);
    };

    const handleUpdateTitle = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            await lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", { title: title.trim() });
            localStorage.setItem(SAVED_TITLE_KEY, title.trim());
            addLog(`Title updated: "${title}"`);
            showToast("Title Updated!", "success");
        } catch (err: unknown) {
            showToast("Failed to update title", "error");
            addLog(`Title update failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally { setLoading(false); }
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <h3 className="card-title">Profile Bio &amp; Status</h3>
                <div className="input-group">
                    <label htmlFor="bio-input">New Status Message</label>
                    <textarea
                        id="bio-input"
                        style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                        placeholder="Tell your friends what you're up to..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        disabled={!lcu || loading}
                        rows={3}
                    />
                </div>
                <button className="primary-btn" onClick={handleUpdateBio} disabled={!lcu || loading || !bio.trim()} style={{ width: '100%', marginTop: '12px' }}>APPLY BIO</button>

                {lcu && (
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label htmlFor="availability-select" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Chat Availability</label>
                            <span className={`availability-pill ${availability}`}>
                                <span className="availability-dot"></span>
                                {statusLabel(availability)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <select id="availability-select" className="availability-select" value={availability} onChange={(e) => setAvailability(e.target.value)} style={{ flex: 2 }}>
                                {[
                                    { value: "chat",    label: "ONLINE" },
                                    { value: "away",    label: "AWAY" },
                                    { value: "mobile",  label: "MOBILE" },
                                    { value: "offline", label: "OFFLINE" }
                                ].map(state => (
                                    <option key={state.value} value={state.value}>{state.label}</option>
                                ))}
                            </select>
                            <button className="primary-btn availability-apply" onClick={() => applyAvailability()} disabled={!lcu || loading} style={{ flex: 1 }}>
                                APPLY
                            </button>
                        </div>
                        <div style={{ marginTop: '12px' }}>
                            <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                <input 
                                    type="checkbox" 
                                    checked={autoEnforce} 
                                    onChange={(e) => toggleAutoEnforce(e.target.checked)} 
                                    style={{ width: '18px', height: '18px', accentColor: 'var(--hextech-gold)' }}
                                />
                                <span style={{ color: autoEnforce ? 'var(--hextech-gold)' : 'var(--text-primary)', transition: 'color 0.2s' }}>
                                    Auto-Apply Profile & Overrides on League Client Startup
                                </span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
                <h3 className="card-title">Profile Title</h3>
                <div className="input-group">
                    <label htmlFor="title-input">Title ID</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            id="title-input"
                            type="text"
                            placeholder="e.g. 6030005"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={!lcu || loading}
                            style={{ flex: 2, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                        />
                        <button className="primary-btn" onClick={handleUpdateTitle} disabled={!lcu || loading || !title.trim()} style={{ flex: 1 }}>
                            APPLY TITLE
                        </button>
                    </div>
                </div>
            </div>

            {!lcu && <p style={{ color: '#ff3232', fontSize: '0.8rem', marginTop: '15px', textAlign: 'center' }}>⚠ Start League of Legends to enable this feature.</p>}
        </div>
    );
};

export default ProfileTab;
