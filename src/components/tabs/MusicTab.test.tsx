import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MusicTab from './MusicTab';
import { defaultMusicBioSettings } from '../../hooks/useMusicSync';

// Mock Tauri plugin-opener
vi.mock('@tauri-apps/plugin-opener', () => ({
    openUrl: vi.fn(),
}));

describe('MusicTab', () => {
    const mockProps = {
        lcu: { port: '1234', token: 'secret' },
        musicBio: defaultMusicBioSettings(),
        setMusicBio: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
        applyIdleBio: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render music auto bio card', () => {
        render(<MusicTab {...mockProps} />);
        expect(screen.getByText('Music Auto Bio')).toBeDefined();
        expect(screen.getByLabelText(/Last.fm Username/)).toBeDefined();
    });

    it('should handle enabling music sync', () => {
        const readyProps = {
            ...mockProps,
            musicBio: {
                ...mockProps.musicBio,
                lastfmUsername: 'user',
                lastfmApiKey: 'key'
            }
        };
        render(<MusicTab {...readyProps} />);

        const enableBtns = screen.getAllByText('Enable Auto Bio');
        const enableBtn = enableBtns.find(el => el.tagName === 'BUTTON');
        if (!enableBtn) throw new Error('Enable button not found');
        fireEvent.click(enableBtn);

        expect(readyProps.setMusicBio).toHaveBeenCalled();
        expect(readyProps.showToast).toHaveBeenCalledWith("Music sync enabled", "success");
    });

    it('should show error when enabling without credentials', () => {
        render(<MusicTab {...mockProps} />);
        const enableBtns = screen.getAllByText('Enable Auto Bio');
        const enableBtn = enableBtns.find(el => el.tagName === 'BUTTON');
        if (!enableBtn) throw new Error('Enable button not found');
        fireEvent.click(enableBtn);
        expect(mockProps.showToast).toHaveBeenCalledWith("Complete account fields first", "error");
    });

    it('should normalize last.fm username from URL', async () => {
        const setMusicBio = vi.fn();
        render(<MusicTab {...mockProps} setMusicBio={setMusicBio} />);

        const userInput = screen.getByLabelText(/Last.fm Username/);
        fireEvent.change(userInput, { target: { value: 'https://www.last.fm/user/tester' } });

        expect(setMusicBio).toHaveBeenCalled();
        const updateFn = setMusicBio.mock.calls[0][0];
        const newState = updateFn({ lastfmUsername: '' });
        expect(newState.lastfmUsername).toBe('tester');
    });
});
