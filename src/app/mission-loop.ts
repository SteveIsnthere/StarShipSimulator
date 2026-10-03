/** Mission adapter for the one shipped fixed-step accumulator. */
import { stepMission, NO_MISSION_INPUT, type MissionState, type MissionInput } from '$core/mission';
import { createFixedLoopState, advanceFixed, type LoopState, type AdvanceOptions, type AdvanceResult } from './loop';

export type MissionLoop = LoopState<MissionState>;
export type MissionAdvanceOptions = AdvanceOptions<MissionState, MissionInput>;

export function createMissionLoop(initial: MissionState): MissionLoop {
  return createFixedLoopState(initial);
}

export function advanceMission(loop: MissionLoop, frameTime: number, options: MissionAdvanceOptions = {}): AdvanceResult {
  return advanceFixed(loop, frameTime, options, options.input ?? NO_MISSION_INPUT, stepMission);
}
