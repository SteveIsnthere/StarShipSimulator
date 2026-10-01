/**
 * The mission event track: the events this scenario expects, dim until
 * reached, the current one lit, with the same story in words (now → next).
 *
 * The dots are rendered once per track and their state is written by the
 * timeline binder as `data-state` (pending · reached · current). The track
 * changes only when a flight with a different scenario starts — an
 * interaction — and each time it does, the binder is pointed at the new dots.
 *
 * On a desktop the rail shows and the narration is for a screen reader; on a
 * phone the rail does not fit, so the narration is the whole timeline.
 */
import { useEffect, useMemo, useRef } from 'react';
import { trackFor } from '$hud/timeline';
import { eventMetricId } from '$hud/timeline-binder';
import { metricSelector } from '$ui/testids';
import { cn } from '@ui/internal/utils';
import { useSession, useSessionState } from '../session-context';

export function MissionTimeline({ compact, className }: { compact: boolean; className?: string }) {
  const session = useSession();
  // The track follows the preset the flight was built from; a flight set up in
  // the editor is `custom` and gets the general shape, as it always has.
  const scenarioId = useSessionState((s) => s.preset.id);
  const track = useMemo(() => trackFor(scenarioId), [scenarioId]);

  const rail = useRef<HTMLOListElement>(null);
  const now = useRef<HTMLSpanElement>(null);
  const next = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rail.current;
    session.bindTimeline(
      track,
      (id) => root?.querySelector(metricSelector(id)) ?? null,
      (which) => (which === 'now' ? now.current : next.current),
    );
    // Unmounting points the binder at nothing rather than at detached dots.
    return () => session.bindTimeline([], () => null, () => null);
  }, [session, track]);

  return (
    <div data-testid="timeline" className={cn('grid min-w-0 gap-1', className)}>
      <ol ref={rail} aria-hidden="true" className={cn('flex min-w-0 items-start gap-1.5', compact && 'hidden')}>
        {track.map((event, index) => (
          <li key={event} className={cn('flex min-w-0 items-start gap-1.5', index < track.length - 1 && 'flex-1')}>
            <span className="grid justify-items-center gap-1">
              <span
                data-metric={eventMetricId(event)}
                data-state="pending"
                className="peer size-2 border border-ui-line-muted data-[state=current]:border-ui-fg data-[state=current]:bg-ui-fg data-[state=reached]:border-ui-muted data-[state=reached]:bg-ui-muted"
              />
              <span className="whitespace-nowrap font-mono text-[9px] uppercase leading-none tracking-[0.06em] text-ui-dim peer-data-[state=current]:text-ui-fg peer-data-[state=reached]:text-ui-muted">
                {event}
              </span>
            </span>
            {index < track.length - 1 && <span className="mt-1 h-px min-w-2 flex-1 bg-ui-line-muted" />}
          </li>
        ))}
      </ol>
      <div
        role="status"
        aria-live="polite"
        className={cn(compact ? 'flex min-w-0 items-baseline gap-2' : 'sr-only')}
      >
        <span ref={now} data-testid="event-now" className="font-mono text-[12px] font-medium uppercase text-ui-fg" />
        <span ref={next} data-testid="event-next" className="truncate font-mono text-[11px] uppercase text-ui-muted" />
      </div>
    </div>
  );
}
