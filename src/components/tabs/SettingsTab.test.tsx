import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsTab from './SettingsTab';

// Mock Tauri plugin-autostart
vi.mock('@tauri-apps/plugin-autostart', () => ({
    enable: vi.fn(),
    disable: vi.fn(),
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

    it('should call lcuRequest when Clear Selected is clicked with default options', () => {
        localStorage.setItem('profile_saved_icon_v1', '42');
        const lcuReq = vi.fn(() => Promise.resolve({ lol: {} }));
        render(<SettingsTab {...mockProps} lcuRequest={lcuReq} showToast={vi.fn()} />);
        fireEvent.click(screen.getByText('Clear Saved Data'));
        fireEvent.click(screen.getByText('Clear Selected'));
        expect(localStorage.getItem('profile_auto_enforce_v1')).toBeNull();
        expect(lcuReq).toHaveBeenCalledWith('GET', '/lol-chat/v1/me');
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
});
