import {useState, useCallback} from 'react';
import type {Earthquake, FilterParams} from "../api/types/earthquake.ts";
import {getEarthquakes, refreshEarthquakes} from "../api/earthquakeApi.ts";

interface UseEarthquakesReturn {
    earthquakes: Earthquake[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    fetchEarthquakes: (filters?: FilterParams) => Promise<void>;
    triggerRefresh: () => Promise<void>;
}

export const useEarthquakes = (): UseEarthquakesReturn => {
    const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEarthquakes = useCallback(async (filters: FilterParams = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getEarthquakes(filters);
            setEarthquakes(data);
        } catch {
            setError('Failed to load earthquake data.');
        } finally {
            setLoading(false);
        }
    }, []);

    const triggerRefresh = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const data = await refreshEarthquakes();
            setEarthquakes(data);
        } catch {
            setError('Failed to fetch data from USGS.');
        } finally {
            setRefreshing(false);
        }
    }, []);

    return {earthquakes, loading, refreshing, error, fetchEarthquakes, triggerRefresh};
};