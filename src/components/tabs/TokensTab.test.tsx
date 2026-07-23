import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
        render(<TokensTab {...props} />);

        expect(await screen.findByText('Active Selection')).toBeDefined();
        expect(screen.getByText('Unlocked Tokens')).toBeDefined();
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
        render(<TokensTab {...props} />);

        const searchInput = await screen.findByPlaceholderText(/Search by token name/i);
        fireEvent.change(searchInput, { target: { value: 'Apple' } });
        expect(searchInput.getAttribute('value')).toBe('Apple');
    });

    it('should handle fetch errors gracefully', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockRejectedValue(new Error("API Error"));

        render(<TokensTab {...props} />);

        await waitFor(() => {
            expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Empty response from challenges API"));
        });
    });

    it('should trigger apply logic', async () => {
        const props = createProps();
        render(<TokensTab {...props} />);

        const applyBtn = await screen.findByText('APPLY CHANGES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(props.lcuRequest).toHaveBeenCalledWith("POST", expect.stringContaining("update-player-preferences"), expect.any(Object));
        });
    });

    it('should include bannerAccent in apply payload', async () => {
        const props = createProps();
        render(<TokensTab {...props} />);

        const applyBtn = await screen.findByText('APPLY CHANGES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            const callArgs = props.lcuRequest.mock.calls.find(
                (c: any[]) => c[0] === "POST" && c[1].includes("update-player-preferences")
            );
            expect(callArgs).toBeDefined();
            expect(callArgs![2].bannerAccent).toBeDefined();
        });
    });

    it('should render banner dropdown with CDragon names', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        render(<TokensTab {...props} />);

        await waitFor(() => {
            const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
            expect(bannerSelect).toBeDefined();
            expect(bannerSelect?.length).toBe(4);
            expect(bannerSelect?.options[0].text).toBe('No Banner');
            expect(bannerSelect?.options[1].text).toBe('Lunar Revel 2023 Banner');
            expect(bannerSelect?.options[2].text).toBe('Soul Fighter Banner');
            expect(bannerSelect?.options[3].text).toBe('Winterblessed Banner');
        });
    });

    it('should use summary bannerId as initial selection', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        render(<TokensTab {...props} />);

        await waitFor(() => {
            const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
            expect(bannerSelect?.value).toBe('4');
        });
    });

    it('should update selectedBannerId on dropdown change', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        render(<TokensTab {...props} />);

        await waitFor(() => {
            const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
            expect(bannerSelect?.length).toBe(4);
        });

        const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
        fireEvent.change(bannerSelect, { target: { value: '3' } });
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
        const props = createProps();
        render(<TokensTab {...props} />);

        await waitFor(() => {
            const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
            expect(bannerSelect).toBeDefined();
            expect(bannerSelect?.length).toBe(1);
            expect(bannerSelect?.options[0].text).toBe('No Banner');
        });
    });

    it('should cache regalia definitions from CDragon in localStorage', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        render(<TokensTab {...props} />);

        await waitFor(() => {
            const cached = localStorage.getItem('cd_regalia_defs');
            expect(cached).toBeDefined();
            if (cached) {
                const parsed = JSON.parse(cached);
                expect(parsed.data['3']).toBe('Lunar Revel 2023 Banner');
                expect(parsed.data['4']).toBe('Soul Fighter Banner');
            }
        });
    });

    it('should use cached regalia definitions when available', async () => {
        const cachedData = { data: { '5': 'Test Banner Five', '7': 'Test Banner Seven' }, ts: Date.now() };
        localStorage.setItem('cd_regalia_defs', JSON.stringify(cachedData));

        const props = createProps();
        render(<TokensTab {...props} />);

        await waitFor(() => {
            const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
            expect(bannerSelect?.length).toBe(3);
            expect(bannerSelect?.options[1].text).toBe('Test Banner Five');
            expect(bannerSelect?.options[2].text).toBe('Test Banner Seven');
        });
    });

    it('should handle refresh button click', async () => {
        const props = createProps();
        render(<TokensTab {...props} />);

        await screen.findByText('Unlocked Tokens');
        const refreshBtn = document.querySelector('.refresh-icon-btn') as HTMLButtonElement;
        fireEvent.click(refreshBtn);

        await waitFor(() => {
            expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Syncing challenges from LCU"));
        });
    });

    it('should handle clear all slots', async () => {
        const props = createProps();
        render(<TokensTab {...props} />);

        const clearBtn = await screen.findByTitle('Clear All Slots');
        fireEvent.click(clearBtn);

        await waitFor(() => {
            expect(props.showToast).toHaveBeenCalledWith("All slots cleared locally", "info");
        });
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

        render(<TokensTab {...props} />);

        await waitFor(() => {
            const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
            expect(bannerSelect?.value).toBe('1');
        });
    });

    it('should map summary bannerId to bannerAccent in apply payload', async () => {
        mockFetch(mockRegalia);
        const props = createProps();
        render(<TokensTab {...props} />);

        const applyBtn = await screen.findByText('APPLY CHANGES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            const applyCall = props.lcuRequest.mock.calls.find(
                (c: any[]) => c[0] === "POST"
            );
            expect(applyCall).toBeDefined();
            expect(applyCall![2]).toHaveProperty('bannerAccent');
            expect(applyCall![2].bannerAccent).toBe('4');
        });
    });

    it('should show REGALIA_BANNER ownership error on apply', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((_method, endpoint) => {
            if (endpoint.includes('summary-player-data')) return Promise.resolve({ bannerId: '99', crestId: '3', topChallenges: [{ id: 1 }] });
            if (endpoint.includes('challenges/local-player')) return Promise.resolve([{ id: 1, name: 'Test', currentLevel: 'GOLD' }]);
            if (endpoint.includes('titles')) return Promise.resolve([]);
            if (endpoint.includes('current-summoner')) return Promise.resolve({ displayName: 'Test' });
            if (endpoint.includes('update-player-preferences')) return Promise.reject(new Error('LCU Error: {"message": "Player does not own REGALIA_BANNER item 99"}'));
            return Promise.resolve({});
        });

        render(<TokensTab {...props} />);

        const applyBtn = await screen.findByText('APPLY CHANGES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(props.showToast).toHaveBeenCalledWith(expect.stringContaining('Banner Accent'), 'error');
        });
    });

    it('should show crest ownership error for non-REGALIA ownership errors', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((_method, endpoint) => {
            if (endpoint.includes('summary-player-data')) return Promise.resolve({ bannerId: '4', crestId: '99', topChallenges: [{ id: 1 }] });
            if (endpoint.includes('challenges/local-player')) return Promise.resolve([{ id: 1, name: 'Test', currentLevel: 'GOLD' }]);
            if (endpoint.includes('titles')) return Promise.resolve([]);
            if (endpoint.includes('current-summoner')) return Promise.resolve({ displayName: 'Test' });
            if (endpoint.includes('update-player-preferences')) return Promise.reject(new Error('LCU Error: {"message": "Player does not own some item"}'));
            return Promise.resolve({});
        });

        render(<TokensTab {...props} />);

        const applyBtn = await screen.findByText('APPLY CHANGES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(props.showToast).toHaveBeenCalledWith(expect.stringContaining('Crest Border'), 'error');
        });
    });

    it('should show generic LCU error message on apply failure', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((method, endpoint) => {
            if (endpoint.includes('summary-player-data')) return Promise.resolve({ bannerId: '4', crestId: '3', topChallenges: [{ id: 1 }] });
            if (endpoint.includes('challenges/local-player')) return Promise.resolve([{ id: 1, name: 'Test', currentLevel: 'GOLD' }]);
            if (endpoint.includes('titles')) return Promise.resolve([]);
            if (endpoint.includes('current-summoner')) return Promise.resolve({ displayName: 'Test' });
            if (method === 'POST' && endpoint.includes('update-player-preferences')) return Promise.reject(new Error('LCU Error: {"message": "Rate limit exceeded"}'));
            return Promise.resolve({});
        });

        render(<TokensTab {...props} />);

        const applyBtn = await screen.findByText('APPLY CHANGES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(props.showToast).toHaveBeenCalledWith('Rate limit exceeded', 'error');
        });
    });

    it('should not send -1 as title in apply payload when no title selected', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((_method, endpoint) => {
            if (endpoint.includes('summary-player-data')) return Promise.resolve({ bannerId: '4', crestId: '3', title: '-1', topChallenges: [{ id: 1 }] });
            if (endpoint.includes('challenges/local-player')) return Promise.resolve([{ id: 1, name: 'Test', currentLevel: 'GOLD' }]);
            if (endpoint.includes('titles')) return Promise.resolve([]);
            if (endpoint.includes('current-summoner')) return Promise.resolve({ displayName: 'Test' });
            return Promise.resolve({});
        });

        render(<TokensTab {...props} />);

        const applyBtn = await screen.findByText('APPLY CHANGES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            const applyCall = props.lcuRequest.mock.calls.find(
                (c: any[]) => c[0] === "POST"
            );
            expect(applyCall).toBeDefined();
            expect(applyCall![2].title).toBe('');
        });
    });

    it('should re-fetch regalia from CDragon when cache is expired', async () => {
        const expiredData = { data: { '5': 'Stale Banner' }, ts: Date.now() - 25 * 60 * 60 * 1000 };
        localStorage.setItem('cd_regalia_defs', JSON.stringify(expiredData));
        mockFetch(mockRegalia);

        const props = createProps();
        render(<TokensTab {...props} />);

        await waitFor(() => {
            const regaliaCalls = vi.mocked(globalThis.fetch).mock.calls.filter(
                (c) => typeof c[0] === 'string' && (c[0] as string).includes('regalia.json')
            );
            expect(regaliaCalls.length).toBeGreaterThanOrEqual(1);

            const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
            expect(bannerSelect?.options?.length).toBeGreaterThan(1);
        });
    });

    it('should fall back gracefully when CDragon regalia fetch fails', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);

        const props = createProps();
        render(<TokensTab {...props} />);

        await waitFor(() => {
            const bannerSelect = document.getElementById('banner-select') as HTMLSelectElement;
            expect(bannerSelect?.length).toBe(1);
            expect(bannerSelect?.options[0].text).toBe('No Banner');
        });
    });

    it('should handle normalizeChallengeResponse with object input', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((_method, endpoint) => {
            if (endpoint.includes('summary-player-data')) return Promise.resolve({ bannerId: '4', crestId: '3', topChallenges: [{ id: 1 }] });
            if (endpoint.includes('challenges/local-player')) return Promise.resolve({ '42': { id: 42, name: 'Object Token', currentLevel: 'DIAMOND' } });
            if (endpoint.includes('titles')) return Promise.resolve([]);
            if (endpoint.includes('current-summoner')) return Promise.resolve({ displayName: 'Test' });
            return Promise.resolve({});
        });

        render(<TokensTab {...props} />);

        expect(await screen.findByText('Object Token')).toBeDefined();
    });
});
