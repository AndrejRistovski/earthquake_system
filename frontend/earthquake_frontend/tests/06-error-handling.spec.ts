import {test, expect} from './fixtures';

const PROBLEM_DETAIL = {
    type: 'errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
};

test.describe('Error handling — backend unreachable', () => {
    test.beforeEach(async ({page}) => {
        // Both endpoints return realistic ProblemDetail JSON (application/problem+json),
        // matching what the Spring Boot backend actually produces on 5xx errors.
        await page.route('**/api/earthquakes**', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/problem+json',
                body: JSON.stringify(PROBLEM_DETAIL),
            });
        });
        await page.route('**/api/earthquakes/all**', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/problem+json',
                body: JSON.stringify(PROBLEM_DETAIL),
            });
        });
        await page.goto('/');
        // Wait for the error state to be rendered (TanStack Query retries once then errors)
        await page.waitForSelector('[role="alert"]', {timeout: 15_000});
    });

    test('error alert is visible', async ({page}) => {
        await expect(page.getByRole('alert')).toBeVisible();
    });

    test('error message is meaningful', async ({page}) => {
        await expect(page.getByRole('alert')).toContainText('Failed to load earthquake data.');
    });

    test('FilterBar is still visible so the user can adjust filters', async ({page}) => {
        await expect(page.getByRole('group', {name: 'Time range'})).toBeVisible();
    });

});

test('retry assertion: each endpoint is called at least twice (retry:1)', async ({page}) => {
    // This test registers routes BEFORE goto so it can count from 0.
    // It is outside the describe to avoid the beforeEach double-navigation.
    let tableRequests = 0;
    let allRequests = 0;

    // /all registered first (general), then /all** registered last for precedence
    await page.route('**/api/earthquakes**', async (route) => {
        tableRequests++;
        await route.fulfill({
            status: 500,
            contentType: 'application/problem+json',
            body: JSON.stringify(PROBLEM_DETAIL),
        });
    });
    await page.route('**/api/earthquakes/all**', async (route) => {
        allRequests++;
        await route.fulfill({
            status: 500,
            contentType: 'application/problem+json',
            body: JSON.stringify(PROBLEM_DETAIL),
        });
    });

    await page.goto('/');
    await page.waitForSelector('[role="alert"]', {timeout: 15_000});

    // TanStack Query retry:1 means at least 2 requests per endpoint (initial + 1 retry).
    // The exact count may be higher depending on refetchOnMount behavior, but must be >= 2.
    expect(tableRequests).toBeGreaterThanOrEqual(2);
    expect(allRequests).toBeGreaterThanOrEqual(2);
});
