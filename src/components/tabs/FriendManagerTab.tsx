import React, { useState, useEffect, useMemo } from 'react';
import { Users, Trash2, Search, Filter, UserMinus, CheckSquare, Square, RefreshCw, AlertCircle } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface FriendManagerTabProps {
    lcu: LcuInfo | null;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<any>;
}

interface Friend {
    id: string;
    summonerId: number;
    name: string;
    availability: string;
    statusMessage: string;
    icon: number;
    groupId: number;
    groupName: string;
}

const FriendManagerTab: React.FC<FriendManagerTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [fetching, setFetching] = useState(false);

    const fetchFriends = async () => {
        if (!lcu) return;
        setFetching(true);
        try {
            const data: any = await lcuRequest("GET", "/lol-chat/v1/friends");
            if (Array.isArray(data)) {
                setFriends(data.map(f => ({
                    id: f.id,
                    summonerId: f.summonerId,
                    name: f.gameName ? `${f.gameName}#${f.gameTag}` : f.name,
                    availability: f.availability,
                    statusMessage: f.statusMessage,
                    icon: f.icon,
                    groupId: f.groupId,
                    groupName: f.groupName
                })));
            }
        } catch (err) {
            addLog(`Error fetching friends: ${err}`);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (lcu) fetchFriends();
    }, [lcu]);

    const filteredFriends = useMemo(() => {
        return friends.filter(f => 
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.groupName.toLowerCase().includes(search.toLowerCase())
        );
    }, [friends, search]);

    const toggleSelect = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const selectOffline = () => {
        const offlineIds = friends
            .filter(f => f.availability === 'offline' || f.availability === 'mobile')
            .map(f => f.id);
        setSelected(new Set(offlineIds));
    };

    const deleteSelected = async () => {
        if (!lcu || selected.size === 0) return;
        if (!confirm(`Are you sure you want to remove ${selected.size} friends? This action cannot be undone.`)) return;

        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const id of selected) {
            try {
                // Endpoint example: /lol-chat/v1/friends/00112233-4455-6677-8899-aabbccddeeff
                await lcuRequest("DELETE", `/lol-chat/v1/friends/${id}`);
                successCount++;
            } catch (err) {
                failCount++;
                addLog(`Failed to delete friend ${id}: ${err}`);
            }
        }

        showToast(`Successfully removed ${successCount} friends.`, successCount > 0 ? "success" : "error");
        if (failCount > 0) addLog(`Failed to remove ${failCount} friends.`);
        
        setSelected(new Set());
        fetchFriends();
        setLoading(false);
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users size={24} color="var(--hextech-gold)" />
                        <h3 className="card-title" style={{ margin: 0 }}>Smart Friend Cleaner</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="token-picker-search" style={{ width: '250px' }}>
                            <Search size={16} />
                            <input 
                                type="text" 
                                placeholder="Search friends or groups..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button 
                            className={`refresh-icon-btn ${fetching ? 'loading' : ''}`}
                            onClick={fetchFriends}
                            disabled={fetching}
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 15px', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '8px',
                    marginBottom: '15px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button 
                            className="music-badge" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelected(new Set(selected.size === filteredFriends.length ? [] : filteredFriends.map(f => f.id)))}
                        >
                            {selected.size === filteredFriends.length ? "Deselect All" : "Select All Visible"}
                        </button>
                        <button 
                            className="music-badge" 
                            style={{ cursor: 'pointer', background: 'rgba(255, 78, 80, 0.1)', color: '#ff4e50', border: '1px solid rgba(255, 78, 80, 0.2)' }}
                            onClick={selectOffline}
                        >
                            Select All Inactive/Mobile
                        </button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Selected: <strong style={{ color: 'var(--hextech-gold)' }}>{selected.size}</strong>
                        </span>
                    </div>
                    
                    <button 
                        className="primary-btn"
                        style={{ 
                            background: selected.size > 0 ? '#ff4e50' : 'rgba(255,255,255,0.05)', 
                            color: selected.size > 0 ? 'white' : '#555',
                            padding: '8px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: 'none',
                            cursor: selected.size > 0 ? 'pointer' : 'not-allowed'
                        }}
                        disabled={selected.size === 0 || loading}
                        onClick={deleteSelected}
                    >
                        <Trash2 size={16} /> DELETE SELECTED
                    </button>
                </div>

                {/* Friends List */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '10px',
                    maxHeight: '550px',
                    overflowY: 'auto',
                    paddingRight: '5px'
                }}>
                    {filteredFriends.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>
                            <p>No friends found.</p>
                        </div>
                    ) : (
                        filteredFriends.map(friend => (
                            <div 
                                key={friend.id}
                                className={`feature-card ${selected.has(friend.id) ? 'active' : ''}`}
                                onClick={() => toggleSelect(friend.id)}
                                style={{ 
                                    padding: '12px', 
                                    cursor: 'pointer', 
                                    border: selected.has(friend.id) ? '1px solid #ff4e50' : '1px solid rgba(255,255,255,0.05)',
                                    background: selected.has(friend.id) ? 'rgba(255, 78, 80, 0.05)' : 'rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                <div style={{ color: selected.has(friend.id) ? '#ff4e50' : 'var(--text-secondary)' }}>
                                    {selected.has(friend.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                </div>
                                
                                <div style={{ position: 'relative' }}>
                                    <img 
                                        src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${friend.icon}.jpg`}
                                        alt=""
                                        style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }}
                                    />
                                    <div style={{ 
                                        position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', 
                                        borderRadius: '50%', background: friend.availability === 'chat' ? '#00ff88' : friend.availability === 'away' ? '#ffcc00' : '#888',
                                        border: '2px solid black'
                                    }} />
                                </div>

                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {friend.name}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                        {friend.groupName || "No Group"} • {friend.availability.toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: '15px', background: 'rgba(255, 78, 80, 0.05)', border: '1px solid rgba(255, 78, 80, 0.2)' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <AlertCircle size={20} color="#ff4e50" />
                    <p style={{ fontSize: '0.8rem', margin: 0, color: '#ff4e50' }}>
                        <strong>Warning:</strong> Deleting friends is permanent. Deleted friends will not be notified, but you will disappear from their friend list.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FriendManagerTab;
