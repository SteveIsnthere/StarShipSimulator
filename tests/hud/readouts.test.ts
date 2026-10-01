/**
 * M4.1: the readout formatters.
 *
 * These are pure functions of a number, so they are tested against the 2021
 * rules directly rather than through the binder. The unit switches are the
 * interesting part: they are the reason a readout's unit string can change at
 * all, and therefore the reason the binder diffs value and unit separately.
 */
import { describe, expect, it } from 'vitest';
import { formatAltitude, formatRange, formatSpeed, READOUTS } from '$hud/readouts';
import { createInitialState } from '$core/state';

describe('altitude formatting', () => {
  it('shows metres below 1 km, with no decimals', () => {
    expect(formatAltitude(0)).toEqual({ value: '0', unit: 'M' });
    expect(formatAltitude(37.6)).toEqual({ value: '38', unit: 'M' });
    expect(formatAltitude(999.4)).toEqual({ value: '999', unit: 'M' });
  });

  it('switches to kilometres at exactly 1000, with one decimal', () => {
    // The boundary is `< 1000`, so 1000 itself is already kilometres.
    expect(formatAltitude(999.999)).toEqual({ value: '1000', unit: 'M' });
    expect(formatAltitude(1000)).toEqual({ value: '1.0', unit: 'KM' });
    expect(formatAltitude(120_000)).toEqual({ value: '120.0', unit: 'KM' });
  });
});

describe('speed formatting', () => {
  it('uses the same switch, in m/s and km/s', () => {
    expect(formatSpeed(0)).toEqual({ value: '0', unit: 'M/S' });
    expect(formatSpeed(999)).toEqual({ value: '999', unit: 'M/S' });
    expect(formatSpeed(1000)).toEqual({ value: '1.0', unit: 'KM/S' });
    expect(formatSpeed(7800)).toEqual({ value: '7.8', unit: 'KM/S' });
  });
});

describe('range formatting', () => {
  it('ceils to whole metres before choosing a unit', () => {
    expect(formatRange(12.2)).toEqual({ value: '13', unit: 'M' });

    // The ceil comes first, so 999.1 m has already become 1000 by the time the
    // unit is chosen and reads as kilometres. Altitude, which does not ceil,
    // still reads 999.999 as '1000 M'. Both are 2021's behaviour; they differ
    // because only range ceils.
    expect(formatRange(999.1)).toEqual({ value: '1.0', unit: 'KM' });
    expect(formatRange(998.9)).toEqual({ value: '999', unit: 'M' });
  });

  it('is symmetric about zero, unlike altitude and speed', () => {
    // dispUpdate.js:36 tests `< 1000 && > -1000`. Range is the readout that
    // legitimately goes negative: the vehicle can be short of the site.
    expect(formatRange(-500)).toEqual({ value: '-500', unit: 'M' });
    expect(formatRange(-5000)).toEqual({ value: '-5.0', unit: 'KM' });
    expect(formatRange(-999)).toEqual({ value: '-999', unit: 'M' });
    expect(formatRange(-1000)).toEqual({ value: '-1.0', unit: 'KM' });
  });
});

describe('the readout list', () => {
  it('has unique ids', () => {
    const ids = READOUTS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is a pure function of state: every readout formats a fresh state without throwing', () => {
    const state = createInitialState();
    for (const readout of READOUTS) {
      expect(typeof readout.value(state), readout.id).toBe('string');
      expect(typeof readout.unit(state), readout.id).toBe('string');
    }
  });

  it('never returns NaN or undefined text for a fresh state', () => {
    const state = createInitialState();
    for (const readout of READOUTS) {
      expect(readout.value(state), readout.id).not.toMatch(/NaN|undefined/);
    }
  });

  it('pins g to exactly 1 on the ground, as 2021 did', () => {
    const state = createInitialState();
    const g = READOUTS.find((r) => r.id === 'gforce')!;

    state.status.onTheGround = true;
    state.forces.perceivedG = 3.7;
    expect(g.value(state)).toBe('1');

    state.status.onTheGround = false;
    expect(g.value(state)).toBe('3.7');
  });
});
