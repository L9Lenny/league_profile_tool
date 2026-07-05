import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import PresetsTab from './PresetsTab';
import {
    SAVED_AVAILABILITY_KEY,
    SAVED_BIO_KEY,
    SAVED_ICON_KEY,
    SAVED_BACKGROUND_KEY,
    SAVED_TOKENS_KEY,
    SAVED_TITLE_KEY
} from '../../storageKeys';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('PresetsTab', () => {
    const mockLcu = { port: '1234', token: 'secret' };
    const mockShowToast = vi.fn();
    const mockAddLog = vi.fn();
    const mockLcuRequest = vi.fn();

    const mockPresets = [
        {
            id: 'preset-1',
            name: 'Classic Solo Queue',
            bio: 'Tryharding',
            availability: 'dnd',
            iconId: '500',
            backgroundId: '266000',
            tokens: '[1,2,3]',
            title: 'Challenger',
            bannerAccent: '3',
            crestBorder: '5'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockPresets));
        mockLcuRequest.mockImplementation((method: string, endpoint: string) => {
            if (method === 'GET' && endpoint.includes('summary-player-data')) {
                return Promise.resolve({ bannerAccent: '3', crestBorder: '5', prestigeCrestBorderLevel: 0 });
            }
            return Promise.resolve({});
        });
    });

    it('should render profiles presets header and load items from Tauri disk storage', async () => {
        render(
            <PresetsTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        expect(screen.getByText('Profile Presets')).toBeDefined();
        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('load_presets');
            expect(screen.getByText('Classic Solo Queue')).toBeDefined();
        });
    });

    it('should fall back to localStorage migration if disk load fails', async () => {
        vi.mocked(invoke).mockRejectedValueOnce(new Error('Disk read failed'));
        localStorage.setItem('profile_presets_list_v1', JSON.stringify(mockPresets));

        render(
            <PresetsTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Classic Solo Queue')).toBeDefined();
            expect(invoke).toHaveBeenCalledWith('save_presets', { data: JSON.stringify(mockPresets) });
        });
    });

    it('should support saving the current profile status as a new preset', async () => {
        localStorage.setItem(SAVED_BIO_KEY, 'Best Mid EUW');
        localStorage.setItem(SAVED_AVAILABILITY_KEY, 'chat');
        localStorage.setItem(SAVED_ICON_KEY, '23');
        localStorage.setItem(SAVED_BACKGROUND_KEY, '103001');
        localStorage.setItem(SAVED_TOKENS_KEY, '[1,2,3]');
        localStorage.setItem(SAVED_TITLE_KEY, 'Challenger');

        render(
            <PresetsTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Classic Solo Queue')).toBeDefined();
        });

        const nameInput = screen.getByPlaceholderText(/edgy setup/i);
        await act(async () => {
            fireEvent.change(nameInput, { target: { value: 'My Custom Preset' } });
        });

        const saveBtn = screen.getByText('SAVE PRESET');
        await act(async () => {
            fireEvent.click(saveBtn);
        });

        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('save_presets', expect.any(Object));
            expect(mockShowToast).toHaveBeenCalledWith('Preset "My Custom Preset" saved!', 'success');
        });
    });

    it('should apply a chosen preset successfully to the League client via LCU endpoint triggers', async () => {
        render(
            <PresetsTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Classic Solo Queue')).toBeDefined();
        });

        const loadBtn = screen.getByText('LOAD');
        await act(async () => {
            fireEvent.click(loadBtn);
        });

        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('update_bio', { port: '1234', token: 'secret', newBio: 'Tryharding' });
            expect(mockLcuRequest).toHaveBeenCalledWith('PUT', '/lol-chat/v1/me', { availability: 'dnd' });
            expect(mockLcuRequest).toHaveBeenCalledWith('PUT', '/lol-summoner/v1/current-summoner/icon', { profileIconId: 500 });
            expect(mockLcuRequest).toHaveBeenCalledWith('POST', '/lol-summoner/v1/current-summoner/summoner-profile', {
                key: 'backgroundSkinId',
                value: 266000
            });
            expect(mockLcuRequest).toHaveBeenCalledWith('POST', '/lol-challenges/v1/update-player-preferences', {
                challengeIds: [1, 2, 3],
                title: 'Challenger',
                bannerAccent: '3',
                crestBorder: '5',
                prestigeCrestBorderLevel: 0
            });
            expect(mockShowToast).toHaveBeenCalledWith('Preset "Classic Solo Queue" applied successfully!', 'success');
        });
    });

    it('should delete a selected preset', async () => {
        render(
            <PresetsTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Classic Solo Queue')).toBeDefined();
        });

        const deleteBtn = screen.getByTitle('Delete preset');
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('save_presets', { data: '[]' });
            expect(mockShowToast).toHaveBeenCalledWith('Preset deleted.', 'success');
        });
    });
});
