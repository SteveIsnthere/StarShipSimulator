/**
 * One figure on the debrief: what it is, the number, and the limit it was
 * judged by. Caution and alarm colour the number AND name themselves in words
 * ("Near limit 10", "Over limit 10"), with a shape beside the word (hollow for
 * caution, filled for alarm), so a colour-blind player loses nothing
 * (design-system.md §2.9).
 */
import { Eyebrow } from '@ui/Eyebrow';
import type { Figure, Level } from './figures';

const TONE: Record<Level, string> = {
  nominal: 'text-ui-fg',
  caution: 'text-flight-caution',
  alarm: 'text-flight-alarm',
};

export function FigureCell({ figure }: { figure: Figure }) {
  const tone = TONE[figure.level ?? 'nominal'];
  return (
    <div
      className="flex min-w-0 flex-col gap-1"
      data-testid={figure.testid}
      data-debrief-figure={figure.key}
      data-level={figure.level ?? undefined}
    >
      <Eyebrow size="sm" tone="muted" className="truncate">
        {figure.label}
      </Eyebrow>
      {/* `.value` holds the number and its unit together: the e2e reads it. */}
      <span className={`value font-tight text-[20px] leading-none font-semibold tabular-nums ${tone}`}>
        {figure.value}
        {figure.unit && <span className="ml-1 font-mono text-[11px] font-medium text-ui-muted">{figure.unit}</span>}
      </span>
      <span className="min-h-[1lh] text-[11px] leading-tight text-ui-dim">
        {figure.word && (
          <span className={`inline-flex items-center gap-1 font-semibold ${tone}`}>
            <span
              aria-hidden
              className={`inline-block size-1.5 border border-current ${figure.level === 'alarm' ? 'bg-current' : ''}`}
            />
            {figure.word}
          </span>
        )}
        {figure.word && ' '}
        {figure.note}
      </span>
    </div>
  );
}
