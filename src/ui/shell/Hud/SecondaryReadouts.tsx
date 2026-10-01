/**
 * The secondary readouts: visible but quieter than the primary three
 * (design-system.md §9), and collapsible (ia.md: collapsed on a phone).
 *
 * Collapsed by `hidden`, never unmounted: the binder resolved these text nodes
 * once and keeps writing them behind the fold.
 */
import type { ReadoutId } from '$ui/testids';
import { readoutTestId } from '$ui/testids';
import { cn } from '@ui/internal/utils';
import { ReadoutText } from './ReadoutText';
import { LIMIT_STATE_CLASS, SECONDARY_VALUE_CLASS, UNIT_CLASS } from './hud-styles';

interface Secondary {
  id: ReadoutId;
  /** The instrument abbreviation the HUD shows. */
  label: string;
  /** What the abbreviation stands for, in a player's words. */
  title: string;
  /** The limit-state metric written onto this value, if it can end a flight. */
  metric?: string;
  /** The binder's unit is already correct as written (kPa cannot be lower-cased into shape). */
  keepUnitCase?: boolean;
}

const SECONDARY: readonly Secondary[] = [
  { id: 'speedX', label: 'H/S', title: 'Horizontal speed' },
  { id: 'mach', label: 'Mach', title: 'Speed as a multiple of the speed of sound' },
  { id: 'dynamicPressure', label: 'Q', title: 'Dynamic pressure', metric: 'q-state', keepUnitCase: true },
  { id: 'gforce', label: 'G', title: 'Acceleration felt on board, in g' },
  { id: 'twr', label: 'TWR', title: 'Thrust to weight ratio' },
  { id: 'throttle', label: 'Throttle', title: 'Throttle' },
  { id: 'heat', label: 'Heat', title: 'Skin temperature', metric: 'heat-state' },
  { id: 'range', label: 'Range', title: 'Distance to the landing site' },
];

export function SecondaryReadouts({ id, hidden }: { id: string; hidden: boolean }) {
  return (
    <div id={id} hidden={hidden} className="grid grid-cols-4 gap-x-3 gap-y-2.5 border-t border-flight-backing-line pt-2.5">
      {SECONDARY.map((r) => (
        <div key={r.id} data-testid={readoutTestId(r.id)} className="grid min-w-0 gap-1">
          <abbr
            title={r.title}
            className="truncate font-mono text-[10px] uppercase leading-none tracking-[0.1em] text-ui-muted no-underline"
          >
            {r.label}
          </abbr>
          <span className="flex min-w-0 items-baseline whitespace-nowrap">
            <ReadoutText
              id={r.id}
              {...(r.metric ? { metric: r.metric } : {})}
              valueClassName={cn(SECONDARY_VALUE_CLASS, r.metric && LIMIT_STATE_CLASS)}
              unitClassName={cn(UNIT_CLASS, 'text-[10px]', r.keepUnitCase && 'normal-case')}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
