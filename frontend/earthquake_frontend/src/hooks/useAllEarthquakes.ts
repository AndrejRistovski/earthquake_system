import { useQuery } from '@tanstack/react-query';
import { getAllEarthquakes } from '../api/earthquakeApi.ts';
import type { Earthquake, EarthquakeFilters } from '../api/types/earthquake.ts';

export const allEarthquakesQueryKey = (filters: EarthquakeFilters) =>
    ['earthquakes', 'all', filters] as const;

/**
 * Unpaged query for the map. Same filter inputs as the table query so the two
 * stay in lockstep, but the response is the full set of matching events so the
 * map can render every marker at once regardless of the table's current page.
 */
export const useAllEarthquakes = (filters: EarthquakeFilters) => {
    return useQuery<Earthquake[]>({
        queryKey: allEarthquakesQueryKey(filters),
        queryFn: ({ signal }) => getAllEarthquakes(filters, signal),
    });
};
