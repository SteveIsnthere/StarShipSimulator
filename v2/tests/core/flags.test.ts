/**
 * M2.5 acceptance: flags infrastructure, with golden fixtures per shipped
 * combination.
 *
 * The tests here are about the mechanism, not any particular flag: that flags
 * live in the state, that they survive cloning and stepping, that defaults are
 * all off, and that turning one on cannot be done accidentally. The per-flag
 * physics is proved in M2.6-M2.8; the per-combination fixtures in tests/golden.
 */
import { describe, expect, it } from 'vitest';
import {
  cloneFlags,
  createFlags,
  DEFAULT_FLAGS,
  FLAG_COMBINATIONS,
  FLAG_NAMES,
  flagsId,
  isDefault,
} from '$core/flags';
import { cloneState, createInitialState } from '$core/state';
import { step } from '$core/step';

describe('defaults', () => {
  it('every flag is off, so v2 flies the 2021 reference configuration', () => {
    // CLAUDE.md: "the tuned feel of the 2021 flight model as the reference
    // configuration" is in the never-change list. This test is that promise.
    for (const name of FLAG_NAMES) {
      expect(DEFAULT_FLAGS[name], `${name} must default off`).toBe(false);
    }
    expect(isDefault(createFlags())).toBe(true);
  });

  it('a fresh state has default flags', () => {
    expect(createInitialState().flags).toEqual(DEFAULT_FLAGS);
    expect(isDefault(createInitialState().flags)).toBe(true);
  });

  it('there is at least one flag, so this is not vacuous', () => {
    expect(FLAG_NAMES.length).toBeGreaterThanOrEqual(3);
  });
});

describe('flags live in the state', () => {
  it('can be set at construction', () => {
    const s = createInitialState(undefined, { planetCenteredGravity: true });
    expect(s.flags.planetCenteredGravity).toBe(true);
    expect(s.flags.realSpeedOfSound).toBe(false);
    expect(isDefault(s.flags)).toBe(false);
  });

  it('survive a step unchanged', () => {
    for (const combination of FLAG_COMBINATIONS) {
      const s = createInitialState(undefined, combination);
      const after = step(s, 1 / 120);
      expect(after.flags, flagsId(s.flags)).toEqual(s.flags);
    }
  });

  it('are cloned, not shared', () => {
    const s = createInitialState(undefined, { fullISA: true });
    const c = cloneState(s);
    expect(c.flags).not.toBe(s.flags);
    c.flags.fullISA = false;
    expect(s.flags.fullISA).toBe(true);
  });

  it('are not module state, so two states can disagree at once', () => {
    // The property that makes step() pure and fixtures unambiguous. A flag read
    // from module scope could not do this.
    const off = createInitialState();
    const on = createInitialState(undefined, { planetCenteredGravity: true });
    step(on, 1 / 120);
    expect(off.flags.planetCenteredGravity).toBe(false);
    expect(on.flags.planetCenteredGravity).toBe(true);
  });

  it('a state records which physics produced it', () => {
    // What lets a golden fixture be read years later without ambiguity.
    const s = createInitialState(undefined, { realSpeedOfSound: true, fullISA: true });
    let cur = s;
    for (let i = 0; i < 100; i++) cur = step(cur, 1 / 120);
    expect(flagsId(cur.flags)).toBe('realSpeedOfSound+fullISA');
  });
});

describe('flagsId', () => {
  it('names the default set "default"', () => {
    expect(flagsId(createFlags())).toBe('default');
  });

  it('names a single flag after itself', () => {
    expect(flagsId(createFlags({ fullISA: true }))).toBe('fullISA');
  });

  it('is stable regardless of key insertion order', () => {
    const a = createFlags({ planetCenteredGravity: true, fullISA: true });
    const b = {
      fullISA: true,
      planetCenteredGravity: true,
      realSpeedOfSound: false,
      collapsedTrig: false,
    };
    expect(flagsId(a)).toBe(flagsId(b));
  });

  it('produces a distinct id for every shipped combination', () => {
    const ids = FLAG_COMBINATIONS.map((c) => flagsId(createFlags(c)));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the shipped combinations', () => {
  it('include the default and each flag alone', () => {
    const ids = FLAG_COMBINATIONS.map((c) => flagsId(createFlags(c)));
    expect(ids).toContain('default');
    for (const name of FLAG_NAMES) expect(ids).toContain(name);
  });

  it('include everything on, which is what the feel review flies', () => {
    const all = FLAG_COMBINATIONS.find((c) => Object.keys(c).length === FLAG_NAMES.length);
    expect(all).toBeDefined();
    for (const name of FLAG_NAMES) expect(all![name]).toBe(true);
  });

  it('every combination produces a simulation that runs', () => {
    for (const combination of FLAG_COMBINATIONS) {
      const s = createInitialState(undefined, combination);
      let cur = s;
      expect(() => {
        for (let i = 0; i < 600; i++) cur = step(cur, 1 / 120);
      }, flagsId(s.flags)).not.toThrow();
      expect(Number.isFinite(cur.kinematics.altitude), flagsId(s.flags)).toBe(true);
      expect(Number.isNaN(cur.kinematics.speedY)).toBe(false);
    }
  });
});

describe('cloneFlags', () => {
  it('copies every field', () => {
    const flags = createFlags({ planetCenteredGravity: true, fullISA: true });
    expect(cloneFlags(flags)).toEqual(flags);
    expect(cloneFlags(flags)).not.toBe(flags);
  });
});
