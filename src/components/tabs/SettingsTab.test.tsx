import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsTab from './SettingsTab';

const mockInvoke = vi.fn();
const mockOpen = vi.fn();
const mockSave = vi.fn();

vi.mock('@tauri-apps/plugin-autostart', () => ({
    enable: vi.fn(),
    disable: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: (...args: unknown[]) => mockOpen(...args),
    save: (...args: unknown[]) => mockSave(...args),
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('SettingsTab', () => {
    const mockProps = {
        isAutostartEnabled: false,
        setIsAutostartEnabled: vi.fn(),
        minimizeToTray: false,
        toggleMinimizeToTray: vi.fn(),
        latestVersion: '1.4.0',
        clientVersion: '1.3.7',
        addLog: vi.fn(),
    };

    it('should render technical settings', () => {
        render(<SettingsTab {...mockProps} />);
        expect(screen.getByText('Technical Settings')).toBeDefined();
        expect(screen.getByText('Auto-launch')).toBeDefined();
        expect(screen.getByText('Minimize to Tray')).toBeDefined();
    });

    it('should have accessible labels for switches', () => {
        render(<SettingsTab {...mockProps} />);
        expect(screen.getByText('Toggle Auto-launch')).toHaveClass('sr-only');
        expect(screen.getByText('Toggle Minimize to Tray')).toHaveClass('sr-only');
    });

    it('should show update panel when a new version is available', () => {
        render(<SettingsTab {...mockProps} />);
        expect(screen.getByText('New Enhancement Available')).toBeDefined();
        expect(screen.getByText('UPDATE NOW')).toHaveAttribute('href', 'https://github.com/L9Lenny/league_profile_tool/releases/latest');
    });

    it('should not show update panel when version is up to date', () => {
        render(<SettingsTab {...mockProps} latestVersion="1.3.7" />);
        expect(screen.queryByText('New Enhancement Available')).toBeNull();
    });

    it('should call setIsAutostartEnabled and addLog when auto-launch is clicked', async () => {
        render(<SettingsTab {...mockProps} />);
        const autostartRow = screen.getByText('Auto-launch').closest('button');
        if (!autostartRow) throw new Error('Button not found');

        await fireEvent.click(autostartRow);
        expect(mockProps.setIsAutostartEnabled).toHaveBeenCalledWith(true);
        expect(mockProps.addLog).toHaveBeenCalledWith('Auto-launch enabled.');
    });

    it('should call toggleMinimizeToTray when minimize to tray is clicked', () => {
        render(<SettingsTab {...mockProps} />);
        const minimizeRow = screen.getByText('Minimize to Tray').closest('button');
        if (!minimizeRow) throw new Error('Button not found');

        fireEvent.click(minimizeRow);
        expect(mockProps.toggleMinimizeToTray).toHaveBeenCalled();
    });

    it('should toggle auto-restore profile state', () => {
        localStorage.clear();
        render(<SettingsTab {...mockProps} />);
        const autoRestoreRow = screen.getByText('Auto-Restore Profile').closest('button');
        if (!autoRestoreRow) throw new Error('Button not found');

        fireEvent.click(autoRestoreRow);
        expect(localStorage.getItem('profile_auto_enforce_v1')).toBe('true');
        expect(mockProps.addLog).toHaveBeenCalledWith('Auto-Enforcer enabled.');

        fireEvent.click(autoRestoreRow);
        expect(localStorage.getItem('profile_auto_enforce_v1')).toBe('false');
        expect(mockProps.addLog).toHaveBeenCalledWith('Auto-Enforcer disabled.');
    });

    it('should show checkbox panel when Clear Saved Data is clicked', () => {
        render(<SettingsTab {...mockProps} />);
        fireEvent.click(screen.getByText('Clear Saved Data'));
        expect(screen.getByText('What to clear?')).toBeDefined();
        expect(screen.getByText('Clear Selected')).toBeDefined();
        expect(screen.getByText('Cancel')).toBeDefined();
    });

    it('should render all reset options', () => {
        render(<SettingsTab {...mockProps} />);
        fireEvent.click(screen.getByText('Clear Saved Data'));
        expect(screen.getByText('Rank overrides')).toBeDefined();
        expect(screen.getByText('Challenge overrides')).toBeDefined();
        expect(screen.getByText('Background skin')).toBeDefined();
        expect(screen.getByText('Tokens, Title, Banner & Crest')).toBeDefined();
        expect(screen.getByText('Profile icon')).toBeDefined();
        expect(screen.getByText('Status & Bio')).toBeDefined();
        expect(screen.getByText('Auto-Enforcer & localStorage')).toBeDefined();
    });

    it('should hide checkbox panel on Cancel', () => {
        render(<SettingsTab {...mockProps} />);
        fireEvent.click(screen.getByText('Clear Saved Data'));
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('What to clear?')).toBeNull();
    });

    it('should call lcuRequest when Clear Selected is clicked with default options', async () => {
        localStorage.setItem('profile_saved_icon_v1', '42');
        const lcuReq = vi.fn(() => Promise.resolve({ lol: {} }));
        render(<SettingsTab {...mockProps} lcuRequest={lcuReq} showToast={vi.fn()} />);
        fireEvent.click(screen.getByText('Clear Saved Data'));
        fireEvent.click(screen.getByText('Clear Selected'));
        expect(localStorage.getItem('profile_auto_enforce_v1')).toBeNull();
        await waitFor(() => {
            expect(lcuReq).toHaveBeenCalledWith('GET', '/lol-chat/v1/me');
        });
    });

    it('should not call lcuRequest when all options are unchecked', () => {
        const lcuReq = vi.fn(() => Promise.resolve({ lol: {} }));
        render(<SettingsTab {...mockProps} lcuRequest={lcuReq} showToast={vi.fn()} />);
        fireEvent.click(screen.getByText('Clear Saved Data'));
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(cb => fireEvent.click(cb));
        fireEvent.click(screen.getByText('Clear Selected'));
        expect(lcuReq).not.toHaveBeenCalled();
    });

    describe('importSettings', () => {
        beforeEach(() => {
            mockInvoke.mockReset();
            mockOpen.mockReset();
            localStorage.clear();
        });

        it('should import settings from a JSON file via Tauri invoke', async () => {
            const fileContent = JSON.stringify({
                profile_saved_icon_v1: '99',
                profile_auto_enforce_v1: 'true',
                profile_saved_bio_v1: 'Hello World',
            });
            mockOpen.mockResolvedValue('/fake/path/settings.json');
            mockInvoke.mockResolvedValue(fileContent);

            const showToast = vi.fn();
            render(<SettingsTab {...mockProps} showToast={showToast} />);

            fireEvent.click(screen.getByText('Import'));
            await waitFor(() => {
                expect(mockInvoke).toHaveBeenCalledWith('read_text_file', { path: '/fake/path/settings.json' });
            });

            expect(localStorage.getItem('profile_saved_icon_v1')).toBe('99');
            expect(localStorage.getItem('profile_auto_enforce_v1')).toBe('true');
            expect(localStorage.getItem('profile_saved_bio_v1')).toBe('Hello World');
            expect(showToast).toHaveBeenCalledWith('Settings imported! Restart for full effect.', 'success');
        });

        it('should remove keys that are null in the imported JSON', async () => {
            localStorage.setItem('profile_saved_icon_v1', 'old-value');
            const fileContent = JSON.stringify({ profile_saved_icon_v1: null });
            mockOpen.mockResolvedValue('/fake/path.json');
            mockInvoke.mockResolvedValue(fileContent);

            render(<SettingsTab {...mockProps} showToast={vi.fn()} />);
            fireEvent.click(screen.getByText('Import'));
            await waitFor(() => {
                expect(localStorage.getItem('profile_saved_icon_v1')).toBeNull();
            });
        });

        it('should sanitize control characters from imported values', async () => {
            const malicious = 'hello\x00\x01\x02world\x7F';
            const fileContent = JSON.stringify({ profile_saved_bio_v1: malicious });
            mockOpen.mockResolvedValue('/fake/path.json');
            mockInvoke.mockResolvedValue(fileContent);

            render(<SettingsTab {...mockProps} showToast={vi.fn()} />);
            fireEvent.click(screen.getByText('Import'));
            await waitFor(() => {
                const stored = localStorage.getItem('profile_saved_bio_v1');
                expect(stored).toBe('helloworld');
                expect(stored).not.toContain('\x00');
                expect(stored).not.toContain('\x7F');
            });
        });

        it('should not write non-string values to localStorage', async () => {
            const fileContent = JSON.stringify({ profile_saved_icon_v1: 42 });
            mockOpen.mockResolvedValue('/fake/path.json');
            mockInvoke.mockResolvedValue(fileContent);

            render(<SettingsTab {...mockProps} showToast={vi.fn()} />);
            fireEvent.click(screen.getByText('Import'));
            await waitFor(() => {
                expect(localStorage.getItem('profile_saved_icon_v1')).toBeNull();
            });
        });

        it('should handle import failure gracefully', async () => {
            mockOpen.mockResolvedValue('/fake/path.json');
            mockInvoke.mockRejectedValue(new Error('Read error'));

            const showToast = vi.fn();
            render(<SettingsTab {...mockProps} showToast={showToast} />);
            fireEvent.click(screen.getByText('Import'));
            await waitFor(() => {
                expect(showToast).toHaveBeenCalledWith('Settings import failed', 'error');
            });
        });

        it('should do nothing when no file is selected', async () => {
            mockOpen.mockResolvedValue(null);
            render(<SettingsTab {...mockProps} showToast={vi.fn()} />);
            fireEvent.click(screen.getByText('Import'));
            await waitFor(() => {
                expect(mockInvoke).not.toHaveBeenCalled();
            });
        });
    });

    describe('exportSettings', () => {
        beforeEach(() => {
            mockInvoke.mockReset();
            mockSave.mockReset();
            localStorage.clear();
        });

        it('should export settings to a file via Tauri invoke', async () => {
            localStorage.setItem('profile_saved_icon_v1', '55');
            mockSave.mockResolvedValue('/fake/export.json');
            mockInvoke.mockResolvedValue(undefined);

            const showToast = vi.fn();
            render(<SettingsTab {...mockProps} showToast={showToast} />);
            fireEvent.click(screen.getByText('Export'));
            await waitFor(() => {
                expect(mockInvoke).toHaveBeenCalledWith(
                    'save_logs_to_path',
                    expect.objectContaining({ path: '/fake/export.json' })
                );
                expect(showToast).toHaveBeenCalledWith('Settings exported!', 'success');
            });
        });

        it('should not export when no save path is chosen', async () => {
            mockSave.mockResolvedValue(null);
            render(<SettingsTab {...mockProps} showToast={vi.fn()} />);
            fireEvent.click(screen.getByText('Export'));
            await waitFor(() => {
                expect(mockInvoke).not.toHaveBeenCalled();
            });
        });
    });
});
