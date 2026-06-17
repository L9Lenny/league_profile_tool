import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LogsTab from './LogsTab';

describe('LogsTab', () => {
    const mockProps = {
        logs: [
            { id: '4', time: '12:00:03', msg: 'configured client settings successfully' },
            { id: '3', time: '12:00:02', msg: 'POST /lol-chat/v1/friends 400 [10, true, null] error' },
            { id: '2', time: '12:00:01', msg: 'failed database connection error' },
            { id: '1', time: '12:00:00', msg: 'GET /lol-champ-select/v1/session 200 {"active": true, "count": 5}' },
        ],
        exportLogs: vi.fn(),
        clearLogs: vi.fn(),
        showToast: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render log entries and parse badges', () => {
        render(<LogsTab {...mockProps} />);
        
        // Assert log message clean text is rendered
        expect(screen.getByText(/GET \/lol-champ-select\/v1\/session/)).toBeDefined();
        expect(screen.getByText('failed database connection error')).toBeDefined();
        expect(screen.getByText(/POST \/lol-chat\/v1\/friends/)).toBeDefined();
        expect(screen.getByText('configured client settings successfully')).toBeDefined();

        // Assert HTTP method badges
        expect(screen.getByText('GET')).toBeDefined();
        expect(screen.getByText('POST')).toBeDefined();

        // Assert HTTP status badges
        expect(screen.getByText('200')).toBeDefined();
        expect(screen.getByText('400')).toBeDefined();

        // Assert JSON badges
        const jsonBadges = screen.getAllByText('[JSON]');
        expect(jsonBadges.length).toBe(2);
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
        expect(writeTextMock).toHaveBeenCalledWith(
            '[12:00:03] configured client settings successfully\n' +
            '[12:00:02] POST /lol-chat/v1/friends 400 [10, true, null] error\n' +
            '[12:00:01] failed database connection error\n' +
            '[12:00:00] GET /lol-champ-select/v1/session 200 {"active": true, "count": 5}'
        );
    });

    it('should copy individual log entry when its Copy button is clicked', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        render(<LogsTab {...mockProps} />);
        const copyBtns = screen.getAllByRole('button', { name: 'Copy log line' });
        expect(copyBtns).toHaveLength(4);
        
        fireEvent.click(copyBtns[2]); // Log 2 (index 2 in descending array)
        expect(writeTextMock).toHaveBeenCalledWith('[12:00:01] failed database connection error');
        await waitFor(() => {
            expect(mockProps.showToast).toHaveBeenCalledWith('Log line copied!', 'success');
        });
    });

    it('should filter log entries by search term and display match counter', () => {
        render(<LogsTab {...mockProps} />);
        
        // Search term filtering
        const searchInput = screen.getByPlaceholderText('Search logs...');
        fireEvent.change(searchInput, { target: { value: 'database' } });
        
        expect(screen.queryByText(/GET \/lol-champ-select\/v1\/session/)).toBeNull();
        expect(screen.getByText('failed database connection error')).toBeDefined();
        
        // Match counter is displayed
        expect(screen.getByText('MATCHES: 1/4')).toBeDefined();

        // Clear search
        fireEvent.change(searchInput, { target: { value: '' } });
        expect(screen.getByText(/GET \/lol-champ-select\/v1\/session/)).toBeDefined();
        expect(screen.queryByText('MATCHES: 1/4')).toBeNull();
    });

    it('should filter log entries by severity level cards', () => {
        render(<LogsTab {...mockProps} />);

        // By default, 4 logs (Total Logs card)
        expect(screen.getByText('Total Logs')).toBeDefined();
        expect(screen.getByText('Errors')).toBeDefined();
        
        // Filter by Errors (Log 2 and Log 3)
        fireEvent.click(screen.getByText('Errors'));
        expect(screen.queryByText(/GET \/lol-champ-select\/v1\/session/)).toBeNull();
        expect(screen.getByText('failed database connection error')).toBeDefined();
        expect(screen.getByText(/POST \/lol-chat\/v1\/friends/)).toBeDefined();
        expect(screen.getByText('MATCHES: 2/4')).toBeDefined();

        // Filter by Successes (Log 4)
        fireEvent.click(screen.getByText('Successes'));
        expect(screen.queryByText('failed database connection error')).toBeNull();
        expect(screen.getByText('configured client settings successfully')).toBeDefined();
        expect(screen.getByText('MATCHES: 1/4')).toBeDefined();

        // Filter by Info (Log 1)
        fireEvent.click(screen.getByText('System Info'));
        expect(screen.queryByText('configured client settings successfully')).toBeNull();
        expect(screen.getByText(/GET \/lol-champ-select\/v1\/session/)).toBeDefined();
        expect(screen.getByText('MATCHES: 1/4')).toBeDefined();

        // Reset filter
        fireEvent.click(screen.getByText('Total Logs'));
        expect(screen.getByText('configured client settings successfully')).toBeDefined();
        expect(screen.queryByText('MATCHES:')).toBeNull();
    });

    it('should toggle sort order between chronological and reverse', () => {
        render(<LogsTab {...mockProps} />);

        // Default: NEWEST (descending order: Log 4 first, then Log 3, etc.)
        const logElementsBefore = screen.getAllByText(/12:00:0/);
        expect(logElementsBefore[0].textContent).toBe('[12:00:03]'); // Log 4 (newest)
        expect(logElementsBefore[3].textContent).toBe('[12:00:00]'); // Log 1 (oldest)

        // Click sort toggle (from desc to asc)
        const sortBtn = screen.getByRole('button', { name: /NEWEST/ });
        fireEvent.click(sortBtn);

        // Ascending order: Log 1 first, then Log 2, etc.
        const logElementsAfter = screen.getAllByText(/12:00:0/);
        expect(logElementsAfter[0].textContent).toBe('[12:00:00]'); // Log 1 (oldest)
        expect(logElementsAfter[3].textContent).toBe('[12:00:03]'); // Log 4 (newest)
    });

    it('should toggle auto-scroll state', () => {
        render(<LogsTab {...mockProps} />);

        const scrollBtn = screen.getByRole('button', { name: /LOCK SCROLL/ });
        expect(scrollBtn).toBeDefined();

        // Click to toggle
        fireEvent.click(scrollBtn);
        expect(screen.getByRole('button', { name: /FREE SCROLL/ })).toBeDefined();
    });

    it('should expand and collapse log details on click, and allow copying JSON', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        render(<LogsTab {...mockProps} />);

        // Initially no detail pane is open
        expect(screen.queryByText('JSON Payload')).toBeNull();

        // Click Log 1 row to expand
        const log1Row = screen.getByText(/GET \/lol-champ-select\/v1\/session/);
        fireEvent.click(log1Row);

        // Detail pane should render raw message and JSON header
        expect(screen.getByText('JSON Payload')).toBeDefined();
        expect(screen.getByText('GET /lol-champ-select/v1/session 200 {"active": true, "count": 5}')).toBeDefined();

        // Click COPY JSON
        const copyJsonBtn = screen.getByRole('button', { name: 'COPY JSON' });
        fireEvent.click(copyJsonBtn);
        expect(writeTextMock).toHaveBeenCalledWith('{\n  "active": true,\n  "count": 5\n}');
        await waitFor(() => {
            expect(mockProps.showToast).toHaveBeenCalledWith('JSON payload copied!', 'success');
        });

        // Click Log 1 row again to collapse
        fireEvent.click(log1Row);
        expect(screen.queryByText('JSON Payload')).toBeNull();
    });

    it('should parse and format JSON array detail pane correctly', () => {
        render(<LogsTab {...mockProps} />);

        // Click Log 3 row (which contains JSON array: [10, true, null])
        const log3Row = screen.getByText(/POST \/lol-chat\/v1\/friends/);
        fireEvent.click(log3Row);

        expect(screen.getByText('JSON Payload')).toBeDefined();
        expect(screen.getByText('10')).toBeDefined();
        expect(screen.getByText('true')).toBeDefined();
        expect(screen.getByText('null')).toBeDefined();
    });

    it('should render empty states correctly', () => {
        render(<LogsTab {...mockProps} />);

        // Filter search to a term with no matches
        const searchInput = screen.getByPlaceholderText('Search logs...');
        fireEvent.change(searchInput, { target: { value: 'nonexistent-log-message' } });

        expect(screen.getByText('No logs match "nonexistent-log-message"')).toBeDefined();

        // Clear search
        fireEvent.change(searchInput, { target: { value: '' } });

        // Filter to a severity with no matches (e.g. if we had no logs for that level)
        // Let's render with empty logs
        render(<LogsTab {...mockProps} logs={[]} />);
        expect(screen.getByText('No diagnostics available')).toBeDefined();
    });
});
