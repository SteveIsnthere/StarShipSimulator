/**
 * The shared cursor's readout: every recorded channel at one moment.
 *
 * ALL of them, not just the hovered plot's — "what was the angle of attack when
 * the heating peaked" is asked on one plot and answered from another. Values
 * come from the display copy of the flight, so angles read in degrees, the
 * same numbers the plots draw.
 *
 * Its box is the same size empty or full, so the plots beside it never move as
 * the pointer comes and goes.
 */
import type { Reading } from '$ui/blackbox';
import { cn } from '@ui/internal/utils';
import { channelDisplay, formatValue } from './channels';

export interface ReadoutProps {
  /** s — the moment under the cursor, or null with nothing hovered. */
  readonly at: number | null;
  readonly readings: readonly Reading[];
  /** s — the end of the recording, which every legend shows at rest. */
  readonly end: number | null;
  readonly className?: string;
}

export function Readout({ at, readings, end, className }: ReadoutProps) {
  const live = at !== null && readings.length > 0;
  return (
    <section
      aria-label="Every channel at the cursor"
      data-blackbox-readout
      data-testid="black-box-readout"
      className={cn(
        'h-32 overflow-y-auto border border-ui-line-muted bg-ui-surface px-3 py-2.5 text-[12px] lg:h-auto lg:max-h-[calc(100dvh-12rem)]',
        className,
      )}
    >
      {live ? (
        <>
          <p className="at mb-1.5 font-mono text-[12px] text-ui-fg">T+{at.toFixed(2)}</p>
          <dl className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-x-6 lg:grid-cols-1">
            {readings.map((reading) => (
              <div key={reading.id} data-channel={reading.id} className="flex items-baseline justify-between gap-3 py-0.5">
                <dt className="truncate text-ui-muted">{channelDisplay(reading.id).label}</dt>
                <dd className="m-0 shrink-0 font-mono text-ui-fg">{formatValue(reading.id, reading.value)}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="m-0 leading-relaxed text-ui-muted">
          {end === null ? '' : (
            <>
              Legends show the end of the flight, <span className="font-mono text-ui-fg">T+{end.toFixed(1)}</span>.{' '}
            </>
          )}
          Hover a plot to read every channel at that moment.
        </p>
      )}
    </section>
  );
}
