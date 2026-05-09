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
```

There are no tests configured in this project.

## Architecture

**React 19 + TypeScript + Vite + MUI** SPA that consumes the Spring Boot backend at `../../backend/earthquake_backend` (default `http://localhost:9090`). The dev server runs on port `5173` — this origin is whitelisted by the backend's CORS config. Server state is managed by **TanStack Query (`@tanstack/react-query`)**; component state stays local with `useState`.

### Layered structure under `src/`

- `axios/axios.ts` — single shared `axios` instance. Base URL comes from `VITE_API_BASE_URL` (env), falling back to `http://localhost:9090`. All HTTP must go through this instance.
- `queryClient.ts` — single `QueryClient` instance: `staleTime: 30s`, `refetchOnWindowFocus: false`, one retry on transient failure.
- `api/earthquakeApi.ts` — thin wrappers over the two backend endpoints. `getEarthquakesPage(filters, page, size)` for the table (returns `PageResponse<Earthquake>`); `getAllEarthquakes(filters)` for the map (returns `Earthquake[]`). Array params (e.g. `categories`) are serialized as repeat keys (`?categories=SMALL&categories=LARGE`) so Spring binds them straight into a `Set<MagnitudeCategory>`.
- `api/types/earthquake.ts` — `Earthquake`, `PageResponse<T>`, and `EarthquakeFilters` types. Backend nullable fields are typed as `T | null` — UI must handle `null`.
- `util/magnitude.ts` — single source of truth for magnitude category bounds (`SMALL [0,4) / MEDIUM [4,7) / LARGE [7,∞)`) and visual styling (hex for the map, MUI semantic color for the table). Consumed by the table chip, the map markers, and the FilterBar category buttons.
- `hooks/useEarthquakesPage.ts` — paginated query hook. Uses `keepPreviousData` so the table doesn't flash an empty state during page navigation.
- `hooks/useAllEarthquakes.ts` — unpaged query hook for the map.
- `ui/pages/<feature>/<Page>/` — route-level pages. `DashboardPage` owns filter, preset, and pagination state; the FilterBar is fully controlled.
- `ui/components/<feature>/<Component>/` — feature-scoped components. `FilterBar` is controlled (no internal source of truth for filters); `EarthquakeTable` accepts a `pagination` prop and renders a MUI `<TablePagination>` footer.
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
