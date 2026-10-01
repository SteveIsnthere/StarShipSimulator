/**
 * A dial's fill beside its number: a small 270° arc on a desktop, a straight
 * tick under the number on a phone.
 *
 * Both shapes are always in the page, because the metric binder resolves each
 * once and writes it every frame its quantum moves (`$hud/metrics`): the arc's
 * `stroke-dashoffset`, the tick's `width`. The layout only chooses which one
 * shows. Nothing here is reactive.
 */
import { GAUGE_CIRCUMFERENCE, GAUGE_RADIUS, GAUGE_SWEEP } from '$hud/metrics';
import { cn } from '@ui/internal/utils';

/** Show three quarters of the circle; rotating 135° puts the gap at the bottom. */
const DASH = `${GAUGE_SWEEP} ${GAUGE_CIRCUMFERENCE}`;

export function GaugeArc({ metric, className }: { metric: string; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className={cn('size-7 shrink-0', className)}>
      <circle
        cx="40"
        cy="40"
        r={GAUGE_RADIUS}
        fill="none"
        strokeWidth="9"
        strokeDasharray={DASH}
        transform="rotate(135 40 40)"
        className="stroke-ui-line-muted"
      />
      <circle
        cx="40"
        cy="40"
        r={GAUGE_RADIUS}
        fill="none"
        strokeWidth="9"
        strokeDasharray={DASH}
        strokeDashoffset={GAUGE_SWEEP}
        transform="rotate(135 40 40)"
        className="stroke-ui-fg"
        data-metric={metric}
      />
    </svg>
  );
}

export function GaugeTick({ metric, className }: { metric: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 3"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('block h-[3px] w-full', className)}
    >
      <rect x="0" y="0" width="100" height="3" className="fill-ui-line-muted" />
      <rect x="0" y="0" width="0" height="3" className="fill-ui-fg" data-metric={metric} />
    </svg>
  );
}
