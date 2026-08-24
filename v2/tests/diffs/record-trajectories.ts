/**
 * Record a compact trajectory per scenario to a JSON file.
 *
 * Used to build the before/after diffs CLAUDE.md's Bug-fix tier requires: run
 * this on the pre-fix source, run it again on the fixed source, and diff the two
 * files. Recording from the real source both times means the "before" side is
 * the code that actually shipped, not a reconstruction of it.
 *
 *   npx vite-node tests/diffs/record-trajectories.ts <out.json>
 */
import { writeFileSync } from 'node:fs';
import { createIntroState, createScenarioState, LAUNCH_PAD, PRESETS } from '$core/scenarios';
import type { SimState } from '$core/state';
import { step } from '$core/step';

const DT = 1 / 120;

const SPECS = [
  { id: 'launch-pad', build: () => createScenarioState(LAUNCH_PAD), steps: 60 * 120 },
  ...PRESETS.map((p) => ({ id: p.id, build: () => createScenarioState(p), steps: 90 * 120 })),
  { id: 'intro', build: () => createIntroState(), steps: 45 * 120 },
];

const FIELDS = {
  altitude: (s: SimState) => s.kinematics.altitude,
  downRange: (s: SimState) => s.kinematics.downRangeDistance,
  speedX: (s: SimState) => s.kinematics.speedX,
  speedY: (s: SimState) => s.kinematics.speedY,
  mach: (s: SimState) => s.kinematics.machSpeed,
  pitch: (s: SimState) => s.kinematics.pitch as number,
  airDensity: (s: SimState) => s.atmosphere.airDensity,
  thermalPower: (s: SimState) => s.forces.thermalPower,
  dynamicPressure: (s: SimState) => s.forces.dynamicPressure,
  propellant: (s: SimState) => s.vehicle.propellantMass,
} as const;

const outcome = (s: SimState) =>
  s.failures.crashed
    ? 'CRASHED'
    : s.failures.inFlightBreakUp
      ? 'BROKE UP'
      : s.status.landed
        ? 'landed'
        : s.status.onTheGround
          ? 'on ground'
          : 'in flight';

const out: Record<string, unknown> = {};
for (const spec of SPECS) {
  let s = spec.build();
  // Every 120th step (1 Hz), which is enough to locate a divergence in time.
  const track: Record<string, number[]> = {};
  for (const k of Object.keys(FIELDS)) track[k] = [];
  const push = (st: SimState) => {
    for (const [k, get] of Object.entries(FIELDS)) track[k]!.push(get(st));
  };
  push(s);
  for (let i = 1; i <= spec.steps; i++) {
    s = step(s, DT);
    if (i % 120 === 0) push(s);
  }
  out[spec.id] = { steps: spec.steps, outcome: outcome(s), track };
  console.log(`${spec.id.padEnd(14)} ${outcome(s).padEnd(10)} alt ${s.kinematics.altitude.toFixed(1)}`);
}

const path = process.argv[2] ?? 'trajectories.json';
writeFileSync(path, JSON.stringify(out));
console.log(`\nwritten to ${path}`);
