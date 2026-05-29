import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ThemeModeProvider } from '../../../../theme/ThemeModeContext.tsx';
import { EarthquakeTable } from './EarthquakeTable.tsx';
import type { Earthquake } from '../../../../api/types/earthquake.ts';
import { MAGNITUDE_CATEGORIES, getCategory } from '../../../../util/magnitude.ts';

const DEFAULT_PAGINATION = {
    count: 0,
    page: 0,
    rowsPerPage: 20,
    onPageChange: vi.fn(),
    onRowsPerPageChange: vi.fn(),
};

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

function renderTable(earthquakes: Earthquake[], options: {
    count?: number;
    loading?: boolean;
} = {}) {
    const { count = earthquakes.length, loading = false } = options;
    return render(
        <ThemeModeProvider>
            <EarthquakeTable
                earthquakes={earthquakes}
                pagination={{ ...DEFAULT_PAGINATION, count }}
                loading={loading}
            />
        </ThemeModeProvider>,
    );
}

describe('EarthquakeTable — column headers', () => {
    it('renders all six column headers', () => {
        renderTable([makeEq()]);

        expect(screen.getByRole('columnheader', { name: 'Mag' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Location' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Depth (km)' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Time (UTC)' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Coordinates' })).toBeInTheDocument();
    });
});

describe('EarthquakeTable — empty state', () => {
    it('count=0 + loading=false → shows empty state copy', () => {
        renderTable([], { count: 0, loading: false });

        expect(
            screen.getByText('No seismic events match the active filters'),
        ).toBeInTheDocument();
    });

    it('count=0 + loading=true → does NOT show empty state', () => {
        renderTable([], { count: 0, loading: true });

        expect(
            screen.queryByText('No seismic events match the active filters'),
        ).not.toBeInTheDocument();
    });
});

describe('EarthquakeTable — row rendering', () => {
    it('renders one row per earthquake', () => {
        const earthquakes = [
            makeEq({ id: 1, place: 'City A' }),
            makeEq({ id: 2, place: 'City B' }),
            makeEq({ id: 3, place: 'City C' }),
        ];
        renderTable(earthquakes, { count: 3 });

        expect(screen.getByRole('cell', { name: 'City A' })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: 'City B' })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: 'City C' })).toBeInTheDocument();
    });
});

describe('EarthquakeTable — chip colors', () => {
    it('SMALL magnitude (2.1) → MuiChip-colorSuccess', () => {
        renderTable([makeEq({ magnitude: 2.1 })], { count: 1 });

        const chip = screen.getByText('2.1').closest('.MuiChip-root');
        expect(chip).toHaveClass('MuiChip-colorSuccess');
    });

    it('MEDIUM magnitude (5.4) → MuiChip-colorWarning', () => {
        renderTable([makeEq({ magnitude: 5.4 })], { count: 1 });

        const chip = screen.getByText('5.4').closest('.MuiChip-root');
        expect(chip).toHaveClass('MuiChip-colorWarning');
    });

    it('LARGE magnitude (7.8) → MuiChip-colorError', () => {
        renderTable([makeEq({ magnitude: 7.8 })], { count: 1 });

        const chip = screen.getByText('7.8').closest('.MuiChip-root');
        expect(chip).toHaveClass('MuiChip-colorError');
    });

    it('chip color matches MAGNITUDE_CATEGORIES[getCategory(mag)].muiColor', () => {
        const testCases: Array<{ mag: number; colorClass: string }> = [
            { mag: 1.0, colorClass: `MuiChip-color${capitalize(MAGNITUDE_CATEGORIES[getCategory(1.0)!].muiColor)}` },
            { mag: 4.5, colorClass: `MuiChip-color${capitalize(MAGNITUDE_CATEGORIES[getCategory(4.5)!].muiColor)}` },
            { mag: 8.0, colorClass: `MuiChip-color${capitalize(MAGNITUDE_CATEGORIES[getCategory(8.0)!].muiColor)}` },
        ];

        for (const { mag, colorClass } of testCases) {
            const { unmount } = renderTable([makeEq({ magnitude: mag })], { count: 1 });
            const chip = screen.getByText(mag.toFixed(1)).closest('.MuiChip-root');
            expect(chip).toHaveClass(colorClass);
            unmount();
        }
    });
});

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

describe('EarthquakeTable — null handling', () => {
    it('magnitude:null → outlined dash chip with label "—"', () => {
        renderTable([makeEq({ magnitude: null })], { count: 1 });

        // Find the outlined dash chip in the Mag column
        const dashChip = screen.getByText('—').closest('.MuiChip-root');
        expect(dashChip).toHaveClass('MuiChip-outlined');
    });

    it('latitude:null, longitude:null → coordinate cell shows "—"', () => {
        renderTable([makeEq({ latitude: null, longitude: null })], { count: 1 });

        const rows = screen.getAllByRole('row');
        // First row is header; rows[1] is the data row
        const dataRow = rows[1]!;
        const cells = within(dataRow).getAllByRole('cell');
        // Coordinates is the 6th cell (index 5)
        expect(cells[5]).toHaveTextContent('—');
    });
});

describe('EarthquakeTable — timestamp format', () => {
    it('formats ISO timestamp as DD MMM YYYY HH:mm:ss UTC', () => {
        // "2025-01-01T12:00:00.000Z" → "01 Jan 2025, 12:00:00 UTC" (en-GB style)
        renderTable([makeEq({ time: '2025-01-01T12:00:00.000Z' })], { count: 1 });

        // The en-GB toLocaleString with timeZoneName:'short' produces e.g. "01 Jan 2025, 12:00:00 UTC"
        // We just check it contains the expected parts in the time cell
        const rows = screen.getAllByRole('row');
        const dataRow = rows[1]!;
        const cells = within(dataRow).getAllByRole('cell');
        // Time is the 5th cell (index 4)
        const timeCell = cells[4]!;
        expect(timeCell.textContent).toContain('01 Jan 2025');
        expect(timeCell.textContent).toContain('12:00:00');
        expect(timeCell.textContent).toContain('UTC');
    });
});
