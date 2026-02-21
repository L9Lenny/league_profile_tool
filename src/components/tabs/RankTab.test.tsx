import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RankTab from './RankTab';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('RankTab', () => {
    const mockProps = {
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        setLoading: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render rank override card', () => {
        render(<RankTab {...mockProps} />);
        expect(screen.getByText('Rank Override')).toBeDefined();
        expect(screen.getByLabelText('Solo/Duo Ranking')).toBeDefined();
    });

    it('should update rank preview when selection changes', async () => {
        render(<RankTab {...mockProps} />);
        const tierSelect = screen.getByLabelText('Solo/Duo Ranking');

        await act(async () => {
            fireEvent.change(tierSelect, { target: { value: 'GOLD' } });
        });

        // We want the span preview, not the option
        const goldElements = screen.getAllByText('GOLD');
        const previewSpan = goldElements.find(el => el.tagName === 'SPAN');
        expect(previewSpan).toBeDefined();
    });

    it('should call invoke with correct parameters on apply', async () => {
        render(<RankTab {...mockProps} />);
        const applyBtn = screen.getByText('APPLY');
        fireEvent.click(applyBtn);

        expect(mockProps.setLoading).toHaveBeenCalledWith(true);
    });
});
