/**
 * Attitude: a chevron on the vehicle's nose axis and the pitch in degrees.
 *
 * The metric binder rotates the chevron about the centre of its 24-unit box
 * (`rotate(<deg> 12 12)`, 0 is straight up); the readout binder writes the
 * number beside it. Both are whole degrees, so they never disagree.
 */
import { readoutTestId } from '$ui/testids';
import { Eyebrow } from '@ui/Eyebrow';
import { ReadoutText } from './ReadoutText';
import { SECONDARY_VALUE_CLASS } from './hud-styles';

/** On a phone the labels go to a screen reader only: the strip has no room for words beside the marks. */
export function Attitude({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Eyebrow size="sm" tone="muted" className={compact ? 'sr-only' : undefined}>
        Attitude
      </Eyebrow>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0">
        <circle cx="12" cy="12" r="11" fill="none" strokeWidth="1" className="stroke-ui-line-muted" />
        <g data-metric="attitude" transform="rotate(0 12 12)">
          <path d="M12 3 L19 17 L12 13 L5 17 Z" className="fill-ui-fg" />
        </g>
      </svg>
      <span data-testid={readoutTestId('pitch')} className="flex items-baseline whitespace-nowrap">
        <ReadoutText
          id="pitch"
          valueClassName={`inline-block min-w-[3ch] text-right ${SECONDARY_VALUE_CLASS}`}
          unitClassName="font-mono text-[12px] text-ui-muted"
        />
      </span>
    </div>
  );
}
