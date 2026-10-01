/**
 * The primary cluster: the flight data, in one place (ia.md, design-system.md §9).
 *
 *   timeline    where the flight is and what comes next, and the fold
 *   primary     altitude, vertical speed, speed — the largest type on screen
 *   vehicle     propellant, engines, attitude
 *   secondary   H/S, mach, Q, g, TWR, throttle, heat, range (foldable)
 *
 * React renders the skeleton once. Every number and mark in it is written by
 * the HUD binders, which the session runs from its one frame tick; this
 * component hands them resolvers once its elements exist. The resolvers search
 * the whole document, so the mission clock in the status bar is found too.
 *
 * Desktop: a card at the top centre, under the status bar, where the sky is
 * and the vehicle is not. Phone portrait: a full-width strip under the status
 * bar, clear of the controls' tab bar and sheets at the bottom. Hidden while
 * the debrief holds this zone: the flight is over and the card reports it.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@ui/Button';
import { cn } from '@ui/internal/utils';
import { useSession, useSessionState } from '../session-context';
import { useLayoutMode } from '../layout';
import { Attitude } from './Attitude';
import { EngineDots } from './EngineDots';
import { MissionTimeline } from './MissionTimeline';
import { PrimaryReadout } from './PrimaryReadout';
import { Propellant } from './Propellant';
import { SecondaryReadouts } from './SecondaryReadouts';
import { detachedMetric, detachedReadout, metricResolver, readoutResolver } from './readout-registry';

/**
 * Wide: a card at the top centre. Short (a phone held sideways): the compact
 * cluster, centred between the two 216 px control rails. Phone: a full-width
 * strip under the status bar.
 */
const PLACEMENT = {
  wide: 'ui-safe-margin-top inset-x-0 top-14 mx-auto w-[min(560px,calc(var(--ui-safe-width)-32px))] gap-3 border px-[18px] py-3',
  short: 'ui-safe-margin-top inset-x-0 top-[52px] mx-auto w-[min(420px,calc(var(--ui-safe-width)-480px))] gap-2 border px-3 py-2',
  phone: 'inset-x-0 top-[calc(53px+env(safe-area-inset-top,0px))] gap-2 border-b px-3 py-2',
} as const;

/** Where the cluster ends; read by the surfaces that sit under it. */
const HUD_BOTTOM = '--hud-bottom';

export function Hud() {
  const session = useSession();
  const mode = useLayoutMode();
  // A phone in either orientation: digits and ticks, short labels, no rail.
  const compact = mode !== 'wide';
  const debriefUp = useSessionState((s) => s.debrief !== null);
  // Open on a desktop, folded on a phone where every row costs the world. A
  // change of layout (a rotation) resets it to that layout's default, as the
  // control groups do; any other re-render keeps the pilot's choice.
  const [fold, setFold] = useState(() => ({ mode, expanded: !compact }));
  if (fold.mode !== mode) setFold({ mode, expanded: !compact });
  const expanded = fold.expanded;
  const setExpanded = (next: (open: boolean) => boolean) => setFold((f) => ({ ...f, expanded: next(f.expanded) }));
  const secondaryId = useId();

  /*
   * The cluster's height changes with Details and the layout, so it publishes
   * where it ends (`--hud-bottom`, px from the top of the screen) for what sits
   * under it: the phone's map card and hint, and the restart. On resize only,
   * never per frame.
   */
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    const style = document.documentElement.style;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const publish = () => {
      const box = el.getBoundingClientRect();
      // Hidden (the debrief holds the zone) measures zero: keep the last real edge.
      if (box.height > 0) style.setProperty(HUD_BOTTOM, `${Math.round(box.bottom)}px`);
    };
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    publish();
    return () => {
      observer.disconnect();
      style.removeProperty(HUD_BOTTOM);
    };
  }, []);

  // Once the elements exist; the binders resolve them once and never again.
  useEffect(() => {
    session.bindHud(readoutResolver(), metricResolver());
    return () => session.bindHud(detachedReadout, detachedMetric);
  }, [session]);

  return (
    <section
      ref={root}
      aria-label="Flight data"
      hidden={debriefUp}
      className={cn(
        'absolute z-10 grid border-flight-backing-line bg-flight-backing text-ui-fg',
        PLACEMENT[mode],
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <MissionTimeline compact={compact} className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          data-testid="hud-toggle"
          aria-expanded={expanded}
          aria-controls={secondaryId}
          onClick={() => setExpanded((open) => !open)}
          className="shrink-0"
        >
          Details
          <ChevronDown
            aria-hidden="true"
            className={cn('size-3.5 transition-transform duration-150', expanded && 'rotate-180')}
          />
        </Button>
      </div>

      {/* Live numbers, never announced: a HUD that spoke every change would be unusable. */}
      <div role="status" aria-live="off" className={cn('grid', compact ? 'gap-2' : 'gap-3')}>
        <div className={cn('grid grid-cols-3', compact ? 'gap-2' : 'gap-3')}>
          <PrimaryReadout
            id="altitude"
            label="Altitude"
            compact={compact}
            dial={{ arc: 'gauge-altitude', tick: 'gauge-altitude-bar', scale: 'altitudeScale' }}
          />
          <PrimaryReadout id="speedY" label="Vertical speed" shortLabel="V/S" compact={compact} />
          <PrimaryReadout
            id="speed"
            label="Speed"
            compact={compact}
            dial={{ arc: 'gauge-speed', tick: 'gauge-speed-bar', scale: 'speedScale' }}
          />
        </div>

        <div className={cn('flex min-w-0 items-center', compact ? 'gap-3' : 'gap-5')}>
          <div className="min-w-0 flex-1">
            <Propellant compact={compact} />
          </div>
          <EngineDots compact={compact} />
          <Attitude compact={compact} />
        </div>

        <SecondaryReadouts id={secondaryId} hidden={!expanded} />
      </div>
    </section>
  );
}
