import React, { useState, useEffect } from 'react';
import { UserCheck, Ghost, MessageSquare, Clock, Smartphone, Zap, ShieldAlert } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface PresenceTabProps {
    lcu: LcuInfo | null;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<any>;
}

const PresenceTab: React.FC<PresenceTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [status, setStatus] = useState("");
    const [availability, setAvailability] = useState("chat");

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

    const applyPresence = async (newAvailability?: string, newStatus?: string) => {
        if (!lcu) return;
        setLoading(true);
        const targetAvailability = newAvailability || availability;
        const targetStatus = newStatus !== undefined ? newStatus : status;

        try {
            await lcuRequest("PUT", "/lol-chat/v1/me", {
                availability: targetAvailability,
                statusMessage: targetStatus
            });
            setAvailability(targetAvailability);
            setStatus(targetStatus);
            showToast("Presence updated!", "success");
            addLog(`Presence set to ${targetAvailability.toUpperCase()} with message: "${targetStatus}"`);
        } catch (err) {
            showToast("Failed to update presence", "error");
            addLog(`Presence update failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const quickStates = [
        { id: 'online', label: 'Online', icon: <UserCheck size={16} />, color: '#00ff88', val: 'chat' },
        { id: 'away', label: 'Away', icon: <Clock size={16} />, color: '#ffb347', val: 'away' },
        { id: 'dnd', label: 'DND', icon: <ShieldAlert size={16} />, color: '#ff4e50', val: 'dnd' },
        { id: 'mobile', label: 'Mobile', icon: <Smartphone size={16} />, color: '#888', val: 'mobile' },
        { id: 'offline', label: 'Invisible', icon: <Ghost size={16} />, color: '#555', val: 'offline' },
    ];

    const templates = [
        { name: "League of Legends", msg: "In Queue" },
        { name: "Wild Rift", msg: "Playing Wild Rift" },
        { name: "AFK", msg: "AFK - Back soon!" },
        { name: "Gamer Mode", msg: "In Match (Ranked) - 45:12" },
        { name: "Empty", msg: "" },
    ];

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <MessageSquare size={24} color="var(--hextech-gold)" />
                    <h3 className="card-title" style={{ margin: 0 }}>Presence Manager</h3>
                </div>

                <div className="input-group">
                    <label>Custom Status Message</label>
                    <input 
                        type="text" 
                        placeholder="What's on your mind?" 
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        disabled={!lcu || loading}
                    />
                </div>

                <div style={{ marginTop: '20px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'block' }}>Availability State</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                        {quickStates.map(state => (
                            <button
                                key={state.id}
                                onClick={() => applyPresence(state.val)}
                                style={{ 
                                    padding: '12px', 
                                    background: availability === state.val ? 'rgba(200, 155, 60, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid',
                                    borderColor: availability === state.val ? 'var(--hextech-gold)' : 'transparent',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                    color: availability === state.val ? 'white' : 'var(--text-secondary)'
                                }}
                            >
                                <div style={{ color: state.color }}>{state.icon}</div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{state.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '25px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'block' }}>Quick Templates</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {templates.map(tmp => (
                            <button 
                                key={tmp.name}
                                className="music-badge" 
                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                onClick={() => applyPresence(undefined, tmp.msg)}
                            >
                                {tmp.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '30px' }}>
                    <button 
                        className="primary-btn" 
                        onClick={() => applyPresence()} 
                        disabled={!lcu || loading}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        <Zap size={18} /> APPLY CUSTOM PRESENCE
                    </button>
                </div>
            </div>

            {!lcu && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ color: '#ff3232', fontSize: '0.8rem' }}>⚠ League client connection required to manage presence.</p>
                </div>
            )}
        </div>
    );
};

export default PresenceTab;
