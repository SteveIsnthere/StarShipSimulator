/**
 * The flight controls: Engines bottom-left and Flight bottom-right on a
 * desktop; on a phone, a tab bar at the bottom edge and at most one sheet
 * above it (docs/design/ia.md; the zones are the shell brief's).
 *
 * This surface owns the indicator binder because the nodes it binds are the
 * ones it renders, so it binds after mount, once, and from then on the session's tick toggles their
 * lit state directly. Nothing here re-renders per frame.
 *
 * Hidden, never unmounted — in cinematic mode and when a group collapses —
 * because the binder holds references to these nodes.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { useLayoutMode, type LayoutMode } from '../layout';
import { useSession, useSessionState } from '../session-context';
import { ControlGroup, SHEET_HEIGHT, TAB_BAR_HEIGHT } from './ControlGroup';
import { EnginesGroup } from './EnginesGroup';
import { FlightGroup } from './FlightGroup';
import { PhoneTabBar } from './PhoneTabBar';
import { ZoomButtons } from './ZoomButtons';
import { createControlIndicators, type ControlIndicators } from './indicators';

type Group = 'engines' | 'flight';

interface OpenState {
  /** The layout these were decided for; a change of layout resets them. */
  mode: LayoutMode;
  engines: boolean;
  flight: boolean;
}

/**
 * Panels start open beside the world on a desktop. On a phone, in either
 * orientation, they start closed and open one at a time, because an open one
 * covers part of the world and there is no height for two. Only a change of
 * layout resets them, so a pilot's choice survives every other re-render.
 */
const initialOpen = (mode: LayoutMode): OpenState => ({ mode, engines: mode === 'wide', flight: mode === 'wide' });

/** Each rail's edge and width. Short: narrower, so the compact cluster fits between them. */
const RAILS = {
  wide: { engines: 'left-4 w-[256px]', flight: 'right-4 w-[300px]' },
  short: { engines: 'left-3 w-[216px]', flight: 'right-3 w-[216px]' },
  phone: { engines: '', flight: '' },
} as const;

/**
 * How much of the screen's bottom edge the controls hold on a phone: the tab
 * bar, plus the sheet while one is open; 0 on a desktop and in cinematic. The
 * world ends above the tab bar and the hint and restart sit above all of it.
 */
const BOTTOM_VARIABLE = '--controls-bottom';

export function Controls() {
  const session = useSession();
  const mode = useLayoutMode();
  const phone = mode === 'phone';
  const cinematic = useSessionState((s) => s.cinematic);
  // The session already ignores keys while a layer is open; the sliders follow.
  const blocked = useSessionState((s) => s.layer !== null);

  const [open, setOpen] = useState(() => initialOpen(mode));
  if (open.mode !== mode) setOpen(initialOpen(mode));

  const toggle = (group: Group) =>
    setOpen((o) => {
      const next = { ...o, [group]: !o[group] };
      // On a phone only one is open at a time: two would cover the flight.
      if (o.mode !== 'wide' && next[group]) next[group === 'engines' ? 'flight' : 'engines'] = false;
      return next;
    });

  const root = useRef<HTMLDivElement>(null);
  const indicators = useRef<ControlIndicators | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const targets = createControlIndicators(el);
    indicators.current = targets;
    session.bindIndicators(targets.resolve);
    return () => {
      indicators.current = null;
      session.bindIndicators(() => null);
    };
  }, [session]);

  const tabBar = phone && !cinematic;
  const bottom = tabBar ? TAB_BAR_HEIGHT + (open.engines || open.flight ? SHEET_HEIGHT : 0) : 0;
  useEffect(() => {
    const style = document.documentElement.style;
    style.setProperty(BOTTOM_VARIABLE, `${bottom}px`);
    return () => {
      style.removeProperty(BOTTOM_VARIABLE);
    };
  }, [bottom]);

  // Manual: whichever mode the binder last showed lit is switched off.
  const releaseAutopilot = () => {
    for (const mode of indicators.current?.activeModes() ?? []) session.emit(mode.event);
  };

  const enginesBody = useId();
  const flightBody = useId();

  return (
    <div ref={root} className="contents" hidden={cinematic} data-controls="">
      <ControlGroup
        title="Engines"
        bodyId={enginesBody}
        open={open.engines}
        phone={phone}
        onToggle={() => toggle('engines')}
        toggleTestId="engine-panel-toggle"
        placement={RAILS[mode].engines}
      >
        <EnginesGroup blocked={blocked} />
      </ControlGroup>
      <ControlGroup
        title="Flight"
        bodyId={flightBody}
        open={open.flight}
        phone={phone}
        onToggle={() => toggle('flight')}
        toggleTestId="yoke-panel-toggle"
        placement={RAILS[mode].flight}
        aside={phone ? null : <ZoomButtons />}
      >
        <FlightGroup blocked={blocked} onManual={releaseAutopilot} />
      </ControlGroup>
      {phone ? (
        <PhoneTabBar
          tabs={[
            {
              label: 'Engines',
              open: open.engines,
              bodyId: enginesBody,
              testid: 'engine-panel-toggle',
              onToggle: () => toggle('engines'),
            },
            {
              label: 'Flight',
              open: open.flight,
              bodyId: flightBody,
              testid: 'yoke-panel-toggle',
              onToggle: () => toggle('flight'),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
