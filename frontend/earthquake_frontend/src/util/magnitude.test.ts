import { describe, it, expect } from 'vitest';
import {
    getCategory,
    MAGNITUDE_CATEGORIES,
    MAGNITUDE_CATEGORY_ORDER,
} from './magnitude.ts';

describe('getCategory', () => {
    describe('boundary values', () => {
        it('0 → SMALL', () => {
            expect(getCategory(0)).toBe('SMALL');
        });

        it('3.999 → SMALL', () => {
            expect(getCategory(3.999)).toBe('SMALL');
        });

        it('4.0 → MEDIUM', () => {
            expect(getCategory(4.0)).toBe('MEDIUM');
        });

        it('6.999 → MEDIUM', () => {
            expect(getCategory(6.999)).toBe('MEDIUM');
        });

        it('7.0 → LARGE', () => {
            expect(getCategory(7.0)).toBe('LARGE');
        });

        it('9.5 → LARGE', () => {
            expect(getCategory(9.5)).toBe('LARGE');
        });

        it('POSITIVE_INFINITY → LARGE', () => {
            expect(getCategory(Number.POSITIVE_INFINITY)).toBe('LARGE');
        });
    });

    describe('nullish / invalid inputs', () => {
        it('null → null', () => {
            expect(getCategory(null)).toBeNull();
        });

        it('undefined → null', () => {
            expect(getCategory(undefined)).toBeNull();
        });

        it('NaN → null', () => {
            expect(getCategory(NaN)).toBeNull();
        });
    });

    describe('documented edge cases', () => {
        // No lower clamp — negative magnitudes map to SMALL (current behavior, documented here)
        it('-1 → SMALL (no lower clamp)', () => {
            expect(getCategory(-1)).toBe('SMALL');
        });
    });
});

describe('MAGNITUDE_CATEGORY_ORDER', () => {
    it('is exactly [SMALL, MEDIUM, LARGE] in that order', () => {
        expect(MAGNITUDE_CATEGORY_ORDER).toEqual(['SMALL', 'MEDIUM', 'LARGE']);
    });
});

describe('MAGNITUDE_CATEGORIES', () => {
    it('SMALL has muiColor success and hex #22c55e', () => {
        expect(MAGNITUDE_CATEGORIES['SMALL'].muiColor).toBe('success');
        expect(MAGNITUDE_CATEGORIES['SMALL'].hex).toBe('#22c55e');
    });

    it('MEDIUM has muiColor warning and hex #eab308', () => {
        expect(MAGNITUDE_CATEGORIES['MEDIUM'].muiColor).toBe('warning');
        expect(MAGNITUDE_CATEGORIES['MEDIUM'].hex).toBe('#eab308');
    });

    it('LARGE has muiColor error and hex #ef4444', () => {
        expect(MAGNITUDE_CATEGORIES['LARGE'].muiColor).toBe('error');
        expect(MAGNITUDE_CATEGORIES['LARGE'].hex).toBe('#ef4444');
    });
});
