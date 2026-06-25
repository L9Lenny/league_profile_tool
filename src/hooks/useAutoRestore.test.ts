import { describe, it, expect } from 'vitest';
import {
    SAVED_AVAILABILITY_KEY,
    SAVED_BIO_KEY,
    SAVED_ICON_KEY,
    SAVED_BACKGROUND_KEY,
    SAVED_TOKENS_KEY,
} from './useAutoRestore';

describe('useAutoRestore compatibility exports', () => {
    it('should export correct storage key constants', () => {
        expect(SAVED_AVAILABILITY_KEY).toBe('profile_saved_availability_v1');
        expect(SAVED_BIO_KEY).toBe('profile_saved_bio_v1');
        expect(SAVED_ICON_KEY).toBe('profile_saved_icon_v1');
        expect(SAVED_BACKGROUND_KEY).toBe('profile_saved_background_v1');
        expect(SAVED_TOKENS_KEY).toBe('profile_saved_tokens_v1');
    });
});
