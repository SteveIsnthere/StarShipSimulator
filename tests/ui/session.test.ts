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
import { EMPTY_FIELDS } from '$app/menu';

beforeEach(() => void installMemoryStorage());

describe('flights', () => {
  it('publishes failed Stage status from the actual required engine and clears it on restart', () => {
    const session = createSession(); session.startHotStage(123);
    session.mission!.booster.engines.failed[0] = true;
    session.stage(); session.advance(DT);
    expect(session.store.getState().stagingFailed).toBe(true);
    expect(session.store.getState().missionPhase).toBe('attached');
    session.restart(); session.advance(0);
    expect(session.store.getState().stagingFailed).toBe(false);
    session.stage();
    for (let i = 0; i < 180; i++) session.advance(DT);
    expect(session.store.getState().missionPhase).toBe('separated');
  });
  it('keeps a dismissed debrief closed through paused frames and creates a new report after restart', () => {
    const session = createSession();
    session.store.setState({ hintSeen: true });
    session.loop.state.failures.crashed = true;
    session.advance(DT);
    expect(session.store.getState().debrief?.outcome).toBe('CRASH');
    session.dismissDebrief();
    session.togglePause();
    session.advance(0);
    expect(session.store.getState().debrief).toBeNull();
    session.advance(DT);
    expect(session.store.getState().debrief).toBeNull();
    session.restart();
    session.togglePause();
    session.loop.state.failures.crashed = true;
    session.advance(DT);
    expect(session.store.getState().debrief?.outcome).toBe('CRASH');
  });

  it('dismisses only the selected body report and remembers that dismissal when selection returns', () => {
    const session = createSession();
    session.startHotStage(123); session.stage();
    for (let i = 0; i < 180; i++) session.advance(DT);
    session.mission!.ship.failures.inFlightBreakUp = true;
    session.mission!.booster.failures.inFlightBreakUp = true;
    session.advance(DT);
    const shipCard = session.store.getState().debrief;
    expect(shipCard?.outcome).toBe('LOSS');
    session.dismissDebrief(); session.advance(0);
    expect(session.store.getState().debrief).toBeNull();
    session.selectVehicle('super-heavy');
    expect(session.store.getState().debrief?.outcome).toBe('LOSS');
    expect(session.store.getState().debrief).not.toBe(shipCard);
    session.selectVehicle('ship'); session.advance(0);
    expect(session.store.getState().debrief).toBeNull();
  });

  it('configures the selected mission body as its real standalone vehicle', () => {
    const session = createSession();
    session.startHotStage(123);
    session.selectVehicle('super-heavy');
    const initialAltitude = session.loop.state.kinematics.altitude;
    session.configure({ ...EMPTY_FIELDS, propellant: '3000' });
    expect(session.model.id).toBe('super-heavy');
    expect(session.mission).toBeUndefined();
    expect(session.loop.state.vehicle.propellantMass).toBe(3_000_000);
    expect(session.loop.state.kinematics.altitude).toBe(initialAltitude);
    session.startHotStage(123);
    const shipFuel = session.loop.state.vehicle.propellantMass;
    session.configure({ ...EMPTY_FIELDS });
    expect(session.model.id).toBe('ship');
    expect(session.loop.state.vehicle.propellantMass).toBe(shipFuel);
  });

  it('keeps separate selected-body histories while both hot-stage bodies advance', () => {
    const session = createSession();
    session.startHotStage();
    const shipRecorder = session.recorder;
    const shipTimeline = session.timeline;
    expect(session.store.getState().missionPhase).toBe('attached');
    session.stage();
    for (let i = 0; i < 180; i++) session.advance(DT);
    expect(session.mission!.phase).toBe('separated');
    expect(shipRecorder.length).toBeGreaterThan(0);
    const shipSamples = [...shipRecorder.series['propellant']!];
    session.selectVehicle('super-heavy');
    const boosterRecorder = session.recorder;
    expect(boosterRecorder).not.toBe(shipRecorder);
    expect(session.timeline).not.toBe(shipTimeline);
    expect(boosterRecorder.length).toBe(shipRecorder.length);
    expect(session.store.getState().selectedVehicle).toBe('super-heavy');
    expect(session.loop.state).toBe(session.mission!.booster);
    session.openLayer('blackBox');
    session.advance(1);
    expect(shipRecorder.series['propellant']).toEqual(shipSamples);
    session.closeLayer();
    session.advance(DT);
    session.selectVehicle('ship');
    expect(session.recorder).toBe(shipRecorder);
    expect(shipRecorder.series['propellant']![0]).toBeGreaterThan(1000);
    // The first sample precedes ignition; actual fuel has not been spent yet.
    expect(boosterRecorder.series['propellant']![0]).toBe(500);
    session.restart();
    expect(session.mission!.phase).toBe('attached');
    expect(session.model.id).toBe('ship');
    expect(session.recorder.length).toBe(0);
    expect(session.previousRecorder.length).toBeGreaterThan(0);
    expect(session.loop.totalSteps).toBe(0);
  });

  it('restarts the requested hot-stage seed and applies the shared failure setting to both bodies', () => {
    const session = createSession();
    session.startHotStage(123);
    const initial = structuredClone(session.mission);
    session.toggleRandomFailure();
    expect(session.mission!.ship.failures.randomFailure).toBe(true);
    expect(session.mission!.booster.failures.randomFailure).toBe(true);
    session.toggleRandomFailure();
    session.stage();
    session.advance(DT);
    session.restart();
    expect(session.mission).toEqual(initial);
    expect(session.store.getState().stageRequested).toBe(false);
  });

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
