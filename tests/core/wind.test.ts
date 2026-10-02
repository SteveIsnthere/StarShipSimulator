/**
 * M11.1, Fidelity — the air acts through the relative wind.
 *
 * `world.wind` and `world.gust` were in SimState from the first port and read
 * by nothing; every aerodynamic quantity used groundspeed. These tests pin what
 * the wiring means physically, through its CONSEQUENCES — the forces, the
 * angles, the Mach number — because the airspeed itself is a step-local and is
 * deliberately not stored. They are about direction and monotonicity rather
 * than exact numbers; the exact numbers are the golden fixture's job
 * (`landing-burn-headwind`).
 *
 * Sign convention, stated once: `speedX` is downrange, and `wind` is the air's
 * downrange velocity. The relative wind is `speedX - wind`. So a POSITIVE wind
 * on a vehicle moving downrange is a tailwind (less airspeed) and on a vehicle
 * moving uprange it is a headwind (more).
 *
 * ON THE STEP ORDER. Forces in a step are computed from the airspeed of the
 * speeds the step RECEIVES, and `machSpeed` from the speeds it produces (which,
 * since M11.3, those forces have already acted on). Every comparison below
 * builds two states that differ only in wind, steps each once, and reads the
 * result; one step is enough because the incoming speeds are the ones set by
 * hand.
 */
import { describe, expect, it } from 'vitest';
import { getReentryHeatPower } from '$core/physics/thermal';
import * as C from '$core/constants';
import { relativeAirspeed, relativeWindAngle } from '$core/physics/aero';
import { meanWindAt } from '$core/physics/wind';
import { createInitialState, type SimState } from '$core/state';
import { step } from '$core/step';

const DT = 1 / 120;

/** A vehicle in dense air with no thrust, so only aerodynamics act on it. */
function gliding(speedX: number, speedY: number, wind = 0, gust = 0): SimState {
  const s = createInitialState();
  s.kinematics.altitude = 2_000;
  s.kinematics.speedX = speedX;
  s.kinematics.speedY = speedY;
  // A hand-built state carries a consistent ground figure, as a scenario does.
  s.kinematics.trueSpeed = Math.sqrt(speedX ** 2 + speedY ** 2);
  s.world.wind = wind;
  s.world.gust = gust;
  s.engines.running = [false, false, false, false, false, false];
  s.vehicle.throttle = 0;
  s.vehicle.throttleCurrent = 0;
  s.status.translationModeOn = false;
  return s;
}

describe('the helpers are the ground expressions applied to the relative wind', () => {
  it('reduce to the ground figures, bit for bit, when the air is still', () => {
    // The whole no-op-at-zero-wind argument rests on this: `x - 0 - 0` is `x`
    // exactly, so the same sqrt and atan2 see the same operands.
    for (const [x, y] of [
      [120, -40],
      [0, -80],
      [7300, -30],
      [-0, 0],
      [1e-300, -1e-300],
    ] as const) {
      expect(relativeAirspeed(x, y, 0, 0)).toBe(Math.sqrt(x ** 2 + y ** 2));
      expect(relativeWindAngle(x, y, 0, 0)).toBe(Math.atan2(x, y));
    }
  });

  it("subtract the air's velocity component by component", () => {
    // Phase 6 Task 10: the air is a vector, the mean wind plus the gusts
    // downrange and the vertical gust up (physics/wind.ts).
    expect(relativeAirspeed(100, -20, 15, 3)).toBe(Math.sqrt((100 - 15) ** 2 + (-20 - 3) ** 2));
    expect(relativeWindAngle(100, -20, 15, 3)).toBe(Math.atan2(85, -23));
  });
});

describe('airspeed is the speed through the air, not over the ground', () => {
  it('a tailwind lowers dynamic pressure and a headwind raises it', () => {
    const still = step(gliding(120, -40), DT);
    const tail = step(gliding(120, -40, +30), DT);
    const head = step(gliding(120, -40, -30), DT);
    expect(tail.forces.dynamicPressure).toBeLessThan(still.forces.dynamicPressure);
    expect(head.forces.dynamicPressure).toBeGreaterThan(still.forces.dynamicPressure);
    // And the wind reaches the ground track only through the air: the drag
    // it changes acts within the step (M11.3), so a tailwind leaves more
    // groundspeed than still air and a headwind less — by a few thousandths
    // of a metre per second in one step, in the right direction.
    expect(tail.kinematics.trueSpeed).toBeGreaterThan(still.kinematics.trueSpeed);
    expect(head.kinematics.trueSpeed).toBeLessThan(still.kinematics.trueSpeed);
  });

  it('a hovering vehicle in a wind still feels air moving past it', () => {
    // The classic check that the wind is real: with no ground motion at all
    // the aerodynamics would be silent — yet 25 m/s of air is moving past the
    // vehicle, and it must produce dynamic pressure, drag and heating.
    const s = step(gliding(0, 0, 25), DT);
    expect(s.forces.dynamicPressure).toBeGreaterThan(0);
    expect(s.forces.aerodynamicDrag).toBeGreaterThan(0);
    expect(s.forces.thermalPower).toBeGreaterThan(0);
    // Exactly what that air gives: q = rho * v^2 * 0.0005, with v the 25 m/s
    // surface wind carried up the profile to the glider's 2 km.
    const v = meanWindAt(25, 2_000);
    const q = s.atmosphere.airDensity * v ** 2 * 0.0005;
    expect(s.forces.dynamicPressure).toBe(q);
  });

  it('is q, drag and heating from the same one airspeed', () => {
    // The three read the same incoming airspeed, so their ratios across two
    // runs that differ only in wind are v^2, v^2 and v^3 of the same v.
    const a = step(gliding(200, -100, 0), DT);
    const b = step(gliding(200, -100, -60), DT);
    const v = relativeAirspeed(200, -100, meanWindAt(-60, 2_000), 0) / relativeAirspeed(200, -100, 0, 0);
    expect(b.forces.dynamicPressure / a.forces.dynamicPressure).toBeCloseTo(v ** 2, 9);
    expect(b.forces.aerodynamicDrag / a.forces.aerodynamicDrag).toBeCloseTo(v ** 2, 9);
    // Heating also reads the attitude to the air (Phase 6: a cylinder's
    // stagnation line takes 1/sqrt(2) of a sphere's flux), and the wind turns
    // that; divided out, the flux is the cube of the same airspeed.
    const shape = (st: typeof a) => getReentryHeatPower(1, 1, 1, st.kinematics.angleInToTheWind);
    expect(b.forces.thermalPower / shape(b) / (a.forces.thermalPower / shape(a))).toBeCloseTo(v ** 3, 9);
  });

  it('Mach is relative to the air', () => {
    // machSpeed is written from the speeds the step PRODUCES, and drag has
    // already slowed the headwind run more by then — so the ratio is not
    // 400/300, and this asserts against the relative airspeeds of the produced
    // speeds rather than a number assumed from the inputs.
    const still = step(gliding(300, 0), DT);
    const head = step(gliding(300, 0, -100), DT);
    const vs = relativeAirspeed(still.kinematics.speedX, still.kinematics.speedY, 0, 0);
    const vh = relativeAirspeed(
      head.kinematics.speedX,
      head.kinematics.speedY,
      meanWindAt(-100, head.kinematics.altitude),
      0,
    );
    expect(head.kinematics.machSpeed).toBeGreaterThan(still.kinematics.machSpeed);
    expect(head.kinematics.machSpeed / still.kinematics.machSpeed).toBeCloseTo(vh / vs, 9);
  });
});

describe('the aerodynamic angles follow the relative wind', () => {
  it('a crosswind on a vertical descent tilts the angle of attack, and not the ground track', () => {
    // Descending straight down with the nose up: over the ground the motion is
    // purely vertical. Add a horizontal wind and the air arrives from the side
    // as well, so the angle of attack — measured from the relative wind —
    // changes, while the guidance angle — measured over the ground — does not.
    const still = step(gliding(0, -80), DT);
    const cross = step(gliding(0, -80, 20), DT);
    expect(cross.kinematics.angleOfMotion, 'ground track unchanged').toBe(
      still.kinematics.angleOfMotion,
    );
    expect(cross.kinematics.angleOfAttack).not.toBe(still.kinematics.angleOfAttack);
    expect(cross.kinematics.angleInToTheWind).not.toBe(still.kinematics.angleInToTheWind);
  });

  it('and so does the direction the drag acts in', () => {
    // Drag opposes the RELATIVE wind. A pure vertical descent in still air has
    // no horizontal drag component at all; in a crosswind it must — that is the
    // decomposition taking the relative-wind angle, and it is what pushes a
    // descending vehicle downwind.
    // (A turning ground adds its Coriolis term, -2 omega v_r, to both alike:
    // Phase 6 Task 9. It is the whole of the still-air figure.)
    const still = step(gliding(0, -80), DT);
    const cross = step(gliding(0, -80, 20), DT);
    const coriolis = -2 * C.frameRotationRate * still.kinematics.speedY;
    expect(Math.abs(still.kinematics.accelerationX - coriolis)).toBeLessThan(1e-6);
    expect(Math.abs(cross.kinematics.accelerationX - still.kinematics.accelerationX)).toBeGreaterThan(0.01);
  });
});

describe('what the wind does NOT touch', () => {
  it('the touchdown check reads groundspeed', () => {
    // A vehicle settling onto the pad in a 30 m/s wind must land on its ground
    // motion, not be judged to be moving at 30 m/s sideways because the air is.
    const s = createInitialState();
    s.kinematics.altitude = C.vehicleHeight * 0.5 - 0.01;
    s.kinematics.speedX = 0;
    s.kinematics.speedY = -1;
    s.kinematics.trueSpeed = 1;
    s.world.wind = 30;
    s.engines.running = [false, false, false, false, false, false];
    const after = step(s, DT);
    expect(after.status.landed).toBe(true);
    expect(after.failures.crashed).toBe(false);
  });

  it('the guidance angle is the ground track', () => {
    // `angleOfMotion` is what the autopilot steers by. It must not swing with
    // the wind, or a gust would re-aim the vehicle.
    const still = step(gliding(60, -60), DT);
    const windy = step(gliding(60, -60, 35), DT);
    expect(windy.kinematics.angleOfMotion).toBe(still.kinematics.angleOfMotion);
  });
});
