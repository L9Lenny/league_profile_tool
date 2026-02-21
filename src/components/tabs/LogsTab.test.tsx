import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LogsTab from './LogsTab';

describe('LogsTab', () => {
    const mockProps = {
        logs: [
            { id: '1', time: '12:00:00', msg: 'Test Log 1' },
            { id: '2', time: '12:00:01', msg: 'Test Log 2' },
        ],
        exportLogs: vi.fn(),
        clearLogs: vi.fn(),
        showToast: vi.fn(),
    };

    it('should render log entries', () => {
        render(<LogsTab {...mockProps} />);
        expect(screen.getByText('Test Log 1')).toBeDefined();
        expect(screen.getByText('Test Log 2')).toBeDefined();
        expect(screen.getByText('[12:00:00]')).toBeDefined();
    });

    it('should call exportLogs when export button is clicked', () => {
        render(<LogsTab {...mockProps} />);
        const exportBtn = screen.getByText('EXPORT');
        fireEvent.click(exportBtn);
        expect(mockProps.exportLogs).toHaveBeenCalled();
    });

    it('should call clearLogs when clear button is clicked', () => {
        render(<LogsTab {...mockProps} />);
        const clearBtn = screen.getByText('CLEAR');
        fireEvent.click(clearBtn);
        expect(mockProps.clearLogs).toHaveBeenCalled();
    });
});
