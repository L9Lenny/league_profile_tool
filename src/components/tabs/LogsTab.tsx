import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Copy, Search, Terminal, AlertCircle, CheckCircle2, Info, ArrowDown, ArrowUp } from 'lucide-react';
import { LogEntry } from '../../hooks/useLogs';

interface LogsTabProps {
    logs: LogEntry[];
    exportLogs: (showToast: (text: string, type: string) => void) => Promise<void>;
    clearLogs: () => void;
    showToast: (text: string, type: string) => void;
}

interface ParsedLog {
    id: string;
    time: string;
    originalMsg: string;
    level: 'error' | 'success' | 'info';
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    status?: string;
    cleanMsg: string;
    jsonData?: any;
}

const LogsTab: React.FC<LogsTabProps> = ({ logs, exportLogs, clearLogs, showToast }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState<'all' | 'error' | 'success' | 'info'>('all');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [autoScroll, setAutoScroll] = useState(true);
    
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll log container when new logs arrive, taking sorting direction into account
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            if (sortOrder === 'desc') {
                logContainerRef.current.scrollTop = 0;
            } else {
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
            }
        }
    }, [logs, autoScroll, sortOrder]);

    const getLogLevel = (msg: string): 'error' | 'success' | 'info' => {
        const message = msg.toLowerCase();
        if (message.includes('failed') || message.includes('error') || message.includes('bad request') || message.includes('exception') || message.includes('err')) {
            return 'error';
        }
        if (message.includes('success') || message.includes('saved') || message.includes('loaded') || message.includes('connected') || message.includes('configured') || message.includes('fetched')) {
            return 'success';
        }
        return 'info';
    };

    const findJson = (str: string) => {
        const startIdx = str.indexOf('{');
        const endIdx = str.lastIndexOf('}');
        if (startIdx !== -1 && endIdx > startIdx) {
            const potentialJson = str.substring(startIdx, endIdx + 1);
            try {
                const parsed = JSON.parse(potentialJson);
                return {
                    parsed,
                    prefix: str.substring(0, startIdx).trim(),
                    suffix: str.substring(endIdx + 1).trim()
                };
            } catch (e) {
                // Ignore parsing errors
            }
        }
        const startArrIdx = str.indexOf('[');
        const endArrIdx = str.lastIndexOf(']');
        if (startArrIdx !== -1 && endArrIdx > startArrIdx) {
            const potentialJson = str.substring(startArrIdx, endArrIdx + 1);
            try {
                const parsed = JSON.parse(potentialJson);
                return {
                    parsed,
                    prefix: str.substring(0, startArrIdx).trim(),
                    suffix: str.substring(endArrIdx + 1).trim()
                };
            } catch (e) {
                // Ignore parsing errors
            }
        }
        return null;
    };

    const parseLog = (log: LogEntry): ParsedLog => {
        const level = getLogLevel(log.msg);
        let method: ParsedLog['method'];
        let status: string | undefined;
        let cleanMsg = log.msg;
        let jsonData: any = null;

        // Check for HTTP methods
        const methodMatch = log.msg.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/);
        if (methodMatch) {
            method = methodMatch[1] as ParsedLog['method'];
        }

        // Check for status codes
        const statusMatch = log.msg.match(/\b(200|201|204|400|401|403|404|500)\b/);
        if (statusMatch) {
            status = statusMatch[1];
        }

        // Try to find JSON payload
        const jsonInfo = findJson(log.msg);
        if (jsonInfo) {
            jsonData = jsonInfo.parsed;
            cleanMsg = jsonInfo.prefix;
            // Clean up trailing colons or separators if present before json
            if (cleanMsg.endsWith(':')) {
                cleanMsg = cleanMsg.slice(0, -1).trim();
            }
            if (jsonInfo.suffix) {
                cleanMsg += ' ' + jsonInfo.suffix;
            }
        }

        return {
            id: log.id,
            time: log.time,
            originalMsg: log.msg,
            level,
            method,
            status,
            cleanMsg,
            jsonData
        };
    };

    // Calculate logs severity count from raw logs
    const counts = useMemo(() => {
        let error = 0;
        let success = 0;
        let info = 0;
        logs.forEach(log => {
            const lvl = getLogLevel(log.msg);
            if (lvl === 'error') error++;
            else if (lvl === 'success') success++;
            else info++;
        });
        return { total: logs.length, error, success, info };
    }, [logs]);

    const filteredLogs = useMemo(() => {
        // Parse logs
        const parsed = logs.map(parseLog);
        
        // Filter by level
        let result = parsed;
        if (levelFilter !== 'all') {
            result = result.filter(log => log.level === levelFilter);
        }
        
        // Filter by search
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            result = result.filter(log => 
                log.originalMsg.toLowerCase().includes(query) || 
                log.time.toLowerCase().includes(query) ||
                (log.method && log.method.toLowerCase().includes(query)) ||
                (log.status && log.status.toLowerCase().includes(query))
            );
        }
        
        // Sort (default from useLogs is descending, index 0 is newest)
        if (sortOrder === 'asc') {
            return [...result].reverse();
        }
        return result;
    }, [logs, levelFilter, searchTerm, sortOrder]);

    const handleCopyAll = () => {
        if (!filteredLogs.length) {
            showToast("No logs to copy", "error");
            return;
        }
        const text = filteredLogs.map(log => `[${log.time}] ${log.originalMsg}`).join('\n');
        navigator.clipboard.writeText(text)
            .then(() => showToast("All logs copied to clipboard!", "success"))
            .catch(() => showToast("Failed to copy logs", "error"));
    };

    const highlightJson = (jsonObj: any): React.ReactNode => {
        const jsonStr = JSON.stringify(jsonObj, null, 2);
        if (!jsonStr) return null;
        
        const lines = jsonStr.split('\n');
        
        const tokenizeLine = (line: string): React.ReactNode => {
            const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
            const parts: React.ReactNode[] = [];
            let lastIndex = 0;
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                const index = match.index;
                if (index > lastIndex) {
                    parts.push(line.substring(lastIndex, index));
                }
                
                const token = match[0];
                if (token.startsWith('"')) {
                    if (token.endsWith(':')) {
                        parts.push(
                            <span key={index} className="json-key" style={{ color: 'var(--hextech-gold)', fontWeight: 500 }}>
                                {token.slice(0, -1)}
                            </span>
                        );
                        parts.push(':');
                    } else {
                        parts.push(
                            <span key={index} className="json-string" style={{ color: '#8cdcfe' }}>
                                {token}
                            </span>
                        );
                    }
                } else if (/^(true|false|null)$/.test(token)) {
                    parts.push(
                        <span key={index} className="json-boolean" style={{ color: '#569cd6', fontWeight: 600 }}>
                            {token}
                        </span>
                    );
                } else {
                    parts.push(
                        <span key={index} className="json-number" style={{ color: '#b5cea8' }}>
                            {token}
                        </span>
                    );
                }
                
                lastIndex = regex.lastIndex;
            }
            
            if (lastIndex < line.length) {
                parts.push(line.substring(lastIndex));
            }
            
            return parts;
        };

        return (
            <div className="json-code-container">
                {lines.map((line, idx) => (
                    <div key={idx} className="json-code-line">
                        <span className="json-line-number">{idx + 1}</span>
                        <span className="json-line-content">{tokenizeLine(line)}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="tab-content fadeIn">
            {/* Flat KPI statistics row */}
            <div className="log-stats-row">
                <div 
                    className={`log-stat-card ${levelFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('all')}
                >
                    <div className="log-stat-header">
                        <Terminal size={14} className="log-stat-icon-all" style={{ color: 'var(--text-secondary)' }} />
                        <span className="log-stat-label">Total Logs</span>
                    </div>
                    <div className="log-stat-value">{counts.total}</div>
                </div>
                <div 
                    className={`log-stat-card stat-error ${levelFilter === 'error' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('error')}
                >
                    <div className="log-stat-header">
                        <AlertCircle size={14} className="log-stat-icon-error" style={{ color: '#ff6b6b' }} />
                        <span className="log-stat-label">Errors</span>
                        {counts.error > 0 && <span className="error-pulse-dot" />}
                    </div>
                    <div className="log-stat-value text-error">{counts.error}</div>
                </div>
                <div 
                    className={`log-stat-card stat-success ${levelFilter === 'success' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('success')}
                >
                    <div className="log-stat-header">
                        <CheckCircle2 size={14} className="log-stat-icon-success" style={{ color: '#51cf66' }} />
                        <span className="log-stat-label">Successes</span>
                    </div>
                    <div className="log-stat-value text-success">{counts.success}</div>
                </div>
                <div 
                    className={`log-stat-card stat-info ${levelFilter === 'info' ? 'active' : ''}`}
                    onClick={() => setLevelFilter('info')}
                >
                    <div className="log-stat-header">
                        <Info size={14} className="log-stat-icon-info" style={{ color: 'var(--hextech-gold)' }} />
                        <span className="log-stat-label">System Info</span>
                    </div>
                    <div className="log-stat-value text-info">{counts.info}</div>
                </div>
            </div>

            <div className="card log-card">
                <div className="log-controls-bar">
                    <div className="log-search-wrapper">
                        <Search size={14} className="log-search-icon" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="log-search-input"
                        />
                        {searchTerm && (
                            <button 
                                className="log-search-clear"
                                onClick={() => setSearchTerm('')}
                                title="Clear search"
                            >
                                &times;
                            </button>
                        )}
                    </div>

                    {(searchTerm || levelFilter !== 'all') && (
                        <div className="log-filter-info">
                            MATCHES: {filteredLogs.length}/{logs.length}
                        </div>
                    )}
                    
                    <div className="log-actions-group">
                        <button
                            type="button"
                            className="ghost-btn log-control-btn"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            title={sortOrder === 'asc' ? "Showing oldest first. Click to show newest first" : "Showing newest first. Click to show oldest first"}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            {sortOrder === 'desc' ? (
                                <>
                                    <ArrowDown size={12} />
                                    <span>NEWEST</span>
                                </>
                            ) : (
                                <>
                                    <ArrowUp size={12} />
                                    <span>OLDEST</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            className={`ghost-btn log-control-btn ${autoScroll ? 'active-lock' : ''}`}
                            onClick={() => setAutoScroll(prev => !prev)}
                            title={autoScroll ? "Auto-scroll is locked" : "Auto-scroll is unlocked"}
                        >
                            {autoScroll ? 'LOCK SCROLL' : 'FREE SCROLL'}
                        </button>

                        <div className="log-divider" />

                        <button type="button" className="ghost-btn log-control-btn" onClick={handleCopyAll}>COPY</button>
                        <button type="button" className="ghost-btn log-control-btn" onClick={() => exportLogs(showToast)}>EXPORT</button>
                        <button type="button" className="ghost-btn log-control-btn" onClick={clearLogs}>CLEAR</button>
                    </div>
                </div>

                <div className="log-container-wrapper">
                    <div className="log-container" ref={logContainerRef} style={{ height: '420px', position: 'relative' }}>
                        {filteredLogs.length > 0 && <div className="log-timeline-track" />}
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => {
                                const isExpanded = expandedLogId === log.id;
                                return (
                                    <div key={log.id} className={`log-row-wrapper ${isExpanded ? 'expanded' : ''}`}>
                                        <div 
                                            className={`log-entry ${isExpanded ? 'active' : ''}`}
                                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="log-left-gutter">
                                                <div className={`log-indicator-dot ${log.level}`} />
                                            </div>
                                            
                                            <span className="log-time">[{log.time}]</span>
                                            
                                            <div className="log-content-row">
                                                {log.method && (
                                                    <span className={`log-badge-method badge-${log.method.toLowerCase()}`}>
                                                        {log.method}
                                                    </span>
                                                )}
                                                {log.status && (
                                                    <span className={`log-badge-status badge-${parseInt(log.status) >= 400 ? 'error' : 'success'}`}>
                                                        {log.status}
                                                    </span>
                                                )}
                                                {log.jsonData && (
                                                    <span className="log-badge-json">
                                                        [JSON]
                                                    </span>
                                                )}
                                                <span className="log-message-text">
                                                    {log.cleanMsg}
                                                </span>
                                            </div>

                                            <div className="log-row-actions" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className="log-copy-btn"
                                                    aria-label="Copy"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`[${log.time}] ${log.originalMsg}`)
                                                            .then(() => showToast("Log line copied!", "success"))
                                                            .catch(() => showToast("Failed to copy line", "error"));
                                                    }}
                                                    title="Copy log line"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {isExpanded && (
                                            <div className={`log-detail-pane ${log.level}`}>
                                                <div className="log-detail-raw-msg">{log.originalMsg}</div>
                                                {log.jsonData && (
                                                    <div className="log-detail-json-wrapper">
                                                        <div className="log-detail-header">
                                                            <span className="log-detail-title">JSON Payload</span>
                                                            <button
                                                                type="button"
                                                                className="log-detail-copy-btn"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(JSON.stringify(log.jsonData, null, 2))
                                                                        .then(() => showToast("JSON payload copied!", "success"))
                                                                        .catch(() => showToast("Failed to copy JSON", "error"));
                                                                }}
                                                            >
                                                                COPY JSON
                                                            </button>
                                                        </div>
                                                        {highlightJson(log.jsonData)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="log-empty-state">
                                <p style={{ margin: 0, opacity: 0.5 }}>
                                    {searchTerm 
                                        ? `No logs match "${searchTerm}"` 
                                        : levelFilter !== 'all' 
                                            ? `No ${levelFilter} logs recorded` 
                                            : 'No diagnostics available'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogsTab;
