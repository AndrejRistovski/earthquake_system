import axiosInstance from '../axios/axios';
import type { Earthquake, EarthquakeFilters, PageResponse } from './types/earthquake';

/**
 * Build the shared query params for both endpoints. Categories are serialised
 * as repeated keys (`categories=SMALL&categories=MEDIUM`) so Spring binds them
 * straight into a Set<MagnitudeCategory>.
 */
const buildParams = (filters: EarthquakeFilters): Record<string, unknown> => {
    const params: Record<string, unknown> = {};
    if (filters.minMagnitude !== undefined) params.minMagnitude = filters.minMagnitude;
    if (filters.categories && filters.categories.length > 0) params.categories = filters.categories;
    if (filters.from !== undefined) params.from = filters.from;
    if (filters.to !== undefined) params.to = filters.to;
    return params;
};

const repeatArraySerializer = {
    indexes: null as null, // axios convention for "repeat without brackets"
};

export const getEarthquakesPage = async (
    filters: EarthquakeFilters,
    page: number,
    size: number,
): Promise<PageResponse<Earthquake>> => {
    const { data } = await axiosInstance.get<PageResponse<Earthquake>>('/api/earthquakes', {
        params: { ...buildParams(filters), page, size },
        paramsSerializer: repeatArraySerializer,
    });
    return data;
};

export const getAllEarthquakes = async (
    filters: EarthquakeFilters,
): Promise<Earthquake[]> => {
    const { data } = await axiosInstance.get<Earthquake[]>('/api/earthquakes/all', {
        params: buildParams(filters),
        paramsSerializer: repeatArraySerializer,
    });
    return data;
};
