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
import { groundTint, hazeIntensity, horizonDistance, horizonSagittaFraction } from './atmosphere-look';
import { elevationAtOffset, groundDarkness, type SunLight } from './sun';
import { planetCircumference } from '$core/constants';
import { GROUND_COLOR } from './world';
import { skyLightness, skyTint } from './sky';
import { mixColour, scaleColour } from './colour';
import { MOTTLE_MEAN } from './terrain';
import {
  RIDGE_FILL_DEPTH,
  groundColourShare,
  horizonCurve,
  horizonDrop,
  HORIZON_SEGMENTS,
  limbIntensity,
  LIMB_BANDS,
  RELIEF_LIMIT_ALTITUDE,
  ridgeGroundShare,
  ridgeHeight,
  RIDGE_LAYERS,
  RIDGE_SEGMENTS,
} from './horizon';


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

/** Strips across the far earth for the terminator (M11.4). Three screen widths. */
export const TERMINATOR_STRIPS = 48;

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
 * The ratio at which the TRUE ground line reaches the bottom edge of the frame.
 *
 * The ground line sits at `0.5 + altitude/physicalHeight` down the screen, so
 * it leaves at a ratio of exactly one half. Not a tuned number — it is where
 * the real ground stops being visible, and therefore the first altitude at
 * which a stand-in for it is anything but a second, contradictory ground.
 */
export const GROUND_LEAVES_SCREEN = 0.5;

/** How much further, in the same units, the layer takes to reach full strength. */
export const DISTANT_EARTH_FADE_SPAN = 0.7;

/**
 * Whether the layer is drawn at all.
 *
 * THERE IS NO HORIZON IN AN ORTHOGRAPHIC SIDE VIEW, and that is the whole of
 * this. The camera looks horizontally, parallel to the ground plane, and every
 * metre in the frame is the same number of pixels wherever it is — there is no
 * perspective divide anywhere in the renderer. Under that projection a flat
 * ground plane is not a receding surface, it is a LINE: parallel lines do not
 * converge, so there is nothing for them to converge to. A horizon is a
 * perspective phenomenon and this scene has no perspective in it.
 *
 * So this layer is a cheat — a deliberate one, argued for in the file header,
 * and worth it above the altitude where the alternative is a featureless sky
 * for the whole flight. What it is not worth is being drawn NEXT TO the pad.
 * The scenery beside it is projected orthographically and correctly, and a
 * receding brown plane standing behind buildings that are drawn with no
 * recession at all is precisely the contradiction that made it read as a
 * painted backdrop rather than as ground.
 *
 * WAS `ratio > FOLLOW_RATIO`, which is a ratio of 0.05 — ten metres at the
 * intro's zoom. The comment that stood here claimed the layer was "EXACTLY
 * coincident with the true ground and completely hidden behind it" below that
 * threshold, and that much was true; what it missed is that ten metres is not
 * where the true ground LEAVES, it is only where this curve starts to bend
 * away from it. Between ten metres and a hundred both were on screen at once,
 * one behind the other, disagreeing about where the ground was.
 *
 * Now it waits until the real ground has actually gone.
 */
export function distantEarthVisible(altitude: number, physicalHeight: number): boolean {
  if (!Number.isFinite(altitude) || !Number.isFinite(physicalHeight) || physicalHeight <= 0) {
    return false;
  }
  return altitude / physicalHeight > GROUND_LEAVES_SCREEN;
}

/**
 * How strongly the layer is drawn, 0 below the threshold to 1 above the fade.
 *
 * A fade rather than a switch, because the layer's line is pinned near 0.58 by
 * `groundLineFraction` while the true ground is exiting at 1.0, so there is
 * nothing for the two to hand over to each other at: appearing at full strength
 * would be a brown band arriving in the middle of a clear sky in one frame.
 * Smoothstepped over the next 0.7 of a frame-height of climb, which at the
 * intro's zoom is a hundred metres to two hundred and forty.
 */
export function distantEarthOpacity(altitude: number, physicalHeight: number): number {
  if (!Number.isFinite(altitude) || !Number.isFinite(physicalHeight) || physicalHeight <= 0) {
    return 0;
  }
  const ratio = altitude / physicalHeight;
  if (ratio <= GROUND_LEAVES_SCREEN) return 0;
  const t = Math.min(1, (ratio - GROUND_LEAVES_SCREEN) / DISTANT_EARTH_FADE_SPAN);
  return t * t * (3 - 2 * t);
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

/**
 * How much the ground band's texture is squashed vertically, as a fraction of
 * its horizontal scale.
 *
 * A plane seen at a grazing angle foreshortens along the line of sight and not
 * across it. This band is ALWAYS seen at a grazing angle — it runs from the
 * foreground to a horizon hundreds of kilometres away — so the compression is
 * effectively constant over it, and one number does what a perspective warp
 * would do for a fraction of the cost. Asserted below one, which is the only
 * thing about it that is not a taste: a value at or above one is a wall.
 */
export const GROUND_FORESHORTENING = 0.34;

export interface DistantEarth {
  readonly container: Container;
  /**
   * @param dt s — real seconds, for the scroll
   */
  /** @param sun M11.4 — for the terminator across the band. Without it, full day. */
  update(viewport: Viewport, altitude: number, speedX: number, dt: number, sun?: SunLight): void;
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
  readonly limb: Texture;
}): DistantEarth {
  const container = new Container({ label: 'distantEarth' });

  /*
    THE SKYLINE (M9.13), and it goes in FIRST — behind the band, the mottle and
    the wash. Each ridge is a profile filled all the way down, because a
    silhouette is a solid thing; drawn in front it covered the ground it was
    supposed to be standing on, and the first frames with it in showed exactly
    that, a flat tan slab with a wiggly top and no texture anywhere. Behind the
    band, only the part above the horizon line survives, which is the part that
    is a skyline.

    Far layer first within the group, so nearer ridges occlude it as land does.
    See `ridgeHeight` for why this replaced twenty-four copies of one bezier,
    and `ridgeGroundShare` for why they are opaque.
  */
  const ridges: Graphics[] = [];
  for (let i = 0; i < RIDGE_LAYERS; i++) {
    const ridge = new Graphics();
    container.addChild(ridge);
    ridges.push(ridge);
  }

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
    The air in front of the ground, drawn last so it lies over everything this
    layer draws. See `writeHazeRamp`: without it the band's top edge is a
    one-pixel step against the sky, which is the most artificial thing left in
    any frame with ground in it.
  */
  const horizonHaze = terrain ? new Sprite(terrain.haze) : undefined;
  if (horizonHaze) container.addChild(horizonHaze);

  /*
    THE LIMB. Drawn last of all, because it is in front of everything this layer
    has: it is the air between the eye and the horizon, seen end-on. Additive,
    because scattered light adds to whatever is behind it rather than covering
    it — the stars near the limb dim into it rather than being cut off by it.
  */
  /*
    THE TERMINATOR (M11.4). The far earth is the ground seen to the horizon,
    and the horizon is `horizonDistance(altitude)` away each side — at 100 km
    about eleven hundred kilometres, which is ten degrees of longitude, which
    is forty minutes of local time. So when the sun is within an hour of
    setting, the night is IN THE FRAME, and this draws it: strips across the
    band, each darkened by how far below the day line the sun is at that
    strip's longitude. Rebuilt when the hour angle moves half a degree (two
    minutes of sim time, or fifty kilometres of downrange), never per frame.
    At noon every strip is clear and the whole thing is hidden.
  */
  const terminator = new Graphics();
  container.addChild(terminator);
  let terminatorKey = -1;

  const limb = new Graphics();
  limb.blendMode = 'add';
  container.addChild(limb);

  let bandWidth = 0;
  let bandHeight = 0;
  let bandBow = -1;
  let limbKey = -1;
  let offset = 0;
  /** Last geometry each ridgeline was built at, so it is not rebuilt per frame. */
  const ridgeKey = new Int32Array(RIDGE_LAYERS).fill(-1);

  return {
    container,
    get scrollOffset() {
      return offset;
    },

    update(viewport, altitude, speedX, dt, sun) {
      const visible = distantEarthVisible(altitude, viewport.physicalHeight);
      container.visible = visible;
      if (!visible) return;

      const lineY = groundLineFraction(altitude, viewport.physicalHeight) * viewport.height;
      const haze = hazeIntensity(altitude);

      /*
        THE HORIZON BENDS HERE TOO (M9.13), and its not doing so was the other
        half of why the 100 km frame read as a desert wall. `world.ts` has had
        the bow since M6.7, but the near ground is off the bottom of the screen
        long before the curvature matters — so the only horizon anybody can see
        above about 500 m was this one, drawn as a ruler-straight rect at every
        altitude from the pad to vacuum. At 100 km the visible arc is a
        hundred and thirteen pixels of sagitta on a 1280 px frame. That is not
        a subtlety, it is the single most recognisable thing about the view.

        Same curve and the same exaggeration the near ground uses, both from
        `horizon.ts`, so the two layers cannot disagree about the shape of the
        planet. (That exaggeration is 1 as of M9.15 — the geometry as it comes.
        See `HORIZON_EXAGGERATION` for what three cost.)
      */
      const sagitta = Math.round(horizonSagittaFraction(altitude) * viewport.width);
      if (bandWidth !== viewport.width || bandHeight !== viewport.height || bandBow !== sagitta) {
        bandWidth = viewport.width;
        bandHeight = viewport.height;
        bandBow = sagitta;
        band.clear();
        // Three screens wide so a pan never runs off its end, and down past the
        // bottom so no rounding can leave a gap under it.
        const left = -viewport.width;
        const span = viewport.width * 3;
        if (sagitta <= 0) {
          band.rect(left, 0, span, viewport.height * 2);
        } else {
          band.moveTo(left, viewport.height * 2);
          for (let k = 0; k <= HORIZON_SEGMENTS; k++) {
            const u = k / HORIZON_SEGMENTS;
            band.lineTo(left + span * u, horizonCurve(u, sagitta));
          }
          band.lineTo(left + span, viewport.height * 2);
        }
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
      /*
        AND MOST OF THAT COLOUR IS GONE BY 100 KM. Looking down from up there is
        looking through the WHOLE air column, and the frames showed what
        ignoring that costs: a warm high-contrast desert filling the bottom of a
        star-field, brighter than anything else in the picture, which is the
        exact opposite of every photograph ever taken from that altitude. The
        ground keeps its own colour near the pad and is mixed toward the sky's
        as the column between grows — the same aerial perspective the ridgelines
        get, over a much longer path.
      */
      const tint = mixColour(
        skyTint(altitude),
        groundTint(GROUND_COLOR, lightness),
        groundColourShare(altitude),
      );
      /*
        THE FLAT FILL IS SET TO WHAT THE MOTTLE AVERAGES TO, not to the tint.
        The mottle is a rectangle and the band's top edge is a curve, so there
        is always a sliver of bare band above it — a hundred and thirteen pixels
        from 100 km. At the full tint that sliver is brighter than the textured
        ground below it and reads as a stripe across the frame, which is what
        the 100 km capture showed the moment the bow got small enough for the
        sliver to sit inside the picture.
      */
      const groundShown = scaleColour(tint, MOTTLE_MEAN);
      // M11.4: the bare sliver between the bow and the terminator strips is
      // darkened to the vehicle's own longitude, so it matches the strip
      // beneath it at night rather than showing as a lit rim on the horizon.
      band.tint = sun ? scaleColour(groundShown, 1 - groundDarkness(sun.elevation)) : groundShown;
      band.x = 0;
      band.y = lineY;
      band.alpha = 1;

      /*
        FORESHORTENED, WHICH IS THE WHOLE OF WHY IT READS AS GROUND.

        The band was drawn at `tileScale (2.4, 2.4)` — isotropic — and an
        isotropic texture on a surface receding from the eye is the signature of
        a WALL. That is the "brown backdrop behind the pad": not the colour and
        not the position, both of which are right, but a surface with no
        foreshortening in it at all.

        Five strips at increasing tile scale were tried first, as a stepwise
        approximation to true perspective, and are worse: adjacent strips do not
        share a texture phase, so each boundary is a visible seam and the band
        reads as terracing. The number of strips does not help — a seam is a
        discontinuity in the pattern, not in the scale.

        One sprite, squashed. A grazing view of a plane compresses vertically
        and not horizontally, and 0.34 of the horizontal scale is that
        compression at the angles this band is ever seen from. The rest of the
        depth cue is the haze below, which is what actually distinguishes near
        ground from far.
      */
      if (mottle) {
        mottle.x = -viewport.width;
        /*
          BELOW THE BOW'S LOWEST POINT, which is the rule `world.ts` follows and
          for the same reason: this is a rectangle and the band's top edge is a
          curve, so a rectangle starting at `lineY` sticks up above the curve at
          the frame's edges and puts the straight line back. That is exactly
          what happened when the bow was first drawn — the horizon stayed
          ruler-flat and the curve was hiding behind this sprite.
        */
        mottle.y = lineY + horizonDrop(sagitta);
        mottle.width = viewport.width * 3;
        mottle.height = Math.max(1, viewport.height * 2 - mottle.y);
        mottle.tileScale.set(2.4, 2.4 * GROUND_FORESHORTENING);
        // Scrolls with the layer's own compressed offset, so the texture is
        // attached to the same world the marks are.
        mottle.tilePosition.x = offset * 0.5;
        mottle.tint = tint;
      }

      /*
        WAS 0.55 + 0.35 * (1 - haze), which at a kilometre put the whole layer at
        0.73 over a blue sky and turned a brown band grey. That blanket
        transparency was M7.4's way of making the layer read as distant; the
        horizon haze below does that job properly now, in the sky's own colour
        and only where the air actually is. What is left here is a gentle knock
        so the far earth never competes with the near ground for attention.
      */
      container.alpha =
        (0.82 + 0.14 * (1 - haze)) * distantEarthOpacity(altitude, viewport.physicalHeight);

      // The scroll. Compressed, and see the note on `compressedScrollSpeed` for
      // why it has to be.
      const scroll = compressedScrollSpeed(speedX * viewport.scale);
      offset -= scroll * dt;
      // Wrapped rather than accumulated, so the number stays small over a long
      // flight and the marks never drift out of float precision.
      offset = ((offset % MARK_SPACING) + MARK_SPACING) % MARK_SPACING;

      /*
        THE SKYLINE, rebuilt only when its geometry changes and otherwise moved.

        Relief is drawn at all only while it can be SEEN — see
        `RELIEF_LIMIT_ALTITUDE`. Above that the horizon is a clean line, because
        that is what it is: a three-hundred-metre ridge eleven hundred
        kilometres away is a fifth of a pixel.
      */
      const relief = Math.max(0, 1 - altitude / RELIEF_LIMIT_ALTITUDE);
      const ridgeScale = Math.max(0.6, viewport.width / 1280);
      const skyColour = skyTint(altitude);
      for (let i = 0; i < ridges.length; i++) {
        const ridge = ridges[i]!;
        ridge.visible = relief > 0.01;
        if (!ridge.visible) continue;
        // Near layers are taller, as nearer hills are.
        const amplitude = (5 + i * 9) * ridgeScale * relief;
        // The sagitta is in the key because the closing edge follows the bow.
        const key =
          Math.round(amplitude * 4) * 4096 + Math.round(viewport.width) + sagitta * 1_048_576;
        if (ridgeKey[i] !== key) {
          ridgeKey[i] = key;
          ridge.clear();
          const left = -viewport.width;
          const span = viewport.width * 3;
          const steps = RIDGE_SEGMENTS * 3;
          /*
            CLOSED ALONG THE BOW, not at the bottom of the frame and not on a
            flat line either. Two wrong versions preceded this one and both are
            worth keeping written down.

            The first closed each polygon at `viewport.height`: on a landscape
            phone that is 6795 x 945 px of fill, three of them, every frame —
            nineteen million pixels to draw a skyline, essentially all of it
            hidden behind the band drawn over it. Under the software rasteriser
            the browser projects use, that alone slowed the page enough for
            `shake.spec.ts` to exhaust its four-minute budget on all four phone
            projects.

            The second closed on a flat line two pixels below the ground line,
            on the premise that "the band starts at the ground line and covers
            everything below". It does not: the band's top edge is the BOW, which
            sits at `lineY` only in the middle and drops to `lineY + sagitta` at
            the ends of its three-screen span. Over the visible middle third
            that is up to `sagitta / 9` — about fourteen pixels at 40 km on a
            landscape phone — of gap between where the ridge stopped and where
            the band began, showing sky through it and leaving the skyline
            detached from the ground at both edges of the frame.

            Following the same curve closes it exactly, and costs only the strip
            between the profile and the bow rather than a screen of fill.
          */
          ridge.moveTo(left, horizonCurve(0, sagitta) + RIDGE_FILL_DEPTH);
          for (let k = 0; k <= steps; k++) {
            const u = k / steps;
            // Three periods across the span, so the profile joins itself at the
            // wrap and the whole thing can be scrolled by moving `ridge.x`.
            ridge.lineTo(left + span * u, -amplitude * ridgeHeight(u * 3, i));
          }
          for (let k = steps; k >= 0; k--) {
            const u = k / steps;
            ridge.lineTo(left + span * u, horizonCurve(u, sagitta) + RIDGE_FILL_DEPTH);
          }
          ridge.fill(0xffffff);
        }
        // Its own parallax: nearer ridges pass faster, which is the other half
        // of reading them as different distances.
        const rate = 0.35 + 0.3 * i;
        ridge.x = -((offset * rate) % viewport.width);
        ridge.y = lineY + 1;
        /*
          MIXED TOWARD WHAT THE GROUND ACTUALLY SHOWS, not toward the raw tint.
          The band is drawn at `MOTTLE_MEAN` of the tint so that its bare sliver
          matches the mottle beside it; a ridge mixed toward the unscaled tint
          therefore lands 25% brighter than the ground directly beneath it, and
          above about 15 km — where haze is near zero and the nearest layer's
          share is 1 — it sits at exactly `tint` against a band at 0.798 of it.
          A bright step running along the horizon line, introduced by the change
          that was supposed to remove one.
        */
        ridge.tint = mixColour(skyColour, groundShown, ridgeGroundShare(i, haze));
      }

      if (horizonHaze) {
        horizonHaze.x = -viewport.width;
        horizonHaze.y = lineY + horizonDrop(sagitta);
        horizonHaze.width = viewport.width * 3;
        // Deeper when the air is thick, and never taller than a fifth of the
        // frame — this is the join, not a weather effect.
        /*
          A SMALL FLOOR AND THE REST FROM THE ATMOSPHERE — and the floor is
          small on purpose, because the version before this one had it at 0.30
          and that was fog.

          Three depths were built and photographed. With no wash at all the sky
          reaches its full ground colour in FOUR rows, which is the seam: a
          dead-straight step across the whole frame. At 0.30 + 0.22 x haze it
          takes sixty rows and the ground a hundred and twenty pixels down is
          still not its own colour — that is not softening a join, it is
          bleaching the terrain, and it made every frame look like a hazy day
          at every altitude. About twenty rows dissolves the join and leaves the
          ground its colour.

          The mistake underneath it is worth naming: the wash was deepened in
          the same change that added foreshortening, to stop the band reading as
          a slab. Foreshortening was what fixed that. The wash was treating a
          symptom that had already gone, and a constant floor is the wrong shape
          for it anyway — `hazeIntensity` peaks a kilometre or two up and is
          near zero at the pad, so the atmosphere should decide this, not a
          number that applies at sea level and in vacuum alike.
        */
        horizonHaze.height = Math.max(8, viewport.height * (0.05 + 0.30 * haze));
        horizonHaze.tint = skyTint(altitude);
        // Same floor as the near ground's, and for the same reason — see there.
        horizonHaze.alpha = Math.min(1, 0.55 + 0.45 * haze);
      }

      if (sun) {
        // Longitude per screen half-width, as an hour angle: the visible
        // ground spans the horizon distance each way.
        const spanRad = (horizonDistance(altitude) / planetCircumference) * 2 * Math.PI;
        const key =
          Math.round((sun.hourAngle * 180) / Math.PI * 2) * 1_000_003 +
          Math.round(spanRad * 1000) * 4096 +
          sagitta * 16 +
          Math.round(viewport.width / 8);
        if (key !== terminatorKey) {
          terminatorKey = key;
          terminator.clear();
          let any = false;
          const left = -viewport.width;
          const span = viewport.width * 3;
          for (let i = 0; i < TERMINATOR_STRIPS; i++) {
            const u = (i + 0.5) / TERMINATOR_STRIPS;
            // Screen x relative to the centre, in half-widths, is longitude.
            const offset = (u * 3 - 1.5) * 2;
            const dark = groundDarkness(elevationAtOffset(sun.hourAngle, offset * spanRad));
            if (dark > 0.005) {
              any = true;
              // Whole-pixel edges that meet exactly: an overlap doubles the
              // alpha along a seam and a gap leaves a light one, and both
              // read as bars across the night side.
              const x0 = Math.round(left + (i * span) / TERMINATOR_STRIPS);
              const x1 = Math.round(left + ((i + 1) * span) / TERMINATOR_STRIPS);
              // Below the bow's lowest point, the rule every rectangle over
              // this band follows (see the mottle): a strip from the line
              // itself would stand proud of the curve at the frame's edges
              // and black out the sky above it.
              terminator.rect(x0, horizonDrop(sagitta), x1 - x0, viewport.height * 2);
              terminator.fill({ color: 0x000000, alpha: dark });
            }
          }
          terminator.visible = any;
        }
        terminator.x = 0;
        terminator.y = lineY;
      } else {
        terminator.visible = false;
      }

      const glow = limbIntensity(altitude);
      limb.visible = glow > 0.02;
      if (limb.visible) {
        // A thin arc: the air is a hundred kilometres deep against a horizon
        // eleven hundred kilometres away, and it looks it.
        const depth = Math.max(6, viewport.height * (0.02 + 0.05 * glow));
        const key = Math.round(depth) * 8192 + sagitta * 4 + Math.round(viewport.width / 8);
        if (limbKey !== key) {
          limbKey = key;
          limb.clear();
          const left = -viewport.width;
          const span = viewport.width * 3;
          /*
            FOLLOWS THE BOW, in bands, because it has to do two things at once
            that a sprite cannot: sit exactly on a curved horizon and fade
            upward off it. A flat sprite hung above a curve that drops three
            hundred pixels at the frame's edges is a glowing bar floating over
            the planet, which is worse than no limb at all. Six bands left
            visible arcs stepping up off the horizon; fourteen does not.
          */
          for (let b = 0; b < LIMB_BANDS; b++) {
            const outer = ((b + 1) / LIMB_BANDS) * depth;
            const inner = (b / LIMB_BANDS) * depth;
            const t = 1 - (b + 0.5) / LIMB_BANDS;
            limb.moveTo(left, horizonCurve(0, sagitta) - inner);
            for (let k = 0; k <= HORIZON_SEGMENTS; k++) {
              const u = k / HORIZON_SEGMENTS;
              limb.lineTo(left + span * u, horizonCurve(u, sagitta) - inner);
            }
            for (let k = HORIZON_SEGMENTS; k >= 0; k--) {
              const u = k / HORIZON_SEGMENTS;
              limb.lineTo(left + span * u, horizonCurve(u, sagitta) - outer);
            }
            limb.fill({ color: 0x8fb6ff, alpha: t * t * t });
          }
        }
        limb.x = 0;
        limb.y = lineY;
        limb.alpha = 0.35 + 0.65 * glow;
      }
    },
  };
}
