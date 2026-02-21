import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLogs } from './useLogs';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    save: vi.fn(),
}));

describe('useLogs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should add a log entry with a unique ID', () => {
        const { result } = renderHook(() => useLogs());

        act(() => {
            result.current.addLog('Test message');
        });

        expect(result.current.logs).toHaveLength(1);
        expect(result.current.logs[0].msg).toBe('Test message');
        expect(result.current.logs[0].id).toBeDefined();
        expect(typeof result.current.logs[0].id).toBe('string');
    });

    it('should limit logs to 50 entries', () => {
        const { result } = renderHook(() => useLogs());

        act(() => {
            for (let i = 0; i < 60; i++) {
                result.current.addLog(`Message ${i}`);
            }
        });

        expect(result.current.logs).toHaveLength(50);
        expect(result.current.logs[0].msg).toBe('Message 59');
    });

    it('should clear logs', () => {
        const { result } = renderHook(() => useLogs());

        act(() => {
            result.current.addLog('Message');
            result.current.clearLogs();
        });

        expect(result.current.logs).toHaveLength(0);
    });
});
