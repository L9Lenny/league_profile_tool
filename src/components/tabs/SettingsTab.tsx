import React, { useState } from 'react';
import { RefreshCw, Cpu, Trash2 } from 'lucide-react';
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { SAVED_AUTO_ENFORCE_KEY, SAVED_ENFORCE_OFFLINE_KEY, ALL_SAVED_KEYS } from '../../storageKeys';

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

    const clearAllSettings = () => {
        ALL_SAVED_KEYS.forEach(key => localStorage.removeItem(key));
        setAutoEnforce(false);

        if (lcuRequest) {
            lcuRequest("GET", "/lol-chat/v1/me").then((chatRes: any) => {
                let baseLol: any = {};
                if (chatRes?.lol) {
                    baseLol = typeof chatRes.lol === 'string' ? JSON.parse(chatRes.lol) : chatRes.lol;
                }
                const overrideFields = ["rankedLeagueTier", "rankedLeagueDivision", "rankedLeagueQueue", "challengeCrystalLevel", "challengePoints", "backgroundSkinId"];
                let changed = false;
                for (const field of overrideFields) {
                    if (field in baseLol) {
                        delete baseLol[field];
                        changed = true;
                    }
                }
                if (changed) {
                    lcuRequest("PUT", "/lol-chat/v1/me", { lol: baseLol });
                }
            }).catch(() => {});
        }

        addLog("All saved settings have been cleared.");
        showToast?.("All saved settings cleared!", "success");
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
                    <div className="settings-row" style={{ cursor: 'default', marginTop: '10px' }}>
                        <div className="settings-info">
                            <span className="settings-label" style={{ color: 'var(--text-secondary)' }}>Erase all saved data?</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button type="button" className="ghost-btn" style={{ color: '#c0392b' }} onClick={clearAllSettings}>Yes</button>
                            <button type="button" className="ghost-btn" onClick={() => setShowResetConfirm(false)}>No</button>
                        </div>
                    </div>
                ) : (
                    <button type="button" className="settings-row" onClick={() => setShowResetConfirm(true)} style={{ marginTop: '10px' }}>
                        <div className="settings-info">
                            <span className="settings-label">Clear Saved Data</span>
                            <p className="settings-desc">Reset all profile overrides, rank, tokens, titles &amp; auto-enforcer</p>
                        </div>
                        <Trash2 size={18} style={{ color: '#ff6b6b', flexShrink: 0 }} />
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
