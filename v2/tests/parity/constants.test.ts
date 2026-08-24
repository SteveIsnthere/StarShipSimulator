/**
 * M1.1 acceptance: "constants diff clean against legacy values."
 *
 * Not a transcription check. This executes backend/initBackEnd.js in a VM and
 * compares every constant in core/constants.ts against the value the 2021 code
 * actually produces, with Object.is — so 0 vs -0 and any last-bit difference
 * from a reordered expression both fail.
 */
import { describe, expect, it } from 'vitest';
import { loadLegacy, toLegacyName } from './legacy';
import * as C from '$core/constants';

const legacy = loadLegacy();

/**
 * Every constant in core/constants.ts, listed by its v2 name.
 *
 * The 2021 spelling is looked up through `toLegacyName` rather than written out
 * here, so the rename table in legacy.ts is the single source of truth and a
 * future rename cannot silently break the correspondence.
 */
// Partial by type, complete by test: NOSE_RADIUS is declared in
// INTRODUCED_BY_V2 below, and the coverage test enforces that every export is
// in exactly one of the two lists. Keeping completeness a runtime assertion
// rather than a type lets the exemption carry its reason with it.
const MAPPING: Partial<Record<keyof typeof C & string, string>> = {
  planetRadius: toLegacyName('planetRadius'),
  planetCircumference: toLegacyName('planetCircumference'),
  planetMass: toLegacyName('planetMass'),
  planetTimeToRotate: toLegacyName('planetTimeToRotate'),
  planetLinearVelocity: toLegacyName('planetLinearVelocity'),
  gravitationalConstant: toLegacyName('gravitationalConstant'),
  gravity: toLegacyName('gravity'),
  airResistance_k: toLegacyName('airResistance_k'),
  speedOfSound: toLegacyName('speedOfSound'),
  starBaseXPos: toLegacyName('starBaseXPos'),

  vehicleHeight: toLegacyName('vehicleHeight'),
  vehicleDiameter: toLegacyName('vehicleDiameter'),
  vehicleMaxArea: toLegacyName('vehicleMaxArea'),
  vehicleMinArea: toLegacyName('vehicleMinArea'),
  vehicleInFlightMaxArea: toLegacyName('vehicleInFlightMaxArea'),
  vehicleDryMass: toLegacyName('vehicleDryMass'),
  propellantMass: toLegacyName('propellantMass'),
  vehicleMass: toLegacyName('vehicleMass'),
  dumpRate: toLegacyName('dumpRate'),
  dumpLimit: toLegacyName('dumpLimit'),
  vehicleMomentOfInertia: toLegacyName('vehicleMomentOfInertia'),
  integralOfRCubedTimesDx: toLegacyName('integralOfRCubedTimesDx'),

  raptorIgnitionTimeMean: toLegacyName('raptorIgnitionTimeMean'),
  raptorIgnitionFailureRate: toLegacyName('raptorIgnitionFailureRate'),
  throttleUpperLimit: toLegacyName('throttleUpperLimit'),
  throttleLowerLimit: toLegacyName('throttleLowerLimit'),
  throttleSpeed: toLegacyName('throttleSpeed'),
  raptorOffsetFromCenter: toLegacyName('raptorOffsetFromCenter'),
  raptorN1offAxis: toLegacyName('raptorN1offAxis'),
  raptorN2offAxis: toLegacyName('raptorN2offAxis'),
  raptorN3offAxis: toLegacyName('raptorN3offAxis'),
  raptorN1offAxisForceFraction: toLegacyName('raptorN1offAxisForceFraction'),
  raptorN2offAxisForceFraction: toLegacyName('raptorN2offAxisForceFraction'),
  raptorN3offAxisForceFraction: toLegacyName('raptorN3offAxisForceFraction'),
  engineDistanceFromCenterOfMass: toLegacyName('engineDistanceFromCenterOfMass'),
  gimbalSpeed: toLegacyName('gimbalSpeed'),
  gimbalAngleLimit: toLegacyName('gimbalAngleLimit'),
  maxThrustPerRaptor: toLegacyName('maxThrustPerRaptor'),
  maxFuelFlowPerRaptor: toLegacyName('maxFuelFlowPerRaptor'),

  rcsMaxThrust: toLegacyName('rcsMaxThrust'),
  rcsThrustDistanceFromCenterOfMass: toLegacyName('rcsThrustDistanceFromCenterOfMass'),
  rcsRunTimeRemaining: toLegacyName('rcsRunTimeRemaining'),
  finActuationMaxAngle: toLegacyName('finActuationMaxAngle'),
  finActuationSpeed: toLegacyName('finActuationSpeed'),
  frontFinSurfaceArea: toLegacyName('frontFinSurfaceArea'),
  frontFinDistanceFromCenterOfMass: toLegacyName('frontFinDistanceFromCenterOfMass'),
  aftFinSurfaceArea: toLegacyName('aftFinSurfaceArea'),
  aftFinDistanceFromCenterOfMass: toLegacyName('aftFinDistanceFromCenterOfMass'),
  totalFinSurfaceArea: toLegacyName('totalFinSurfaceArea'),
  finDragCoefficient: toLegacyName('finDragCoefficient'),

  gLimit: toLegacyName('gLimit'),
  heatLimit: toLegacyName('heatLimit'),
  dynamicPressureLimit: toLegacyName('dynamicPressureLimit'),
  touchDownPitchLimit: toLegacyName('touchDownPitchLimit'),
  touchDownSpeedLimit: toLegacyName('touchDownSpeedLimit'),

  initAutoLandXPosDiffThreshold: toLegacyName('initAutoLandXPosDiffThreshold'),
  propulsiveCorrectionMinHeight: toLegacyName('propulsiveCorrectionMinHeight'),
  propulsiveCorrectionAccuracyRequired: toLegacyName('propulsiveCorrectionAccuracyRequired'),
  decelerationStageHorizontalAcc: toLegacyName('decelerationStageHorizontalAcc'),
  autoLandFinalStageEngineCount: toLegacyName('autoLandFinalStageEngineCount'),
  finalStagePessimisticAvailableThrust: toLegacyName('finalStagePessimisticAvailableThrust'),
  finalStagePessimisticAvailableThrustDualRaptorMode: toLegacyName('finalStagePessimisticAvailableThrustDualRaptorMode'),
  finalStagePessimisticAvailableThrustTrialRaptorMode: toLegacyName('finalStagePessimisticAvailableThrustTrialRaptorMode'),
  flipStageEngineCount: toLegacyName('flipStageEngineCount'),
  flipStagePessimisticAvailableThrust: toLegacyName('flipStagePessimisticAvailableThrust'),
  aeroDescentMaxCorrectionAngle: toLegacyName('aeroDescentMaxCorrectionAngle'),
  fineTuneMultiplier: toLegacyName('fineTuneMultiplier'),
  fineTuneMaxSpeed: toLegacyName('fineTuneMaxSpeed'),
  flipGoalAngle: toLegacyName('flipGoalAngle'),
  flipInducedXPosChange: toLegacyName('flipInducedXPosChange'),
  adjustmentMaxAngle: toLegacyName('adjustmentMaxAngle'),
  horizontalAdjustmentDurationEstimateSingleEngine: toLegacyName('horizontalAdjustmentDurationEstimateSingleEngine'),
  horizontalAdjustmentDurationEstimate: toLegacyName('horizontalAdjustmentDurationEstimate'),
  horizontalAdjustmentDurationEstimateDualRaptorMode: toLegacyName('horizontalAdjustmentDurationEstimateDualRaptorMode'),
  horizontalAdjustmentDurationEstimateTrialRaptorMode: toLegacyName('horizontalAdjustmentDurationEstimateTrialRaptorMode'),
  horizontalAdjustmentHorizontalSpeedLimit: toLegacyName('horizontalAdjustmentHorizontalSpeedLimit'),
  horizontalAdjustmentVerticalSpeedLimit: toLegacyName('horizontalAdjustmentVerticalSpeedLimit'),
  noSteeringHeight: toLegacyName('noSteeringHeight'),
  aomAt_25km: toLegacyName('aomAt_25km'),
  aomAt_80km: toLegacyName('aomAt_80km'),
  aeroBreakingMaxCorrectionAngle: toLegacyName('aeroBreakingMaxCorrectionAngle'),
  aeroBreakingFineTuneThreshold: toLegacyName('aeroBreakingFineTuneThreshold'),
  aeroBreakingAdjDegreePerSec: toLegacyName('aeroBreakingAdjDegreePerSec'),

  recordTimeInterval: toLegacyName('recordTimeInterval'),
  frameRate: toLegacyName('frameRate'),
};

describe('every constant matches the 2021 value exactly', () => {
  for (const [ours, theirs] of Object.entries(MAPPING)) {
    it(`${ours}`, () => {
      const mine = C[ours as keyof typeof C];
      const legacyValue = legacy[theirs];
      expect(legacyValue, `${theirs} is not defined by the legacy backend`).toBeDefined();
      // Object.is, not toBe with tolerance: a reordered expression that shifts
      // the last bit is exactly what this test exists to catch.
      expect(Object.is(mine, legacyValue), `${ours}=${mine} vs ${theirs}=${legacyValue}`).toBe(
        true,
      );
    });
  }
});

/**
 * Constants v2 introduced that have no 2021 counterpart.
 *
 * Every entry needs a reason. The default is that a constant in this file came
 * from initBackEnd.js and must match it exactly; anything else is a deliberate
 * addition and is listed here so it cannot slip in unremarked.
 */
const INTRODUCED_BY_V2: Readonly<Record<string, string>> = {
  // M2.2, Bug fix. getReentryHeatPower takes a nose radius; every 2021 call
  // site passed crossSectionalArea, an area. 2021 had no such constant because
  // it never needed one.
  NOSE_RADIUS: 'M2.2 — the nose radius the heat correlation always wanted',
  // M2.4, Bug fix. autoPilotModes.js:8 had 0.4 inline, against a quantity that
  // was not a rate. The number is unchanged; naming it records that it now
  // means 0.4 rad/s at every frame rate rather than only at 60 fps.
  PITCH_HOLD_RATE_THRESHOLD: 'M2.4 — the pitchHold gate, now in real rad/s',
};

describe('coverage of the mapping itself', () => {
  it('every export of core/constants.ts is mapped or declared new', () => {
    const unmapped = Object.keys(C).filter(
      (k) => !(k in MAPPING) && !(k in INTRODUCED_BY_V2),
    );
    expect(unmapped, 'exports with no legacy counterpart and no declaration').toEqual([]);
  });

  it('the constants v2 introduced really are absent from 2021', () => {
    for (const name of Object.keys(INTRODUCED_BY_V2)) {
      expect(legacy[name], `${name} exists in the 2021 tree after all`).toBeUndefined();
    }
  });

  it('NOSE_RADIUS is the radius, and 2021 passed an area in its place', () => {
    expect(C.NOSE_RADIUS).toBe(4.5);
    // What the 2021 call site actually supplied, for contrast.
    expect(legacy['vehicleMinArea']).toBeGreaterThan(60);
  });

  it('maps a meaningful number of constants', () => {
    expect(Object.keys(MAPPING).length).toBeGreaterThanOrEqual(80);
  });
});
