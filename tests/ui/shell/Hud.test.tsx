// @vitest-environment jsdom
/**
 * The primary cluster, rendered with the status bar as App renders them.
 *
 * The contract that matters most here is the hand-off: every readout and drawn
 * metric the binders know exists exactly once in the page, and the resolvers
 * the session is given find each of them — the clock in the status bar
 * included. The real binders are then run through those resolvers, so "finds
 * them" means "the numbers arrive", not merely "returns something".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { createHudBinder, createMetricBinder, type AttributeTarget, type TextTarget } from '$hud/binder';
import type { Debrief } from '$hud/debrief';
import { ENGINE_STATES } from '$hud/metrics';
import { trackFor, type EventId } from '$hud/timeline';
import { eventMetricId } from '$hud/timeline-binder';
import { getScenario } from '$core/scenarios';
import { createSession } from '$ui/session/session';
import {
  METRIC_IDS,
  READOUT_IDS,
  TIMELINE_TESTIDS,
  byTestId,
  metricSelector,
  readoutTestId,
  readoutUnitTestId,
  readoutValueTestId,
} from '$ui/testids';
import { PHONE_PORTRAIT } from '$ui/shell/layout';
import { Hud } from '$ui/shell/Hud/Hud';
import { StatusBar } from '$ui/shell/StatusBar/StatusBar';
import { installMemoryStorage } from '../../memory-storage';
import { renderWithSession } from './render';

type ReadoutResolve = (id: string) => { value: TextTarget | null; unit: TextTarget | null };
type MetricResolve = (id: string) => AttributeTarget | null;

function stubMedia(phone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query === PHONE_PORTRAIT,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/** A session with its bind calls watched, before anything renders. */
function watchedSession() {
  installMemoryStorage();
  const session = createSession();
  const bindHud = vi.spyOn(session, 'bindHud');
  const bindTimeline = vi.spyOn(session, 'bindTimeline');
  return { session, bindHud, bindTimeline };
}

function renderBoth() {
  const watched = watchedSession();
  const result = renderWithSession(
    <>
      <StatusBar />
      <Hud />
    </>,
    watched.session,
  );
  return { ...result, ...watched };
}

const count = (selector: string) => document.querySelectorAll(selector).length;

beforeEach(() => stubMedia(false));
afterEach(() => vi.unstubAllGlobals());

describe('Hud with StatusBar', () => {
  it('gives its zone to the debrief once the flight has ended, and takes it back', () => {
    const { session } = renderBoth();
    const hud = screen.getByRole('region', { name: 'Flight data' });
    expect(hud).toBeVisible();
    // Only its presence matters here; the card's contents are Debrief.test's.
    act(() => session.store.setState({ flightOver: true, debrief: {} as Debrief }));
    expect(hud).not.toBeVisible();
    act(() => session.store.setState({ flightOver: false, debrief: null }));
    expect(hud).toBeVisible();
  });

  it('renders every readout row, value and unit, and every drawn metric, exactly once', () => {
    renderBoth();
    for (const id of READOUT_IDS) {
      expect(count(byTestId(readoutTestId(id))), readoutTestId(id)).toBe(1);
      expect(count(byTestId(readoutValueTestId(id))), readoutValueTestId(id)).toBe(1);
      expect(count(byTestId(readoutUnitTestId(id))), readoutUnitTestId(id)).toBe(1);
    }
    for (const id of METRIC_IDS) expect(count(metricSelector(id)), id).toBe(1);
    for (const id of [...TIMELINE_TESTIDS, 'hud-toggle']) expect(count(byTestId(id)), id).toBe(1);
  });

  it('hands bindHud resolvers that find every element, across both surfaces', () => {
    const { bindHud } = renderBoth();
    expect(bindHud).toHaveBeenCalledOnce();
    const [resolve, resolveMetric] = bindHud.mock.calls[0]! as [ReadoutResolve, MetricResolve];

    for (const id of READOUT_IDS) {
      const { value, unit } = resolve(id);
      expect(value, id).toBe(document.querySelector(byTestId(readoutValueTestId(id))));
      expect(unit, id).toBe(document.querySelector(byTestId(readoutUnitTestId(id))));
      expect(value, id).not.toBeNull();
      expect(unit, id).not.toBeNull();
    }
    for (const id of METRIC_IDS) {
      const el = resolveMetric(id);
      expect(el, id).not.toBeNull();
      expect(el, id).toBe(document.querySelector(metricSelector(id)));
    }
  });

  it('those resolvers carry the real binders all the way to the screen', () => {
    const { bindHud, session } = renderBoth();
    const [resolve, resolveMetric] = bindHud.mock.calls[0]! as [ReadoutResolve, MetricResolve];

    const hud = createHudBinder({ resolve });
    const metrics = createMetricBinder({ resolve: resolveMetric });
    hud.update(session.loop.state);
    metrics.update(session.loop.state);

    for (const id of READOUT_IDS) {
      expect(screen.getByTestId(readoutValueTestId(id)).textContent, id).not.toBe('');
    }
    expect(screen.getByTestId(readoutValueTestId('clock')).textContent).toBe('00:00:00');
    expect(document.querySelector(metricSelector('gauge-speed'))!.getAttribute('stroke-dashoffset')).not.toBeNull();
    expect(document.querySelector(metricSelector('propellant-ch4'))!.getAttribute('width')).not.toBeNull();
    // The intro starts with its engines lighting; whatever the state, it is one the stylesheet draws.
    expect(ENGINE_STATES).toContain(document.querySelector(metricSelector('engine-0'))!.getAttribute('data-state'));
    expect(document.querySelector(metricSelector('attitude'))!.getAttribute('transform')).toMatch(/^rotate\(/);
    // The limit states land on the value elements of heat and Q.
    expect(screen.getByTestId(readoutValueTestId('heat'))).toHaveAttribute('data-state', 'nominal');
    expect(screen.getByTestId(readoutValueTestId('dynamicPressure'))).toHaveAttribute('data-state', 'nominal');
  });

  it('points the binders away from the page when it goes', () => {
    const { bindHud, unmount } = renderBoth();
    unmount();
    expect(bindHud).toHaveBeenCalledTimes(2);
    const [resolve, resolveMetric] = bindHud.mock.calls[1]! as [ReadoutResolve, MetricResolve];
    expect(resolve('altitude')).toEqual({ value: null, unit: null });
    expect(resolveMetric('gauge-speed')).toBeNull();
  });

  it('folds the secondary readouts behind hud-toggle without unmounting them', () => {
    renderBoth();
    const toggle = screen.getByTestId('hud-toggle');
    const twr = screen.getByTestId(readoutTestId('twr'));

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(twr).toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(twr).not.toBeVisible();
    expect(twr).toBeInTheDocument();
    // The primary three stay.
    expect(screen.getByTestId(readoutTestId('altitude'))).toBeVisible();
    expect(screen.getByTestId(readoutTestId('speedY'))).toBeVisible();
    expect(screen.getByTestId(readoutTestId('speed'))).toBeVisible();

    fireEvent.click(toggle);
    expect(twr).toBeVisible();
  });

  it('starts folded on a phone', () => {
    stubMedia(true);
    renderBoth();
    expect(screen.getByTestId('hud-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId(readoutTestId('twr'))).not.toBeVisible();
  });

  it('binds the timeline to the scenario track and rebinds when a different scenario starts', () => {
    const { bindTimeline, session } = renderBoth();
    const last = () => bindTimeline.mock.calls.at(-1)! as unknown as [
      readonly EventId[],
      (id: string) => AttributeTarget | null,
      (id: 'now' | 'next') => TextTarget | null,
    ];

    const [introTrack, introResolve, text] = last();
    expect(introTrack).toEqual(trackFor('intro'));
    for (const event of introTrack) {
      expect(introResolve(eventMetricId(event)), event).toBe(document.querySelector(metricSelector(eventMetricId(event))));
    }
    expect(text('now')).toBe(screen.getByTestId('event-now'));
    expect(text('next')).toBe(screen.getByTestId('event-next'));
    expect(screen.getByTestId('event-now').parentElement).toHaveAttribute('aria-live', 'polite');

    act(() => session.startFlight(getScenario('booster-sep')!));
    const [track, resolve] = last();
    expect(track).toEqual(trackFor('booster-sep'));
    expect(count(metricSelector(eventMetricId('ENTRY')))).toBe(1);
    expect(resolve(eventMetricId('ENTRY'))).toBe(document.querySelector(metricSelector(eventMetricId('ENTRY'))));
  });

  it('announces nothing per frame: one quiet status region for the numbers', () => {
    renderBoth();
    expect(document.querySelectorAll('[role="status"][aria-live="off"]')).toHaveLength(1);
  });
});
