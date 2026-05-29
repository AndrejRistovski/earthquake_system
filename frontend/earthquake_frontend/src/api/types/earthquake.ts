import type { MagnitudeCategory } from '../../util/magnitude.ts';

export interface Earthquake {
    id: number;
    usgsId: string;
    magnitude: number | null;
    magType: string | null;
    place: string | null;
    title: string | null;
    time: string;
    latitude: number | null;
    longitude: number | null;
    depth: number | null;
}

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface EarthquakeFilters {
    minMagnitude?: number;
    categories?: MagnitudeCategory[];
    from?: string;
    to?: string;
}
