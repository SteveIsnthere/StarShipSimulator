/**
 * The trajectory map: the flight in profile, altitude against distance, as a
 * corner card (ia.md). The main view is a few hundred metres across at every
 * altitude, so this is where the ground, the pad and the predicted path live
 * once the vehicle has climbed out of sight of them.
 *
 * React owns the card, the fold and the canvas element. The pixels are drawn by
 * `$hud/trajectory-draw` from the session's frame tick, throttled; this hands
 * the session a `MapSurface` once, and keeps its `visible`, `dirty` and
 * `scale` fields current — a plain record the tick reads without allocating.
 *
 * Folding hides the canvas rather than unmounting it: the session holds its 2D
 * context. The fold is remembered per device and put back by Restore defaults.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PREFERENCES_RESET_EVENT } from '$app/preferences';
import type { MapContext, MapSurface } from '$hud/trajectory-draw';
import { Button } from '@ui/Button';
import { cn } from '@ui/internal/utils';
import { useSession, useSessionState } from '../session-context';
import { useLayoutMode, usePhoneLayout } from '../layout';
import { readMapOpen, writeMapOpen } from './map-fold';

export function TrajectoryCard() {
  const session = useSession();
  const phone = usePhoneLayout();
  // Without the room of a desktop, the debrief takes the top of the screen, map included.
  const compact = useLayoutMode() !== 'wide';
  const yielded = useSessionState((s) => compact && s.debrief !== null);
  const [open, setOpen] = useState(readMapOpen);
  const frameId = useId();

  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const surface = useRef<MapSurface | null>(null);

  // Hand the session its surface, once the canvas exists.
  useEffect(() => {
    const el = canvas.current;
    const box = frame.current;
    const status = root.current;
    if (!el || !box || !status) return;

    // A refused 2D context (a device that spent its budget on the world) leaves
    // everything else flying; the card simply stays empty.
    const context = el.getContext('2d');
    if (!context) {
      session.bindMap(null);
      return;
    }

    const record: MapSurface = {
      context: context as unknown as MapContext,
      status,
      scale: window.devicePixelRatio || 1,
      visible: false, // the fold effect below sets it
      dirty: true,
    };

    // Sized in DEVICE pixels with no transform, so the renderer projects in
    // device pixels and scales its own furniture. Assigning a dimension clears
    // the canvas, hence the forced redraw.
    const resize = () => {
      const rect = box.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(rect.width * ratio);
      const height = Math.round(rect.height * ratio);
      if (el.width === width && el.height === height && record.scale === ratio) return;
      el.width = width;
      el.height = height;
      record.scale = ratio;
      record.dirty = true;
    };

    surface.current = record;
    resize();
    session.bindMap(record);

    // The card changes size when it unfolds or the layout reflows, not only
    // when the window does.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(box);
    return () => {
      observer?.disconnect();
      surface.current = null;
      session.bindMap(null);
    };
  }, [session]);

  // The tick skips a folded map; an unfolded one redraws at once rather than
  // showing whatever was on the canvas when it was put away.
  useEffect(() => {
    const record = surface.current;
    if (!record) return;
    record.visible = open;
    if (open) record.dirty = true;
  }, [open]);

  // Restore defaults clears the remembered fold; this applies it now, the way a fresh load would.
  useEffect(() => {
    const reset = () => setOpen(readMapOpen());
    window.addEventListener(PREFERENCES_RESET_EVENT, reset);
    return () => window.removeEventListener(PREFERENCES_RESET_EVENT, reset);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    writeMapOpen(next);
  };

  return (
    <section
      ref={root}
      hidden={yielded}
      aria-label="Trajectory map"
      data-testid="trajectory-map"
      className={cn(
        'ui-safe-margins absolute z-10 flex flex-col border border-flight-backing-line bg-flight-backing',
        phone ? 'right-3 top-[calc(var(--hud-bottom,220px)+8px)]' : 'right-4 top-14',
        // Beside the cluster's 560 px column, never under it.
        open && (phone ? 'left-3' : 'w-[clamp(160px,calc(50vw-312px),280px)]'),
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        data-testid="map-toggle"
        aria-expanded={open}
        aria-controls={frameId}
        onClick={toggle}
        className="justify-between gap-3 border-0 font-tight font-semibold uppercase tracking-[0.14em] text-ui-muted"
      >
        Trajectory
        <ChevronDown
          aria-hidden="true"
          className={cn('size-3.5 transition-transform duration-150', open && 'rotate-180')}
        />
      </Button>
      <div
        ref={frame}
        id={frameId}
        hidden={!open}
        className={cn('relative border-t border-flight-backing-line', phone ? 'h-24' : 'h-[120px]')}
      >
        {/*
          Out of flow: a canvas's width and height attributes are its intrinsic
          size, and this one carries a device-pixel buffer. In flow, that size
          would feed back into the box just measured to compute it.
        */}
        <canvas ref={canvas} data-testid="map-canvas" aria-hidden="true" className="absolute inset-0 block size-full" />
      </div>
    </section>
  );
}
