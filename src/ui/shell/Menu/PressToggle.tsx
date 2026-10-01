/**
 * A setting that is on or off, as a full-width row: its name, a line saying
 * what it does, and its state.
 *
 * A button with `aria-pressed` rather than the kit's Toggle, which is a
 * `role="switch"`: the e2e contract reads these settings by `aria-pressed` and
 * by the `is-on` class (tests/e2e/menu.spec.ts, parity.spec.ts, sound.spec.ts).
 * The state is a filled square plus the word, never a colour alone.
 */
import { useId } from 'react';
import { cn } from '@ui/internal/utils';

export interface PressToggleProps {
  pressed: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
  testId: string;
}

export function PressToggle({ pressed, onToggle, label, description, testId }: PressToggleProps) {
  const id = useId();
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-description` : undefined}
      data-testid={testId}
      onClick={onToggle}
      className={cn(
        'ui-target depress flex w-full items-center justify-between gap-4 rounded-ui-control border bg-ui-bg px-3 py-2.5 text-left transition-colors duration-100',
        pressed ? 'is-on border-ui-line' : 'border-ui-line-muted hover:border-ui-line',
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span id={`${id}-label`} className="text-[13px] font-medium text-ui-fg">
          {label}
        </span>
        {description && (
          <span id={`${id}-description`} className="text-[12px] leading-4 text-ui-muted">
            {description}
          </span>
        )}
      </span>
      <span aria-hidden="true" className="flex shrink-0 items-center gap-2">
        <span className="w-6 text-right font-mono text-[11px] text-ui-muted">{pressed ? 'On' : 'Off'}</span>
        <span className={cn('h-3 w-3 border border-ui-line', pressed && 'bg-ui-fg')} />
      </span>
    </button>
  );
}
