import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RankTab from './RankTab';

describe('RankTab', () => {
    const createMockProps = () => {
        const lcuRequest = vi.fn().mockImplementation((method, endpoint) => {
            if (method === "GET" && endpoint === "/lol-chat/v1/me") {
                return Promise.resolve({
                    lol: {
                        rankedLeagueTier: "CHALLENGER",
                        rankedLeagueDivision: "I",
                        rankedLeagueQueue: "RANKED_SOLO_5x5",
                        challengeCrystalLevel: "CHALLENGER",
                        challengePoints: 1200
                    }
                });
            }
            if (method === "GET" && endpoint === "/lol-challenges/v1/summary-player-data/local-player") {
                return Promise.resolve({
                    bannerAccent: "1",
                    crestBorder: "2",
                    title: "1001",
                    topChallenges: [{ id: 50 }, { id: 60 }]
                });
            }
            if (method === "GET" && endpoint === "/lol-challenges/v2/titles/local-player") {
                return Promise.resolve([
                    { id: 1001, name: "Unstoppable", description: "Test title description", state: "UNLOCKED" },
                    { id: 1002, name: "LOCKED TITLE", description: "Hidden", state: "LOCKED" }
                ]);
            }
            return Promise.resolve({});
        });

        return {
            lcu: { port: '1234', token: 'secret' },
            showToast: vi.fn(),
            addLog: vi.fn(),
            lcuRequest
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render rank and customization panels and sync from LCU on mount', async () => {
        const props = createMockProps();
        await act(async () => {
            render(<RankTab {...props} />);
        });

        expect(screen.getByText('Rank & Stats Overrides')).toBeDefined();
        expect(screen.getByText('Identity & Regalia Overrides')).toBeDefined();
        expect(screen.getByLabelText('Rank Queue Type')).toBeDefined();
        
        // Wait for sync to pre-populate elements
        expect(props.lcuRequest).toHaveBeenCalledWith("GET", "/lol-chat/v1/me");
        expect(props.lcuRequest).toHaveBeenCalledWith("GET", "/lol-challenges/v1/summary-player-data/local-player");
        expect(props.lcuRequest).toHaveBeenCalledWith("GET", "/lol-challenges/v2/titles/local-player");

        // Verify title select option for 'Unstoppable' is rendered
        expect(screen.getAllByText('Unstoppable').length).toBeGreaterThan(0);
    });

    it('should update rank preview and preview fields when selection changes', async () => {
        const props = createMockProps();
        await act(async () => {
            render(<RankTab {...props} />);
        });

        const tierSelect = screen.getByLabelText('Rank Override (Tier & Division)');
        await act(async () => {
            fireEvent.change(tierSelect, { target: { value: 'GOLD' } });
        });

        // The preview section should now show GOLD
        const goldElements = screen.getAllByText(/GOLD/);
        expect(goldElements.length).toBeGreaterThan(0);
    });

    it('should call lcuRequest with correct parameters on apply', async () => {
        const props = createMockProps();
        await act(async () => {
            render(<RankTab {...props} />);
        });

        const applyBtn = screen.getByText('APPLY OVERRIDES');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        // Verify PUT /lol-chat/v1/me
        expect(props.lcuRequest).toHaveBeenCalledWith("PUT", "/lol-chat/v1/me", expect.objectContaining({
            lol: expect.objectContaining({
                rankedLeagueTier: "CHALLENGER",
                rankedLeagueDivision: "I",
                rankedLeagueQueue: "RANKED_SOLO_5x5",
                challengeCrystalLevel: "CHALLENGER",
                challengePoints: 1200
            })
        }));

        // Verify POST /lol-challenges/v1/update-player-preferences (which merges token challengeIds from summary)
        expect(props.lcuRequest).toHaveBeenCalledWith("POST", "/lol-challenges/v1/update-player-preferences", expect.objectContaining({
            challengeIds: [50, 60],
            bannerAccent: "1",
            title: "1001",
            crestBorder: "2"
        }));

        expect(props.showToast).toHaveBeenCalledWith("Profile Customizations Applied!", "success");
    });

    it('should handle apply errors gracefully', async () => {
        const props = createMockProps();
        props.lcuRequest.mockImplementation((method, endpoint) => {
            if (method === "PUT" && endpoint === "/lol-chat/v1/me") {
                return Promise.reject(new Error("Network Error"));
            }
            return Promise.resolve({});
        });

        await act(async () => {
            render(<RankTab {...props} />);
        });

        const applyBtn = screen.getByText('APPLY OVERRIDES');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(props.showToast).toHaveBeenCalledWith(expect.stringContaining("Customization failed: Network Error"), "error");
        expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Customization application failed: Network Error"));
    });

    it('should disable apply button when LCU is missing', async () => {
        const props = createMockProps();
        await act(async () => {
            render(<RankTab {...props} lcu={null} />);
        });

        const applyBtn = screen.getByText('APPLY OVERRIDES') as HTMLButtonElement;
        expect(applyBtn.disabled).toBe(true);
    });
});
