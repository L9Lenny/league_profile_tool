import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import FriendManagerTab from './FriendManagerTab';

describe('FriendManagerTab', () => {
    const mockLcu = { port: '1234', token: 'secret' };
    const mockShowToast = vi.fn();
    const mockAddLog = vi.fn();
    const mockLcuRequest = vi.fn();

    const mockFriends = [
        {
            id: 'friend-1',
            summonerId: 101,
            name: 'Friend One',
            gameName: 'Friend One',
            gameTag: 'EUW',
            availability: 'chat',
            statusMessage: 'Playing',
            icon: 1,
            groupName: 'General'
        },
        {
            id: 'friend-2',
            summonerId: 102,
            name: 'Friend Two',
            gameName: 'Friend Two',
            gameTag: 'NA',
            availability: 'away',
            statusMessage: 'AFK',
            icon: 2,
            groupName: 'Custom'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockLcuRequest.mockResolvedValue(mockFriends);
    });

    it('should render component details and load friends list on mount', async () => {
        render(
            <FriendManagerTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        expect(screen.getByText('Friend List Manager')).toBeDefined();
        await waitFor(() => {
            expect(mockLcuRequest).toHaveBeenCalledWith('GET', '/lol-chat/v1/friends');
            expect(screen.getByText(/Friend One/)).toBeDefined();
            expect(screen.getByText(/Friend Two/)).toBeDefined();
        });
    });

    it('should handle offline/disconnected state', () => {
        render(
            <FriendManagerTab 
                lcu={null} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        expect(screen.queryByText(/Friend One/)).toBeNull();
        expect(mockLcuRequest).not.toHaveBeenCalled();
    });

    it('should filter friends by search query input', async () => {
        render(
            <FriendManagerTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Friend One/)).toBeDefined();
        });

        const searchInput = screen.getByPlaceholderText('Search friends...');
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Custom' } });
        });

        expect(screen.queryByText(/Friend One/)).toBeNull();
        expect(screen.getByText(/Friend Two/)).toBeDefined();
    });

    it('should handle single selection and select all toggle buttons', async () => {
        render(
            <FriendManagerTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Friend One/)).toBeDefined();
        });

        const selectAllBtn = screen.getByText('SELECT ALL VISIBLE');
        await act(async () => {
            fireEvent.click(selectAllBtn);
        });

        expect(screen.getByText('Selected:')).toBeDefined();
        expect(screen.getByText('2')).toBeDefined();

        await act(async () => {
            fireEvent.click(screen.getByText('DESELECT ALL'));
        });
        expect(screen.getByText('0')).toBeDefined();
    });

    it('should prompt and delete selected friends list via LCU delete endpoints', async () => {
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        mockLcuRequest
            .mockResolvedValueOnce(mockFriends) // initial fetch
            .mockResolvedValueOnce({}) // delete friend 1
            .mockResolvedValueOnce([]); // refresh list after delete

        render(
            <FriendManagerTab 
                lcu={mockLcu} 
                showToast={mockShowToast} 
                addLog={mockAddLog} 
                lcuRequest={mockLcuRequest} 
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Friend One/)).toBeDefined();
        });

        const friendBtn = screen.getByText(/Friend One/).closest('button');
        if (!friendBtn) throw new Error('Friend selection item not found');
        
        await act(async () => {
            fireEvent.click(friendBtn);
        });

        const deleteBtn = screen.getByText(/DELETE SELECTED/);
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        expect(window.confirm).toHaveBeenCalled();
        await waitFor(() => {
            expect(mockLcuRequest).toHaveBeenCalledWith('DELETE', '/lol-chat/v1/friends/friend-1');
            expect(mockShowToast).toHaveBeenCalledWith('Successfully removed 1 friends.', 'success');
        });
    });
});
