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
        expect(screen.getByText('UPDATE NOW')).toHaveAttribute('href', 'https://github.com/L9Lenny/lol-profile-editor/releases/latest');
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
});
