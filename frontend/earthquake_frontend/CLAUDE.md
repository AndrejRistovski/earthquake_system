# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run dev server (port 5173)
npm run dev

# Type-check + production build
npm run build

# Lint
npm run lint

# Preview production build
npm run preview

# Unit + component tests (Vitest, one-shot) / watch mode
npm run test:unit
npm run test:unit:watch

# Unit + component tests with coverage report (writes coverage/)
npm run test:coverage

# End-to-end tests (Playwright, chromium) — starts/reuses the dev server on 5173
npm run test:e2e

# Open the last Playwright HTML report
npm run test:e2e:report
```

## Architecture

**React 19 + TypeScript + Vite + MUI** SPA that consumes the Spring Boot backend at `../../backend/earthquake_backend` (default `http://localhost:9090`). The dev server runs on port `5173` — this origin is whitelisted by the backend's CORS config. Server state is managed by **TanStack Query (`@tanstack/react-query`)**; component state stays local with `useState`.

### Layered structure under `src/`

- `axios/axios.ts` — single shared `axios` instance. Base URL comes from `VITE_API_BASE_URL` (env), falling back to `http://localhost:9090`. All HTTP must go through this instance.
- `queryClient.ts` — single `QueryClient` instance: `staleTime: 30s`, `refetchOnWindowFocus: false`, one retry on transient failure.
- `api/earthquakeApi.ts` — thin wrappers over the two backend endpoints. `getEarthquakesPage(filters, page, size, signal?)` for the table (returns `PageResponse<Earthquake>`); `getAllEarthquakes(filters, signal?)` for the map (returns `Earthquake[]`). Array params (e.g. `categories`) are serialized as repeat keys (`?categories=SMALL&categories=LARGE`) so Spring binds them straight into a `Set<MagnitudeCategory>`. Both accept an optional `AbortSignal` that the query hooks forward, so a superseded request is cancelled (last filter change wins).
- `api/types/earthquake.ts` — `Earthquake`, `PageResponse<T>`, and `EarthquakeFilters` types. Backend nullable fields are typed as `T | null` — UI must handle `null`.
- `util/magnitude.ts` — single source of truth for magnitude category bounds (`SMALL [0,4) / MEDIUM [4,7) / LARGE [7,∞)`) and visual styling (hex for the map, MUI semantic color for the table). Consumed by the table chip, the map markers, and the FilterBar category buttons.
- `hooks/useEarthquakesPage.ts` — paginated query hook. Uses `keepPreviousData` so the table doesn't flash an empty state during page navigation.
- `hooks/useAllEarthquakes.ts` — unpaged query hook for the map.
- `ui/pages/<feature>/<Page>/` — route-level pages. `DashboardPage` owns filter, preset, and pagination state; the FilterBar is fully controlled.
- `ui/components/<feature>/<Component>/` — feature-scoped components. `FilterBar` is controlled (no internal source of truth for filters) and keeps its time-range presets in a sibling `FilterBar/presets.ts` (`computePresetRange`, `TIME_PRESETS`) so the component file exports only the component (satisfies `react-refresh/only-export-components`); `EarthquakeTable` accepts a `pagination` prop and renders a MUI `<TablePagination>` footer; `EarthquakeMap` renders react-leaflet `CircleMarker`s and reads the active theme mode to swap the tile layer.
- `theme/theme.ts` — single MUI `createTheme` with custom overrides. All styling goes through this theme + MUI `sx` — no CSS modules, no Tailwind.
- `App.tsx` — `react-router` v7 routes; `Layout` wraps an indexed `DashboardPage`.
- `main.tsx` — wraps `<App />` with `QueryClientProvider`, `BrowserRouter`, `ThemeModeProvider`, and `CssBaseline`.

### Conventions

- **Imports use explicit `.ts`/`.tsx` extensions** in this codebase (e.g. `import { foo } from './foo.ts'`). Match the surrounding files.
- **MUI imports are deep paths** (`@mui/material/Button`, not `@mui/material`) for tree-shaking.
- **Each component lives in its own folder** (`<feature>/<Name>/<Name>.tsx`). When adding components, follow the same nesting.
- **Magnitude category bounds live in `util/magnitude.ts`** and mirror the backend `MagnitudeCategory` enum exactly. Don't re-define them at call sites.
- **Times from the backend are ISO 8601 UTC**; the table renders them with `timeZone: 'UTC'`.
- **Backend pagination contract is `PageResponse<T>` (`{content, page, size, totalElements, totalPages}`)** — a stable wrapper that intentionally avoids leaking Spring's native `Page<T>` JSON shape. Don't read pageable internals on the wire.

## Testing

Two layers, run independently:

- **Unit + component** — Vitest + Testing Library + MSW under `jsdom`. Fast tests for pure logic and component slices. Config in `vitest.config.ts`; `tsconfig.vitest.json` types the test files and `tsconfig.app.json` *excludes* them so `npm run build` (`tsc -b`) stays clean.
- **End-to-end** — Playwright (chromium-only, intentional). Black-box specs in `tests/` driving the real app against mocked HTTP routes. Config in `playwright.config.ts` (`baseURL` 5173, `webServer` runs `npm run dev`).

Conventions:

- **`globals: false`** — every test imports `{ describe, it, expect, vi }` from `'vitest'` (matches the explicit-import style). `src/test/setup.ts` registers `@testing-library/jest-dom` matchers, calls RTL `cleanup` in `afterEach` (auto-cleanup is off when globals are disabled), and drives the MSW server lifecycle.
- **Tests are co-located** next to their source as `<Name>.test.ts` / `<Name>.test.tsx`.
- **MSW is scoped to the `DashboardPage` integration test only** (handlers + factories in `src/test/msw/`); everywhere else mock the shared axios instance (`vi.spyOn(axiosInstance, 'get')`). Never stack both transport mocks in one test.
- **Don't add `export`s to `src/` just to test a private helper.** Module-private functions (`buildParams`, the map's `colorFor`/`hasCoordinates`, the table's chip/format helpers) are covered indirectly — via the captured axios call args or a `vi.mock('react-leaflet')` passthrough render.
- **`react-leaflet` is mocked under jsdom** (it needs real layout); the real map is exercised by the Playwright world-map spec.
- **Playwright route helpers** live in `tests/fixtures.ts`: `setupMockRoutes(page, opts)`, `waitForTable(page)`, `gotoDashboard(page)`. Register the `**/api/earthquakes/all**` route *after* the general `**/api/earthquakes**` route — Playwright matches last-registered-first, so `/all` must come last to win.
- **Coverage** via `@vitest/coverage-v8` (text + html + lcov) into `coverage/` (gitignored).
