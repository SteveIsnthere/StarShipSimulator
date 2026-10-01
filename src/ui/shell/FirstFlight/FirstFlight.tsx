/**
 * The first thing to press, once, on a fresh profile.
 *
 * Names the controls a new player needs and nothing else, in the words on the
 * buttons themselves: Engines, Throttle, Menu. The 2021 copy named "All
 * Raptors" and "Thrust", which no longer exist (docs/design/ux-critique.md).
 *
 * Shown while `isHintOpen` (not yet seen, room for it, no layer over the
 * flight) and not in cinematic mode, which hides the controls it names. ANY
 * input dismisses it (the session listens in the capture phase), so the card
 * is transparent to the pointer except for its own button: the tap that clears
 * it is the same tap that lights the engines.
 *
 * Clear of the vehicle, which flies the middle of the screen and lands at its
 * bottom: top-left on a desktop, beside the primary cluster (the map holds the
 * top-right); on a phone under the primary strip (`--hud-bottom`, published by
 * the Hud) and the folded map card's row below it. Opening the map is an input,
 * and any input puts the hint away, so the two never show open together.
 */
import { Button } from '@ui/Button';
import { Eyebrow } from '@ui/Eyebrow';
import { KeyCap } from '@ui/KeyCap';
import { isHintOpen } from '$ui/session/store';
import { useSession, useSessionState } from '../session-context';
import { usePhoneLayout } from '../layout';
import { HINT_KEYS } from './keys';

const PLACEMENT = {
  desktop:
    'ui-safe-margin-top left-4 top-14 w-[clamp(200px,calc(50vw-312px),340px)]',
  phone: 'left-3 right-3 top-[calc(var(--hud-bottom,220px)+62px)]',
} as const;

export function FirstFlight() {
  const session = useSession();
  // The debrief's own actions are the next step once a flight has ended.
  const open = useSessionState((s) => isHintOpen(s) && !s.cinematic && s.debrief === null);
  const phone = usePhoneLayout();
  if (!open) return null;

  return (
    <div
      role="note"
      aria-label="Getting started"
      data-testid="first-flight-hint"
      className={`flight-panel absolute flex flex-col gap-2 p-3.5 text-ui-fg pointer-events-none! ${PLACEMENT[phone ? 'phone' : 'desktop']}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Eyebrow size="sm" tone="muted">
          First flight
        </Eyebrow>
        <Button
          size="sm"
          data-testid="first-flight-dismiss"
          className="pointer-events-auto"
          onClick={() => session.dismissHint()}
        >
          Got it
        </Button>
      </div>
      <p className="m-0 font-tight text-[18px] leading-tight font-semibold">Take the controls</p>
      <p className="m-0 text-[13px] leading-snug text-ui-muted">
        Press <b className="font-semibold text-ui-fg">Engines</b> to light them, then push{' '}
        <b className="font-semibold text-ui-fg">Throttle</b> up to climb.{' '}
        <b className="font-semibold text-ui-fg">Menu</b> picks another flight.
      </p>
      {/* A phone has no keyboard; anything that can hover probably does. */}
      <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ui-muted [@media(hover:none)]:hidden">
        {HINT_KEYS.map((k) => (
          <span key={k.cap} className="inline-flex items-center gap-1.5">
            <KeyCap>{k.cap}</KeyCap>
            {k.does}
          </span>
        ))}
      </p>
    </div>
  );
}
