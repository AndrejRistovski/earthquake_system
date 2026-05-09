import { QueryClient } from '@tanstack/react-query';

/**
 * Single QueryClient instance for the app. Tuned for a dashboard:
 * - 30s staleTime so quick filter toggles don't refire identical requests.
 * - refetchOnWindowFocus disabled — refocus refetches feel jarring on a data view.
 * - One retry on transient failures, then surface the error.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
