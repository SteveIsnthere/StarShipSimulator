/**
 * The mission clock: simulated time since the flight began.
 *
 * A HUD readout like any other, so the binder writes it. The Hud binds every
 * readout by test id across the document once both surfaces are in the page;
 * this element must therefore stay mounted, in the same place, for the life of
 * the status bar — only its styling may follow the layout.
 */
import { readoutTestId } from '$ui/testids';
import { cn } from '@ui/internal/utils';
import { ReadoutText } from '../Hud/ReadoutText';

export function MissionClock({ className }: { className?: string }) {
  return (
    <div
      data-testid={readoutTestId('clock')}
      className={cn('flex items-baseline gap-1.5 whitespace-nowrap font-mono leading-none', className)}
    >
      <span className="text-[11px] text-ui-muted max-[22rem]:sr-only">T+</span>
      <ReadoutText id="clock" valueClassName="text-[15px] font-medium text-ui-fg" unitHidden />
    </div>
  );
}
