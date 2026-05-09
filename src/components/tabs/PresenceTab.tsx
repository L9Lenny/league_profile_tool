import React, { useState, useEffect } from 'react';
import { MessageSquare, Zap, Play, Coffee, ghost, Search, Timer } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface PresenceTabProps {
    lcu: LcuInfo | null;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<any>;
}

const GAME_STATUSES = [
    { id: 'outOfGame', label: 'Home (Normal)', color: '#00ff88' },
    { id: 'inQueue', label: 'In Queue (Blue)', color: '#00ccff' },
    { id: 'championSelect', label: 'Champ Select (Yellow)', color: '#ffcc00' },
    { id: 'inGame', label: 'In Match (Yellow)', color: '#ffff00' },
    { id: 'hostingCustomGame', label: 'Hosting Custom', color: '#aa55ff' },
];

const PresenceTab: React.FC<PresenceTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [status, setStatus] = useState("");
    const [availability, setAvailability] = useState("chat");
    const [gameStatus, setGameStatus] = useState("outOfGame");
    const [queueId, setQueueId] = useState("420"); // Solo/Duo by default

    useEffect(() => {
        if (lcu) {
            const fetchCurrent = async () => {
                try {
                    const res: any = await lcuRequest("GET", "/lol-chat/v1/me");
                    if (res) {
                        setStatus(res.statusMessage || "");
                        setAvailability(res.availability || "chat");
                        if (res.lol?.gameStatus) setGameStatus(res.lol.gameStatus);
                    }
                } catch (err) {
                    addLog(`Presence Sync Error: ${err}`);
                }
            };
            fetchCurrent();
        }
    }, [lcu]);

    const applyPresence = async (overrides?: any) => {
        if (!lcu) return;
        setLoading(true);
        
        const finalAvailability = overrides?.availability || availability;
        const finalStatus = overrides?.status !== undefined ? overrides.status : status;
        const finalGameStatus = overrides?.gameStatus || gameStatus;

        // Build the "lol" rich presence object
        const lolObject: any = {
            gameStatus: finalGameStatus,
        };

        if (finalGameStatus === 'inQueue' || finalGameStatus === 'championSelect' || finalGameStatus === 'inGame') {
            lolObject.gameQueueId = queueId;
            lolObject.queueId = queueId;
            lolObject.gameMode = "CLASSIC";
            lolObject.isPvp = true;
            lolObject.timeStamp = Date.now().toString();
        }

        try {
            await lcuRequest("PUT", "/lol-chat/v1/me", {
                availability: finalAvailability,
                statusMessage: finalStatus,
                lol: lolObject
            });
            
            setAvailability(finalAvailability);
            setStatus(finalStatus);
            setGameStatus(finalGameStatus);
            
            showToast("Rich Presence applied!", "success");
            addLog(`Presence updated: ${finalGameStatus} | ${finalAvailability} | "${finalStatus}"`);
        } catch (err) {
            showToast("Failed to update presence", "error");
            addLog(`Presence update failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const templates = [
        { name: "Fake Queue", gs: "inQueue", msg: "In Queue...", avail: "chat" },
        { name: "Fake Match", gs: "inGame", msg: "Ranked (Solo/Duo)", avail: "dnd" },
        { name: "Ghosting", gs: "outOfGame", msg: "", avail: "offline" },
        { name: "AFK", gs: "outOfGame", msg: "AFK - Coffee break", avail: "away" },
    ];

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <Timer size={24} color="var(--hextech-gold)" />
                    <h3 className="card-title" style={{ margin: 0 }}>Fake Presence Manager</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="input-group">
                        <label>Rich Text (Status)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. In Match (Ranked)" 
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            disabled={!lcu || loading}
                        />
                    </div>
                    <div className="input-group">
                        <label>Queue ID (420=SoloDuo, 440=Flex)</label>
                        <input 
                            type="text" 
                            placeholder="420" 
                            value={queueId}
                            onChange={(e) => setQueueId(e.target.value)}
                            disabled={!lcu || loading}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'block' }}>Simulated Game Status</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                        {GAME_STATUSES.map(gs => (
                            <button
                                key={gs.id}
                                onClick={() => setGameStatus(gs.id)}
                                style={{ 
                                    padding: '12px', 
                                    background: gameStatus === gs.id ? 'rgba(200, 155, 60, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid',
                                    borderColor: gameStatus === gs.id ? 'var(--hextech-gold)' : 'rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: gs.color, marginBottom: '6px', boxShadow: `0 0 5px ${gs.color}` }}></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: gameStatus === gs.id ? 'white' : 'var(--text-secondary)' }}>{gs.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'block' }}>One-Click Scenarios</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {templates.map(tmp => (
                            <button 
                                key={tmp.name}
                                className="music-badge" 
                                style={{ padding: '8px 15px', cursor: 'pointer' }}
                                onClick={() => applyPresence({ gameStatus: tmp.gs, status: tmp.msg, availability: tmp.avail })}
                            >
                                {tmp.name}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    className="primary-btn" 
                    onClick={() => applyPresence()} 
                    disabled={!lcu || loading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px' }}
                >
                    <Zap size={20} /> SYNC FAKE PRESENCE TO CLIENT
                </button>
            </div>

            <div className="card" style={{ marginTop: '15px', background: 'rgba(200, 155, 60, 0.05)', border: '1px solid rgba(200, 155, 60, 0.2)' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <Play size={20} color="var(--hextech-gold)" />
                    <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-secondary)' }}>
                        <strong>Tip:</strong> Setting status to <code>inQueue</code> with Queue ID <code>420</code> will show you as searching for a Ranked Solo/Duo match.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PresenceTab;
