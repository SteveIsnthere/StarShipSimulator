/**
 * The ground `autoLand` covers from the entry interface to touchdown, measured
 * on the deorbit acceptance flight.
 *
 * `DEORBIT_ENTRY_RANGE` (src/core/constants.ts) is the deorbit burn's aim: it
 * places the vacuum conic's entry-interface crossing that far short of the pad.
 * The measured crossing-to-touchdown distance differs from it by a few per cent
 * (the air bends the real crossing), so the constant's health is the MISS: when
 * autoLand changes how it descends, the miss moves, and the re-derived constant
 * is the old one plus the miss (`npm run deorbit:range` prints it). Phase 5
 * re-measures it in every guidance commit, and `tests/core/deorbit-range.test.ts`
 * fails when the constant goes stale.
 */
import { DT } from '$app/loop';
import * as cmd from '$core/control/commands';
import * as C from '$core/constants';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';

export interface DeorbitRange {
  readonly outcome: 'landed' | 'crashed' | 'brokeUp' | 'flying';
  /** m — downrange where the descent crossed the entry interface */
  readonly entryDownRange: number;
  /** m — downrange at touchdown */
  readonly touchdownDownRange: number;
  /** m — touchdown − entry: what DEORBIT_ENTRY_RANGE stands for */
  readonly range: number;
  /** m — touchdown − pad */
  readonly miss: number;
  /** t — propellant left at touchdown */
  readonly propellant: number;
}

export function measureDeorbitRange(
  mutate: (s: ReturnType<typeof createScenarioState>) => void = () => {},
  maxSeconds = 8_000,
): DeorbitRange {
  let s = createScenarioState(getScenario('deorbit')!);
  mutate(s);
  cmd.toggleAutoDeorbit(s);
  let entry = Number.NaN;
  let outcome: DeorbitRange['outcome'] = 'flying';
  for (let i = 1; i <= Math.round(maxSeconds / DT); i++) {
    const before = s;
    s = step(s, DT);
    if (
      Number.isNaN(entry) &&
      before.kinematics.altitude > C.ENTRY_INTERFACE_ALTITUDE &&
      s.kinematics.altitude <= C.ENTRY_INTERFACE_ALTITUDE &&
      s.kinematics.speedY < 0
    ) {
      entry = s.kinematics.downRangeDistance;
    }
    if (s.failures.inFlightBreakUp) outcome = 'brokeUp';
    else if (s.failures.crashed) outcome = 'crashed';
    else if (s.status.landed) outcome = 'landed';
    if (outcome !== 'flying') break;
  }
  const touchdown = s.kinematics.downRangeDistance;
  return {
    outcome,
    entryDownRange: entry,
    touchdownDownRange: touchdown,
    range: touchdown - entry,
    miss: touchdown - C.starBaseXPos,
    propellant: s.vehicle.propellantMass / 1000,
  };
}
