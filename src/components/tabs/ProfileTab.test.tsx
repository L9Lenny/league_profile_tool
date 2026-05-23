import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProfileTab from './ProfileTab';
import { invoke } from "@tauri-apps/api/core";

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('ProfileTab', () => {
    const createProps = () => ({
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        showToast: vi.fn(),
        addLog: vi.fn(),
        lcuRequest: vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-chat/v1/me') return Promise.resolve({ availability: 'away', statusMessage: 'Original Bio' });
            return Promise.resolve({});
        }),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(invoke).mockResolvedValue({});
        localStorage.clear();
    });

    it('should render profile bio card', async () => {
        const props = createProps();
        await act(async () => {
            render(<ProfileTab {...props} />);
        });
        expect(screen.getByText('Profile Bio & Status')).toBeDefined();
    });

    it('should handle bio update and persist to localStorage', async () => {
        const props = createProps();
        await act(async () => {
            render(<ProfileTab {...props} />);
        });
        const textarea = screen.getByLabelText('New Status Message');
        fireEvent.change(textarea, { target: { value: 'New Bio' } });

        const applyBtn = screen.getByText('APPLY BIO');

        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(invoke).toHaveBeenCalledWith("update_bio", expect.anything());
        expect(localStorage.getItem('profile_saved_bio_v1')).toBe('New Bio');
    });

    it('should update availability', async () => {
        const props = createProps();
        await act(async () => {
            render(<ProfileTab {...props} />);
        });
        const select = screen.getByLabelText('Chat Availability');
        fireEvent.change(select, { target: { value: 'mobile' } });

        const applyBtn = screen.getByText('APPLY');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(props.lcuRequest).toHaveBeenCalledWith("PUT", "/lol-chat/v1/me", expect.anything());
    });

    it('should handle bio update failure', async () => {
        const props = createProps();
        vi.mocked(invoke).mockRejectedValueOnce(new Error("Fail"));
        await act(async () => {
            render(<ProfileTab {...props} />);
        });

        fireEvent.change(screen.getByLabelText('New Status Message'), { target: { value: 'test' } });

        await act(async () => {
            fireEvent.click(screen.getByText('APPLY BIO'));
        });

        expect(props.showToast).toHaveBeenCalledWith("Failed to update bio", "error");
    });

    it('should handle availability update failure', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn()
            .mockResolvedValueOnce({ availability: 'chat', statusMessage: 'my bio' }) // initial fetch
            .mockRejectedValueOnce(new Error("Fail")); // apply call

        await act(async () => {
            render(<ProfileTab {...props} />);
        });

        await act(async () => {
            fireEvent.click(screen.getByText('APPLY'));
        });

        expect(props.showToast).toHaveBeenCalledWith("Failed to update status", "error");
    });

    it('should show warning when LCU is missing', () => {
        const props = createProps() as any;
        props.lcu = null;
        render(<ProfileTab {...props} />);
        expect(screen.getByText(/Start League of Legends to enable this feature/i)).toBeDefined();
    });

    it('should handle unknown availability status mapping', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockResolvedValue({ availability: 'dnd', statusMessage: 'bio' });

        await act(async () => {
            render(<ProfileTab {...props} />);
        });

        expect(screen.getByText('DND')).toBeDefined();
    });
});
