import React, { useState, useEffect, useMemo } from 'react';
import { Users, Trash2, Search, RefreshCw, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface FriendManagerTabProps {
    lcu: LcuInfo | null;
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
    groupName: string;
}

const FriendManagerTab: React.FC<FriendManagerTabProps> = ({ lcu, showToast, addLog, lcuRequest }) => {
    const [loading, setLoading] = useState(false);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [fetching, setFetching] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

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

    const deleteSelected = async () => {
        if (!lcu || selected.size === 0) return;
        if (!confirm(`Are you sure you want to remove ${selected.size} friends?`)) return;

        setLoading(true);
        let successCount = 0;
        setProgress({ current: 0, total: selected.size });

        for (const id of selected) {
            try {
                await lcuRequest("DELETE", `/lol-chat/v1/friends/${id}`);
                successCount++;
                setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            } catch (err) {
                addLog(`Failed to delete friend ${id}: ${err}`);
            }
        }

        showToast(`Successfully removed ${successCount} friends.`, "success");
        setSelected(new Set());
        fetchFriends();
        setLoading(false);
        setProgress({ current: 0, total: 0 });
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users size={24} color="var(--hextech-gold)" />
                        <h3 className="card-title" style={{ margin: 0 }}>Friend List Manager</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="token-picker-search" style={{ width: '250px' }}>
                            <Search size={16} />
                            <input 
                                type="text" 
                                placeholder="Search friends..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button type="button" className={`refresh-icon-btn ${fetching ? 'loading' : ''}`} onClick={fetchFriends}>
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

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
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" 
                            className="secondary-btn" 
                            style={{ padding: '6px 12px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => setSelected(new Set(selected.size === filteredFriends.length ? [] : filteredFriends.map(f => f.id)))}
                        >
                            {selected.size === filteredFriends.length ? "DESELECT ALL" : "SELECT ALL VISIBLE"}
                        </button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center', marginLeft: '10px' }}>
                            Selected: <strong style={{ color: 'var(--hextech-gold)' }}>{selected.size}</strong>
                        </span>
                    </div>
                    
                    <button type="button" 
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

                {loading && progress.total > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--hextech-gold)', marginBottom: '5px' }}>
                            <span>REMOVING FRIENDS...</span>
                            <span>{progress.current} / {progress.total}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: 'var(--hextech-gold)', transition: 'width 0.3s ease-out' }} />
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', maxHeight: '550px', overflowY: 'auto' }}>
                    {filteredFriends.map(friend => {
                        const getAvailabilityColor = (avail: string) => {
                            if (avail === 'chat') return '#00ff88';
                            if (avail === 'away') return '#ffcc00';
                            return '#888';
                        };

                        const isSelected = selected.has(friend.id);

                        return (
                            <button type="button" 
                                key={friend.id}
                                className={`feature-card ${isSelected ? 'active' : ''}`}
                                onClick={() => toggleSelect(friend.id)}
                                style={{ 
                                    width: '100%',
                                    textAlign: 'left',
                                    fontFamily: 'inherit',
                                    color: 'inherit',
                                    padding: '12px', 
                                    border: isSelected ? '1px solid #ff4e50' : '1px solid rgba(255,255,255,0.05)',
                                    background: isSelected ? 'rgba(255, 78, 80, 0.05)' : 'rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ color: isSelected ? '#ff4e50' : 'var(--text-secondary)' }}>
                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                </div>
                                
                                <div style={{ position: 'relative' }}>
                                    <img src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${friend.icon}.jpg`} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                    <div style={{ 
                                        position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', 
                                        background: getAvailabilityColor(friend.availability),
                                        border: '1.5px solid black'
                                    }} />
                                </div>

                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friend.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{friend.availability.toUpperCase()} {friend.groupName ? ` • ${friend.groupName}` : ''}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="card" style={{ marginTop: '15px', background: 'rgba(255, 78, 80, 0.05)', border: '1px solid rgba(255, 78, 80, 0.2)', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <AlertCircle size={20} color="#ff4e50" />
                    <p style={{ fontSize: '0.8rem', margin: 0, color: '#ff4e50' }}><strong>Warning:</strong> Action is permanent. Friends will not be notified.</p>
                </div>
            </div>
        </div>
    );
};

export default FriendManagerTab;
