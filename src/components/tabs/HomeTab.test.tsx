import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeTab from './HomeTab';

describe('HomeTab', () => {
    const mockProps = {
        lcu: { port: '1234', token: 'secret' },
        clientVersion: '1.3.7',
        setActiveTab: vi.fn()
    };

    it('should render welcome message and version', () => {
        render(<HomeTab {...mockProps} />);
        expect(screen.getByText('League Profile Tool')).toBeDefined();
        expect(screen.getByText('v1.3.7')).toBeDefined();
        expect(screen.getByText('CLIENT CONNECTED')).toBeDefined();
    });

    it('should show waiting status when LCU is not connected', () => {
        render(<HomeTab {...mockProps} lcu={null} />);
        expect(screen.getByText('WAITING FOR CLIENT')).toBeDefined();
    });

    it('should navigate through categories to reach features', () => {
        render(<HomeTab {...mockProps} />);

        // Click on Customization category
        fireEvent.click(screen.getByText('Customization').closest('button')!);
        expect(screen.getByText('Back to Categories')).toBeDefined();
        
        // Now Profile Bio should be visible
        fireEvent.click(screen.getByText('Profile Bio').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('profile');

        // Go back
        fireEvent.click(screen.getByText(/Back to Categories/i));
        expect(screen.getByText('Customization')).toBeDefined();

        // Click on Enhancements category
        fireEvent.click(screen.getByText('Enhancements').closest('button')!);
        fireEvent.click(screen.getByText('Music Sync').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('music');
    });

    it('should reach System features through its category', () => {
        render(<HomeTab {...mockProps} />);
        
        fireEvent.click(screen.getByText('System').closest('button')!);
        fireEvent.click(screen.getByText('System Logs').closest('button')!);
        expect(mockProps.setActiveTab).toHaveBeenCalledWith('logs');
    });
});
