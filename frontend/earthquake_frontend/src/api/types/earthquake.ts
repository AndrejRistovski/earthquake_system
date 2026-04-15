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

export interface FilterParams {
    minMagnitude?: number;
    after?: string;
}