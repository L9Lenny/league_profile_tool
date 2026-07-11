import React, { useState } from 'react';
import { RefreshCw, Cpu, Trash2, X, Check } from 'lucide-react';
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { SAVED_AUTO_ENFORCE_KEY, SAVED_ENFORCE_OFFLINE_KEY, SAVED_ICON_KEY, ALL_SAVED_KEYS } from '../../storageKeys';

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

    const clearAllSettings = () => {
        const savedIconVal = resetChecks.icon ? localStorage.getItem(SAVED_ICON_KEY) : null;

        if (resetChecks.enforcer) {
            ALL_SAVED_KEYS.forEach(key => localStorage.removeItem(key));
            setAutoEnforce(false);
        }

        if (lcuRequest) {
            const hasChatFields = resetChecks.rank || resetChecks.challenge || resetChecks.background || resetChecks.status;
            if (hasChatFields) {
                lcuRequest("GET", "/lol-chat/v1/me").then((chatRes: any) => {
                    let baseLol: any = {};
                    if (chatRes?.lol) {
                        baseLol = typeof chatRes.lol === 'string' ? JSON.parse(chatRes.lol) : chatRes.lol;
                    }
                    const chatBody: any = {};
                    if (resetChecks.rank) {
                        baseLol.rankedLeagueTier = "";
                        baseLol.rankedLeagueDivision = "";
                        baseLol.rankedLeagueQueue = "";
                    }
                    if (resetChecks.challenge) {
                        baseLol.challengeCrystalLevel = "";
                        baseLol.challengePoints = "";
                    }
                    if (resetChecks.background) {
                        baseLol.backgroundSkinId = "";
                    }
                    if (resetChecks.status) {
                        chatBody.availability = "chat";
                        chatBody.statusMessage = "";
                    }
                    chatBody.lol = baseLol;
                    lcuRequest("PUT", "/lol-chat/v1/me", chatBody);
                }).catch(() => {});
            }

            if (resetChecks.background) {
                lcuRequest("POST", "/lol-summoner/v1/current-summoner/summoner-profile", {
                    key: "backgroundSkinId",
                    value: 0,
                }).catch(() => {});
            }

            if (resetChecks.tokens) {
                lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", {
                    challengeIds: [],
                    title: "",
                    bannerAccent: "",
                    crestBorder: "",
                    prestigeCrestBorderLevel: 0,
                }).catch(() => {});
            }

            if (resetChecks.icon) {
                const iconId = savedIconVal ? parseInt(savedIconVal, 10) : 0;
                if (!isNaN(iconId)) {
                    lcuRequest("PUT", "/lol-summoner/v1/current-summoner/icon", {
                        profileIconId: iconId,
                    }).catch(() => {});
                }
            }
        }

        addLog("Saved settings cleared.");
        showToast?.("Saved settings cleared!", "success");
        setShowResetConfirm(false);
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <h3 className="card-title">Technical Settings</h3>
                <button type="button" className="settings-row" onClick={async () => {
                    const newState = !isAutostartEnabled;
                    if (newState) await enable(); else await disable();
                    setIsAutostartEnabled(newState);
                    addLog(`Auto-launch ${newState ? 'enabled' : 'disabled'}.`);
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

export default SettingsTab;
