import {describe, it, expect, vi, beforeEach} from 'vitest';
import React from 'react';
import type {ReactNode} from 'react';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
    useEarthquakesPage,
    earthquakePageQueryKey,
} from './useEarthquakesPage';
import type {EarthquakeFilters, PageResponse, Earthquake} from '../api/types/earthquake';
import {makeEarthquake, makePageResponse} from '../test/msw/factories';

vi.mock('../api/earthquakeApi', () => ({
    getEarthquakesPage: vi.fn(),
    getAllEarthquakes: vi.fn(),
}));

import {getEarthquakesPage} from '../api/earthquakeApi';

const mockGetEarthquakesPage = vi.mocked(getEarthquakesPage);

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
    mockGetEarthquakesPage.mockClear();
});

describe('earthquakePageQueryKey', () => {
    it('returns [earthquakes, page, filters, page, size]', () => {
        const filters: EarthquakeFilters = {minMagnitude: 2.5};
        expect(earthquakePageQueryKey(filters, 0, 20)).toEqual([
            'earthquakes',
            'page',
            filters,
            0,
            20,
        ]);
    });

    it('stable identity with frozen filters object', () => {
        const filters: EarthquakeFilters = Object.freeze({from: '2025-01-01T00:00:00.000Z'});
        const key1 = earthquakePageQueryKey(filters, 1, 10);
        const key2 = earthquakePageQueryKey(filters, 1, 10);
        expect(key1).toEqual(key2);
    });
});

describe('useEarthquakesPage', () => {
    it('resolves to mocked PageResponse', async () => {
        const earthquakes = [makeEarthquake()];
        const page: PageResponse<Earthquake> = makePageResponse(earthquakes);
        mockGetEarthquakesPage.mockResolvedValueOnce(page);

        const {Wrapper} = makeWrapper();
        const {result} = renderHook(
            () => useEarthquakesPage({}, 0, 20),
            {wrapper: Wrapper},
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(page);
    });

    it('calls getEarthquakesPage with forwarded signal', async () => {
        const page: PageResponse<Earthquake> = makePageResponse([makeEarthquake()]);
        mockGetEarthquakesPage.mockResolvedValueOnce(page);

        const {Wrapper} = makeWrapper();
        renderHook(() => useEarthquakesPage({}, 0, 20), {wrapper: Wrapper});

        await waitFor(() => expect(mockGetEarthquakesPage).toHaveBeenCalledOnce());

        const [, , , signal] = mockGetEarthquakesPage.mock.calls[0]!;
        // signal should be an AbortSignal (TanStack Query provides one)
        expect(signal).toBeDefined();
    });

    it('keepPreviousData: holds previous data while fetching page=1', async () => {
        const page0 = makePageResponse([makeEarthquake({id: 100, place: 'Page0City'})]);
        const page1 = makePageResponse([makeEarthquake({id: 200, place: 'Page1City'})]);

        // First call resolves immediately; second call is slow (controlled)
        let resolvePage1: (value: PageResponse<Earthquake>) => void;
        const page1Promise = new Promise<PageResponse<Earthquake>>((resolve) => {
            resolvePage1 = resolve;
        });

        mockGetEarthquakesPage
            .mockResolvedValueOnce(page0)
            .mockReturnValueOnce(page1Promise);

        const {Wrapper} = makeWrapper();
        const {result, rerender} = renderHook(
            ({p}: { p: number }) => useEarthquakesPage({}, p, 20),
            {wrapper: Wrapper, initialProps: {p: 0}},
        );

        // Wait for page 0 to resolve
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(page0);

        // Switch to page 1 (slow)
        rerender({p: 1});

        // keepPreviousData: previous data is still available while fetching
        await waitFor(() => expect(result.current.isFetching).toBe(true));
        expect(result.current.data).toEqual(page0);

        // Resolve page 1
        resolvePage1!(page1);

        // New data arrives
        await waitFor(() => expect(result.current.data).toEqual(page1));
    });

    it('isLoading=true on initial fetch before data arrives', async () => {
        let resolveFirst: (value: PageResponse<Earthquake>) => void;
        const slowPromise = new Promise<PageResponse<Earthquake>>((resolve) => {
            resolveFirst = resolve;
        });
        mockGetEarthquakesPage.mockReturnValueOnce(slowPromise);

        const {Wrapper} = makeWrapper();
        const {result} = renderHook(
            () => useEarthquakesPage({}, 0, 20),
            {wrapper: Wrapper},
        );

        expect(result.current.isLoading).toBe(true);
        resolveFirst!(makePageResponse([]));
        await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
});
