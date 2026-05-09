import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TokensTab from './TokensTab';

describe('TokensTab', () => {
    const createProps = () => ({
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        setLoading: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
        lcuRequest: vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-challenges/v1/challenges/local-player') return Promise.resolve([
                { id: 1, name: "Test Token 1", currentLevel: "GOLD" }
            ]);
            if (endpoint === '/lol-challenges/v1/summary-player-data/local-player') return Promise.resolve({
                topChallenges: [{ id: 1 }, { id: -1 }, { id: -1 }]
            });
            return Promise.resolve({});
        }),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock global fetch
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => []
        } as Response);
    });

    it('should render tokens card and slots', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });
        expect(screen.getByText('Active Selection')).toBeDefined();
        expect(screen.getByText('Unlocked Tokens')).toBeDefined();
        // Check for slot markers (1, 2, 3)
        expect(screen.getByText('1')).toBeDefined();
        expect(screen.getByText('2')).toBeDefined();
        expect(screen.getByText('3')).toBeDefined();
    });

    it('should show connection warning when LCU is missing', async () => {
        const props = createProps();
        render(<TokensTab {...props} lcu={null} />);
        expect(screen.getByText(/connection required/i)).toBeDefined();
    });

    it('should update search filter', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const searchInput = screen.getByPlaceholderText(/Search by token name/i);
        fireEvent.change(searchInput, { target: { value: 'Apple' } });
        expect(searchInput.getAttribute('value')).toBe('Apple');
    });

    it('should handle fetch errors gracefully', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockRejectedValue(new Error("API Error"));

        await act(async () => {
            render(<TokensTab {...props} />);
        });

        expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Error syncing tokens"));
    });

    it('should trigger apply logic', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const applyBtn = screen.getByText('APPLY CHANGES');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(props.setLoading).toHaveBeenCalledWith(true);
        expect(props.lcuRequest).toHaveBeenCalledWith("POST", expect.stringContaining("update-player-preferences"), expect.any(Object));
    });

    it('should handle refresh button click', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const refreshBtn = screen.getByRole('button', { name: '' }); // The RotateCw icon button
        await act(async () => {
            fireEvent.click(refreshBtn);
        });

        expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Syncing challenges from LCU"));
    });

    it('should handle clear all slots', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const clearBtn = screen.getByText(/CLEAR ALL SLOTS/i);
        await act(async () => {
            fireEvent.click(clearBtn);
        });

        expect(props.showToast).toHaveBeenCalledWith("All slots cleared locally", "info");
    });
});
