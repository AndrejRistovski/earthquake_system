import {useState} from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type {EarthquakeFilters} from '../../../../api/types/earthquake';
import {
    MAGNITUDE_CATEGORIES,
    MAGNITUDE_CATEGORY_ORDER,
    type MagnitudeCategory,
} from '../../../../util/magnitude.ts';
import {TIME_PRESETS, computePresetRange, type TimePreset} from './presets';

interface Props {
    filters: EarthquakeFilters;
    activePreset: TimePreset;
    onChange: (next: { filters: EarthquakeFilters; activePreset: TimePreset }) => void;
    disabled: boolean;
}

const PRESET_LABEL: Record<TimePreset, string> = {
    '24h': 'Last 24h',
    '7d': 'Last 7d',
    '30d': 'Last 30d',
};

const formatActiveRange = (fromIso?: string, toIso?: string): string => {
    if (!fromIso || !toIso) return '';
    const fmt = (iso: string) =>
        new Date(iso).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    return `${fmt(fromIso)} → ${fmt(toIso)}`;
};

export const FilterBar = ({filters, activePreset, onChange, disabled}: Props) => {
    // Min-magnitude is held locally as a string so the user can type freely
    // (including transient empties); we only emit on blur.
    const [minMagnitudeInput, setMinMagnitudeInput] = useState<string>(
        filters.minMagnitude !== undefined ? String(filters.minMagnitude) : '',
    );

    const handlePresetChange = (
        _: React.MouseEvent<HTMLElement>,
        next: TimePreset | null,
    ) => {
        if (next === null || next === activePreset) return;
        onChange({
            filters: {...filters, ...computePresetRange(next)},
            activePreset: next,
        });
    };

    const handleCategoriesChange = (
        _: React.MouseEvent<HTMLElement>,
        next: MagnitudeCategory[],
    ) => {
        onChange({
            filters: {...filters, categories: next.length > 0 ? next : undefined},
            activePreset,
        });
    };

    const commitMinMagnitude = () => {
        const trimmed = minMagnitudeInput.trim();
        const next = trimmed === '' ? undefined : Number.parseFloat(trimmed);
        if (next !== undefined && Number.isNaN(next)) return; // ignore bad input

        if (next === filters.minMagnitude) return; // no-op
        onChange({
            filters: {...filters, minMagnitude: next},
            activePreset,
        });
    };

    const activeCategories: MagnitudeCategory[] = filters.categories ?? [];
    const rangeCaption = formatActiveRange(filters.from, filters.to);
    const activeMagText =
        filters.minMagnitude !== undefined ? `magnitude ≥ ${filters.minMagnitude}` : null;
    const activeCategoryText =
        activeCategories.length > 0
            ? `categories: ${activeCategories.map((c) => MAGNITUDE_CATEGORIES[c].label).join(' / ')}`
            : null;

    return (
        <Paper sx={{p: {xs: 2, sm: 2.5}, mb: 3}}>
            <Stack spacing={2}>
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    spacing={2}
                    sx={{alignItems: {xs: 'stretch', sm: 'center'}, flexWrap: 'wrap'}}
                >
                    <ToggleButtonGroup
                        value={activePreset}
                        exclusive
                        onChange={handlePresetChange}
                        disabled={disabled}
                        size="small"
                        color="primary"
                        aria-label="Time range"
                        sx={{flexWrap: 'wrap'}}
                    >
                        {TIME_PRESETS.map((p) => (
                            <ToggleButton key={p} value={p}>
                                {PRESET_LABEL[p]}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>

                    <TextField
                        label="Min Magnitude"
                        size="small"
                        type="number"
                        slotProps={{htmlInput: {step: 0.1, min: 0}}}
                        placeholder="e.g. 2.5"
                        value={minMagnitudeInput}
                        onChange={(e) => setMinMagnitudeInput(e.target.value)}
                        onBlur={commitMinMagnitude}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        disabled={disabled}
                        sx={{width: {xs: '100%', sm: 200}}}
                    />
                </Stack>

                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    spacing={2}
                    sx={{alignItems: {xs: 'stretch', sm: 'center'}, flexWrap: 'wrap'}}
                >
                    <Typography variant="body2" color="text.secondary" sx={{minWidth: 88}}>
                        Categories
                    </Typography>
                    <ToggleButtonGroup
                        value={activeCategories}
                        onChange={handleCategoriesChange}
                        disabled={disabled}
                        size="small"
                        aria-label="Magnitude categories"
                        sx={{flexWrap: 'wrap'}}
                    >
                        {MAGNITUDE_CATEGORY_ORDER.map((cat) => {
                            const meta = MAGNITUDE_CATEGORIES[cat];
                            return (
                                <ToggleButton
                                    key={cat}
                                    value={cat}
                                    sx={{
                                        // Subtle color hint matching the magnitude palette.
                                        // Selected state intensifies the category color.
                                        '&.Mui-selected': {
                                            backgroundColor: `${meta.hex}33`, // ~20% alpha
                                            borderColor: meta.hex,
                                            color: meta.hex,
                                            '&:hover': {backgroundColor: `${meta.hex}55`},
                                        },
                                    }}
                                >
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            backgroundColor: meta.hex,
                                            marginRight: 8,
                                        }}
                                    />
                                    {meta.label}
                                </ToggleButton>
                            );
                        })}
                    </ToggleButtonGroup>
                </Stack>

                <Typography variant="caption" color="text.secondary">
                    Showing {rangeCaption}
                    {activeMagText && ` · ${activeMagText}`}
                    {activeCategoryText && ` · ${activeCategoryText}`}
                </Typography>
            </Stack>
        </Paper>
    );
};
