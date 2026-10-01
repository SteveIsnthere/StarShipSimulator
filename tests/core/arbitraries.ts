/**
 * fast-check generators for states the presets never visit: any altitude from
 * the ground to 400 km, any speed up to orbital, any attitude, empty or full
 * tanks, engines lit or not. Built through `createScenarioState`, the same path
 * the flight editor uses, so every generated state is one a player could make.
 */
import fc from 'fast-check';
import type { Deg } from '$core/units';
import type { SimState } from '$core/state';
import { createScenarioState, type ScenarioPreset } from '$core/scenarios';
import * as cmd from '$core/control/commands';

export interface Flight {
  preset: ScenarioPreset;
  enginesOn: boolean;
  dumping: boolean;
  throttles: number[];
  pitchCommands: number[];
}

export function arbitraryPreset(): fc.Arbitrary<ScenarioPreset> {
  return fc.record({
    id: fc.constant('custom'),
    name: fc.constant('Custom'),
    description: fc.constant('generated'),
    altitude: fc.double({ min: 0, max: 400_000, noNaN: true }),
    xPosition: fc.double({ min: -2_000_000, max: 2_000_000, noNaN: true }),
    speedX: fc.double({ min: -8_000, max: 8_000, noNaN: true }),
    speedY: fc.double({ min: -3_000, max: 3_000, noNaN: true }),
    pitch: fc.double({ min: -180, max: 180, noNaN: true }).map((d) => d as Deg),
    // Below zero on purpose: the flight editor accepts any number.
    propellant: fc.double({ min: -100, max: 1_200, noNaN: true }),
    wind: fc.double({ min: -40, max: 40, noNaN: true }),
  });
}

export function arbitraryFlight(steps: number): fc.Arbitrary<Flight> {
  return fc.record({
    preset: arbitraryPreset(),
    enginesOn: fc.boolean(),
    dumping: fc.boolean(),
    throttles: fc.array(fc.double({ min: 0, max: 100, noNaN: true }), {
      minLength: steps,
      maxLength: steps,
    }),
    pitchCommands: fc.array(fc.double({ min: -100, max: 100, noNaN: true }), {
      minLength: steps,
      maxLength: steps,
    }),
  });
}

/** The generated flight's starting state, engines commanded as drawn. */
export function startOf(flight: Flight): SimState {
  const s = createScenarioState(flight.preset);
  if (flight.enginesOn) cmd.toggleAllRaptors(s);
  if (flight.dumping) cmd.toggleDumpFuel(s);
  return s;
}
