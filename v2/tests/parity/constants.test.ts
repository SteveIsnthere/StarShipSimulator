/**
 * M1.1 acceptance: "constants diff clean against legacy values."
 *
 * Not a transcription check. This executes backend/initBackEnd.js in a VM and
 * compares every constant in core/constants.ts against the value the 2021 code
 * actually produces, with Object.is — so 0 vs -0 and any last-bit difference
 * from a reordered expression both fail.
 */
import { describe, expect, it } from 'vitest';
import { loadLegacy } from './legacy';
import * as C from '$core/constants';

const legacy = loadLegacy();

/**
 * core/constants.ts name -> legacy global name.
 * Identical on both sides except where noted; misspellings are preserved
 * verbatim on purpose until M1.10.
 */
const MAPPING: Record<keyof typeof C & string, string> = {
  planetRadius: 'planetRadius',
  planetCirconference: 'planetCirconference',
  planetMass: 'planetMass',
  planetTimeToRotate: 'planetTimeToRotate',
  planetLineaVelocity: 'planetLineaVelocity',
  gravitationalConstant: 'gravitationalConstant',
  gravity: 'gravity',
  airResistance_k: 'airResistance_k',
  speedOfSound: 'speedOfSound',
  starBaseXpos: 'starBaseXpos',

  vehicleHeight: 'vehicleHeight',
  vehicleDiameter: 'vehicleDiameter',
  vehicleMaxArea: 'vehicleMaxArea',
  vehicleMinArea: 'vehicleMinArea',
  vehicleInFlightMaxArea: 'vehicleInFlightMaxArea',
  vehicleDryMass: 'vehicleDryMass',
  propellantMass: 'propellantMass',
  vehicleMass: 'vehicleMass',
  dumpRate: 'dumpRate',
  dumpLimit: 'dumpLimit',
  vehicleMomentOfInertia: 'vehicleMomentOfInertia',
  intergalOfRCubedTimesDx: 'intergalOfRCubedTimesDx',

  raptorIgnitionTimeMean: 'raptorIgnitionTimeMean',
  raptorIgnitionFaliureRate: 'raptorIgnitionFaliureRate',
  throttleUpperLimmit: 'throttleUpperLimmit',
  throttleLowwerLimmit: 'throttleLowwerLimmit',
  throttleSpeed: 'throttleSpeed',
  raptorOffsetFromCenter: 'raptorOffsetFromCenter',
  raptorN1offAxis: 'raptorN1offAxis',
  raptorN2offAxis: 'raptorN2offAxis',
  raptorN3offAxis: 'raptorN3offAxis',
  raptorN1offAxisForceFraction: 'raptorN1offAxisForceFraction',
  raptorN2offAxisForceFraction: 'raptorN2offAxisForceFraction',
  raptorN3offAxisForceFraction: 'raptorN3offAxisForceFraction',
  engineDistanceFromCenterOfMass: 'engineDistanceFromCenterOfMass',
  gimbolSpeed: 'gimbolSpeed',
  gimbolAngleLimit: 'gimbolAngleLimit',
  maxThrustPerRaptor: 'maxThrustPerRaptor',
  maxFuelFlowPerRaptor: 'maxFuelFlowPerRaptor',

  rcsMaxThrust: 'rcsMaxThrust',
  rcsThrustDistanceFromCenterOfMass: 'rcsThrustDistanceFromCenterOfMass',
  rcsRunTimeRemaining: 'rcsRunTimeRemaining',
  finAcuationMaxAngle: 'finAcuationMaxAngle',
  finAcuationSpeed: 'finAcuationSpeed',
  frontFinSurfaceAera: 'frontFinSurfaceAera',
  frontFinDistanceFromCenterOfMass: 'frontFinDistanceFromCenterOfMass',
  aftFinSurfaceAera: 'aftFinSurfaceAera',
  aftFinDistanceFromCenterOfMass: 'aftFinDistanceFromCenterOfMass',
  totalFinSurfaceAera: 'totalFinSurfaceAera',
  finDragCoefficient: 'finDragCoefficient',

  gLimit: 'gLimit',
  heatLimit: 'heatLimit',
  dynamicPressureLimit: 'dynamicPressureLimit',
  touchDownPitchLimit: 'touchDownPitchLimit',
  touchDownSpeedLimit: 'touchDownSpeedLimit',

  initAutoLandXposDiffThreshold: 'initAutoLandXposDiffThreshold',
  propulsiveCorrectionMinHeight: 'propulsiveCorrectionMinHeight',
  propulsiveCorrectionAccuracyRequired: 'propulsiveCorrectionAccuracyRequired',
  decelerationStageHorizontalAcc: 'decelerationStageHorizontalAcc',
  autoLandFinalStageEngineCount: 'autoLandFinalStageEngineCount',
  finalStagePessimisticAvailableThrust: 'finalStagePessimisticAvailableThrust',
  finalStagePessimisticAvailableThrustDualRaptorMode:
    'finalStagePessimisticAvailableThrustDualRaptorMode',
  finalStagePessimisticAvailableThrustTrialRaptorMode:
    'finalStagePessimisticAvailableThrustTrialRaptorMode',
  flipStageEngineCount: 'flipStageEngineCount',
  flipStagePessimisticAvailableThrust: 'flipStagePessimisticAvailableThrust',
  aeroDesentMaxCorrectionAngle: 'aeroDesentMaxCorrectionAngle',
  fineTuneMultiplier: 'fineTuneMultiplier',
  fineTuneMaxSpeed: 'fineTuneMaxSpeed',
  flipGoalAngle: 'flipGoalAngle',
  flipEnducedXposChange: 'flipEnducedXposChange',
  adjustmentMaxAngle: 'adjustmentMaxAngle',
  horizontalAdjustmentDurationEstimateSingleEngine:
    'horizontalAdjustmentDurationEstimateSingleEngine',
  horizontalAdjustmentDurationEstimate: 'horizontalAdjustmentDurationEstimate',
  horizontalAdjustmentDurationEstimateDualRaptorMode:
    'horizontalAdjustmentDurationEstimateDualRaptorMode',
  horizontalAdjustmentDurationEstimateTrialRaptorMode:
    'horizontalAdjustmentDurationEstimateTrialRaptorMode',
  horizontalAdjustmentHorizontalSpeedLimit: 'horizontalAdjustmentHorizontalSpeedLimit',
  horizontalAdjustmentVerticalSpeedLimit: 'horizontalAdjustmentVerticalSpeedLimit',
  noSteeringHeight: 'noSteeringHeight',
  aomAt_25km: 'aomAt_25km',
  aomAt_80km: 'aomAt_80km',
  aeroBreakingMaxCorrectionAngle: 'aeroBreakingMaxCorrectionAngle',
  aeroBreakingFineTuneThreshold: 'aeroBreakingFineTuneThreshold',
  aeroBreakingAdjDegreePerSec: 'aeroBreakingAdjDegreePerSec',

  recordTimeInterval: 'recordTimeInterval',
  frameRate: 'frameRate',
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

describe('coverage of the mapping itself', () => {
  it('every export of core/constants.ts is mapped', () => {
    const unmapped = Object.keys(C).filter((k) => !(k in MAPPING));
    expect(unmapped, 'exports with no legacy counterpart asserted').toEqual([]);
  });

  it('maps a meaningful number of constants', () => {
    expect(Object.keys(MAPPING).length).toBeGreaterThanOrEqual(80);
  });
});
