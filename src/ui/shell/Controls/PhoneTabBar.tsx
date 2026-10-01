/**
 * The phone's tab bar: Engines and Flight each open their sheet (one at a
 * time), and the zoom pair sits at the end.
 *
 * The tabs are disclosure buttons rather than ARIA tabs: tapping the open one
 * closes its sheet, and "no tab selected" is the normal state — the world is
 * the point, and a sheet covers part of it.
 */
import { BOTTOM_INSET, TAB_BAR_HEIGHT, aboveTabBar } from './ControlGroup';
import { ZoomButtons } from './ZoomButtons';

export interface PhoneTab {
  label: string;
  open: boolean;
  bodyId: string;
  testid: string;
  onToggle(): void;
}

const TAB =
  'depress flex-1 text-[13px] font-medium text-ui-fg transition-colors duration-100 aria-expanded:bg-ui-selected aria-expanded:text-ui-on-selected';

const ZOOM =
  'depress inline-flex w-14 shrink-0 items-center justify-center text-[18px] leading-none text-ui-fg';

export function PhoneTabBar({ tabs }: { tabs: readonly PhoneTab[] }) {
  return (
    <nav
      aria-label="Controls"
      className="absolute inset-x-0 bottom-0 flex divide-x divide-ui-line-muted border-t border-ui-line-muted bg-ui-surface"
      // The tabs keep their 56 px; the bar extends under the home indicator.
      style={{ height: aboveTabBar(TAB_BAR_HEIGHT), paddingBottom: BOTTOM_INSET }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.testid}
          type="button"
          className={TAB}
          aria-label={`${tab.label} controls`}
          aria-expanded={tab.open}
          aria-controls={tab.bodyId}
          data-testid={tab.testid}
          onClick={tab.onToggle}
        >
          {tab.label}
        </button>
      ))}
      <ZoomButtons className={ZOOM} />
    </nav>
  );
}
