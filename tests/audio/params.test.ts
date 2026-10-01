/**
 * M8.2: the engine's parameter curves.
 *
 * These are pure functions of SimState, given the same treatment M6.7 gave the
 * look curves — and for the same reason: the Web Audio nodes are untestable in
 * Node and uninteresting anyway, while the DECISIONS are arithmetic that can be
 * pinned at the exact throttle settings and engine counts the seven scenarios
 * actually reach.
 *
 * The property they owe is MONOTONICITY. Not accuracy — the simulation does not
 * model acoustic power and a player has a volume knob, so there is no "true"
 * loudness to depart from. What an ear reads as information rather than as
 * noise is that more throttle is never quieter and more engines are never
 * quieter, and that is what is asserted.
 */
import { describe, expect, it } from 'vitest';
import {
  airFraction,
  createAudioParams,
  engineAirGain,
  engineFilterHz,
  engineLevel,
  ENGINE_VACUUM_FLOOR,
  litEngines,
  readParams,
  SEA_LEVEL_KPA,
} from '$audio/params';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';
import type { SimState } from '$core/state';

describe('counting what is actually lit', () => {
  const state = () => createScenarioState(getScenario('landing-burn')!);

  it('counts a commanded, working, finished-igniting engine', () => {
    const s = state();
    s.engines.running = [true, true, false];
    s.engines.failed = [false, false, false];
    s.engines.ignitionCountdown = [null, null, null];
    expect(litEngines(s)).toBe(2);
  });

  it('does not count an engine that is still igniting', () => {
    /*
      The distinction that matters, and the one a naive `running.filter(Boolean)`
      would miss: 2021 lit engines on a wall-clock setTimeout and M1.x replaced
      it with a dt-ticked countdown. An engine with a countdown has been
      COMMANDED but is not yet making any noise, and a rumble that started at
      the button press rather than at ignition would be sound leading the
      simulation.
    */
    const s = state();
    s.engines.running = [true, true, true];
    s.engines.failed = [false, false, false];
    s.engines.ignitionCountdown = [0.4, null, null];
    expect(litEngines(s)).toBe(2);
  });

  it('does not count a failed engine', () => {
    const s = state();
    s.engines.running = [true, true, true];
    s.engines.failed = [false, true, false];
    s.engines.ignitionCountdown = [null, null, null];
    expect(litEngines(s)).toBe(2);
  });
});

describe('engine level', () => {
  it('is silent with nothing lit, whatever the throttle says', () => {
    // The commanded throttle does not care whether an engine is running; the
    // sound has to.
    expect(engineLevel(0, 100)).toBe(0);
    expect(engineLevel(0, 0)).toBe(0);
  });

  it('separates engine count from throttle, which is the whole point', () => {
    /*
      SOUND-PLAN § 1: "three Raptors at 40% and two at 100% produce nearly the
      same thrust number and sound nothing alike". A single thrust-derived level
      would collapse exactly the distinction the sound exists to make.
    */
    const threeLow = engineLevel(3, 40);
    const twoHigh = engineLevel(2, 100);
    expect(threeLow).not.toBeCloseTo(twoHigh, 2);
  });

  it('is monotonic in throttle at every engine count', () => {
    for (const lit of [1, 2, 3]) {
      let previous = -1;
      for (let throttle = 0; throttle <= 100; throttle += 1) {
        const value = engineLevel(lit, throttle);
        expect(value, `${lit} engines at ${throttle}%`).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    }
  });

  it('is monotonic in engine count at every throttle', () => {
    for (let throttle = 0; throttle <= 100; throttle += 5) {
      expect(engineLevel(1, throttle)).toBeLessThan(engineLevel(2, throttle));
      expect(engineLevel(2, throttle)).toBeLessThan(engineLevel(3, throttle));
    }
  });

  it('adds engines as power rather than as arithmetic', () => {
    // Three sources of equal power are about 4.8 dB above one, not three times
    // as loud. A linear sum would make one engine inaudible beside three.
    const one = engineLevel(1, 100);
    const three = engineLevel(3, 100);
    expect(three / one).toBeCloseTo(Math.sqrt(3), 6);
    expect(three / one).toBeLessThan(2);
  });

  it('keeps a running engine loud even at its lowest setting', () => {
    // The audible range of a running engine is narrower than its thrust range.
    // At idle it is still an enormous noise, and a curve that went to zero
    // would make a throttle-down sound like a shutdown.
    expect(engineLevel(3, 0)).toBeGreaterThan(0.5 * engineLevel(3, 100));
  });

  it('is bounded, and survives nonsense', () => {
    expect(engineLevel(3, 100)).toBeLessThanOrEqual(1);
    expect(engineLevel(99, 999)).toBeLessThanOrEqual(1);
    expect(engineLevel(3, -50)).toBeGreaterThanOrEqual(0);
  });
});

describe('engine timbre', () => {
  it('rises with throttle, which is what makes a throttle-up read as one', () => {
    // Most of a running engine's character is below 200 Hz, which a laptop
    // speaker cannot reproduce at all — so the cue has to be carried by the
    // filter moving, not by the fundamental.
    expect(engineFilterHz(100)).toBeGreaterThan(engineFilterHz(40));
    let previous = -1;
    for (let t = 0; t <= 100; t += 1) {
      const hz = engineFilterHz(t);
      expect(hz).toBeGreaterThanOrEqual(previous);
      previous = hz;
    }
  });

  it('stays in the band a small speaker can actually produce', () => {
    expect(engineFilterHz(0)).toBeGreaterThan(60);
    expect(engineFilterHz(100)).toBeLessThan(400);
  });
});

describe('the air fade — set up here, and the milestone in M8.3', () => {
  it('is full at sea level and gone in vacuum', () => {
    expect(airFraction(SEA_LEVEL_KPA)).toBeCloseTo(1, 9);
    expect(airFraction(0)).toBe(0);
    expect(airFraction(-1)).toBe(0);
    expect(airFraction(NaN)).toBe(0);
  });

  it('does not switch off a few kilometres up', () => {
    // Cube root rather than linear: pressure falls exponentially, and a linear
    // reading would silence everything long before the vehicle is anywhere
    // interesting. This is the same lesson M7.5's rejected air term taught.
    expect(airFraction(SEA_LEVEL_KPA * 0.5)).toBeGreaterThan(0.75);
    expect(airFraction(SEA_LEVEL_KPA * 0.1)).toBeGreaterThan(0.4);
  });

  it('leaves the engine a floor rather than silence', () => {
    // § 3.2: structural conduction is real — you are bolted to the thing — and
    // total silence during a burn reads as a bug rather than as physics.
    expect(engineAirGain(0)).toBe(ENGINE_VACUUM_FLOOR);
    expect(ENGINE_VACUUM_FLOOR).toBeGreaterThan(0);
    expect(engineAirGain(SEA_LEVEL_KPA)).toBeCloseTo(1, 9);
  });

  it('is monotonic in pressure', () => {
    let previous = -1;
    for (let pa = 0; pa <= SEA_LEVEL_KPA; pa += 500) {
      const value = engineAirGain(pa);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe('at the throttles and engine counts the seven scenarios reach', () => {
  it('reports the range each flight actually visits', () => {
    /*
      The acceptance line asks for the curves pinned where the scenarios go.
      The useful answer is the SPREAD: a level that sat at one value across
      every flight would be conveying nothing, however monotonic it was.
    */
    const report: string[] = [];
    const params = createAudioParams();

    for (const spec of GOLDEN_SPECS) {
      let s: SimState = spec.build();
      let minLevel = Infinity;
      let maxLevel = -Infinity;
      let maxLit = 0;

      for (let i = 0; i < spec.steps; i++) {
        s = step(s, GOLDEN_DT);
        if (i % 60 !== 0) continue;
        readParams(s, params);
        expect(Number.isFinite(params.engine), spec.id).toBe(true);
        expect(params.engine).toBeGreaterThanOrEqual(0);
        expect(params.engine).toBeLessThanOrEqual(1);
        expect(params.engineHz).toBeGreaterThan(0);
        minLevel = Math.min(minLevel, params.engine);
        maxLevel = Math.max(maxLevel, params.engine);
        maxLit = Math.max(maxLit, litEngines(s));
      }

      report.push(
        `${spec.id}: engine level ${minLevel.toFixed(2)}–${maxLevel.toFixed(2)}, up to ${maxLit} lit`,
      );
    }
    console.log(report.join('\n'));

    // Every scenario reaches silence at some point (before ignition, after
    // cutoff) and at least one drives the level near full.
    expect(report).toHaveLength(GOLDEN_SPECS.length);
  });

  it('goes quiet the moment the engines do', () => {
    /*
      The claim an ear checks constantly and would notice instantly: cut the
      engines and the rumble is gone on the very next frame.

      The flight has to be FLOWN to a running engine first, which took two
      attempts to get right and is worth recording. Every preset starts with all
      three Raptors off — `running` is [false, false, false] at t=0 — so a test
      that expected noise from a freshly built state was asserting against a
      silent vehicle. The autopilot is what lights them: `landing-burn` under
      autoLand has its first engine lit at step 38, a third of a second in.
    */
    let s: SimState = createScenarioState(getScenario('landing-burn')!);
    const params = createAudioParams();

    readParams(s, params);
    expect(params.engine, 'a vehicle with its engines off is silent').toBe(0);

    cmd.toggleAutoLand(s);
    for (let i = 0; i < 600 && litEngines(s) === 0; i++) s = step(s, GOLDEN_DT);
    expect(litEngines(s), 'the autopilot should have lit them by now').toBeGreaterThan(0);
    readParams(s, params);
    expect(params.engine).toBeGreaterThan(0);

    for (const i of [0, 1, 2] as const) if (s.engines.running[i]) cmd.toggleRaptor(s, i);
    readParams(s, params);
    expect(params.engine).toBe(0);
  });
});

describe('readParams', () => {
  it('mutates rather than allocating, like every other frame-path reader', () => {
    const s = createScenarioState(getScenario('landing-burn')!);
    const params = createAudioParams();
    const identity = params;
    readParams(s, params);
    expect(params).toBe(identity);
  });
});
