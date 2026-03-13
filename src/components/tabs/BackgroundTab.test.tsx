import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import BackgroundTab from './BackgroundTab';

describe('BackgroundTab', () => {
    const mockChampSummary = [
        { id: 1, name: 'Aatrox', alias: 'Aatrox', squarePortraitPath: '/assets/1.png' },
        { id: 2, name: 'Ahri', alias: 'Ahri', squarePortraitPath: '/assets/2.png' }
    ];

    const mockSkins = {
        skins: [
            { id: 1000, name: 'Default Aatrox', isBase: true, splashPath: '/assets/1000.jpg' },
            { id: 1001, name: 'Justicar Aatrox', isBase: false, splashPath: '/assets/1001.jpg' }
        ]
    };

    const createProps = () => ({
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        setLoading: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
        lcuRequest: vi.fn().mockResolvedValue({ backgroundSkinId: 0 })
    });

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url.includes('champion-summary.json')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockChampSummary
                } as Response);
            }
            if (url.includes('champions/1.json')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockSkins
                } as Response);
            }
            return Promise.reject(new Error('Unknown URL'));
        });
    });

    it('should render and load champions', async () => {
        const props = createProps();
        await act(async () => {
            render(<BackgroundTab {...props} />);
        });

        expect(screen.getByText('Profile Background')).toBeDefined();
        await waitFor(() => {
            expect(screen.getByText('Aatrox')).toBeDefined();
            expect(screen.getByText('Ahri')).toBeDefined();
        });
    });

    it('should filter champions by search', async () => {
        const props = createProps();
        await act(async () => {
            render(<BackgroundTab {...props} />);
        });

        await waitFor(() => expect(screen.getByText('Aatrox')).toBeDefined());

        const input = screen.getByPlaceholderText(/Search by champion name/i);
        fireEvent.change(input, { target: { value: 'Ahri' } });

        expect(screen.queryByText('Aatrox')).toBeNull();
        expect(screen.getByText('Ahri')).toBeDefined();
    });

    it('should load skins when a champion is selected', async () => {
        const props = createProps();
        await act(async () => {
            render(<BackgroundTab {...props} />);
        });

        await waitFor(() => {
            const aatroxBtn = screen.getByText('Aatrox').closest('button')!;
            fireEvent.click(aatroxBtn);
        });

        await waitFor(() => {
            expect(screen.getByText('Justicar Aatrox')).toBeDefined();
            expect(screen.getByText('← BACK')).toBeDefined();
        });
    });

    it('should apply background when a skin is selected and clicked', async () => {
        const props = createProps();
        await act(async () => {
            render(<BackgroundTab {...props} />);
        });

        // Select Champ
        await waitFor(() => fireEvent.click(screen.getByText('Aatrox')));
        
        // Select Skin
        await waitFor(() => {
            const skinBtn = screen.getByText('Justicar Aatrox').closest('button')!;
            fireEvent.click(skinBtn);
        });

        // Click Apply
        const applyBtn = screen.getByText(/APPLY — Justicar Aatrox/i);
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(props.lcuRequest).toHaveBeenCalledWith('POST', expect.anything(), expect.objectContaining({ value: 1001 }));
        expect(props.showToast).toHaveBeenCalledWith(expect.stringContaining('Justicar Aatrox'), 'success');
    });

    it('should handle direct skin ID input', async () => {
        const props = createProps();
        await act(async () => {
            render(<BackgroundTab {...props} />);
        });

        const input = screen.getByPlaceholderText(/Enter specific skin ID/i);
        fireEvent.change(input, { target: { value: '12345' } });

        const applyBtn = screen.getByText('APPLY');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(props.lcuRequest).toHaveBeenCalledWith('POST', expect.anything(), expect.objectContaining({ value: 12345 }));
    });

    it('should go back to champion list from skin list', async () => {
        const props = createProps();
        await act(async () => {
            render(<BackgroundTab {...props} />);
        });

        await waitFor(() => fireEvent.click(screen.getByText('Aatrox')));
        await waitFor(() => expect(screen.getByTitle(/Justicar Aatrox/i)).toBeDefined());

        fireEvent.click(screen.getByText('← BACK'));
        expect(screen.getByText('Aatrox')).toBeDefined();
        expect(screen.queryByText('Justicar Aatrox')).toBeNull();
    });

    it('should show current background ID if LCU is connected', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-summoner/v1/current-summoner/summoner-profile') {
                return Promise.resolve({ backgroundSkinId: 555 });
            }
            return Promise.resolve({});
        });

        await act(async () => {
            render(<BackgroundTab {...props} />);
        });

        await waitFor(() => expect(screen.getByText('ID 555')).toBeDefined());
    });

    it('should show error toast if champion fetch fails', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false });
        const props = createProps();
        
        await act(async () => {
            render(<BackgroundTab {...props} />);
        });

        await waitFor(() => expect(props.showToast).toHaveBeenCalledWith('Failed to load champion list', 'error'));
    });
});
