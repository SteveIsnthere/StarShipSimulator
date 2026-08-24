/**
 * M1.5 acceptance: `step(state, dt, input)` is pure and runs headless in Node.
 *
 * "Runs in Node" is not a formality. Every test in this file executes with no
 * DOM, no PIXI and no window — the vitest config pins environment: 'node'
 * precisely so a leak into core/ fails here rather than in review.
 */
import { describe, expect, it } from 'vitest';
import { cloneState, createInitialState, type SimState } from '$core/state';
import { step } from '$core/step';
import { commandIgnition } from '$core/physics/engines';

const DT = 1 / 120;

/** Every leaf value in a state, keyed by path. Used to compare exhaustively. */
function flatten(value: unknown, prefix = '', out: Map<string, unknown> = new Map()) {
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix, value);
  }
  return out;
}

function run(state: SimState, steps: number, dt = DT): SimState {
  let s = state;
  for (let i = 0; i < steps; i++) s = step(s, dt);
  return s;
}

describe('purity', () => {
  it('does not mutate the state it is given', () => {
    const before = createInitialState();
    const snapshot = flatten(cloneState(before));
    step(before, DT);
    const after = flatten(before);

    for (const [path, value] of snapshot) {
      expect(Object.is(after.get(path), value), `step() mutated ${path}`).toBe(true);
    }
  });

  it('does not mutate the input across a long run', () => {
    const origin = createInitialState();
    const snapshot = flatten(cloneState(origin));
    run(origin, 2000);
    for (const [path, value] of snapshot) {
      expect(Object.is(flatten(origin).get(path), value), `mutated ${path}`).toBe(true);
    }
  });

  it('same state + same dt + same input gives an identical result', () => {
    const origin = createInitialState();
    const a = flatten(run(cloneState(origin), 500));
    const b = flatten(run(cloneState(origin), 500));
    expect(a.size).toBeGreaterThan(90);
    for (const [path, value] of a) {
      expect(Object.is(b.get(path), value), `diverged at ${path}`).toBe(true);
    }
  });

  it('branching from a snapshot mid-run reproduces the same future', () => {
    // The property replay, rewind and the black box all depend on.
    const origin = createInitialState();
    const mid = run(origin, 300);
    const snapshot = cloneState(mid);

    const straight = flatten(run(mid, 300));
    const branched = flatten(run(snapshot, 300));
    for (const [path, value] of straight) {
      expect(Object.is(branched.get(path), value), `diverged at ${path}`).toBe(true);
    }
  });

  it('the returned state shares no object with the input', () => {
    const before = createInitialState();
    const after = step(before, DT);
    expect(after).not.toBe(before);
    for (const key of Object.keys(before) as (keyof SimState)[]) {
      expect(after[key], `${key} is aliased`).not.toBe(before[key]);
    }
    expect(after.engines.running).not.toBe(before.engines.running);
    expect(after.kinematics.pitchRecord).not.toBe(before.kinematics.pitchRecord);
    expect(after.rng.counters).not.toBe(before.rng.counters);
  });
});

describe('cloneState is total', () => {
  it('copies every field, so nothing aliases between states', () => {
    // A missed field would alias and corrupt replay silently. Compare the
    // flattened key sets rather than trusting the hand-written copy.
    const s = createInitialState();
    const c = cloneState(s);
    const original = flatten(s);
    const copy = flatten(c);
    expect([...copy.keys()].sort()).toEqual([...original.keys()].sort());
    for (const [path, value] of original) {
      expect(Object.is(copy.get(path), value), `clone differs at ${path}`).toBe(true);
    }
  });

  it('mutating the copy leaves the original untouched, at every depth', () => {
    const s = createInitialState();
    const c = cloneState(s);
    c.kinematics.pitchRecord[0] = 42;
    c.engines.running[1] = true;
    c.rng.counters.ignitionDelay = 99;
    c.vehicle.throttle = 7;
    expect(s.kinematics.pitchRecord[0]).toBe(Infinity);
    expect(s.engines.running[1]).toBe(false);
    expect(s.rng.counters.ignitionDelay).toBe(0);
    expect(s.vehicle.throttle).toBe(100);
  });
});

describe('runs headless', () => {
  it('has no DOM available, and does not need one', () => {
    // If this ever fails, the test environment changed and wall 2's runtime
    // guarantee is no longer being exercised.
    expect(typeof globalThis.document).toBe('undefined');
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined');
    expect(() => run(createInitialState(), 1000)).not.toThrow();
  });

  it('produces finite numbers for a full 60-second free fall', () => {
    const s = run(createInitialState(), 60 * 120);
    for (const [path, value] of flatten(s)) {
      if (typeof value === 'number') {
        expect(Number.isFinite(value) || value === Infinity, `${path} = ${value}`).toBe(true);
        expect(Number.isNaN(value), `${path} is NaN`).toBe(false);
      }
    }
  });
});

describe('it actually simulates something', () => {
  it('spawns resting on the pad, not falling', () => {
    // altitude spawns at vehicleHeight / 2 = 25 m, which is exactly the ground
    // contact threshold `vehicleHeight * |cos(pitch)| * 0.5`. So the vehicle is
    // on the pad from frame one and checkIfCrash zeroes its velocity. This is
    // 2021 behaviour, asserted so a change to either constant shows up here.
    const s = run(createInitialState(), 240);
    expect(s.status.onTheGround).toBe(true);
    expect(s.kinematics.altitude).toBe(25);

    // speedY is NOT zero at the end of a step, and that is faithful. The 2021
    // phase order zeroes velocity in checkIfCrash (phase 2) and then
    // re-accelerates it under gravity in updateSpactialMotion (phase 3b). The
    // residual is always cleared again before the next altitude integration
    // uses it, so the vehicle never actually sinks. Altitude staying at exactly
    // 25 over 240 steps is the invariant that matters.
    expect(s.kinematics.speedY).toBeLessThan(0);
    expect(s.kinematics.speedY).toBeGreaterThan(-1);
    expect(run(createInitialState(), 10_000).kinematics.altitude).toBe(25);
  });

  it('a vehicle dropped from altitude falls', () => {
    const start = createInitialState();
    start.kinematics.altitude = 5000;
    const s = run(start, 240);
    expect(s.kinematics.speedY).toBeLessThan(0);
    expect(s.kinematics.altitude).toBeLessThan(5000);
    // Two seconds of near-free fall: roughly -g*t, blunted by drag.
    expect(s.kinematics.speedY).toBeGreaterThan(-2 * 9.807 - 1);
  });

  it('three lit engines at full throttle lift it', () => {
    let s = createInitialState();
    commandIgnition(s, 0);
    commandIgnition(s, 1);
    commandIgnition(s, 2);
    s.vehicle.throttle = 100;
    s = run(s, 600); // 5 s: ~1 s ignition, then thrust
    expect(s.engines.running).toEqual([true, true, true]);
    expect(s.forces.thrust).toBeGreaterThan(0);
    expect(s.kinematics.speedY).toBeGreaterThan(0);
    expect(s.kinematics.altitude).toBeGreaterThan(createInitialState().kinematics.altitude);
  });

  it('burns propellant while running', () => {
    let s = createInitialState();
    for (const i of [0, 1, 2] as const) commandIgnition(s, i);
    const before = s.vehicle.propellantMass;
    s = run(s, 1200);
    expect(s.vehicle.propellantMass).toBeLessThan(before);
    expect(s.vehicle.vehicleMass).toBeLessThan(470_000);
  });

  it('advances simulated time by exactly dt per step', () => {
    const s = run(createInitialState(), 1000);
    expect(s.world.environmentTime).toBeCloseTo(1000 * DT, 9);
    expect(s.world.updatedFrameCount).toBe(1000);
  });

  it('time warp is N steps, so 4 steps of dt equal 4x the elapsed time', () => {
    const a = run(createInitialState(), 100);
    const b = run(createInitialState(), 400);
    expect(b.world.environmentTime).toBeCloseTo(4 * a.world.environmentTime, 9);
  });
});
