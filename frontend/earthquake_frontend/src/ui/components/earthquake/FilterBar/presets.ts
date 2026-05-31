/**
 * Time-range presets for the FilterBar. Kept in a sibling module so FilterBar.tsx
 * exports only its component (satisfies react-refresh/only-export-components).
 */

export type TimePreset = '24h' | '7d' | '30d';

export const TIME_PRESETS: TimePreset[] = ['24h', '7d', '30d'];

export const computePresetRange = (preset: TimePreset): { from: string; to: string } => {
    const to = new Date();
    const from = new Date(to);
    if (preset === '24h') from.setHours(from.getHours() - 24);
    if (preset === '7d') from.setDate(from.getDate() - 7);
    if (preset === '30d') from.setDate(from.getDate() - 30);
    return {from: from.toISOString(), to: to.toISOString()};
};
