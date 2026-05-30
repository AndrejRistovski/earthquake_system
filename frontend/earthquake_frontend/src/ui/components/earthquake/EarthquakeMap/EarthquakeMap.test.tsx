import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeModeProvider } from '../../../../theme/ThemeModeContext';
import { EarthquakeMap } from './EarthquakeMap';
import type { Earthquake } from '../../../../api/types/earthquake.ts';

// Mock react-leaflet so layout code never runs under jsdom.
// Stubs:
//   MapContainer/TileLayer/Tooltip — render children passthrough
//   CircleMarker — renders a data-testid div capturing center + pathOptions.color
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

const makeEq = (overrides: Partial<Earthquake> = {}): Earthquake => ({
    id: 1,
    usgsId: 'us1',
    magnitude: 2.1,
    magType: 'ml',
    place: '10 km N of TestCity',
    title: null,
    time: '2025-01-01T12:00:00.000Z',
    latitude: 34.05,
    longitude: -118.25,
    depth: 10.0,
    ...overrides,
});

function renderMap(earthquakes: Earthquake[]) {
    return render(
        <ThemeModeProvider>
            <EarthquakeMap earthquakes={earthquakes} />
        </ThemeModeProvider>,
    );
}

describe('EarthquakeMap — marker filtering', () => {
    it('excludes events with null coordinates', () => {
        const earthquakes = [
            makeEq({ id: 1, latitude: 34.05, longitude: -118.25 }),
            makeEq({ id: 2, latitude: null, longitude: null }),
            makeEq({ id: 3, latitude: 37.77, longitude: -122.42 }),
        ];
        renderMap(earthquakes);

        const markers = screen.getAllByTestId('circle-marker');
        // Only 2 of 3 have valid coordinates
        expect(markers).toHaveLength(2);
    });

    it('renders one marker per plottable earthquake', () => {
        const earthquakes = [
            makeEq({ id: 1 }),
            makeEq({ id: 2, magnitude: 5.4, place: 'OtherCity', latitude: 37.77, longitude: -122.42 }),
            makeEq({ id: 3, magnitude: 7.8, place: 'SomeIsland', latitude: -35.0, longitude: 175.5 }),
        ];
        renderMap(earthquakes);

        const markers = screen.getAllByTestId('circle-marker');
        expect(markers).toHaveLength(3);
    });
});

describe('EarthquakeMap — color mapping', () => {
    it('SMALL magnitude → color #22c55e', () => {
        renderMap([makeEq({ magnitude: 2.1 })]);

        const marker = screen.getByTestId('circle-marker');
        expect(marker.dataset['color']).toBe('#22c55e');
    });

    it('MEDIUM magnitude → color #eab308', () => {
        renderMap([makeEq({ magnitude: 5.4, latitude: 37.77, longitude: -122.42 })]);

        const marker = screen.getByTestId('circle-marker');
        expect(marker.dataset['color']).toBe('#eab308');
    });

    it('LARGE magnitude → color #ef4444', () => {
        renderMap([makeEq({ magnitude: 7.8, latitude: -35.0, longitude: 175.5 })]);

        const marker = screen.getByTestId('circle-marker');
        expect(marker.dataset['color']).toBe('#ef4444');
    });

    it('magnitude:null plottable → UNKNOWN color #9ca3af', () => {
        // Event has valid coordinates but null magnitude
        renderMap([makeEq({ magnitude: null, latitude: 0, longitude: 0 })]);

        const marker = screen.getByTestId('circle-marker');
        expect(marker.dataset['color']).toBe('#9ca3af');
    });
});

describe('EarthquakeMap — null-coordinate negative test', () => {
    it('event with null lat/lng must not produce a marker', () => {
        renderMap([makeEq({ latitude: null, longitude: null })]);

        expect(screen.queryByTestId('circle-marker')).not.toBeInTheDocument();
    });

    it('mixed dataset: marker count equals only plottable events', () => {
        const earthquakes = [
            makeEq({ id: 1, latitude: 34.05, longitude: -118.25 }),
            makeEq({ id: 2, latitude: null, longitude: null }),
        ];
        renderMap(earthquakes);

        expect(screen.getAllByTestId('circle-marker')).toHaveLength(1);
    });
});

describe('EarthquakeMap — tooltip content', () => {
    it('tooltip contains magnitude and place', () => {
        renderMap([makeEq({ magnitude: 2.1, place: '10 km N of TestCity' })]);

        const tooltip = screen.getByTestId('tooltip');
        expect(tooltip.textContent).toContain('M 2.1');
        expect(tooltip.textContent).toContain('TestCity');
    });

    it('tooltip shows "?" for null magnitude', () => {
        renderMap([makeEq({ magnitude: null })]);

        const tooltip = screen.getByTestId('tooltip');
        expect(tooltip.textContent).toContain('M ?');
    });
});
