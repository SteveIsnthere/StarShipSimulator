import { describe, expect, it } from 'vitest';
import { around, judge, type Band } from './bands';
import { BANDS } from './anchors';

const band = (value: number): Band => ({
  id: 'x',
  quantity: 'x',
  min: 10,
  max: 20,
  unit: '1',
  tier: 'A',
  source: 's',
  conditions: 'c',
  probe: () => value,
});

describe('judge', () => {
  it('in band is IN with factor 1', () => {
    expect(judge(band(15))).toEqual({ id: 'x', value: 15, status: 'IN', factor: 1 });
    expect(judge(band(10)).status).toBe('IN');
    expect(judge(band(20)).status).toBe('IN');
  });
  it('above is OUT by value / max, below by min / value', () => {
    expect(judge(band(40))).toMatchObject({ status: 'OUT', factor: 2 });
    expect(judge(band(5))).toMatchObject({ status: 'OUT', factor: 2 });
  });
  it('a non-finite probe is OUT by an infinite factor', () => {
    expect(judge(band(Number.NaN))).toMatchObject({ status: 'OUT', factor: Infinity });
    expect(judge(band(Infinity))).toMatchObject({ status: 'OUT', factor: Infinity });
  });
  it('around() spans the fraction either side', () => {
    expect(around(100, 0.1)).toEqual({ min: 90, max: 110.00000000000001 });
  });
});

describe('the registry', () => {
  it('has unique ids, ordered bounds and a source for every row', () => {
    const ids = new Set<string>();
    for (const b of BANDS) {
      expect(ids.has(b.id), b.id).toBe(false);
      ids.add(b.id);
      expect(b.min, b.id).toBeLessThanOrEqual(b.max);
      expect(b.source.length, b.id).toBeGreaterThan(10);
      expect(b.conditions.length, b.id).toBeGreaterThan(3);
    }
  });
  it('every probe returns a number', () => {
    for (const b of BANDS) expect(typeof b.probe(), b.id).toBe('number');
  });
});
