/**
 * Drawing the trajectory map.
 *
 * Separated from `trajectory.ts` (which is the maths) and from the Svelte
 * component (which owns the element) for the reason the whole `hud/` layer is
 * built this way: the draw takes a MINIMAL CONTEXT INTERFACE rather than a real
 * `CanvasRenderingContext2D`, so it can be run in Node against a recording stub
 * and every golden fixture can be replayed through it.
 *
 * That is what makes "replayed over every golden without producing a NaN or
 * an off-canvas coordinate" a thing a test can say. A draw function that reached
 * for a real canvas could only be checked by looking at it.
 *
 * ONE SUBSCRIBER, THROTTLED. The map is driven from App.svelte's single rAF
 * tick like everything else, but unlike the readouts it does not redraw every
 * frame: a map that re-ranges a couple of dozen times over a whole flight has
 * nothing to say at 120 Hz. `MAP_REDRAW_HZ` is the rate, and the throttle is
 * what keeps a full canvas repaint off the per-frame path.
 */
import type { SimState } from '$core/state';
import * as C from '$core/constants';
import type { AttributeTarget } from './binder';
import {
  createPrediction,
  formatMiss,
  NO_SOLUTION_LABEL,
  predict,
  type Prediction,
} from './prediction';
import {
  computeExtent,
  createExtent,
  decimateTrail,
  formatSpan,
  projectX,
  projectY,
  TRAIL_MAX_POINTS,
  type MapExtent,
} from './trajectory';

/**
 * The part of a 2D context the map uses.
 *
 * Deliberately small. Everything here is a method a stub can record, which is
 * what lets the tests assert on coordinates rather than on pixels.
 */
export interface MapContext {
  canvas: { width: number; height: number };
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;
  font: string;
  globalAlpha: number;
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  stroke(): void;
  fill(): void;
  fillText(text: string, x: number, y: number): void;
  setLineDash(segments: number[]): void;
}

/**
 * The handshake between the component that owns the canvas and the tick that
 * drives it.
 *
 * A plain mutable record rather than a callback pair, deliberately: it is read
 * once per frame and reading it must not allocate. The component writes it when
 * something changes (a resize, a collapse, a monitor with a different pixel
 * ratio); the tick reads it and nothing else.
 */
export interface MapSurface {
  readonly context: MapContext;
  /** The panel element, which carries what the canvas cannot say. */
  readonly status: AttributeTarget;
  /** Device pixels per CSS pixel, kept current by the component. */
  scale: number;
  /** False while collapsed — the tick then skips the map entirely. */
  visible: boolean;
  /** Set on resize or reveal; the tick clears it and forces one redraw. */
  dirty: boolean;
}

/** How often the map redraws. A map does not need 120 Hz. */
export const MAP_REDRAW_HZ = 10;

/** The token colours, resolved here because a canvas cannot read CSS variables. */
export const MAP_COLOURS = {
  ground: 'rgba(255,255,255,0.45)',
  grid: 'rgba(255,255,255,0.12)',
  trail: 'rgba(255,255,255,0.7)',
  vehicle: 'rgb(255,255,255)',
  site: 'rgba(255,255,255,0.7)',
  label: 'rgba(255,255,255,0.45)',
  entry: 'rgba(255,176,0,0.35)',
  /*
    The predicted path (M7.2). Dimmer than the flown one, deliberately: one of
    these two lines is a record and the other is a guess, and they must not look
    equally certain. The map has no other colour to spare — BROADCAST-UI-PLAN
    § 1 keeps hue for the two limits that can end a flight — so the distinction
    is carried by weight and by a dashed stroke.
  */
  predicted: 'rgba(255,255,255,0.35)',
} as const;

export interface MapRenderer {
  /**
   * Offer a state. Redraws only if the throttle has elapsed.
   *
   * @param dt seconds since the last call
   * @returns whether it actually drew
   */
  update(state: SimState, dt: number): boolean;
  /** Force a redraw — used on resize and when the panel is expanded. */
  redraw(state: SimState): void;
  /** The extent last drawn, for tests and for the axis labels. */
  readonly extent: MapExtent;
  /** The prediction last drawn. */
  readonly prediction: Prediction;
  /** Redraws performed since creation. */
  readonly drawCount: number;
}

export interface MapRendererOptions {
  context: MapContext;
  /** The flown path. Read, never written. */
  trail: { readonly downRange: readonly number[]; readonly altitude: readonly number[] };
  /**
   * Device pixels per CSS pixel.
   *
   * The canvas is sized in DEVICE pixels and no transform is applied, so the
   * projection works in device pixels for free and nothing is resampled. What
   * does not come for free is the furniture — a 1px line, a 2.5px dot, a 9px
   * label are all CSS-pixel intentions — so every such constant is multiplied
   * by this.
   *
   * Read on every draw rather than captured, so a window dragged to a monitor
   * with a different ratio can be followed by mutating this field.
   */
  scale?: number;
  /**
   * Where the map says it is, in attributes.
   *
   * A canvas is opaque to everything outside it: a test can see that pixels
   * changed, and nothing more. Writing the marker position and the extent onto
   * the panel makes the two claims worth asserting — "the marker moved" and
   * "the map re-ranged" — into things a spec can read, without a screenshot
   * comparison that would go red for a colour change.
   *
   * Diffed like every other attribute in `hud/`, so this costs one string
   * compare per redraw and writes on the handful of redraws where it moved.
   */
  status?: AttributeTarget;
}

/**
 * The dashed line at the entry interface.
 *
 * Drawn only when it is inside the extent, which is the useful behaviour: on a
 * landing hop it is 80 km above anything on the map and would just be a line
 * pinned to the top edge saying nothing.
 */
const ENTRY_ALTITUDE = C.ENTRY_INTERFACE_ALTITUDE;

/**
 * Shorten a vector so its tip stays inside the box.
 *
 * The velocity arrow is the one thing drawn from a point rather than to one, so
 * it is the one thing that can leave the canvas — a vehicle sitting ON the
 * ground line has `py === height`, and a descent arrow from there points 14 px
 * into nothing. Clamping the LENGTH rather than the endpoint keeps the
 * direction exact, which is the only thing the arrow is claiming.
 *
 * Returns the usable length, which may be zero.
 */
export function fitLength(
  x: number,
  y: number,
  dx: number,
  dy: number,
  length: number,
  width: number,
  height: number,
): number {
  let limit = length;
  if (dx > 0) limit = Math.min(limit, (width - x) / dx);
  else if (dx < 0) limit = Math.min(limit, -x / dx);
  if (dy > 0) limit = Math.min(limit, (height - y) / dy);
  else if (dy < 0) limit = Math.min(limit, -y / dy);
  return limit > 0 ? limit : 0;
}

export function createMapRenderer(options: MapRendererOptions): MapRenderer {
  const { context, trail } = options;

  // Everything the draw needs, allocated once.
  const extent = createExtent();
  const trailX = new Float32Array(TRAIL_MAX_POINTS);
  const trailY = new Float32Array(TRAIL_MAX_POINTS);
  const dashSolid: number[] = [];
  const dashEntry: number[] = [3, 3];
  const dashPredicted: number[] = [2, 3];
  const prediction = createPrediction();

  let sinceDraw = Infinity;
  let drawCount = 0;
  let lastMarker = '';
  let lastSpan = '';
  let lastPredict = '';
  let lastTrail = '';

  const draw = (state: SimState): void => {
    const width = context.canvas.width;
    const height = context.canvas.height;
    if (width <= 0 || height <= 0) return;
    const scale = options.scale ?? 1;

    const vehicleX = state.kinematics.downRangeDistance - C.starBaseXPos;
    const vehicleY = state.kinematics.altitude;

    const count = decimateTrail(trail.downRange, trail.altitude, trailX, trailY);

    /*
      The prediction is computed BEFORE the extent, and the extent is told about
      it. A map that framed only where the vehicle has been would push the
      predicted touchdown off its own edge exactly when it matters — on a long
      boostback the answer is a hundred kilometres from anything already drawn.
    */
    predict(state, prediction);
    const hasPrediction = prediction.kind !== 'none';
    computeExtent(
      vehicleX,
      vehicleY,
      trailX,
      trailY,
      count,
      extent,
      hasPrediction ? prediction.downRange : undefined,
      hasPrediction ? prediction.altitude : undefined,
    );

    context.clearRect(0, 0, width, height);
    context.setLineDash(dashSolid);
    context.globalAlpha = 1;

    // --- the ground, and the site on it ---------------------------------
    const groundY = projectY(extent, 0, height);
    context.strokeStyle = MAP_COLOURS.ground;
    context.lineWidth = scale;
    context.beginPath();
    context.moveTo(0, groundY);
    context.lineTo(width, groundY);
    context.stroke();

    const siteX = projectX(extent, 0, width);
    const siteH = 7 * scale;
    context.fillStyle = MAP_COLOURS.site;
    context.beginPath();
    context.moveTo(siteX, groundY);
    context.lineTo(siteX - 4 * scale, groundY - siteH);
    context.lineTo(siteX + 4 * scale, groundY - siteH);
    context.fill();

    // --- the entry interface, when it is on the map ----------------------
    if (ENTRY_ALTITUDE > extent.minY && ENTRY_ALTITUDE < extent.maxY) {
      const entryY = projectY(extent, ENTRY_ALTITUDE, height);
      context.setLineDash(dashEntry);
      context.strokeStyle = MAP_COLOURS.entry;
      context.beginPath();
      context.moveTo(0, entryY);
      context.lineTo(width, entryY);
      context.stroke();
      context.setLineDash(dashSolid);
    }

    // --- the path flown ---------------------------------------------------
    if (count > 1) {
      context.strokeStyle = MAP_COLOURS.trail;
      context.lineWidth = 1.5 * scale;
      context.beginPath();
      context.moveTo(projectX(extent, trailX[0]!, width), projectY(extent, trailY[0]!, height));
      for (let i = 1; i < count; i++) {
        context.lineTo(projectX(extent, trailX[i]!, width), projectY(extent, trailY[i]!, height));
      }
      context.stroke();
    }

    // --- the vehicle, and where it is going ------------------------------
    /*
      Clamped, and it is not defensive noise. The extent is built to contain the
      vehicle, so in flight this changes nothing — but altitude goes slightly
      NEGATIVE on a crash (the vehicle is destroyed at the moment it is below
      the ground, not before), and the map's baseline is y = 0. Pinning the
      marker to the ground line there is the honest reading; letting it slide
      off the bottom edge is not.
    */
    const px = Math.min(width, Math.max(0, projectX(extent, vehicleX, width)));
    const py = Math.min(height, Math.max(0, projectY(extent, vehicleY, height)));

    /*
      The velocity vector is drawn in MAP space, not world space: it points the
      way the vehicle is going ON THE MAP, which is what a reader of the map
      wants. Because the two axes have different scales, a world-space arrow
      would point somewhere the trail does not go, which is worse than useless
      on an instrument. Its length is fixed — the map says direction; the HUD
      says how fast.
    */
    const vx = state.kinematics.speedX;
    const vy = state.kinematics.speedY;
    const spanX = extent.maxX - extent.minX;
    const spanY = extent.maxY - extent.minY;
    const mapVx = spanX > 0 ? (vx / spanX) * width : 0;
    const mapVy = spanY > 0 ? -(vy / spanY) * height : 0;
    const mapSpeed = Math.hypot(mapVx, mapVy);
    if (mapSpeed > 1e-6) {
      const dx = mapVx / mapSpeed;
      const dy = mapVy / mapSpeed;
      const length = fitLength(px, py, dx, dy, 14 * scale, width, height);
      if (length > 0) {
        context.strokeStyle = MAP_COLOURS.vehicle;
        context.lineWidth = scale;
        context.beginPath();
        context.moveTo(px, py);
        context.lineTo(px + dx * length, py + dy * length);
        context.stroke();
      }
    }

    context.fillStyle = MAP_COLOURS.vehicle;
    context.beginPath();
    context.arc(px, py, 2.5 * scale, 0, Math.PI * 2);
    context.fill();

    // --- where it is going, as against where it has been -------------------
    if (hasPrediction) {
      const tx = projectX(extent, prediction.downRange, width);
      const ty = projectY(extent, prediction.altitude, height);

      // A dashed run from the vehicle to the predicted arrival. Straight, and
      // it says so by being dashed: the real path curves, and drawing a
      // confident curve through a model this rough would be a lie told in ink.
      context.setLineDash(dashPredicted);
      context.strokeStyle = MAP_COLOURS.predicted;
      context.lineWidth = scale;
      context.beginPath();
      context.moveTo(px, py);
      context.lineTo(tx, ty);
      context.stroke();
      context.setLineDash(dashSolid);

      /*
        An open cross rather than a filled dot, so it cannot be mistaken for the
        vehicle or for the landing site.

        Its arms are clipped to the canvas rather than the whole mark being
        nudged inside. A touchdown is predicted at GROUND_ALTITUDE, which sits
        within a couple of pixels of the bottom edge, so an unclipped cross hangs
        2.7 px off the map — the golden replay caught exactly that. Moving the
        cross would put it somewhere the vehicle is not going; clipping it draws
        the half that fits, in the right place.
      */
      const arm = 4 * scale;
      context.beginPath();
      context.moveTo(Math.max(0, tx - arm), ty);
      context.lineTo(Math.min(width, tx + arm), ty);
      context.moveTo(tx, Math.max(0, ty - arm));
      context.lineTo(tx, Math.min(height, ty + arm));
      context.stroke();
    }

    // --- the axes, as labels rather than as gridlines ---------------------
    // The extents ARE the axes. Two numbers say what the map covers, and cost
    // none of the space a labelled grid would take out of a 280 px instrument.
    // Skipped rather than squeezed on a canvas too short to hold them: an
    // overlapping pair of numbers is worse than none.
    if (height >= 24 * scale) {
      context.fillStyle = MAP_COLOURS.label;
      context.font = `${9 * scale}px "Barlow Condensed", sans-serif`;
      context.fillText(formatSpan(extent.maxX - extent.minX), 3 * scale, height - 3 * scale);
      context.fillText(formatSpan(extent.maxY), 3 * scale, 10 * scale);

      /*
        The miss distance, or the reason there isn't one. Top right, because it
        is the one number on this instrument a pilot flying a landing is
        actually reading, and the top left already carries the altitude span.

        The no-solution case prints TEXT rather than printing nothing: a blank
        corner is indistinguishable from a broken instrument, and "NO SOLUTION —
        ORBIT" is an answer.
      */
      const label = hasPrediction
        ? formatMiss(prediction.miss)
        : NO_SOLUTION_LABEL[prediction.reason];
      if (label) {
        // Right-aligned by measurement would need measureText on every draw;
        // the label is short and the map is wide, so an offset from the right
        // edge scaled by the character count costs nothing and cannot allocate.
        const approxWidth = label.length * 4.6 * scale;
        context.fillText(label, Math.max(3 * scale, width - approxWidth - 3 * scale), 10 * scale);
      }
    }

    // --- what the map is showing, for anything outside the canvas ---------
    const status = options.status;
    if (status) {
      // CSS pixels, rounded: a spec asking "did the marker move" wants the
      // answer the eye would give, not a float that differs every frame.
      const marker = `${Math.round(px / scale)},${Math.round(py / scale)}`;
      if (marker !== lastMarker) {
        lastMarker = marker;
        status.setAttribute('data-marker', marker);
      }
      const span = `${Math.round(extent.maxX - extent.minX)}x${Math.round(extent.maxY)}`;
      if (span !== lastSpan) {
        lastSpan = span;
        status.setAttribute('data-span', span);
      }
      // The prediction, for the same reason: a canvas cannot be asked whether
      // it is showing a touchdown or admitting it has no solution.
      const predicted = hasPrediction
        ? `${prediction.kind}:${Math.round(prediction.miss)}`
        : `none:${prediction.reason}`;
      if (predicted !== lastPredict) {
        lastPredict = predicted;
        status.setAttribute('data-predict', predicted);
      }
      /*
        How many points the trail was actually STROKED from.

        Added because "the trail grows" turned out not to be answerable by
        counting lit pixels: M7.2's prediction line puts ink on the canvas too,
        and as the prediction converges the map re-ranges under it, so the total
        can fall while the trail is growing. The number of points drawn cannot
        be confounded that way.
      */
      const drawn = String(count);
      if (drawn !== lastTrail) {
        lastTrail = drawn;
        status.setAttribute('data-trail', drawn);
      }
    }

    drawCount += 1;
  };

  return {
    get extent() {
      return extent;
    },
    get prediction() {
      return prediction;
    },
    get drawCount() {
      return drawCount;
    },

    update(state, dt) {
      sinceDraw += dt;
      if (sinceDraw < 1 / MAP_REDRAW_HZ) return false;
      sinceDraw = 0;
      draw(state);
      return true;
    },

    redraw(state) {
      sinceDraw = 0;
      draw(state);
    },
  };
}
