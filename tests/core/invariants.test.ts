/**
 * Invariants over the whole state space, not just the presets. Each property
 * holds for any flight a player can configure; fast-check generates them and
 * shrinks a failure to its smallest form.
 *
 * Seeded, so the gate is deterministic. Set FC_SEED to explore other seeds.
 */
import * as C from '$core/constants';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { step } from '$core/step';
import { MU, specificOrbitalEnergy } from '$core/physics/gravity';
import { flattenState, GOLDEN_DT } from '../golden/record';
import { arbitraryFlight, startOf } from './arbitraries';
import { SHIP } from '$core/vehicle';
import { createDamageMassProperties } from '$core/physics/damage-mass';
import { writeFlightMassQuery } from '$core/physics/flight-mass-query';

const STEPS = 120;
const PARAMS = { numRuns: 200, seed: Number(process.env.FC_SEED ?? 42) };

function fly(flight: ReturnType<typeof startOf>, throttles: number[], pitch: number[]) {
  let s = flight;
  const states = [s];
  for (let i = 0; i < throttles.length; i++) {
    s = step(s, GOLDEN_DT, { throttle: throttles[i], pitchControl: pitch[i] });
    states.push(s);
  }
  return states;
}

describe('invariants over any configurable flight', () => {
  it('every number stays finite, or is a sentinel it started as', () => {
    fc.assert(
      fc.property(arbitraryFlight(STEPS), (f) => {
        const states = fly(startOf(f), f.throttles, f.pitchCommands);
        // Infinity is a sentinel ("no prediction yet") only where the state
        // starts with it; a field that becomes Infinity, or NaN, is a fault.
        const first = flattenState(states[0]);
        const last = flattenState(states.at(-1));
        for (const [key, value] of Object.entries(last)) {
          if (typeof value !== 'number') continue;
          expect(Number.isNaN(value), `${key} is NaN`).toBe(false);
          if (!Number.isFinite(value)) {
            expect(first[key], `${key} became ${value}`).toBe(value);
          }
        }
      }),
      PARAMS,
    );
  });

  it('mass never increases, and propellant never goes negative', () => {
    fc.assert(
      fc.property(arbitraryFlight(STEPS), (f) => {
        const states = fly(startOf(f), f.throttles, f.pitchCommands);
        for (let i = 1; i < states.length; i++) {
          expect(states[i]!.vehicle.vehicleMass).toBeLessThanOrEqual(
            states[i - 1]!.vehicle.vehicleMass,
          );
          expect(states[i]!.vehicle.propellantMass).toBeGreaterThanOrEqual(0);
        }
      }),
      PARAMS,
    );
  });

  it('with the engines off and no wind, orbital energy never rises beyond integrator error', () => {
    fc.assert(
      fc.property(arbitraryFlight(STEPS), (f) => {
        const flight = { ...f, enginesOn: false, dumping: false, preset: { ...f.preset, wind: 0 } };
        let s = startOf(flight);
        // In the turning ground frame the conserved quantity of free motion is
        // the Jacobi integral, the energy less the centrifugal potential
        // omega^2 r^2 / 2; air at rest over the ground only ever takes from it.
        // At omega = 0 it is the orbital energy (Phase 6 Task 9).
        const mass = createDamageMassProperties();
        const energy = (x: typeof s) => {
          // V3 publishes the geometric hull point. Orbital energy belongs to
          // the physical mass centre, whose velocity includes omega cross r.
          // Compute that point independently of the production transform.
          const k = x.kinematics, event = x.damage?.terminal;
          writeFlightMassQuery(x, SHIP, mass);
          const dx = mass.centreOfMassX, dz = mass.centreOfMass - SHIP.height / 2;
          const rx = dx * Math.cos(k.pitch) + dz * Math.sin(k.pitch);
          const ry = -dx * Math.sin(k.pitch) + dz * Math.cos(k.pitch);
          const radius = C.planetRadius + (event?.active ? event.altitude : k.altitude + ry);
          const vx = event?.active ? event.speedX : k.speedX + k.angularVelocity * ry;
          const vy = event?.active ? event.speedY : k.speedY - k.angularVelocity * rx;
          return specificOrbitalEnergy(radius, Math.hypot(vx, vy))
            - 0.5 * C.frameRotationRate ** 2 * radius ** 2;
        };
        for (let i = 0; i < STEPS; i++) {
          const before = energy(s);
          s = step(s, GOLDEN_DT, { throttle: 0 });
          if (s.status.landed || s.failures.crashed) break;
          // Rounding only: the worst per-step rise measured over 1,000 flights
          // (seed 7) was 2.5e-16 of GM/r. 1e-12 is 4,000 times that, and a
          // real energy source of even a few J/kg per step exceeds it.
          const slack = 1e-12 * (MU / s.kinematics.distanceToPlanetCenter);
          expect(energy(s), `step ${i + 1}`).toBeLessThanOrEqual(before + slack);
        }
      }),
      PARAMS,
    );
  });

  it('is deterministic: the same flight twice gives identical states', () => {
    fc.assert(
      fc.property(arbitraryFlight(30), (f) => {
        const a = fly(startOf(f), f.throttles, f.pitchCommands).at(-1);
        const b = fly(startOf(f), f.throttles, f.pitchCommands).at(-1);
        const fa = flattenState(a);
        const fb = flattenState(b);
        for (const k of Object.keys(fa)) expect(Object.is(fa[k], fb[k]), k).toBe(true);
      }),
      { ...PARAMS, numRuns: 50 },
    );
  });
});
