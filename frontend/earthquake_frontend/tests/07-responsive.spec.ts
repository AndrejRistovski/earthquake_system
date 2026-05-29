import { test, expect, setupMockRoutes, waitForTable } from './fixtures.ts';

const VIEWPORTS = [
    { name: 'xs (360px)', width: 360, height: 812 },
    { name: 'sm (700px)', width: 700, height: 812 },
    { name: 'md (1000px)', width: 1000, height: 812 },
];

test.describe('Responsive layout — 360px viewport', () => {
    test.use({ viewport: { width: 360, height: 812 } });

    test.beforeEach(async ({ page }) => {
        await setupMockRoutes(page);
        await page.goto('/');
        await waitForTable(page);
    });

    test('no horizontal overflow at 360px', async ({ page }) => {
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(360);
    });

    test('page title is visible and not clipped', async ({ page }) => {
        await expect(page.getByText('SEISMIC MONITOR')).toBeVisible();
    });

    test('Min Magnitude input spans the full width in xs layout', async ({ page }) => {
        const input = page.getByLabel('Min Magnitude');
        const box = await input.boundingBox();
        // At xs breakpoint MUI applies width: 100%; at sm+ it's fixed 200px.
        // 250px is well above 200 so it unambiguously detects the responsive column layout.
        expect(box?.width).toBeGreaterThan(250);
    });

    test('table container allows horizontal scroll, not clipping', async ({ page }) => {
        const tableWrapper = page.locator('table').locator('..');
        const overflowX = await tableWrapper.evaluate(
            (el) => window.getComputedStyle(el).overflowX
        );
        expect(['auto', 'scroll']).toContain(overflowX);
    });
});

// Parametrize FilterBar stack direction across breakpoints
for (const vp of VIEWPORTS) {
    test.describe(`FilterBar layout — ${vp.name}`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } });

        test(`FilterBar Stack direction is ${vp.width <= 360 ? 'column' : 'row'} at ${vp.name}`, async ({ page }) => {
            await setupMockRoutes(page);
            await page.goto('/');
            await waitForTable(page);

            const input = page.getByLabel('Min Magnitude');
            const inputBox = await input.boundingBox();

            if (vp.width <= 360) {
                // At xs: input should be full-width (wider than 200px fixed)
                expect(inputBox?.width).toBeGreaterThan(250);
            } else {
                // At sm/md: input is fixed ~200px
                expect(inputBox?.width).toBeLessThanOrEqual(220);
            }
        });
    });
}
