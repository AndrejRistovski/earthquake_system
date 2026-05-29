import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosInstance from '../axios/axios.ts';
import { getEarthquakesPage, getAllEarthquakes } from './earthquakeApi.ts';
import type { Earthquake, PageResponse } from './types/earthquake.ts';
import { makeEarthquake, makePageResponse, FIXTURE_EARTHQUAKES } from '../test/msw/factories.ts';

// Use axios-mock strategy (not MSW) for wrapper/param-shaping tests.
// We test buildParams omission logic and repeat-serializer wiring by
// inspecting the call args of axiosInstance.get — not actual HTTP traffic.
const mockGet = vi.spyOn(axiosInstance, 'get');

const FIXTURE_PAGE: PageResponse<Earthquake> = makePageResponse(FIXTURE_EARTHQUAKES);

beforeEach(() => {
    mockGet.mockClear();
});

describe('getEarthquakesPage', () => {
    it('calls GET /api/earthquakes with page and size always present', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({}, 0, 20);

        expect(mockGet).toHaveBeenCalledOnce();
        const [url, config] = mockGet.mock.calls[0]!;
        expect(url).toBe('/api/earthquakes');
        expect(config!.params).toMatchObject({ page: 0, size: 20 });
    });

    it('omits minMagnitude when undefined', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({ minMagnitude: undefined }, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).not.toHaveProperty('minMagnitude');
    });

    it('includes minMagnitude when 0 (guards falsy trap)', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({ minMagnitude: 0 }, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).toHaveProperty('minMagnitude', 0);
    });

    it('includes minMagnitude when a positive value', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({ minMagnitude: 2.5 }, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).toHaveProperty('minMagnitude', 2.5);
    });

    it('omits categories when empty array', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({ categories: [] }, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).not.toHaveProperty('categories');
    });

    it('includes categories array when non-empty', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({ categories: ['SMALL', 'LARGE'] }, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).toHaveProperty('categories', ['SMALL', 'LARGE']);
    });

    it('paramsSerializer uses indexes: null for repeat-key serialization', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({}, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.paramsSerializer).toEqual({ indexes: null });
    });

    it('omits from when undefined', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({ from: undefined }, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).not.toHaveProperty('from');
    });

    it('includes from when provided', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({ from: '2025-01-01T00:00:00.000Z' }, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).toHaveProperty('from', '2025-01-01T00:00:00.000Z');
    });

    it('omits to when undefined', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({ to: undefined }, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).not.toHaveProperty('to');
    });

    it('includes to when provided', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });

        await getEarthquakesPage({ from: '2025-01-01T00:00:00.000Z', to: '2025-01-02T00:00:00.000Z' }, 0, 20);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).toHaveProperty('to', '2025-01-02T00:00:00.000Z');
    });

    it('forwards signal to axios config', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_PAGE });
        const controller = new AbortController();

        await getEarthquakesPage({}, 0, 20, controller.signal);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.signal).toBe(controller.signal);
    });

    it('returns the data from the response', async () => {
        const page = makePageResponse([makeEarthquake()]);
        mockGet.mockResolvedValueOnce({ data: page });

        const result = await getEarthquakesPage({}, 0, 20);

        expect(result).toEqual(page);
    });
});

describe('getAllEarthquakes', () => {
    it('calls GET /api/earthquakes/all', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_EARTHQUAKES });

        await getAllEarthquakes({});

        expect(mockGet).toHaveBeenCalledOnce();
        const [url] = mockGet.mock.calls[0]!;
        expect(url).toBe('/api/earthquakes/all');
    });

    it('does not include page or size params', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_EARTHQUAKES });

        await getAllEarthquakes({});

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).not.toHaveProperty('page');
        expect(config!.params).not.toHaveProperty('size');
    });

    it('omits minMagnitude when undefined', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_EARTHQUAKES });

        await getAllEarthquakes({ minMagnitude: undefined });

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).not.toHaveProperty('minMagnitude');
    });

    it('includes minMagnitude when 0 (guards falsy trap)', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_EARTHQUAKES });

        await getAllEarthquakes({ minMagnitude: 0 });

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).toHaveProperty('minMagnitude', 0);
    });

    it('omits categories when empty array', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_EARTHQUAKES });

        await getAllEarthquakes({ categories: [] });

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).not.toHaveProperty('categories');
    });

    it('includes categories when non-empty', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_EARTHQUAKES });

        await getAllEarthquakes({ categories: ['LARGE'] });

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.params).toHaveProperty('categories', ['LARGE']);
    });

    it('forwards signal to axios config', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_EARTHQUAKES });
        const controller = new AbortController();

        await getAllEarthquakes({}, controller.signal);

        const [, config] = mockGet.mock.calls[0]!;
        expect(config!.signal).toBe(controller.signal);
    });

    it('returns the data from the response', async () => {
        mockGet.mockResolvedValueOnce({ data: FIXTURE_EARTHQUAKES });

        const result = await getAllEarthquakes({});

        expect(result).toEqual(FIXTURE_EARTHQUAKES);
    });
});
