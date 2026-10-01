/**
 * One control: it emits its event and nothing else.
 *
 * Whether it reads as lit is not its business. The state it reflects changes
 * without anyone pressing anything — the autopilot shuts engines down, a
 * landing clears Land — so the indicator binder owns it: `data-indicator` is
 * the binder's hook, and `indicators.ts` writes `is-on` and `aria-pressed`
 * straight to this node when the simulation's boolean flips. A button that
 * painted itself on click would show a lie the first time the simulation
 * disagreed.
 */
import type { ReactNode } from 'react';
import type { ControlEvent } from '$app/controls';
import { useSession } from '../session-context';

export interface ControlButtonProps {
  event: ControlEvent;
  /** Stable identifier for the e2e suite (src/ui/testids.ts). */
  testid: string;
  /** The `$hud/indicators` id, when the control has a lit state. */
  indicator?: string;
  /** Fixed for the life of the button; see styles.ts. */
  className: string;
  /** When the visible content is not a name (an engine's dot). */
  'aria-label'?: string;
  title?: string;
  'aria-describedby'?: string;
  children: ReactNode;
}

export function ControlButton({ event, testid, indicator, className, children, ...rest }: ControlButtonProps) {
  const session = useSession();
  return (
    <button
      type="button"
      className={className}
      data-testid={testid}
      data-indicator={indicator}
      // Constant, so React writes it once and leaves it to the binder after that.
      aria-pressed={indicator === undefined ? undefined : false}
      onClick={() => session.emit(event)}
      {...rest}
    >
      {children}
    </button>
  );
}
