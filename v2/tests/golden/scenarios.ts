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
    id: 'landing-burn-headwind',
    steps: s(45),
    /*
      M11.1. The first fixture with non-zero wind, and the only way the wiring
      is exercised by a golden at all — every other scenario is flown at
      `world.wind = 0`, where the change is provably a no-op. Ten metres per
      second of air moving downrange, against a vehicle descending nearly
      vertically: the relative wind arrives from ahead, the airspeed exceeds the
      groundspeed, and the aerodynamic angles part company with the ground
      track. If this fixture ever matches `landing-burn-autoland` the wind is not
      being read.
    */
    setup: 'autoLand, final descent, into a 10 m/s downrange wind',
    build: () => {
      const st = createScenarioState(ALL_SCENARIOS.find((x) => x.id === 'landing-burn')!);
      st.world.wind = 10;
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

/**
 * ONE PHYSICS, ONE FIXTURE SET — M2.10.
 *
 * Until M2.10 this file also generated a fixture per shipped fidelity-flag
 * combination, because "off by default" is worth nothing if the on path is
 * untested. The flags are gone: the fidelity physics is the only physics, so
 * the seven scenarios above are the whole behavioural contract again.
 *
 * `replay.test.ts` asserts that no flag-suffixed fixture survives, so the
 * removal cannot half-happen.
 */
