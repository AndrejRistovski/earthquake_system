import {describe, it, expect, vi, beforeEach} from 'vitest';
import React from 'react';
import type {ReactNode} from 'react';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
    useAllEarthquakes,
    allEarthquakesQueryKey,
} from './useAllEarthquakes';
import type {EarthquakeFilters} from '../api/types/earthquake';
import {makeEarthquake, FIXTURE_EARTHQUAKES} from '../test/msw/factories';

vi.mock('../api/earthquakeApi', () => ({
    getEarthquakesPage: vi.fn(),
    getAllEarthquakes: vi.fn(),
}));

import {getAllEarthquakes} from '../api/earthquakeApi';

const mockGetAllEarthquakes = vi.mocked(getAllEarthquakes);

const makeWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    const Wrapper = ({children}: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return {Wrapper, queryClient};
};

beforeEach(() => {
    mockGetAllEarthquakes.mockClear();
});

describe('allEarthquakesQueryKey', () => {
    it('returns [earthquakes, all, filters]', () => {
        const filters: EarthquakeFilters = {minMagnitude: 5};
        expect(allEarthquakesQueryKey(filters)).toEqual(['earthquakes', 'all', filters]);
    });

    it('stable identity with frozen filters object', () => {
        const filters: EarthquakeFilters = Object.freeze({categories: ['SMALL']});
        const key1 = allEarthquakesQueryKey(filters);
        const key2 = allEarthquakesQueryKey(filters);
        expect(key1).toEqual(key2);
    });
});

describe('useAllEarthquakes', () => {
    it('resolves to mocked Earthquake[]', async () => {
        mockGetAllEarthquakes.mockResolvedValueOnce(FIXTURE_EARTHQUAKES);

        const {Wrapper} = makeWrapper();
        const {result} = renderHook(
            () => useAllEarthquakes({}),
            {wrapper: Wrapper},
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(FIXTURE_EARTHQUAKES);
    });

    it('calls getAllEarthquakes with forwarded signal', async () => {
        mockGetAllEarthquakes.mockResolvedValueOnce([makeEarthquake()]);

        const {Wrapper} = makeWrapper();
        renderHook(() => useAllEarthquakes({}), {wrapper: Wrapper});

        await waitFor(() => expect(mockGetAllEarthquakes).toHaveBeenCalledOnce());

        const [, signal] = mockGetAllEarthquakes.mock.calls[0]!;
        expect(signal).toBeDefined();
    });

    it('isLoading=true on initial fetch before data arrives', async () => {
        let resolveFirst: (value: typeof FIXTURE_EARTHQUAKES) => void;
        const slowPromise = new Promise<typeof FIXTURE_EARTHQUAKES>((resolve) => {
            resolveFirst = resolve;
        });
        mockGetAllEarthquakes.mockReturnValueOnce(slowPromise);

        const {Wrapper} = makeWrapper();
        const {result} = renderHook(
            () => useAllEarthquakes({}),
            {wrapper: Wrapper},
        );

        expect(result.current.isLoading).toBe(true);
        resolveFirst!(FIXTURE_EARTHQUAKES);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('error state when getAllEarthquakes rejects', async () => {
        mockGetAllEarthquakes.mockRejectedValueOnce(new Error('Network error'));

        const {Wrapper} = makeWrapper();
        const {result} = renderHook(
            () => useAllEarthquakes({}),
            {wrapper: Wrapper},
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeInstanceOf(Error);
    });
});
