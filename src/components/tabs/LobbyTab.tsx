import React, { useState, useEffect } from 'react';
import { Users, Play, RefreshCw, UserCheck } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface LobbyTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: any) => Promise<any>;
}

interface Friend {
    summonerId: number;
    summonerName: string;
    availability: string;
}

const LobbyTab: React.FC<LobbyTabProps> = ({ lcu, showToast, addLog, lcuRequest }) => {
    const [loading, setLoading] = useState(false);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
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
                        summonerName: f.gameName ? `${f.gameName}#${f.gameTag}` : (f.name || "Unknown"),
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

    const sendInvites = async (idsToInvite: number[]) => {
        if (!lcu || idsToInvite.length === 0) return;
        
        setLoading(true);
        addLog(`Attempting to invite ${idsToInvite.length} players by ID...`);

        try {
            // Check if we are in a lobby
            try {
                const currentLobby: any = await lcuRequest("GET", "/lol-lobby/v2/lobby");
                addLog(`Current lobby found: ${currentLobby?.gameConfig?.gameMode || "Custom/Other"}`);
            } catch (err: any) {
                addLog(`No active lobby (${err?.message || err}). Creating a new Normal 5v5 lobby...`);
                await lcuRequest("POST", "/lol-lobby/v2/lobby", { queueId: 430 }); 
            }

            // Send invitations using summonerId (more reliable)
            const invitations = idsToInvite.map(id => ({ toSummonerId: id }));
            await lcuRequest("POST", "/lol-lobby/v2/lobby/invitations", invitations);
            
            showToast(`Invited ${idsToInvite.length} players!`, "success");
            addLog(`Successfully sent ${idsToInvite.length} invitations.`);
            setSelectedIds([]);
        } catch (err: any) {
            const errorMsg = err?.message || String(err);
            showToast("Failed to send invitations", "error");
            addLog(`Invite error: ${errorMsg}`);
            
            if (errorMsg.includes("403") || errorMsg.includes("401")) {
                addLog("Hint: Make sure you are the lobby leader.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInviteSelected = () => sendInvites(selectedIds);
    
    const handleInviteAllAvailable = () => {
        const allIds = friends.map(f => f.summonerId);
        if (allIds.length === 0) {
            showToast("No available friends to invite", "error");
            return;
        }
        sendInvites(allIds);
    };

    const toggleFriend = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedIds(friends.map(f => f.summonerId));
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
                        <button type="button" 
                            className="primary-btn" 
                            onClick={selectAll} 
                            disabled={!lcu || loading || friends.length === 0}
                            style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                        >
                            SELECT ALL
                        </button>
                        <button type="button" 
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
                                <button type="button" 
                                    key={friend.summonerId}
                                    onClick={() => toggleFriend(friend.summonerId)}
                                    style={{ 
                                        width: '100%',
                                        textAlign: 'left',
                                        fontFamily: 'inherit',
                                        color: 'inherit',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        background: selectedIds.includes(friend.summonerId) ? 'rgba(200, 155, 60, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid',
                                        borderColor: selectedIds.includes(friend.summonerId) ? 'var(--hextech-gold)' : 'transparent',
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
                                    {selectedIds.includes(friend.summonerId) && <UserCheck size={16} color="var(--hextech-gold)" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button type="button" 
                        className="primary-btn" 
                        onClick={handleInviteSelected} 
                        disabled={!lcu || loading || selectedIds.length === 0}
                        style={{ background: 'transparent', border: '1px solid var(--hextech-gold)', color: 'var(--hextech-gold)' }}
                    >
                        INVITE SELECTED ({selectedIds.length})
                    </button>
                    <button type="button" 
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
