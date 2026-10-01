// @vitest-environment jsdom
/**
 * The debrief card and the end-of-flight restart, rendered over a real
 * headless session whose flight is actually flown into the ground: the card is
 * built by `$hud/debrief` from that flight, exactly as the session builds it.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { advance } from '$app/loop';
import { vehicleHeight } from '$core/constants';
import { getScenario } from '$core/scenarios';
import { deg } from '$core/units';
import { createFlightWatch, debrief, type Debrief as FlightDebrief, type Judged } from '$hud/debrief';
import { DEBRIEF_TESTIDS } from '$ui/testids';
import type { Session } from '$ui/session/session';
import { Debrief } from '$ui/shell/Debrief/Debrief';
import { level, levelWord } from '$ui/shell/Debrief/figures';
import { renderWithSession } from './render';

/**
 * Drop the vehicle onto the pad from half a metre at `speedY`, engines off,
 * fins locked, and fly the session's own loop until it lands or crashes. The
 * timeline and a flight watch are fed every step, as the session feeds them.
 */
function flyOntoThePad(session: Session, speedY: number): FlightDebrief {
  session.startFlight({
    ...getScenario('landing-burn')!,
    altitude: vehicleHeight / 2 + 0.5,
    xPosition: 0,
    speedX: 0,
    speedY,
    pitch: deg(0),
    propellant: 20,
  });
  session.loop.state.status.finLocked = true;
  const watch = createFlightWatch();
  const onStep = (s: typeof session.loop.state) => {
    session.timeline.observe(s);
    watch.observe(s);
  };
  for (let frame = 0; frame < 2_000; frame++) {
    advance(session.loop, 1 / 60, { onStep });
    const s = session.loop.state;
    if (s.status.landed || s.failures.crashed) break;
  }
  return debrief(session.loop.state, session.timeline, watch.last);
}

/** End the flight the way the session's tick does: over, with its card. */
function endFlight(session: Session, card: FlightDebrief | null) {
  act(() => session.store.setState({ flightOver: true, debrief: card }));
}

describe('without a debrief', () => {
  it('renders nothing while the flight is going', () => {
    renderWithSession(<Debrief />);
    expect(screen.queryByTestId('debrief')).toBeNull();
    expect(screen.queryByTestId('restart')).toBeNull();
  });
});

describe('a crash', () => {
  it('renders every debrief test id, and says what happened in words', () => {
    const { session } = renderWithSession(<Debrief />);
    const card = flyOntoThePad(session, -12);
    expect(card.outcome).toBe('CRASH');
    endFlight(session, card);

    for (const id of DEBRIEF_TESTIDS) expect(screen.getByTestId(id), id).toBeInTheDocument();

    const root = screen.getByTestId('debrief');
    expect(root).toHaveAttribute('data-debrief');
    expect(root).toHaveAttribute('data-outcome', 'CRASH');
    expect(screen.getByTestId('debrief-outcome')).toHaveTextContent(/^Crashed$/);
    expect(screen.getByTestId('debrief-reason')).toHaveTextContent('Descending too fast');
  });

  it('the figure that ended it is named over its limit, not only coloured', () => {
    const { session } = renderWithSession(<Debrief />);
    endFlight(session, flyOntoThePad(session, -12));
    const vertical = screen.getByTestId('debrief-vertical');
    expect(vertical).toHaveAttribute('data-level', 'alarm');
    expect(vertical).toHaveTextContent('Over limit 10');
    // The figures that were fine say only their limit.
    const drift = screen.getByTestId('debrief-horizontal');
    expect(drift).toHaveAttribute('data-level', 'nominal');
    expect(drift).toHaveTextContent('Limit 2');
    expect(drift).not.toHaveTextContent(/Over|Near/);
  });

  it('lists events in words, not timeline ids', () => {
    const { session } = renderWithSession(<Debrief />);
    endFlight(session, flyOntoThePad(session, -12));
    const events = screen.getByTestId('debrief-events');
    expect(events).toHaveTextContent('Vehicle lost');
    expect(events).not.toHaveTextContent('LOSS');
  });
});

describe('a landing', () => {
  it('reads Landed, with no reason and every landing figure inside its limit', () => {
    const { session } = renderWithSession(<Debrief />);
    const card = flyOntoThePad(session, -1);
    expect(card.outcome).toBe('TOUCHDOWN');
    endFlight(session, card);

    expect(screen.getByTestId('debrief-outcome')).toHaveTextContent(/^Landed$/);
    expect(screen.queryByTestId('debrief-reason')).toBeNull();
    for (const id of ['debrief-vertical', 'debrief-horizontal', 'debrief-attitude']) {
      expect(screen.getByTestId(id), id).not.toHaveTextContent(/Over|At limit/);
    }
    expect(screen.getByTestId('debrief-miss')).toHaveTextContent('On the pad');
    expect(screen.getByTestId('debrief-events')).toHaveTextContent('Touchdown');
  });

  it('a break-up has no touchdown to judge, so the landing figures go', () => {
    const { session } = renderWithSession(<Debrief />);
    const landed = flyOntoThePad(session, -1);
    endFlight(session, { ...landed, outcome: 'LOSS', touchedDown: false, reasons: ['over the heating limit'] });
    expect(screen.getByTestId('debrief-outcome')).toHaveTextContent(/^Broke up$/);
    expect(screen.getByTestId('debrief-reason')).toHaveTextContent('Over the heating limit');
    for (const id of ['debrief-vertical', 'debrief-horizontal', 'debrief-attitude', 'debrief-miss']) {
      expect(screen.queryByTestId(id), id).toBeNull();
    }
    expect(screen.getByTestId('debrief-peak-heat')).toBeInTheDocument();
  });
});

describe('the buttons call their commands', () => {
  it('Fly again restarts, Black box opens the black box, Close dismisses', () => {
    const { session } = renderWithSession(<Debrief />);
    endFlight(session, flyOntoThePad(session, -1));
    const restart = vi.spyOn(session, 'restart');
    const openLayer = vi.spyOn(session, 'openLayer');
    const dismiss = vi.spyOn(session, 'dismissDebrief');

    fireEvent.click(screen.getByTestId('debrief-black-box'));
    expect(openLayer).toHaveBeenCalledWith('blackBox');
    fireEvent.click(screen.getByRole('button', { name: 'Change scenario' }));
    expect(openLayer).toHaveBeenCalledWith('menu');

    fireEvent.click(screen.getByTestId('debrief-close'));
    expect(dismiss).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('debrief')).toBeNull();

    // With the card gone the flight is still over: the restart takes its place.
    fireEvent.click(screen.getByTestId('restart'));
    expect(restart).toHaveBeenCalledOnce();
  });

  it('Fly again on the card starts the flight again and clears the card', () => {
    const { session } = renderWithSession(<Debrief />);
    endFlight(session, flyOntoThePad(session, -1));
    const restart = vi.spyOn(session, 'restart');
    fireEvent.click(within(screen.getByTestId('debrief')).getByTestId('debrief-restart'));
    expect(restart).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('debrief')).toBeNull();
    expect(screen.queryByTestId('restart')).toBeNull();
  });
});

describe('the restart button', () => {
  it('appears only when the flight is over and there is no card', () => {
    const { session } = renderWithSession(<Debrief />);
    const card = flyOntoThePad(session, -1);

    endFlight(session, card);
    expect(screen.queryByTestId('restart')).toBeNull();

    // Out of propellant in the air: over, and nothing to debrief.
    endFlight(session, null);
    expect(screen.getByTestId('restart')).toHaveTextContent('Fly again');

    act(() => session.store.setState({ flightOver: false }));
    expect(screen.queryByTestId('restart')).toBeNull();
  });
});

describe('levels', () => {
  const judged = (fraction: number, exceeded = false): Judged => ({ value: fraction * 10, limit: 10, fraction, exceeded });

  it('caution and alarm are the gauges’ thresholds, each with its word', () => {
    expect([level(judged(0.5)), levelWord(judged(0.5))]).toEqual(['nominal', null]);
    expect([level(judged(0.85)), levelWord(judged(0.85))]).toEqual(['caution', 'Near']);
    expect([level(judged(1)), levelWord(judged(1))]).toEqual(['alarm', 'At']);
    expect([level(judged(1.2)), levelWord(judged(1.2))]).toEqual(['alarm', 'Over']);
    // What ended the flight is alarm whatever its fraction says.
    expect([level(judged(0.99, true)), levelWord(judged(0.99, true))]).toEqual(['alarm', 'Over']);
  });
});
