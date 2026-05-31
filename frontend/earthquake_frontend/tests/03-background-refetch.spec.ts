import {test, expect, MOCK_PAGE_RESPONSE, MOCK_EARTHQUAKES} from './fixtures';

/**
 * The LinearProgress bar renders when isFetching=true AND isLoading=false (i.e.,
 * the table already has data but a background query is still in flight).
 *
 * Rewritten to gate ordering explicitly: we hold the /all response behind a
 * manually-resolved promise so we control exactly when it resolves rather than
 * relying on a 400 ms delay that can race on slow/contended CI workers.
 *
 * The gate pattern:
 *  1. Table endpoint responds immediately.
 *  2. /all endpoint is held in a "waiting" state via a resolver variable.
 *  3. After waitForSelector('table'), assert LinearProgress is visible (map still in flight).
 *  4. Release the /all gate.
 *  5. Assert LinearProgress disappears.
 */
test('LinearProgress appears while map query is in flight after table loads', async ({page}) => {
    // Shared gate: set to a function that the route handler can call to resolve
    let releaseAll!: () => void;
    const allGate = new Promise<void>((resolve) => {
        releaseAll = resolve;
    });

    // Table endpoint responds immediately
    await page.route('**/api/earthquakes**', async (route) => {
        await route.fulfill({json: MOCK_PAGE_RESPONSE});
    });

    // Map endpoint is held until the gate is released, registered last for precedence
    await page.route('**/api/earthquakes/all**', async (route) => {
        await allGate;
        await route.fulfill({json: MOCK_EARTHQUAKES});
    });

    await page.goto('/');

    // Wait until the table appears (table query resolved, map still gated)
    await page.waitForSelector('table', {timeout: 15_000});

    // LinearProgress (role="progressbar", indeterminate) should be visible now
    await expect(page.getByRole('progressbar')).toBeVisible({timeout: 3_000});

    // Release the /all gate so the map query can resolve
    releaseAll();

    // Once the map resolves, LinearProgress disappears
    await expect(page.getByRole('progressbar')).toBeHidden({timeout: 5_000});
});
