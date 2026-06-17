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

    it('should copy logs to clipboard when copy button is clicked', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        render(<LogsTab {...mockProps} />);
        const copyBtn = screen.getByText('COPY');
        fireEvent.click(copyBtn);
        expect(writeTextMock).toHaveBeenCalledWith('[12:00:00] Test Log 1\n[12:00:01] Test Log 2');
    });

    it('should copy individual log entry when its Copy button is clicked', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        render(<LogsTab {...mockProps} />);
        const copyBtns = screen.getAllByRole('button', { name: 'Copy' });
        expect(copyBtns).toHaveLength(2);
        
        fireEvent.click(copyBtns[0]);
        expect(writeTextMock).toHaveBeenCalledWith('[12:00:00] Test Log 1');
        expect(mockProps.showToast).toHaveBeenCalledWith('Log line copied!', 'success');
    });
});
