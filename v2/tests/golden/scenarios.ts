/**
 * The flights that get golden fixtures.
 *
 * Every scenario is recorded with the autopilot flying, because an unpowered
 * ballistic drop exercises almost none of the code that makes this a game. The
 * autopilot touches the control primitives, the engine commands, the staging
 * logic and the RNG, so a golden that flies is a far tighter contract.
 */
import * as cmd from '$core/control/commands';
import { createFlags, FLAG_COMBINATIONS, flagsId, type Flags } from '$core/flags';
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

const BASE_SPECS: readonly GoldenSpec[] = [
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

/**
 * One representative scenario per fidelity-flag combination.
 *
 * M2.5 requires a golden fixture for every combination that ships — "off by
 * default" means nothing if the on path is untested. Recording all seven
 * scenarios against all six combinations would be 42 fixtures of mostly
 * duplicated information, so each non-default combination gets the scenario
 * that actually exercises it:
 *
 *   planetCenteredGravity  reentry, the only preset at orbital speed
 *   realSpeedOfSound       booster-sep, which spans Mach 1 to Mach 4 in air
 *   fullISA                reentry, which crosses every atmospheric layer
 *   collapsedTrig          before-flip, which sweeps the quadrant boundaries
 *   all four               reentry, which is what M2.10's feel review flies
 *
 * before-flip is the right one for collapsedTrig specifically because that flag
 * only does anything where the ladders' branches meet. The flip swings pitch,
 * angle of motion and the gimbal through every quadrant in sixty seconds; a
 * scenario that stayed in one quadrant would record a fixture that could not
 * tell the two forms apart and would pass whatever the flag did.
 *
 * The default combination keeps all seven scenarios: that is the contract on
 * the shipped configuration, and it is the one that must never drift.
 */
function flaggedSpec(base: GoldenSpec, flags: Flags): GoldenSpec {
  const id = flagsId(flags);
  return {
    id: `${base.id}--${id}`,
    steps: base.steps,
    setup: `${base.setup} [flags: ${id}]`,
    build: () => {
      const s = base.build();
      s.flags = flags;
      return s;
    },
  };
}

const REPRESENTATIVE: Record<string, string> = {
  planetCenteredGravity: 'reentry-autoland',
  realSpeedOfSound: 'booster-sep-boostback',
  fullISA: 'reentry-autoland',
  collapsedTrig: 'before-flip-autoland',
  'planetCenteredGravity+realSpeedOfSound+fullISA+collapsedTrig': 'reentry-autoland',
};

const FLAGGED_SPECS: readonly GoldenSpec[] = FLAG_COMBINATIONS.flatMap((combination) => {
  const flags = createFlags(combination);
  const id = flagsId(flags);
  if (id === 'default') return [];
  const base = BASE_SPECS.find((spec) => spec.id === REPRESENTATIVE[id]);
  if (!base) throw new Error(`no representative scenario declared for flag set "${id}"`);
  return [flaggedSpec(base, flags)];
});

export const GOLDEN_SPECS: readonly GoldenSpec[] = [...BASE_SPECS, ...FLAGGED_SPECS];
