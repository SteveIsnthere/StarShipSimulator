/** Phase 8 Fidelity: descending auto-land begins return, while an explicit
 * boostback request and existing/ascending phases retain their real policy.
 */
import { expect, it, vi } from 'vitest';
import { runBoosterAutopilot, runBoosterPolicy } from '$core/autopilot/booster';
import { createScenarioState, getScenario } from '$core/scenarios';
import { cloneState } from '$core/state';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import type { MechanicalAdvance } from '$core/control/mechanical';
const DT = 1 / 120;
function descending() {
  const state = createScenarioState({ ...getScenario('landing-burn')!, altitude: 5000, speedY: -20 }, 123, SUPER_HEAVY);
  state.autopilot.autoLandOn = true;
  return state;
}
for (const route of ['wrapper', 'policy'] as const) {
  it(`${route}: descending auto-land starts coast instead of an unnecessary boostback`, () => {
    const state = descending();
    const advance = vi.fn<MechanicalAdvance>(() => { throw new Error('No forecast may execute inside this control boundary'); });
    if (route === 'wrapper') runBoosterAutopilot(state, DT, SUPER_HEAVY, advance);
    else runBoosterPolicy(state, DT, SUPER_HEAVY);
    expect(state.autopilot.boosterPhase).toBe('coast');
    expect(state.engines.running.some(Boolean)).toBe(false);
    expect(advance).not.toHaveBeenCalled();
  });
}
it.each([false, true])('descending explicit boostback keeps priority with autoLand=%s', autoLand => {
  const state = descending();
  state.autopilot.autoLandOn = autoLand;
  state.autopilot.autoBoostBackOn = true;
  runBoosterPolicy(state, DT, SUPER_HEAVY);
  expect(state.autopilot.boosterPhase).toBe('align-boost');
});
it.each([0, 20])('non-descending auto-land retains align-boost at vy=%s', speedY => {
  const state = descending(); state.kinematics.speedY = speedY;
  runBoosterPolicy(state, DT, SUPER_HEAVY);
  expect(state.autopilot.boosterPhase).toBe('align-boost');
});
it.each(['align-boost', 'boostback', 'coast', 'entry', 'terminal'] as const)('does not replace an existing %s phase', phase => {
  const state = descending(); state.autopilot.boosterPhase = phase;
  runBoosterPolicy(state, DT, SUPER_HEAVY);
  expect(state.autopilot.boosterPhase).toBe(phase);
});
it.each(['booster-sep', 'rtls'])('preserves the original ascending %s commands exactly', id => {
  const implicit = createScenarioState(getScenario(id)!, 123, SUPER_HEAVY);
  implicit.autopilot.autoLandOn = true;
  const explicit = cloneState(implicit); explicit.autopilot.boosterPhase = 'align-boost';
  runBoosterPolicy(implicit, DT, SUPER_HEAVY);
  runBoosterPolicy(explicit, DT, SUPER_HEAVY);
  expect(implicit).toEqual(explicit);
});
