/**
 * One control group: a collapsible panel on a desktop, a sheet on a phone.
 *
 * Collapsing hides the body; it never unmounts it. The indicator binder
 * resolved every control in here once and holds the references, so removing
 * them would leave it writing into orphans and bring them back frozen. The
 * `hidden` attribute also takes a closed body out of hit-testing, the tab order
 * and the accessibility tree.
 *
 * The body keeps the same place among the section's children in both layouts
 * (the desktop header's slot is empty on a phone), so a rotation that changes
 * the layout re-renders the chrome around the controls without remounting them.
 */
import type { ReactNode } from 'react';
import { Eyebrow } from '@ui/Eyebrow';

/** The phone sheet's height: at most 240 px, so the primary strip above it stays clear. */
export const SHEET_HEIGHT = 240;

/** The phone tab bar's height, which the sheet sits on. */
export const TAB_BAR_HEIGHT = 56;

/**
 * The home indicator's strip, which the page draws under (viewport-fit=cover):
 * the tab bar pads itself by it, and everything stacked on the tab bar adds it.
 */
export const BOTTOM_INSET = 'env(safe-area-inset-bottom, 0px)';

/** `px` above the tab bar, as a CSS length that clears the home indicator too. */
export const aboveTabBar = (px: number): string => `calc(${px}px + ${BOTTOM_INSET})`;

export interface ControlGroupProps {
  title: string;
  /** For the toggle's aria-controls. */
  bodyId: string;
  open: boolean;
  phone: boolean;
  onToggle(): void;
  /** engine-panel-toggle / yoke-panel-toggle. On a phone the toggle is a tab instead. */
  toggleTestId: string;
  /** Desktop placement: the edge it hugs and its width. */
  placement: string;
  /** Controls beside the desktop header that stay when the body collapses. */
  aside?: ReactNode;
  children: ReactNode;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 10 10"
      className={`size-2.5 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
      aria-hidden="true"
    >
      <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ControlGroup({
  title,
  bodyId,
  open,
  phone,
  onToggle,
  toggleTestId,
  placement,
  aside,
  children,
}: ControlGroupProps) {
  return (
    <section
      aria-label={title}
      hidden={phone && !open}
      className={
        phone
          ? 'absolute inset-x-0 overflow-y-auto overscroll-contain border-t border-ui-line bg-ui-surface px-4 pt-3 pb-2'
          : `flight-panel ui-safe-margins absolute bottom-4 max-h-[calc(100dvh-72px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain p-3 ${placement}`
      }
      style={phone ? { bottom: aboveTabBar(TAB_BAR_HEIGHT), height: SHEET_HEIGHT } : undefined}
    >
      {phone ? null : (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="ui-target flex flex-1 items-center justify-between gap-2 text-ui-muted transition-colors duration-100 hover:text-ui-fg"
            aria-label={`${title} controls`}
            aria-expanded={open}
            aria-controls={bodyId}
            data-testid={toggleTestId}
            onClick={onToggle}
          >
            <Eyebrow tone="muted">{title}</Eyebrow>
            <Chevron open={open} />
          </button>
          {aside}
        </div>
      )}
      <div id={bodyId} hidden={!open} className={phone ? 'grid' : 'grid pt-2'}>
        {children}
      </div>
    </section>
  );
}
