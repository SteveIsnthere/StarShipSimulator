/**
 * One status-bar button. Its name never changes; a toggle states itself with
 * `aria-pressed` and, where on reads as a mode, the selected fill
 * (design-system.md §2.5).
 *
 * How much it shows follows the room: its words and key on a desktop, an icon
 * on a phone, and for the secondary buttons an icon, joined by the word once
 * the bar is wide enough. The icon stays because for Sound it is the state.
 * The accessible name is the same in every case.
 */
import type { ReactNode } from 'react';
import { Button } from '@ui/Button';
import { KeyCap } from '@ui/KeyCap';
import { cn } from '@ui/internal/utils';

export type ChromeButtonShow = 'label' | 'icon' | 'icon-then-label';

export interface ChromeButtonProps {
  label: string;
  icon: ReactNode;
  /** The e2e contract's id, where the control has one (src/ui/testids.ts). */
  testId?: string | undefined;
  onClick: () => void;
  show: ChromeButtonShow;
  /** A boundary for the two primary actions (Pause, Menu); the rest are quieter. */
  primary?: boolean;
  /** A toggle's state. Omitted for an action. */
  pressed?: boolean;
  /** Whether "on" takes the selected fill. Sound does not: on is the normal state, and its icon says which. */
  fillWhenPressed?: boolean;
  /** The keyboard shortcut, shown beside the word and announced. */
  keyHint?: string | undefined;
}

export function ChromeButton({
  label,
  icon,
  testId,
  onClick,
  show,
  primary = false,
  pressed,
  fillWhenPressed = true,
  keyHint,
}: ChromeButtonProps) {
  return (
    <Button
      variant={primary ? 'secondary' : 'ghost'}
      size={show === 'icon' ? 'icon-md' : 'md'}
      data-testid={testId}
      aria-label={label}
      aria-pressed={pressed}
      aria-keyshortcuts={keyHint}
      onClick={onClick}
      className={cn(
        'shrink-0 text-ui-fg',
        show === 'icon' && 'w-11',
        fillWhenPressed && 'aria-pressed:border-ui-line aria-pressed:bg-ui-selected aria-pressed:text-ui-on-selected',
      )}
    >
      {show !== 'label' && <span className="flex">{icon}</span>}
      {show === 'icon-then-label' && <span className="hidden min-[78rem]:inline">{label}</span>}
      {show === 'label' && (
        <>
          {label}
          {keyHint && (
            <span aria-hidden="true" className="flex">
              <KeyCap>{keyHint}</KeyCap>
            </span>
          )}
        </>
      )}
    </Button>
  );
}
