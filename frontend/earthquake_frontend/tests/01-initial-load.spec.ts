/**
 * Dashboard initial load tests.
 * Originally intended to run against the live backend but converted to mocked
 * API since these tests verify page structure, not live data content.
 * To run against a real backend, replace the beforeEach with a direct page.goto('/')
 * after starting the Spring Boot service on localhost:9090.
 */
import {test, expect, setupMockRoutes, waitForTable} from './fixtures';

test.describe('Dashboard initial load', () => {
    test.beforeEach(async ({page}) => {
        await setupMockRoutes(page);
        await page.goto('/');
        await waitForTable(page);
    });

    test('renders the page title', async ({page}) => {
        await expect(page.getByText('SEISMIC MONITOR')).toBeVisible();
    });

    test('events counter reflects total from API', async ({page}) => {
        // Mock returns totalElements: 3; the counter displays that value.
        // We scope to the KPI block (the "Events" overline + number) rather than
        // asserting heading level so the test survives a heading-hierarchy change.
        const kpiBlock = page.locator('text=Events').locator('..');
        await expect(kpiBlock.getByRole('heading')).toHaveText('3');
    });

    test('LinearProgress is not visible after table loads', async ({page}) => {
        // After table loaded (waitForTable in beforeEach), the loading strip must be gone
        await expect(page.getByRole('progressbar')).not.toBeVisible();
    });

    test('table renders all six column headers', async ({page}) => {
        const headers = ['Mag', 'Type', 'Location', 'Depth (km)', 'Time (UTC)', 'Coordinates'];
        for (const header of headers) {
            await expect(page.getByRole('columnheader', {name: header})).toBeVisible();
        }
    });

    test('table rows contain earthquake place names and UTC timestamps', async ({page}) => {
        await expect(page.getByRole('cell', {name: '10 km N of TestCity'})).toBeVisible();
        await expect(page.getByRole('cell').filter({hasText: 'UTC'}).first()).toBeVisible();
    });

    test('FilterBar controls are visible', async ({page}) => {
        await expect(page.getByRole('group', {name: 'Time range'})).toBeVisible();
        await expect(page.getByLabel('Min Magnitude')).toBeVisible();
        await expect(page.getByRole('group', {name: 'Magnitude categories'})).toBeVisible();
    });
});
