// @vitest-environment jsdom
/**
 * The controls surface against a real headless session: every control it owns
 * renders, emits the ControlEvent the Svelte panels did, hands the indicator
 * binder a target for every indicator, and lays out as panels or as a tab bar
 * and one sheet.
 */
import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ControlEvent } from '$app/controls';
import { INDICATORS } from '$hud/indicators';
import { throttleLowerLimit, throttleUpperLimit } from '$core/constants';
import { CONTROL_TESTIDS } from '$ui/testids';
import { PHONE_PORTRAIT } from '$ui/shell/layout';
import { createSession } from '$ui/session/session';
import { Controls } from '$ui/shell/Controls/Controls';
import { installMemoryStorage } from '../../memory-storage';
import { renderWithSession } from './render';

/** The CONTROL_TESTIDS this surface owns; the rest belong to the status bar and the HUD. */
const OWNED = [
  'raptor-0',
  'raptor-1',
  'raptor-2',
  'all-raptors',
  'auto-max-thrust',
  'throttle',
  'yoke-pitch',
  'auto-take-off',
  'boost-back',
  'pitch-hold',
  'auto-land',
  'auto-deorbit',
  'fins',
  'rcs',
  'dump-fuel',
  'engine-panel-toggle',
  'yoke-panel-toggle',
  'zoom-in',
  'zoom-out',
] as const;

/** Every button that emits, and what it emits — the Svelte panels' contract. */
const EMITS: ReadonlyArray<[string, ControlEvent]> = [
  ['raptor-0', { type: 'raptor', engine: 0 }],
  ['raptor-1', { type: 'raptor', engine: 1 }],
  ['raptor-2', { type: 'raptor', engine: 2 }],
  ['all-raptors', { type: 'allRaptors' }],
  ['auto-max-thrust', { type: 'autoMaxThrust' }],
  ['auto-take-off', { type: 'autoTakeOff' }],
  ['boost-back', { type: 'boostBack' }],
  ['pitch-hold', { type: 'pitchHold' }],
  ['auto-land', { type: 'autoLand' }],
  ['auto-deorbit', { type: 'autoDeorbit' }],
  ['fins', { type: 'fins' }],
  ['rcs', { type: 'rcs' }],
  ['dump-fuel', { type: 'dumpFuel' }],
];

/** Make `usePhoneLayout()` answer `phone`; every other query answers no. */
function stubLayout(phone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query === PHONE_PORTRAIT,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/** Which control each `$hud/indicators` id lights. */
const BY_INDICATOR: Readonly<Record<string, string>> = {
  raptor0: 'raptor-0',
  raptor1: 'raptor-1',
  raptor2: 'raptor-2',
  allRaptors: 'all-raptors',
  autoMaxThrust: 'auto-max-thrust',
  autoTakeOff: 'auto-take-off',
  boostBack: 'boost-back',
  pitchHold: 'pitch-hold',
  autoLand: 'auto-land',
  autoDeorbit: 'auto-deorbit',
  fins: 'fins',
  rcs: 'rcs',
  dumpFuel: 'dump-fuel',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty('--controls-bottom');
});

describe('desktop', () => {
  it('renders every control this surface owns', () => {
    stubLayout(false);
    renderWithSession(<Controls />);
    for (const id of OWNED) {
      expect(CONTROL_TESTIDS).toContain(id);
      expect(screen.getByTestId(id), id).toBeVisible();
    }
  });

  it('emits the Svelte panels’ event for every button', () => {
    stubLayout(false);
    const { session } = renderWithSession(<Controls />);
    const emit = vi.spyOn(session, 'emit');
    for (const [id, event] of EMITS) {
      emit.mockClear();
      fireEvent.click(screen.getByTestId(id));
      expect(emit, id).toHaveBeenCalledExactlyOnceWith(event);
    }
  });

  it('names the controls in a player’s words', () => {
    stubLayout(false);
    renderWithSession(<Controls />);
    expect(screen.getByTestId('all-raptors')).toHaveAccessibleName('Engines');
    expect(screen.getByTestId('raptor-1')).toHaveAccessibleName('Engine 2');
    expect(screen.getByTestId('auto-max-thrust')).toHaveAccessibleName('Throttle guard');
    expect(screen.getByTestId('throttle')).toHaveAccessibleName('Throttle');
    expect(screen.getByTestId('yoke-pitch')).toHaveAccessibleName('Attitude');
    expect(screen.getByTestId('auto-take-off')).toHaveAccessibleName('Lift off');
    expect(screen.getByTestId('pitch-hold')).toHaveAccessibleName('Hold attitude');
    expect(screen.getByTestId('auto-land')).toHaveAccessibleName('Land');
    expect(screen.getByTestId('rcs')).toHaveAccessibleName('Reaction control');
    expect(screen.getByTestId('dump-fuel')).toHaveAccessibleName('Dump propellant');
  });

  it('the throttle is bounded by the engine limits and emits a throttle event', () => {
    stubLayout(false);
    const { session } = renderWithSession(<Controls />);
    const emit = vi.spyOn(session, 'emit');
    const throttle = screen.getByTestId('throttle');
    expect(throttle).toHaveAttribute('min', String(throttleLowerLimit));
    expect(throttle).toHaveAttribute('max', String(throttleUpperLimit));

    fireEvent.change(throttle, { target: { value: '70' } });
    expect(emit).toHaveBeenCalledExactlyOnceWith({ type: 'throttle', percent: 70 });
    expect(throttle).toHaveValue('70');
    expect(throttle).toHaveAttribute('aria-valuetext', '70 %');
  });

  it('the yoke emits its position, and grabbing and letting go of it', () => {
    stubLayout(false);
    const { session } = renderWithSession(<Controls />);
    const emit = vi.spyOn(session, 'emit');
    const yoke = screen.getByTestId('yoke-pitch');

    fireEvent.pointerDown(yoke);
    expect(emit).toHaveBeenLastCalledWith({ type: 'yokeGrab' });
    fireEvent.change(yoke, { target: { value: '-40' } });
    expect(emit).toHaveBeenLastCalledWith({ type: 'pitch', percent: -40 });
    expect(yoke).toHaveAttribute('aria-valuetext', 'Left 40 %');
    fireEvent.pointerUp(yoke);
    expect(emit).toHaveBeenLastCalledWith({ type: 'yokeRelease' });
  });

  it('a slider follows a command something else gave, at the next key', () => {
    stubLayout(false);
    const { session } = renderWithSession(<Controls />);
    // W, Z, the autopilot: anything but the slider moving the command.
    act(() => session.emit({ type: 'throttle', percent: 55 }));
    act(() => void window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' })));
    expect(screen.getByTestId('throttle')).toHaveValue('55');
  });

  it('zooms the camera both ways', () => {
    stubLayout(false);
    const { session } = renderWithSession(<Controls />);
    const zoom = vi.spyOn(session, 'zoom');
    fireEvent.click(screen.getByTestId('zoom-in'));
    fireEvent.click(screen.getByTestId('zoom-out'));
    expect(zoom.mock.calls).toEqual([[1], [-1]]);
  });

  it('collapses each group by hiding it, never by unmounting the bound nodes', () => {
    stubLayout(false);
    renderWithSession(<Controls />);
    for (const [toggleId, inside] of [
      ['engine-panel-toggle', 'throttle'],
      ['yoke-panel-toggle', 'yoke-pitch'],
    ] as const) {
      const toggle = screen.getByTestId(toggleId);
      const node = screen.getByTestId(inside);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(node).not.toBeVisible();
      expect(screen.getByTestId(inside)).toBe(node);
      fireEvent.click(toggle);
      expect(node).toBeVisible();
    }
    // Zoom sits beside the Flight header, so a collapsed Flight keeps it.
    fireEvent.click(screen.getByTestId('yoke-panel-toggle'));
    expect(screen.getByTestId('zoom-in')).toBeVisible();
  });

  it('the sliders cannot be moved while a layer is open', () => {
    stubLayout(false);
    const { session } = renderWithSession(<Controls />);
    act(() => session.openLayer('menu'));
    expect(screen.getByTestId('throttle')).toBeDisabled();
    expect(screen.getByTestId('yoke-pitch')).toBeDisabled();
    act(() => session.closeLayer());
    expect(screen.getByTestId('throttle')).toBeEnabled();
  });

  it('cinematic mode hides the whole surface and brings back the same nodes', () => {
    stubLayout(false);
    const { session } = renderWithSession(<Controls />);
    const raptor = screen.getByTestId('all-raptors');
    act(() => session.toggleCinematic());
    for (const id of OWNED) expect(screen.getByTestId(id), id).not.toBeVisible();
    act(() => session.toggleCinematic());
    expect(screen.getByTestId('all-raptors')).toBe(raptor);
    expect(raptor).toBeVisible();
  });
});

describe('the indicator binder', () => {
  /** Render with the session's bindIndicators spied, and hand back what it was given. */
  function renderBound() {
    stubLayout(false);
    installMemoryStorage();
    const session = createSession();
    const bindIndicators = vi.spyOn(session, 'bindIndicators');
    const view = renderWithSession(<Controls />, session);
    expect(bindIndicators).toHaveBeenCalled();
    return { ...view, bindIndicators, resolve: bindIndicators.mock.lastCall![0] };
  }

  it('resolves every indicator id to the control that shows it, and lights it', () => {
    const { resolve } = renderBound();
    for (const { id } of INDICATORS) {
      const target = resolve(id);
      expect(target, id).not.toBeNull();
      const button = screen.getByTestId(BY_INDICATOR[id]!);
      act(() => target!.classList.toggle('is-on', true));
      expect(button, id).toHaveClass('is-on');
      expect(button, id).toHaveAttribute('aria-pressed', 'true');
      act(() => target!.classList.toggle('is-on', false));
      expect(button, id).not.toHaveClass('is-on');
      expect(button, id).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('a lit control keeps its light through a re-render', () => {
    const { resolve, session } = renderBound();
    act(() => resolve('rcs')!.classList.toggle('is-on', true));
    // Re-renders the whole surface (the sliders disable, the layout re-reads).
    act(() => session.openLayer('menu'));
    act(() => session.closeLayer());
    expect(screen.getByTestId('rcs')).toHaveClass('is-on');
    expect(screen.getByTestId('rcs')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Manual is current when no mode is, and switches off the one that is', () => {
    const { resolve, session } = renderBound();
    const manual = screen.getByRole('button', { name: 'Manual' });
    expect(manual).toHaveAttribute('aria-pressed', 'true');

    act(() => resolve('autoLand')!.classList.toggle('is-on', true));
    expect(manual).toHaveAttribute('aria-pressed', 'false');
    expect(manual).not.toHaveClass('is-on');

    const emit = vi.spyOn(session, 'emit');
    fireEvent.click(manual);
    expect(emit).toHaveBeenCalledExactlyOnceWith({ type: 'autoLand' });

    act(() => resolve('autoLand')!.classList.toggle('is-on', false));
    expect(manual).toHaveAttribute('aria-pressed', 'true');
    emit.mockClear();
    fireEvent.click(manual);
    expect(emit).not.toHaveBeenCalled();
  });

  it('unbinds on unmount, so the binder stops writing into detached nodes', () => {
    const { unmount, bindIndicators } = renderBound();
    unmount();
    expect(bindIndicators.mock.lastCall![0]('rcs')).toBeNull();
  });
});

describe('phone', () => {
  // The tab bar (56 px) plus an open sheet (240 px).
  const sheet = () => document.documentElement.style.getPropertyValue('--controls-bottom');

  it('starts with both sheets closed and the tab bar showing', () => {
    stubLayout(true);
    renderWithSession(<Controls />);
    expect(sheet()).toBe('56px');
    expect(screen.getByRole('navigation', { name: 'Controls' })).toBeVisible();
    for (const id of ['engine-panel-toggle', 'yoke-panel-toggle', 'zoom-in', 'zoom-out']) {
      expect(screen.getByTestId(id), id).toBeVisible();
    }
    // Present (the binder holds them) but out of sight and out of the tab order.
    for (const id of OWNED.filter((id) => !['engine-panel-toggle', 'yoke-panel-toggle', 'zoom-in', 'zoom-out'].includes(id))) {
      expect(screen.getByTestId(id), id).not.toBeVisible();
    }
  });

  it('opens one sheet at a time and publishes how much of the bottom it holds', () => {
    stubLayout(true);
    renderWithSession(<Controls />);
    const engines = screen.getByTestId('engine-panel-toggle');
    const flight = screen.getByTestId('yoke-panel-toggle');
    const nav = screen.getByRole('navigation', { name: 'Controls' });
    expect(within(nav).getByTestId('engine-panel-toggle')).toBe(engines);

    fireEvent.click(engines);
    expect(engines).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('throttle')).toBeVisible();
    expect(sheet()).toBe('296px');

    fireEvent.click(flight);
    expect(screen.getByTestId('yoke-pitch')).toBeVisible();
    expect(screen.getByTestId('throttle')).not.toBeVisible();
    expect(engines).toHaveAttribute('aria-expanded', 'false');
    expect(sheet()).toBe('296px');

    fireEvent.click(flight);
    expect(screen.getByTestId('yoke-pitch')).not.toBeVisible();
    expect(sheet()).toBe('56px');
  });

  it('gives the bottom back in cinematic mode and on unmount', () => {
    stubLayout(true);
    const { session, unmount } = renderWithSession(<Controls />);
    fireEvent.click(screen.getByTestId('engine-panel-toggle'));
    expect(sheet()).toBe('296px');
    act(() => session.toggleCinematic());
    expect(screen.getByTestId('engine-panel-toggle')).not.toBeVisible();
    expect(sheet()).toBe('0px');
    act(() => session.toggleCinematic());
    expect(sheet()).toBe('296px');
    unmount();
    expect(sheet()).toBe('');
  });
});
