import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileEnforcer } from './useProfileEnforcer';
import {
    SAVED_AUTO_ENFORCE_KEY,
    SAVED_AVAILABILITY_KEY,
    SAVED_BIO_KEY,
    SAVED_ICON_KEY,
    SAVED_BACKGROUND_KEY,
    SAVED_TOKENS_KEY,
    SAVED_TITLE_KEY,
    SAVED_RANK_QUEUE_KEY,
    SAVED_RANK_TIER_KEY,
    SAVED_RANK_DIV_KEY,
    SAVED_CHALLENGE_CRYSTAL_KEY,
    SAVED_CHALLENGE_POINTS_KEY
} from '../storageKeys';

describe('useProfileEnforcer', () => {
    const mockLcu = { port: '1234', token: 'secret' };
    const mockLcuRequest = vi.fn();
    const mockAddLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should not run auto-enforce if no lcu is connected or keys are not set', () => {
        renderHook(() => useProfileEnforcer(null, mockLcuRequest, mockAddLog));
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(mockLcuRequest).not.toHaveBeenCalled();
    });

    it('should not send title -1 in auto-enforce payload', async () => {
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, 'true');
        localStorage.setItem(SAVED_ICON_KEY, '100');
        localStorage.setItem(SAVED_TOKENS_KEY, '[1]');
        localStorage.setItem(SAVED_TITLE_KEY, '-1');

        mockLcuRequest.mockImplementation((method: string, endpoint: string) => {
            if (method === 'GET' && endpoint.includes('summary-player-data')) {
                return Promise.resolve({ bannerId: '3', crestId: '5', prestigeCrestBorderLevel: 0 });
            }
            return Promise.resolve({});
        });

        renderHook(() => useProfileEnforcer(mockLcu, mockLcuRequest, mockAddLog));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        const updateCall = mockLcuRequest.mock.calls.find(
            (c: any[]) => c[0] === 'POST' && c[1].includes('update-player-preferences')
        );
        expect(updateCall).toBeDefined();
        expect(updateCall![2].title).toBeUndefined();
        expect(updateCall![2].challengeIds).toEqual([1]);
    });

    it('should run auto-enforce and call endpoints if keys are set and auto-enforce is active', async () => {
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, 'true');
        localStorage.setItem(SAVED_ICON_KEY, '100');
        localStorage.setItem(SAVED_AVAILABILITY_KEY, 'dnd');
        localStorage.setItem(SAVED_BIO_KEY, 'custom bio');
        localStorage.setItem(SAVED_BACKGROUND_KEY, '266000');
        localStorage.setItem(SAVED_TOKENS_KEY, '[1,2]');
        localStorage.setItem(SAVED_TITLE_KEY, 'Challenger');

        mockLcuRequest.mockImplementation((method: string, endpoint: string) => {
            if (method === 'GET' && endpoint.includes('summary-player-data')) {
                return Promise.resolve({ bannerAccent: '3', crestBorder: '5', prestigeCrestBorderLevel: 0 });
            }
            return Promise.resolve({});
        });

        renderHook(() => useProfileEnforcer(mockLcu, mockLcuRequest, mockAddLog));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        // The hook uses async functions inside setTimeout, so we need to wait for promises to resolve
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockLcuRequest).toHaveBeenCalledWith('PUT', '/lol-chat/v1/me', { icon: 100 });
        expect(mockLcuRequest).toHaveBeenCalledWith('PUT', '/lol-chat/v1/me', { availability: 'dnd', statusMessage: 'custom bio' });
        expect(mockLcuRequest).toHaveBeenCalledWith('POST', '/lol-summoner/v1/current-summoner/summoner-profile/', {
            key: 'backgroundSkinId',
            value: 266000
        });
        expect(mockLcuRequest).toHaveBeenCalledWith('POST', '/lol-challenges/v1/update-player-preferences', {
            challengeIds: [1, 2],
            title: 'Challenger',
            bannerAccent: '3',
            crestBorder: '5',
            prestigeCrestBorderLevel: 0
        });
    });

    it('should fallback to chat presence update for background skin if official update fails', async () => {
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, 'true');
        localStorage.setItem(SAVED_BACKGROUND_KEY, '266000');

        mockLcuRequest.mockImplementation((method: string, endpoint: string) => {
            if (method === 'POST' && endpoint.includes('summoner-profile')) {
                return Promise.reject(new Error('Failed official update'));
            }
            if (method === 'GET' && endpoint === '/lol-chat/v1/me') {
                return Promise.resolve({ lol: '{"someKey":"val"}' });
            }
            return Promise.resolve({});
        });

        renderHook(() => useProfileEnforcer(mockLcu, mockLcuRequest, mockAddLog));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockLcuRequest).toHaveBeenCalledWith('GET', '/lol-chat/v1/me');
        expect(mockLcuRequest).toHaveBeenCalledWith('PUT', '/lol-chat/v1/me', {
            lol: { someKey: 'val', backgroundSkinId: '266000' }
        });
    });

    it('should enforce rank overrides when saved keys are present', async () => {
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, 'true');
        localStorage.setItem(SAVED_RANK_TIER_KEY, 'CHALLENGER');
        localStorage.setItem(SAVED_RANK_DIV_KEY, 'I');
        localStorage.setItem(SAVED_RANK_QUEUE_KEY, 'RANKED_SOLO_5x5');

        mockLcuRequest.mockImplementation((method: string, endpoint: string) => {
            if (method === 'GET' && endpoint === '/lol-chat/v1/me') {
                return Promise.resolve({ lol: { backgroundSkinId: '266000' } });
            }
            return Promise.resolve({});
        });

        renderHook(() => useProfileEnforcer(mockLcu, mockLcuRequest, mockAddLog));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockLcuRequest).toHaveBeenCalledWith('PUT', '/lol-chat/v1/me', {
            lol: {
                backgroundSkinId: '266000',
                rankedLeagueTier: 'CHALLENGER',
                rankedLeagueDivision: 'I',
                rankedLeagueQueue: 'RANKED_SOLO_5x5'
            }
        });
    });

    it('should enforce challenge points and crystal level', async () => {
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, 'true');
        localStorage.setItem(SAVED_CHALLENGE_CRYSTAL_KEY, 'DIAMOND');
        localStorage.setItem(SAVED_CHALLENGE_POINTS_KEY, '9500');

        mockLcuRequest.mockImplementation((method: string, endpoint: string) => {
            if (method === 'GET' && endpoint === '/lol-chat/v1/me') {
                return Promise.resolve({ lol: {} });
            }
            return Promise.resolve({});
        });

        renderHook(() => useProfileEnforcer(mockLcu, mockLcuRequest, mockAddLog));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockLcuRequest).toHaveBeenCalledWith('PUT', '/lol-chat/v1/me', {
            lol: {
                challengeCrystalLevel: 'DIAMOND',
                challengePoints: '9500'
            }
        });
    });

    it('should merge rank/challenge overrides with existing lol object properties', async () => {
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, 'true');
        localStorage.setItem(SAVED_RANK_TIER_KEY, 'MASTER');
        localStorage.setItem(SAVED_CHALLENGE_POINTS_KEY, '5000');

        mockLcuRequest.mockImplementation((method: string, endpoint: string) => {
            if (method === 'GET' && endpoint === '/lol-chat/v1/me') {
                return Promise.resolve({
                    lol: '{"backgroundSkinId":"266000","someOtherProp":"keep"}'
                });
            }
            return Promise.resolve({});
        });

        renderHook(() => useProfileEnforcer(mockLcu, mockLcuRequest, mockAddLog));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockLcuRequest).toHaveBeenCalledWith('PUT', '/lol-chat/v1/me', {
            lol: {
                backgroundSkinId: '266000',
                someOtherProp: 'keep',
                rankedLeagueTier: 'MASTER',
                challengePoints: '5000'
            }
        });
    });

    it('should re-apply settings on the polling interval (after game reset)', async () => {
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, 'true');
        localStorage.setItem(SAVED_ICON_KEY, '200');

        mockLcuRequest.mockResolvedValue({});

        renderHook(() => useProfileEnforcer(mockLcu, mockLcuRequest, mockAddLog));

        // Initial enforcement after 5s delay
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        await act(async () => {
            await Promise.resolve();
        });

        const callsAfterInitial = mockLcuRequest.mock.calls.length;
        expect(callsAfterInitial).toBeGreaterThan(0);

        mockLcuRequest.mockClear();

        // Advance to the polling interval (15s)
        act(() => {
            vi.advanceTimersByTime(15000);
        });

        await act(async () => {
            await Promise.resolve();
        });

        // Should have re-applied the icon
        expect(mockLcuRequest).toHaveBeenCalledWith('PUT', '/lol-chat/v1/me', { icon: 200 });
    });

    it('should only log verbosely on first enforcement, not on polling cycles', async () => {
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, 'true');
        localStorage.setItem(SAVED_ICON_KEY, '100');

        mockLcuRequest.mockResolvedValue({});

        renderHook(() => useProfileEnforcer(mockLcu, mockLcuRequest, mockAddLog));

        // Initial enforcement
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockAddLog).toHaveBeenCalledWith("LCU connected. Auto-Enforcer applying saved profile settings...");
        expect(mockAddLog).toHaveBeenCalledWith("Auto-Enforcer: Applied custom Icon.");
        expect(mockAddLog).toHaveBeenCalledWith("Auto-Enforcer restoration flow completed.");

        mockAddLog.mockClear();

        // Polling cycle — should NOT produce verbose logs
        act(() => {
            vi.advanceTimersByTime(15000);
        });

        await act(async () => {
            await Promise.resolve();
        });

        // No verbose logs on subsequent polls
        expect(mockAddLog).not.toHaveBeenCalledWith("LCU connected. Auto-Enforcer applying saved profile settings...");
        expect(mockAddLog).not.toHaveBeenCalledWith("Auto-Enforcer: Applied custom Icon.");
    });
});
