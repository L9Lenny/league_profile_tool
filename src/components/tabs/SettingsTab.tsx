import React, { useState } from 'react';
import { RefreshCw, Cpu, Trash2, X, Check, Download, Upload } from 'lucide-react';
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { save, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { SAVED_AUTO_ENFORCE_KEY, SAVED_ENFORCE_OFFLINE_KEY, SAVED_ICON_KEY, ALL_SAVED_KEYS } from '../../storageKeys';
import { patchChatLol } from '../../utils/chatMe';

interface SettingsTabProps {
    isAutostartEnabled: boolean;
    setIsAutostartEnabled: (enabled: boolean) => void;
    minimizeToTray: boolean;
    toggleMinimizeToTray: () => void;
    latestVersion: string;
    clientVersion: string;
    addLog: (msg: string) => void;
    showToast?: (text: string, type: string) => void;
    lcuRequest?: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<unknown>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
    isAutostartEnabled, setIsAutostartEnabled,
    minimizeToTray, toggleMinimizeToTray,
    latestVersion, clientVersion, addLog,
    showToast, lcuRequest
}) => {
    const [autoEnforce, setAutoEnforce] = useState(() => localStorage.getItem(SAVED_AUTO_ENFORCE_KEY) === 'true');

    const toggleAutoEnforce = (checked: boolean) => {
        setAutoEnforce(checked);
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, checked.toString());
        if (checked) {
            addLog(`Auto-Enforcer enabled.`);
        } else {
            localStorage.removeItem(SAVED_ENFORCE_OFFLINE_KEY);
            addLog(`Auto-Enforcer disabled.`);
        }
    };

    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetChecks, setResetChecks] = useState<Record<string, boolean>>({
        rank: true,
        challenge: true,
        background: true,
        tokens: true,
        icon: true,
        status: true,
        enforcer: true,
    });

    const resetLabels: Record<string, string> = {
        rank: "Rank overrides",
        challenge: "Challenge overrides",
        background: "Background skin",
        tokens: "Tokens, Title, Banner & Crest",
        icon: "Profile icon",
        status: "Status & Bio",
        enforcer: "Auto-Enforcer & localStorage",
    };

    const resetChatPresence = async (): Promise<void> => {
        if (!lcuRequest) return;
        const promises: Promise<unknown>[] = [];

        const hasLolFields = resetChecks.rank || resetChecks.challenge || resetChecks.background;
        if (hasLolFields) {
            promises.push(patchChatLol(lcuRequest, (current) => {
                const updated: Record<string, unknown> = { ...current };
                if (resetChecks.rank) {
                    updated.rankedLeagueTier = "";
                    updated.rankedLeagueDivision = "";
                    updated.rankedLeagueQueue = "";
                }
                if (resetChecks.challenge) {
                    updated.challengeCrystalLevel = "";
                    updated.challengePoints = "";
                }
                if (resetChecks.background) {
                    updated.backgroundSkinId = "";
                }
                return updated;
            }));
        }

        if (resetChecks.status) {
            promises.push(lcuRequest("PUT", "/lol-chat/v1/me", {
                availability: "chat",
                statusMessage: ""
            }));
        }

        await Promise.allSettled(promises);
    };

    const clearAllSettings = async () => {
        const savedIconVal = resetChecks.icon ? localStorage.getItem(SAVED_ICON_KEY) : null;

        if (resetChecks.enforcer) {
            ALL_SAVED_KEYS.forEach(key => localStorage.removeItem(key));
            setAutoEnforce(false);
        }

        if (!lcuRequest) {
            addLog("Saved settings cleared.");
            showToast?.("Saved settings cleared!", "success");
            setShowResetConfirm(false);
            return;
        }

        const promises: Promise<unknown>[] = [];

        const hasChatFields = resetChecks.rank || resetChecks.challenge || resetChecks.background || resetChecks.status;
        if (hasChatFields) promises.push(resetChatPresence());

        if (resetChecks.background) {
            promises.push(lcuRequest("POST", "/lol-summoner/v1/current-summoner/summoner-profile", {
                key: "backgroundSkinId",
                value: 0,
            }));
        }

        if (resetChecks.tokens) {
            promises.push(lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", {
                challengeIds: [],
                title: "",
                bannerAccent: "",
                crestBorder: "",
                prestigeCrestBorderLevel: 0,
            }));
        }

        if (resetChecks.icon) {
            const iconId = savedIconVal ? Number.parseInt(savedIconVal, 10) : 0;
            if (!Number.isNaN(iconId)) {
                promises.push(lcuRequest("PUT", "/lol-summoner/v1/current-summoner/icon", {
                    profileIconId: iconId,
                }));
            }
        }

        await Promise.allSettled(promises);
        addLog("Saved settings cleared.");
        showToast?.("Saved settings cleared!", "success");
        setShowResetConfirm(false);
    };

    const exportSettings = async () => {
        try {
            const data: Record<string, string | null> = {};
            ALL_SAVED_KEYS.forEach(key => { data[key] = localStorage.getItem(key); });
            const json = JSON.stringify(data, null, 2);
            const defaultName = `league-profile-settings-${new Date().toISOString().slice(0, 10)}.json`;
            const path = await save({
                defaultPath: defaultName,
                filters: [{ name: "JSON", extensions: ["json"] }]
            });
            if (!path) return;
            const target = Array.isArray(path) ? path[0] : path;
            await invoke("save_logs_to_path", { path: target, content: json });
            addLog(`Settings exported to: ${target}`);
            showToast?.("Settings exported!", "success");
        } catch (err) {
            addLog(`Settings export failed: ${err}`);
            showToast?.("Settings export failed", "error");
        }
    };

    const importSettings = async () => {
        try {
            const path = await open({
                filters: [{ name: "JSON", extensions: ["json"] }],
                multiple: false,
            });
            if (!path) return;
            const target = Array.isArray(path) ? path[0] : path;
            const response = await fetch(`asset://localhost/${encodeURIComponent(target)}`).catch(() => null);
            if (!response || !response.ok) {
                throw new Error("Failed to read file");
            }
            const text = await response.text();
            const data = JSON.parse(text) as Record<string, string | null>;
            ALL_SAVED_KEYS.forEach(key => {
                if (key in data) {
                    if (data[key] === null) {
                        localStorage.removeItem(key);
                    } else {
                        localStorage.setItem(key, data[key] as string);
                    }
                }
            });
            setAutoEnforce(localStorage.getItem(SAVED_AUTO_ENFORCE_KEY) === 'true');
            addLog("Settings imported successfully.");
            showToast?.("Settings imported! Restart for full effect.", "success");
        } catch (err) {
            addLog(`Settings import failed: ${err}`);
            showToast?.("Settings import failed", "error");
        }
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <h3 className="card-title">Technical Settings</h3>
                <button type="button" className="settings-row" onClick={async () => {
                    const newState = !isAutostartEnabled;
                    try {
                        if (newState) await enable(); else await disable();
                        setIsAutostartEnabled(newState);
                        addLog(`Auto-launch ${newState ? 'enabled' : 'disabled'}.`);
                    } catch (err) {
                        addLog(`Failed to toggle auto-launch: ${err}`);
                        showToast?.(`Failed to toggle auto-launch: ${err}`, "error");
                    }
                }}>
                    <div className="settings-info">
                        <span className="settings-label">Auto-launch</span>
                        <p className="settings-desc">Launch the app automatically when your PC starts.</p>
                    </div>
                    <span className="switch">
                        <span className="sr-only">Toggle Auto-launch</span>
                        <input type="checkbox" checked={isAutostartEnabled} readOnly />
                        <span className="slider"></span>
                    </span>
                </button>

                <button type="button" className="settings-row" onClick={toggleMinimizeToTray} style={{ marginTop: '10px' }}>
                    <div className="settings-info">
                        <span className="settings-label">Minimize to Tray</span>
                        <p className="settings-desc">Close button will minimize the app to the system tray.</p>
                    </div>
                    <span className="switch">
                        <span className="sr-only">Toggle Minimize to Tray</span>
                        <input type="checkbox" checked={minimizeToTray} readOnly />
                        <span className="slider"></span>
                    </span>
                </button>

                <button type="button" className="settings-row" onClick={() => toggleAutoEnforce(!autoEnforce)} style={{ marginTop: '10px' }}>
                    <div className="settings-info">
                        <span className="settings-label">Auto-Restore Profile</span>
                        <p className="settings-desc">Automatically re-apply profile overrides (rank, icons, status) when the League Client opens.</p>
                    </div>
                    <span className="switch">
                        <span className="sr-only">Toggle Auto Restore</span>
                        <input type="checkbox" checked={autoEnforce} readOnly />
                        <span className="slider"></span>
                    </span>
                </button>

                {showResetConfirm ? (
                    <div style={{ marginTop: '10px', padding: '12px 16px', background: 'rgba(255,107,107,0.04)', borderRadius: 'var(--radius)' }}>
                        <span className="settings-label" style={{ color: 'var(--text-secondary)', marginBottom: '10px', display: 'block' }}>What to clear?</span>
                        {Object.entries(resetLabels).map(([key, label]) => (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                <input type="checkbox" checked={resetChecks[key]} onChange={() => setResetChecks(prev => ({ ...prev, [key]: !prev[key] }))} style={{ accentColor: '#ff6b6b' }} />
                                {label}
                            </label>
                        ))}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button type="button" className="ghost-btn" style={{ color: '#c0392b', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={clearAllSettings}><Check size={14} />Clear Selected</button>
                            <button type="button" className="ghost-btn" onClick={() => setShowResetConfirm(false)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><X size={14} />Cancel</button>
                        </div>
                    </div>
                ) : (
                    <button type="button" className="settings-row" onClick={() => setShowResetConfirm(true)} style={{ marginTop: '10px' }}>
                        <div className="settings-info">
                            <span className="settings-label">Clear Saved Data</span>
                            <p className="settings-desc">Reset profile overrides, rank, tokens, status, icon &amp; more</p>
                        </div>
                        <Trash2 size={18} style={{ color: '#ff6b6b', flexShrink: 0, marginLeft: '16px' }} />
                    </button>
                )}
            </div>

            <div className="card">
                <h3 className="card-title">Backup &amp; Restore</h3>
                <p className="settings-desc" style={{ marginBottom: '10px' }}>
                    Export all saved settings to a JSON file, or import a previously exported backup.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={exportSettings}>
                        <Download size={16} /> Export
                    </button>
                    <button type="button" className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={importSettings}>
                        <Upload size={16} /> Import
                    </button>
                </div>
            </div>

            {latestVersion && clientVersion !== latestVersion && (
                <div className="card update-panel-hero">
                    <div className="update-content">
                        <div className="update-intel">
                            <RefreshCw size={24} className="intel-spinner" />
                            <div>
                                <h3 className="update-title-hero">New Enhancement Available</h3>
                                <p className="update-desc-hero">A fresh build of the toolkit is ready to be installed (<b>v{latestVersion}</b>).</p>
                            </div>
                        </div>
                        <a href="https://github.com/L9Lenny/league_profile_tool/releases/latest" target="_blank" rel="noreferrer" className="update-action-btn-hero">
                            UPDATE NOW
                        </a>
                    </div>
                </div>
            )}

            <div className="card" style={{ marginTop: '12px', background: 'rgba(200, 155, 60, 0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Cpu size={24} style={{ color: 'var(--hextech-gold)' }} />
                    <div>
                        <h4 style={{ margin: 0, color: 'var(--hextech-gold)', fontSize: '0.9rem' }}>Bridge Interface</h4>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            High-performance LCU communication layer via Tauri v2 Core.
                        </p>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default React.memo(SettingsTab);
