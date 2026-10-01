// @vitest-environment jsdom
/**
 * The menu, rendered on a real headless session: which layers open it, that
 * every id the e2e contract names is rendered in the section it belongs to,
 * that a scenario fills the form without flying it, that Start flight flies the
 * form and refuses an out-of-range one, that every setting reaches its command,
 * and that the guide and about views open, carry their generated content, and
 * lead back to the menu.
 */
import { act, fireEvent, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fieldsFromPreset } from '$app/menu';
import { planetRadius } from '$core/constants';
import { getScenario, INTRO } from '$core/scenarios';
import { AUTOPILOT_MODES, GUIDE_SCENARIOS } from '$ui/guide';
import type { Layer } from '$ui/session/store';
import { MENU_TESTIDS, presetTestId } from '$ui/testids';
import { Menu } from '$ui/shell/Menu/Menu';
import { MENU_SCENARIOS } from '$ui/shell/Menu/scenarios';
import { renderWithSession } from './render';

// jsdom lays nothing out and has no scrollIntoView; the sheet's jumps only need it to exist.
const scrollIntoView = vi.fn();
beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});

function renderAt(layer: Layer) {
  const result = renderWithSession(<Menu />);
  act(() => result.session.store.setState({ layer }));
  return result;
}

const byId = (id: string) => screen.getByTestId(id);
const sectionOf = (element: Element) => element.closest('[data-menu-section]')?.getAttribute('data-menu-section');

/** Where each id in MENU_TESTIDS lives. The dialog and its close button belong to no section. */
const SECTION_OF: Record<string, string | null> = {
  menu: null,
  'menu-close': null,
  'menu-clear': 'setup',
  'menu-configure': 'setup',
  'field-altitude': 'setup',
  'field-xPosition': 'setup',
  'field-speedX': 'setup',
  'field-speedY': 'setup',
  'field-pitch': 'setup',
  'field-propellant': 'setup',
  'field-wind': 'setup',
  'field-launchHour': 'setup',
  'menu-volume': 'settings',
  'menu-volume-readout': 'settings',
  'menu-mute': 'settings',
  'menu-time-direction': 'settings',
  'menu-time-rate': 'settings',
  'menu-time-readout': 'settings',
  'menu-random-failure': 'settings',
  'menu-tilt-control': 'settings',
  'menu-restore-defaults': 'settings',
  'menu-guide': 'about',
  'menu-about': 'about',
};

describe('opening and closing', () => {
  it('opens on the menu layer only', () => {
    const { session } = renderAt(null);
    expect(screen.queryByTestId('menu')).toBeNull();
    act(() => session.store.setState({ layer: 'blackBox' }));
    expect(screen.queryByTestId('menu')).toBeNull();
    act(() => session.openLayer('menu'));
    expect(byId('menu')).toHaveAttribute('role', 'dialog');
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBe(byId('menu'));
  });

  it('closes through the session', () => {
    const { session } = renderAt('menu');
    const closeLayer = vi.spyOn(session, 'closeLayer');
    fireEvent.click(byId('menu-close'));
    expect(closeLayer).toHaveBeenCalledTimes(1);
    expect(session.store.getState().layer).toBeNull();
    expect(screen.queryByTestId('menu')).toBeNull();
  });

  it('leaves Escape to the session rather than closing twice', () => {
    // The session (not mounted here) owns Escape; were the dialog to close as
    // well, the session would find no layer and open the menu back up.
    const { session } = renderAt('menu');
    fireEvent.keyDown(byId('menu'), { key: 'Escape' });
    expect(session.store.getState().layer).toBe('menu');
    expect(byId('menu')).toBeInTheDocument();
  });
});

describe('the contract', () => {
  it('renders every menu id once, in its section', () => {
    renderAt('menu');
    for (const id of MENU_TESTIDS) {
      expect(screen.getAllByTestId(id), id).toHaveLength(1);
      expect(id in SECTION_OF, `${id} has no section in this test`).toBe(true);
      if (SECTION_OF[id] !== null) expect(sectionOf(byId(id)), id).toBe(SECTION_OF[id]);
    }
  });

  it('offers every scenario under Fly, and keeps the legacy time readout hook', () => {
    renderAt('menu');
    for (const preset of MENU_SCENARIOS) expect(sectionOf(byId(presetTestId(preset.id))), preset.id).toBe('fly');
    expect(document.querySelector('[data-menu-readout="timeRate"]')).toBe(byId('menu-time-readout'));
  });

  it('a tab jumps to its section and shows as current', () => {
    renderAt('menu');
    expect(screen.getByRole('tab', { name: 'Fly' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Fly' })).toHaveAttribute('aria-selected', 'false');
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.querySelector('[data-menu-section="settings"]'));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Settings' }));
  });
});

describe('Fly and Flight setup', () => {
  it('a scenario fills the form without flying it, and moves to Flight setup', () => {
    const { session } = renderAt('menu');
    const startFlight = vi.spyOn(session, 'startFlight');
    const configure = vi.spyOn(session, 'configure');

    fireEvent.click(byId('preset-booster-sep'));

    expect(byId('field-altitude')).toHaveValue(70_000);
    expect(byId('field-speedX')).toHaveValue(1130);
    // Wind and hour stay blank: "as this scenario has it".
    expect(byId('field-wind')).toHaveValue(null);
    expect(startFlight).not.toHaveBeenCalled();
    expect(configure).not.toHaveBeenCalled();
    expect(session.store.getState().preset).toBe(INTRO);
    expect(session.store.getState().layer).toBe('menu');

    expect(screen.getByRole('tab', { name: 'Flight setup' })).toHaveAttribute('aria-selected', 'true');
    expect(byId('preset-booster-sep')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText(/Starting from Booster Sep/)).toBeInTheDocument();
    // Enter flies it from here.
    expect(document.activeElement).toBe(byId('menu-configure'));

    fireEvent.click(byId('menu-clear'));
    expect(byId('field-altitude')).toHaveValue(null);
    expect(byId('preset-booster-sep')).not.toHaveAttribute('aria-current');
  });

  it('Start flight configures the form as edited, and the menu closes', () => {
    const { session } = renderAt('menu');
    const configure = vi.spyOn(session, 'configure');

    fireEvent.click(byId('preset-landing-burn'));
    fireEvent.change(byId('field-wind'), { target: { value: '10' } });
    fireEvent.click(byId('menu-configure'));

    expect(configure).toHaveBeenCalledExactlyOnceWith({ ...fieldsFromPreset(getScenario('landing-burn')!), wind: '10' });
    expect(session.store.getState().preset.wind).toBe(10);
    expect(session.store.getState().layer).toBeNull();
    expect(screen.queryByTestId('menu')).toBeNull();
  });

  it('a hand-typed form flies, blanks keeping the current values', () => {
    const { session } = renderAt('menu');
    fireEvent.change(byId('field-altitude'), { target: { value: '9000' } });
    fireEvent.change(byId('field-speedY'), { target: { value: '-40' } });
    fireEvent.click(byId('menu-configure'));
    const preset = session.store.getState().preset;
    expect(preset.altitude).toBe(9000);
    expect(preset.speedY).toBe(-40);
    expect(preset.propellant).toBe(INTRO.propellant);
  });

  it('an out-of-range field says why in words and holds Start flight back', () => {
    const { session } = renderAt('menu');
    const configure = vi.spyOn(session, 'configure');

    fireEvent.change(byId('field-pitch'), { target: { value: '210' } });

    expect(byId('field-pitch')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Pitch must be −180° to 180°.');
    expect(byId('field-pitch')).toHaveAccessibleDescription('Pitch must be −180° to 180°.');
    expect(screen.getByText('Fix one field to start.')).toBeInTheDocument();
    expect(byId('menu-configure')).toBeDisabled();
    fireEvent.click(byId('menu-configure'));
    expect(configure).not.toHaveBeenCalled();

    fireEvent.change(byId('field-pitch'), { target: { value: '45' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(byId('menu-configure')).toBeEnabled();
  });

  it('every field shows its name, range and unit', () => {
    // Half a lap of the planet, in whole kilometres, grouped by a thin space.
    const halfLap = String(Math.round(Math.ceil(Math.PI * planetRadius) / 1000));
    renderAt('menu');
    expect(byId('field-altitude')).toHaveAccessibleName(/^Altitude, 0 to 400\s000 m$/);
    expect(byId('field-xPosition')).toHaveAccessibleName(
      new RegExp(`^Distance from the pad, Up to ${halfLap.slice(0, -3)}\\s${halfLap.slice(-3)} km either side, Negative is short of the pad$`),
    );
    expect(byId('field-launchHour')).toHaveAccessibleName(/^Time of day, 0 to 24 h, Local solar time$/);
    expect(byId('field-propellant').parentElement).toHaveTextContent('t');
  });

  it('every shipped scenario is within the ranges', () => {
    // The Deorbit Burn starts half a lap away, past a round 20 000 km.
    renderAt('menu');
    for (const preset of MENU_SCENARIOS) {
      fireEvent.click(byId(presetTestId(preset.id)));
      expect(screen.queryByRole('alert'), preset.id).toBeNull();
      expect(byId('menu-configure'), preset.id).toBeEnabled();
    }
  });

  it('what was typed survives closing the menu', () => {
    const { session } = renderAt('menu');
    fireEvent.change(byId('field-altitude'), { target: { value: '1234' } });
    act(() => session.closeLayer());
    act(() => session.openLayer('menu'));
    expect(byId('field-altitude')).toHaveValue(1234);
  });
});

describe('Settings', () => {
  it('mute reaches the session and the readout says so', () => {
    const { session } = renderAt('menu');
    const toggleMuted = vi.spyOn(session, 'toggleMuted');
    expect(byId('menu-mute')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(byId('menu-mute'));
    expect(toggleMuted).toHaveBeenCalledTimes(1);
    expect(byId('menu-mute')).toHaveAttribute('aria-pressed', 'true');
    expect(byId('menu-volume-readout')).toHaveTextContent('Muted');
  });

  it('the level follows a drag and is remembered only on release', () => {
    const { session } = renderAt('menu');
    const setVolume = vi.spyOn(session, 'setVolume');
    fireEvent.input(byId('menu-volume'), { target: { value: '30' } });
    expect(setVolume).toHaveBeenLastCalledWith(0.3, false);
    expect(byId('menu-volume-readout')).toHaveTextContent('30%');
    fireEvent.change(byId('menu-volume'), { target: { value: '30' } });
    expect(setVolume).toHaveBeenLastCalledWith(0.3, true);
    expect(setVolume.mock.calls.filter(([, remember]) => remember)).toHaveLength(1);
  });

  it('time warp steps by its value, and slow motion inverts it', () => {
    const { session } = renderAt('menu');
    const setTime = vi.spyOn(session, 'setTime');
    expect(byId('menu-time-rate')).toHaveAttribute('min', '1');
    expect(byId('menu-time-rate')).toHaveAttribute('max', '9');
    fireEvent.change(byId('menu-time-rate'), { target: { value: '8' } });
    expect(setTime).toHaveBeenLastCalledWith({ rate: 8, speedingUp: true });
    expect(byId('menu-time-readout')).toHaveTextContent('8x');
    fireEvent.click(byId('menu-time-direction'));
    expect(setTime).toHaveBeenLastCalledWith({ rate: 8, speedingUp: false });
    expect(byId('menu-time-direction')).toHaveAttribute('aria-pressed', 'true');
    expect(byId('menu-time-readout')).toHaveTextContent('1/8x');
  });

  it('random failures and tilt control toggle through the session', () => {
    const { session } = renderAt('menu');
    const toggleRandomFailure = vi.spyOn(session, 'toggleRandomFailure');
    const toggleTiltControl = vi.spyOn(session, 'toggleTiltControl');

    expect(byId('menu-random-failure')).not.toHaveClass('is-on');
    fireEvent.click(byId('menu-random-failure'));
    expect(toggleRandomFailure).toHaveBeenCalledTimes(1);
    expect(byId('menu-random-failure')).toHaveClass('is-on');
    expect(byId('menu-random-failure')).toHaveAttribute('aria-pressed', 'true');

    // On by default (eventListener.js:117).
    expect(byId('menu-tilt-control')).toHaveClass('is-on');
    fireEvent.click(byId('menu-tilt-control'));
    expect(toggleTiltControl).toHaveBeenCalledTimes(1);
    expect(byId('menu-tilt-control')).toHaveAttribute('aria-pressed', 'false');
    expect(byId('menu-tilt-control')).not.toHaveClass('is-on');
  });

  it('restore defaults reaches the session, which closes the menu', () => {
    const { session } = renderAt('menu');
    const restoreDefaults = vi.spyOn(session, 'restoreDefaults');
    fireEvent.click(byId('menu-restore-defaults'));
    expect(restoreDefaults).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('menu')).toBeNull();
  });
});

describe('About, the guide and the about view', () => {
  it('says it is an unofficial fan simulator', () => {
    renderAt('menu');
    expect(document.querySelector('[data-menu-section="about"]')).toHaveTextContent(/unofficial fan simulator/);
  });

  it('the guide opens in place of the menu, generated from the tables, and leads back', () => {
    const { session } = renderAt('menu');
    fireEvent.click(byId('menu-guide'));

    expect(session.store.getState().layer).toBe('guide');
    expect(screen.queryByTestId('menu')).toBeNull();
    const guide = byId('info-view');
    expect(guide).toHaveAccessibleName('Guide');
    expect(guide).toHaveTextContent('Backspace');
    expect(guide).toHaveTextContent('ArrowLeft');
    expect(guide).toHaveTextContent('toggle all Raptors');
    expect(guide.querySelectorAll('[data-guide="autopilot"] li')).toHaveLength(AUTOPILOT_MODES.length);
    for (const mode of AUTOPILOT_MODES) {
      expect(guide.querySelector(`[data-mode="${mode.testid}"]`)).toHaveTextContent(mode.label);
    }
    expect(guide.querySelectorAll('[data-guide="scenarios"] tr')).toHaveLength(GUIDE_SCENARIOS.length);
    expect(document.activeElement).toBe(byId('info-close'));

    fireEvent.click(byId('info-close'));
    expect(session.store.getState().layer).toBe('menu');
    expect(screen.queryByTestId('info-view')).toBeNull();
    expect(document.activeElement).toBe(byId('menu-guide'));
    expect(screen.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true');
  });

  it('the about view opens, and its close closes everything', () => {
    const { session } = renderAt('menu');
    fireEvent.click(byId('menu-about'));
    expect(session.store.getState().layer).toBe('about');
    expect(byId('info-view')).toHaveTextContent(/unofficial fan simulator/);
    fireEvent.click(byId('menu-close'));
    expect(session.store.getState().layer).toBeNull();
    expect(screen.queryByTestId('info-view')).toBeNull();
  });

  it('a fresh opening starts at Fly, not where the guide was left', () => {
    const { session } = renderAt('menu');
    fireEvent.click(byId('menu-guide'));
    fireEvent.click(byId('info-close'));
    act(() => session.closeLayer());
    act(() => session.openLayer('menu'));
    expect(screen.getByRole('tab', { name: 'Fly' })).toHaveAttribute('aria-selected', 'true');
  });
});
