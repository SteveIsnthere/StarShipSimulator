/**
 * The engines, one mark each, read by shape as well as fill
 * (design-system.md §9): off is an empty square, igniting a square with a
 * centre, lit a solid square, failed a crossed square in the alarm colour.
 *
 * The metric binder writes `data-state` (off · igniting · lit · failed) on each
 * mark; the shapes are selected from it in CSS, so nothing here re-renders.
 */
import { Eyebrow } from '@ui/Eyebrow';
import { RAPTORS } from '$core/constants';

const ENGINES = RAPTORS.map((_, i) => i);

/** On a phone the labels go to a screen reader only: the strip has no room for words beside the marks. */
export function EngineDots({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Eyebrow size="sm" tone="muted" className={compact ? 'sr-only' : undefined}>
        Engines
      </Eyebrow>
      <div className="flex gap-1.5" aria-hidden="true">
        {ENGINES.map((engine) => (
          <svg
            key={engine}
            viewBox="0 0 12 12"
            className="group size-3 shrink-0"
            data-metric={`engine-${engine}`}
            data-state="off"
          >
            <rect
              x="0.5"
              y="0.5"
              width="11"
              height="11"
              strokeWidth="1"
              className="fill-transparent stroke-ui-fg group-data-[state=failed]:stroke-flight-alarm group-data-[state=lit]:fill-ui-fg"
            />
            <rect x="4" y="4" width="4" height="4" className="hidden fill-ui-fg group-data-[state=igniting]:block" />
            <path
              d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"
              strokeWidth="1.5"
              className="hidden stroke-flight-alarm group-data-[state=failed]:block"
            />
          </svg>
        ))}
      </div>
    </div>
  );
}
