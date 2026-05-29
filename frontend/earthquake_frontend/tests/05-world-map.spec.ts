import { test, expect, setupMockRoutes, waitForTable, MOCK_EARTHQUAKES, MOCK_PAGE_RESPONSE, type MockEarthquake, type MockPageResponse } from './fixtures.ts';

test.describe('World map', () => {
    test.beforeEach(async ({ page }) => {
        await setupMockRoutes(page);
        await page.goto('/');
        await waitForTable(page);
    });

    test('Leaflet container is visible', async ({ page }) => {
        await expect(page.locator('.leaflet-container')).toBeVisible();
    });

    test('SVG circle markers are rendered for each earthquake with coordinates', async ({ page }) => {
        // All 3 mock earthquakes have valid lat/lng → 3 SVG path elements in the overlay
        const markers = page.locator('.leaflet-overlay-pane svg path');
        await expect(markers).toHaveCount(3, { timeout: 5_000 });
    });

    test('hovering a marker shows a Leaflet tooltip', async ({ page }) => {
        const markers = page.locator('.leaflet-overlay-pane svg path');
        await expect(markers).toHaveCount(3, { timeout: 5_000 });

        // Hover over the first marker (smallest earthquake, mag 2.1)
        await markers.first().hover();

        // Leaflet renders tooltip in a .leaflet-tooltip div
        const tooltip = page.locator('.leaflet-tooltip');
        await expect(tooltip).toBeVisible({ timeout: 3_000 });
        await expect(tooltip).toContainText('M 2.1');
        await expect(tooltip).toContainText('TestCity');
    });

    test('tooltip disappears when mouse leaves the marker', async ({ page }) => {
        const markers = page.locator('.leaflet-overlay-pane svg path');
        await expect(markers).toHaveCount(3, { timeout: 5_000 });

        await markers.first().hover();
        await expect(page.locator('.leaflet-tooltip')).toBeVisible({ timeout: 3_000 });

        // Move mouse to neutral position (map container top-left corner)
        await page.locator('.leaflet-container').hover({ position: { x: 5, y: 5 } });
        await expect(page.locator('.leaflet-tooltip')).toBeHidden({ timeout: 3_000 });
    });

    test('marker fill colors correspond to magnitude categories', async ({ page }) => {
        const markers = page.locator('.leaflet-overlay-pane svg path');
        await expect(markers).toHaveCount(3, { timeout: 5_000 });

        // Collect all fill attributes
        const fills = await markers.evaluateAll(els =>
            els.map(el => el.getAttribute('fill'))
        );

        expect(fills).toContain('#22c55e'); // SMALL  (mag 2.1)
        expect(fills).toContain('#eab308'); // MEDIUM (mag 5.4)
        expect(fills).toContain('#ef4444'); // LARGE  (mag 7.8)
    });
});

test.describe('World map — null coordinate negative test', () => {
    test('event with null lat/lng does not produce a marker', async ({ page }) => {
        // One of the events has null coordinates — marker count must drop by one
        const nullCoordEq: MockEarthquake = {
            ...MOCK_EARTHQUAKES[0]!,
            id: 99,
            latitude: null,
            longitude: null,
        };
        const allWithNull: MockEarthquake[] = [...MOCK_EARTHQUAKES, nullCoordEq];
        const pageWithNull: MockPageResponse = {
            ...MOCK_PAGE_RESPONSE,
            content: allWithNull,
            totalElements: allWithNull.length,
        };

        await setupMockRoutes(page, { pageResponse: pageWithNull, allResponse: allWithNull });
        await page.goto('/');
        await waitForTable(page);

        // 4 events total, 1 has null coords → only 3 markers
        const markers = page.locator('.leaflet-overlay-pane svg path');
        await expect(markers).toHaveCount(3, { timeout: 5_000 });
    });
});
