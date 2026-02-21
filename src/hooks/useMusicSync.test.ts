import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
    useMusicSync,
    clampPollInterval,
    truncateBio,
    buildBioFromTemplate,
    DEFAULT_IDLE_BIO
} from './useMusicSync';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('useMusicSync utilities', () => {
    it('clampPollInterval should bound values between 5 and 120', () => {
        expect(clampPollInterval(1)).toBe(5);
        expect(clampPollInterval(10)).toBe(10);
        expect(clampPollInterval(200)).toBe(120);
        expect(clampPollInterval(NaN)).toBe(15);
    });

    it('truncateBio should trim and limit length', () => {
        expect(truncateBio('  hello  ')).toBe('hello');
        expect(truncateBio('a'.repeat(200))).toBe('a'.repeat(124) + '...');
        expect(truncateBio('short')).toBe('short');
    });

    it('buildBioFromTemplate should replace tokens correctly', () => {
        const template = '{title} by {artist} from {album} on {source}';
        const track = {
            title: 'Song',
            artist: 'Artist',
            album: 'Album',
            sourceLabel: 'Spotify'
        };
        expect(buildBioFromTemplate(template, track)).toBe('Song by Artist from Album on Spotify');
    });
});

describe('useMusicSync hook', () => {
    const mockAddLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.useFakeTimers();
    });

    it('should initialize with default settings', () => {
        const { result } = renderHook(() => useMusicSync(null, mockAddLog));
        expect(result.current.musicBio.enabled).toBe(false);
        expect(result.current.musicBio.idleText).toBe(DEFAULT_IDLE_BIO);
    });

    it('should load settings from localStorage', async () => {
        const savedSettings = {
            enabled: true,
            pollIntervalSec: 30,
            idleText: 'Custom Idle'
        };
        localStorage.setItem('music_bio_settings_v1', JSON.stringify(savedSettings));

        const { result } = renderHook(() => useMusicSync(null, mockAddLog));

        // settings hydration is an effect, so we might need to wait or check after render
        expect(result.current.musicBio.enabled).toBe(true);
        expect(result.current.musicBio.pollIntervalSec).toBe(30);
        expect(result.current.musicBio.idleText).toBe('Custom Idle');
    });
});
