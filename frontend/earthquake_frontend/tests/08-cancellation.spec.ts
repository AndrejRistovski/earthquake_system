import { test, expect } from './fixtures.ts';
import type { MockPageResponse, MockEarthquake } from './fixtures.ts';

/**
 * Regression guard: rapid filter changes, last-response-wins.
 *
 * AbortSignal is already forwarded through hooks → api → axios, and TanStack
 * query-key identity guarantees last-wins. This spec confirms correct behavior.
 * If it ever fails it means Phase 3 regressed signal forwarding or query keys.
 *
 * Strategy:
 * - Load the dashboard with initial data.
 * - Wire up a per-request counter; after initial load, the next 3 requests from
 *   the rapid toggles return DATASET_1 (slow, 300ms), DATASET_2 (medium, 200ms),
 *   DATASET_3 (fast, 0ms).
 * - Fire three preset toggles in quick succession.
 * - Assert the table settles on DATASET_3 (last toggle = fastest = last-wins).
 */

const makeEq = (id: number, place: string): MockEarthquake => ({
    id,
    usgsId: `us${id}`,
    magnitude: 2.1,
    magType: 'ml',
    place,
    title: null,
    time: '2025-01-01T12:00:00.000Z',
    latitude: 34.05,
    longitude: -118.25,
    depth: 10.0,
});

// Initial data for the first page load
const INITIAL_DATA: MockEarthquake[] = [makeEq(0, 'Initial City')];

// Three distinct datasets for the rapid toggle requests
const DATASET_1: MockEarthquake[] = [makeEq(11, 'City From Request 1')];
const DATASET_2: MockEarthquake[] = [makeEq(22, 'City From Request 2')];
const DATASET_3: MockEarthquake[] = [makeEq(33, 'City From Request 3')];

const makePage = (content: MockEarthquake[]): MockPageResponse => ({
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
});

const INITIAL_PAGE = makePage(INITIAL_DATA);

test('table settles on the last toggle\'s dataset (last-response-wins)', async ({ page }) => {
    // Track how many TABLE requests have come in after initial load
    let postLoadRequestCount = 0;
    let initialLoaded = false;

    // Table route: initial load responds immediately, then inverted delays for rapid toggles.
    // Registered FIRST so /all** (registered last) takes precedence for /all requests.
    await page.route('**/api/earthquakes**', async (route) => {
        if (!initialLoaded) {
            // Initial page load — respond immediately with initial data
            await route.fulfill({ json: INITIAL_PAGE });
            return;
        }

        // Post-load requests: inverted delays
        const n = ++postLoadRequestCount;
        let delayMs: number;
        let dataset: MockEarthquake[];

        if (n === 1) {
            // First preset toggle (7d) — slowest
            delayMs = 400;
            dataset = DATASET_1;
        } else if (n === 2) {
            // Second preset toggle (30d) — medium
            delayMs = 200;
            dataset = DATASET_2;
        } else {
            // Third preset toggle (24h, last) — fastest → should win
            delayMs = 0;
            dataset = DATASET_3;
        }

        if (delayMs > 0) {
            await new Promise<void>(r => setTimeout(r, delayMs));
        }
        await route.fulfill({ json: makePage(dataset) });
    });

    // /all (map) — always returns empty; registered LAST for correct precedence
    await page.route('**/api/earthquakes/all**', async (route) => {
        await route.fulfill({ json: [] });
    });

    await page.goto('/');
    // Wait for initial table to appear
    await page.waitForSelector('table', { timeout: 15_000 });

    // Confirm initial data is visible
    await expect(page.getByRole('cell', { name: 'Initial City' })).toBeVisible();

    // Mark initial load as done so subsequent requests use the inverted-delay logic
    initialLoaded = true;

    // Fire three rapid preset toggles: 7d → 30d → back to 24h
    // We do NOT await individual responses — we want them to overlap in flight
    const presetGroup = page.getByRole('group', { name: 'Time range' });
    await presetGroup.getByRole('button', { name: 'Last 7d' }).click();
    await presetGroup.getByRole('button', { name: 'Last 30d' }).click();
    await presetGroup.getByRole('button', { name: 'Last 24h' }).click();

    // Wait for the table to settle on the last toggle's dataset (DATASET_3)
    await expect(
        page.getByRole('cell', { name: 'City From Request 3' })
    ).toBeVisible({ timeout: 10_000 });

    // The earlier slower responses must NOT have clobbered the final result
    await expect(
        page.getByRole('cell', { name: 'City From Request 1' })
    ).not.toBeVisible();
    await expect(
        page.getByRole('cell', { name: 'City From Request 2' })
    ).not.toBeVisible();
});
