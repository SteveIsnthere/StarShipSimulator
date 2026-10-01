// @vitest-environment jsdom
/**
 * The first-flight hint over a real headless session: shown once on a fresh
 * profile, never under a layer, and naming only controls that exist.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { resolveKeyDown } from '$app/input';
import { HINT_KEY } from '$app/preferences';
import type { Debrief } from '$hud/debrief';
import { createSession } from '$ui/session/session';
import { HINT_TESTIDS } from '$ui/testids';
import { FirstFlight } from '$ui/shell/FirstFlight/FirstFlight';
import { HINT_KEYS } from '$ui/shell/FirstFlight/keys';
import { renderWithSession } from './render';

const [HINT, DISMISS] = HINT_TESTIDS;

describe('a fresh profile', () => {
  it('is shown the hint, with its dismiss button', () => {
    renderWithSession(<FirstFlight />);
    expect(screen.getByTestId(HINT)).toBeInTheDocument();
    expect(screen.getByTestId(DISMISS)).toBeInTheDocument();
  });

  it('dismissing hides it, and a new session on the same profile never shows it again', () => {
    const { session, unmount } = renderWithSession(<FirstFlight />);
    const dismiss = vi.spyOn(session, 'dismissHint');
    fireEvent.click(screen.getByTestId(DISMISS));
    expect(dismiss).toHaveBeenCalledOnce();
    expect(screen.queryByTestId(HINT)).toBeNull();
    expect(localStorage.getItem(HINT_KEY)).toBe('1');

    // The reload: same storage, new session.
    unmount();
    renderWithSession(<FirstFlight />, createSession());
    expect(screen.queryByTestId(HINT)).toBeNull();
  });
});

describe('where it does not show', () => {
  it('never under a layer, and back when the layer closes', () => {
    const { session } = renderWithSession(<FirstFlight />);
    for (const layer of ['menu', 'blackBox'] as const) {
      act(() => session.openLayer(layer));
      expect(screen.queryByTestId(HINT), layer).toBeNull();
      act(() => session.closeLayer());
      expect(screen.getByTestId(HINT)).toBeInTheDocument();
    }
  });

  it('not on a layout with no room for it (a landscape phone)', () => {
    const { session } = renderWithSession(<FirstFlight />);
    act(() => session.store.setState({ hintFits: false }));
    expect(screen.queryByTestId(HINT)).toBeNull();
  });

  it('not in cinematic mode, which hides the controls it names', () => {
    const { session } = renderWithSession(<FirstFlight />);
    act(() => session.toggleCinematic());
    expect(screen.queryByTestId(HINT)).toBeNull();
  });

  it('not once the flight has ended: the debrief holds the next step', () => {
    const { session } = renderWithSession(<FirstFlight />);
    // Only its presence matters here; the card's contents are Debrief.test's.
    act(() => session.store.setState({ flightOver: true, debrief: {} as Debrief }));
    expect(screen.queryByTestId(HINT)).toBeNull();
  });
});

describe('the copy names only controls that exist', () => {
  it('Engines, Throttle and Menu; never the 2021 names', () => {
    renderWithSession(<FirstFlight />);
    const text = screen.getByTestId(HINT).textContent ?? '';
    expect(text).toContain('Engines');
    expect(text).toContain('Throttle');
    expect(text).toContain('Menu');
    expect(text).not.toMatch(/Raptors?/i);
    expect(text).not.toMatch(/Thrust/i);
  });

  it('and every key it quotes does what it says, through the real binding table', () => {
    const expected: Record<string, ReturnType<typeof resolveKeyDown>> = {
      Space: { type: 'allRaptors' },
      W: { type: 'throttle', percent: 60 },
    };
    expect(HINT_KEYS.map((k) => k.cap).sort()).toEqual(Object.keys(expected).sort());
    for (const k of HINT_KEYS) expect(resolveKeyDown(k.key, 50), k.cap).toEqual(expected[k.cap]);

    renderWithSession(<FirstFlight />);
    for (const k of HINT_KEYS) expect(screen.getByTestId(HINT)).toHaveTextContent(`${k.cap}${k.does}`);
  });
});
