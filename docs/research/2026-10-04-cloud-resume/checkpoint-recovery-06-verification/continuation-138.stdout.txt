/** The landing target must be reachable on the engines that remain. */
import { expect, it } from 'vitest';
import * as C from '$core/constants';
import { finalDescentStageController } from '$core/autopilot';
import { createScenarioState, getScenario } from '$core/scenarios';
import { rad } from '$core/units';
import { SHIP } from '$core/vehicle';
import { verticalWeight } from '$core/physics/gravity';

function singleEngineDescent() {
 const s = createScenarioState(getScenario('landing-burn')!);
 s.kinematics.altitude = 600;
 s.kinematics.distanceToPlanetCenter = C.planetRadius + 600;
 // At the one-engine stopping envelope, braking feed-forward requires full
 // thrust. Derive the precondition from published Raptor3 sea-level thrust;
 // the former -80 m/s input lies inside the stronger engine's envelope.
 const height = 600 - SHIP.height / 2;
 const mass = SHIP.dryMass + 26_000;
 const acceleration = 250_000 * C.standardGravity / mass - verticalWeight(C.planetRadius + 600);
 s.kinematics.speedY = -Math.sqrt(2 * acceleration * height);
 s.kinematics.pitch = rad(0);
 s.vehicle.propellantMass = 26_000;
 s.vehicle.vehicleMass = C.vehicleDryMass + s.vehicle.propellantMass;
 s.vehicle.throttleCurrent = 40;
 s.atmosphere.airPressure = C.SEA_LEVEL_PRESSURE_PA / 1000;
 s.engines.running = [true,false,false,false,false,false];
 s.engines.failed = [false,true,true,false,false,false];
 s.autopilot.landingSiteXPos = 0;
 return s;
}

it('brakes immediately when the distance-over-three target exceeds the one-engine stopping envelope', () => {
 const s = singleEngineDescent();
 finalDescentStageController(s, 1/120);
 expect(s.vehicle.throttle).toBeGreaterThan(95);
});

it('keeps the intro callback on its existing descent law', () => {
 const s = singleEngineDescent();
 finalDescentStageController(s, 1/120,-20, () => {});
 expect(s.vehicle.throttle).toBe(C.throttleLowerLimit);
});

it('refreshes the braking demand when two engines are lost during final descent', () => {
 const s = singleEngineDescent();
 s.engines.running[1] = s.engines.running[2] = true;
 s.engines.failed[1] = s.engines.failed[2] = false;
 finalDescentStageController(s, 1/120);
 expect(s.vehicle.throttle).toBe(C.throttleLowerLimit);
 s.engines.running[1] = s.engines.running[2] = false;
 s.engines.failed[1] = s.engines.failed[2] = true;
 finalDescentStageController(s, 1/120);
 expect(s.vehicle.throttle).toBeGreaterThan(95);
});
