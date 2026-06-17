import React from 'react';
import { LogEntry } from '../../hooks/useLogs';

interface LogsTabProps {
    logs: LogEntry[];
    exportLogs: (showToast: (text: string, type: string) => void) => Promise<void>;
    clearLogs: () => void;
    showToast: (text: string, type: string) => void;
}

const LogsTab: React.FC<LogsTabProps> = ({ logs, exportLogs, clearLogs, showToast }) => {
    const handleCopy = () => {
        const text = logs.map(log => `[${log.time}] ${log.msg}`).join('\n');
        navigator.clipboard.writeText(text)
            .then(() => showToast("Logs copied to clipboard!", "success"))
            .catch(() => showToast("Failed to copy logs", "error"));
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>System Logs</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" className="ghost-btn" onClick={handleCopy}>COPY</button>
                        <button type="button" className="ghost-btn" onClick={() => exportLogs(showToast)}>EXPORT</button>
                        <button type="button" className="ghost-btn" onClick={clearLogs}>CLEAR</button>
                    </div>
                </div>
                <div className="log-container" style={{ height: '400px' }}>
                    {logs.map((log) => (
                        <div key={log.id} className="log-entry">
                            <span className="log-text">
                                <span className="log-time">[{log.time}]</span>
                                {log.msg}
                            </span>
                            <button
                                type="button"
                                className="log-copy-btn"
                                onClick={() => {
                                    navigator.clipboard.writeText(`[${log.time}] ${log.msg}`)
                                        .then(() => showToast("Log line copied!", "success"))
                                        .catch(() => showToast("Failed to copy line", "error"));
                                }}
                                title="Copy this log line"
                            >
                                Copy
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LogsTab;
