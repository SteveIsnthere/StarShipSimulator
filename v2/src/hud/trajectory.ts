/**
 * The trajectory map: projection and auto-ranging.
 *
 * WHY THIS EXISTS. Measured in the M7 plan: the main view shows 356 x 200 metres
 * at every altitude, so the ground leaves the screen above ~100 m and at
 * 7300 m/s a ground object crosses it in 49 ms — under three frames. One camera
 * cannot show a 50 m vehicle and a 75 km altitude (that needs 0.0096 px/m, at
 * which the ship is half a pixel tall), so the scales the main view cannot reach
 * need a second display. This is it.
 *
 * A PROFILE, NOT A TOP-DOWN. This world has two dimensions, downrange and
 * altitude; a top-down map would be a horizontal line. Altitude against
 * downrange, seen from the side, is the honest shape — and it is the one that
 * answers what every scenario is actually about, which is whether you are going
 * to make it home.
 *
 * THE TWO AXES HAVE DIFFERENT SCALES, deliberately. A re-entry spans 1980 km
 * downrange and 80 km up; at true aspect that is a 25:1 sliver with nothing
 * readable in it. Every trajectory plot ever drawn does this, and it stays
 * honest the same way they do: the axes carry their real extents as labels, and
 * every number on the map comes from SimState at true scale. The plan's § 5
 * rule holds — compression is allowed in the depiction of the WORLD, and the map
 * is an instrument, so nothing here is compressed at all. Only stretched, and
 * labelled.
 *
 * Everything in this file is pure and allocation-free: the extent is written
 * into a caller-owned object and the trail is decimated into caller-owned
 * arrays, because this runs on the frame path.
 */

/** The world rectangle the map covers. Metres, x relative to the landing site. */
export interface MapExtent {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** A fresh extent object, for a caller that needs one to hand in. */
export function createExtent(): MapExtent {
  return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
}

/**
 * The smallest map the instrument will draw.
 *
 * Without a floor, a vehicle sitting on the pad has zero extent in both axes and
 * the projection divides by zero. With one, the opening frame of every flight is
 * a sensible 1 km by 500 m view rather than an infinity.
 */
export const MIN_SPAN_X = 1_000;
export const MIN_SPAN_Y = 500;

/** Fraction of the span left as breathing room around the content. */
export const MARGIN = 0.12;

/**
 * Round a span up to 1, 2 or 5 times a power of ten.
 *
 * The map re-ranges as the flight grows, and an extent that tracked the content
 * continuously would rescale on every frame — every gridline and every label
 * sliding permanently, which is unreadable. Snapping to a decade step means the
 * extent changes a couple of dozen times over a whole flight instead of ten
 * thousand, and each change is a visible, comprehensible jump.
 */
export function niceSpan(span: number): number {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const exponent = Math.floor(Math.log10(span));
  const base = Math.pow(10, exponent);
  const normalised = span / base;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * base;
}

/**
 * Work out what the map should cover, and write it into `out`.
 *
 * Always includes the landing site at x = 0, the vehicle, the ground at y = 0,
 * and every trail point. The ground is pinned to the bottom edge rather than
 * being centred with everything else — a profile with sky below it would be
 * nonsense, and it means altitude is always read from the same baseline.
 *
 * Mutates `out` rather than returning an object: this is called every frame the
 * map redraws and CLAUDE.md asks for no allocation on that path.
 */
export function computeExtent(
  vehicleX: number,
  vehicleY: number,
  trailX: Float32Array,
  trailY: Float32Array,
  trailCount: number,
  out: MapExtent,
): void {
  // The landing site is always on the map: it is the thing you are aiming at.
  let minX = 0;
  let maxX = 0;
  let maxY = 0;

  if (Number.isFinite(vehicleX)) {
    if (vehicleX < minX) minX = vehicleX;
    if (vehicleX > maxX) maxX = vehicleX;
  }
  if (Number.isFinite(vehicleY) && vehicleY > maxY) maxY = vehicleY;

  for (let i = 0; i < trailCount; i++) {
    const x = trailX[i]!;
    const y = trailY[i]!;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const centreX = (minX + maxX) * 0.5;
  const spanX = Math.max(MIN_SPAN_X, niceSpan((maxX - minX) * (1 + MARGIN)));
  out.minX = centreX - spanX * 0.5;
  out.maxX = centreX + spanX * 0.5;

  out.minY = 0;
  out.maxY = Math.max(MIN_SPAN_Y, niceSpan(maxY * (1 + MARGIN)));
}

/** Map world metres to canvas pixels. Both are plain arithmetic, no state. */
export function projectX(extent: MapExtent, worldX: number, width: number): number {
  const span = extent.maxX - extent.minX;
  if (span <= 0) return width * 0.5;
  return ((worldX - extent.minX) / span) * width;
}

export function projectY(extent: MapExtent, worldY: number, height: number): number {
  const span = extent.maxY - extent.minY;
  if (span <= 0) return height;
  // Canvas y grows downward; altitude grows upward.
  return height - ((worldY - extent.minY) / span) * height;
}

/**
 * How many trail points the map draws, at most.
 *
 * The recorder's arrays are unbounded — a long flight is tens of thousands of
 * samples — and stroking all of them would put the length of the flight on the
 * frame path. Three hundred segments is more than a 280 px wide map can
 * resolve, so nothing is lost by capping.
 */
export const TRAIL_MAX_POINTS = 300;

/**
 * Copy a decimated trail into caller-owned arrays and return how many points
 * were written.
 *
 * Takes every nth point rather than averaging, because a trajectory is smooth
 * and the endpoints are what matter: the last point must always be the most
 * recent sample, or the trail visibly lags the vehicle it is supposed to end at.
 */
export function decimateTrail(
  sourceX: readonly number[],
  sourceY: readonly number[],
  outX: Float32Array,
  outY: Float32Array,
): number {
  const available = Math.min(sourceX.length, sourceY.length);
  const capacity = Math.min(outX.length, outY.length, TRAIL_MAX_POINTS);
  if (available === 0 || capacity === 0) return 0;

  if (available <= capacity) {
    for (let i = 0; i < available; i++) {
      outX[i] = sourceX[i]!;
      outY[i] = sourceY[i]!;
    }
    return available;
  }

  const stride = (available - 1) / (capacity - 1);
  for (let i = 0; i < capacity; i++) {
    // Rounding rather than flooring, and the last index computed exactly, so
    // the trail always ends where the flight actually is.
    const index = i === capacity - 1 ? available - 1 : Math.round(i * stride);
    outX[i] = sourceX[index]!;
    outY[i] = sourceY[index]!;
  }
  return capacity;
}

/**
 * An axis extent as a label.
 *
 * Same unit switch the HUD readouts use, for the same reason: 1980000 and 200
 * on the same instrument are hard to compare, 1980 KM and 200 M are not.
 */
export function formatSpan(metres: number): string {
  const magnitude = Math.abs(metres);
  if (magnitude < 1000) return `${Math.round(magnitude)} M`;
  const km = magnitude / 1000;
  return km < 10 ? `${km.toFixed(1)} KM` : `${Math.round(km)} KM`;
}
