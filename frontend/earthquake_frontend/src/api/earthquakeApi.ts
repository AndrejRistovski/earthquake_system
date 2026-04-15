import axios from 'axios';
import type {Earthquake, FilterParams} from "./types/earthquake.ts";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9090';

const api = axios.create({baseURL: BASE_URL});

export const refreshEarthquakes = async (): Promise<Earthquake[]> => {
    const {data} = await api.post<Earthquake[]>('/api/earthquakes/refresh');
    return data;
};

export const getEarthquakes = async (filters: FilterParams = {}): Promise<Earthquake[]> => {
    const {data} = await api.get<Earthquake[]>('/api/earthquakes', {
        params: {
            ...(filters.minMagnitude !== undefined && {minMagnitude: filters.minMagnitude}),
            ...(filters.after !== undefined && {after: filters.after}),
        },
    });
    return data;
};