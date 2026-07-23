import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
        render(<RankTab {...props} />);

        expect(await screen.findByText('Rank & Stats Overrides')).toBeDefined();
        expect(props.lcuRequest).toHaveBeenCalledWith("GET", "/lol-chat/v1/me");
    });

    it('should update rank preview when selection changes', async () => {
        const props = createMockProps();
        render(<RankTab {...props} />);

        const goldBtn = await screen.findAllByText('GOLD');
        fireEvent.click(goldBtn[0]);

        const goldElements = screen.getAllByText(/GOLD/);
        expect(goldElements.length).toBeGreaterThan(0);
    });

    it('should call lcuRequest with correct parameters on apply', async () => {
        const props = createMockProps();
        render(<RankTab {...props} />);

        const applyBtn = await screen.findByText('APPLY RANK OVERRIDES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(props.lcuRequest).toHaveBeenCalledWith("PUT", "/lol-chat/v1/me", expect.objectContaining({
                lol: expect.objectContaining({
                    rankedLeagueTier: "CHALLENGER",
                    rankedLeagueDivision: "I",
                    rankedLeagueQueue: "RANKED_SOLO_5x5",
                    challengeCrystalLevel: "CHALLENGER",
                    challengePoints: "1200"
                })
            }));
            expect(props.showToast).toHaveBeenCalledWith("Rank Overrides Applied!", "success");
        });
    });

    it('should handle apply errors gracefully', async () => {
        const props = createMockProps();
        props.lcuRequest.mockImplementation((method, endpoint) => {
            if (method === "PUT" && endpoint === "/lol-chat/v1/me") {
                return Promise.reject(new Error("Network Error"));
            }
            return Promise.resolve({});
        });

        render(<RankTab {...props} />);

        const applyBtn = await screen.findByText('APPLY RANK OVERRIDES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(props.showToast).toHaveBeenCalledWith(expect.stringContaining("Customization failed: Network Error"), "error");
            expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Customization application failed: Network Error"));
        });
    });

    it('should disable apply button when LCU is missing', async () => {
        const props = createMockProps();
        props.lcu = null;

        render(<RankTab {...props} />);
        const applyBtn = screen.getByText('APPLY RANK OVERRIDES');
        expect((applyBtn as HTMLButtonElement).disabled).toBe(true);
    });
});
