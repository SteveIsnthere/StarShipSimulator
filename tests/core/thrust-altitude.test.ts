/**
 * M11.2, Fidelity — thrust depends on the air around the nozzle.
 *
 * Up to M11.2 a Raptor made 2.2 MN at every altitude. It now makes what a
 * sea-level-nozzle Raptor 2 makes: 230 tf at 327 s on the pad, and the same
 * mass flow buying 350 s in vacuum. The anchors are the two public Isp figures,
 * and everything else is derived from them and from a constant mass flow —
 * which is how a real engine works, and which the physics then checks: the
 * derived effective exit area comes out within 18% of the geometric one.
 *
 * Every assertion names its reference. Tolerances are derived, and most are
 * exact: the model is a few multiplications on published numbers.
 */
import { describe, expect, it } from 'vitest';
import * as C from '$core/constants';
import {
  getFuelFlowRate,
  getOffAxisThrustDifference,
  getThrust,
  getTotalMaxThrust,
  getTotalMinThrust,
} from '$core/physics/engines';
import { updateAtmosphere } from '$core/physics/atmosphere';
import { G0, P0_PASCAL } from '$core/physics/isa';
import { createScenarioState, ALL_SCENARIOS } from '$core/scenarios';
import { step } from '$core/step';

const ALL = [true, true, true] as const;
const SEA_LEVEL_KPA = C.SEA_LEVEL_PRESSURE_PA / 1000;
const TONNE_FORCE = 1000 * C.standardGravity;

describe('the anchors are the public Raptor 2 figures for the sea-level nozzle', () => {
  it('230 tf and 327 s at sea level, 350 s in vacuum', () => {
    // SpaceX's published Raptor 2 numbers. Not RVac's 258 tf / 380 s, which is
    // a different engine — see constants.ts for why that matters.
    expect(C.RAPTOR_THRUST_SEA_LEVEL / TONNE_FORCE).toBe(230);
    expect(C.RAPTOR_ISP_SEA_LEVEL).toBe(327);
    expect(C.RAPTOR_ISP_VACUUM).toBe(350);
  });

  it('g0 and p0 are the ISA definitions exactly, and the ISA reads the same two constants', () => {
    // Isp is defined against g0, and the pad thrust reproduces the 230 tf
    // anchor only because the atmosphere model and the thrust curve agree on
    // what sea level is. One definition each, in constants.ts.
    expect(C.standardGravity).toBe(9.80665);
    expect(C.SEA_LEVEL_PRESSURE_PA).toBe(101_325);
    expect(G0).toBe(C.standardGravity);
    expect(P0_PASCAL).toBe(C.SEA_LEVEL_PRESSURE_PA);
    expect(updateAtmosphere(0).airPressure * 1000).toBeCloseTo(C.SEA_LEVEL_PRESSURE_PA, 6);
  });
});

describe('the derived quantities follow from the anchors and a constant mass flow', () => {
  it('mass flow is thrust over Isp over g0, at sea level', () => {
    // Exact: it is the definition of specific impulse rearranged.
    expect(C.RAPTOR_MASS_FLOW).toBe(
      C.RAPTOR_THRUST_SEA_LEVEL / (C.RAPTOR_ISP_SEA_LEVEL * C.standardGravity),
    );
    // 703 kg/s, not the 650 the constant model carried (which implied 345 s).
    expect(C.RAPTOR_MASS_FLOW).toBeCloseTo(703.4, 0);
  });

  it('vacuum thrust is the same mass flow at the vacuum Isp — a 7.0% gain', () => {
    expect(C.RAPTOR_THRUST_VACUUM).toBe(
      C.RAPTOR_MASS_FLOW * C.standardGravity * C.RAPTOR_ISP_VACUUM,
    );
    // The ratio of thrusts IS the ratio of Isps under constant mass flow, so
    // this is 350/327 to rounding, and it is 7.0%, not the 12% RVac implies.
    expect(C.RAPTOR_THRUST_VACUUM / C.RAPTOR_THRUST_SEA_LEVEL).toBeCloseTo(350 / 327, 12);
    expect(C.RAPTOR_THRUST_VACUUM / TONNE_FORCE).toBeCloseTo(246.2, 1);
  });

  it('the effective exit area is within a fifth of the geometric one', () => {
    // THE CONSISTENCY CHECK. The slope of thrust against pressure is an area,
    // and it should resemble the bell's real exit area for a mildly
    // overexpanded sea-level nozzle. It does: 1.566 m^2 against pi*0.65^2 =
    // 1.327 m^2 for the 1.3 m bell the view already carries. Anchoring on the
    // RVac thrust instead gives 2.71 m^2 — twice the geometry, which is the
    // number that exposed the plan's mistake. 20% is the bound because the
    // geometric figure is itself approximate (the bell is not a flat disc).
    const geometric = Math.PI * 0.65 ** 2;
    expect(C.RAPTOR_EFFECTIVE_EXIT_AREA).toBeCloseTo(1.566, 3);
    expect(C.RAPTOR_EFFECTIVE_EXIT_AREA / geometric).toBeGreaterThan(1);
    expect(C.RAPTOR_EFFECTIVE_EXIT_AREA / geometric).toBeLessThan(1.2);
  });
});

describe('thrustPerRaptorAt — the curve', () => {
  it('reproduces both anchors exactly', () => {
    // At sea-level pressure the linear model returns the sea-level anchor by
    // construction: T_vac - p_sl * (T_vac - T_sl)/p_sl. Rounding only.
    expect(C.thrustPerRaptorAt(SEA_LEVEL_KPA)).toBeCloseTo(C.RAPTOR_THRUST_SEA_LEVEL, 6);
    expect(C.thrustPerRaptorAt(0)).toBe(C.RAPTOR_THRUST_VACUUM);
  });

  it('rises monotonically as the air thins', () => {
    let last = -Infinity;
    for (const kPa of [101.325, 80, 50, 26.5, 10, 1.2, 0.1, 0.001, 0]) {
      const t = C.thrustPerRaptorAt(kPa);
      expect(t, `${kPa} kPa`).toBeGreaterThan(last);
      last = t;
    }
  });

  it('is linear in pressure, with the effective area as its slope', () => {
    // d(thrust)/d(pressure) is -A_eff, in N/Pa. Exact to rounding.
    const a = C.thrustPerRaptorAt(60);
    const b = C.thrustPerRaptorAt(20);
    expect((a - b) / ((20 - 60) * 1000)).toBeCloseTo(C.RAPTOR_EFFECTIVE_EXIT_AREA, 9);
  });

  it('at the domain edges: negative pressure is vacuum, absurd pressure never goes negative', () => {
    // M10.4 discipline. Altitude is never negative so neither is pressure, but
    // a clamp is cheap and a negative thrust would be a silent sign flip.
    expect(C.thrustPerRaptorAt(-5)).toBe(C.RAPTOR_THRUST_VACUUM);
    expect(C.thrustPerRaptorAt(1e9)).toBe(0);
    // NaN propagates rather than being invented into a number.
    expect(C.thrustPerRaptorAt(NaN)).toBeNaN();
  });

  it('follows the real atmosphere: 74% of the gain is in by 10 km, 99% by 30 km', () => {
    // Where the thrust actually arrives on an ascent, from the ISA the
    // simulation flies through. Most of it comes early, because most of the
    // air is low: at 10 km the pressure is 26.5 kPa and thrust is up 5.2% on
    // the pad, which is 74% of the 7.0% total; by 30 km the pressure is 1.2%
    // of sea level and 99% of the gain is in.
    const gain = (alt: number) =>
      (C.thrustPerRaptorAt(updateAtmosphere(alt).airPressure) - C.RAPTOR_THRUST_SEA_LEVEL) /
      (C.RAPTOR_THRUST_VACUUM - C.RAPTOR_THRUST_SEA_LEVEL);
    expect(gain(0)).toBeCloseTo(0, 6);
    expect(gain(10_000)).toBeGreaterThan(0.73);
    expect(gain(30_000)).toBeGreaterThan(0.98);
    expect(gain(100_000)).toBeGreaterThan(0.9999);
  });
});

describe('the engine model threads the pressure through', () => {
  it('total max, min and throttled thrust all scale with it', () => {
    const sl = getTotalMaxThrust(ALL, SEA_LEVEL_KPA);
    const vac = getTotalMaxThrust(ALL, 0);
    expect(vac / sl).toBeCloseTo(350 / 327, 9);
    expect(getTotalMinThrust(ALL, 0)).toBeCloseTo(vac * C.throttleLowerLimit * 0.01, 6);
    expect(getThrust(ALL, 50, 0)).toBeCloseTo(vac * 0.5, 6);
  });

  it('off-axis thrust difference scales with it too — an asymmetric engine set pushes harder up high', () => {
    const one = [true, false, false] as const;
    const sl = getOffAxisThrustDifference(one, 100, SEA_LEVEL_KPA);
    const vac = getOffAxisThrustDifference(one, 100, 0);
    expect(Math.abs(vac / sl)).toBeCloseTo(350 / 327, 9);
  });

  it('but mass flow does NOT — it is set by the pumps, not the altitude', () => {
    // The whole model rests on this: the same kilograms per second at every
    // altitude, buying more thrust as the air thins. getFuelFlowRate takes no
    // pressure and there is no version that does.
    expect(getFuelFlowRate(ALL, 100)).toBe(3 * C.RAPTOR_MASS_FLOW);
    expect(getFuelFlowRate.length).toBe(2);
  });

  it('so specific impulse, derived, is 327 s on the pad and 350 s in vacuum', () => {
    // Isp = T / (m_dot * g0), computed from what the model returns rather than
    // from the constants it was built from, so a drift between the two shows.
    const isp = (kPa: number) =>
      getThrust(ALL, 100, kPa) / (getFuelFlowRate(ALL, 100) * C.standardGravity);
    expect(isp(SEA_LEVEL_KPA)).toBeCloseTo(327, 6);
    expect(isp(0)).toBeCloseTo(350, 9);
  });
});

describe('flown: an ascent gains thrust it did not have before', () => {
  it('the launch-pad scenario at full throttle makes 7% more thrust at 30 km than on the pad', () => {
    // The claim the milestone makes, observed on the real step rather than on
    // the model in isolation: the same engines, the same throttle, and the
    // recorded `forces.thrust` grows with altitude by the stated amount.
    const st = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'launch-pad')!);
    st.engines.running = [true, true, true];
    st.vehicle.throttle = 100;
    st.vehicle.throttleCurrent = 100;

    const onPad = step(st, 1 / 120);
    const padThrust = onPad.forces.thrust;
    // The pad is the vehicle's half-height above sea level, so the step saw a
    // pressure a hair under 101.325 kPa: the thrust is what the curve gives at
    // THAT pressure exactly, and within 0.1% of the sea-level anchor.
    expect(padThrust).toBeCloseTo(3 * C.thrustPerRaptorAt(onPad.atmosphere.airPressure), 6);
    expect(padThrust / (3 * C.RAPTOR_THRUST_SEA_LEVEL)).toBeCloseTo(1, 3);

    // Teleport the same state to 30 km and take one step: the only thing that
    // changed is the air.
    const high = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'launch-pad')!);
    high.engines.running = [true, true, true];
    high.vehicle.throttle = 100;
    high.vehicle.throttleCurrent = 100;
    high.kinematics.altitude = 30_000;
    const upHigh = step(high, 1 / 120);
    expect(upHigh.forces.thrust / padThrust).toBeGreaterThan(1.068);
    expect(upHigh.forces.thrust / padThrust).toBeLessThan(350 / 327 + 1e-9);
  });
});
