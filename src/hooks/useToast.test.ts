import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('should show and hide a toast message', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.showToast('Test Toast', 'success');
        });

        expect(result.current.message).toEqual({ text: 'Test Toast', type: 'success' });

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.message).toEqual({ text: '', type: '' });
    });

    it('should clear existing timer when showing a new toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.showToast('First Toast', 'success');
        });

        act(() => {
            vi.advanceTimersByTime(1500);
            result.current.showToast('Second Toast', 'error');
        });

        expect(result.current.message).toEqual({ text: 'Second Toast', type: 'error' });

        act(() => {
            vi.advanceTimersByTime(1500);
        });

        // Should still be visible because second toast reset the timer
        expect(result.current.message).toEqual({ text: 'Second Toast', type: 'error' });

        act(() => {
            vi.advanceTimersByTime(1500);
        });

        expect(result.current.message).toEqual({ text: '', type: '' });
    });
});
