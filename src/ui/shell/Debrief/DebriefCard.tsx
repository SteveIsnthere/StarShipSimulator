/**
 * The card a flight ends on: what happened, the figures that decided it
 * against their limits, the events it flew through, and the way on.
 *
 * Beside the vehicle rather than over it: the right side on a desktop, a
 * bottom card above the tab bar on a phone (docs/design/ia.md). An opaque
 * surface (design-system.md §8), but TRANSPARENT TO THE POINTER except for its
 * buttons. It is a summary, not a dialog: the session puts it away on the first
 * touch outside `[data-debrief]`, and the control under that touch still gets
 * it, which only works if the card's readouts never swallow a tap meant for the
 * flight. The cost is that it cannot scroll, so it has to fit: on a short
 * screen the grid widens to two rows and the event list goes (the timeline
 * already shows the events).
 */
import { Button } from '@ui/Button';
import { Eyebrow } from '@ui/Eyebrow';
import type { Debrief as FlightDebrief } from '$hud/debrief';
import { formatClock } from '$hud/readouts';
import { useSession, useSessionState } from '../session-context';
import { usePhoneLayout } from '../layout';
import { FigureCell } from './FigureCell';
import { EVENT_LABEL, OUTCOME_HEADING, figures, reasonSentence } from './figures';

/*
 * Below 32rem of height the card cannot float and still fit, so it compacts
 * (the `[@media(max-height:32rem)]` variants). Spelled out in full each time:
 * Tailwind finds classes by scanning for literal strings.
 */
const PLACEMENT = {
  // Centred, so it takes only the vertical safe inset and narrows by the side ones
  // (the kit's rule for centred chrome). Short screens: wider and lower-capped,
  // ending above the folded control rails.
  desktop: 'ui-safe-margin-top left-1/2 -translate-x-1/2 top-14 w-[min(560px,calc(var(--ui-safe-width)-32px))] max-h-[calc(100dvh-72px)] [@media(max-height:32rem)]:w-[min(600px,calc(var(--ui-safe-width)-32px))] [@media(max-height:32rem)]:max-h-[calc(100dvh-124px)]',
  phone: 'left-3 right-3 top-[calc(61px+env(safe-area-inset-top,0px))] max-h-[calc(100dvh-133px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]',
} as const;

export function DebriefCard({ card }: { card: FlightDebrief }) {
  const session = useSession();
  const scenario = useSessionState((s) => s.preset.name);
  const phone = usePhoneLayout();
  const cells = figures(card);

  return (
    <section
      aria-label="Flight debrief"
      data-debrief
      data-testid="debrief"
      data-outcome={card.outcome}
      className={`absolute flex flex-col overflow-hidden border border-ui-line bg-ui-surface text-ui-fg pointer-events-none! ${PLACEMENT[phone ? 'phone' : 'desktop']}`}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ui-line-muted py-4 pr-3 pl-5 [@media(max-height:32rem)]:py-2.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Eyebrow size="sm" tone="muted" className="truncate">
            {scenario}
          </Eyebrow>
          <h2 data-testid="debrief-outcome" className="m-0 font-tight text-[28px] leading-none font-semibold [@media(max-height:32rem)]:text-[22px]">
            {OUTCOME_HEADING[card.outcome]}
          </h2>
          {card.reasons.length > 0 && (
            <p data-testid="debrief-reason" className="m-0 text-[13px] leading-snug text-ui-muted">
              {reasonSentence(card.reasons)}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close debrief"
          data-testid="debrief-close"
          className="pointer-events-auto text-[18px]"
          onClick={() => session.dismissDebrief()}
        >
          <span aria-hidden>×</span>
        </Button>
      </header>

      {/* The one part that scrolls when the card is capped: the heading and the actions always show. */}
      <div className="pointer-events-auto grid min-h-0 grid-cols-3 gap-x-4 gap-y-3 overflow-y-auto overscroll-contain px-5 py-4 [@media(max-height:32rem)]:grid-cols-5 [@media(max-height:32rem)]:py-3">
        {cells.map((figure) => (
          <FigureCell key={figure.key} figure={figure} />
        ))}
      </div>

      {card.events.length > 0 && (
        <ol
          aria-label="Events"
          data-testid="debrief-events"
          className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 border-t border-ui-line-muted px-5 py-3 text-[12px] text-ui-muted [@media(max-height:32rem)]:hidden"
        >
          {card.events.map((event) => (
            <li key={event.id} data-event={event.id}>
              <span className="mr-1.5 font-mono text-[11px] text-ui-dim">{formatClock(event.at)}</span>
              {EVENT_LABEL[event.id]}
            </li>
          ))}
        </ol>
      )}

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-ui-line-muted px-5 py-3 [@media(max-height:32rem)]:py-2">
        <Button
          data-testid="debrief-black-box"
          className="pointer-events-auto"
          onClick={() => session.openLayer('blackBox')}
        >
          Black box
        </Button>
        <Button className="pointer-events-auto" onClick={() => session.openLayer('menu')}>
          Change scenario
        </Button>
        <Button
          variant="primary"
          data-testid="debrief-restart"
          className="pointer-events-auto"
          onClick={() => session.restart()}
        >
          Fly again
        </Button>
      </div>
    </section>
  );
}
