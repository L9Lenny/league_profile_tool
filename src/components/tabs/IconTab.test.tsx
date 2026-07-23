import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IconTab from './IconTab';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('IconTab', () => {
    const mockProps = {
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        showToast: vi.fn(),
        addLog: vi.fn(),
        allIcons: [
            { id: 1, name: 'Icon One' },
            { id: 2, name: 'Icon Two' }
        ],
        iconSearchTerm: '',
        setIconSearchTerm: vi.fn(),
        visibleIcons: [
            { id: 1, name: 'Icon One' },
            { id: 2, name: 'Icon Two' }
        ],
        handleScroll: vi.fn(),
        gridRef: { current: null } as any
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render icon search and icons', () => {
        render(<IconTab {...mockProps} />);
        expect(screen.getByPlaceholderText(/Search by name or ID/i)).toBeDefined();
        expect(screen.getByText('Icon One')).toBeDefined();
        expect(screen.getByText('Icon Two')).toBeDefined();
    });

    it('should handle icon selection and apply successfully', async () => {
        vi.mocked(invoke).mockResolvedValue({});

        render(<IconTab {...mockProps} />);
        const iconBtn = screen.getByText('Icon One').closest('button');
        if (!iconBtn) throw new Error('Icon button not found');

        fireEvent.click(iconBtn);

        const applyBtn = screen.getByText('APPLY ICON');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('lcu_request', expect.objectContaining({
                method: 'PUT',
                endpoint: '/lol-summoner/v1/current-summoner/icon',
                body: { profileIconId: 1 }
            }));
            expect(invoke).toHaveBeenCalledWith('lcu_request', expect.objectContaining({
                method: 'PUT',
                endpoint: '/lol-chat/v1/me',
                body: { icon: 1 }
            }));
            expect(mockProps.showToast).toHaveBeenCalledWith('Icon Applied!', 'success');
        });
    });

    it('should handle fallback to force method when official icon update fails', async () => {
        vi.mocked(invoke).mockImplementation(async (cmd, args: any) => {
            if (cmd === 'lcu_request' && args.endpoint.includes('summoner')) {
                throw new Error('Unowned');
            }
            return {};
        });

        render(<IconTab {...mockProps} />);
        const iconBtn = screen.getByText('Icon One').closest('button');
        if (!iconBtn) throw new Error('Icon button not found');

        fireEvent.click(iconBtn);

        const applyBtn = screen.getByText('APPLY ICON');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(mockProps.addLog).toHaveBeenCalledWith('Official icon update failed (likely unowned). Trying Force method...');
            expect(invoke).toHaveBeenCalledWith('lcu_request', expect.objectContaining({
                method: 'PUT',
                endpoint: '/lol-chat/v1/me',
                body: { icon: 1 }
            }));
            expect(mockProps.showToast).toHaveBeenCalledWith('Icon Applied!', 'success');
        });
    });

    it('should show toast error when all icon update methods fail', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('Fatal Connection Error'));

        render(<IconTab {...mockProps} />);
        const iconBtn = screen.getByText('Icon One').closest('button');
        if (!iconBtn) throw new Error('Icon button not found');

        fireEvent.click(iconBtn);

        const applyBtn = screen.getByText('APPLY ICON');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(mockProps.showToast).toHaveBeenCalledWith('Failed to apply icon', 'error');
        });
    });

    it('should show empty state when no icons match', () => {
        const emptyProps = { ...mockProps, visibleIcons: [], iconSearchTerm: 'nothing' };
        render(<IconTab {...emptyProps} />);
        expect(screen.queryByText('Icon One')).toBeNull();
    });

    it('should show warning if LCU not connected (disabled button)', () => {
        const disabledProps = { ...mockProps, lcu: null as any };
        render(<IconTab {...disabledProps} />);
        const applyBtn = screen.getByText('APPLY ICON');
        expect((applyBtn as HTMLButtonElement).disabled).toBe(true);
    });
});
