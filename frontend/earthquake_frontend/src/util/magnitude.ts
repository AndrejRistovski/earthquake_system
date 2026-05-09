/**
 * Single source of truth for magnitude category bounds and visual styling.
 *
 * Bounds match the backend MagnitudeCategory enum exactly:
 *   SMALL  : [0, 4)
 *   MEDIUM : [4, 7)
 *   LARGE  : [7, +∞)
 *
 * Consumed by:
 *   - EarthquakeTable chip color
 *   - EarthquakeMap marker color
 *   - FilterBar category buttons
 */

export type MagnitudeCategory = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface MagnitudeCategoryMeta {
    label: string;
    lowerInclusive: number;
    upperExclusive: number;
    /** Hex color for raw rendering (map markers). */
    hex: string;
    /** MUI semantic color token, for components that accept the standard palette. */
    muiColor: 'success' | 'warning' | 'error';
}

export const MAGNITUDE_CATEGORIES: Record<MagnitudeCategory, MagnitudeCategoryMeta> = {
    SMALL: {
        label: 'Small',
        lowerInclusive: 0,
        upperExclusive: 4,
        hex: '#22c55e',
        muiColor: 'success',
    },
    MEDIUM: {
        label: 'Medium',
        lowerInclusive: 4,
        upperExclusive: 7,
        hex: '#eab308',
        muiColor: 'warning',
    },
    LARGE: {
        label: 'Large',
        lowerInclusive: 7,
        upperExclusive: Number.POSITIVE_INFINITY,
        hex: '#ef4444',
        muiColor: 'error',
    },
};

/** Ordered list, useful for rendering buttons in the canonical order. */
export const MAGNITUDE_CATEGORY_ORDER: MagnitudeCategory[] = ['SMALL', 'MEDIUM', 'LARGE'];

/**
 * Maps a magnitude to its category. Returns null for null/NaN inputs so callers
 * can decide how to render unknown magnitudes.
 */
export const getCategory = (magnitude: number | null | undefined): MagnitudeCategory | null => {
    if (magnitude === null || magnitude === undefined || Number.isNaN(magnitude)) return null;
    if (magnitude < 4) return 'SMALL';
    if (magnitude < 7) return 'MEDIUM';
    return 'LARGE';
};
