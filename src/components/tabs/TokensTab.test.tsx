import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TokensTab from './TokensTab';

describe('TokensTab', () => {
    const createProps = () => ({
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        showToast: vi.fn(),
        addLog: vi.fn(),
        lcuRequest: vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-challenges/v1/challenges/local-player') return Promise.resolve([
                { id: 1, name: "Test Token 1", currentLevel: "GOLD" }
            ]);
            if (endpoint === '/lol-challenges/v1/summary-player-data/local-player') return Promise.resolve({
                topChallenges: [{ id: 1 }, { id: -1 }, { id: -1 }],
                bannerId: '4',
                crestId: '3',
            });
            return Promise.resolve({});
        }),
    });

    const mockRegalia = [
        { id: "3", regaliaType: "kBanner", isSelectable: true, localizedName: "Lunar Revel 2023 Banner" },
        { id: "4", regaliaType: "kBanner", isSelectable: true, localizedName: "Soul Fighter Banner" },
        { id: "6", regaliaType: "kBanner", isSelectable: true, localizedName: "Winterblessed Banner" },
    ];

    const mockFetch = (data: any) => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => data,
        } as Response);
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockFetch([]);
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

        expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Empty response from challenges API"));
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

        expect(props.lcuRequest).toHaveBeenCalledWith("POST", expect.stringContaining("update-player-preferences"), expect.any(Object));
    });

    it('should include bannerAccent in apply payload', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const applyBtn = screen.getByText('APPLY CHANGES');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        const callArgs = props.lcuRequest.mock.calls.find(
            (c: any[]) => c[0] === "POST" && c[1].includes("update-player-preferences")
        );
        expect(callArgs).toBeDefined();
        expect(callArgs![2].bannerAccent).toBeDefined();
    });

    it('should render banner dropdown with CDragon names', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
        expect(bannerSelect).toBeDefined();
        expect(bannerSelect?.length).toBe(4); // No Banner + 3 mock banners
        expect(bannerSelect?.options[0].text).toBe('No Banner');
        expect(bannerSelect?.options[1].text).toBe('Lunar Revel 2023 Banner');
        expect(bannerSelect?.options[2].text).toBe('Soul Fighter Banner');
        expect(bannerSelect?.options[3].text).toBe('Winterblessed Banner');
    });

    it('should use summary bannerId as initial selection', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
        expect(bannerSelect?.value).toBe('4');
    });

    it('should update selectedBannerId on dropdown change', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
        await act(async () => {
            fireEvent.change(bannerSelect, { target: { value: '3' } });
        });
        expect(bannerSelect?.value).toBe('3');
    });

    it('should disable banner dropdown when LCU is null', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        render(<TokensTab {...props} lcu={null} />);

        const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
        expect(bannerSelect).toBeDefined();
        expect(bannerSelect?.disabled).toBe(true);
    });

    it('should render banner dropdown even when CDragon fetch returns empty', async () => {
        // fetch mock already returns []
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
        expect(bannerSelect).toBeDefined();
        expect(bannerSelect?.length).toBe(1); // Just "No Banner"
        expect(bannerSelect?.options[0].text).toBe('No Banner');
    });

    it('should cache regalia definitions from CDragon in localStorage', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const cached = localStorage.getItem('cd_regalia_defs');
        expect(cached).toBeDefined();
        if (cached) {
            const parsed = JSON.parse(cached);
            expect(parsed.data['3']).toBe('Lunar Revel 2023 Banner');
            expect(parsed.data['4']).toBe('Soul Fighter Banner');
        }
    });

    it('should use cached regalia definitions when available', async () => {
        const cachedData = { data: { '5': 'Test Banner Five', '7': 'Test Banner Seven' }, ts: Date.now() };
        localStorage.setItem('cd_regalia_defs', JSON.stringify(cachedData));

        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        // Should NOT call CDragon for regalia definitions since cache is valid
        const regaliaFetchCalls = vi.mocked(globalThis.fetch).mock.calls.filter(
            (c) => typeof c[0] === 'string' && (c[0] as string).includes('regalia.json')
        );
        expect(regaliaFetchCalls.length).toBe(0);

        const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
        expect(bannerSelect?.length).toBe(3); // No Banner + 2 cached
        expect(bannerSelect?.options[1].text).toBe('Test Banner Five');
        expect(bannerSelect?.options[2].text).toBe('Test Banner Seven');
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

    it('should use bannerId #1 as default when banner is -1', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-challenges/v1/summary-player-data/local-player') return Promise.resolve({
                bannerId: '-1',
                topChallenges: [{ id: 1 }, { id: -1 }, { id: -1 }],
            });
            if (endpoint === '/lol-challenges/v1/challenges/local-player') return Promise.resolve([]);
            return Promise.resolve({});
        });

        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
        expect(bannerSelect?.value).toBe('1');
    });

    it('should map summary bannerId to bannerAccent in apply payload', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const applyBtn = screen.getByText('APPLY CHANGES');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        const applyCall = props.lcuRequest.mock.calls.find(
            (c: any[]) => c[0] === "POST"
        );
        expect(applyCall).toBeDefined();
        expect(applyCall![2]).toHaveProperty('bannerAccent');
        expect(applyCall![2].bannerAccent).toBe('4');
    });
});
