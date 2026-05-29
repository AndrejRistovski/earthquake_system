import { test as base, type Page } from '@playwright/test';

export { expect } from '@playwright/test';

export interface MockEarthquake {
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

export interface MockPageResponse {
    content: MockEarthquake[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export const MOCK_EARTHQUAKES: MockEarthquake[] = [
    {
        id: 1, usgsId: 'us7000test1',
        magnitude: 2.1, magType: 'ml',
        place: '10 km N of TestCity', title: 'M 2.1 - 10 km N of TestCity',
        time: '2025-01-01T12:00:00.000Z',
        latitude: 34.05, longitude: -118.25, depth: 10.0,
    },
    {
        id: 2, usgsId: 'us7000test2',
        magnitude: 5.4, magType: 'mw',
        place: '25 km E of OtherCity', title: 'M 5.4 - 25 km E of OtherCity',
        time: '2025-01-01T06:00:00.000Z',
        latitude: 37.77, longitude: -122.42, depth: 25.5,
    },
    {
        id: 3, usgsId: 'us7000test3',
        magnitude: 7.8, magType: 'mw',
        place: 'Near SomeIsland', title: 'M 7.8 - Near SomeIsland',
        time: '2025-01-01T00:00:00.000Z',
        latitude: -35.0, longitude: 175.5, depth: 45.2,
    },
];

export const MOCK_PAGE_RESPONSE: MockPageResponse = {
    content: MOCK_EARTHQUAKES,
    page: 0, size: 20,
    totalElements: 3, totalPages: 1,
};

export interface ProblemDetail {
    type: string;
    title: string;
    status: number;
    detail: string;
    timestamp: string;
}

export interface SetupMockRoutesOptions {
    pageResponse?: MockPageResponse;
    allResponse?: MockEarthquake[];
    status?: number;
    allDelayMs?: number;
    /** When provided, the error response will use this ProblemDetail body instead of plain text. */
    problemDetail?: ProblemDetail;
}

/**
 * Intercepts both API endpoints. The /all route is registered last so it takes
 * precedence over the more general *\/api/earthquakes** glob when both match.
 */
export async function setupMockRoutes(page: Page, options: SetupMockRoutesOptions = {}) {
    const {
        pageResponse = MOCK_PAGE_RESPONSE,
        allResponse = MOCK_EARTHQUAKES,
        status = 200,
        allDelayMs = 0,
        problemDetail,
    } = options;

    await page.route('**/api/earthquakes**', async (route) => {
        if (status !== 200) {
            if (problemDetail) {
                await route.fulfill({
                    status,
                    contentType: 'application/problem+json',
                    body: JSON.stringify(problemDetail),
                });
            } else {
                await route.fulfill({ status, body: 'Internal Server Error' });
            }
        } else {
            await route.fulfill({ json: pageResponse });
        }
    });

    await page.route('**/api/earthquakes/all**', async (route) => {
        if (allDelayMs > 0) await new Promise(r => setTimeout(r, allDelayMs));
        if (status !== 200) {
            if (problemDetail) {
                await route.fulfill({
                    status,
                    contentType: 'application/problem+json',
                    body: JSON.stringify(problemDetail),
                });
            } else {
                await route.fulfill({ status, body: 'Internal Server Error' });
            }
        } else {
            await route.fulfill({ json: allResponse });
        }
    });
}

export async function waitForTable(page: Page) {
    await page.waitForSelector('table', { timeout: 15_000 });
}

export const test = base;

/**
 * Convenience helper: navigate to the dashboard and wait for the table to load.
 */
export async function gotoDashboard(page: Page) {
    await page.goto('/');
    await waitForTable(page);
}
