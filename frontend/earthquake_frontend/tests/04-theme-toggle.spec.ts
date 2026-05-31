import {test, expect, setupMockRoutes, waitForTable} from './fixtures';

const DARK_BG = 'rgb(10, 14, 23)';    // #0a0e17
const LIGHT_BG = 'rgb(247, 248, 251)'; // #f7f8fb

async function getBodyBg(page: Parameters<typeof waitForTable>[0]): Promise<string> {
    return page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
}

test.describe('Light/dark mode toggle', () => {
    // Each test gets a fresh browser context (fresh localStorage) — no initScript needed.

    test('default theme is dark', async ({page}) => {
        await setupMockRoutes(page);
        await page.goto('/');
        await waitForTable(page);

        expect(await getBodyBg(page)).toBe(DARK_BG);
    });

    test('clicking toggle switches to light mode', async ({page}) => {
        await setupMockRoutes(page);
        await page.goto('/');
        await waitForTable(page);

        await page.getByRole('button', {name: 'Toggle theme'}).click();
        await expect.poll(() => getBodyBg(page)).toBe(LIGHT_BG);
    });

    test('clicking toggle twice returns to dark mode', async ({page}) => {
        await setupMockRoutes(page);
        await page.goto('/');
        await waitForTable(page);

        const btn = page.getByRole('button', {name: 'Toggle theme'});
        await btn.click();
        await expect.poll(() => getBodyBg(page)).toBe(LIGHT_BG);
        await btn.click();
        await expect.poll(() => getBodyBg(page)).toBe(DARK_BG);
    });

    test('theme persists across page reload via localStorage', async ({page}) => {
        await setupMockRoutes(page);
        await page.goto('/');
        await waitForTable(page);

        // Switch to light and confirm
        await page.getByRole('button', {name: 'Toggle theme'}).click();
        await expect.poll(() => getBodyBg(page)).toBe(LIGHT_BG);

        // Re-install mock routes (route handlers do not survive reload)
        await setupMockRoutes(page);
        await page.reload();
        await waitForTable(page);

        // localStorage persisted the choice — should still be light
        await expect.poll(() => getBodyBg(page)).toBe(LIGHT_BG);
    });

    test('toggle stores "light" in localStorage', async ({page}) => {
        await setupMockRoutes(page);
        await page.goto('/');
        await waitForTable(page);

        await page.getByRole('button', {name: 'Toggle theme'}).click();
        await expect.poll(() => getBodyBg(page)).toBe(LIGHT_BG);

        const stored = await page.evaluate(() =>
            window.localStorage.getItem('seismic-theme-mode')
        );
        expect(stored).toBe('light');
    });

    test('map tile URL changes from CARTO (dark) to OSM (light) on toggle', async ({page}) => {
        // Listen for tile requests BEFORE navigation so we catch the initial load
        const cartoPromise = page.waitForRequest(
            req => req.url().includes('basemaps.cartocdn.com'),
            {timeout: 10_000}
        );

        await setupMockRoutes(page);
        await page.goto('/');
        await waitForTable(page);

        // Verify dark-mode tiles were requested during map init
        await cartoPromise;

        // Now toggle to light and wait for OSM tiles
        const osmPromise = page.waitForRequest(
            req => req.url().includes('tile.openstreetmap.org'),
            {timeout: 10_000}
        );
        await page.getByRole('button', {name: 'Toggle theme'}).click();
        await osmPromise;
    });
});
