import React, { useState, useEffect } from 'react';
import { Users, Play, RefreshCw, CheckCircle2, UserCheck } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface LobbyTabProps {
    lcu: LcuInfo | null;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<any>;
}

interface Friend {
    summonerId: number;
    summonerName: string;
    availability: string;
}

const LobbyTab: React.FC<LobbyTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [isRefreshingFriends, setIsRefreshingFriends] = useState(false);

    const refreshFriends = async () => {
        if (!lcu) return;
        setIsRefreshingFriends(true);
        try {
            const res: any = await lcuRequest("GET", "/lol-chat/v1/friends");
            if (Array.isArray(res)) {
                // Filter only Online (chat) or DND (dnd) friends
                const available = res
                    .filter(f => f.availability === "chat" || f.availability === "dnd")
                    .map(f => ({
                        summonerId: f.summonerId,
                        summonerName: f.name || f.gameName || "Unknown",
                        availability: f.availability
                    }));
                setFriends(available);
            }
        } catch (err) {
            addLog(`Failed to fetch friends: ${err}`);
        } finally {
            setIsRefreshingFriends(false);
        }
    };

    useEffect(() => {
        if (lcu) refreshFriends();
    }, [lcu]);

    const sendInvites = async (namesToInvite: string[]) => {
        if (!lcu || namesToInvite.length === 0) return;
        
        setLoading(true);
        addLog(`Attempting to invite ${namesToInvite.length} players...`);

        try {
            // Check if we are in a lobby
            try {
                await lcuRequest("GET", "/lol-lobby/v2/lobby");
            } catch (err) {
                addLog("Not in a lobby. Creating a Normal 5v5 lobby first...");
                await lcuRequest("POST", "/lol-lobby/v2/lobby", { queueId: 430 }); 
            }

            // Send invitations
            const invitations = namesToInvite.map(name => ({ toSummonerName: name }));
            await lcuRequest("POST", "/lol-lobby/v2/lobby/invitations", invitations);
            
            showToast(`Invited ${namesToInvite.length} players!`, "success");
            addLog(`Sent invitations to: ${namesToInvite.join(", ")}`);
            setSelectedFriends([]);
        } catch (err) {
            showToast("Failed to send invitations", "error");
            addLog(`Invite error: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteSelected = () => sendInvites(selectedFriends);
    
    const handleInviteAllAvailable = () => {
        const allNames = friends.map(f => f.summonerName);
        if (allNames.length === 0) {
            showToast("No available friends to invite", "error");
            return;
        }
        sendInvites(allNames);
    };

    const toggleFriend = (name: string) => {
        setSelectedFriends(prev => 
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const selectAll = () => {
        setSelectedFriends(friends.map(f => f.summonerName));
    };

    const statusColor = (availability: string) => {
        return availability === 'chat' ? '#00ff88' : '#ff4e50';
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '450px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users size={24} color="var(--hextech-gold)" />
                        <div>
                            <h3 className="card-title" style={{ margin: 0 }}>Lobby Manager</h3>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Invite Online &amp; DND Friends</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary-btn" 
                            onClick={selectAll} 
                            disabled={!lcu || loading || friends.length === 0}
                            style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                        >
                            SELECT ALL
                        </button>
                        <button 
                            className={`refresh-icon-btn ${isRefreshingFriends ? 'loading' : ''}`}
                            onClick={refreshFriends}
                            disabled={!lcu || isRefreshingFriends}
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    padding: '8px',
                    marginBottom: '20px'
                }}>
                    {friends.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ marginBottom: '10px', opacity: 0.3 }}><Users size={48} style={{ margin: '0 auto' }} /></div>
                            <p style={{ fontSize: '0.85rem' }}>
                                {lcu ? "No friends currently Online or DND." : "Connecting to League Client..."}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                            {friends.map(friend => (
                                <div 
                                    key={friend.summonerId}
                                    onClick={() => toggleFriend(friend.summonerName)}
                                    style={{ 
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        background: selectedFriends.includes(friend.summonerName) ? 'rgba(200, 155, 60, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid',
                                        borderColor: selectedFriends.includes(friend.summonerName) ? 'var(--hextech-gold)' : 'transparent',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        background: statusColor(friend.availability),
                                        boxShadow: `0 0 8px ${statusColor(friend.availability)}`
                                    }} />
                                    <span style={{ fontSize: '0.85rem', flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {friend.summonerName}
                                    </span>
                                    {selectedFriends.includes(friend.summonerName) && <UserCheck size={16} color="var(--hextech-gold)" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button 
                        className="primary-btn" 
                        onClick={handleInviteSelected} 
                        disabled={!lcu || loading || selectedFriends.length === 0}
                        style={{ background: 'transparent', border: '1px solid var(--hextech-gold)', color: 'var(--hextech-gold)' }}
                    >
                        INVITE SELECTED ({selectedFriends.length})
                    </button>
                    <button 
                        className="primary-btn" 
                        onClick={handleInviteAllAvailable} 
                        disabled={!lcu || loading || friends.length === 0}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        <Play size={18} /> INVITE ALL AVAILABLE ({friends.length})
                    </button>
                </div>
            </div>

            {!lcu && (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                    <p style={{ color: '#ff3232', fontSize: '0.8rem' }}>⚠ Start League of Legends to enable the Lobby Manager.</p>
                </div>
            )}
        </div>
    );
};

export default LobbyTab;
