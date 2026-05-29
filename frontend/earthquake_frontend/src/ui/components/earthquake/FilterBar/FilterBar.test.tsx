import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeModeProvider } from '../../../../theme/ThemeModeContext.tsx';
import { FilterBar } from './FilterBar.tsx';
import type { EarthquakeFilters } from '../../../../api/types/earthquake.ts';
import type { TimePreset } from './presets.ts';

interface RenderFilterBarOptions {
    filters?: EarthquakeFilters;
    activePreset?: TimePreset;
    disabled?: boolean;
}

function renderFilterBar(
    onChange: ReturnType<typeof vi.fn>,
    options: RenderFilterBarOptions = {},
) {
    const {
        filters = {},
        activePreset = '24h',
        disabled = false,
    } = options;

    return render(
        <ThemeModeProvider>
            <FilterBar
                filters={filters}
                activePreset={activePreset}
                onChange={onChange}
                disabled={disabled}
            />
        </ThemeModeProvider>,
    );
}

describe('FilterBar — minMagnitude input', () => {
    let onChange: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onChange = vi.fn();
    });

    it('empty input + blur → onChange with minMagnitude undefined', async () => {
        const user = userEvent.setup();
        renderFilterBar(onChange, { filters: { minMagnitude: 2.5 } });

        const input = screen.getByLabelText('Min Magnitude');
        await user.clear(input);
        await user.tab(); // trigger blur

        expect(onChange).toHaveBeenCalledOnce();
        const call = onChange.mock.calls[0]![0] as { filters: EarthquakeFilters };
        expect(call.filters.minMagnitude).toBeUndefined();
    });

    it('type "2.5" + blur → onChange with minMagnitude 2.5', async () => {
        const user = userEvent.setup();
        renderFilterBar(onChange);

        const input = screen.getByLabelText('Min Magnitude');
        await user.click(input);
        await user.type(input, '2.5');
        await user.tab();

        expect(onChange).toHaveBeenCalledOnce();
        const call = onChange.mock.calls[0]![0] as { filters: EarthquakeFilters };
        expect(call.filters.minMagnitude).toBe(2.5);
    });

    it('Enter key fires blur → same as blur path', async () => {
        const user = userEvent.setup();
        renderFilterBar(onChange);

        const input = screen.getByLabelText('Min Magnitude');
        await user.click(input);
        await user.type(input, '3');
        await user.keyboard('{Enter}');

        expect(onChange).toHaveBeenCalledOnce();
        const call = onChange.mock.calls[0]![0] as { filters: EarthquakeFilters };
        expect(call.filters.minMagnitude).toBe(3);
    });

    it('no-op guard: same value on blur fires no onChange', async () => {
        const user = userEvent.setup();
        renderFilterBar(onChange, { filters: { minMagnitude: 5 } });

        const input = screen.getByLabelText('Min Magnitude');
        // input already shows "5"
        await user.click(input);
        await user.tab();

        expect(onChange).not.toHaveBeenCalled();
    });

    it('type "abc" + blur → no onChange (NaN guard)', async () => {
        renderFilterBar(onChange);

        const input = screen.getByLabelText('Min Magnitude');
        // type into the raw DOM directly — userEvent on number input discards non-numeric
        // but jsdom yields '' for non-numeric in a number input.
        // We fire a change event with a non-numeric raw value to trigger the NaN guard.
        fireEvent.change(input, { target: { value: 'abc' } });
        fireEvent.blur(input);

        // The raw value either becomes '' (jsdom discards non-numeric from type=number)
        // or is 'abc'. Either way the NaN guard prevents onChange.
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('FilterBar — preset toggle', () => {
    it('clicking Last 7d → onChange with activePreset "7d" and from/to populated', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderFilterBar(onChange, { activePreset: '24h', filters: {} });

        await user.click(screen.getByRole('button', { name: 'Last 7d' }));

        expect(onChange).toHaveBeenCalledOnce();
        const call = onChange.mock.calls[0]![0] as {
            filters: EarthquakeFilters;
            activePreset: TimePreset;
        };
        expect(call.activePreset).toBe('7d');
        expect(call.filters.from).toBeDefined();
        expect(call.filters.to).toBeDefined();
        expect(new Date(call.filters.from!).getTime()).toBeLessThan(
            new Date(call.filters.to!).getTime(),
        );
    });
});

describe('FilterBar — category toggle', () => {
    it('select Large → onChange with categories: ["LARGE"]', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderFilterBar(onChange, { filters: {} });

        const catGroup = screen.getByRole('group', { name: 'Magnitude categories' });
        await user.click(catGroup.querySelector('button:last-child')!);

        expect(onChange).toHaveBeenCalledOnce();
        const call = onChange.mock.calls[0]![0] as { filters: EarthquakeFilters };
        expect(call.filters.categories).toEqual(['LARGE']);
    });

    it('deselect last category → categories: undefined', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderFilterBar(onChange, { filters: { categories: ['LARGE'] } });

        const catGroup = screen.getByRole('group', { name: 'Magnitude categories' });
        await user.click(catGroup.querySelector('button:last-child')!);

        expect(onChange).toHaveBeenCalledOnce();
        const call = onChange.mock.calls[0]![0] as { filters: EarthquakeFilters };
        expect(call.filters.categories).toBeUndefined();
    });
});

describe('FilterBar — disabled prop', () => {
    it('all controls are disabled when disabled=true', () => {
        const onChange = vi.fn();
        renderFilterBar(onChange, { disabled: true });

        // All buttons in the time range group are disabled
        const timeGroup = screen.getByRole('group', { name: 'Time range' });
        const timeButtons = timeGroup.querySelectorAll('button');
        timeButtons.forEach((btn) => {
            expect(btn).toBeDisabled();
        });

        // Min Magnitude input is disabled
        expect(screen.getByLabelText('Min Magnitude')).toBeDisabled();

        // All buttons in the categories group are disabled
        const catGroup = screen.getByRole('group', { name: 'Magnitude categories' });
        const catButtons = catGroup.querySelectorAll('button');
        catButtons.forEach((btn) => {
            expect(btn).toBeDisabled();
        });
    });
});

describe('FilterBar — render', () => {
    it('renders time preset buttons', () => {
        const onChange = vi.fn();
        renderFilterBar(onChange);

        expect(screen.getByRole('button', { name: 'Last 24h' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Last 7d' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Last 30d' })).toBeInTheDocument();
    });

    it('renders category buttons for Small, Medium, Large', () => {
        const onChange = vi.fn();
        renderFilterBar(onChange);

        expect(screen.getByRole('button', { name: /Small/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Medium/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Large/i })).toBeInTheDocument();
    });
});
