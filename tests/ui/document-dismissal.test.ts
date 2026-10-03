// @vitest-environment jsdom
/** Real document gestures must dismiss the history-backed selected report. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSession, type Session } from '$ui/session/session';
import { wireDocument } from '$ui/session/document-wiring';
import { DT } from '$app/loop';
import { installMemoryStorage } from '../memory-storage';

const teardown: (() => void)[] = [];
beforeEach(() => void installMemoryStorage());
afterEach(() => {
  for (const unwire of teardown.splice(0)) unwire();
  document.body.replaceChildren();
});

function listen(session: Session) {
  teardown.push(wireDocument({
    store: session.store,
    onGesture() {},
    onBackgrounded() {},
    emit: event => session.emit(event),
    zoom: direction => session.zoom(direction),
    readThrottle: () => session.loop.state.vehicle.throttle,
    dismissDebrief: () => session.dismissDebrief(),
    isManual: () => true,
  }));
}
function endedFlight() {
  const session = createSession();
  session.loop.state.failures.crashed = true;
  session.advance(DT);
  expect(session.store.getState().debrief?.outcome).toBe('CRASH');
  listen(session);
  return session;
}
function escape() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
function pointer(target: Element = document.body) { target.dispatchEvent(new Event('pointerdown', { bubbles: true })); }

describe('document dismissal owns the flight history', () => {
  it.each(['Escape', 'outside pointer'] as const)('%s keeps the actual report dismissed on subsequent frames', gesture => {
    const session = endedFlight();
    if (gesture === 'Escape') escape(); else pointer();
    expect(session.store.getState().debrief).toBeNull();
    session.advance(0);
    expect(session.store.getState().debrief).toBeNull();
    session.advance(DT);
    expect(session.store.getState().debrief).toBeNull();
    expect(session.store.getState().flightOver).toBe(true);
    session.restart();
    session.loop.state.failures.crashed = true;
    session.advance(DT);
    expect(session.store.getState().debrief?.outcome).toBe('CRASH');
  });

  it('an inside-card pointer preserves the report', () => {
    const session = endedFlight(), report = session.store.getState().debrief;
    const card = document.createElement('section'); card.setAttribute('data-debrief', '');
    const child = document.createElement('button'); card.append(child); document.body.append(card);
    pointer(child); session.advance(0);
    expect(session.store.getState().debrief).toBe(report);
  });

  it('an open layer keeps pointer dismissal away from the underlying report', () => {
    const session = endedFlight(), report = session.store.getState().debrief;
    session.openLayer('blackBox'); pointer(); session.advance(0);
    expect(session.store.getState().layer).toBe('blackBox');
    expect(session.store.getState().debrief).toBe(report);
  });

  it('Escape closes the top layer before dismissing the report, then opens the menu', () => {
    const session = endedFlight(), report = session.store.getState().debrief;
    session.openLayer('blackBox'); escape(); session.advance(0);
    expect(session.store.getState().layer).toBeNull();
    expect(session.store.getState().debrief).toBe(report);
    escape(); session.advance(0);
    expect(session.store.getState().debrief).toBeNull();
    expect(session.store.getState().layer).toBeNull();
    escape();
    expect(session.store.getState().layer).toBe('menu');
  });

  it('Escape dismisses only the selected mission body history', () => {
    const session = createSession(); session.startHotStage(123); session.stage();
    for (let i = 0; i < 180; i++) session.advance(DT);
    expect(session.mission!.phase).toBe('separated');
    session.mission!.ship.failures.inFlightBreakUp = true;
    session.mission!.booster.failures.inFlightBreakUp = true;
    session.advance(DT); listen(session);
    expect(session.store.getState().debrief?.outcome).toBe('LOSS');
    escape(); session.advance(0);
    expect(session.store.getState().debrief).toBeNull();
    session.selectVehicle('super-heavy');
    expect(session.store.getState().debrief?.outcome).toBe('LOSS');
    session.selectVehicle('ship'); session.advance(0);
    expect(session.store.getState().debrief).toBeNull();
  });
});
