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
}

const SettingsTab: React.FC<SettingsTabProps> = ({
    isAutostartEnabled, setIsAutostartEnabled,
    minimizeToTray, toggleMinimizeToTray,
    latestVersion, clientVersion, addLog
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
        addLog("All saved settings have been cleared. Reloading...");
        setShowResetConfirm(false);
        setTimeout(() => window.location.reload(), 500);
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

            <div style={{ marginTop: '20px', padding: '16px 20px', background: 'rgba(255, 70, 70, 0.04)', border: '1px solid rgba(255, 70, 70, 0.12)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: showResetConfirm ? '12px' : 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(255, 70, 70, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={16} style={{ color: '#ff6b6b' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>Clear All Saved Data</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Profile overrides, rank, tokens, titles &amp; auto-enforcer settings</div>
                    </div>
                    {!showResetConfirm && (
                        <button type="button" onClick={() => setShowResetConfirm(true)}
                            style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid rgba(255, 70, 70, 0.25)', background: 'transparent', color: '#ff6b6b', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            CLEAR ALL
                        </button>
                    )}
                </div>
                {showResetConfirm && (
                    <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255, 70, 70, 0.1)' }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                            This will erase all saved profile overrides and disable the auto-enforcer. This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={clearAllSettings}
                                style={{ padding: '6px 14px', borderRadius: '4px', border: 'none', background: '#ff6b6b', color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                                Clear Everything
                            </button>
                            <button type="button" onClick={() => setShowResetConfirm(false)}
                                style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsTab;
