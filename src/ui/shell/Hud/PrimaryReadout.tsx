/**
 * One of the three numbers a landing is flown on: altitude, vertical speed,
 * speed. The largest type on screen during a flight (design-system.md §5, §9).
 *
 * The value sits right-aligned in a fixed box so its unit never moves while the
 * digits change (§2.10). Altitude and speed carry their dial beside the number
 * and the dial's range above it; the range auto-scales in flight, so it is a
 * readout the binder writes, not text React owns.
 */
import type { ReadoutId } from '$ui/testids';
import { readoutTestId } from '$ui/testids';
import { Eyebrow } from '@ui/Eyebrow';
import { cn } from '@ui/internal/utils';
import { GaugeArc, GaugeTick } from './GaugeMarks';
import { ReadoutText } from './ReadoutText';
import { UNIT_CLASS } from './hud-styles';

export interface Dial {
  /** The arc's metric (desktop). */
  arc: string;
  /** The straight tick's metric (phone). */
  tick: string;
  /** The readout holding the dial's full-scale value. */
  scale: ReadoutId;
}

export interface PrimaryReadoutProps {
  id: ReadoutId;
  label: string;
  /** The shorter label a phone's strip has room for. */
  shortLabel?: string;
  dial?: Dial;
  compact: boolean;
}

export function PrimaryReadout({ id, label, shortLabel, dial, compact }: PrimaryReadoutProps) {
  return (
    <div data-testid={readoutTestId(id)} className={cn('grid min-w-0 content-start', compact ? 'gap-1' : 'gap-1.5')}>
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <Eyebrow size="sm" tone="muted" className="truncate">
          {compact && shortLabel ? shortLabel : label}
        </Eyebrow>
        {dial && (
          // The dial's range in words: "0–200 m/s" says what the arc is a fraction of.
          <span
            data-testid={readoutTestId(dial.scale)}
            className={cn('shrink-0 font-mono text-[10px] text-ui-muted', compact && 'hidden')}
          >
            <span className="sr-only">Dial range </span>
            <span aria-hidden="true">0–</span>
            <ReadoutText id={dial.scale} unitClassName="ml-0.5 lowercase" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {dial && <GaugeArc metric={dial.arc} className={cn(compact && 'hidden')} />}
        <span className="flex min-w-0 items-baseline whitespace-nowrap">
          <ReadoutText
            id={id}
            valueClassName={cn(
              'inline-block text-right font-tight font-semibold leading-none tracking-[-0.01em] text-ui-fg',
              compact ? 'min-w-[4ch] text-[26px]' : 'min-w-[5ch] text-[34px]',
            )}
            unitClassName={cn(UNIT_CLASS, compact ? 'text-[11px]' : 'text-[13px]')}
          />
        </span>
      </div>
      {dial && <GaugeTick metric={dial.tick} className={cn(!compact && 'hidden')} />}
    </div>
  );
}
