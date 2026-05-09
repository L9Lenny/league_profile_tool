import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Play, RefreshCw, CheckCircle2 } from 'lucide-react';
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
    statusMessage: string;
}

const LobbyTab: React.FC<LobbyTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [names, setNames] = useState("");
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [isRefreshingFriends, setIsRefreshingFriends] = useState(false);

    const refreshFriends = async () => {
        if (!lcu) return;
        setIsRefreshingFriends(true);
        try {
            const res: any = await lcuRequest("GET", "/lol-chat/v1/friends");
            if (Array.isArray(res)) {
                // Filter only online friends
                const online = res
                    .filter(f => f.availability !== "offline")
                    .map(f => ({
                        summonerId: f.summonerId,
                        summonerName: f.name || f.gameName || "Unknown",
                        availability: f.availability,
                        statusMessage: f.statusMessage
                    }));
                setFriends(online);
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

    const handleInviteAll = async () => {
        if (!lcu) return;
        
        // Parse names from textarea
        const pastedNames = names.split('\n')
            .map(n => n.trim())
            .filter(n => n.length > 0);
        
        const allToInvite = [...new Set([...pastedNames, ...selectedFriends])];

        if (allToInvite.length === 0) {
            showToast("No players to invite", "error");
            return;
        }

        setLoading(true);
        addLog(`Attempting to invite ${allToInvite.length} players...`);

        try {
            // Check if we are in a lobby
            try {
                await lcuRequest("GET", "/lol-lobby/v2/lobby");
            } catch (err) {
                addLog("Not in a lobby. Creating a Normal 5v5 lobby first...");
                await lcuRequest("POST", "/lol-lobby/v2/lobby", { queueId: 430 }); // Normal Blind
            }

            // Send invitations
            const invitations = allToInvite.map(name => ({ toSummonerName: name }));
            await lcuRequest("POST", "/lol-lobby/v2/lobby/invitations", invitations);
            
            showToast(`Invited ${allToInvite.length} players!`, "success");
            addLog(`Sent invitations to: ${allToInvite.join(", ")}`);
            setNames("");
            setSelectedFriends([]);
        } catch (err) {
            showToast("Failed to send invitations", "error");
            addLog(`Invite error: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleFriend = (name: string) => {
        setSelectedFriends(prev => 
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const statusColor = (availability: string) => {
        switch(availability) {
            case 'chat': return '#00ff88';
            case 'away': return '#ffb347';
            case 'dnd': return '#ff4e50';
            default: return '#888';
        }
    };

    return (
        <div className="tab-content fadeIn">
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px' }}>
                {/* Left Column: Manual Entry */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                        <UserPlus size={20} color="var(--hextech-gold)" />
                        <h3 className="card-title" style={{ margin: 0 }}>Mass Invite</h3>
                    </div>
                    
                    <div className="input-group">
                        <label>Summoner Names (One per line)</label>
                        <textarea
                            style={{ 
                                background: 'rgba(0, 0, 0, 0.3)', 
                                minHeight: '200px',
                                fontFamily: 'monospace',
                                fontSize: '0.8rem'
                            }}
                            placeholder="Player1#EUW&#10;Player2#NA1&#10;..."
                            value={names}
                            onChange={(e) => setNames(e.target.value)}
                            disabled={!lcu || loading}
                        />
                    </div>

                    <div style={{ marginTop: '15px' }}>
                        <button 
                            className="primary-btn" 
                            onClick={handleInviteAll} 
                            disabled={!lcu || loading || (names.trim() === "" && selectedFriends.length === 0)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        >
                            <Play size={16} /> SEND ALL INVITATIONS
                        </button>
                    </div>
                </div>

                {/* Right Column: Friends List */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users size={20} color="var(--hextech-gold)" />
                            <h3 className="card-title" style={{ margin: 0 }}>Online Friends</h3>
                        </div>
                        <button 
                            className={`refresh-icon-btn ${isRefreshingFriends ? 'loading' : ''}`}
                            onClick={refreshFriends}
                            disabled={!lcu || isRefreshingFriends}
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    <div style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        maxHeight: '320px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '8px',
                        padding: '5px'
                    }}>
                        {friends.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                {lcu ? "No online friends found." : "Waiting for LCU..."}
                            </div>
                        ) : (
                            friends.map(friend => (
                                <div 
                                    key={friend.summonerId}
                                    onClick={() => toggleFriend(friend.summonerName)}
                                    style={{ 
                                        padding: '8px 12px',
                                        margin: '2px 0',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer',
                                        background: selectedFriends.includes(friend.summonerName) ? 'rgba(200, 155, 60, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: selectedFriends.includes(friend.summonerName) ? 'rgba(200, 155, 60, 0.4)' : 'transparent',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        background: statusColor(friend.availability),
                                        boxShadow: `0 0 5px ${statusColor(friend.availability)}`
                                    }} />
                                    <span style={{ fontSize: '0.85rem', flex: 1 }}>{friend.summonerName}</span>
                                    {selectedFriends.includes(friend.summonerName) && <CheckCircle2 size={14} color="var(--hextech-gold)" />}
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div style={{ marginTop: '10px', fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        Selected: {selectedFriends.length}
                    </div>
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
