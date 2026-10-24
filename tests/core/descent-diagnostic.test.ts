/** Trace interpretation controls only, not successful flight acceptance. */
import { expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createScenarioState, getScenario } from '$core/scenarios';
import { cloneState } from '$core/state';
import { rad } from '$core/units';
import { CATCH, SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { starBaseXPos } from '$core/constants';
import { catchEligible } from '$core/physics/tower-catch';
import { diagnosticCatchCrossing, diagnosticJSON, startDescentDiagnostic } from '../support/descent-diagnostic';

it('preserves nonfinite, undefined and signed-zero evidence without JSON null', () => {
  const text = diagnosticJSON({ nan: NaN, pos: Infinity, neg: -Infinity, zero: -0, missing: undefined });
  expect(JSON.parse(text)).toEqual({ nan: { $diagnostic: 'number', value: 'NaN' },
    pos: { $diagnostic: 'number', value: 'Infinity' }, neg: { $diagnostic: 'number', value: '-Infinity' },
    zero: { $diagnostic: 'number', value: '-0' }, missing: { $diagnostic: 'undefined' } });
  expect(text).not.toContain('null');
});

it('tags opaque operation leaves in objects and arrays instead of dropping them', () => {
  const operation = () => {};
  expect(JSON.parse(diagnosticJSON({ operation, operations: [operation] }))).toEqual({
    operation: { $diagnostic: 'opaque-function', name: 'operation' },
    operations: [{ $diagnostic: 'opaque-function', name: 'operation' }],
  });
});

for (const [name, pitch, angularVelocity, speedX, expected] of [
  ['healthy crossing', 0, 0, 0.5, true],
  ['negative excess pitch', -2 * CATCH.maxPitch, 0, 0.5, false],
  ['lug velocity unlike body centre', 0, 1, 0, false],
  ['nonfinite crossing velocity', 0, 0, NaN, false],
] as const) {
  it(`classifies ${name} against independent canonical contact`, () => {
    const previous = createScenarioState(getScenario('landing-burn')!, undefined, SUPER_HEAVY);
    const arm = CATCH.lugStation - SUPER_HEAVY.height / 2;
    previous.kinematics.pitch = rad(pitch);
    previous.kinematics.downRangeDistance = starBaseXPos - arm * Math.sin(pitch);
    previous.kinematics.altitude = CATCH.planeAltitude - arm * Math.cos(pitch) + 1;
    previous.kinematics.speedX = speedX;
    previous.kinematics.speedY = -2;
    previous.kinematics.angularVelocity = angularVelocity;
    const current = cloneState(previous);
    current.kinematics.altitude -= 2;
    const before = diagnosticJSON({ previous, current });
    const crossing = diagnosticCatchCrossing(previous, current)!;
    expect(crossing.fraction).toBe(0.5);
    expect(crossing.eligible).toBe(expected);
    expect(crossing.eligible).toBe(catchEligible(previous, current, SUPER_HEAVY));
    expect(diagnosticJSON({ previous, current })).toBe(before);
  });
}

it('rejects any row outside the predeclared two-case selection before profiling', async () => {
  await expect(startDescentDiagnostic('ship/reentry: autopilot lands or catches',
    '/not-created-descent-diagnostic')).rejects.toThrow('only the two predeclared booster rows');
});

it('identifies a secured post-contact endpoint as non-assessable, not a rejected catch', () => {
  const previous = createScenarioState(getScenario('landing-burn')!, undefined, SUPER_HEAVY);
  const arm = CATCH.lugStation - SUPER_HEAVY.height / 2;
  previous.kinematics.altitude = CATCH.planeAltitude - arm + 1;
  previous.kinematics.pitch = rad(0);
  const current = cloneState(previous);
  current.kinematics.altitude -= 1;
  current.status.landed = true;
  current.kinematics.speedX = current.kinematics.speedY = 0;
  const crossing = diagnosticCatchCrossing(previous, current)!;
  expect(crossing.assessment).toBe('already-secured/post-contact');
  expect(crossing.eligible).toBeUndefined();
  current.status.landed = false;
  current.failures.crashed = true;
  current.damage!.terminal.active = true;
  expect(diagnosticCatchCrossing(previous, current)!.assessment).toBe('terminal-reset');
  expect(diagnosticCatchCrossing(previous, current)!.eligible).toBeUndefined();
});

it('refuses to replace a consumed trace before connecting a profiler', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'starship-descent-custody-'));
  try {
    const trace = join(directory, 'before-flip.trace.json');
    writeFileSync(trace, 'preserved receipt');
    await expect(startDescentDiagnostic('super-heavy/before-flip: autopilot lands or catches', directory))
      .rejects.toThrow('Refusing to replace a consumed diagnostic receipt');
    expect(readFileSync(trace, 'utf8')).toBe('preserved receipt');
  } finally { rmSync(directory, { recursive: true }); }
});
