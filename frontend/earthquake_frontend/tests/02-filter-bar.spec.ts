import { test, expect, waitForTable, MOCK_PAGE_RESPONSE, MOCK_EARTHQUAKES, type MockPageResponse, type MockEarthquake } from './fixtures.ts';

const ALL_PAGE = MOCK_PAGE_RESPONSE;
const MAG5_PLUS: MockEarthquake[] = MOCK_EARTHQUAKES.slice(1);
const MAG5_PLUS_PAGE: MockPageResponse = { ...ALL_PAGE, content: MAG5_PLUS, totalElements: 2 };
const LARGE_ONLY: MockEarthquake[] = [MOCK_EARTHQUAKES[2]];
const LARGE_ONLY_PAGE: MockPageResponse = { ...ALL_PAGE, content: LARGE_ONLY, totalElements: 1 };

/**
 * Sets up route intercepts with a closure variable for the table response so
 * individual tests can swap the returned data mid-test without adding extra
 * route handlers (which would also intercept /all and return the wrong shape).
 */
async function setupRoutes(page: Parameters<typeof waitForTable>[0], initial: MockPageResponse = ALL_PAGE) {
    let pageResponse = initial;
    const setPage = (r: MockPageResponse) => { pageResponse = r; };

    await page.route('**/api/earthquakes**', async (route) => {
        await route.fulfill({ json: pageResponse });
    });
    await page.route('**/api/earthquakes/all**', async (route) => {
        await route.fulfill({ json: MOCK_EARTHQUAKES });
    });

    return { setPage };
}

test.describe('FilterBar interactions', () => {
    test('min magnitude filter sends correct param and updates table', async ({ page }) => {
        const { setPage } = await setupRoutes(page, ALL_PAGE);
        await page.goto('/');
        await waitForTable(page);

        setPage(MAG5_PLUS_PAGE);

        const responsePromise = page.waitForResponse(res =>
            res.url().includes('/api/earthquakes') &&
            !res.url().includes('/all') &&
            res.url().includes('minMagnitude=5')
        );

        await page.getByLabel('Min Magnitude').fill('5');
        await page.getByLabel('Min Magnitude').press('Enter');
        await responsePromise;

        await expect(page.getByRole('cell', { name: '25 km E of OtherCity' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Near SomeIsland' })).toBeVisible();
        await expect(page.getByRole('cell', { name: '10 km N of TestCity' })).not.toBeVisible();
    });

    test('Last 7d preset fires a request with a new time window', async ({ page }) => {
        await setupRoutes(page, ALL_PAGE);
        await page.goto('/');
        await waitForTable(page);

        const responsePromise = page.waitForResponse(res =>
            res.url().includes('/api/earthquakes') && !res.url().includes('/all')
        );

        await page.getByRole('group', { name: 'Time range' }).getByRole('button', { name: 'Last 7d' }).click();
        const res = await responsePromise;

        expect(res.url()).toMatch(/from=/);
        const btn = page.getByRole('group', { name: 'Time range' }).getByRole('button', { name: 'Last 7d' });
        await expect(btn).toHaveAttribute('aria-pressed', 'true');
    });

    test('Last 30d preset button becomes selected', async ({ page }) => {
        await setupRoutes(page, ALL_PAGE);
        await page.goto('/');
        await waitForTable(page);

        const responsePromise = page.waitForResponse(res =>
            res.url().includes('/api/earthquakes') && !res.url().includes('/all')
        );

        await page.getByRole('group', { name: 'Time range' }).getByRole('button', { name: 'Last 30d' }).click();
        await responsePromise;

        await expect(
            page.getByRole('group', { name: 'Time range' }).getByRole('button', { name: 'Last 30d' })
        ).toHaveAttribute('aria-pressed', 'true');
    });

    test('combined min magnitude + time preset both appear in request URL', async ({ page }) => {
        await setupRoutes(page, ALL_PAGE);
        await page.goto('/');
        await waitForTable(page);

        // Set up promise BEFORE the action so the response cannot race past the listener
        const magResponsePromise = page.waitForResponse(res =>
            res.url().includes('minMagnitude=2') && !res.url().includes('/all')
        );
        await page.getByLabel('Min Magnitude').fill('2');
        await page.getByLabel('Min Magnitude').press('Enter');
        await magResponsePromise;

        const combinedResponsePromise = page.waitForResponse(res =>
            res.url().includes('/api/earthquakes') &&
            !res.url().includes('/all') &&
            res.url().includes('minMagnitude=2')
        );
        await page.getByRole('group', { name: 'Time range' }).getByRole('button', { name: 'Last 7d' }).click();
        const res = await combinedResponsePromise;

        expect(res.url()).toContain('minMagnitude=2');
        expect(res.url()).toMatch(/from=/);
    });

    test('category filter button becomes selected and sends categories param', async ({ page }) => {
        const { setPage } = await setupRoutes(page, ALL_PAGE);
        await page.goto('/');
        await waitForTable(page);

        setPage(LARGE_ONLY_PAGE);

        const responsePromise = page.waitForResponse(res =>
            res.url().includes('categories=LARGE') && !res.url().includes('/all')
        );

        await page.getByRole('group', { name: 'Magnitude categories' }).getByRole('button', { name: 'Large' }).click();
        await responsePromise;

        await expect(page.getByRole('cell', { name: 'Near SomeIsland' })).toBeVisible();
        await expect(
            page.getByRole('group', { name: 'Magnitude categories' }).getByRole('button', { name: 'Large' })
        ).toHaveAttribute('aria-pressed', 'true');
    });

    test('switching back to Last 24h re-selects the button', async ({ page }) => {
        await setupRoutes(page, ALL_PAGE);
        await page.goto('/');
        await waitForTable(page);

        // Switch away
        const res1 = page.waitForResponse(res =>
            res.url().includes('/api/earthquakes') && !res.url().includes('/all')
        );
        await page.getByRole('group', { name: 'Time range' }).getByRole('button', { name: 'Last 7d' }).click();
        await res1;

        // Switch back — TanStack Query may serve from cache (no new request guaranteed)
        await page.getByRole('group', { name: 'Time range' }).getByRole('button', { name: 'Last 24h' }).click();

        await expect(
            page.getByRole('group', { name: 'Time range' }).getByRole('button', { name: 'Last 24h' })
        ).toHaveAttribute('aria-pressed', 'true');
        // Table still shows all three mock earthquakes (from cache or re-fetch)
        await expect(page.getByRole('cell', { name: '10 km N of TestCity' })).toBeVisible();
    });

    test('blur-vs-Enter parity: both trigger request with same param', async ({ page }) => {
        await setupRoutes(page, ALL_PAGE);
        await page.goto('/');
        await waitForTable(page);

        // Fill "5" and blur → should fire request with minMagnitude=5
        const blurResponsePromise = page.waitForResponse(res =>
            res.url().includes('minMagnitude=5') && !res.url().includes('/all')
        );
        await page.getByLabel('Min Magnitude').fill('5');
        await page.getByLabel('Min Magnitude').blur();
        await blurResponsePromise;

        // Now change to "6" and press Enter → should fire request with minMagnitude=6
        const enterResponsePromise = page.waitForResponse(res =>
            res.url().includes('minMagnitude=6') && !res.url().includes('/all')
        );
        await page.getByLabel('Min Magnitude').fill('6');
        await page.getByLabel('Min Magnitude').press('Enter');
        await enterResponsePromise;
    });

    test('deselect-all-categories: Large button is deselected after clicking again', async ({ page }) => {
        await setupRoutes(page, ALL_PAGE);
        await page.goto('/');
        await waitForTable(page);

        // Select Large first — wait for network confirmation
        const selectResponse = page.waitForResponse(res =>
            res.url().includes('categories=LARGE') && !res.url().includes('/all')
        );
        await page.getByRole('group', { name: 'Magnitude categories' }).getByRole('button', { name: 'Large' }).click();
        await selectResponse;

        // Deselect Large — TanStack may serve from cache (no new network request guaranteed
        // since the no-categories query was already cached from page load).
        // Assert the UI state and not a new network request.
        await page.getByRole('group', { name: 'Magnitude categories' }).getByRole('button', { name: 'Large' }).click();

        await expect(
            page.getByRole('group', { name: 'Magnitude categories' }).getByRole('button', { name: 'Large' })
        ).toHaveAttribute('aria-pressed', 'false');
        // Table shows all earthquakes (from cache or re-fetch)
        await expect(page.getByRole('cell', { name: '10 km N of TestCity' })).toBeVisible();
    });

    test('no-op guard: same min-mag on blur fires no new table request', async ({ page }) => {
        await setupRoutes(page, ALL_PAGE);
        await page.goto('/');
        await waitForTable(page);

        // Set mag to 3
        const firstResponse = page.waitForResponse(res =>
            res.url().includes('minMagnitude=3') && !res.url().includes('/all')
        );
        await page.getByLabel('Min Magnitude').fill('3');
        await page.getByLabel('Min Magnitude').press('Enter');
        await firstResponse;

        // Track subsequent requests
        let extraRequests = 0;
        page.on('request', (req) => {
            if (req.url().includes('/api/earthquakes') && !req.url().includes('/all')) {
                extraRequests++;
            }
        });

        // Blur with same value — should NOT fire a new request
        await page.getByLabel('Min Magnitude').click();
        await page.getByLabel('Min Magnitude').blur();

        // Give a moment for any spurious request to appear
        await page.waitForTimeout(300);
        expect(extraRequests).toBe(0);
    });
});
