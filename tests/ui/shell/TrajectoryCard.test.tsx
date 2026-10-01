// @vitest-environment jsdom
/**
 * The trajectory card: the surface it hands the session, the fold and what the
 * fold tells the tick, and the fold's memory (kept per device, put back by
 * Restore defaults).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { MAP_KEY, clearPreferences } from '$app/preferences';
import type { Debrief } from '$hud/debrief';
import type { MapSurface } from '$hud/trajectory-draw';
import { createSession } from '$ui/session/session';
import { MAP_TESTIDS } from '$ui/testids';
import { PHONE_PORTRAIT } from '$ui/shell/layout';
import { TrajectoryCard } from '$ui/shell/TrajectoryCard/TrajectoryCard';
import { installMemoryStorage } from '../../memory-storage';
import { renderWithSession } from './render';

function stubMedia(phone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query === PHONE_PORTRAIT,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/** A stand-in 2D context: the card only hands it over, the renderer draws with it. */
const fakeContext = { canvas: { width: 0, height: 0 } } as unknown as CanvasRenderingContext2D;

function stubCanvas(context: CanvasRenderingContext2D | null) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
}

/** Render with storage prepared first, and the session's bindMap watched. */
function renderCard(stored?: string) {
  const storage = installMemoryStorage();
  if (stored !== undefined) storage.setItem(MAP_KEY, stored);
  const session = createSession();
  const bindMap = vi.spyOn(session, 'bindMap');
  const result = renderWithSession(<TrajectoryCard />, session);
  const surface = () => bindMap.mock.calls.at(-1)?.[0] as MapSurface | null | undefined;
  return { ...result, bindMap, surface, storage };
}

beforeEach(() => {
  stubMedia(false);
  stubCanvas(fakeContext);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TrajectoryCard', () => {
  it('makes way for the debrief on a phone, and only there', () => {
    for (const phone of [true, false]) {
      stubMedia(phone);
      const { session, unmount, surface } = renderCard('1');
      // Only its presence matters here; the card's contents are Debrief.test's.
      act(() => session.store.setState({ flightOver: true, debrief: {} as Debrief }));
      const card = screen.getByTestId('trajectory-map');
      if (phone) expect(card, 'phone').not.toBeVisible();
      else expect(card, 'desktop').toBeVisible();
      // A hidden map is not drawn: the tick skips it.
      expect(surface()!.visible, 'drawn').toBe(!phone);
      unmount();
    }
  });

  it('renders the map, its toggle and its canvas, once each', () => {
    renderCard();
    for (const id of MAP_TESTIDS) expect(screen.getAllByTestId(id)).toHaveLength(1);
    expect(screen.getByTestId('map-toggle')).toHaveAccessibleName('Trajectory');
  });

  it('hands the session a surface over its canvas, reporting onto the card', () => {
    const { bindMap, surface } = renderCard();
    expect(bindMap).toHaveBeenCalledOnce();
    const s = surface()!;
    expect(s.context).toBe(fakeContext);
    // The renderer writes data-marker / data-span onto this element; the e2e reads them there.
    expect(s.status).toBe(screen.getByTestId('trajectory-map'));
    expect(s.visible).toBe(true);
    expect(s.dirty).toBe(true);
    expect(s.scale).toBeGreaterThan(0);
  });

  it('hands over nothing when the browser refuses a 2D context, and still renders', () => {
    stubCanvas(null);
    const { bindMap } = renderCard();
    expect(bindMap).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('map-toggle')).toBeInTheDocument();
  });

  it('folds by hiding the canvas, tells the tick, and remembers the choice', () => {
    const { surface, storage } = renderCard();
    const toggle = screen.getByTestId('map-toggle');
    const canvas = screen.getByTestId('map-canvas');
    const s = surface()!;

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(canvas).toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(canvas).not.toBeVisible();
    expect(canvas).toBeInTheDocument(); // the session holds its context
    expect(s.visible).toBe(false);
    expect(storage.getItem(MAP_KEY)).toBe('0');

    s.dirty = false;
    fireEvent.click(toggle);
    expect(canvas).toBeVisible();
    expect(s.visible).toBe(true);
    // Unfolding forces one redraw, so a stale flight never shows.
    expect(s.dirty).toBe(true);
    expect(storage.getItem(MAP_KEY)).toBe('1');
  });

  it('starts as it was left', () => {
    const { surface } = renderCard('0');
    expect(screen.getByTestId('map-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(surface()!.visible).toBe(false);
  });

  it('starts folded on a phone when nothing is remembered', () => {
    stubMedia(true);
    renderCard();
    expect(screen.getByTestId('map-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('map-canvas')).not.toBeVisible();
  });

  it('goes back to the layout default when preferences are restored', () => {
    renderCard('0');
    expect(screen.getByTestId('map-toggle')).toHaveAttribute('aria-expanded', 'false');
    act(() => clearPreferences());
    expect(screen.getByTestId('map-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  it('takes the surface back when it unmounts', () => {
    const { bindMap, unmount } = renderCard();
    unmount();
    expect(bindMap).toHaveBeenLastCalledWith(null);
  });
});
