/**
 * The flights that get golden fixtures.
 *
 * Every scenario is recorded with the autopilot flying, because an unpowered
 * ballistic drop exercises almost none of the code that makes this a game. The
 * autopilot touches the control primitives, the engine commands, the staging
 * logic and the RNG, so a golden that flies is a far tighter contract.
 */
import * as cmd from '$core/control/commands';
import { ALL_SCENARIOS, createIntroState, createScenarioState } from '$core/scenarios';
import type { SimState } from '$core/state';

export interface GoldenSpec {
  readonly id: string;
  readonly steps: number;
  readonly setup: string;
  readonly build: () => SimState;
}

/** 120 Hz, so steps = seconds * 120. */
const s = (seconds: number) => seconds * 120;

export const GOLDEN_SPECS: readonly GoldenSpec[] = [
  {
    id: 'launch-pad-takeoff',
    steps: s(90),
    setup: 'autoTakeOff from the pad',
    build: () => {
      const st = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'launch-pad')!);
      cmd.toggleAutoTakeOff(st);
      return st;
    },
  },
  {
    id: 'booster-sep-boostback',
    steps: s(120),
    setup: 'autoBoostBack from stage separation',
    build: () => {
      const st = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'booster-sep')!);
      cmd.toggleBoostBack(st);
      return st;
    },
  },
  {
    id: 'rtls-boostback',
    steps: s(120),
    setup: 'autoBoostBack, return to launch site',
    build: () => {
      const st = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'rtls')!);
      cmd.toggleBoostBack(st);
      return st;
    },
  },
  {
    id: 'reentry-autoland',
    steps: s(180),
    setup: 'autoLand from orbital re-entry',
    build: () => {
      const st = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'reentry')!);
      cmd.toggleAutoLand(st);
      return st;
    },
  },
  {
    id: 'before-flip-autoland',
    steps: s(60),
    setup: 'autoLand through the flip',
    build: () => {
      const st = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'before-flip')!);
      cmd.toggleAutoLand(st);
      return st;
    },
  },
  {
    id: 'landing-burn-autoland',
    steps: s(45),
    setup: 'autoLand, final descent only',
    build: () => {
      const st = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'landing-burn')!);
      cmd.toggleAutoLand(st);
      return st;
    },
  },
  {
    id: 'intro-demo',
    steps: s(45),
    // CLAUDE.md: "what must never change". This fixture is what enforces that.
    setup: 'the intro auto-landing demo',
    build: () => createIntroState(),
  },
];
