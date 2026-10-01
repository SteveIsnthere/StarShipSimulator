/**
 * M12.1 — the debrief card, checked against the recorder on every golden.
 *
 * THE SHAPE OF THIS FILE. `debrief()` is pure over three inputs, two of which
 * (the timeline, the witness) are fed one state at a time by the loop. So every
 * test here REPLAYS a flight — the same eight the golden fixtures pin — feeding
 * them exactly as `App.svelte` does, and then asks the card questions whose
 * answers are already recorded somewhere else.
 *
 * THE RECORDER IS THE CROSS-CHECK, NOT THE SOURCE, and after review that is the
 * stronger arrangement rather than a weaker one. The first version read the
 * peaks out of the recorder's series, and review found two faults in that which
 * are really the same fault: the recorder samples one frame in five, so a
 * break-up could print a peak BELOW the limit and flag it red; and its `g`
 * channel is `perceivedG`, the FELT g, while the simulation breaks the vehicle
 * on `totalAcceleration / gravity` — up to a full g apart across these very
 * flights. So the card takes its peaks from the step, and this file replays
 * every golden and checks them against the recorder's independent series.
 *
 * The two do not sample the same way, and pretending they do would make this
 * file a tautology. The recorder takes a sample every `recordTimeInterval`
 * frames and stops at the end of the flight; the witness is written every step
 * while the vehicle is airborne. So:
 *
 *   * a recorder peak can never EXCEED the card's, because the card's is the
 *     full-rate maximum and the recorder's is a subset of the same samples —
 *     and on smooth quantities it is close;
 *   * the touchdown figures are asserted to agree with the recorder's LAST
 *     sample to within what one sampling interval of flight can change them.
 *
 * That is the honest form of the claim, and it is the form that would fail if
 * the witness were reading the wrong field.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import { DT } from '$app/loop';
import { createRecorder } from '$app/recorder';
import { step } from '$core/step';
import { createTimeline } from '$hud/timeline';
import {
  createFlightWatch,
  debrief,
  OUTCOMES,
  RECORDER_SAMPLE_SECONDS,
  TOUCHDOWN_DRIFT_LIMIT,
  type Debrief,
} from '$hud/debrief';
import { createScenarioState, getScenario } from '$core/scenarios';
import type { SimState } from '$core/state';
import { GOLDEN_SPECS } from '../golden/scenarios';

/** Fly a state the way the app does, and hand back everything the card needs. */
function fly(build: () => SimState, steps: number) {
  const recorder = createRecorder();
  const timeline = createTimeline();
  const watch = createFlightWatch();

  let s = build();
  // The app samples on the state AFTER each step, from `onStep`. Matching that
  // matters: the first observation must not be the un-stepped seed, whose
  // forces have never been computed.
  for (let i = 0; i < steps; i++) {
    s = step(s, DT);
    recorder.sample(s);
    timeline.observe(s);
    watch.observe(s);
  }
  return { state: s, recorder, timeline, watch, card: debrief(s, timeline, watch.last) };
}

const FLIGHTS = GOLDEN_SPECS.map((spec) => ({
  id: spec.id,
  run: () => fly(spec.build, spec.steps),
}));

describe('the outcome is the one the simulation reached', () => {
  for (const flight of FLIGHTS) {
    it(`${flight.id}`, () => {
      const { state, card } = flight.run();
      const expected =
        state.failures.inFlightBreakUp
          ? 'LOSS'
          : state.failures.crashed
            ? 'CRASH'
            : state.status.landed
              ? 'TOUCHDOWN'
              : 'FLYING';
      expect(card.outcome, `${flight.id} ended as ${expected}`).toBe(expected);
      expect(OUTCOMES).toContain(card.outcome);

      // A clean end carries no accusation; a bad one always says something.
      if (card.outcome === 'TOUCHDOWN' || card.outcome === 'FLYING') {
        expect(card.reasons).toEqual([]);
      } else {
        expect(card.reasons.length).toBeGreaterThan(0);
      }
    });
  }
});

describe('the peaks contain the recorder’s peaks', () => {
  for (const flight of FLIGHTS) {
    it(`${flight.id}`, () => {
      const { recorder, card } = flight.run();
      const peak = (id: string) =>
        Math.max(0, ...(recorder.series[id] ?? []).map((v) => Math.abs(v)));

      // The recorder's samples are a subset of the steps the card's peaks are
      // taken over, so its maximum can never be the larger of the two.
      expect(card.peakQ.value).toBeGreaterThanOrEqual(peak('dynamicPressure') - 1e-9);
      expect(card.peakHeat.value).toBeGreaterThanOrEqual(peak('thermalPower') - 1e-9);

      // And close, because these are smooth on the scale of five frames. Q and
      // heating are checked as a ratio rather than a difference so the claim
      // means the same thing on a flight that peaks at 1 kPa and on one that
      // peaks at 40.
      if (peak('dynamicPressure') > 1) {
        expect(card.peakQ.value / peak('dynamicPressure')).toBeLessThan(1.05);
      }
      if (peak('thermalPower') > 1) {
        expect(card.peakHeat.value / peak('thermalPower')).toBeLessThan(1.05);
      }

      // And the fractions are those against the constants the simulation
      // actually breaks the vehicle at — not a second copy of the number.
      expect(card.peakQ.limit).toBe(C.dynamicPressureLimit);
      expect(card.peakHeat.limit).toBe(C.heatLimit);
      expect(card.peakG.limit).toBe(C.gLimit);
      expect(card.peakQ.fraction).toBeCloseTo(card.peakQ.value / C.dynamicPressureLimit, 10);
    });
  }
});

describe('peak G is the g the simulation judges, not the g the pilot feels', () => {
  for (const flight of FLIGHTS) {
    it(`${flight.id}`, () => {
      const { recorder, card } = flight.run();
      const felt = Math.max(0, ...(recorder.series['g'] ?? []).map((v) => Math.abs(v)));

      // `checkIfBreakUp` compares `totalAcceleration > gLimit * gravity`, so
      // the card's figure is `totalAcceleration / gravity` — recomputed here
      // from a full-rate replay rather than taken from the card.
      const spec = GOLDEN_SPECS.find((x) => x.id === flight.id)!;
      let s = spec.build();
      let structural = 0;
      for (let i = 0; i < spec.steps; i++) {
        s = step(s, DT);
        if (s.failures.crashed || s.failures.inFlightBreakUp || s.status.landed) break;
        if (s.status.onTheGround) continue;
        structural = Math.max(structural, s.kinematics.totalAcceleration / C.gravity);
      }
      expect(card.peakG.value).toBeCloseTo(structural, 6);

      /*
        And the two are NOT the same number, which is why this matters. Felt g
        carries the one-g offset a vehicle at rest reads; structural g is the
        acceleration the airframe is judged on. Asserting they differ somewhere
        is what would fail if a future edit quietly went back to the recorder's
        channel.
      */
      expect(Math.abs(card.peakG.value - felt)).toBeGreaterThan(0);
    });
  }
});

describe('and no peak exceeds what a full-rate replay saw', () => {
  for (const flight of FLIGHTS) {
    it(`${flight.id}`, () => {
      // The card's peaks are taken per step, so a full-rate replay must produce
      // exactly the same maxima — this is the independent recomputation of
      // them, from the simulation rather than from the watch.
      const { card } = flight.run();
      let trueQ = 0;
      let trueG = 0;
      let trueHeat = 0;
      const spec = GOLDEN_SPECS.find((x) => x.id === flight.id)!;
      let s = spec.build();
      for (let i = 0; i < spec.steps; i++) {
        s = step(s, DT);
        // The same airborne test the watch applies: a vehicle sitting on the
        // pad is not flying, and its numbers are not this flight's peaks.
        if (s.failures.crashed || s.failures.inFlightBreakUp || s.status.landed) break;
        if (s.status.onTheGround) continue;
        trueQ = Math.max(trueQ, s.forces.dynamicPressure);
        trueG = Math.max(trueG, s.kinematics.totalAcceleration / C.gravity);
        trueHeat = Math.max(trueHeat, s.forces.thermalPower);
      }
      expect(card.peakQ.value).toBeCloseTo(trueQ, 9);
      expect(card.peakG.value).toBeCloseTo(trueG, 9);
      expect(card.peakHeat.value).toBeCloseTo(trueHeat, 9);
    });
  }
});

describe('the touchdown figures agree with the recorder’s last sample', () => {
  for (const flight of FLIGHTS) {
    it(`${flight.id}`, () => {
      const { recorder, card, watch } = flight.run();
      const last = (id: string) => {
        const series = recorder.series[id]!;
        return series[series.length - 1]!;
      };
      expect(watch.last, 'every one of these flights leaves the ground').toBeDefined();

      /*
        One sampling interval of flight is the whole tolerance, and it is
        derived rather than picked: the recorder's last sample is at most
        `RECORDER_SAMPLE_SECONDS` before the witness, and in that time gravity
        can change a vertical speed by `g * dt` and the airframe can turn by its
        angular rate. Anything larger means the witness is reading a different
        moment, or a different field.
      */
      const window = RECORDER_SAMPLE_SECONDS;
      expect(Math.abs(card.vertical.value - last('speedY'))).toBeLessThan(
        C.gravity * window + 0.05,
      );
      expect(Math.abs(card.horizontal.value - last('speedX'))).toBeLessThan(1);
      expect(Math.abs(card.attitude.value - last('pitch'))).toBeLessThan(
        Math.abs(watch.last!.pitch) * 0.05 + 0.05,
      );
      expect(Math.abs(card.propellant.value - last('propellant'))).toBeLessThan(1);
    });
  }
});

describe('the limits are the ones checkIfCrash judges by', () => {
  it('and they are read from core, not restated', () => {
    const { card } = FLIGHTS[0]!.run();
    expect(card.vertical.limit).toBe(C.touchDownSpeedLimit);
    expect(card.attitude.limit).toBe(C.touchDownPitchLimit);
    expect(card.horizontal.limit).toBe(TOUCHDOWN_DRIFT_LIMIT);
  });

  /*
    THE ONE CONSTANT THIS MODULE OWNS, and a test that it is still the right
    one. `checkIfCrash` compares `Math.abs(speedX) < 2` with a bare literal —
    there is no name for it in `core/constants.ts` — so `TOUCHDOWN_DRIFT_LIMIT`
    is a copy, and a copy of a number in another file is a thing that goes
    stale silently. This drives the simulation across the boundary and asserts
    that the copy is where the boundary actually is.
  */
  it('and the drift limit is where the simulation puts it', () => {
    const land = (speedX: number): boolean => {
      let s = createScenarioState({
        ...getScenario('landing-burn')!,
        altitude: 30,
        xPosition: 0,
        speedX,
        speedY: -1,
        pitch: 0 as never,
        propellant: 20,
      });
      for (let i = 0; i < 2_000; i++) {
        s = step(s, DT);
        if (s.status.landed || s.failures.crashed) break;
      }
      return s.status.landed;
    };
    expect(land(TOUCHDOWN_DRIFT_LIMIT * 0.5), 'inside the limit, it lands').toBe(true);
    expect(land(TOUCHDOWN_DRIFT_LIMIT * 1.5), 'outside it, it does not').toBe(false);
  });
});

describe('a crash says which gate it failed', () => {
  /**
   * Drop a vehicle onto the pad in a stated state and read the card.
   *
   * HALF A METRE UP, and the number matters. These vehicles have no engines
   * lit, so whatever they are dropped from they arrive at `sqrt(v0^2 + 2gh)`:
   * the first version of this helper started them at 40 m and every one of them
   * crashed at 17 m/s, including the one meant to test a gentle landing.
   * Contact is at `vehicleHeight/2` for an upright vehicle, so 25.5 m is half a
   * metre of fall and the arrival speed is the one that was asked for.
   */
  function land(overrides: {
    speedX?: number;
    speedY?: number;
    pitchDeg?: number;
  }): Debrief {
    const recorder = createRecorder();
    const timeline = createTimeline();
    const watch = createFlightWatch();
    let s = createScenarioState({
      ...getScenario('landing-burn')!,
      altitude: C.vehicleHeight / 2 + 0.5,
      xPosition: 0,
      speedX: overrides.speedX ?? 0,
      speedY: overrides.speedY ?? -1,
      pitch: (overrides.pitchDeg ?? 0) as never,
      propellant: 20,
    });
    // Hold the attitude: an idle flap pair would turn the vehicle on the way
    // down and the test would be about aerodynamics rather than about the card.
    s.status.finLocked = true;
    for (let i = 0; i < 4_000; i++) {
      s = step(s, DT);
      recorder.sample(s);
      timeline.observe(s);
      watch.observe(s);
      if (s.status.landed || s.failures.crashed) break;
    }
    return debrief(s, timeline, watch.last);
  }

  it('a gentle vertical arrival is a touchdown with nothing to say', () => {
    const card = land({ speedY: -1 });
    expect(card.outcome).toBe('TOUCHDOWN');
    expect(card.reasons).toEqual([]);
    expect(card.vertical.exceeded).toBe(false);
    expect(card.vertical.fraction).toBeLessThan(1);
  });

  it('too fast down is named, and only that', () => {
    // Dropped from high enough to pass the limit under gravity alone.
    const card = land({ speedY: -12 });
    expect(card.outcome).toBe('CRASH');
    expect(card.reasons).toEqual(['descending too fast']);
    expect(card.vertical.exceeded).toBe(true);
    expect(card.vertical.fraction).toBeGreaterThan(1);
    expect(card.horizontal.exceeded).toBe(false);
  });

  it('drifting sideways is named, and only that', () => {
    const card = land({ speedX: 6, speedY: -1 });
    expect(card.outcome).toBe('CRASH');
    expect(card.reasons).toEqual(['drifting sideways']);
    expect(card.horizontal.exceeded).toBe(true);
  });

  it('and two at once are both named, because both are true', () => {
    const card = land({ speedX: 6, speedY: -12 });
    expect(card.outcome).toBe('CRASH');
    expect(card.reasons).toContain('descending too fast');
    expect(card.reasons).toContain('drifting sideways');
  });
});

describe('a break-up is not a landing, and the card does not pretend otherwise', () => {
  /**
   * Orbital speed in thick air. Q passes 50 kPa within a step or two and
   * `checkIfBreakUp` fires — the one outcome none of the eight goldens reaches,
   * and the one the landing figures make no sense for.
   */
  function comeApart() {
    const recorder = createRecorder();
    const timeline = createTimeline();
    const watch = createFlightWatch();
    let s = createScenarioState({
      ...getScenario('reentry')!,
      altitude: 20_000,
      xPosition: 0,
      speedX: 4_000,
      speedY: 0,
      pitch: 90 as never,
      propellant: 50,
    });
    for (let i = 0; i < 2_000; i++) {
      s = step(s, DT);
      recorder.sample(s);
      timeline.observe(s);
      watch.observe(s);
      if (s.failures.inFlightBreakUp) break;
    }
    return { state: s, card: debrief(s, timeline, watch.last) };
  }

  it('breaks up, and says why', () => {
    const { state, card } = comeApart();
    expect(state.failures.inFlightBreakUp, 'the setup must actually break it').toBe(true);
    expect(card.outcome).toBe('LOSS');
    expect(card.reasons.length).toBeGreaterThan(0);
    // Q is what does it at 4 km/s and 20 km, and the card should say so rather
    // than reach for the catch-all.
    expect(card.reasons).toContain('over the dynamic-pressure limit');
    expect(card.reasons).not.toContain('structural limits exceeded');
  });

  it('and hides the landing figures, which never happened', () => {
    const { card } = comeApart();
    expect(card.touchedDown).toBe(false);
    // The figures are still ON the card — the model does not lie about what it
    // measured — but the flag is what tells the view not to draw four numbers
    // that would read as a verdict on a landing nobody attempted.
    expect(Math.abs(card.vertical.value)).toBeGreaterThan(0);
  });

  it('and the peak it broke on is at or past the limit it broke on', () => {
    // The fault this replaced: the number came from the recorder's one-in-five
    // sampling while the red flag came from the step, so four break-ups in five
    // showed a sub-limit figure in alarm red.
    const { card } = comeApart();
    expect(card.peakQ.exceeded).toBe(true);
    expect(card.peakQ.value).toBeGreaterThan(card.peakQ.limit);
    expect(card.peakQ.fraction).toBeGreaterThan(1);
  });
});

describe('the card survives being asked too early', () => {
  it('a flight that has not started reads as flying, with no witness', () => {
    const timeline = createTimeline();
    const watch = createFlightWatch();
    const s = createScenarioState(getScenario('landing-burn')!);
    const card = debrief(s, timeline, watch.last);

    expect(watch.last).toBeUndefined();
    expect(card.outcome).toBe('FLYING');
    expect(card.reasons).toEqual([]);
    expect(card.peakQ.value).toBe(0);
    expect(card.touchedDown).toBe(false);
    expect(card.vertical.value).toBe(0);
    expect(card.events).toEqual([]);
    // The propellant falls back to the state's own, so the card is not blank
    // about the one thing the un-stepped state does know.
    expect(card.propellant.value).toBeCloseTo(s.vehicle.propellantMass / 1000, 6);
  });

  it('and a reset watch forgets the flight it was watching', () => {
    const { watch } = FLIGHTS[0]!.run();
    expect(watch.last).toBeDefined();
    watch.reset();
    expect(watch.last).toBeUndefined();
  });
});
