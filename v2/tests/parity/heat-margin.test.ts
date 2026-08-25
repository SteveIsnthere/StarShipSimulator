/**
 * M2.9(a), Bug-fix tier: the heat limit, re-derived rather than asserted.
 *
 * `heatLimit` is the one constant in core/constants.ts that deliberately holds
 * a different value from its 2021 counterpart. A comment claiming "recalibrated
 * to preserve the 2021 margin" is worth very little on its own — anyone can
 * write that above any number. So this test performs the measurement the
 * comment describes, on both implementations, every time it runs:
 *
 *   1. Fly the Re-entry preset on the FROZEN 2021 TREE, executing in a VM, with
 *      2021's own autopilot flying. Record its peak thermalPower and its ratio
 *      to 2021's limit of 55. That ratio is the margin the 2021 build shipped.
 *   2. Fly the same preset on v2. Record its peak.
 *   3. Assert that `heatLimit` is what preserves the ratio.
 *
 * WHY THE NUMBER HAD TO MOVE AT ALL. `thermalPower` is not the same quantity it
 * was. M2.2 passes a nose radius to the Sutton-Graves correlation where 2021
 * passed a cross-sectional area, and the correlation divides by a radius in
 * metres — so 2021's numbers were smaller by sqrt(area / radius), a factor that
 * changed with attitude. M2.1 then made the air the vehicle meets several times
 * denser than the isotherm claimed, and heating goes as sqrt(density). A limit
 * indexed to the old scale is a coincidence, not a design.
 *
 * WHAT RUNNING THE 2021 AUTOPILOT COSTS. The frozen tree's autopilot repaints
 * the UI as it flies: it lights engines through `setTimeout`, builds PIXI
 * containers for the shutdown effect, and writes to DOM nodes. Those are
 * stubbed below — a deterministic timer queue driven by simulated time, and
 * inert display objects. Nothing in the frozen tree is modified; the stubs live
 * in the VM context around it. `Math.random` is pinned inside the context too,
 * so the ignition delay is the same on every run.
 */
import { describe, expect, it } from 'vitest';
import { runInContext } from 'node:vm';
import { loadLegacy, toLegacyKeys, toLegacySource } from './legacy';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import { toggleAutoLand } from '$core/control/commands';
import * as C from '$core/constants';

const legacy = loadLegacy([
  'backend/physics.js',
  'backend/initBackEnd.js',
  'backend/flightcontrol/flightControl.js',
  'backend/flightcontrol/autoPilotLowLevelFunctions.js',
  'backend/flightcontrol/autoPilotModes.js',
  'backend/utilities/switches.js',
  'backend/utilities/tools.js',
]);
const ctx = legacy as unknown as Record<string, unknown>;

/**
 * The browser the 2021 autopilot expects, reduced to what it touches.
 *
 * `setTimeout` becomes a queue drained by simulated time — which is what the
 * 2021 ignition delay was measuring in the first place, at timeAccel 1 — so the
 * engines light after the same delay they would have on a wall clock, and
 * deterministically.
 */
runInContext(
  `Math.random = function () { return 0.5; };
   function updateYokePosition() {}
   var __timers = [];
   var __now = 0;
   function setTimeout(fn, ms) { __timers.push({ fn: fn, at: __now + ms / 1000 }); }
   function __tick(dt) {
     __now += dt;
     for (var i = __timers.length - 1; i >= 0; i--) {
       if (__timers[i].at <= __now) { var f = __timers[i].fn; __timers.splice(i, 1); f(); }
     }
   }
   var inert = function () {
     return { addChild: function () {}, removeChild: function () {},
              position: { set: function () {} }, scale: { set: function () {} } };
   };
   var PIXI = { Container: function () { this.addChild = function () {}; this.position = { set: function () {} }; } };
   var app = { stage: inert() };
   var starShipAndEffects = inert();
   var firstTimeLanded = inert();
   var showRequestTiltControlBtn = inert();
   var drawingProportion = 1;
   var fx = { getParticleEmitter: function () {
     return { emit: false, init: function () {}, updateSpawnPos: function () {},
              update: function () {}, destroy: function () {} };
   } };`,
  legacy as never,
  { filename: '<browser-stubs>' },
);

const evalLegacy = (src: string) =>
  runInContext(toLegacySource(src), legacy as never, { filename: '<heat-margin>' });

/**
 * updateBackEnd() minus its Date.now() frame timing and its two getElementById
 * reads, plus `autoLand()` — the 2021 autopilot mode this preset is flown with.
 * Everything else is the legacy source in the legacy order.
 */
const LEGACY_STEP = `
  updatedFrameCount++
  updateAtmosphere()
  checkIfBreakUp()
  checkIfCrash()
  checkIfOutOfFuel()
  if (propellantMass > 0) {
    propellantMass -= (getWorkingEngineCount() * throttleCurrent * 0.01 * maxFuelFlowPerRaptor) / renderTimeInterval
  } else { propellantMass = 0 }
  if (dumpingFuel) {
    if ((propellantMass > dumpLimit || forceDump) && propellantMass > 0) {
      propellantMass -= dumpRate / renderTimeInterval
    } else { dumpingFuel = !dumpingFuel }
  }
  vehicleMass = vehicleDryMass + propellantMass
  if (fuelRunOut) { raptorN1Running = false; raptorN2Running = false; raptorN3Running = false }
  upDateVehicleInFlightMaxArea()
  updateCrossSectionalArea()
  updateAngleOfMotion()
  updateAngleOfAttack()
  updateGimbolPointingDirection()
  thermalPower = getReentryHeatPower(crossSectionalArea)
  dynamicPressure = getDynamicPressure()
  updatePitchRateOfChange()
  updateCurrentTWR()
  updatePerceivedG()
  aerodynamicDrag = getDrag(crossSectionalArea, getBodyDragCoefficient())
  aerodynamicLift = getLift(vehicleInFlightMaxArea)
  thrust = getThrust()
  altitude += speedY / renderTimeInterval
  downRangeDistanceNextFrame = downRangeDistance + speedX / renderTimeInterval
  if (downRangeDistanceNextFrame > planetCircumference) {
    downRangeDistance = downRangeDistanceNextFrame - planetCircumference
  } else if (downRangeDistanceNextFrame < 0) {
    downRangeDistance = downRangeDistanceNextFrame + planetCircumference
  } else { downRangeDistance = downRangeDistanceNextFrame }
  speedX += accelerationX / renderTimeInterval
  speedY += (accelerationY + orbitGravityAccCompensation) / renderTimeInterval
  trueSpeed = Math.sqrt(speedX ** 2 + speedY ** 2)
  machSpeed = trueSpeed / speedOfSound
  aerodynamicDragAcceleration = getAcceleration(aerodynamicDrag, vehicleMass)
  aerodynamicLiftAcceleration = getAcceleration(aerodynamicLift, vehicleMass)
  thrustAcceleration = getAcceleration(thrust, vehicleMass)
  accelerationX = getHorizontalAcceleration()
  accelerationY = getVerticalAcceleration()
  totalAcceleration = Math.sqrt(accelerationX ** 2 + accelerationY ** 2)
  updateOrbitGravityAccCompensation()
  vehicleMomentOfInertia = vehicleMass * (vehicleDiameter / 2) ** 2 * 0.25 + vehicleMass * vehicleHeight ** 2 / 12
  if (pitch > Math.PI) { pitch = pitch - 2 * Math.PI } else if (pitch < -Math.PI) { pitch = pitch + 2 * Math.PI }
  pitch += angularVelocity / renderTimeInterval
  angularVelocity += angularAcceleration / renderTimeInterval
  thrustVectorForce = getThrustVectorForce()
  frontFinDrag = getFrontFinDrag()
  aftFinDrag = getAftFinDrag()
  thrustVectorAcceleration = getAngularAcceleration(thrustVectorForce, engineDistanceFromCenterOfMass, vehicleMomentOfInertia)
  angularDragAcceleration = getAngularDragAcceleration()
  frontFinDragAngularAcceleration = getAngularAcceleration(frontFinDrag, frontFinDistanceFromCenterOfMass, vehicleMomentOfInertia)
  aftFinDragAngularAcceleration = getAngularAcceleration(aftFinDrag, aftFinDistanceFromCenterOfMass, vehicleMomentOfInertia)
  rcsThrustAngularAcceleration = getAngularAcceleration(rcsThrust, rcsThrustDistanceFromCenterOfMass, vehicleMomentOfInertia)
  offAxisThrustDifferenceAcceleration = getAngularAcceleration(getOffAxisThrustDifference(), engineDistanceFromCenterOfMass, vehicleMomentOfInertia)
  angularAcceleration = thrustVectorAcceleration + angularDragAcceleration + frontFinDragAngularAcceleration + aftFinDragAngularAcceleration + rcsThrustAngularAcceleration + offAxisThrustDifferenceAcceleration
  autoLand()
  controlTranslation()
  throttleUpdate()
`;
const DT = 1 / 120;
/** Long enough for the whole descent: the flights below take 470-500 s. */
const MAX_SECONDS = 900;

const preset = getScenario('reentry')!;

/** Fly the frozen 2021 tree, autopilot engaged, and report its heat peak. */
function fly2021() {
  Object.assign(
    ctx,
    toLegacyKeys({
      renderTimeInterval: 1 / DT,
      frameRate: 60,
      timeAccel: 1,
      altitude: preset.altitude,
      downRangeDistance: preset.xPosition + C.starBaseXPos,
      downRangeDistanceNextFrame: preset.xPosition + C.starBaseXPos,
      distanceToPlanetCenter: C.planetRadius + preset.altitude,
      speedX: preset.speedX,
      speedY: preset.speedY,
      trueSpeed: Math.hypot(preset.speedX, preset.speedY),
      pitch: preset.pitch as unknown as number,
      propellantMass: preset.propellant * 1000,
      vehicleMass: C.vehicleDryMass + preset.propellant * 1000,
      autoLandOn: true,
      manualControlOn: false,
      finActive: true,
      rcsActive: true,
      throttleSpeedPerFrame: 60 * DT,
      gimbalSpeedPerFrame: 600 * DT,
      finActuationSpeedPerFrame: 120 * DT,
    }),
  );

  let peak = 0;
  let brokeUp = false;
  let steps = 0;
  for (let i = 1; i <= 120 * MAX_SECONDS; i++) {
    evalLegacy(LEGACY_STEP);
    evalLegacy(`__tick(${DT})`);
    peak = Math.max(peak, ctx['thermalPower'] as number);
    steps = i;
    if (ctx['inFlightBreakUp']) brokeUp = true;
    if (ctx['crashed'] || (ctx['altitude'] as number) <= 25.0001) break;
  }
  return {
    peak,
    brokeUp,
    limit: ctx['heatLimit'] as number,
    seconds: steps / 120,
    altitude: ctx['altitude'] as number,
    speedY: ctx['speedY'] as number,
  };
}

/** Fly v2's `step()` on the same preset, autopilot engaged. */
function flyV2() {
  let s = createScenarioState(preset);
  toggleAutoLand(s);
  s.status.finActive = true;
  s.status.rcsActive = true;

  let peak = 0;
  let steps = 0;
  for (let i = 1; i <= 120 * MAX_SECONDS; i++) {
    s = step(s, DT);
    peak = Math.max(peak, s.forces.thermalPower);
    steps = i;
    if (s.failures.inFlightBreakUp || s.failures.crashed || s.status.landed) break;
  }
  return { peak, state: s, seconds: steps / 120 };
}

/**
 * Both flights, flown once.
 *
 * The legacy context is a bag of globals that a flight leaves dirty — autopilot
 * stage flags, fin extensions, engine states — and `seedLegacy`-style reseeding
 * only covers the fields it names. Flying it twice gives a different second
 * answer (32.5 rather than 34.7 units), which is a property of the 2021 code
 * rather than of this test, so it is flown exactly once and the result shared.
 */
const legacyRun = fly2021();
const v2Run = flyV2();

describe('the 2021 heat margin, measured on the frozen tree', () => {

  it('the 2021 build flies Re-entry without breaking up', () => {
    // The premise of the whole recalibration: there IS a 2021 margin to
    // preserve, because 2021 survived this preset.
    expect(legacyRun.brokeUp, '2021 broke up on its own preset').toBe(false);
    expect(legacyRun.altitude, 'reached the ground').toBeLessThan(26);
    expect(legacyRun.speedY, 'and did so gently').toBeGreaterThan(-5);
  });

  it('its peak heating is 34.74 units against a limit of 55', () => {
    expect(legacyRun.limit).toBe(55);
    expect(legacyRun.peak).toBeCloseTo(34.7414, 3);
  });

  it('so the margin it shipped is 0.632 of the limit', () => {
    expect(legacyRun.peak / legacyRun.limit).toBeCloseTo(0.6317, 4);
  });
});

describe('and the recalibrated limit preserves it', () => {

  it('v2 flies the same preset, and lands', () => {
    expect(v2Run.state.failures.inFlightBreakUp, 'broke up').toBe(false);
    expect(v2Run.state.failures.crashed, 'crashed').toBe(false);
    expect(v2Run.state.status.landed).toBe(true);
  });

  it('its peak heating is 247.3 units — 7.1x the 2021 number', () => {
    // Not because re-entry got harder: because thermalPower is a different
    // quantity on a different scale since M2.2, and the air is denser since
    // M2.1.
    expect(v2Run.peak).toBeCloseTo(247.2787, 3);
    expect(v2Run.peak / legacyRun.peak).toBeCloseTo(7.12, 2);
  });

  it('heatLimit is what holds the margin at the 2021 value', () => {
    const margin2021 = legacyRun.peak / legacyRun.limit;
    const preserving = v2Run.peak / margin2021;

    // 391.47, before rounding. It was 391.80 when M2.9(a) derived it; M2.11
    // fixed the attitude controller and moved the descent slightly, and the
    // measurement moved with it. That the shipped constant did NOT have to move
    // is the useful part: the rounding-down margin absorbed a real change to
    // the flight, so 390 was not a number balanced on a knife edge.
    expect(preserving).toBeCloseTo(391.47, 1);
    // And the shipped constant is that, rounded DOWN to a whole unit — so the
    // recalibration can never grant more headroom than 2021 had.
    expect(C.heatLimit).toBe(390);
    expect(C.heatLimit).toBeLessThan(preserving);
    expect(preserving - C.heatLimit, 'rounding, not a fudge').toBeLessThan(2);
  });

  it('and v2 flies it with a margin no more generous than 2021 had', () => {
    const margin2021 = legacyRun.peak / legacyRun.limit;
    const marginV2 = v2Run.peak / C.heatLimit;
    expect(marginV2).toBeCloseTo(0.634, 3);
    expect(marginV2, 'v2 must not have MORE headroom than 2021').toBeGreaterThan(margin2021);
    expect(marginV2 - margin2021, 'and not much less either').toBeLessThan(0.01);
  });

  it('the limit still bites — it is not set so high it cannot be reached', () => {
    // A limit nothing can hit is not a limit. Measured across entry speeds:
    // 1.0x, 1.1x and 1.2x the preset's 7300 m/s all peak around 247-249 units
    // (the autopilot's aero descent absorbs the difference), 1.3x reaches 317,
    // and 1.4x reaches 395 — past the limit, and fatal.
    let s = createScenarioState(preset);
    s.kinematics.speedX *= 1.4;
    s.kinematics.trueSpeed = Math.hypot(s.kinematics.speedX, s.kinematics.speedY);
    toggleAutoLand(s);
    let brokeUp = false;
    for (let i = 0; i < 120 * 300; i++) {
      s = step(s, DT);
      if (s.failures.inFlightBreakUp) { brokeUp = true; break; }
      if (s.failures.crashed || s.status.landed) break;
    }
    expect(brokeUp, 'a hotter entry must still be fatal').toBe(true);
  });
});
