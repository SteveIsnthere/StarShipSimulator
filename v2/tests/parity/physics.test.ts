/**
 * M1.3 acceptance: spot-check parity vs legacy at sampled states.
 *
 * Every function ported in M1.3 is called with the same inputs on both sides —
 * the TypeScript port, and the real backend/physics.js executing in a VM — and
 * the results compared with Object.is. Not toBeCloseTo: a port that is merely
 * close has already lost, because the goldens in M1.8 are exact.
 *
 * Sampling is deterministic and covers the awkward places on purpose: quadrant
 * boundaries, the 11 km atmosphere branch, the lift curve's five segments, and
 * the Mach 10 drag cap.
 */
import { describe, expect, it } from 'vitest';
import { loadLegacy, toLegacyKeys, toLegacyName, toLegacySource } from './legacy';
import { runInContext } from 'node:vm';
import * as aero from '$core/physics/aero';
import * as components from '$core/physics/components';
import { isaAtmosphere } from '$core/physics/isa';
import { legacyAtmosphere, updateAtmosphere, upperStrato } from '$core/physics/atmosphere';
import { getReentryHeatPower } from '$core/physics/thermal';
import { rad, type Rad } from '$core/units';

const legacy = loadLegacy();

/** Set legacy globals, evaluate an expression in that context, return it. */
function callLegacy(globals: Record<string, unknown>, expression: string): unknown {
  for (const [k, v] of Object.entries(toLegacyKeys(globals))) {
    (legacy as Record<string, unknown>)[k] = v;
  }
  return runInContext(toLegacySource(expression), legacy as never, { filename: '<parity>' });
}

/** Read a legacy global by its v2 name, translating through the rename table. */
function readLegacy(name: string): unknown {
  return (legacy as unknown as Record<string, unknown>)[toLegacyName(name)];
}

const exact = (mine: unknown, theirs: unknown, label: string) =>
  expect(Object.is(mine, theirs), `${label}: ours=${String(mine)} legacy=${String(theirs)}`).toBe(
    true,
  );

/**
 * Like `exact`, but tolerant of +0 vs -0 — and only where that difference is an
 * artefact of the comparison rather than of the port.
 *
 * The six ladders are nested closures with no export, so the only way to reach
 * one is through its enclosing function with the other contributions zeroed.
 * That enclosing function *adds*: `drag + thrust + lift`. IEEE addition maps
 * `0 + (-0)` to `+0`, so a ladder that correctly returns -0 (e.g. horizontal
 * lift at angleOfMotion = pi/2, where it is `-sin(0)`) comes back as +0 through
 * the sum. Nothing downstream can observe the difference, because every
 * consumer of these coefficients reaches them through the same addition — which
 * the `composed accelerations` block below checks with full `Object.is`.
 */
const exactModuloSignedZero = (mine: number, theirs: unknown, label: string) =>
  expect(Object.is(mine + 0, theirs), `${label}: ours=${String(mine)} legacy=${String(theirs)}`)
    .toBe(true);

/** A deterministic spread of angles including every quadrant boundary. */
const ANGLES: Rad[] = (() => {
  const boundaries = [
    0,
    Math.PI / 2,
    -Math.PI / 2,
    Math.PI,
    -Math.PI,
    Number.EPSILON,
    -Number.EPSILON,
    Math.PI / 2 - 1e-12,
    Math.PI / 2 + 1e-12,
    -Math.PI / 2 - 1e-12,
    -Math.PI / 2 + 1e-12,
  ];
  const swept = Array.from({ length: 201 }, (_, i) => -Math.PI + (i * (2 * Math.PI)) / 200);
  return [...boundaries, ...swept].map(rad);
})();

/**
 * Altitudes where the port must still match 2021 exactly.
 *
 * Capped below 25 km. M2.1 deliberately diverges above the stratopause: the
 * 2021 dispatcher never reached `upperStrato`, so it extended the
 * lower-stratosphere isotherm to infinity. That divergence is the bug fix, and
 * it is asserted as a difference in the block at the bottom of this file rather
 * than smuggled in by widening a tolerance here.
 */
const ALTITUDES = [
  0, 1, 100, 1000, 5000, 10_999, 10_999.999, 11_000, 11_000.001, 12_000, 20_000, 24_999,
];

const SPEEDS = [0, 1, 50, 250, 343, 1000, 3000, 7800];

// ---------------------------------------------------------------------------

describe('atmosphere — the ported 2021 model', () => {
  // `legacyAtmosphere` is that model: 2021's dispatcher with M2.1's third
  // branch wired in and its lapse coefficient corrected. Since M2.10 it is not
  // what the vehicle flies through — see the departure block below — but it is
  // still the thing 2021 parity is a claim about.
  it.each(ALTITUDES)('legacyAtmosphere at %d m', (altitude) => {
    const mine = legacyAtmosphere(altitude);
    callLegacy({ altitude }, 'updateAtmosphere()');
    exact(mine.airTemperature, readLegacy('airTemperature'), 'airTemperature');
    exact(mine.airPressure, readLegacy('airPressure'), 'airPressure');
    exact(mine.airDensity, readLegacy('airDensity'), 'airDensity');
  });

  it('branches at exactly 11 km, as the legacy `< 11000` does', () => {
    // The boundary itself takes the stratosphere branch.
    expect(legacyAtmosphere(10_999.999).airTemperature).toBeCloseTo(15.04 - 0.00649 * 10_999.999, 9);
    expect(legacyAtmosphere(11_000).airTemperature).toBe(-56.46);
  });

  it('above 25 km the port deliberately differs — this is M2.1', () => {
    // The 2021 dispatcher had no third branch, so it returned the 11 km
    // isotherm at every altitude above it, forever. Asserted as an explicit
    // divergence so the bug fix cannot be mistaken for a port regression.
    for (const altitude of [25_000, 30_000, 50_000, 80_000]) {
      callLegacy({ altitude }, 'updateAtmosphere()');
      const legacyTemperature = legacy['airTemperature'];
      const ours = legacyAtmosphere(altitude);

      expect(legacyTemperature, `2021 at ${altitude} m`).toBe(-56.46);
      expect(ours.airTemperature).toBe(upperStrato(altitude).airTemperature);
      if (altitude > 25_000) {
        expect(ours.airTemperature, `v2 at ${altitude} m`).not.toBe(-56.46);
      }
    }
  });

  it('the fix makes high air much denser, and mid air slightly thinner', () => {
    // Measured, because the shape of this change is not what one would guess.
    // The 2021 isotherm and the upper-stratosphere layer CROSS at about
    // 39.5 km: below that the fix makes the air marginally thinner (down to
    // 0.94x at 30 km), above it much denser, reaching 5.1x at 80 km and 7.3x
    // at 86 km where the model's validity ends.
    //
    // The re-entry regime is entirely above the crossover, which is why the
    // Re-entry preset is the scenario this bug fix transforms.
    const isotherm = (h: number) =>
      (22.65 * Math.E ** (1.73 - 0.000157 * h)) / (0.2869 * (-56.46 + 273.1));
    const ratio = (h: number) => legacyAtmosphere(h).airDensity / isotherm(h);

    expect(ratio(25_000)).toBeCloseTo(0.984, 2);
    expect(ratio(30_000)).toBeCloseTo(0.944, 2);
    expect(ratio(35_000)).toBeLessThan(1);
    expect(ratio(40_000)).toBeGreaterThan(1);
    expect(ratio(50_000)).toBeCloseTo(1.268, 2);
    expect(ratio(80_000)).toBeCloseTo(5.066, 2);

    // The crossover itself, located rather than assumed.
    let crossover = 0;
    for (let h = 25_000; h <= 86_000; h += 100) {
      if (ratio(h) > 1) {
        crossover = h;
        break;
      }
    }
    expect(crossover).toBe(39_500);
  });

  it('the fixed lapse coefficient is 0.00299, not the 2021 file\'s 0.0299', () => {
    // The transcription error, pinned. At 25 km the correct value reproduces
    // the lower stratosphere's isotherm exactly, which is the evidence.
    expect(upperStrato(25_000).airTemperature).toBeCloseTo(-56.46, 9);
    expect(upperStrato(50_000).airTemperature).toBeCloseTo(-131.21 + 0.00299 * 50_000, 9);
    // The 2021 spelling would have given +616 C at the stratopause.
    expect(-131.21 + 0.0299 * 25_000).toBeCloseTo(616.29, 2);
  });
});

describe('DECLARED DEPARTURE: the atmosphere the vehicle flies through', () => {
  // M2.10, Fidelity. `updateAtmosphere` — the function step() calls — is the
  // ISA now. The three-layer model above is kept under `legacyAtmosphere` and
  // is what the parity assertions compare against; nothing in the flight path
  // calls it. Pinned to the exact replacement rather than described.
  it('updateAtmosphere IS isaAtmosphere, at every altitude sampled', () => {
    for (const altitude of [...ALTITUDES, 30_000, 47_000, 70_000, 86_000, 120_000]) {
      expect(updateAtmosphere(altitude), `${altitude} m`).toEqual(isaAtmosphere(altitude));
    }
  });

  it('and differs from the 2021 model by a factor that grows with altitude', () => {
    // Measured. Below the tropopause the two agree to a few percent; the
    // mesosphere is where the three-layer model stops meaning anything.
    const ratio = (h: number) => isaAtmosphere(h).airDensity / legacyAtmosphere(h).airDensity;
    expect(Math.abs(ratio(0) - 1)).toBeLessThan(0.05);
    expect(Math.abs(ratio(10_000) - 1)).toBeLessThan(0.05);
    expect(Math.abs(ratio(70_000) - 1)).toBeGreaterThan(0.15);
    expect(Math.abs(ratio(84_000) - 1)).toBeGreaterThan(0.4);
  });
});

describe('thermal', () => {
  it.each(SPEEDS)('getReentryHeatPower at %d m/s', (trueSpeed) => {
    for (const airDensity of [0, 1.225, 0.4, 1e-5]) {
      for (const noseRadius of [4.5, 100]) {
        const mine = getReentryHeatPower(trueSpeed, airDensity, noseRadius);
        const theirs = callLegacy(
          { trueSpeed, airDensity },
          `getReentryHeatPower(${noseRadius})`,
        );
        exact(mine, theirs, `heat v=${trueSpeed} rho=${airDensity} R=${noseRadius}`);
      }
    }
  });
});

describe('aero scalars', () => {
  it.each(SPEEDS)('getDynamicPressure at %d m/s', (trueSpeed) => {
    for (const airDensity of [0, 1.225, 0.02]) {
      const mine = aero.getDynamicPressure(airDensity, trueSpeed);
      const theirs = callLegacy({ airDensity, trueSpeed }, 'getDynamicPressure()');
      exact(mine, theirs, `q rho=${airDensity} v=${trueSpeed}`);
    }
  });

  it('getDrag matches over a wide deterministic sample', () => {
    // Tested directly, not only through the fin functions. Multiplication is
    // commutative in IEEE but not associative, so a reordered chain like
    // `0.5 * Cd * A * rho * v * v` can differ in the last bit from
    // `1/2 * rho * v**2 * Cd * A`. A handful of round numbers will not show
    // that; a wide spread of awkward mantissas will.
    let state = 0x2545f491;
    const next = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };

    let checked = 0;
    for (let i = 0; i < 2000; i++) {
      const airDensity = next() * 1.3;
      const trueSpeed = next() * 8000;
      const crossSectionArea = next() * 600 + 0.1;
      const dragCoefficient = next() * 3 + 0.1;
      const mine = aero.getDrag(airDensity, trueSpeed, crossSectionArea, dragCoefficient);
      const theirs = callLegacy(
        { airDensity, trueSpeed },
        `getDrag(${crossSectionArea}, ${dragCoefficient})`,
      );
      exact(mine, theirs, `drag #${i}`);
      checked += 1;
    }
    expect(checked).toBe(2000);
  });

  it('getLift matches over a wide deterministic sample', () => {
    let state = 0x9e3779b9;
    const next = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let i = 0; i < 2000; i++) {
      const airDensity = next() * 1.3;
      const trueSpeed = next() * 8000;
      const angleInToTheWind = rad((next() * 2 - 1) * Math.PI);
      const wingArea = next() * 600 + 0.1;
      const mine = aero.getLift(airDensity, trueSpeed, angleInToTheWind, wingArea);
      const theirs = callLegacy(
        { airDensity, trueSpeed, angleInToTheWind },
        `getLift(${wingArea})`,
      );
      exact(mine, theirs, `lift #${i}`);
    }
  });

  it.each([0, 0.5, 1, 5, 9.999, 10, 10.001, 25])('getBodyDragCoefficient at Mach %d', (machSpeed) => {
    const mine = aero.getBodyDragCoefficient(machSpeed);
    const theirs = callLegacy({ machSpeed }, 'getBodyDragCoefficient()');
    exact(mine, theirs, `bdc M=${machSpeed}`);
  });

  it('getLiftCoefficient across all five segments', () => {
    const probes = [0, 0.1, 0.34, 0.35, 0.4, 0.46, 0.47, 0.5, 0.52, 0.9, 1.47, 1.48, 2, Math.PI];
    for (const a of [...probes, ...probes.map((x) => -x)]) {
      const mine = aero.getLiftCoefficient(rad(a));
      const theirs = callLegacy(
        { airDensity: 1, trueSpeed: 1, angleInToTheWind: a },
        // getLiftCoefficient is nested inside getLift; recover it via the identity
        // lift = Cl * rho * v^2 * A * 0.5 with rho=v=1, A=2  =>  lift === Cl.
        'getLift(2)',
      );
      exact(mine, theirs, `Cl(${a})`);
    }
  });
});

describe('aero geometry', () => {
  it.each(ANGLES.slice(0, 40))('getCrossSectionalArea at %f rad', (angleInToTheWind) => {
    for (const vehicleInFlightMaxArea of [450, 500.3]) {
      const mine = aero.getCrossSectionalArea(angleInToTheWind, vehicleInFlightMaxArea);
      const theirs = callLegacy(
        { angleInToTheWind, vehicleInFlightMaxArea },
        'getCrossSectionalArea()',
      );
      exact(mine, theirs, `cSA(${angleInToTheWind}, ${vehicleInFlightMaxArea})`);
    }
  });

  it('getAngleOfMotion matches atan2(speedX, speedY)', () => {
    for (const speedX of [-100, -1, 0, 1, 100]) {
      for (const speedY of [-100, -1, 0, 1, 100]) {
        const mine = aero.getAngleOfMotion(speedX, speedY);
        callLegacy({ speedX, speedY }, 'updateAngleOfMotion()');
        exact(mine, readLegacy('angleOfMotion'), `aom(${speedX},${speedY})`);
      }
    }
  });

  it('getAttackAngles matches, including both wrap branches', () => {
    for (const pitch of ANGLES.slice(0, 60)) {
      for (const angleOfMotion of [rad(0), rad(1), rad(-1), rad(3), rad(-3)]) {
        const mine = aero.getAttackAngles(pitch, angleOfMotion);
        callLegacy({ pitch, angleOfMotion }, 'updateAngleOfAttack()');
        exact(mine.angleOfAttack, readLegacy('angleOfAttack'), `aoa(${pitch},${angleOfMotion})`);
        exact(mine.angleInToTheWind, readLegacy('angleInToTheWind'), `aitw(${pitch},${angleOfMotion})`);
      }
    }
  });
});

describe('fins and angular drag', () => {
  it('getAngularDragAcceleration matches, both spin directions and zero', () => {
    for (const angularVelocity of [-2, -0.001, 0, 0.001, 2]) {
      for (const airDensity of [0, 1.225]) {
        const vehicleMomentOfInertia = 1.2e8;
        const mine = aero.getAngularDragAcceleration(
          airDensity,
          angularVelocity,
          vehicleMomentOfInertia,
        );
        const theirs = callLegacy(
          { airDensity, angularVelocity, vehicleMomentOfInertia },
          'getAngularDragAcceleration()',
        );
        exact(mine, theirs, `angDrag(w=${angularVelocity}, rho=${airDensity})`);
      }
    }
  });

  it('front and aft fin drag match, including the sign flip at aoa 0', () => {
    for (const angleOfAttack of [-1, -0.001, 0, 0.001, 1].map(rad)) {
      for (const angleInToTheWind of [-1, -0.2, 0, 0.2, 1].map(rad)) {
        const front = 0.42;
        const aft = 0.37;
        const g = { airDensity: 1.225, trueSpeed: 200, angleOfAttack, angleInToTheWind,
          frontFinEffectiveAreaFraction: front, aftFinEffectiveAreaFraction: aft };

        exact(
          aero.getFrontFinDrag(1.225, 200, angleOfAttack, angleInToTheWind, front),
          callLegacy(g, 'getFrontFinDrag()'),
          `frontFin(${angleOfAttack},${angleInToTheWind})`,
        );
        exact(
          aero.getAftFinDrag(1.225, 200, angleOfAttack, angleInToTheWind, aft),
          callLegacy(g, 'getAftFinDrag()'),
          `aftFin(${angleOfAttack},${angleInToTheWind})`,
        );
      }
    }
  });

  it('updateVehicleInFlightMaxArea matches', () => {
    for (const frontFinExtension of [0, 25, 50, 100]) {
      for (const aftFinExtension of [0, 25, 50, 100]) {
        const mine = aero.updateVehicleInFlightMaxArea(frontFinExtension, aftFinExtension);
        callLegacy({ frontFinExtension, aftFinExtension }, 'upDateVehicleInFlightMaxArea()');
        exact(mine.frontFinEffectiveAreaFraction, readLegacy('frontFinEffectiveAreaFraction'), 'front');
        exact(mine.aftFinEffectiveAreaFraction, readLegacy('aftFinEffectiveAreaFraction'), 'aft');
        exact(mine.totalFinSurfaceArea, readLegacy('totalFinSurfaceArea'), 'totalFin');
        exact(mine.vehicleInFlightMaxArea, readLegacy('vehicleInFlightMaxArea'), 'inFlightMaxArea');
      }
    }
  });
});

describe('the six quadrant ladders', () => {
  // These were M1.9's target. Since M2.10 the shipped coefficients are the
  // collapsed single expressions and these are the preserved 2021 copies —
  // `legacy*Coefficient` — so this block still asserts what it always did:
  // that the transcription of 2021's arithmetic is exact. The DEPARTURE block
  // below pins what the simulation uses instead.
  const LADDERS = [
    ['horizontalDrag', components.legacyHorizontalDragCoefficient],
    ['verticalDrag', components.legacyVerticalDragCoefficient],
    ['horizontalLift', components.legacyHorizontalLiftCoefficient],
    ['verticalLift', components.legacyVerticalLiftCoefficient],
    ['horizontalThrust', components.legacyHorizontalThrustCoefficient],
    ['verticalThrust', components.legacyVerticalThrustCoefficient],
  ] as const;

  it.each(LADDERS)('%s ladder matches at every sampled angle', (name, fn) => {
    // Recover each nested coefficient from its enclosing function by setting the
    // other two contributions to zero and the relevant acceleration to 1.
    const isThrust = name.endsWith('Thrust');
    const isLift = name.endsWith('Lift');
    const outer = name.startsWith('horizontal')
      ? 'getHorizontalAcceleration()'
      : 'getVerticalAcceleration()';

    for (const angle of ANGLES) {
      const mine = fn(angle);
      const theirs = callLegacy(
        {
          angleOfMotion: isThrust ? rad(0) : angle,
          gimbalPointingDirection: isThrust ? angle : rad(0),
          // aoa 0 keeps liftSignIsInverted false, so the coefficient passes through.
          angleOfAttack: rad(0),
          aerodynamicDragAcceleration: name.endsWith('Drag') ? 1 : 0,
          aerodynamicLiftAcceleration: isLift ? 1 : 0,
          thrustAcceleration: isThrust ? 1 : 0,
          gravity: 0,
        },
        outer,
      );
      exactModuloSignedZero(mine, theirs, `${name}(${angle})`);
    }
  });
});

describe('signed zero, made visible rather than swept away', () => {
  it('the horizontal lift ladder really does return -0 at pi/2', () => {
    // Documenting the exact case the helper above tolerates, so it is a known
    // property rather than a silently-passed comparison.
    expect(Object.is(components.legacyHorizontalLiftCoefficient(rad(Math.PI / 2)), -0)).toBe(true);
  });

  it('and the composition erases it, on both sides identically', () => {
    const inputs = {
      angleOfMotion: rad(Math.PI / 2),
      angleOfAttack: rad(0),
      gimbalPointingDirection: rad(0),
      aerodynamicDragAcceleration: 0,
      aerodynamicLiftAcceleration: 1,
      thrustAcceleration: 0,
    };
    const mine = legacyCompose(inputs).horizontal;
    const theirs = callLegacy({ ...inputs, gravity: 0 }, 'getHorizontalAcceleration()');
    expect(Object.is(mine, 0)).toBe(true);
    exact(mine, theirs, 'composed at pi/2');
    // The shipped composition lands on the same zero here: cos(pi/2) is not
    // exactly zero in doubles, but it is multiplied by an acceleration of 1 and
    // then added to two exact zeros, and the sign is what this test is about.
    expect(Object.is(components.getHorizontalAcceleration(inputs), -0)).toBe(false);
  });
});

/**
 * The 2021 composition, assembled from the preserved ladders.
 *
 * physics.js:99 and :175, with the summation order 2021 used (drag + thrust +
 * lift), so that comparing it against the VM is a comparison of arithmetic and
 * not of associativity.
 */
function legacyCompose(i: {
  angleOfMotion: Rad;
  angleOfAttack: Rad;
  gimbalPointingDirection: Rad;
  aerodynamicDragAcceleration: number;
  aerodynamicLiftAcceleration: number;
  thrustAcceleration: number;
}, gravity = 0): { horizontal: number; vertical: number } {
  const inverted = components.liftSignIsInverted(i.angleOfAttack);

  const hDrag = components.legacyHorizontalDragCoefficient(i.angleOfMotion) * i.aerodynamicDragAcceleration;
  const hLiftCoefficient = components.legacyHorizontalLiftCoefficient(i.angleOfMotion);
  const hLift = inverted
    ? -hLiftCoefficient * i.aerodynamicLiftAcceleration
    : hLiftCoefficient * i.aerodynamicLiftAcceleration;
  const hThrust =
    components.legacyHorizontalThrustCoefficient(i.gimbalPointingDirection) * i.thrustAcceleration;

  const vDrag = components.legacyVerticalDragCoefficient(i.angleOfMotion) * i.aerodynamicDragAcceleration;
  const vLiftCoefficient = components.legacyVerticalLiftCoefficient(i.angleOfMotion);
  const vLift = inverted
    ? -vLiftCoefficient * i.aerodynamicLiftAcceleration
    : vLiftCoefficient * i.aerodynamicLiftAcceleration;
  const vThrust =
    components.legacyVerticalThrustCoefficient(i.gimbalPointingDirection) * i.thrustAcceleration;

  return { horizontal: hDrag + hThrust + hLift, vertical: -gravity + vDrag + vThrust + vLift };
}

describe('composed accelerations', () => {
  /** The grid both blocks below walk. */
  const GRID = (() => {
    const out = [];
    for (const angleOfMotion of ANGLES.slice(0, 30)) {
      for (const angleOfAttack of [rad(-2), rad(-1), rad(0.3), rad(1), rad(2.5)]) {
        for (const gimbalPointingDirection of [rad(-0.2), rad(0), rad(0.2)]) {
          out.push({
            angleOfMotion,
            angleOfAttack,
            gimbalPointingDirection,
            aerodynamicDragAcceleration: 3.7,
            aerodynamicLiftAcceleration: 1.9,
            thrustAcceleration: 14.2,
          });
        }
      }
    }
    return out;
  })();

  it('the 2021 composition matches exactly, across a grid of realistic states', () => {
    let checked = 0;
    for (const inputs of GRID) {
      const globals = { ...inputs, gravity: 9.807 };
      const ours = legacyCompose(inputs, 9.807);
      exact(ours.horizontal, callLegacy(globals, 'getHorizontalAcceleration()'), 'hAcc');
      exact(ours.vertical, callLegacy(globals, 'getVerticalAcceleration()'), 'vAcc');
      checked += 2;
    }
    expect(checked).toBeGreaterThanOrEqual(900);
  });

  it('DECLARED DEPARTURE: the shipped composition is the collapsed one — M1.9/M2.10', () => {
    // It differs from 2021 in the last bit and nowhere else. Bound stated per
    // ULP of the value's own magnitude, which is what a 1-ULP claim means for a
    // sum of six terms: three coefficients, each within 1 ULP of the ladder's,
    // scaled by accelerations of order 10.
    let worstUlps = 0;
    let differing = 0;
    for (const inputs of GRID) {
      const ladder = legacyCompose(inputs, 9.807);
      const shipped = {
        horizontal: components.getHorizontalAcceleration(inputs),
        vertical: components.getVerticalAcceleration(inputs, 9.807),
      };
      for (const axis of ['horizontal', 'vertical'] as const) {
        const a = shipped[axis];
        const b = ladder[axis];
        if (!Object.is(a, b)) differing += 1;
        const ulp = Math.max(Math.abs(b), 1) * Number.EPSILON;
        worstUlps = Math.max(worstUlps, Math.abs(a - b) / ulp);
      }
    }
    // Real: some of the grid genuinely differs, so this is not vacuous.
    expect(differing, 'nothing differed — is the collapse actually shipped?').toBeGreaterThan(0);
    expect(worstUlps, `worst ${worstUlps.toFixed(2)} ULP`).toBeLessThanOrEqual(8);
  });
});
