/** Owns selected-body routing, with one fixed clock for a two-body mission.
 * The selected loop is a stable projection for existing binders and recorders;
 * neither selection nor an operator command advances either physical body. */
import { advanceFixed, createLoopState, type AdvanceOptions } from '$app/loop';
import { advanceMission, createMissionLoop, type MissionAdvanceOptions, type MissionLoop } from '$app/mission-loop';
import { applyControl, type ControlEvent } from '$app/controls';
import { createIntroState, createScenarioVehicle, type ScenarioPreset } from '$core/scenarios';
import { createHotStageMission, type MissionState, type MissionInput } from '$core/mission';
import { step, NO_INPUT, type StepInput } from '$core/step';
import { DEFAULT_SEED, type SimState } from '$core/state';
import { SHIP, type VehicleDefinition } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';

export function createMissionController() {
  const loop = createLoopState(createIntroState());
  let model: VehicleDefinition = SHIP;
  let missionLoop: MissionLoop | undefined;
  let stagePending = false;
  let callback: AdvanceOptions['onStep'];
  let cachedOptions: AdvanceOptions | undefined;
  const missionInput: { stage?: boolean; ship?: StepInput; booster?: StepInput } = {};

  function selected(mission: MissionState): SimState {
    return model.id === 'ship' ? mission.ship : mission.booster;
  }
  function project(inStep = false) {
    if (!missionLoop) return;
    loop.state = selected(missionLoop.state);
    loop.previous = selected(missionLoop.previous);
    loop.accumulator = missionLoop.accumulator;
    loop.totalSteps = missionLoop.totalSteps + (inStep ? 1 : 0);
    loop.simulatedTime = missionLoop.state.elapsedTime;
  }
  const onMissionStep = () => {
    project(true);
    callback?.(loop.state);
  };
  const missionOptions: {
    timeWarp?: number; slowMotion?: number; paused?: boolean;
    input: MissionInput; onStep: NonNullable<MissionAdvanceOptions['onStep']>;
  } = { input: missionInput, onStep: onMissionStep };
  const singleStep = (previous: SimState, dt: number, input: StepInput) => step(previous, dt, input, model);
  const emptyOptions: AdvanceOptions = {};

  function reset(initial: SimState) {
    loop.state = initial;
    loop.previous = initial;
    loop.accumulator = 0;
    loop.totalSteps = 0;
    loop.simulatedTime = 0;
    stagePending = false;
    cachedOptions = undefined;
  }

  return {
    loop,
    get model() { return model; },
    get mission() { return missionLoop?.state; },
    get previousMission() { return missionLoop?.previous; },
    get stagePending() { return stagePending; },
    startFlight(preset: ScenarioPreset) {
      const flight = createScenarioVehicle(preset);
      missionLoop = undefined;
      model = flight.vehicle;
      reset(flight.state);
    },
    startHotStage(seed = DEFAULT_SEED) {
      missionLoop = createMissionLoop(createHotStageMission(seed));
      model = SHIP;
      reset(missionLoop.state.ship);
    },
    selectVehicle(id: VehicleDefinition['id']) {
      if (!missionLoop) return;
      model = id === 'ship' ? SHIP : SUPER_HEAVY;
      project();
    },
    emit(event: ControlEvent) {
      if (model.id === 'super-heavy' && event.type === 'autoDeorbit') return;
      // The attached demonstration is manually staged; its core intentionally
      // does not run either free-flight autopilot until physical separation.
      if (missionLoop?.state.phase === 'attached' && (
        event.type === 'autoLand' || event.type === 'boostBack' || event.type === 'autoDeorbit'
        || event.type === 'autoTakeOff' || event.type === 'autoMaxThrust' || event.type === 'pitchHold'
      )) return;
      applyControl(loop.state, event, model);
    },
    stage() { if (missionLoop?.state.phase === 'attached') stagePending = true; },
    advance(frameTime: number, options: AdvanceOptions = emptyOptions) {
      if (!missionLoop) return advanceFixed(loop, frameTime, options, options.input ?? NO_INPUT, singleStep);
      if (cachedOptions !== options) {
        cachedOptions = options;
        callback = options.onStep;
        missionOptions.timeWarp = options.timeWarp ?? 1;
        missionOptions.slowMotion = options.slowMotion ?? 1;
        missionOptions.paused = options.paused ?? false;
      }
      missionInput.stage = stagePending;
      missionInput.ship = model.id === 'ship' ? options.input ?? NO_INPUT : NO_INPUT;
      missionInput.booster = model.id === 'super-heavy' ? options.input ?? NO_INPUT : NO_INPUT;
      const result = advanceMission(missionLoop, frameTime, missionOptions);
      if (result.steps > 0) stagePending = false;
      project();
      return result;
    },
  };
}

export type MissionController = ReturnType<typeof createMissionController>;
