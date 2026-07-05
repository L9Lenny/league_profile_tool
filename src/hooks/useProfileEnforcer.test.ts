import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileEnforcer } from './useProfileEnforcer';
import {
    SAVED_AUTO_ENFORCE_KEY,
    SAVED_AVAILABILITY_KEY,
    SAVED_BIO_KEY,
    SAVED_ICON_KEY,
    SAVED_BACKGROUND_KEY,
    SAVED_TOKENS_KEY,
    SAVED_TITLE_KEY
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

    it('should not run auto-enforce if no lcu is connected or keys are not set', () => {
        renderHook(() => useProfileEnforcer(null, mockLcuRequest, mockAddLog));
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(mockLcuRequest).not.toHaveBeenCalled();
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

        mockLcuRequest.mockImplementation((method, endpoint) => {
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

    it('should retry operation on failure', async () => {
        localStorage.setItem(SAVED_AUTO_ENFORCE_KEY, 'true');
        localStorage.setItem(SAVED_ICON_KEY, '100');

        // Fails once, then succeeds
        mockLcuRequest
            .mockRejectedValueOnce(new Error('LCU Busy'))
            .mockResolvedValueOnce({});

        renderHook(() => useProfileEnforcer(mockLcu, mockLcuRequest, mockAddLog));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        await act(async () => {
            await Promise.resolve();
        });

        // Trigger the retry timer (10000ms in code)
        act(() => {
            vi.advanceTimersByTime(10000);
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockLcuRequest).toHaveBeenCalledTimes(2);
    });
});
