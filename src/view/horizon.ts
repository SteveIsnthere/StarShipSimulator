/**
 * The planet's edge: one shape, shared by every layer that draws it.
 *
 * WHY THIS FILE EXISTS. Two layers draw ground — `world.ts` for the ground you
 * are standing on and `distant-earth.ts` for the compressed stand-in above it —
 * and both bow their top edge by the same parabola so that the two agree about
 * the shape of the planet. Until M9.15 they agreed by COINCIDENCE: the
 * expression `(2u - 1)^2 * sagitta * 3` was written out in both files, the bare
 * `sagitta * 3` appeared five times across them, and `HORIZON_SEGMENTS` was
 * declared twice with different values. A comment in one of them claimed the
 * two layers "draw one planet rather than two" and nothing whatsoever enforced
 * it. Change one copy and the horizon quietly develops a kink at the altitude
 * where the layers hand over.
 *
 * Everything here is pure: numbers in, numbers out, no PixiJS and no viewport.
 * That is deliberate — it is the half of the horizon that can be tested without
 * a renderer, and `tests/view/horizon.test.ts` does exactly that.
 */
import { textureRandom } from './particles';

/**
 * How far the bow is pushed past its true sagitta.
 *
 * ONE, meaning the geometry is now used as it comes. It was three from M6.7
 * until M9.15, on the argument that the true curve is only a few pixels below
 * about 40 km — which is correct and is also what a real horizon looks like
 * from 4 km, so the fudge was buying very little.
 *
 * What it cost was found by a test rather than by looking. Anything drawn as a
 * rectangle over the bowed band has to start at the bow's LOWEST point (see
 * `horizonDrop`), and the sagitta is a fraction of viewport WIDTH applied as a
 * vertical offset — so on a landscape phone at 40 km, three times it is 381 px
 * of a 945 px frame. The mottled ground began below the bottom edge and the
 * band came out a single flat colour, which is exactly what
 * `pixels.spec.ts`'s "the ground has structure at every altitude it is visible
 * from" exists to catch. At one, the same drop is 127 px and the texture is
 * back in the frame.
 *
 * Kept as a named constant at one rather than deleted, because the two layers
 * that draw ground both read it and the next person to want a more dramatic
 * planet should find the knob — and the note about what happens when they turn
 * it up.
 */
export const HORIZON_EXAGGERATION = 1;

/**
 * How many segments the bow is drawn with.
 *
 * One value, where there were two. `world.ts` used 16 and `distant-earth.ts`
 * used 48 for the same curve — not a bug, because a parabola at 16 segments is
 * already smooth at these amplitudes, but two numbers for one shape is how the
 * shape stops being one shape.
 */
export const HORIZON_SEGMENTS = 48;

/**
 * The bow's y at `u` across the span, relative to the ground line. Down is
 * positive, so the edges hang BELOW the middle.
 *
 * A parabola through (0, 0) at the middle and (+/-1, sagitta) at the edges —
 * indistinguishable from the circle at these angles and far cheaper than the
 * circle to evaluate.
 *
 * @param u 0 at the left of the span, 1 at the right
 * @param sagitta px — the true sagitta, before `HORIZON_EXAGGERATION`
 */
export function horizonCurve(u: number, sagitta: number): number {
  return (2 * u - 1) * (2 * u - 1) * sagitta * HORIZON_EXAGGERATION;
}

/**
 * px — how far below the ground line the bow's lowest point sits.
 *
 * Anything drawn as a RECTANGLE over a bowed band has to start here rather than
 * at the ground line, or it stands proud of the curve at the frame's edges and
 * puts the straight horizon back. That is not hypothetical: it is what happened
 * the first time the far band was bowed at M9.13, and the bow was invisible
 * until the mottle and the wash were moved down to this line.
 */
export function horizonDrop(sagitta: number): number {
  return sagitta * HORIZON_EXAGGERATION;
}

/** How many ridgelines the skyline is drawn with, far to near. */
export const RIDGE_LAYERS = 3;

/**
 * px — how far below the ground line a ridgeline's silhouette is filled.
 *
 * A silhouette is a solid shape, so the instinct is to fill it to the bottom of
 * the frame. That instinct cost nineteen million pixels of fill per frame on a
 * landscape phone — three polygons, each three screen widths wide and a full
 * frame tall, of which everything below the ground line is covered by the band
 * drawn over it. The band starts exactly at the ground line, so the ridges only
 * have to reach it; two pixels of overlap absorbs any rounding.
 */
export const RIDGE_FILL_DEPTH = 2;

/** Points per screen width in a ridgeline's profile. */
export const RIDGE_SEGMENTS = 128;

/**
 * m — above this, terrain relief stops being resolvable and the horizon is a
 * clean line.
 *
 * Not a fade for tidiness: it is what the geometry says. At 100 km the horizon
 * is 1130 km away, and a three-hundred-metre ridge at that range subtends
 * 0.015 degrees — a fifth of a pixel on any viewport this runs at. Hills drawn
 * up there are not distant hills, they are decoration.
 */
export const RELIEF_LIMIT_ALTITUDE = 45_000;

/**
 * A 1D value noise, PERIODIC in u with period 1.
 *
 * Periodic because the skyline is built once, three screen widths wide, and
 * then scrolled by moving the whole `Graphics` — a profile that did not join
 * itself at the wrap would put a cliff in the skyline once per screen. Uses the
 * same counter-based hash as the particle textures and the cloud deck, so the
 * skyline is the same skyline on every reload.
 */
export function ridgeNoise(u: number, lattice: number, salt: number): number {
  const x = u * lattice;
  const x0 = Math.floor(x);
  const f = x - x0;
  const smooth = f * f * (3 - 2 * f);
  const wrap = (n: number) => ((n % lattice) + lattice) % lattice;
  const a = textureRandom(wrap(x0), 0, salt);
  const b = textureRandom(wrap(x0 + 1), 0, salt);
  return a + (b - a) * smooth;
}

/**
 * A ridgeline's height at `u` along its period, 0 at the lowest and 1 at the
 * highest.
 *
 * THREE OCTAVES, AND THE POINT IS THAT IT IS NOT A SHAPE. What this replaced
 * was twenty-four copies of one bezier — the same smooth symmetric dome, over
 * and over, at different scales and alphas. No amount of per-copy jitter fixes
 * that, because a range of hills is not a row of objects: it is one continuous
 * profile that happens to have peaks in it. The octaves give it peaks at three
 * sizes, which is what stops the eye finding a repeated motif.
 */
export function ridgeHeight(u: number, layer: number): number {
  const salt = 0x9d21 + layer * 0x2f17;
  const wrapped = u - Math.floor(u);
  return (
    0.55 * ridgeNoise(wrapped, 5 + layer, salt) +
    0.3 * ridgeNoise(wrapped, 11 + layer * 3, salt ^ 0x51a3) +
    0.15 * ridgeNoise(wrapped, 23 + layer * 5, salt ^ 0xa7c1)
  );
}

/**
 * How much of the ground's own colour a ridgeline keeps, 0 (pure sky) to 1.
 *
 * Distance acts on a ridge's COLOUR rather than its opacity, which is what
 * aerial perspective does: the farther layer is mixed further toward the sky
 * and can approach its value without passing it.
 *
 * AND THIS IS THE SMALLER HALF OF THE FIX. Worth writing down, because the
 * first account of it was wrong and confidently so. The old marks were
 * translucent, and the argument was that the sky showing through made them
 * paler than their own background — a hill occludes sky, so nothing on a
 * horizon is brighter than what is behind it. Sound as a principle. Not what
 * was happening.
 *
 * Measured at 4 km, new against the marks it replaced: the OLD skyline was
 * brighter than the sky in 64 of 427 sampled columns and darker by 11.1 luma on
 * average; the new one is brighter in 105 of 427 and darker by only 7.3. The
 * change made the skyline LESS dark than the sky, not more. What the
 * translucency actually cost was contrast and warmth — the marks were tinted
 * toward the sky and sank into the wash, so they read as three haze patches
 * rather than as land.
 *
 * Rebuilt one variable at a time, which is the only reason this is known: an
 * irregular profile that is still translucent is muted but still reads as land;
 * a smooth periodic profile that is opaque and correctly aerial-mixed reads as
 * sine-wave dunes at a glance. `ridgeHeight` is what fixed the horizon. This
 * makes it better.
 */
export function ridgeGroundShare(layer: number, haze: number): number {
  const depth = (layer + 1) / RIDGE_LAYERS;
  return Math.max(0.06, depth * (1 - 0.55 * Math.min(1, Math.max(0, haze))));
}

/** How many alpha bands the limb's glow is built from. */
export const LIMB_BANDS = 14;

/**
 * How strongly the atmospheric limb shows, 0..1.
 *
 * THE OPPOSITE CURVE TO `hazeIntensity`, and the reason the 100 km frame had a
 * hard line between a dark sky and a bright desert with nothing in between.
 * Haze is what you see looking THROUGH the aerosol layer from inside it, so it
 * peaks a kilometre or two up and is gone by twenty. The limb is what you see
 * looking ALONG the whole atmosphere from outside it — a tangent path hundreds
 * of kilometres long — so it starts where haze ends and keeps rising.
 *
 * Saturating rather than linear: it is a thin bright arc from 100 km and a thin
 * bright arc from 400 km, because the atmosphere does not get any thicker.
 */
export function limbIntensity(altitude: number): number {
  const h = Math.max(0, altitude);
  return h / (h + 35_000);
}

/**
 * How much of the ground's own colour survives the air between, 0..1.
 *
 * Reuses `limbIntensity` deliberately rather than inventing a second curve:
 * they are the same physical fact seen from two sides. The limb is bright
 * exactly when the path through the atmosphere is long, and a long path is
 * exactly what washes the ground out. One curve, so a change to how much
 * atmosphere the view has cannot make the limb glow while the ground stays
 * crisp.
 *
 * Floored at a quarter, because the ground never becomes the sky: from orbit it
 * is still visibly land, only dim and blue.
 */
export function groundColourShare(altitude: number): number {
  return Math.max(0.25, 1 - 0.75 * limbIntensity(altitude));
}
