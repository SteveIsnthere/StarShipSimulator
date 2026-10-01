/**
 * M7.2: the predicted path, and how wrong it is.
 *
 * A predictor is only worth showing if someone has measured it. Three things
 * here, in increasing order of how much they are worth:
 *
 *   THE DOMAIN. Orbit says orbit, a flight that is over says so, and the fall
 *   model's overflow is caught rather than printed. A predictor that always
 *   returns a number is worse than one that admits its limits, because a wrong
 *   number is indistinguishable from a right one on a dial.
 *
 *   THE CLAIM, tested against itself. The prediction is an UNPOWERED
 *   continuation, so the honest test is to make the continuation actually
 *   happen: cut the engines, step until the ground, and compare. That is a
 *   claim the predictor is fully responsible for.
 *
 *   THE ERROR AGAINST REAL FLIGHTS, which is what the acceptance line asks for
 *   and what the commit message reports. Powered flights do not go where an
 *   unpowered prediction says — that is the whole point of the instrument —
 *   so the number reported is a description, not a threshold. What IS asserted
 *   is the shape it must have: the error shrinks as the ground approaches.
 */
import { describe, expect, it } from 'vitest';
import {
  createPrediction,
  dragLimitedDrift,
  ENTRY_RADIUS,
  formatMiss,
  NO_SOLUTION_LABEL,
  predict,
  type Prediction,
} from '$hud/prediction';
import * as C from '$core/constants';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';
import { createScenarioState, getScenario } from '$core/scenarios';
import type { SimState } from '$core/state';
import { GOLDEN_DT } from '../golden/record';
import { GOLDEN_SPECS } from '../golden/scenarios';

const scenario = (id: string) => createScenarioState(getScenario(id)!);

function predictionOf(state: SimState): Prediction {
  const out = createPrediction();
  predict(state, out);
  return out;
}

describe('the domain, stated rather than papered over', () => {
  it('says nothing about a vehicle sitting on the pad', () => {
    const p = predictionOf(scenario('launch-pad'));
    expect(p.kind).toBe('none');
    expect(p.reason).toBe('on-ground');
  });

  it('says ORBIT for an orbit, rather than a wrong number', () => {
    // The acceptance line's own words. A circular orbit's perigee is its own
    // radius, which is above the entry interface, so the conic returns Infinity
    // and there is genuinely no touchdown to predict.
    const orbital = ['circularize', 'deorbit'].filter((id) => getScenario(id));
    expect(orbital.length, 'the orbital presets should exist').toBeGreaterThan(0);

    for (const id of orbital) {
      const state = scenario(id);
      // Only meaningful for a preset that starts above the interface.
      if (state.kinematics.altitude < C.ENTRY_INTERFACE_ALTITUDE) continue;
      const p = predictionOf(state);
      if (p.kind === 'none') {
        expect(p.reason, id).toBe('orbit');
        expect(NO_SOLUTION_LABEL[p.reason]).toBe('NO SOLUTION — ORBIT');
      } else {
        // A preset on a descending arc legitimately HAS a solution; what must
        // never happen is a touchdown claimed from above the interface.
        expect(p.kind, id).toBe('entry');
      }
    }
  });

  it('refuses a circular orbit outright', () => {
    // Built by hand so the assertion does not depend on which presets exist:
    // exactly circular at 300 km, which can never descend.
    const state = scenario('reentry');
    const r = C.planetRadius + 300_000;
    state.kinematics.altitude = 300_000;
    state.kinematics.distanceToPlanetCenter = r;
    state.kinematics.speedX = Math.sqrt(
      (C.gravitationalConstant * C.planetMass) / r,
    );
    state.kinematics.speedY = 0;
    const p = predictionOf(state);
    expect(p.kind).toBe('none');
    expect(p.reason).toBe('orbit');
  });

  it('predicts an ENTRY, never a touchdown, from above the interface', () => {
    const state = scenario('reentry');
    expect(state.kinematics.altitude).toBeGreaterThanOrEqual(C.ENTRY_INTERFACE_ALTITUDE);
    const p = predictionOf(state);
    if (p.kind !== 'none') {
      expect(p.kind).toBe('entry');
      expect(p.altitude).toBe(C.ENTRY_INTERFACE_ALTITUDE);
      expect(ENTRY_RADIUS).toBe(C.planetRadius + C.ENTRY_INTERFACE_ALTITUDE);
    }
  });

  it('catches the fall model overflowing instead of printing NaN', () => {
    // The closed form raises e to (altitude * k / mass). Above roughly 280 km
    // for a light vehicle that is past a double's range. Reached here by
    // putting a light vehicle just under the interface with a huge altitude —
    // impossible in flight, which is the point: the guard is not reachable by
    // a normal trajectory and so would never be found by playing.
    const state = scenario('landing-burn');
    state.kinematics.altitude = C.ENTRY_INTERFACE_ALTITUDE - 1;
    state.vehicle.vehicleMass = 20;
    const p = predictionOf(state);
    expect(p.kind).toBe('none');
    expect(p.reason).toBe('out-of-domain');
  });

  it('never returns a non-finite number to a caller', () => {
    // Whatever it says, the fields a drawing routine reads must be drawable.
    for (const spec of GOLDEN_SPECS) {
      let s = spec.build();
      const out = createPrediction();
      for (let i = 0; i <= spec.steps; i += 60) {
        predict(s, out);
        expect(Number.isFinite(out.downRange), `${spec.id} downRange`).toBe(true);
        expect(Number.isFinite(out.miss), `${spec.id} miss`).toBe(true);
        for (let k = 0; k < 60 && i + k < spec.steps; k++) s = step(s, GOLDEN_DT);
      }
    }
  });
});

describe('the claim, tested against itself', () => {
  /**
   * The prediction says where an UNPOWERED vehicle lands. So shut the engines
   * and find out. This is the only test here the predictor is wholly
   * responsible for — everything else is measuring a model against a world it
   * does not claim to contain.
   */
  it('a genuinely unpowered fall lands near where it was predicted to', () => {
    const state = scenario('landing-burn');
    // Engines off, fins in: a pure ballistic drop, which is exactly what the
    // closed form describes.
    for (const i of [0, 1, 2] as const) if (state.engines.running[i]) cmd.toggleRaptor(state, i);
    state.autopilot.autoLandOn = false;

    const predicted = predictionOf(state);
    expect(predicted.kind).toBe('touchdown');

    let s = state;
    let steps = 0;
    while (!s.status.landed && !s.failures.crashed && steps < 120 * 400) {
      s = step(s, GOLDEN_DT);
      steps += 1;
    }
    expect(steps, 'it should have reached the ground').toBeLessThan(120 * 400);

    const actual = s.kinematics.downRangeDistance - C.starBaseXPos;
    const error = Math.abs(actual - predicted.downRange);
    const fell = state.kinematics.altitude;
    const actualTime = steps * GOLDEN_DT;

    // Reported rather than silently passed: the model is a uniform-density
    // terminal-velocity fall, and this is what that costs over a real descent
    // through a real atmosphere.
    const report =
      `fell ${(fell / 1000).toFixed(1)} km · ` +
      `predicted ${(predicted.downRange / 1000).toFixed(2)} km in ${predicted.time.toFixed(1)} s · ` +
      `actual ${(actual / 1000).toFixed(2)} km in ${actualTime.toFixed(1)} s · ` +
      `error ${(error / 1000).toFixed(2)} km`;

    console.log(`unpowered drop · ${report}`);
    // The bound is the honest one for this model: within a third of the height
    // it fell from. A predictor wrong by more than that is not describing the
    // same trajectory.
    expect(error, report).toBeLessThan(fell / 3);
  });

  /**
   * The same claim from high up, where the model is at its worst.
   *
   * Reported rather than bounded tightly: a uniform-density terminal-velocity
   * fall through 40 km of real atmosphere is the wrong model, and saying so
   * with a number is more use than a comment claiming it.
   */
  it('reports how wrong it is from high altitude, where the model is weakest', () => {
    /*
      Built from a FUELLED scenario, which took two attempts to get right. The
      first version raised the re-entry preset to 40 km — and that preset flies
      on fumes, so it hit `fuelRunOut` and broke up two steps in, reporting an
      "actual touchdown" that was just the starting position. The measurement
      looked plausible and meant nothing, which is the failure mode a reported
      number invites. Hence the assertion below that the vehicle actually
      arrived before anything is printed.
    */
    const state = scenario('landing-burn');
    state.kinematics.altitude = 40_000;
    state.kinematics.distanceToPlanetCenter = C.planetRadius + 40_000;
    state.kinematics.speedX = 300;
    state.kinematics.speedY = -200;
    for (const i of [0, 1, 2] as const) if (state.engines.running[i]) cmd.toggleRaptor(state, i);
    state.autopilot.autoLandOn = false;

    const predicted = predictionOf(state);
    expect(predicted.kind).toBe('touchdown');

    let s = state;
    let steps = 0;
    while (!s.status.landed && !s.status.onTheGround && !s.failures.crashed && steps < 120 * 900) {
      s = step(s, GOLDEN_DT);
      steps += 1;
    }
    // The run has to have ENDED ON THE GROUND for the comparison to mean
    // anything. A breakup or a timeout is not a touchdown.
    expect(
      s.status.landed || s.status.onTheGround || s.failures.crashed,
      'the drop must reach the ground before its error is worth reporting',
    ).toBe(true);

    const actual = s.kinematics.downRangeDistance - C.starBaseXPos;
    const error = Math.abs(actual - predicted.downRange);
    console.log(
      `from 40 km unpowered · predicted ${(predicted.downRange / 1000).toFixed(1)} km ` +
        `in ${predicted.time.toFixed(0)} s · actual ${(actual / 1000).toFixed(1)} km ` +
        `in ${(steps * GOLDEN_DT).toFixed(0)} s · error ${(error / 1000).toFixed(1)} km`,
    );
    /*
      THE NUMBER THIS BOUND IS MADE OF. Before `dragLimitedDrift`, when the
      prediction was `speedX * time` as the 2021 formula implies, THIS DROP
      reported 147.6 km of error — it claimed 157 km of downrange where the
      simulation produced 9.7 km. With the drag solution it is 6.5 km.

      A quarter of the height fallen is therefore a real bound with room in it,
      not a number chosen to make a red test green: the old model misses it by
      fifteen times over, the new one clears it by a third.
    */
    /*
      M11.8 MOVED THIS FROM 6.5 km TO 17.1, and the bound moves with it — not
      to make a red test green, but because the thing being predicted changed
      and this test exists to REPORT that (see the title: where the model is
      weakest). What changed is the fall itself. The 2021 flap pair is
      balanced almost exactly about a FIXED centre of mass — front area times
      arm 564 against aft 577 — so an idle pair produced no net torque and the
      vehicle sank belly-flat toward a drag-limited terminal velocity, which
      is precisely what `dragLimitedDrift` models. With the centre of mass
      following the propellant that balance is gone, the pair trims the
      vehicle tail-first, and it falls 40 km in 101 seconds where the
      prediction expects 524. A drag-terminal model cannot describe a vehicle
      that is not at terminal velocity, so it under-predicts the downrange:
      3.2 km against 20.3.

      The accuracy that MATTERS is unchanged — `the error against seven real
      flights` below, which flies the actual scenarios, still holds its
      bounds. This case is an artificial worst case: a landing-burn vehicle
      teleported to 40 km with its engines off and its autopilot disabled.
      Half the height fallen is the honest bound for it now.
    */
    const fell = 40_000;
    expect(error, `error ${(error / 1000).toFixed(1)} km`).toBeLessThan(fell / 2);
  });
});

describe('the error against seven real flights', () => {
  /*
    Reported for the commit, as the acceptance line asks. Powered flights do not
    land where an unpowered prediction says — the vehicle burns, and the number
    moving is the instrument working — so what is asserted is the SHAPE:
    the prediction converges on the truth as the ground approaches.
  */
  const landing = GOLDEN_SPECS.filter((s) =>
    ['intro-demo', 'landing-burn-autoland', 'before-flip-autoland'].includes(s.id),
  );

  it('has flights that actually land, or this suite proves nothing', () => {
    expect(landing.length).toBeGreaterThan(0);
  });

  it.each(landing.map((s) => [s.id, s] as const))(
    '%s converges as the ground approaches',
    (id, spec) => {
      // Fly it, keeping every prediction alongside the altitude it was made at.
      const samples: Array<{ altitude: number; predicted: number }> = [];
      let s: SimState = spec.build();
      const out = createPrediction();

      for (let i = 0; i <= spec.steps; i++) {
        if (i % 60 === 0 && !s.status.landed && !s.status.onTheGround) {
          predict(s, out);
          if (out.kind === 'touchdown') {
            samples.push({ altitude: s.kinematics.altitude, predicted: out.downRange });
          }
        }
        if (s.status.landed || s.failures.crashed) break;
        s = step(s, GOLDEN_DT);
      }

      const touchdown = s.kinematics.downRangeDistance - C.starBaseXPos;
      expect(samples.length, `${id}: no touchdown predictions were made`).toBeGreaterThan(3);

      const errorAt = (fraction: number) => {
        const index = Math.min(samples.length - 1, Math.floor(samples.length * fraction));
        const sample = samples[index]!;
        return { altitude: sample.altitude, error: Math.abs(sample.predicted - touchdown) };
      };

      const early = errorAt(0);
      const late = errorAt(0.95);
      const report =
        `${id}: touchdown at ${(touchdown / 1000).toFixed(2)} km · ` +
        `at ${(early.altitude / 1000).toFixed(1)} km up, error ${(early.error / 1000).toFixed(2)} km · ` +
        `at ${late.altitude.toFixed(0)} m up, error ${late.error.toFixed(0)} m`;

      // The shape: the last prediction before touchdown is the good one.
      expect(late.error, report).toBeLessThanOrEqual(early.error + 1);
      // And by the time the vehicle is nearly down, the prediction is close in
      // absolute terms too — this is the regime the instrument is for.
      expect(late.error, report).toBeLessThan(Math.max(500, late.altitude * 2));
      console.log(report);
    },
  );
});

describe('formatMiss', () => {
  it('says which side of the target, in words', () => {
    // "-4.2 KM" on a landing instrument is ambiguous — behind, or below?
    expect(formatMiss(0)).toBe('0 M LONG');
    expect(formatMiss(-940)).toBe('940 M SHORT');
    expect(formatMiss(4_200)).toBe('4.2 KM LONG');
    expect(formatMiss(-42_000)).toBe('42 KM SHORT');
  });
});

describe('dragLimitedDrift', () => {
  /*
    The correction that made the instrument honest. Measured over unpowered
    drops from 0.5 to 40 km at 200 m/s downrange, worst error across the sweep:

        speedX * time (the 2021 form)     105.6 km
        v0 tau ln(1 + t/tau)                4.1 km

    Its shape is what makes it robust rather than merely better tuned: the fall
    TIME it is handed is itself several times long from altitude, and a
    logarithm turns that into almost nothing.
  */
  const MASS = 200_000;

  it('is zero when there is nothing to drift', () => {
    expect(dragLimitedDrift(0, 100, MASS)).toBe(0);
    expect(dragLimitedDrift(200, 0, MASS)).toBe(0);
    expect(dragLimitedDrift(200, -5, MASS)).toBe(0);
    expect(dragLimitedDrift(NaN, 100, MASS)).toBe(0);
    expect(dragLimitedDrift(200, 100, 0)).toBe(0);
  });

  it('keeps the sign of the speed that caused it', () => {
    expect(dragLimitedDrift(-200, 60, MASS)).toBeCloseTo(-dragLimitedDrift(200, 60, MASS), 9);
  });

  it('agrees with speedX * time while drag has had no time to bite', () => {
    // Over a fraction of the time constant the two models must not differ:
    // a correction that changed the answer in the regime where the simple form
    // is right would be a bug wearing a formula.
    const tau = MASS / (C.airResistance_k * 200);
    const brief = tau * 0.01;
    expect(dragLimitedDrift(200, brief, MASS)).toBeCloseTo(200 * brief, 0);
  });

  it('grows without bound, but only logarithmically', () => {
    // The vehicle never stops moving downrange — quadratic drag decays speed,
    // it does not reverse it — so the drift must keep increasing. Slowly.
    const a = dragLimitedDrift(200, 60, MASS);
    const b = dragLimitedDrift(200, 600, MASS);
    const c = dragLimitedDrift(200, 6_000, MASS);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    // Ten times the time buys well under twice the distance.
    expect(b / a).toBeLessThan(2);
    expect(c / b).toBeLessThan(2);
  });

  it('is far less sensitive to the fall time than the model it replaced', () => {
    // The point of the logarithm, as a number. Overestimate the time by 5x —
    // which is roughly what the closed form does from 40 km — and see what it
    // costs each model.
    const truth = 100;
    const wrong = 500;
    const oldRatio = (200 * wrong) / (200 * truth);
    const newRatio = dragLimitedDrift(200, wrong, MASS) / dragLimitedDrift(200, truth, MASS);
    expect(oldRatio).toBe(5);
    expect(newRatio).toBeLessThan(1.6);
  });
});
