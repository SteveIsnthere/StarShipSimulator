/** Frozen pre-continuation midpoint algorithm and pre-preparation force query.
 * Keep the original operation order: this is the same-runtime exact-output
 * oracle, independent of whether V8 versions round libm results differently.
 * Physical force/material helpers remain canonical and are unchanged by these
 * two Refactors. This helper is test-only and is never imported by production. */
import * as C from '$core/constants';
import { type VehicleDefinition, SHIP } from '$core/vehicle';
import type { SimState } from '$core/state';
import { rad, type Rad } from '$core/units';
import { createBurnScratch, createFallResult, type FallResult } from '$core/control/guidance-physics';
import { isaAtmosphereInto } from '$core/physics/isa';
import { speedOfSoundAt } from '$core/physics/atmosphere';
import { meanWindAt } from '$core/physics/wind';
import { wrappedAttackAngle, foldedIntoWind, getCrossSectionalArea, getBodyDragCoefficient, getDrag, getLift } from '$core/physics/aero';
import { getHorizontalAcceleration, getVerticalAcceleration } from '$core/physics/components';
import { tangentialAcceleration, verticalGravityAcceleration } from '$core/physics/gravity';
import { createDamageMassProperties } from '$core/physics/damage-mass';
import { writeFlightMassQuery } from '$core/physics/flight-mass-query';
import { damageModelFor } from '$core/physics/damage-model';
import { createDamageControlForces, writeDamageControls } from '$core/physics/damage-controls';
import { MAX_DAMAGE_COMPONENTS } from '$core/damage-state';

export function originalUnpoweredFall(state: SimState, groundAltitude: number,
  model: VehicleDefinition = SHIP, pitch: Rad = state.kinematics.pitch): FallResult {
  const scratch = createBurnScratch(), controls = createDamageControlForces(MAX_DAMAGE_COMPONENTS);
  const queriedMass = createDamageMassProperties();
  if (state.damage) writeFlightMassQuery(state, model, queriedMass);
  const mass = state.damage ? queriedMass.totalMass : state.vehicle.vehicleMass;
  const out = createFallResult();
  if (!(mass > 0)) { out.downRange = NaN; return out; }
  const initialMaxArea = state.vehicle.vehicleInFlightMaxArea, referenceWind = state.world.wind;
  function acceleration(altitude: number, vx: number, vy: number) {
    const { inputs, acc, atmosphere: air } = scratch;
    const r = C.planetRadius + altitude;
    isaAtmosphereInto(Math.max(altitude, 0), air);
    const rx = vx - meanWindAt(referenceWind, altitude), ry = vy;
    const speed = Math.sqrt(rx * rx + ry * ry), motion = Math.atan2(rx, ry);
    const attack = wrappedAttackAngle(pitch, motion), intoWind = foldedIntoWind(attack);
    let maxArea = initialMaxArea;
    if (state.damage) {
      const frontCommand = model.gridFins
        ? (state.vehicle.frontFinExtension - 50) / 50 * model.gridFins.maxAngle
        : state.vehicle.frontFinExtension * .01 * C.finActuationMaxAngle;
      writeDamageControls(state.damage, damageModelFor(model).controls,
        .5 * air.airDensity * speed ** 2, Math.abs(Math.sin(intoWind)), frontCommand,
        state.vehicle.aftFinExtension * .01 * C.finActuationMaxAngle, controls);
      maxArea = model.maxArea + 1.8 * (controls.frontArea + controls.aftArea);
    }
    const area = getCrossSectionalArea(rad(intoWind), maxArea, model);
    const mach = speed / speedOfSoundAt(air.airTemperature);
    inputs.angleOfMotion = rad(motion); inputs.angleOfAttack = rad(attack);
    inputs.aerodynamicDragAcceleration = getDrag(air.airDensity, speed, area, getBodyDragCoefficient(mach)) / mass;
    inputs.aerodynamicLiftAcceleration = getLift(air.airDensity, speed, rad(intoWind), maxArea) / mass;
    acc.x = getHorizontalAcceleration(inputs) + tangentialAcceleration(r, vx, vy);
    acc.y = getVerticalAcceleration(inputs, C.gravity) + C.gravity + verticalGravityAcceleration(r, vx);
  }
  const dt = .25, half = dt * .5;
  let h = state.kinematics.altitude, x = 0, vx = state.kinematics.speedX, vy = state.kinematics.speedY;
  for (let index = 0; index < 4000; index++) {
    acceleration(h, vx, vy);
    const mvx = vx + scratch.acc.x * half, mvy = vy + scratch.acc.y * half;
    acceleration(h + vy * half, mvx, mvy);
    const nvx = vx + scratch.acc.x * dt, nvy = vy + scratch.acc.y * dt;
    const nh = h + mvy * dt, nx = x + mvx * dt;
    if (nh <= groundAltitude) {
      const f = (h - groundAltitude) / (h - nh);
      out.reached = true; out.time = (index + f) * dt; out.downRange = x + (nx - x) * f;
      return out;
    }
    h = nh; x = nx; vx = nvx; vy = nvy;
  }
  out.downRange = x;
  return out;
}
