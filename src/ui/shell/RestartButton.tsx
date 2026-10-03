/**
 * The way back into the air when a flight is over and there is no debrief to
 * carry it: out of propellant in the air (no touchdown to judge), or after the
 * card was put away. Hidden while the card is up — the card's "Fly again" is
 * the same action, and two buttons for one action is the bug M12.1 found.
 *
 * Just under the primary cluster (`--hud-bottom`, published by the Hud): where
 * the eye already is, and clear of the vehicle, which comes to rest at the
 * bottom of the world. On a portrait phone, at the left beside the map.
 * Short landscape uses the HUD header, where it cannot cover the map toggle.
 */
import { Button } from '@ui/Button';
import { cn } from '@ui/internal/utils';
import { useSession, useSessionState } from './session-context';
import { useLayoutMode } from './layout';

export function RestartButton({ inline = false }: { inline?: boolean }) {
  const session = useSession();
  const shown = useSessionState((s) => s.flightOver && s.debrief === null);
  const mode = useLayoutMode();
  if (!shown || inline !== (mode === 'short')) return null;
  return (
    <Button
      variant="primary"
      data-control="restart"
      data-testid="restart"
      className={inline ? 'shrink-0' : cn('absolute top-[calc(var(--hud-bottom,220px)+12px)]', mode === 'phone' ? 'left-3' : 'left-1/2 -translate-x-1/2')}
      onClick={() => session.restart()}
    >
      Fly again
    </Button>
  );
}
