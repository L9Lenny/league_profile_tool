import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  Home,
  Settings,
  ShieldCheck,
  Trash2,
  Cpu,
  Github,
  Coffee,
  Trophy,
  ChevronRight,
  Layout,
  Terminal,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import "./App.css";

interface LcuInfo {
  port: string;
  token: string;
}

interface LogEntry {
  time: string;
  msg: string;
}

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [lcu, setLcu] = useState<LcuInfo | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [clientVersion, setClientVersion] = useState("0.0.0");
  const [latestVersion, setLatestVersion] = useState("");
  const [isAutostartEnabled, setIsAutostartEnabled] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Rank Overrides
  const [soloTier, setSoloTier] = useState("CHALLENGER");
  const [soloDiv, setSoloDiv] = useState("I");

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: timestamp, msg }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    getVersion().then(setClientVersion);

    // Fetch latest version from GitHub with cache-buster
    fetch(`https://raw.githubusercontent.com/L9Lenny/lol-profile-editor/main/updater.json?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        setLatestVersion(data.version);
        addLog(`Latest version available: v${data.version}`);
      })
      .catch((err) => {
        addLog(`Failed to fetch latest version: ${err}`);
      });

    // Check autostart status
    isEnabled().then(setIsAutostartEnabled);

    // Load minimize to tray setting
    invoke<boolean>("get_minimize_to_tray")
      .then(setMinimizeToTray)
      .catch(() => setMinimizeToTray(true));

    addLog("Application initialized.");
  }, []);

  const checkConnection = async () => {
    try {
      const info = await invoke<LcuInfo>("get_lcu_connection");
      if (!lcu && info) {
        addLog("League of Legends client detected.");
      }
      setLcu(info);
    } catch (err) {
      if (lcu) addLog("League of Legends client disconnected.");
      setLcu(null);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [lcu]);

  const handleUpdateBio = async () => {
    if (!lcu) return;
    setLoading(true);
    setMessage({ text: "Updating...", type: "" });
    try {
      const res = await invoke<string>("update_bio", {
        port: lcu.port,
        token: lcu.token,
        newBio: bio,
      });
      addLog(`Bio updated: "${bio}"`);
      setMessage({ text: res, type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (err) {
      addLog(`Error updating bio: ${err}`);
      setMessage({ text: String(err), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const toggleAutostart = async () => {
    try {
      if (isAutostartEnabled) {
        await disable();
        addLog("Auto-launch disabled.");
      } else {
        await enable();
        addLog("Auto-launch enabled.");
      }
      setIsAutostartEnabled(!isAutostartEnabled);
    } catch (err) {
      addLog(`Failed to toggle auto-launch: ${err}`);
    }
  };

  const toggleMinimizeToTray = async () => {
    try {
      const newState = !minimizeToTray;
      await invoke("set_minimize_to_tray", { enabled: newState });
      setMinimizeToTray(newState);
      addLog(`Minimize to tray ${newState ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      addLog(`Failed to toggle minimize to tray: ${err}`);
    }
  };

  return (
    <div className="main-app">
      {/* Top Navigation */}
      <nav className="nav-bar">
        <div className="nav-links">
          <div
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Home size={16} /> <span>Home</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'bio' ? 'active' : ''}`}
            onClick={() => setActiveTab('bio')}
          >
            <ShieldCheck size={16} /> <span>Bio</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'rank' ? 'active' : ''}`}
            onClick={() => setActiveTab('rank')}
          >
            <Trophy size={16} /> <span>Rank</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <Terminal size={16} /> <span>Logs</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} />
            <span>Settings</span>
            {latestVersion && clientVersion !== latestVersion && (
              <div className="nav-update-beacon"></div>
            )}
          </div>
        </div>

        <div className="nav-social">
          <a
            href="https://github.com/L9Lenny/lol-profile-editor"
            target="_blank"
            rel="noreferrer"
            className="social-link-top"
            title="View Repository"
          >
            <Github size={18} />
          </a>
          <a
            href="https://ko-fi.com/profumato"
            target="_blank"
            rel="noreferrer"
            className="social-link-top"
            title="Support Development"
          >
            <Coffee size={18} />
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="content-area">
        {activeTab === 'home' && (
          <div className="tab-content fadeIn">
            <div className="home-hero">
              <h1 className="hero-title">League Profile Tool</h1>
              <p className="hero-subtitle">Elevate your presence in the League of Legends ecosystem with precision overrides and aesthetic controls.</p>

              <div className={`connection-status-pill ${lcu ? 'connected' : 'disconnected'}`}>
                <div className="status-dot"></div>
                {lcu ? 'CLIENT CONNECTED' : 'WAITING FOR CLIENT'}
              </div>
            </div>

            <div className="quick-start-grid">
              <div className="feature-card" onClick={() => setActiveTab('bio')}>
                <div className="feature-icon"><Layout size={24} /></div>
                <div className="feature-body">
                  <h3>Profile Bio</h3>
                  <p>Update your status message and biographical data instantly.</p>
                </div>
                <ChevronRight size={18} className="feature-arrow" />
              </div>

              <div className="feature-card" onClick={() => setActiveTab('rank')}>
                <div className="feature-icon"><Trophy size={24} /></div>
                <div className="feature-body">
                  <h3>Rank Overrides</h3>
                  <p>Override your visible Solo/Duo rankings in the social engine.</p>
                </div>
                <ChevronRight size={18} className="feature-arrow" />
              </div>
            </div>

            {/* Version Footer */}
            <div className="home-footer">
              <span className="version-label">Application Build</span>
              <span className="version-value">v{clientVersion}</span>
            </div>
          </div>
        )}

        {activeTab === 'bio' && (
          <div className="tab-content fadeIn">
            <div className="card">
              <h3 className="card-title">Profile Bio</h3>

              <div className="input-group">
                <label>New Status Message</label>
                <textarea
                  placeholder="Tell your friends what you're up to..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!lcu || loading}
                  rows={4}
                />
              </div>

              <button
                className="primary-btn"
                onClick={handleUpdateBio}
                disabled={!lcu || loading || !bio.trim()}
                style={{ width: '100%' }}
              >
                APPLY
              </button>

              {!lcu && (
                <p style={{ color: '#ff3232', fontSize: '0.8rem', marginTop: '15px', textAlign: 'center' }}>
                  ⚠ Start League of Legends to enable this feature.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rank' && (
          <div className="tab-content fadeIn">
            <div className="card">
              <h3 className="card-title">Rank Override</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '30px' }}>
                Modify how your rank is displayed in the chat system and on hover cards.
              </p>

              <div className="input-group">
                <label>Solo/Duo Ranking</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={soloTier}
                    onChange={(e) => setSoloTier(e.target.value)}
                    style={{ flex: 2 }}
                  >
                    {["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <select
                    value={soloDiv}
                    onChange={(e) => setSoloDiv(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {["I", "II", "III", "IV"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rank-preview-mini" style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Draft Preview</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{soloTier} <span style={{ color: 'var(--hextech-gold)' }}>{soloDiv}</span></span>
              </div>

              <button
                className="primary-btn"
                style={{ marginTop: '20px', width: '100%' }}
                onClick={async () => {
                  if (!lcu) return;
                  setLoading(true);
                  try {
                    await invoke("lcu_request", {
                      method: "PUT",
                      endpoint: "/lol-chat/v1/me",
                      body: {
                        lol: {
                          rankedLeagueTier: soloTier,
                          rankedLeagueDivision: soloDiv,
                          rankedLeagueQueue: "RANKED_SOLO_5x5"
                        }
                      },
                      port: lcu.port,
                      token: lcu.token
                    });
                    addLog(`Rank override: ${soloTier} ${soloDiv}`);
                    setMessage({ text: "Rank Applied!", type: "success" });
                    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
                  } catch (err) {
                    addLog(`Rank Error: ${err}`);
                    setMessage({ text: "Failed to apply rank", type: "error" });
                  } finally { setLoading(false); }
                }}
              >
                APPLY
              </button>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="tab-content fadeIn" style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>System Logs</h3>
                <button
                  onClick={() => setLogs([])}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem' }}
                >
                  <Trash2 size={12} /> CLEAR
                </button>
              </div>
              <div className="log-container">
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', opacity: 0.5, fontStyle: 'italic' }}>No logs yet...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="log-entry">
                      <span style={{ color: 'var(--hextech-gold-dark)', marginRight: '10px' }}>[{log.time}]</span>
                      {log.msg}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content fadeIn">
            <div className="card">
              <h3 className="card-title">Technical Settings</h3>

              <div className="settings-row" onClick={toggleAutostart}>
                <div className="settings-info">
                  <span className="settings-label">Auto-launch</span>
                  <p className="settings-desc">Launch the app automatically when your PC starts.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isAutostartEnabled}
                    readOnly
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="settings-row" onClick={toggleMinimizeToTray} style={{ marginTop: '10px' }}>
                <div className="settings-info">
                  <span className="settings-label">Minimize to Tray</span>
                  <p className="settings-desc">Close button will minimize the app to the system tray.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={minimizeToTray}
                    readOnly
                  />
                  <span className="slider"></span>
                </label>
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
                  <a
                    href="https://github.com/L9Lenny/lol-profile-editor/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="update-action-btn-hero"
                  >
                    UPDATE NOW
                  </a>
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: '20px', background: 'rgba(200, 155, 60, 0.03)' }}>
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
        )}
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={`status-dot ${lcu ? 'online' : 'offline'}`}></div>
          <span style={{ letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem' }}>
            {lcu ? 'LCU Connected' : 'Waiting for League...'}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
          LEAGUE PROFILE TOOL v{clientVersion}
        </div>
      </footer>


      {message.text && (
        <div className={`toast ${message.type}`}>
          {message.type === 'success' ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}

export default App;
