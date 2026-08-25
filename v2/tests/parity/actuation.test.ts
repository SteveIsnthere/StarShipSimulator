/**
 * M1.4 acceptance, "parity elsewhere": every actuator and every engine formula
 * matches the 2021 implementation exactly.
 *
 * The 2021 rates are per-frame constants equal to `ratePerSecond * dt`, because
 * `1 / renderTimeInterval` is the simulated seconds in a frame. Each test sets
 * the legacy `renderTimeInterval` to `1 / dt` so both sides see the same rate,
 * then compares with Object.is.
 */
import { describe, expect, it } from 'vitest';
import { runInContext } from 'node:vm';
import { loadLegacy, toLegacyKeys, toLegacyName, toLegacySource } from './legacy';
import { createInitialState } from '$core/state';
import * as act from '$core/control/actuation';
import * as eng from '$core/physics/engines';
import { rad } from '$core/units';
import * as C from '$core/constants';

const legacy = loadLegacy(
  ['backend/physics.js', 'backend/initBackEnd.js', 'backend/flightcontrol/flightControl.js'],
);

function setLegacy(globals: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(toLegacyKeys(globals))) {
    (legacy as Record<string, unknown>)[k] = v;
  }
}
const evalLegacy = (src: string): unknown =>
  runInContext(toLegacySource(src), legacy as never, { filename: '<parity>' });

/** Read a legacy global by its v2 name, translating through the rename table. */
function readLegacy(name: string): unknown {
  return (legacy as unknown as Record<string, unknown>)[toLegacyName(name)];
}

const exact = (mine: unknown, theirs: unknown, label: string) =>
  expect(Object.is(mine, theirs), `${label}: ours=${String(mine)} legacy=${String(theirs)}`).toBe(
    true,
  );

const DTS = [1 / 30, 1 / 60, 1 / 120, 1 / 240];
const BOOLS = [
  [false, false, false],
  [true, false, false],
  [false, true, false],
  [false, false, true],
  [true, true, false],
  [true, false, true],
  [false, true, true],
  [true, true, true],
] as const;

// ---------------------------------------------------------------------------

describe('engine thrust formulas', () => {
  it('getWorkingEngineCount matches for all eight combinations', () => {
    for (const running of BOOLS) {
      setLegacy({
        raptorN1Running: running[0],
        raptorN2Running: running[1],
        raptorN3Running: running[2],
      });
      exact(eng.getWorkingEngineCount(running), evalLegacy('getWorkingEngineCount()'), `${running}`);
    }
  });

  it('getThrust, getTotalMaxThrust and getTotalMinThrust match', () => {
    for (const running of BOOLS) {
      for (const throttleCurrent of [0, 40, 55.5, 100]) {
        setLegacy({
          raptorN1Running: running[0],
          raptorN2Running: running[1],
          raptorN3Running: running[2],
          throttleCurrent,
        });
        exact(eng.getThrust(running, throttleCurrent), evalLegacy('getThrust()'), 'thrust');
        exact(eng.getTotalMaxThrust(running), evalLegacy('getTotalMaxThrust()'), 'maxThrust');
        exact(eng.getTotalMinThrust(running), evalLegacy('getTotalMinThrust()'), 'minThrust');
      }
    }
  });

  it('getThrustVectorForce matches', () => {
    for (const thrust of [0, 1e6, 6.6e6]) {
      for (const gimbalPosition of [-100, -33.3, 0, 33.3, 100]) {
        setLegacy({ thrust, gimbalPosition });
        exact(
          eng.getThrustVectorForce(thrust, gimbalPosition),
          evalLegacy('getThrustVectorForce()'),
          `tvf(${thrust},${gimbalPosition})`,
        );
      }
    }
  });

  it('getOffAxisThrustDifference matches, including the boolean coercion', () => {
    for (const running of BOOLS) {
      for (const throttleCurrent of [0, 62.5, 100]) {
        setLegacy({
          raptorN1Running: running[0],
          raptorN2Running: running[1],
          raptorN3Running: running[2],
          throttleCurrent,
        });
        exact(
          eng.getOffAxisThrustDifference(running, throttleCurrent),
          evalLegacy('getOffAxisThrustDifference()'),
          `offAxis(${running},${throttleCurrent})`,
        );
      }
    }
  });

  it('getGimbalPointingDirection matches, including both wrap branches', () => {
    for (const pitch of [-3.1, -1.5, 0, 1.5, 3.1, Math.PI, -Math.PI]) {
      for (const gimbalPosition of [-100, 0, 100]) {
        setLegacy({ pitch, gimbalPosition });
        evalLegacy('updateGimbolPointingDirection()');
        exact(
          eng.getGimbalPointingDirection(rad(pitch), gimbalPosition),
          readLegacy('gimbalPointingDirection'),
          `gpd(${pitch},${gimbalPosition})`,
        );
      }
    }
  });

  it('getMomentOfInertia matches vehicleMomentOfInertiaUpdate', () => {
    for (const vehicleMass of [120_000, 300_000, 470_000]) {
      setLegacy({ vehicleMass });
      const theirs = evalLegacy(
        'vehicleMass * (vehicleDiameter / 2) ** 2 * 0.25 + vehicleMass * vehicleHeight ** 2 / 12',
      );
      exact(eng.getMomentOfInertia(vehicleMass), theirs, `I(${vehicleMass})`);
    }
  });
});

describe('fuel', () => {
  it('flow rate matches', () => {
    for (const running of BOOLS) {
      for (const throttleCurrent of [0, 40, 100]) {
        setLegacy({
          raptorN1Running: running[0],
          raptorN2Running: running[1],
          raptorN3Running: running[2],
          throttleCurrent,
        });
        exact(
          eng.getFuelFlowRate(running, throttleCurrent),
          evalLegacy(
            'getWorkingEngineCount() * throttleCurrent * 0.01 * maxFuelFlowPerRaptor',
          ),
          'flowRate',
        );
      }
    }
  });

  it.each(DTS)('burn over 600 steps at dt=%f matches, to the last bit', (dt) => {
    const state = createInitialState();
    state.engines.running = [true, true, true];
    state.vehicle.throttleCurrent = 100;

    setLegacy({
      propellantMass: state.vehicle.propellantMass,
      raptorN1Running: true,
      raptorN2Running: true,
      raptorN3Running: true,
      throttleCurrent: 100,
      dumpingFuel: false,
      forceDump: false,
      renderTimeInterval: 1 / dt,
    });

    for (let i = 0; i < 600; i++) {
      eng.updatePropellant(state, dt);
      evalLegacy(`
        if (propellantMass > 0) {
          propellantMass -= (getWorkingEngineCount() * throttleCurrent * 0.01 * maxFuelFlowPerRaptor) / renderTimeInterval
        } else { propellantMass = 0 }
        vehicleMass = vehicleDryMass + propellantMass
      `);
    }
    exact(state.vehicle.propellantMass, readLegacy('propellantMass'), `propellant after 600 @ ${dt}`);
    exact(state.vehicle.vehicleMass, readLegacy('vehicleMass'), `mass after 600 @ ${dt}`);
  });

  it('fuel dumping matches, including the self-disabling branch', () => {
    const dt = 1 / 60;
    const state = createInitialState();
    state.vehicle.propellantMass = 14_000;
    state.status.dumpingFuel = true;
    state.engines.running = [false, false, false];

    setLegacy({
      propellantMass: 14_000,
      raptorN1Running: false,
      raptorN2Running: false,
      raptorN3Running: false,
      throttleCurrent: 0,
      dumpingFuel: true,
      forceDump: false,
      renderTimeInterval: 1 / dt,
    });

    for (let i = 0; i < 200; i++) {
      eng.updatePropellant(state, dt);
      evalLegacy(`
        if (propellantMass > 0) {
          propellantMass -= (getWorkingEngineCount() * throttleCurrent * 0.01 * maxFuelFlowPerRaptor) / renderTimeInterval
        } else { propellantMass = 0 }
        if (dumpingFuel) {
          if ((propellantMass > dumpLimit || forceDump) && propellantMass > 0) {
            propellantMass -= dumpRate / renderTimeInterval
          } else { dumpingFuel = !dumpingFuel }
        }
        vehicleMass = vehicleDryMass + propellantMass
      `);
      exact(state.status.dumpingFuel, readLegacy('dumpingFuel'), `dumping flag step ${i}`);
    }
    exact(state.vehicle.propellantMass, readLegacy('propellantMass'), 'propellant after dump');
    // It really did stop itself at the dump limit rather than running dry.
    expect(state.status.dumpingFuel).toBe(false);
    expect(state.vehicle.propellantMass).toBeLessThanOrEqual(12_000);
  });
});

describe('actuators', () => {
  it.each(DTS)('throttle slew over 300 steps at dt=%f matches', (dt) => {
    const state = createInitialState();
    state.vehicle.throttle = 40;
    state.vehicle.throttleCurrent = 100;
    setLegacy({ throttle: 40, throttleCurrent: 100, throttleSpeedPerFrame: 60 * dt });

    for (let i = 0; i < 300; i++) {
      act.throttleUpdate(state, dt);
      evalLegacy('throttleUpdate()');
      exact(state.vehicle.throttleCurrent, readLegacy('throttleCurrent'), `throttle step ${i}`);
    }
  });

  it.each(DTS)('gimbal slew over 300 steps at dt=%f matches', (dt) => {
    const state = createInitialState();
    setLegacy({ gimbalPosition: 0, gimbalSpeedPerFrame: 600 * dt });

    for (let i = 0; i < 300; i++) {
      const goal = Math.sin(i / 17) * 100;
      act.thrustVectorControl(state, goal, dt);
      setLegacy({ __goal: goal });
      evalLegacy('thrustVectorControl(__goal)');
      exact(state.vehicle.gimbalPosition, readLegacy('gimbalPosition'), `gimbal step ${i}`);
    }
  });

  it.each(DTS)('fin actuation over 400 steps at dt=%f matches in all three modes', (dt) => {
    for (const [finActive, finLocked] of [
      [true, false],
      [false, true],
      [false, false],
    ]) {
      const state = createInitialState();
      state.status.finActive = finActive!;
      state.status.finLocked = finLocked!;
      setLegacy({
        finActive,
        finLocked,
        frontFinExtension: 0,
        aftFinExtension: 0,
        finActuationSpeedPerFrame: 120 * dt,
      });

      for (let i = 0; i < 400; i++) {
        // Sweep angle of attack across zero so the front/aft swap is exercised.
        const aoa = rad(Math.sin(i / 23));
        const goal = Math.cos(i / 13) * 50;
        state.kinematics.angleOfAttack = aoa;
        act.finsActuation(state, goal, dt);
        setLegacy({ angleOfAttack: aoa, __goal: goal });
        evalLegacy('finsActuation(__goal)');
        exact(
          state.vehicle.frontFinExtension,
          readLegacy('frontFinExtension'),
          `front fin step ${i} (${finActive},${finLocked})`,
        );
        exact(
          state.vehicle.aftFinExtension,
          readLegacy('aftFinExtension'),
          `aft fin step ${i} (${finActive},${finLocked})`,
        );
      }
    }
  });

  it('preserves the front/aft `<` vs `<=` asymmetry', () => {
    // frontFinActuation uses `<`, aftFinActuation uses `<=`. They differ only
    // when current === goal exactly. Ported deliberately; asserted so a future
    // tidy-up cannot quietly "fix" it without moving a golden.
    expect(act.slewToward(50, 50, 2, false)).toBe(50);
    expect(act.slewToward(50, 50, 2, true)).toBe(50);
    // At exactly one step away the branches diverge.
    expect(act.slewToward(48, 50, 2, false)).toBe(50);
    expect(act.slewToward(52, 50, 2, true)).toBe(50);
  });

  it.each(DTS)('RCS matches at dt=%f, including reserve drain', (dt) => {
    const state = createInitialState();
    state.status.rcsActive = true;
    setLegacy({
      rcsActive: true,
      rcsRunTimeRemaining: 25,
      rcsThrust: 0,
      renderTimeInterval: 1 / dt,
    });

    for (let i = 0; i < 500; i++) {
      const goal = i % 3 === 0 ? 100 : i % 3 === 1 ? -100 : 0;
      act.rcsControl(state, goal, dt);
      setLegacy({ __goal: goal });
      evalLegacy('rcsControl(__goal)');
      exact(state.forces.rcsThrust, readLegacy('rcsThrust'), `rcs thrust step ${i} @ ${dt}`);
      // Bit-exact, not approximate: the drain expression is ported verbatim
      // precisely so this comparison can be Object.is. See tests/proofs/.
      exact(
        state.vehicle.rcsRunTimeRemaining,
        readLegacy('rcsRunTimeRemaining'),
        `rcs reserve step ${i} @ ${dt}`,
      );
    }
  });

  it('the YOKE is still bang-bang: nothing inside +-99%', () => {
    // The player's control, unchanged. The comparison above runs with no
    // autopilot command standing, which is why it can still be Object.is
    // against 2021 for 500 steps.
    const state = createInitialState();
    state.status.rcsActive = true;
    for (const goal of [-99, -50, 0, 50, 99]) {
      act.rcsControl(state, goal, 1 / 60);
      expect(state.forces.rcsThrust, `goal ${goal}`).toBe(0);
    }
    act.rcsControl(state, 99.001, 1 / 60);
    expect(state.forces.rcsThrust).toBeGreaterThan(0);
  });

  describe('DECLARED DEPARTURE: the autopilot can fire below saturation — M2.11', () => {
    // 2021 computed a proportional RCS command in precisionAlignment and then
    // destroyed it: controlTranslation ran next, in the same step, and zeroed
    // `rcsThrust` for any yoke inside +-99. Nothing ever read one. v2 routes
    // the command through `autopilot.rcsThrustCommand`, which this function
    // consumes — so with a command standing the two implementations differ,
    // deliberately, and this is where that is written down.

    it('with a command standing, v2 fires where 2021 does not', () => {
      const dt = 1 / 120;
      const state = createInitialState();
      state.status.rcsActive = true;
      state.autopilot.rcsThrustCommand = -400_000;

      setLegacy({ rcsActive: true, rcsRunTimeRemaining: 25, rcsThrust: 0, renderTimeInterval: 1 / dt });
      act.rcsControl(state, 0, dt);
      setLegacy({ __goal: 0 });
      evalLegacy('rcsControl(__goal)');

      expect(state.forces.rcsThrust, 'v2 applies the command').toBe(-400_000);
      expect(readLegacy('rcsThrust'), '2021 zeroes it').toBe(0);
    });

    it('and pays for it in proportion — half thrust, half the reserve', () => {
      const dt = 1 / 120;
      const half = createInitialState();
      half.status.rcsActive = true;
      half.autopilot.rcsThrustCommand = C.rcsMaxThrust / 2;
      act.rcsControl(half, 0, dt);

      const full = createInitialState();
      full.status.rcsActive = true;
      act.rcsControl(full, 100, dt);

      const halfUsed = C.rcsRunTimeRemaining - half.vehicle.rcsRunTimeRemaining;
      const fullUsed = C.rcsRunTimeRemaining - full.vehicle.rcsRunTimeRemaining;
      expect(halfUsed / fullUsed).toBeCloseTo(0.5, 9);
      // And a full-deflection step costs exactly what 2021 charged, to the bit:
      // the drain expression is the verbatim one with fraction = 1.
      setLegacy({ rcsActive: true, rcsRunTimeRemaining: C.rcsRunTimeRemaining, rcsThrust: 0,
        renderTimeInterval: 1 / dt, __goal: 100 });
      evalLegacy('rcsControl(__goal)');
      exact(full.vehicle.rcsRunTimeRemaining, readLegacy('rcsRunTimeRemaining'), 'full-deflection drain');
    });

    it('the command is consumed, not left standing for the next step', () => {
      const dt = 1 / 120;
      const state = createInitialState();
      state.status.rcsActive = true;
      state.autopilot.rcsThrustCommand = -400_000;

      act.rcsControl(state, 0, dt);
      expect(state.autopilot.rcsThrustCommand, 'cleared on consumption').toBe(0);
      act.rcsControl(state, 0, dt);
      expect(state.forces.rcsThrust, 'a stale command must not fire again').toBe(0);
    });
  });
});
