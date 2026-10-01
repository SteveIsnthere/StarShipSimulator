/**
 * Propellant: the methane and oxygen bars and the mass left.
 *
 * The simulation has one propellant mass, so both bars are driven by the same
 * fraction (`$hud/metrics` says why they are still drawn as the pair). The bar
 * widths are written by the metric binder into a 0..100 viewBox.
 */
import { readoutTestId } from '$ui/testids';
import { Eyebrow } from '@ui/Eyebrow';
import { cn } from '@ui/internal/utils';
import { ReadoutText } from './ReadoutText';
import { SECONDARY_VALUE_CLASS, UNIT_CLASS } from './hud-styles';

const TANKS = [
  ['CH4', 'propellant-ch4'],
  ['LOX', 'propellant-lox'],
] as const;

/** On a phone the labels go to a screen reader only: the strip has no room for words beside the marks. */
export function Propellant({ compact }: { compact: boolean }) {
  return (
    <div
      data-testid={readoutTestId('propellant')}
      className={cn(
        'grid min-w-0 items-center gap-x-2.5',
        // The label leaves the grid on a phone (sr-only is out of flow), so the columns follow it.
        compact ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-[auto_minmax(0,1fr)_auto]',
      )}
    >
      <Eyebrow size="sm" tone="muted" className={compact ? 'sr-only' : undefined}>
        Propellant
      </Eyebrow>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1" aria-hidden="true">
        {TANKS.map(([label, metric]) => (
          <div key={metric} className="contents">
            <span className="font-mono text-[9px] leading-none text-ui-muted">{label}</span>
            <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="block h-1 w-full">
              <rect x="0" y="0" width="100" height="4" className="fill-ui-line-muted" />
              <rect x="0" y="0" width="100" height="4" className="fill-ui-fg" data-metric={metric} />
            </svg>
          </div>
        ))}
      </div>
      <span className="flex items-baseline whitespace-nowrap">
        <ReadoutText
          id="propellant"
          valueClassName={`inline-block min-w-[3ch] text-right ${SECONDARY_VALUE_CLASS}`}
          unitClassName={`${UNIT_CLASS} text-[11px]`}
        />
      </span>
    </div>
  );
}
