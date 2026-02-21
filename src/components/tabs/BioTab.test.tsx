import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BioTab from './BioTab';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('BioTab', () => {
    const mockProps = {
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        setLoading: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
        lcuRequest: vi.fn().mockResolvedValue({ availability: 'away' }),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render profile bio card', async () => {
        await act(async () => {
            render(<BioTab {...mockProps} />);
        });
        expect(screen.getByText('Profile Bio')).toBeDefined();
        expect(screen.getByLabelText('New Status Message')).toBeDefined();
        await waitFor(() => expect(mockProps.lcuRequest).toHaveBeenCalledWith('GET', '/lol-chat/v1/me'));
    });

    it('should handle bio update', async () => {
        render(<BioTab {...mockProps} />);
        const textarea = screen.getByLabelText('New Status Message');
        fireEvent.change(textarea, { target: { value: 'New Bio' } });

        // There are two APPLY buttons, we want the one NOT having availability-apply class
        const applyBtns = screen.getAllByText('APPLY');
        const bioApplyBtn = applyBtns.find(btn => !btn.classList.contains('availability-apply'));
        if (!bioApplyBtn) throw new Error('Bio APPLY button not found');

        fireEvent.click(bioApplyBtn);

        expect(mockProps.setLoading).toHaveBeenCalledWith(true);
    });

    it('should show warning when LCU is not connected', () => {
        render(<BioTab {...mockProps} lcu={null} />);
        expect(screen.getByText(/Start League of Legends to enable this feature/)).toBeDefined();
    });

    it('should update availability', async () => {
        await act(async () => {
            render(<BioTab {...mockProps} />);
        });
        const select = screen.getByLabelText('Chat Availability');
        await act(async () => {
            fireEvent.change(select, { target: { value: 'mobile' } });
        });

        const applyBtn = screen.getByText('APPLY', { selector: 'button.availability-apply' });
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(mockProps.setLoading).toHaveBeenCalledWith(true);
    });
});
