/**
 * The distant earth: a compressed-perspective ground layer.
 *
 * WHY IT EXISTS, measured in DEPTH-AND-SPEED-PLAN § 1. The true-scale ground
 * leaves the screen the moment the camera climbs past half a viewport — about
 * 100 m before M7.3, about 500 m after it — and every scenario but the final
 * landing is then flown against a featureless sky. Drawing the real ground from
 * 20 km at true scale is not an option: it would be a line one pixel below the
 * bottom edge.
 *
 * BOTH CURVES IN THIS FILE ARE COMPRESSIONS, and this comment is the plan's
 * honesty rule (§ 5) being kept rather than described. Neither the position of
 * the ground line nor the rate it scrolls at is what the physics says it should
 * be. That is allowed here and nowhere else: compression is permitted in the
 * DEPICTION of the world and never in the numbers, and every number a player
 * reads comes from the HUD, which reads SimState at true scale. This layer
 * carries no numbers. It is scenery.
 *
 * It is also the same cheat every flight simulator makes, and the reason they
 * read as flight: a cockpit view of the real ground from 10 km is a still
 * photograph, because at that distance nothing moves fast enough to see.
 *
 * WHAT MAKES THE HANDOVER SEAMLESS. `groundLineFraction` is EXACTLY the true
 * projection until the ground line is 80% of the way down the screen, and only
 * compresses past that. So while the real ground is comfortably on screen the
 * two coincide and this layer is completely hidden behind it; as the real one
 * slides off the bottom, this one emerges from behind it, already in the right
 * place. There is no altitude at which anything jumps — asserted in
 * tests/view/distant-earth.test.ts.
 */
import { Container, Graphics, Sprite, TilingSprite, type Texture } from 'pixi.js';
import type { Viewport } from './camera';
import { groundTint, hazeIntensity } from './atmosphere-look';
import { GROUND_COLOR } from './world';
import { skyLightness, skyTint } from './sky';
import { textureRandom } from './particles';


/**
 * The point on the way down the screen where compression begins, as a fraction
 * of the viewport height BELOW ITS CENTRE.
 *
 * 0.05 of a half-frame past centre is 0.55 of the way down the screen, and the
 * number is set by the OVERLAY rather than by the geometry.
 *
 * The first version put it at 0.30, which is 0.80 down — physically defensible
 * and completely useless, because the broadcast scrim owns the bottom third of
 * the screen. The layer was drawn, correct, and invisible: the 20 km screenshot
 * showed an empty sky with the earth hidden behind the telemetry. A depth cue
 * nobody can see is not a depth cue.
 *
 * At 0.55 the horizon sits clear of the scrim's top edge at every viewport the
 * five Playwright projects run, which is what makes this layer worth its fill.
 */
export const FOLLOW_RATIO = 0.05;

/**
 * How much further the line may travel once it stops following, in the same
 * units.
 *
 * The asymptote is FOLLOW_RATIO + this = 0.08, which is 0.58 of the way down the
 * screen — so the earth always owns the band between the horizon and the
 * overlay, at every altitude from 200 m to 200 km. A larger value would slide it
 * behind the scrim and reintroduce the problem this exists to solve.
 */
export const COMPRESSED_SPAN = 0.03;

/**
 * Where the distant ground line sits, as a fraction of viewport height from the
 * top of the screen.
 *
 * THIS IS A COMPRESSION. The true projection is `0.5 + altitude/physicalHeight`
 * and runs off the bottom of the screen at any real altitude; this follows it
 * exactly to 0.55 and then bends, approaching 0.58 and never reaching it.
 *
 * The bend is an exponential with its length scale equal to the span it has
 * left, which is what makes the curve C1 at the join: the derivative of
 * `A(1 - e^(-x/A))` at x = 0 is exactly 1, the same slope the true projection
 * has. Continuous position AND continuous rate — a ground line that stopped
 * descending abruptly would read as the world snagging on something.
 *
 * @param altitude m
 * @param physicalHeight m — the world height the viewport covers
 */
export function groundLineFraction(altitude: number, physicalHeight: number): number {
  if (!Number.isFinite(altitude) || !Number.isFinite(physicalHeight) || physicalHeight <= 0) {
    return 0.5;
  }
  const ratio = Math.max(0, altitude) / physicalHeight;
  if (ratio <= FOLLOW_RATIO) return 0.5 + ratio;
  const past = ratio - FOLLOW_RATIO;
  return 0.5 + FOLLOW_RATIO + COMPRESSED_SPAN * (1 - Math.exp(-past / COMPRESSED_SPAN));
}

/**
 * px/s — the fastest the layer scrolls before compression starts.
 *
 * § 1.3 of the plan measured the problem: at 7300 m/s a ground object crosses a
 * 1280 px screen in 49 milliseconds, under three frames at 60 fps. Anything
 * above a few hundred pixels a second is already a grey wash, so this is where
 * the readable band ends and the compression begins.
 */
export const SCROLL_KNEE = 420;

/**
 * px/s — the length scale of the compression above the knee.
 *
 * Small, because the range being folded is enormous: 26,280 px/s has to land
 * somewhere a viewer can follow. At 30 the whole range from the knee to
 * re-entry speed maps into about 200 px/s of extra motion.
 */
export const SCROLL_SOFTNESS = 30;

/**
 * How fast the distant layer actually scrolls, given how fast it "should".
 *
 * THIS IS A COMPRESSION, and the largest one in the project. True scale at
 * re-entry is 26,280 px/s; this returns about 620, a factor of forty-two. The
 * plan is explicit that it must be — a layer scrolling at `speed x scale` at
 * orbital velocity conveys nothing at all, which is precisely the § 1.3 finding
 * that motivated the milestone.
 *
 * Logarithmic above the knee and identity below it, joined C1 for the same
 * reason as the curve above: the derivative of `K ln(1 + x/K)` at x = 0 is 1.
 * So slow flight scrolls at exactly true scale — a landing looks like a
 * landing — and only speeds that were never readable get folded.
 *
 * @param truePxPerSecond what `speedX * viewport.scale` would give
 */
export function compressedScrollSpeed(truePxPerSecond: number): number {
  if (!Number.isFinite(truePxPerSecond)) return 0;
  const sign = truePxPerSecond < 0 ? -1 : 1;
  const speed = Math.abs(truePxPerSecond);
  if (speed <= SCROLL_KNEE) return truePxPerSecond;
  return sign * (SCROLL_KNEE + SCROLL_SOFTNESS * Math.log1p((speed - SCROLL_KNEE) / SCROLL_SOFTNESS));
}

/**
 * How opaque the layer is.
 *
 * Not a fade for its own sake: at or below the follow ratio this layer is
 * EXACTLY coincident with the true ground and completely hidden behind it, so
 * drawing it is a wasted full-width fill. Gating on the same ratio the curve
 * bends at makes that exact rather than approximate — it becomes visible at the
 * instant it starts to separate, so there is nothing to see appearing.
 */
export function distantEarthVisible(altitude: number, physicalHeight: number): boolean {
  if (!Number.isFinite(altitude) || !Number.isFinite(physicalHeight) || physicalHeight <= 0) {
    return false;
  }
  return altitude / physicalHeight > FOLLOW_RATIO;
}

/* ------------------------------------------------------------------------ */

/**
 * How many terrain marks the layer carries.
 *
 * Pooled and created once. They are repositioned by a scrolling offset and
 * wrapped, so this is the number visible at a time rather than the number in
 * the world — the same trick the roaming scenery uses in world.ts, and the
 * reason nothing here allocates per frame.
 */
export const TERRAIN_MARKS = 24;

/** px — spacing between marks on screen, so density does not change with speed. */
export const MARK_SPACING = 130;

export interface DistantEarth {
  readonly container: Container;
  /**
   * @param dt s — real seconds, for the scroll
   */
  update(viewport: Viewport, altitude: number, speedX: number, dt: number): void;
  /** For tests: how far the layer has scrolled, in px. */
  readonly scrollOffset: number;
}

/**
 * @param terrain the generated mottle (M9.8). Optional for the same reason
 *   `createWorld`'s is: without it this is the flat band it was before, which is
 *   what the headless tests assert against.
 */
export function createDistantEarth(terrain?: {
  readonly mottle: Texture;
  readonly haze: Texture;
}): DistantEarth {
  const container = new Container({ label: 'distantEarth' });

  // The band, redrawn only when the viewport changes size.
  const band = new Graphics();
  container.addChild(band);

  /*
    The same mottle the near ground uses, one layer out and at a coarser tile
    scale (M9.8) — because this band had the identical problem: a flat fill with
    a hard top edge and a repeating mark pattern that reads as bumps. Tinted
    from the same two curves the band is, so the two layers cannot drift apart.
  */
  const mottle = terrain
    ? new TilingSprite({ texture: terrain.mottle, width: 1, height: 1 })
    : undefined;
  if (mottle) container.addChild(mottle);

  /*
    THE MARKS WERE A STAMP (M9 look pass). Twenty-four identical bumps at one
    scale and one alpha, evenly spaced — which is what made the band read as a
    scalloped border rather than as terrain. Real ground at forty kilometres has
    ridges at every size, and most of them are almost invisible.

    Each mark now gets its own width, height and opacity from a seeded hash, so
    the row is a range of hills rather than a repeated motif — and the hash is
    the same one the particle textures and the cloud deck use, so the horizon is
    the same horizon on every reload.
  */
  const marks: Graphics[] = [];
  const markShape = new Float32Array(TERRAIN_MARKS * 3);
  for (let i = 0; i < TERRAIN_MARKS; i++) {
    const wide = 0.55 + textureRandom(i, 0, 0x4e11) * 1.15;
    const tall = 0.35 + textureRandom(i, 1, 0x4e11) * 1.5;
    markShape[i * 3] = wide;
    markShape[i * 3 + 1] = tall;
    markShape[i * 3 + 2] = 0.18 + textureRandom(i, 2, 0x4e11) * 0.42;

    const mark = new Graphics();
    // A low, wide bump. Drawn once in local space and only ever transformed.
    mark.moveTo(-34, 0);
    mark.bezierCurveTo(-16, -13, 12, -15, 34, 0);
    mark.fill(0xffffff);
    container.addChild(mark);
    marks.push(mark);
  }

  /*
    The air in front of the ground, drawn last so it lies over everything this
    layer draws. See `writeHazeRamp`: without it the band's top edge is a
    one-pixel step against the sky, which is the most artificial thing left in
    any frame with ground in it.
  */
  const horizonHaze = terrain ? new Sprite(terrain.haze) : undefined;
  if (horizonHaze) container.addChild(horizonHaze);

  let bandWidth = 0;
  let bandHeight = 0;
  let offset = 0;

  return {
    container,
    get scrollOffset() {
      return offset;
    },

    update(viewport, altitude, speedX, dt) {
      const visible = distantEarthVisible(altitude, viewport.physicalHeight);
      container.visible = visible;
      if (!visible) return;

      const lineY = groundLineFraction(altitude, viewport.physicalHeight) * viewport.height;

      if (bandWidth !== viewport.width || bandHeight !== viewport.height) {
        bandWidth = viewport.width;
        bandHeight = viewport.height;
        band.clear();
        // Three screens wide so a pan never runs off its end, and down past the
        // bottom so no rounding can leave a gap under it.
        band.rect(-viewport.width, 0, viewport.width * 3, viewport.height * 2);
        band.fill(0xffffff);
      }

      /*
        The colour comes from the same two curves the near ground uses, so the
        two layers cannot drift apart as the sky darkens — which is the bug M6.7
        fixed for the ground and the sky, reappearing one layer further out if
        this were tinted independently.

        Then it is pushed toward the haze colour by the same aerosol curve that
        draws the haze band. That is what makes it read as DISTANT rather than
        as a second ground line: distance is carried by contrast, not by size.
      */
      const lightness = skyLightness(altitude);
      const tint = groundTint(GROUND_COLOR, lightness);
      band.tint = tint;
      band.x = 0;
      band.y = lineY;
      band.alpha = 1;

      if (mottle) {
        mottle.x = -viewport.width;
        mottle.y = lineY;
        mottle.width = viewport.width * 3;
        mottle.height = Math.max(1, viewport.height * 2 - lineY);
        // Coarser than the near ground's, so the two read as different
        // distances rather than as the same surface at two heights.
        mottle.tileScale.set(2.4, 2.4);
        // Scrolls with the layer's own compressed offset, so the texture is
        // attached to the same world the marks are.
        mottle.tilePosition.x = offset * 0.5;
        mottle.tint = tint;
      }

      const haze = hazeIntensity(altitude);
      /*
        WAS 0.55 + 0.35 * (1 - haze), which at a kilometre put the whole layer at
        0.73 over a blue sky and turned a brown band grey. That blanket
        transparency was M7.4's way of making the layer read as distant; the
        horizon haze below does that job properly now, in the sky's own colour
        and only where the air actually is. What is left here is a gentle knock
        so the far earth never competes with the near ground for attention.
      */
      container.alpha = 0.82 + 0.14 * (1 - haze);

      // The scroll. Compressed, and see the note on `compressedScrollSpeed` for
      // why it has to be.
      const scroll = compressedScrollSpeed(speedX * viewport.scale);
      offset -= scroll * dt;
      // Wrapped rather than accumulated, so the number stays small over a long
      // flight and the marks never drift out of float precision.
      offset = ((offset % MARK_SPACING) + MARK_SPACING) % MARK_SPACING;

      const markScale = Math.max(0.6, viewport.width / 1280);
      for (let i = 0; i < marks.length; i++) {
        const mark = marks[i]!;
        // Its own slot, plus a fraction of the spacing so the row is not a comb.
        const jitter = (textureRandom(i, 3, 0x4e11) - 0.5) * MARK_SPACING * 0.55;
        mark.x = -MARK_SPACING + offset + i * MARK_SPACING + jitter;
        /*
          AND THEY ARE NOT ALL AT ONE HEIGHT. Sitting every mark on `lineY + 1`
          made the row a scalloped BORDER — a ruled line with identical bumps
          along it, which is what a decorative edge looks like and not what a
          range of hills looks like. A few pixels of vertical scatter, scaled
          with the marks themselves, turns the row into a skyline.
        */
        mark.y = lineY + 1 + (textureRandom(i, 4, 0x4e11) - 0.5) * 14 * markScale;
        mark.scale.set(markScale * markShape[i * 3]!, markScale * 0.8 * markShape[i * 3 + 1]!);
        mark.tint = tint;
        mark.alpha = markShape[i * 3 + 2]!;
      }

      if (horizonHaze) {
        horizonHaze.x = -viewport.width;
        horizonHaze.y = lineY;
        horizonHaze.width = viewport.width * 3;
        // Deeper when the air is thick, and never taller than a fifth of the
        // frame — this is the join, not a weather effect.
        horizonHaze.height = Math.max(8, viewport.height * (0.05 + 0.14 * haze));
        horizonHaze.tint = skyTint(altitude);
        // Same floor as the near ground's, and for the same reason — see there.
        horizonHaze.alpha = Math.min(1, 0.55 + 0.45 * haze);
      }
    },
  };
}
