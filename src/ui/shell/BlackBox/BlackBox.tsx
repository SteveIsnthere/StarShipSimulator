/**
 * The black box: the flight just flown, as nine plots with one shared cursor.
 *
 * A kit Dialog, open while `store.layer === 'blackBox'` (the session pauses
 * the flight under it). The plots and uPlot load LAZILY — `import('./plots')`
 * runs the first time the dialog opens on a recording, never before — which is
 * what keeps every byte of chart code out of the first load.
 *
 * What it reads is a snapshot taken on open: the recording in display units
 * (./channels), the previous flight as the ghost, and the mission events as
 * markers. The export is the recording itself, not the display copy.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@ui/Button';
import { Dialog, DialogBody } from '@ui/Dialog';
import { Toggle } from '@ui/Toggle';
import type { Recorder } from '$app/recorder';
import type { TimelineEvent } from '$hud/timeline';
import { readingsAt } from '$ui/blackbox';
import { useSession, useSessionState } from '../session-context';
import { displayRecording } from './channels';
import { downloadCsv } from './export-csv';
import { Readout } from './Readout';
import type { Plots } from './plots';

/** What the dialog shows, fixed when it opens. */
interface Flight {
  readonly view: Recorder;
  readonly previous: Recorder | null;
  readonly events: readonly TimelineEvent[];
  /** s — the last sample, or null for an empty recording. */
  readonly end: number | null;
}

export function BlackBox() {
  const session = useSession();
  const open = useSessionState((s) => s.layer === 'blackBox');
  const preset = useSessionState((s) => s.preset);

  // The flight is paused while a layer is open, so a snapshot on open is the
  // flight as it stands; built once per open, never per frame.
  const flight = useMemo<Flight | null>(() => {
    if (!open) return null;
    const view = displayRecording(session.recorder);
    return {
      view,
      previous: session.previousRecorder.length > 0 ? displayRecording(session.previousRecorder) : null,
      events: [...session.timeline.events],
      end: view.length > 0 ? view.time[view.length - 1]! : null,
    };
  }, [open, session]);

  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [drawn, setDrawn] = useState<{ flight: Flight; error?: string } | null>(null);
  const [cursor, setCursor] = useState<{ flight: Flight; t: number } | null>(null);
  const [ghostOn, setGhostOn] = useState(true);
  const plots = useRef<Plots | null>(null);
  const ghostRef = useRef(ghostOn);

  useEffect(() => {
    ghostRef.current = ghostOn;
    plots.current?.setGhost(ghostOn);
  }, [ghostOn]);

  // Draw once per open. The dynamic import is the lazy boundary.
  useEffect(() => {
    if (!host || !flight || flight.view.length === 0) return;
    let cancelled = false;
    let mine: Plots | null = null;
    // Eight synced plots each report the same moment; render once per moment.
    let last: number | null | undefined;
    const onCursor = (t: number | null) => {
      if (t === last) return;
      last = t;
      setCursor(t === null ? null : { flight, t });
    };

    import('./plots')
      .then(({ drawPlots }) =>
        drawPlots(host, {
          recorder: flight.view,
          ...(flight.previous ? { previous: flight.previous } : {}),
          events: flight.events,
          onCursor,
        }),
      )
      .then((drawnPlots) => {
        if (cancelled) {
          drawnPlots.destroy();
          return;
        }
        mine = drawnPlots;
        plots.current = drawnPlots;
        drawnPlots.setGhost(ghostRef.current);
        setDrawn({ flight });
      })
      .catch((error: unknown) => {
        if (!cancelled) setDrawn({ flight, error: String(error) });
      });

    return () => {
      cancelled = true;
      mine?.destroy();
      if (plots.current === mine) plots.current = null;
    };
  }, [host, flight]);

  const at = cursor !== null && cursor.flight === flight ? cursor.t : null;
  const readings = useMemo(() => (at === null || !flight ? [] : readingsAt(flight.view, at)), [at, flight]);

  const empty = flight !== null && flight.end === null;
  const thisDraw = drawn !== null && drawn.flight === flight ? drawn : null;
  const status = empty
    ? 'Nothing recorded yet. Fly something first.'
    : thisDraw === null
      ? 'Loading plots…'
      : thisDraw.error !== undefined
        ? `Plots unavailable: ${thisDraw.error}`
        : '';

  const close = () => session.closeLayer();

  return (
    <Dialog
      open={open}
      onClose={close}
      testId="black-box"
      ariaLabel="Black box"
      maxWidth="1600px"
      // The session owns Escape (it closes the top layer first); letting Radix
      // close too would leave the session's handler to open the menu after it.
      closeOnEscape={false}
    >
      {/* Phone: title and Close on the first row, the actions on a row of their own. */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-b border-ui-line-muted pb-4 pt-4 sm:pt-6">
        <div className="min-w-0 flex-1">
          <DialogPrimitive.Title className="m-0 font-tight text-[16px] font-semibold text-ui-fg">Black box</DialogPrimitive.Title>
          <DialogPrimitive.Description className="m-0 mt-0.5 truncate text-[12px] text-ui-muted">
            {preset.name}
            {flight && flight.end !== null && (
              <>
                {' · '}
                <span className="font-mono">{flight.end.toFixed(1)} s</span> recorded
              </>
            )}
          </DialogPrimitive.Description>
        </div>
        <div className="order-last flex basis-full flex-wrap items-center gap-2 sm:order-none sm:basis-auto">
          {flight?.previous && (
            <span className="flex items-center gap-1 text-[12px] text-ui-muted">
              <span aria-hidden="true">Previous flight</span>
              <Toggle
                active={ghostOn}
                onToggle={() => setGhostOn((on) => !on)}
                aria-label="Previous flight"
              />
            </span>
          )}
          <Button
            variant="secondary"
            data-testid="black-box-export"
            data-blackbox-control="export"
            disabled={empty}
            onClick={() => downloadCsv(session.recorder, preset.basedOn ?? preset.id)}
          >
            Export CSV
          </Button>
        </div>
        <Button
          variant="ghost"
          data-testid="black-box-close"
          data-blackbox-control="close"
          // Focus lands here on open: the one action every visit ends with.
          data-gp-initial
          onClick={close}
          icon={<X size={14} strokeWidth={1.8} aria-hidden="true" />}
        >
          Close
        </Button>
      </header>

      <DialogBody className="pb-5 pt-4">
        <div data-blackbox className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
          <Readout at={at} readings={readings} end={flight?.end ?? null} className="lg:sticky lg:top-0 lg:order-last" />
          <div className="min-w-0">
            {status !== '' && (
              <p data-blackbox-status className="m-0 py-6 text-[13px] text-ui-muted">
                {status}
              </p>
            )}
            {/* Filled by ./plots, not by React: one cell per plot, each a uPlot. */}
            <div ref={setHost} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-3" />
          </div>
        </div>
      </DialogBody>
    </Dialog>
  );
}
