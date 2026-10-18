/** Every shipped ID must complete a meaningful mission on each real vehicle.
 * Generic smoke flights, the thermal witness and protected intro stay intact.
 * The missing later matrix is reconstructed as a new reviewed successor;
 * historical results are not transferred to it.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ALL_SCENARIOS, createIntroState, createScenarioState, createScenarioVehicle } from '$core/scenarios';
import { step } from '$core/step';
import { DT } from '$app/loop';
import { toggleAutoLand } from '$core/control/commands';
import type { SimState } from '$core/state';
import { SHIP,type VehicleDefinition } from '$core/vehicle';
import { CATCH, SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { runScenarioMission } from './support/scenario-mission';
import { scenarioMissionHorizon } from './support/scenario-horizon';
import { createCatchPose,writeCatchPose } from '$core/physics/tower-catch';
import * as C from '$core/constants';

type Outcome = 'landed' | 'crashed' | 'brokeUp' | 'flying';

// Diagnostic hooks own profiling outside the unchanged synchronous flight body.
// An explicit two-row selection is required; ordinary gate runs import nothing.
let diagnostic: Awaited<ReturnType<typeof import('./support/descent-diagnostic')['startDescentDiagnostic']>> | undefined;
const diagnosticDirectory = process.env['STARSHIP_DESCENT_DIAGNOSTIC_DIR'];
if (diagnosticDirectory) {
  beforeEach(async context => {
    const { startDescentDiagnostic } = await import('./support/descent-diagnostic');
    diagnostic = await startDescentDiagnostic(context.task.name, diagnosticDirectory);
  });
  afterEach(async () => {
    const active = diagnostic;
    diagnostic = undefined;
    await active?.finish();
  });
}

/** Fly until something definite happens, or the clock runs out. */
function fly(initial: SimState, maxSeconds: number, model:VehicleDefinition=SHIP): { outcome: Outcome; seconds: number; state: SimState } {
  let s = initial;
  const steps = Math.round(maxSeconds / DT);

  for (let i = 0; i < steps; i++) {
    s = step(s, DT,{},model);
    if (s.status.landed) return { outcome: 'landed', seconds: i * DT, state: s };
    if (s.failures.crashed) return { outcome: 'crashed', seconds: i * DT, state: s };
    if (s.failures.inFlightBreakUp) return { outcome: 'brokeUp', seconds: i * DT, state: s };
  }
  return { outcome: 'flying', seconds: maxSeconds, state: s };
}

/**
 * No NaN and no Infinity anywhere.
 *
 * Until Phase 5 two fields were exempt: `freeFallTimeRemainingPrediction` and
 * `finalXPosPrediction`, Infinity as the 2021 model's "no solution". Nothing
 * ever filled them in, and Phase 5 removed them, so the check is total: a
 * non-finite number is always a dead simulation. A NaN propagates through every
 * subsequent step and nothing recovers.
 */
function assertFinite(state: SimState, label: string): void {
  const bad: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'number') {
      if (Number.isNaN(value)) {
        bad.push(`${path} = NaN`);
      } else if (!Number.isFinite(value)) {
        bad.push(`${path} = ${value}`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    }
  };
  walk(state, label);
  expect(bad, `${label}: NaN or unexpected Infinity`).toEqual([]);
}

describe('every scenario runs to a definite outcome', () => {
  for (const preset of ALL_SCENARIOS) {
    it(`${preset.id} flies`, () => {
      const flight=createScenarioVehicle(preset);
      const { outcome, seconds, state } = fly(flight.state, 600,flight.vehicle);
      assertFinite(state, preset.id);

      // Something happened: it moved, and it did not sit exactly where it began.
      expect(state.world.updatedFrameCount, preset.id).toBeGreaterThan(0);
      expect(['landed', 'crashed', 'brokeUp', 'flying']).toContain(outcome);
      expect(seconds).toBeGreaterThan(0);
    });
  }
});

describe('the autopilot completes every scenario on both vehicles', () => {
  for (const vehicle of [SHIP, SUPER_HEAVY]) {
    for (const preset of ALL_SCENARIOS) {
      it(`${vehicle.id}/${preset.id}: autopilot lands or catches`, () => {
        const result = runScenarioMission(preset, vehicle, diagnostic?.observe);
        diagnostic?.recordResult(result);
        const { state } = result;
        const label = `${vehicle.id}/${preset.id}: ${result.outcome} after ${result.seconds.toFixed(3)} s; events=${JSON.stringify(result.events)}`;
        assertFinite(state, label);
        expect(result.finite, label).toBe(true);
        expect(result.ticks, label).toBeGreaterThan(0);
        expect(result.ticks, label).toBeLessThanOrEqual(scenarioMissionHorizon(preset).steps);
        expect(result.outcome, label).toBe('landed');
        expect(Object.values(state.failures).some(Boolean), label).toBe(false);
        expect(state.vehicle.propellantMass, label).toBeGreaterThan(0);
        expect(result.peakTemperature, label).toBeLessThanOrEqual(C.TILE_LIMIT_KELVIN);
        expect(result.peakPressure, label).toBeLessThanOrEqual(C.dynamicPressureLimit);
        expect(result.peakG, label).toBeLessThanOrEqual(C.gLimit);
        if (preset.id === 'launch-pad') {
          expect(result.launchDeparted, label).toBe(true);
          expect(result.ascentCompleted, label).toBe(true);
        }
        if (preset.id === 'circularize') expect(result.circularized, label).toBe(true);
        if (preset.id === 'circularize' || preset.id === 'deorbit') {
          expect(result.events.some(event => event.kind === 'burn-start'), label).toBe(true);
          expect(result.events.some(event => event.kind === 'burn-cutoff'), label).toBe(true);
          expect(result.events.some(event => event.kind === 'return-handoff'), label).toBe(true);
        }
        if (vehicle.id === 'super-heavy') {
          expect(state.status.onTheGround, label).toBe(false);
          const lug = createCatchPose(); writeCatchPose(state, vehicle, lug);
          expect(lug.altitude, label).toBe(CATCH.planeAltitude);
          expect(Math.abs(lug.x - C.starBaseXPos), label).toBeLessThanOrEqual(CATCH.halfWidth);
          expect(Math.abs(state.kinematics.pitch), label).toBeLessThanOrEqual(CATCH.maxPitch);
          expect(state.kinematics.speedX, label).toBe(0);
          expect(state.kinematics.speedY, label).toBe(0);
        } else {
          expect(state.status.landed, label).toBe(true);
          expect(result.touchdown, label).toBeDefined();
          const incoming = result.touchdown!;
          expect(incoming.altitude, label).toBeLessThanOrEqual(vehicle.height * Math.abs(Math.cos(incoming.pitch)) / 2);
          expect(Math.abs(incoming.speedX), label).toBeLessThan(2);
          expect(incoming.speedY, label).toBeLessThan(-0.5);
          expect(Math.abs(incoming.speedY), label).toBeLessThan(C.touchDownSpeedLimit);
          expect(Math.abs(incoming.pitch), label).toBeLessThan(C.touchDownPitchLimit);
          expect(Math.abs(state.kinematics.speedY), label).toBeLessThan(C.touchDownSpeedLimit);
          expect(Math.abs(state.kinematics.pitch), label).toBeLessThan(C.touchDownPitchLimit);
          expect(state.kinematics.altitude, label).toBeGreaterThan(0);
          // Retain the existing orbital demonstration's physical target bound.
          // The separate 1 km deorbit-range health test remains unchanged.
          expect(Math.abs(state.kinematics.downRangeDistance - C.starBaseXPos), label).toBeLessThan(10_000);
        }
      });
    }
  }

  it('reentry: survives the heat it now actually meets', () => {
    // The scenario the whole M2 arc was about. It broke up instantly from M2.1
    // until M2.9(a) recalibrated heatLimit against the model that replaced the
    // one the old limit was tuned for. Asserted with its numbers so the fix
    // cannot quietly become a different fix: peak heating is a real fraction of
    // the limit, not comfortably below it.
    const preset = ALL_SCENARIOS.find((p) => p.id === 'reentry')!;
    const state = createScenarioState(preset);
    toggleAutoLand(state);

    let s = state;
    let peak = 0;
    let outcome: Outcome = 'flying';
    let seconds = 0;
    for (let i = 1; i <= 120 * 900; i++) {
      s = step(s, DT);
      peak = Math.max(peak, s.forces.thermalPower);
      if (s.failures.inFlightBreakUp) { outcome = 'brokeUp'; seconds = i / 120; break; }
      if (s.failures.crashed) { outcome = 'crashed'; seconds = i / 120; break; }
      if (s.status.landed) { outcome = 'landed'; seconds = i / 120; break; }
    }
    assertFinite(s, 'reentry');

    expect(outcome, `after ${seconds.toFixed(1)} s`).toBe('landed');
    // Approved broadside fallback: restore Phase 6’s measured 170.9 kW/m²
    // characterization, keeping its ±5% band and absolute thermal limit.
    expect(peak, 'peak heat flux, W/m^2').toBeGreaterThan(170_900 * 0.95);
    expect(peak).toBeLessThan(170_900 * 1.05);
    expect(peak).toBeLessThan(C.heatLimit);
  });
});

describe('the intro, which AGENTS.md says must never change', () => {
  it('lands itself and hands the vehicle over with full tanks', () => {
    let s = createIntroState();
    let handedOver = -1;

    for (let i = 0; i < 120 * 120 && handedOver < 0; i++) {
      s = step(s, DT);
      if (!s.autopilot.demoAutoLandOn) handedOver = i;
    }

    expect(handedOver, 'the demo must hand over').toBeGreaterThan(0);
    assertFinite(s, 'intro');

    // autopilot/index.ts:497 — the handover restores the vehicle for play.
    expect(s.vehicle.propellantMass).toBe(350_000);
    expect(s.vehicle.throttle).toBe(100);
    expect(s.autopilot.pitchControl).toBe(0);
    expect(s.status.finLocked).toBe(false);
    expect(s.failures.crashed).toBe(false);
    expect(s.failures.inFlightBreakUp).toBe(false);
  });

  it('is deterministic: the same seed gives the same landing, every time', () => {
    const run = () => {
      let s = createIntroState(12345);
      for (let i = 0; i < 2_000; i++) s = step(s, DT);
      return [s.kinematics.altitude, s.kinematics.speedY, s.kinematics.downRangeDistance];
    };
    expect(run()).toEqual(run());
  });
});
