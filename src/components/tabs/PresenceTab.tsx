import React, { useState, useEffect } from 'react';
import { Zap, Play, Coffee, Ghost, Timer, Smartphone, UserCheck, ShieldAlert, Clock } from 'lucide-react';
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
    { id: 'outOfGame', label: 'Home', color: '#00ff88' },
    { id: 'inQueue', label: 'In Queue', color: '#00ccff' },
    { id: 'championSelect', label: 'Champ Select', color: '#ffcc00' },
    { id: 'inGame', label: 'In Match', color: '#ffff00' },
];

const PresenceTab: React.FC<PresenceTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [status, setStatus] = useState("");
    const [availability, setAvailability] = useState("chat");
    const [gameStatus, setGameStatus] = useState("outOfGame");
    const [queueId, setQueueId] = useState("420");

    useEffect(() => {
        if (lcu) {
            const fetchCurrent = async () => {
                try {
                    const res: any = await lcuRequest("GET", "/lol-chat/v1/me");
                    if (res) {
                        setStatus(res.statusMessage || "");
                        setAvailability(res.availability || "chat");
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

        // The "lol" object values MUST be strings for the chat server to process them as Rich Presence
        const lol: any = {
            gameStatus: String(finalGameStatus),
            gameQueueId: String(queueId),
            gameMode: "CLASSIC",
            isPvp: "true",
            isGameFull: "false",
            mapId: "11",
            queueId: String(queueId),
            timeStamp: Date.now().toString()
        };

        const payload = {
            availability: finalAvailability,
            statusMessage: finalStatus,
            product: "league_of_legends",
            patchline: "live",
            lol: lol
        };

        try {
            await lcuRequest("PUT", "/lol-chat/v1/me", payload);
            
            setAvailability(finalAvailability);
            setStatus(finalStatus);
            setGameStatus(finalGameStatus);
            
            showToast("Presence Synced!", "success");
            addLog(`Presence synced: ${finalGameStatus} (${queueId})`);
        } catch (err) {
            showToast("Failed to sync presence", "error");
            addLog(`Presence error: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const quickStates = [
        { label: 'Online', icon: <UserCheck size={16} />, color: '#00ff88', val: 'chat' },
        { label: 'Away', icon: <Clock size={16} />, color: '#ffb347', val: 'away' },
        { label: 'DND', icon: <ShieldAlert size={16} />, color: '#ff4e50', val: 'dnd' },
        { label: 'Mobile', icon: <Smartphone size={16} />, color: '#888', val: 'mobile' },
        { label: 'Ghost', icon: <Ghost size={16} />, color: '#555', val: 'offline' },
    ];

    const scenarios = [
        { name: "Fake SoloQ", gs: "inQueue", msg: "Searching for Match...", qid: "420", av: "chat" },
        { name: "Fake ARAM", gs: "inGame", msg: "ARAM - 12:05", qid: "450", av: "dnd" },
        { name: "Fake Custom", gs: "hostingCustomGame", msg: "In Lobby", qid: "0", av: "chat" },
    ];

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <Timer size={24} color="var(--hextech-gold)" />
                    <h3 className="card-title" style={{ margin: 0 }}>Rich Presence Editor</h3>
                </div>

                {/* Status & Queue */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div className="input-group">
                        <label>Status Message</label>
                        <input type="text" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="e.g. In Match" />
                    </div>
                    <div className="input-group">
                        <label>Queue ID</label>
                        <input type="text" value={queueId} onChange={(e) => setQueueId(e.target.value)} placeholder="420" />
                    </div>
                </div>

                {/* Availability Row */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Availability</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {quickStates.map(s => (
                            <button 
                                key={s.val}
                                onClick={() => setAvailability(s.val)}
                                style={{ 
                                    flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid',
                                    borderColor: availability === s.val ? 'var(--hextech-gold)' : 'rgba(255,255,255,0.05)',
                                    background: availability === s.val ? 'rgba(200,155,60,0.1)' : 'rgba(0,0,0,0.2)',
                                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
                                }}
                            >
                                <div style={{ color: s.color }}>{s.icon}</div>
                                <span style={{ fontSize: '0.6rem', color: availability === s.val ? 'white' : 'var(--text-secondary)' }}>{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Game Status Row */}
                <div style={{ marginBottom: '25px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Simulated Activity</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {GAME_STATUSES.map(gs => (
                            <button
                                key={gs.id}
                                onClick={() => setGameStatus(gs.id)}
                                style={{ 
                                    padding: '12px 5px', borderRadius: '8px', border: '1px solid',
                                    borderColor: gameStatus === gs.id ? 'var(--hextech-gold)' : 'rgba(255,255,255,0.05)',
                                    background: gameStatus === gs.id ? 'rgba(200,155,60,0.1)' : 'rgba(0,0,0,0.2)',
                                    cursor: 'pointer', textAlign: 'center'
                                }}
                            >
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: gs.color, margin: '0 auto 5px', boxShadow: `0 0 5px ${gs.color}` }}></div>
                                <span style={{ fontSize: '0.65rem', color: gameStatus === gs.id ? 'white' : 'var(--text-secondary)' }}>{gs.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scenarios */}
                <div style={{ marginBottom: '25px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Quick Scenarios</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {scenarios.map(sc => (
                            <button 
                                key={sc.name}
                                className="music-badge" 
                                style={{ padding: '8px 12px', cursor: 'pointer' }}
                                onClick={() => {
                                    setQueueId(sc.qid);
                                    applyPresence({ gameStatus: sc.gs, status: sc.msg, availability: sc.av });
                                }}
                            >
                                {sc.name}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    className="primary-btn" 
                    onClick={() => applyPresence()} 
                    disabled={!lcu || loading}
                    style={{ width: '100%', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                    <Zap size={20} /> PUSH PRESENCE TO FRIENDS
                </button>
            </div>
        </div>
    );
};

export default PresenceTab;
