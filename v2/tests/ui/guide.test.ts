/**
 * M12.6: the guide cannot lie about the controls.
 *
 * `InfoView.svelte`'s header states the claim this file enforces: 2021's guide
 * was prose maintained beside the code and had already drifted — it said "+ or
 * -" to zoom where the code bound "=" and "-". The keybind list has been
 * generated since M6.1. The autopilot modes and the scenarios were still prose
 * until now, and had drifted the same way: the guide described five modes in
 * words written by hand, and listed no scenarios while the menu grew eleven.
 *
 * These tests are about the JOIN, not the rendering. The rendering is asserted
 * in the browser.
 */
import { describe, expect, it } from 'vitest';
import { AUTOPILOT_MODES, GUIDE_SCENARIOS, scenarioStats } from '$ui/guide';
import { ALL_SCENARIOS, INTRO, LAUNCH_PAD } from '$core/scenarios';
import { CONTROL_TESTIDS } from '$ui/testids';
import { applyControl } from '$ui/controls';
import { createScenarioState } from '$core/scenarios';

describe('the autopilot table', () => {
  it('lists every autopilot control the testid contract knows about', () => {
    /*
      THE JOIN THAT MATTERS. `CONTROL_TESTIDS` is the promise the markup keeps
      to the e2e suite; this table is what the yoke panel renders and what the
      guide describes. A mode added to the rail without a line in the guide, or
      described in the guide without a button, breaks here.
    */
    const documented = AUTOPILOT_MODES.map((mode) => mode.testid).sort();
    const known = CONTROL_TESTIDS.filter(
      (id) => id.startsWith('auto-') || id === 'boost-back' || id === 'pitch-hold',
    )
      // `auto-max-thrust` is the Thrust Safe Guard, which lives with the ENGINE
      // controls and is not an autopilot mode — it holds a throttle, not an
      // attitude. It is described in the guide's Basics section instead.
      .filter((id) => id !== 'auto-max-thrust')
      .sort();
    expect(documented).toEqual([...known]);
  });

  it('and every mode emits an event the simulation accepts', () => {
    // A label and a sentence are easy to write; this is what makes the row a
    // control rather than a description of one.
    for (const mode of AUTOPILOT_MODES) {
      const state = createScenarioState(LAUNCH_PAD);
      expect(() => applyControl(state, mode.event), mode.label).not.toThrow();
    }
  });

  it('and says something about each one', () => {
    for (const mode of AUTOPILOT_MODES) {
      expect(mode.does.length, mode.label).toBeGreaterThan(20);
      expect(mode.label.length, mode.label).toBeGreaterThan(0);
    }
  });
});

describe('the scenario list', () => {
  it('is every scenario the menu offers, minus the one nobody starts', () => {
    expect(GUIDE_SCENARIOS.map((s) => s.id)).toEqual(
      ALL_SCENARIOS.filter((s) => s.id !== INTRO.id).map((s) => s.id),
    );
    // The intro is what is already running when a player arrives, not a choice.
    expect(GUIDE_SCENARIOS.map((s) => s.id)).not.toContain(INTRO.id);
  });

  it('and the stat line reads the preset rather than repeating it', () => {
    // Under a kilometre it is metres; over it, kilometres — the same switch the
    // HUD makes, for the same reason.
    expect(scenarioStats(LAUNCH_PAD)).toContain(' M · ');
    const orbital = GUIDE_SCENARIOS.find((s) => s.altitude >= 1000)!;
    expect(scenarioStats(orbital)).toContain(' KM · ');
    for (const preset of GUIDE_SCENARIOS) {
      const line = scenarioStats(preset);
      expect(line, preset.id).toContain(`${preset.propellant} T`);
      expect(line, preset.id).toContain(
        `${Math.round(Math.hypot(preset.speedX, preset.speedY))} M/S`,
      );
    }
  });
});
