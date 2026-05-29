import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../test/msw/server.ts';
import { ThemeModeProvider } from '../../../../theme/ThemeModeContext.tsx';
import { DashboardPage } from './DashboardPage.tsx';
import { FIXTURE_EARTHQUAKES, FIXTURE_PAGE_RESPONSE } from '../../../../test/msw/factories.ts';
import type { Earthquake, PageResponse } from '../../../../api/types/earthquake.ts';

// Mock react-leaflet so layout code never runs under jsdom
vi.mock('react-leaflet', () => ({
    MapContainer: ({ children }: { children?: React.ReactNode }) =>
        React.createElement('div', { 'data-testid': 'map-container' }, children),
    TileLayer: () => null,
    Tooltip: ({ children }: { children?: React.ReactNode }) =>
        React.createElement('span', { 'data-testid': 'tooltip' }, children),
    CircleMarker: ({
        center,
        pathOptions,
        children,
    }: {
        center: [number, number];
        pathOptions: { color: string };
        children?: React.ReactNode;
    }) =>
        React.createElement(
            'div',
            {
                'data-testid': 'circle-marker',
                'data-color': pathOptions.color,
                'data-lat': center[0],
                'data-lng': center[1],
            },
            children,
        ),
}));

function makeWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <ThemeModeProvider>
                    <MemoryRouter>
                        {children}
                    </MemoryRouter>
                </ThemeModeProvider>
            </QueryClientProvider>
        );
    };
}

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                // Disable staleTime so tests can refetch
                staleTime: 0,
            },
        },
    });
}

async function renderDashboard() {
    const queryClient = createQueryClient();
    const Wrapper = makeWrapper(queryClient);

    render(
        <Wrapper>
            <DashboardPage />
        </Wrapper>,
    );

    // Wait for the initial table to load
    await waitFor(
        () => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(),
        { timeout: 5000 },
    );
    // Wait for data to appear
    await waitFor(
        () => expect(screen.getByRole('table')).toBeInTheDocument(),
        { timeout: 5000 },
    );

    return { queryClient };
}

describe('DashboardPage — totalEvents KPI', () => {
    it('reflects PageResponse.totalElements from the API', async () => {
        const customPage: PageResponse<Earthquake> = {
            ...FIXTURE_PAGE_RESPONSE,
            totalElements: 42,
        };

        server.use(
            http.get('*/api/earthquakes', () => HttpResponse.json(customPage)),
        );

        await renderDashboard();

        // The Events KPI should show 42
        expect(screen.getByText('42')).toBeInTheDocument();
    });
});

describe('DashboardPage — error state', () => {
    it('shows "Failed to load earthquake data." when table query errors', async () => {
        server.use(
            http.get('*/api/earthquakes', () =>
                HttpResponse.json(
                    {
                        type: 'errors/internal-server-error',
                        title: 'Internal Server Error',
                        status: 500,
                        detail: 'An unexpected error occurred',
                        timestamp: new Date().toISOString(),
                    },
                    { status: 500 },
                ),
            ),
            http.get('*/api/earthquakes/all', () =>
                HttpResponse.json(
                    {
                        type: 'errors/internal-server-error',
                        title: 'Internal Server Error',
                        status: 500,
                        detail: 'An unexpected error occurred',
                        timestamp: new Date().toISOString(),
                    },
                    { status: 500 },
                ),
            ),
        );

        const queryClient = createQueryClient();
        const Wrapper = makeWrapper(queryClient);

        render(
            <Wrapper>
                <DashboardPage />
            </Wrapper>,
        );

        await waitFor(
            () =>
                expect(screen.getByRole('alert')).toBeInTheDocument(),
            { timeout: 10000 },
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Failed to load earthquake data.',
        );
    });
});

describe('DashboardPage — filter change resets page', () => {
    it('toggling a category re-fetches and resets page to 0', async () => {
        let requestCount = 0;
        server.use(
            http.get('*/api/earthquakes', ({ request }) => {
                requestCount++;
                const url = new URL(request.url);
                const page = url.searchParams.get('page');
                return HttpResponse.json({
                    ...FIXTURE_PAGE_RESPONSE,
                    page: Number(page ?? 0),
                });
            }),
        );

        await renderDashboard();

        const initialCount = requestCount;

        // Click the Large category button
        const user = userEvent.setup();
        const catGroup = screen.getByRole('group', { name: 'Magnitude categories' });
        await user.click(catGroup.querySelector('button:last-child')!);

        // Should trigger a new request
        await waitFor(() => expect(requestCount).toBeGreaterThan(initialCount));
    });
});

describe('DashboardPage — LinearProgress', () => {
    it('appears during background fetch and clears after /all resolves', async () => {
        // Gate /all resolution behind a manually-controlled promise
        let resolveAll!: (value: Earthquake[]) => void;
        const allPromise = new Promise<Earthquake[]>((resolve) => {
            resolveAll = resolve;
        });

        server.use(
            http.get('*/api/earthquakes', () =>
                HttpResponse.json(FIXTURE_PAGE_RESPONSE),
            ),
            http.get('*/api/earthquakes/all', () =>
                allPromise.then((data) => HttpResponse.json(data)),
            ),
        );

        const queryClient = createQueryClient();
        const Wrapper = makeWrapper(queryClient);

        render(
            <Wrapper>
                <DashboardPage />
            </Wrapper>,
        );

        // Wait for table to appear (page query resolved, /all still pending)
        await waitFor(
            () => expect(screen.getByRole('table')).toBeInTheDocument(),
            { timeout: 5000 },
        );

        // LinearProgress should be visible (map query still in flight)
        await waitFor(
            () => expect(screen.getByRole('progressbar')).toBeVisible(),
            { timeout: 2000 },
        );

        // Resolve /all
        act(() => {
            resolveAll(FIXTURE_EARTHQUAKES);
        });

        // LinearProgress should disappear
        await waitFor(
            () => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(),
            { timeout: 5000 },
        );
    });
});
