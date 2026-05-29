import { http, HttpResponse } from 'msw';
import { FIXTURE_EARTHQUAKES, FIXTURE_PAGE_RESPONSE } from './factories.ts';
import type { Earthquake, PageResponse } from '../../api/types/earthquake.ts';

/**
 * Default MSW handlers for DashboardPage integration tests.
 *
 * The handlers validate incoming query params so a buildParams↔Spring drift
 * fails the test:
 *  - categories arrive as repeat keys (url.searchParams.getAll('categories'))
 *  - from/to are valid ISO strings when present
 */
export const handlers = [
    http.get('*/api/earthquakes', ({ request }) => {
        const url = new URL(request.url);

        // Validate categories are repeat keys (not comma-separated)
        const categories = url.searchParams.getAll('categories');
        // (categories array may be empty when no filter is applied — that is valid)

        // Validate from/to are ISO strings when present
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        if (from && isNaN(Date.parse(from))) {
            return new HttpResponse(null, { status: 400 });
        }
        if (to && isNaN(Date.parse(to))) {
            return new HttpResponse(null, { status: 400 });
        }

        // Return a filtered subset if categories param is provided
        let content: Earthquake[] = FIXTURE_EARTHQUAKES;
        if (categories.length > 0) {
            content = FIXTURE_EARTHQUAKES.filter((eq) => {
                if (eq.magnitude === null) return false;
                if (eq.magnitude < 4 && categories.includes('SMALL')) return true;
                if (eq.magnitude >= 4 && eq.magnitude < 7 && categories.includes('MEDIUM')) return true;
                if (eq.magnitude >= 7 && categories.includes('LARGE')) return true;
                return false;
            });
        }

        const response: PageResponse<Earthquake> = {
            ...FIXTURE_PAGE_RESPONSE,
            content,
            totalElements: content.length,
        };
        return HttpResponse.json(response);
    }),

    http.get('*/api/earthquakes/all', ({ request }) => {
        const url = new URL(request.url);
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        if (from && isNaN(Date.parse(from))) {
            return new HttpResponse(null, { status: 400 });
        }
        if (to && isNaN(Date.parse(to))) {
            return new HttpResponse(null, { status: 400 });
        }
        return HttpResponse.json(FIXTURE_EARTHQUAKES);
    }),
];
