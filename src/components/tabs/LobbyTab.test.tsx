import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import LobbyTab from './LobbyTab';

describe('LobbyTab', () => {
    const mockLcu = { port: '1234', token: 'secret' };
    const mockShowToast = vi.fn();
    const mockAddLog = vi.fn();
    const mockLcuRequest = vi.fn();

    const mockFriends = [
        {
            summonerId: 201,
            name: 'Lobby Friend 1',
            gameName: 'Lobby Friend 1',
            gameTag: 'TAG',
            availability: 'chat'
        },
        {
            summonerId: 202,
            name: 'Lobby Friend 2',
            gameName: 'Lobby Friend 2',
            gameTag: 'TAG',
            availability: 'dnd'
        },
        {
            summonerId: 203,
            name: 'Offline Friend',
            gameName: 'Offline Friend',
            gameTag: 'TAG',
            availability: 'offline'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockLcuRequest.mockResolvedValue(mockFriends);
    });

    it('should render details and fetch online/dnd friends list', async () => {
        render(
            <LobbyTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        expect(screen.getByText('Lobby Manager')).toBeDefined();
        await waitFor(() => {
            expect(mockLcuRequest).toHaveBeenCalledWith('GET', '/lol-chat/v1/friends');
            expect(screen.getByText('Lobby Friend 1#TAG')).toBeDefined();
            expect(screen.getByText('Lobby Friend 2#TAG')).toBeDefined();
            expect(screen.queryByText('Offline Friend#TAG')).toBeNull();
        });
    });

    it('should handle toggle select items and invite selected players', async () => {
        // Mock check current lobby endpoint fails to trigger lobby creation, then mock invitations post
        mockLcuRequest
            .mockResolvedValueOnce(mockFriends) // initial fetch
            .mockRejectedValueOnce(new Error('Lobby not found')) // check lobby
            .mockResolvedValueOnce({}) // post lobby creation
            .mockResolvedValueOnce({}); // post invitations

        render(
            <LobbyTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Lobby Friend 1#TAG')).toBeDefined();
        });

        const friendBtn = screen.getByText('Lobby Friend 1#TAG').closest('button');
        if (!friendBtn) throw new Error('Lobby Friend 1 item not found');

        await act(async () => {
            fireEvent.click(friendBtn);
        });

        const inviteSelectedBtn = screen.getByText(/INVITE SELECTED/);
        await act(async () => {
            fireEvent.click(inviteSelectedBtn);
        });

        await waitFor(() => {
            expect(mockLcuRequest).toHaveBeenCalledWith('POST', '/lol-lobby/v2/lobby', { queueId: 430 });
            expect(mockLcuRequest).toHaveBeenCalledWith('POST', '/lol-lobby/v2/lobby/invitations', [{ toSummonerId: 201 }]);
            expect(mockShowToast).toHaveBeenCalledWith('Invited 1 players!', 'success');
        });
    });

    it('should handle inviting all available online friends', async () => {
        mockLcuRequest
            .mockResolvedValueOnce(mockFriends) // initial fetch
            .mockResolvedValueOnce({ gameConfig: { gameMode: 'CLASSIC' } }) // check current lobby (exists)
            .mockResolvedValueOnce({}); // post invitations

        render(
            <LobbyTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Lobby Friend 1#TAG')).toBeDefined();
        });

        const inviteAllBtn = screen.getByText(/INVITE ALL AVAILABLE/);
        await act(async () => {
            fireEvent.click(inviteAllBtn);
        });

        await waitFor(() => {
            expect(mockLcuRequest).toHaveBeenCalledWith('POST', '/lol-lobby/v2/lobby/invitations', [
                { toSummonerId: 201 },
                { toSummonerId: 202 }
            ]);
            expect(mockShowToast).toHaveBeenCalledWith('Invited 2 players!', 'success');
        });
    });
});
