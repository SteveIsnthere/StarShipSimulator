import { create } from 'zustand';

interface WorldState {
  lastFrameRenderedTime: number;
  frameRate: number;
  timeAccel: number;
  renderTimeInterval: number;
  planetRadius: number;
  planetCirconference: number;
  planetMass: number;
  planetTimeToRotate: number;
  planetLineaVelocity: number;
  gravitationalConstant: number;
  airDensity: number | undefined;
  airPressure: number | undefined;
  gravity: number;
  airResistance_k: number;
  speedOfSound: number;
  environmentTime: number;
  wind: number;
  gust: number;
  starBaseXpos: number;
}

interface FlightParamsState {
  updatedFrameCount: number;
  timeSpent: number;
  altitude: number;
  downRangeDistance: number;
  downRangeDistanceNextFrame: number;
  distanceToPlanetCenter: number;
  orbitalVelocityAtCurrentAltitude: number;
  trueSpeed: number;
  speedX: number;
  speedY: number;
  machSpeed: number;
  orbitGravityAccCompensation: number;
  thrust: number;
  thrustAcceleration: number;
  offAxisThrustDifferenceAcceleration: number;
  twr: number;
  accelerationX: number;
  accelerationY: number;
  totalAcceleration: number;
  thrustVectorForce: number;
  thrustVectorAcceleration: number;
  rcsThrust: number;
  rcsThrustAngularAcceleration: number;
  angularDragAcceleration: number;
  pitch: number;
  pitchRateOfChange: number;
  pitchRecord: [number, number];
  angularVelocity: number;
  angularAcceleration: number;
  angleOfMotion: number;
  angleOfAttack: number;
  angleInToTheWind: number;
  crossSectionalArea: number;
  aerodynamicDrag: number;
  aerodynamicLift: number;
  aerodynamicDragAcceleration: number;
  thermalPower: number;
  dynamicPressure: number;
  perceivedG: number;
  perceivedG_X: number;
  perceivedG_Y: number;
}

interface VehicleParamsState {
  vehicleHeight: number;
  vehicleDiameter: number;
  vehicleMaxArea: number;
  vehicleMinArea: number;
  vehicleInFlightMaxArea: number;
  vehicleDryMass: number;
  propellantMass: number;
  vehicleMass: number;
  dumpRate: number;
  dumpLimit: number;
  vehicleMomentOfInertia: number;
  intergalOfRCubedTimesDx: number;
  raptorIgnitionTimeMean: number;
  raptorIgnitionFaliureRate: number;
  throttle: number;
  throttleCurrent: number;
  throttleSpeed: number;
  throttleSpeedPerFrame: number;
  throttleUpperLimmit: number;
  throttleLowwerLimmit: number;
  raptorOffsetFromCenter: number;
  raptorN1offAxis: number;
  raptorN2offAxis: number;
  raptorN3offAxis: number;
  raptorN1offAxisForceFraction: number;
  raptorN2offAxisForceFraction: number;
  raptorN3offAxisForceFraction: number;
  engineDistanceFromCenterOfMass: number;
  gimbolPosition: number;
  gimbolSpeed: number;
  gimbolSpeedPerFrame: number;
  gimbolAngleLimit: number;
  gimbolPointingDirection: number;
  maxThrustPerRaptor: number;
  maxFuelFlowPerRaptor: number;
  rcsMaxThrust: number;
  rcsThrustDistanceFromCenterOfMass: number;
  rcsRunTimeRemaining: number;
  finAcuationMaxAngle: number;
  frontFinExtention: number;
  aftFinExtention: number;
  finAcuationSpeed: number;
  finAcuationSpeedPerFrame: number;
  frontFinSurfaceAera: number;
  frontFinDistanceFromCenterOfMass: number;
  aftFinSurfaceAera: number;
  aftFinDistanceFromCenterOfMass: number;
  totalFinSurfaceAera: number;
  frontFinEffectiveAreaFraction: number;
  aftFinEffectiveAreaFraction: number;
  frontFinDrag: number;
  aftFinDrag: number;
  frontFinDragAngularAcceleration: number;
  aftFinDragAngularAcceleration: number;
  finDragCoefficient: number;
  gLimit: number;
  heatLimit: number;
  dynamicPressureLimit: number;
  touchDownPitchLimit: number;
  touchDownSpeedLimit: number;
  translationModeOn: boolean;
  pitchControl: number;
}

interface VehicleStatusState {
  onTheGround: boolean;
  landed: boolean;
  raptorN1Running: boolean;
  raptorN2Running: boolean;
  raptorN3Running: boolean;
  rcsActive: boolean;
  finActive: boolean;
  finLocked: boolean;
  gearDown: boolean;
  dumpingFuel: boolean;
  forceDump: boolean;
  coldGasLow: boolean;
  fuelLow: boolean;
  heatDamagedWarning: boolean;
  overPressureWarning: boolean;
  overGloadWarning: boolean;
  crashed: boolean;
  inFightBreakUp: boolean;
  coldGasRunOut: boolean;
  fuelRunOut: boolean;
  raptorN1Fail: boolean;
  raptorN2Fail: boolean;
  raptorN3Fail: boolean;
  heatDamaged: boolean;
  overPressure: boolean;
  overGload: boolean;
  flippedOver: boolean;
  randomFaliure: boolean;
}

interface DataRecorderState {
  recordTimeInterval: number;
  timeNodes: number[];
  listOfPitchAngle: number[];
  listOfAngleOfMotion: number[];
  listOfAngleOfAttack: number[];
  listOfAngleInToTheWind: number[];
  listOfSpeedX: number[];
  listOfSpeedY: number[];
  listOfSpeed: number[];
  listOfaerodynamicDrag: number[];
  listOfaerodynamicLift: number[];
  listOfAltitude: number[];
  listOfDownRangeDistance: number[];
  listOfThermalPower: number[];
  listOfDynamicPressure: number[];
  listOfAcceleration: number[];
  listOfAccelerationX: number[];
  listOfAccelerationY: number[];
  listOfPitchControl: number[];
  listOfThrottle: number[];
  listOfpropellentRemaining: number[];
}

interface AutoPilotState {
  manualControlOn: boolean;
  holdingPitch: number;
  controlInPutTimeConstant: number;
  pitchHoldOn: boolean;
  autoBoostBackOn: boolean;
  initAutoLandXposDiffThreshold: number;
  propulsiveCorrectionMinHeight: number;
  propulsiveCorrectionAccuracyRequired: number;
  decelerationStageHorizontalAcc: number;
  decelerationStageEstDuration: number;
  finalXposPrediction: number;
  freeFallTimeRemainingPrediction: number;
  boostbackDirection: number;
  boostBackinitCompleted: boolean;
  boostBackAeroDeceleration: boolean;
  boostBackDecelerationStageinitCompleted: boolean;
  accelerationStageCompleted: boolean;
  autoLandOn: boolean;
  initVehicleConfigCompleted: boolean;
  landingSiteXpos: number;
  autoLandFinalStageEngineCount: number;
  finalStagePessimisticAvailableThrust: number;
  dualRaptorMode: boolean;
  trialRaptorMode: boolean;
  finalStagePessimisticAvailableThrustDualRaptorMode: number;
  finalStagePessimisticAvailableThrustTrialRaptorMode: number;
  flipStageEngineCount: number;
  flipStagePessimisticAvailableThrust: number;
  aeroDesentCompleted: boolean;
  aeroDesentMaxCorrectionAngle: number;
  fineTunePercentage: number | undefined;
  fineTuneMultiplier: number;
  fineTuneMaxSpeed: number;
  bellyFlopTriggerAltitude: number;
  flipStageInitted: boolean;
  flipCompleted: boolean;
  flipGoalAngle: number;
  flipEnducedXposChange: number;
  horizontalAdjustmentStageCompleted: boolean;
  horizontalAdjustmentStageInitted: boolean;
  adjustmentMaxAngle: number;
  horizontalAdjustmentDurationEstimateSingleEngine: number;
  horizontalAdjustmentDurationEstimate: number;
  horizontalAdjustmentDurationEstimateDualRaptorMode: number;
  horizontalAdjustmentDurationEstimateTrialRaptorMode: number;
  horizontalAdjustmentTimeLeft: number | undefined;
  horizontalAdjustmentHorizontalSpeedLimit: number;
  horizontalAdjustmentVerticalSpeedLimit: number;
  horizontalAdjustmentDesiredSpeed: number | undefined;
  effectiveVerticalMaxThrust: number | undefined;
  finalStagePessimisticAltitude: number | undefined;
  finalDesentStageInitted: boolean;
  distanceToGround: number | undefined;
  finalDesentStageCompleted: boolean;
  noSteeringHeight: number;
  autoMaxThrustOn: boolean;
  autoTakeOffOn: boolean;
  autoTakeOffInited: boolean;
  aomAt_25km: number;
  aomAt_80km: number;
  horizontalAccelerationByAeroBreakingCorrectionAngle: number;
  aeroBreakingMaxCorrectionAngle: number;
  aeroBreakingFineTuneThreshold: number;
  aeroBreakingAdjDegreePerSec: number;
}

type GameState = WorldState &
  FlightParamsState &
  VehicleParamsState &
  VehicleStatusState &
  DataRecorderState &
  AutoPilotState;

// This is a placeholder for the getRad function, which I'll need to implement.
const getRad = (deg: number) => (deg * Math.PI) / 180;

const initialState: GameState = {
  // World State
  lastFrameRenderedTime: Date.now(),
  frameRate: 60,
  timeAccel: 1,
  renderTimeInterval: 60 / 1,
  planetRadius: 6400000,
  planetCirconference: 2 * 6400000 * Math.PI,
  planetMass: 5.972e24,
  planetTimeToRotate: 24 * 60 * 60,
  planetLineaVelocity: (2 * 6400000 * Math.PI) / (24 * 60 * 60),
  gravitationalConstant: 6.674e-11,
  airDensity: undefined,
  airPressure: undefined,
  gravity: 9.807,
  airResistance_k: 250,
  speedOfSound: 343,
  environmentTime: 0,
  wind: 0,
  gust: 0,
  starBaseXpos: (2 * 6400000 * Math.PI) / 2,

  // Flight Params State
  updatedFrameCount: 0,
  timeSpent: 0,
  altitude: 50 / 2,
  downRangeDistance: (2 * 6400000 * Math.PI) / 2,
  downRangeDistanceNextFrame: (2 * 6400000 * Math.PI) / 2,
  distanceToPlanetCenter: 6400000 + 50 / 2,
  orbitalVelocityAtCurrentAltitude: Math.sqrt(
    (6.674e-11 * 5.972e24) / (6400000 + 50 / 2)
  ),
  trueSpeed: 0,
  speedX: 0,
  speedY: 0,
  machSpeed: 0,
  orbitGravityAccCompensation: 0,
  thrust: 0,
  thrustAcceleration: 0,
  offAxisThrustDifferenceAcceleration: 0,
  twr: 0,
  accelerationX: 0,
  accelerationY: -9.807,
  totalAcceleration: Math.sqrt(0 ** 2 + (-9.807) ** 2),
  thrustVectorForce: 0,
  thrustVectorAcceleration: 0,
  rcsThrust: 0,
  rcsThrustAngularAcceleration: 0,
  angularDragAcceleration: 0,
  pitch: getRad(0),
  pitchRateOfChange: 0,
  pitchRecord: [Infinity, Infinity],
  angularVelocity: 0,
  angularAcceleration: 0,
  angleOfMotion: 0,
  angleOfAttack: 0,
  angleInToTheWind: 0,
  crossSectionalArea: 100,
  aerodynamicDrag: 0,
  aerodynamicLift: 0,
  aerodynamicDragAcceleration: 0,
  thermalPower: 0,
  dynamicPressure: 0,
  perceivedG: 0,
  perceivedG_X: 0,
  perceivedG_Y: 0,

  // Vehicle Params State
  vehicleHeight: 50,
  vehicleDiameter: 9,
  vehicleMaxArea: 9 * 50,
  vehicleMinArea: Math.PI * (9 / 2) ** 2,
  vehicleInFlightMaxArea: 9 * 50,
  vehicleDryMass: 120000,
  propellantMass: 350000,
  vehicleMass: 120000 + 350000,
  dumpRate: 3500,
  dumpLimit: 12000,
  vehicleMomentOfInertia:
    (120000 + 350000) * (9 / 2) ** 2 * 0.25 +
    (120000 + 350000) * 50 ** 2 / 12,
  intergalOfRCubedTimesDx: 97656,
  raptorIgnitionTimeMean: 600,
  raptorIgnitionFaliureRate: 0,
  throttle: 100,
  throttleCurrent: 100,
  throttleSpeed: 60,
  throttleSpeedPerFrame: 60 / (60 / 1),
  throttleUpperLimmit: 100,
  throttleLowwerLimmit: 40,
  raptorOffsetFromCenter: 1,
  raptorN1offAxis: -1,
  raptorN2offAxis: 1 / 2,
  raptorN3offAxis: 1 / 2,
  raptorN1offAxisForceFraction: -(-1) / Math.sqrt((-1) ** 2 + (50 / 2) ** 2),
  raptorN2offAxisForceFraction: -(1 / 2) / Math.sqrt((1 / 2) ** 2 + (50 / 2) ** 2),
  raptorN3offAxisForceFraction: -(1 / 2) / Math.sqrt((1 / 2) ** 2 + (50 / 2) ** 2),
  engineDistanceFromCenterOfMass: 21.8,
  gimbolPosition: 0,
  gimbolSpeed: 600,
  gimbolSpeedPerFrame: 600 / (60 / 1),
  gimbolAngleLimit: getRad(15),
  gimbolPointingDirection: 0,
  maxThrustPerRaptor: 2200 * 1000,
  maxFuelFlowPerRaptor: 650 * (2200000 / 2200000),
  rcsMaxThrust: 800000,
  rcsThrustDistanceFromCenterOfMass: 20,
  rcsRunTimeRemaining: 25,
  finAcuationMaxAngle: 1.03,
  frontFinExtention: 0,
  aftFinExtention: 0,
  finAcuationSpeed: 120,
  finAcuationSpeedPerFrame: 120 / (60 / 1),
  frontFinSurfaceAera: 24.2,
  frontFinDistanceFromCenterOfMass: 23.3,
  aftFinSurfaceAera: 45.8,
  aftFinDistanceFromCenterOfMass: 12.6,
  totalFinSurfaceAera: 24.2 + 45.8,
  frontFinEffectiveAreaFraction: 24.2 * Math.sin(1.03 * 0 * 0.01),
  aftFinEffectiveAreaFraction: 45.8 * Math.sin(1.03 * 0 * 0.01),
  frontFinDrag: 0,
  aftFinDrag: 0,
  frontFinDragAngularAcceleration: 0,
  aftFinDragAngularAcceleration: 0,
  finDragCoefficient: 2,
  gLimit: 13,
  heatLimit: 55,
  dynamicPressureLimit: 50,
  touchDownPitchLimit: 0.09,
  touchDownSpeedLimit: 10,
  translationModeOn: true,
  pitchControl: 0,

  // Vehicle Status State
  onTheGround: false,
  landed: false,
  raptorN1Running: false,
  raptorN2Running: false,
  raptorN3Running: false,
  rcsActive: false,
  finActive: false,
  finLocked: false,
  gearDown: false,
  dumpingFuel: false,
  forceDump: false,
  coldGasLow: false,
  fuelLow: false,
  heatDamagedWarning: false,
  overPressureWarning: false,
  overGloadWarning: false,
  crashed: false,
  inFightBreakUp: false,
  coldGasRunOut: false,
  fuelRunOut: false,
  raptorN1Fail: false,
  raptorN2Fail: false,
  raptorN3Fail: false,
  heatDamaged: false,
  overPressure: false,
  overGload: false,
  flippedOver: false,
  randomFaliure: false,

  // Data Recorder State
  recordTimeInterval: 5,
  timeNodes: [],
  listOfPitchAngle: [],
  listOfAngleOfMotion: [],
  listOfAngleOfAttack: [],
  listOfAngleInToTheWind: [],
  listOfSpeedX: [],
  listOfSpeedY: [],
  listOfSpeed: [],
  listOfaerodynamicDrag: [],
  listOfaerodynamicLift: [],
  listOfAltitude: [],
  listOfDownRangeDistance: [],
  listOfThermalPower: [],
  listOfDynamicPressure: [],
  listOfAcceleration: [],
  listOfAccelerationX: [],
  listOfAccelerationY: [],
  listOfPitchControl: [],
  listOfThrottle: [],
  listOfpropellentRemaining: [],

  // AutoPilot State
  manualControlOn: false,
  holdingPitch: getRad(0),
  controlInPutTimeConstant: (1 / 60) * (60 / 1),
  pitchHoldOn: false,
  autoBoostBackOn: false,
  initAutoLandXposDiffThreshold: 500,
  propulsiveCorrectionMinHeight: 5000,
  propulsiveCorrectionAccuracyRequired: 5000 * 0.05,
  decelerationStageHorizontalAcc: 9.807 * 1.6,
  decelerationStageEstDuration: 0,
  finalXposPrediction: Infinity,
  freeFallTimeRemainingPrediction: Infinity,
  boostbackDirection: 0,
  boostBackinitCompleted: false,
  boostBackAeroDeceleration: true,
  boostBackDecelerationStageinitCompleted: false,
  accelerationStageCompleted: false,
  autoLandOn: false,
  initVehicleConfigCompleted: false,
  landingSiteXpos: (2 * 6400000 * Math.PI) / 2,
  autoLandFinalStageEngineCount: 1,
  finalStagePessimisticAvailableThrust: 1 * 2200000,
  dualRaptorMode: false,
  trialRaptorMode: false,
  finalStagePessimisticAvailableThrustDualRaptorMode: 1 * 2200000 * 2,
  finalStagePessimisticAvailableThrustTrialRaptorMode: 1 * 2200000 * 3,
  flipStageEngineCount: 1,
  flipStagePessimisticAvailableThrust: 1 * 2200000 * 40 * 0.01,
  aeroDesentCompleted: false,
  aeroDesentMaxCorrectionAngle: getRad(3),
  fineTunePercentage: undefined,
  fineTuneMultiplier: 2,
  fineTuneMaxSpeed: 5,
  bellyFlopTriggerAltitude: 0,
  flipStageInitted: false,
  flipCompleted: false,
  flipGoalAngle: getRad(10),
  flipEnducedXposChange: 100,
  horizontalAdjustmentStageCompleted: false,
  horizontalAdjustmentStageInitted: false,
  adjustmentMaxAngle: getRad(20),
  horizontalAdjustmentDurationEstimateSingleEngine: 5.5,
  horizontalAdjustmentDurationEstimate: 5.5,
  horizontalAdjustmentDurationEstimateDualRaptorMode: 5.5 * 1.5,
  horizontalAdjustmentDurationEstimateTrialRaptorMode: 5.5 * 2,
  horizontalAdjustmentTimeLeft: undefined,
  horizontalAdjustmentHorizontalSpeedLimit: 5,
  horizontalAdjustmentVerticalSpeedLimit: -30,
  horizontalAdjustmentDesiredSpeed: undefined,
  effectiveVerticalMaxThrust: undefined,
  finalStagePessimisticAltitude: undefined,
  finalDesentStageInitted: false,
  distanceToGround: undefined,
  finalDesentStageCompleted: false,
  noSteeringHeight: 5,
  autoMaxThrustOn: false,
  autoTakeOffOn: false,
  autoTakeOffInited: false,
  aomAt_25km: getRad(55),
  aomAt_80km: getRad(85),
  horizontalAccelerationByAeroBreakingCorrectionAngle: 0,
  aeroBreakingMaxCorrectionAngle: Math.PI * 0.5,
  aeroBreakingFineTuneThreshold: 0.5,
  aeroBreakingAdjDegreePerSec: getRad(30),
};

export const useGameStore = create<GameState>(() => initialState);
