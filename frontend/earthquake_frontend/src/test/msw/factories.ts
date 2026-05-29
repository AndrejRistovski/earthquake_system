import type { Earthquake, PageResponse } from '../../api/types/earthquake.ts';

let _nextId = 1;

export const makeEarthquake = (overrides: Partial<Earthquake> = {}): Earthquake => {
    const id = _nextId++;
    return {
        id,
        usgsId: `us7000test${id}`,
        magnitude: 2.1,
        magType: 'ml',
        place: '10 km N of TestCity',
        title: 'M 2.1 - 10 km N of TestCity',
        time: '2025-01-01T12:00:00.000Z',
        latitude: 34.05,
        longitude: -118.25,
        depth: 10.0,
        ...overrides,
    };
};

export const makePageResponse = <T>(
    content: T[],
    overrides: Partial<PageResponse<T>> = {},
): PageResponse<T> => ({
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    ...overrides,
});

/**
 * The canonical three-earthquake fixture used across unit + E2E tests.
 */
export const FIXTURE_EARTHQUAKES: Earthquake[] = [
    {
        id: 1,
        usgsId: 'us7000test1',
        magnitude: 2.1,
        magType: 'ml',
        place: '10 km N of TestCity',
        title: 'M 2.1 - 10 km N of TestCity',
        time: '2025-01-01T12:00:00.000Z',
        latitude: 34.05,
        longitude: -118.25,
        depth: 10.0,
    },
    {
        id: 2,
        usgsId: 'us7000test2',
        magnitude: 5.4,
        magType: 'mw',
        place: '25 km E of OtherCity',
        title: 'M 5.4 - 25 km E of OtherCity',
        time: '2025-01-01T06:00:00.000Z',
        latitude: 37.77,
        longitude: -122.42,
        depth: 25.5,
    },
    {
        id: 3,
        usgsId: 'us7000test3',
        magnitude: 7.8,
        magType: 'mw',
        place: 'Near SomeIsland',
        title: 'M 7.8 - Near SomeIsland',
        time: '2025-01-01T00:00:00.000Z',
        latitude: -35.0,
        longitude: 175.5,
        depth: 45.2,
    },
];

export const FIXTURE_PAGE_RESPONSE: PageResponse<Earthquake> = makePageResponse(FIXTURE_EARTHQUAKES);
