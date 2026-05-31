import {describe, it, expect} from 'vitest';
import {computePresetRange, TIME_PRESETS} from './presets';

describe('TIME_PRESETS', () => {
    it('contains the three expected presets', () => {
        expect(TIME_PRESETS).toEqual(['24h', '7d', '30d']);
    });
});

describe('computePresetRange', () => {
    const TOLERANCE_MS = 5_000; // 5 seconds

    it('24h: from < to', () => {
        const {from, to} = computePresetRange('24h');
        expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
    });

    it('24h: delta ≈ 24 hours within ±5 s', () => {
        const {from, to} = computePresetRange('24h');
        const delta = new Date(to).getTime() - new Date(from).getTime();
        const expected = 24 * 60 * 60 * 1000;
        expect(Math.abs(delta - expected)).toBeLessThan(TOLERANCE_MS);
    });

    it('24h: to ≈ Date.now() within ±5 s', () => {
        const now = Date.now();
        const {to} = computePresetRange('24h');
        expect(Math.abs(new Date(to).getTime() - now)).toBeLessThan(TOLERANCE_MS);
    });

    it('24h: both from and to are valid ISO strings', () => {
        const {from, to} = computePresetRange('24h');
        expect(new Date(from).toISOString()).toBe(from);
        expect(new Date(to).toISOString()).toBe(to);
    });

    it('7d: from < to', () => {
        const {from, to} = computePresetRange('7d');
        expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
    });

    it('7d: delta ≈ 7 days within ±5 s', () => {
        const {from, to} = computePresetRange('7d');
        const delta = new Date(to).getTime() - new Date(from).getTime();
        const expected = 7 * 24 * 60 * 60 * 1000;
        expect(Math.abs(delta - expected)).toBeLessThan(TOLERANCE_MS);
    });

    it('7d: to ≈ Date.now() within ±5 s', () => {
        const now = Date.now();
        const {to} = computePresetRange('7d');
        expect(Math.abs(new Date(to).getTime() - now)).toBeLessThan(TOLERANCE_MS);
    });

    it('7d: both from and to are valid ISO strings', () => {
        const {from, to} = computePresetRange('7d');
        expect(new Date(from).toISOString()).toBe(from);
        expect(new Date(to).toISOString()).toBe(to);
    });

    it('30d: from < to', () => {
        const {from, to} = computePresetRange('30d');
        expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
    });

    it('30d: delta ≈ 30 days within ±5 s', () => {
        const {from, to} = computePresetRange('30d');
        const delta = new Date(to).getTime() - new Date(from).getTime();
        const expected = 30 * 24 * 60 * 60 * 1000;
        expect(Math.abs(delta - expected)).toBeLessThan(TOLERANCE_MS);
    });

    it('30d: to ≈ Date.now() within ±5 s', () => {
        const now = Date.now();
        const {to} = computePresetRange('30d');
        expect(Math.abs(new Date(to).getTime() - now)).toBeLessThan(TOLERANCE_MS);
    });

    it('30d: both from and to are valid ISO strings', () => {
        const {from, to} = computePresetRange('30d');
        expect(new Date(from).toISOString()).toBe(from);
        expect(new Date(to).toISOString()).toBe(to);
    });
});
