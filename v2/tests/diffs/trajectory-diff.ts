/**
 * Six-scenario before/after trajectory diff.
 *
 * CLAUDE.md's Bug-fix tier requires a before/after trajectory diff on all six
 * scenarios, committed with the fix. This produces it: run every scenario under
 * both the old and new behaviour and report where, and by how much, they part.
 *
 * The point is not to prove the change is small — a bug fix is allowed to change
 * a lot. It is to make the size and shape of the change VISIBLE, so "this fixes
 * the stratosphere" cannot quietly also mean "and every landing now misses".
 */
import { createIntroState, createScenarioState, PRESETS, LAUNCH_PAD } from '$core/scenarios';
import type { SimState } from '$core/state';
import { step } from '$core/step';

const DT = 1 / 120;

/** Quantities a reader actually judges a trajectory by. */
const TRACKED = [
  ['altitude', (s: SimState) => s.kinematics.altitude, 'm'],
  ['downRange', (s: SimState) => s.kinematics.downRangeDistance, 'm'],
  ['speedX', (s: SimState) => s.kinematics.speedX, 'm/s'],
  ['speedY', (s: SimState) => s.kinematics.speedY, 'm/s'],
  ['mach', (s: SimState) => s.kinematics.machSpeed, ''],
  ['pitch', (s: SimState) => s.kinematics.pitch as number, 'rad'],
  ['airDensity', (s: SimState) => s.atmosphere.airDensity, 'kg/m^3'],
  ['thermalPower', (s: SimState) => s.forces.thermalPower, ''],
  ['dynamicPressure', (s: SimState) => s.forces.dynamicPressure, 'psi'],
  ['propellant', (s: SimState) => s.vehicle.propellantMass, 'kg'],
] as const;

export interface FieldDiff {
  readonly field: string;
  readonly unit: string;
  readonly before: number;
  readonly after: number;
  readonly absolute: number;
  readonly relative: number;
}

export interface ScenarioDiff {
  readonly scenario: string;
  readonly steps: number;
  /** Step at which any tracked field first differs, or null if identical. */
  readonly firstDivergenceStep: number | null;
  readonly firstDivergenceField: string | null;
  /** End-of-run comparison per field. */
  readonly final: readonly FieldDiff[];
  readonly outcomeBefore: string;
  readonly outcomeAfter: string;
}

function outcome(s: SimState): string {
  if (s.failures.crashed) return 'CRASHED';
  if (s.failures.inFlightBreakUp) return 'BROKE UP';
  if (s.status.landed) return 'landed';
  if (s.status.onTheGround) return 'on the ground';
  return 'in flight';
}

/** Every scenario the diff covers: the five presets plus the pad and the intro. */
export function diffScenarios(): ReadonlyArray<{ id: string; build: () => SimState; steps: number }> {
  return [
    { id: LAUNCH_PAD.id, build: () => createScenarioState(LAUNCH_PAD), steps: 60 * 120 },
    ...PRESETS.map((p) => ({
      id: p.id,
      build: () => createScenarioState(p),
      steps: 90 * 120,
    })),
    { id: 'intro', build: () => createIntroState(), steps: 45 * 120 },
  ];
}

/**
 * Run one scenario twice, under `before` and `after`, and diff.
 *
 * The two callbacks set whatever global switch the fix is behind — a flag, a
 * patched module, anything. Keeping it a callback means this file does not need
 * to know what is being changed.
 */
export function diffScenario(
  spec: { id: string; build: () => SimState; steps: number },
  before: () => void,
  after: () => void,
): ScenarioDiff {
  const run = (configure: () => void): SimState[] => {
    configure();
    const history: SimState[] = [];
    let s = spec.build();
    history.push(s);
    for (let i = 1; i <= spec.steps; i++) {
      s = step(s, DT);
      history.push(s);
    }
    return history;
  };

  const a = run(before);
  const b = run(after);

  let firstDivergenceStep: number | null = null;
  let firstDivergenceField: string | null = null;
  for (let i = 0; i < a.length && firstDivergenceStep === null; i++) {
    for (const [name, get] of TRACKED) {
      if (!Object.is(get(a[i]!), get(b[i]!))) {
        firstDivergenceStep = i;
        firstDivergenceField = name;
        break;
      }
    }
  }

  const lastA = a[a.length - 1]!;
  const lastB = b[b.length - 1]!;
  const final = TRACKED.map(([name, get, unit]) => {
    const x = get(lastA);
    const y = get(lastB);
    const absolute = y - x;
    const scale = Math.max(Math.abs(x), Math.abs(y));
    return {
      field: name,
      unit,
      before: x,
      after: y,
      absolute,
      relative: scale === 0 ? 0 : absolute / scale,
    };
  });

  return {
    scenario: spec.id,
    steps: spec.steps,
    firstDivergenceStep,
    firstDivergenceField,
    final,
    outcomeBefore: outcome(lastA),
    outcomeAfter: outcome(lastB),
  };
}

/** Human-readable report, printed into the commit. */
export function formatDiff(diffs: readonly ScenarioDiff[]): string {
  const lines: string[] = [];
  for (const d of diffs) {
    lines.push(`\n${d.scenario}  (${d.steps} steps)`);
    lines.push(
      `  outcome: ${d.outcomeBefore}${d.outcomeBefore === d.outcomeAfter ? '' : `  ->  ${d.outcomeAfter}`}`,
    );
    lines.push(
      d.firstDivergenceStep === null
        ? '  identical throughout'
        : `  first divergence: step ${d.firstDivergenceStep} in ${d.firstDivergenceField}`,
    );
    for (const f of d.final) {
      if (f.absolute === 0) continue;
      const pct = (f.relative * 100).toFixed(2);
      lines.push(
        `    ${f.field.padEnd(16)} ${f.before.toPrecision(8).padStart(14)} -> ` +
          `${f.after.toPrecision(8).padStart(14)} ${f.unit.padEnd(7)} (${pct}%)`,
      );
    }
  }
  return lines.join('\n');
}
