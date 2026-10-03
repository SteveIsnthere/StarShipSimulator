// @vitest-environment jsdom
/**
 * The session's commands, headless: everything but drawing works without a
 * canvas, which is what lets the interface be tested without WebGL.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { createSession } from '$ui/session/session';
import { isHintOpen, isPaused } from '$ui/session/store';
import { getScenario, INTRO } from '$core/scenarios';
import { HINT_KEY } from '$app/preferences';
import { installMemoryStorage } from '../memory-storage';
import { DT } from '$app/loop';

beforeEach(() => void installMemoryStorage());

describe('flights', () => {
  it('uses the selected booster model in the actual session loop and operator controls', () => {
    const session = createSession();
    session.startFlight(getScenario('rtls')!);
    expect(session.model.id).toBe('super-heavy');
    expect(session.loop.state.engines.running).toHaveLength(33);
    session.emit({ type: 'allRaptors' });
    for (let i = 0; i < 180; i++) session.advance(DT);
    expect(session.loop.state.engines.running.filter(Boolean)).toHaveLength(13);
    expect(session.loop.totalSteps).toBe(180);
    expect(session.recorder.length).toBeGreaterThan(0);
    session.restart();
    expect(session.loop.totalSteps).toBe(0);
    expect(session.loop.state.vehicle.propellantMass).toBe(200_000);
  });

  it('starts on the intro, and starts a chosen scenario fresh', () => {
    const session = createSession();
    expect(session.store.getState().preset.id).toBe(INTRO.id);
    session.emit({ type: 'allRaptors' });
    session.startFlight(getScenario('landing-burn')!);
    expect(session.store.getState().preset.id).toBe('landing-burn');
    expect(session.loop.state.kinematics.altitude).toBe(getScenario('landing-burn')!.altitude);
    expect(session.loop.state.engines.running).toEqual([false, false, false, false, false, false]);
  });

  it('restart rebuilds the same preset and clears the ending', () => {
    const session = createSession();
    session.startFlight(getScenario('before-flip')!);
    session.store.setState({ flightOver: true });
    session.restart();
    expect(session.store.getState().preset.id).toBe('before-flip');
    expect(session.store.getState().flightOver).toBe(false);
  });

  it('configure starts the edited flight and closes the menu', () => {
    const session = createSession();
    session.openLayer('menu');
    session.configure({
      altitude: '2000', xPosition: '', speedX: '', speedY: '', pitch: '', propellant: '', wind: '', hour: '',
    } as never);
    expect(session.loop.state.kinematics.altitude).toBe(2000);
    expect(session.store.getState().layer).toBeNull();
  });
});

describe('layers pause the flight', () => {
  it('a menu, the black box or the player pauses it; closing resumes', () => {
    const session = createSession();
    expect(isPaused(session.store.getState())).toBe(false);
    session.openLayer('menu');
    expect(isPaused(session.store.getState())).toBe(true);
    session.closeLayer();
    expect(isPaused(session.store.getState())).toBe(false);
    session.togglePause();
    expect(isPaused(session.store.getState())).toBe(true);
  });
});

describe('preferences', () => {
  it('cinematic and the camera mode are remembered', () => {
    const session = createSession();
    session.toggleCinematic();
    session.selectCameraMode('chase');
    const again = createSession();
    expect(again.store.getState().cinematic).toBe(true);
    expect(again.store.getState().cameraMode).toBe('chase');
  });

  it('restore defaults puts every one back and brings the hint back, menu closed', () => {
    const session = createSession();
    session.toggleCinematic();
    session.selectCameraMode('onboard');
    localStorage.setItem(HINT_KEY, '1');
    session.store.setState({ hintSeen: true });
    session.openLayer('menu');
    session.restoreDefaults();
    const s = session.store.getState();
    expect([s.cinematic, s.cameraMode, s.hintSeen, s.layer, s.muted]).toEqual([false, 'follow', false, null, false]);
  });

  it('the hint is dismissed once, remembered, and never shows under a layer', () => {
    const session = createSession();
    session.store.setState({ hintFits: true });
    expect(isHintOpen(session.store.getState())).toBe(true);
    session.openLayer('menu');
    expect(isHintOpen(session.store.getState())).toBe(false);
    session.closeLayer();
    session.dismissHint();
    expect(localStorage.getItem(HINT_KEY)).toBe('1');
    expect(isHintOpen(session.store.getState())).toBe(false);
  });
});
