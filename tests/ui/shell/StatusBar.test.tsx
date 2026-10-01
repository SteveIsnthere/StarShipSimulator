// @vitest-environment jsdom
/**
 * The status bar: its controls reach the session, its toggles report the
 * store, and it names the scenario and the autopilot mode in charge.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { getScenario } from '$core/scenarios';
import { fieldsToPreset, fieldsFromPreset } from '$app/menu';
import { CAMERA_MODE_TESTIDS, byTestId, readoutTestId, readoutUnitTestId, readoutValueTestId } from '$ui/testids';
import { PHONE_PORTRAIT } from '$ui/shell/layout';
import { StatusBar } from '$ui/shell/StatusBar/StatusBar';
import { renderWithSession } from './render';

/** A media environment: `phone` makes the phone-portrait query match. */
function stubMedia(phone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query === PHONE_PORTRAIT,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const byId = (id: string) => screen.getByTestId(id);

beforeEach(() => stubMedia(false));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('StatusBar', () => {
  it('renders the wordmark, the scenario, the clock readout and every chrome control once', () => {
    const { container } = renderWithSession(<StatusBar />);

    expect(screen.getByText('Starship')).toBeInTheDocument();
    expect(screen.getByText('Intro Demo')).toBeInTheDocument();
    for (const id of [readoutTestId('clock'), readoutValueTestId('clock'), readoutUnitTestId('clock')]) {
      expect(container.querySelectorAll(byTestId(id))).toHaveLength(1);
    }
    for (const id of ['cinematic-toggle', 'mute-toggle', 'open-black-box', 'open-menu']) {
      expect(container.querySelectorAll(byTestId(id))).toHaveLength(1);
    }
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    // The camera selector exists only in cinematic mode.
    expect(screen.queryByTestId('camera-modes')).toBeNull();
  });

  it('pauses and resumes through the session, and reports it', () => {
    const { session } = renderWithSession(<StatusBar />);
    const toggle = vi.spyOn(session, 'togglePause');
    const pause = screen.getByRole('button', { name: 'Pause' });

    expect(pause).toHaveAttribute('aria-pressed', 'false');
    expect(pause).toHaveAttribute('aria-keyshortcuts', 'P');
    fireEvent.click(pause);
    expect(toggle).toHaveBeenCalledOnce();
    expect(session.store.getState().playerPaused).toBe(true);
    expect(pause).toHaveAttribute('aria-pressed', 'true');

    // A pause from elsewhere (the P key) shows here too.
    act(() => session.store.setState({ playerPaused: false }));
    expect(pause).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens the black box and the menu as layers', () => {
    const { session } = renderWithSession(<StatusBar />);
    const open = vi.spyOn(session, 'openLayer');

    fireEvent.click(byId('open-black-box'));
    expect(open).toHaveBeenLastCalledWith('blackBox');
    expect(session.store.getState().layer).toBe('blackBox');

    fireEvent.click(byId('open-menu'));
    expect(open).toHaveBeenLastCalledWith('menu');
    expect(session.store.getState().layer).toBe('menu');
  });

  it('toggles sound, with aria-pressed meaning sound is on and a name that never changes', () => {
    const { session } = renderWithSession(<StatusBar />);
    const toggle = vi.spyOn(session, 'toggleMuted');
    const sound = byId('mute-toggle');

    expect(sound).toHaveAccessibleName('Sound');
    expect(sound).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(sound);
    expect(toggle).toHaveBeenCalledOnce();
    expect(session.store.getState().muted).toBe(true);
    expect(sound).toHaveAttribute('aria-pressed', 'false');
    expect(sound).toHaveAccessibleName('Sound');
  });

  it('enters cinematic mode and offers the camera selector, which selects through the session', () => {
    const { session } = renderWithSession(<StatusBar />);
    const cinematic = vi.spyOn(session, 'toggleCinematic');
    const select = vi.spyOn(session, 'selectCameraMode');

    fireEvent.click(byId('cinematic-toggle'));
    expect(cinematic).toHaveBeenCalledOnce();
    expect(byId('cinematic-toggle')).toHaveAttribute('aria-pressed', 'true');

    const group = byId('camera-modes');
    expect(group).toHaveAttribute('role', 'group');
    expect(group).toHaveAccessibleName('Camera');
    for (const id of CAMERA_MODE_TESTIDS) expect(within(group).getByTestId(id)).toBeInTheDocument();
    expect(byId('camera-follow')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(byId('camera-chase'));
    expect(select).toHaveBeenCalledWith('chase');
    expect(byId('camera-chase')).toHaveAttribute('aria-pressed', 'true');
    expect(byId('camera-follow')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(byId('cinematic-toggle'));
    expect(screen.queryByTestId('camera-modes')).toBeNull();
  });

  it('names the scenario a new flight was built from, and an edited one by its origin', () => {
    const { session } = renderWithSession(<StatusBar />);
    const reentry = getScenario('reentry')!;

    act(() => session.startFlight(reentry));
    expect(screen.getByText(reentry.name)).toBeInTheDocument();

    act(() => session.startFlight(fieldsToPreset(fieldsFromPreset(reentry), reentry)));
    expect(screen.getByText(`${reentry.name}, edited`)).toBeInTheDocument();
  });

  it('names the autopilot mode in charge, following the live flight', () => {
    const { session } = renderWithSession(<StatusBar />);

    // The intro lands itself: that is the landing autopilot.
    expect(screen.getByText('Land')).toBeInTheDocument();
    expect(screen.getByText(/Autopilot/)).toBeInTheDocument();

    act(() => session.startFlight(getScenario('landing-burn')!));
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.queryByText(/Autopilot/)).toBeNull();

    act(() => session.emit({ type: 'boostBack' }));
    expect(screen.getByText('Boost back')).toBeInTheDocument();
  });

  it('on a phone keeps every control in one row as named icons, without the words', () => {
    stubMedia(true);
    renderWithSession(<StatusBar />);

    expect(screen.queryByText('Starship')).toBeNull();
    expect(screen.queryByText('Intro Demo')).toBeNull();
    for (const [id, name] of [
      ['cinematic-toggle', 'Cinematic'],
      ['mute-toggle', 'Sound'],
      ['open-black-box', 'Black box'],
      ['open-menu', 'Menu'],
    ] as const) {
      const button = byId(id);
      expect(button).toHaveAccessibleName(name);
      // An icon, not a word: nothing but the glyph is rendered as text.
      expect(button.textContent).toBe('');
    }
    expect(screen.getByRole('button', { name: 'Pause' }).textContent).toBe('');
    // The clock is still the one readout element.
    expect(byId(readoutValueTestId('clock'))).toBeInTheDocument();
  });

  it('puts the camera selector in the bottom band on a phone', () => {
    stubMedia(true);
    const { session } = renderWithSession(<StatusBar />);
    act(() => session.toggleCinematic());
    expect(byId('camera-modes').className).toContain('bottom-0');
  });
});
