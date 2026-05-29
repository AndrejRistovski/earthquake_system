import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getEarthquakesPage } from '../api/earthquakeApi.ts';
import type { EarthquakeFilters, PageResponse, Earthquake } from '../api/types/earthquake.ts';

export const earthquakePageQueryKey = (
    filters: EarthquakeFilters,
    page: number,
    size: number,
) => ['earthquakes', 'page', filters, page, size] as const;

/**
 * Paginated query for the table. Uses {@code keepPreviousData} so the table
 * doesn't flicker to an empty state during page navigation; the previous page
 * stays visible until the new one resolves.
 */
export const useEarthquakesPage = (
    filters: EarthquakeFilters,
    page: number,
    size: number,
) => {
    return useQuery<PageResponse<Earthquake>>({
        queryKey: earthquakePageQueryKey(filters, page, size),
        queryFn: ({ signal }) => getEarthquakesPage(filters, page, size, signal),
        placeholderData: keepPreviousData,
    });
};
