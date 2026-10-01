/**
 * The cloud deck: the missing middle distance.
 *
 * WHY IT EXISTS, from DEPTH-AND-SPEED-PLAN § 1.4 — before M7 the parallax in
 * this game jumped from 1x (the ground, at true scale) straight to 0.001x (the
 * stars) with nothing in between, which is why even a well-flown ascent read as
 * flat. M7.4 put a layer at the far end; this is the near one. Depth is not a
 * layer, it is the RELATIONSHIP between layers, and two of them is the minimum
 * number that can have one.
 *
 * THE POSITION CURVE IS A COMPRESSION and says so below. The horizontal rate is
 * M7.4's compression multiplied by a parallax factor — the factor is the entire
 * point, because a middle distance that moved at the same rate as the far one
 * would not be a middle distance, it would be a second copy of the same layer.
 *
 * SEEDED, so the deck is the same deck every run. `view/` may call Math.random
 * and this deliberately does not: a cloud layer that reshuffled on every reload
 * would make the screenshots in docs/ irreproducible and would mean two players
 * comparing notes were not looking at the same sky.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import type { Viewport } from './camera';
import { compressedScrollSpeed } from './distant-earth';
import { skyLightness } from './sky';
import { groundDaylight, type SunLight } from './sun';

/**
 * m — where the deck sits.
 *
 * 2.5 km is a fair cumulus base and, more to the point, it is inside the band
 * an ascent spends real time crossing: high enough that a landing never touches
 * it, low enough that every launch flies through it in the first half-minute.
 */
export const CLOUD_ALTITUDE = 2_500;

/**
 * How much faster the deck moves than the distant earth.
 *
 * THE WHOLE REASON THIS LAYER EXISTS. Depth is carried by the difference
 * between rates, not by any one of them, so this number is doing the work that
 * the fill colour and the puff shapes are not. It is still far below true
 * scale: at re-entry the compressed rate is about 620 px/s, so the deck moves
 * at roughly 1550 against a true-scale 26,280.
 */
export const CLOUD_PARALLAX = 2.5;

/**
 * How far the deck line may travel from the centre of the frame, upward.
 *
 * The deck is 2.5 km up, which on the pad is twelve viewport heights above the
 * camera — a true projection would put it far off the top and it would never be
 * seen at all. Standing on the ground you DO see cloud near the top of your
 * view, so the compression here is arguably closer to the truth than the
 * projection is: this world is flat and 2D, and the real sky is a dome.
 */
export const DECK_UP_FOLLOW = 0.4;
export const DECK_UP_SPAN = 0.06;

/**
 * And downward, once the vehicle is above the deck.
 *
 * Much smaller, because from above a cloud layer belongs ON the horizon rather
 * than somewhere in the middle of the frame. 0.04 puts it at 0.54 of the way
 * down the screen, just ABOVE M7.4's ground line at 0.55 — which is the one
 * ordering that must hold, since clouds under the ground would be a bug nobody
 * would need a test to notice.
 */
export const DECK_DOWN_FOLLOW = 0.02;
export const DECK_DOWN_SPAN = 0.02;

/** The shared shape of both halves: identity to `follow`, then asymptotic. */
function compress(distance: number, follow: number, span: number): number {
  if (distance <= follow) return distance;
  return follow + span * (1 - Math.exp(-(distance - follow) / span));
}

/**
 * Where the deck is drawn, as a fraction of viewport height from the top.
 *
 * THIS IS A COMPRESSION, in both directions and by different amounts — see the
 * two pairs of constants above for why the asymmetry is the honest choice
 * rather than a shortcut.
 *
 * Both halves are the identity while the deck is comfortably on screen and only
 * bend once it would leave, and both bends are C1 by the same construction the
 * rest of M7 uses: the derivative of `A(1 - e^(-x/A))` is exactly 1 at zero. So
 * flying THROUGH the deck — the moment this layer exists to sell — happens at
 * exactly true scale, with no compression at all.
 */
export function cloudLineFraction(altitude: number, physicalHeight: number): number {
  if (!Number.isFinite(altitude) || !Number.isFinite(physicalHeight) || physicalHeight <= 0) {
    return 0.5;
  }
  const distance = (CLOUD_ALTITUDE - altitude) / physicalHeight;
  const offset =
    distance >= 0
      ? compress(distance, DECK_UP_FOLLOW, DECK_UP_SPAN)
      : -compress(-distance, DECK_DOWN_FOLLOW, DECK_DOWN_SPAN);
  return 0.5 - offset;
}

/**
 * m — the altitude by which the deck has thinned to nothing worth drawing.
 *
 * Above the troposphere there is no weather. Drawing a cumulus deck from 60 km
 * would be the same category of mistake as the velocity streaks in vacuum that
 * M7.5 measured and removed — except here the layer really is scenery in the
 * world rather than a screen-space cue, so thinning it out IS the honest
 * behaviour rather than a betrayal of the cue.
 */
export const CLOUD_FADE_ALTITUDE = 45_000;

/**
 * m — the deck holds full strength up to here, and only then starts to thin.
 *
 * Added at the M9 look pass. The fade used to begin the moment the vehicle
 * cleared the deck, so by twenty kilometres the layer was at 28% and read as a
 * smear — and twenty kilometres is exactly where a climb has nothing else in
 * the middle of the frame. From up there a cloud layer is one of the most
 * PRESENT things in the view, not one of the faintest: it is what the ground
 * looks like from an aeroplane.
 *
 * Nine kilometres is a cruising altitude, which is the point — everything below
 * it is a view a passenger would recognise.
 */
export const CLOUD_HOLD_ALTITUDE = 9_000;

/**
 * How solid the deck is, 0 to 1.
 *
 * Thickest just below and at the deck, thinning above it — a layer seen from
 * far above is a texture on the earth rather than a thing in the sky, and M7.4
 * is already drawing the earth.
 */
export function cloudOpacity(altitude: number): number {
  if (!Number.isFinite(altitude)) return 0;
  if (altitude <= CLOUD_HOLD_ALTITUDE) return 1;
  if (altitude >= CLOUD_FADE_ALTITUDE) return 0;
  const t = (altitude - CLOUD_HOLD_ALTITUDE) / (CLOUD_FADE_ALTITUDE - CLOUD_HOLD_ALTITUDE);
  // Smoothstep down, so the deck neither vanishes at a threshold nor lingers
  // as a suspicious grey smear at 25 km.
  return 1 - t * t * (3 - 2 * t);
}

/**
 * How many puffs the deck carries, across BOTH sub-decks (M9.7).
 *
 * Eighteen before, all at one distance. Thirty-six now, half at each of two
 * parallax rates — see `CLOUD_DECK_DEPTH_RATIO` — so each sub-deck is as dense
 * as the whole deck used to be. Still one draw call: every puff is a sprite on
 * the same `wisp` frame of M9.5's atlas, so the whole layer batches.
 *
 * They remain DIRECT children of one container rather than being grouped into
 * two sub-containers, which is not an accident: `tests/view/clouds.test.ts`
 * asserts `container.children.length === CLOUD_PUFFS`, and that assertion is
 * about the allocation contract rather than about the scene graph's shape. It
 * still holds, unmodified.
 */
export const CLOUD_PUFFS = 60;

/**
 * How much slower the far sub-deck scrolls than the near one.
 *
 * THE SAME ARGUMENT AS `CLOUD_PARALLAX`, one level down. That constant exists
 * because a middle distance moving at the far layer's rate would not be a middle
 * distance; this one exists because a deck whose every puff moves at exactly one
 * rate is a cutout, however many puffs it has. Two rates 28% apart is enough for
 * an eye to read thickness and small enough that the two halves stay one deck
 * rather than becoming two.
 */
export const CLOUD_DECK_DEPTH_RATIO = 0.72;

/** How much smaller and dimmer the far half is drawn. */
export const FAR_DECK_SCALE = 0.85;
export const FAR_DECK_ALPHA = 0.62;

/**
 * How far the far half sits toward the horizon, as a fraction of the viewport.
 *
 * Signed by which side of the frame the deck line is on, because "toward the
 * horizon" changes direction when the vehicle climbs through the deck: from
 * below, more distant cloud appears LOWER; from above, HIGHER. A fixed offset
 * would be right on one side of 2.5 km and wrong on the other.
 */
export const FAR_DECK_HORIZON_DROP = 0.016;

/**
 * px — nominal spacing between puffs on screen.
 *
 * MUST BE SMALLER THAN A PUFF IS WIDE, and until the M9 look pass it was not.
 * Eighteen puffs per sub-deck at 190 px covered 3420 px, so about seven of them
 * were on a 1280 px screen at a time — seven separate blobs with sky between
 * them, which is not a deck, it is a row of lozenges. It is exactly what the
 * screenshots showed once the HUD was taken off them.
 *
 * A cloud layer is CONTINUOUS with a ragged edge, and the only way to get that
 * out of sprites is to overlap them enough that the individual sprite stops
 * being the unit the eye finds. Puffs are 120-420 px across, so 114 px of
 * spacing puts two to four of them over any given point. The span is unchanged
 * at 30 x 114 = 3420 px, which is what the scroll wraps against.
 */
export const PUFF_SPACING = 114;

/**
 * A counter-based pseudo-random, so the deck is the same deck every run.
 *
 * The same idea as `core/rng.ts` and for a related reason: not because the sky
 * has to be deterministic for physics, but because a layer that reshuffled on
 * every reload would make the committed screenshots irreproducible. Kept local
 * rather than importing core's, because `view/` reaching into `core/rng` for
 * decoration would blur a boundary worth keeping sharp.
 */
export function puffRandom(index: number, salt: number): number {
  let h = Math.imul(index + 1, 0x9e3779b9) ^ Math.imul(salt + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export interface CloudDeck {
  readonly container: Container;
  /** @param sun M11.4 — the hour's light on the deck. Without it, full daylight. */
  update(viewport: Viewport, altitude: number, speedX: number, dt: number, sun?: SunLight): void;
  /** For tests: the near sub-deck's scroll offset, in px. */
  readonly scrollOffset: number;
  /**
   * For tests: the far sub-deck's, which is the whole of M9.7's depth claim.
   *
   * Exposed rather than inferred from the sprites' positions, because both
   * offsets wrap at `PUFF_SPACING` and a test that measured displacement over
   * more than one wrap would be measuring the modulo.
   */
  readonly farScrollOffset: number;
}

/** How many of the puffs belong to the far sub-deck. The first half, so they draw behind. */
const FAR_COUNT = CLOUD_PUFFS / 2;

/**
 * Build the deck.
 *
 * @param texture the `wisp` frame of M9.5's particle atlas — feathered and
 *   elongated, which is what a cumulus edge is and what three hard-edged
 *   ellipses could never be. Optional, and defaults to `Texture.EMPTY`, so the
 *   headless tests that call `createCloudDeck()` with no arguments keep working
 *   exactly as they did: every assertion in `tests/view/clouds.test.ts` is about
 *   positions, scales and counts, none of which needs a GPU.
 */
export function createCloudDeck(texture: Texture = Texture.EMPTY): CloudDeck {
  const container = new Container({ label: 'cloudDeck' });

  /*
    Normalising the sprite scale by the texture's own width, so `width[i]` keeps
    meaning PIXELS ACROSS as it did when these were unit-sized `Graphics`. With
    `Texture.EMPTY` the width is zero, and a divisor of one leaves the numbers
    at exactly the magnitude the old tests were written against.
  */
  const norm = texture.width > 0 ? texture.width : 1;

  /** Per-puff shape, decided once from the seed and never again. */
  const jitterX = new Float32Array(CLOUD_PUFFS);
  const jitterY = new Float32Array(CLOUD_PUFFS);
  const width = new Float32Array(CLOUD_PUFFS);
  /** M9.7: per-puff aspect and opacity, so the deck is not one flat value. */
  const aspect = new Float32Array(CLOUD_PUFFS);
  const opacityOf = new Float32Array(CLOUD_PUFFS);
  const puffs: Sprite[] = [];

  for (let i = 0; i < CLOUD_PUFFS; i++) {
    // Indexed by position WITHIN its sub-deck, so the two halves are laid out
    // across the same span rather than the far one being a copy shifted along.
    const withinDeck = i < FAR_COUNT ? i : i - FAR_COUNT;
    jitterX[i] = (puffRandom(i, 1) - 0.5) * PUFF_SPACING * 0.7;
    /*
      And they are not all at one HEIGHT either. 26 px of jitter on a deck whose
      puffs are 190 px wide is no jitter at all — the row read as a ruled line
      with bumps on it. 96 px is comparable to a puff's own height, which is
      what makes the edge of the deck ragged rather than combed.
    */
    jitterY[i] = (puffRandom(i, 2) - 0.5) * 96;
    width[i] = 120 + puffRandom(i, 3) * 300;
    /*
      THE FLATNESS THIS TASK EXISTS TO FIX. Every puff used to be drawn at
      `opacity * 0.5` and at exactly 2:1, so the deck had one tone and one shape
      and read as a paper cutout. Both are now per-puff, from the same hash that
      already decides position and size — no new source of randomness, and the
      deck is still the same deck on every reload.
    */
    aspect[i] = 0.46 + puffRandom(i, 4) * 0.5;
    /*
      LOWER THAN BEFORE, BECAUSE THERE ARE NOW THREE TIMES AS MANY OVERLAPS.
      Alpha compounds: three puffs at 0.6 over one another come out at 0.94 and
      the deck burns to flat white, which is the exact failure M9.7 measured and
      fixed (`blownShare < 0.02` in tests/e2e/pixels.spec.ts). At 0.18-0.60 the
      same three land near 0.77 — solid enough to read as cloud, short of the
      white the assertion watches for.

      The FLOOR is not free to go lower: `tests/view/clouds.test.ts` requires
      every drawn alpha to clear 0.15, so that the deck stays one deck instead
      of becoming a scattering of unrelated blobs, and the far sub-deck is drawn
      at 0.62 of these numbers. 0.25 x 0.62 = 0.155 is the bottom of the range
      that assertion leaves, and it is where this sits.
    */
    opacityOf[i] = 0.25 + puffRandom(i, 5) * 0.35;

    const puff = new Sprite(texture);
    puff.anchor.set(0.5);
    container.addChild(puff);
    puffs.push(puff);
    void withinDeck;
  }

  let offset = 0;
  /** The far sub-deck scrolls at its own rate; that is what makes it far. */
  let farOffset = 0;

  return {
    container,
    get scrollOffset() {
      return offset;
    },
    get farScrollOffset() {
      return farOffset;
    },

    update(viewport, altitude, speedX, dt, sun) {
      const opacity = cloudOpacity(altitude);
      container.visible = opacity > 0.01;
      if (!container.visible) return;

      const lineY = cloudLineFraction(altitude, viewport.physicalHeight) * viewport.height;

      // M7.4's compression, multiplied by the parallax factor that makes this a
      // different distance rather than a copy of that layer.
      const scroll = compressedScrollSpeed(speedX * viewport.scale) * CLOUD_PARALLAX;
      offset -= scroll * dt;
      offset = ((offset % PUFF_SPACING) + PUFF_SPACING) % PUFF_SPACING;
      farOffset -= scroll * CLOUD_DECK_DEPTH_RATIO * dt;
      farOffset = ((farOffset % PUFF_SPACING) + PUFF_SPACING) % PUFF_SPACING;

      // Cloud is lit by the sky, so it darkens with it — the M6.7 rule that
      // stopped the ground and the sky coming apart on an ascent.
      // M11.4: and by the sun, through the same one scalar the ground uses —
      // OUTSIDE the floor, which was sized for the altitude fade: a night
      // factor inside it would leave the deck a mid-grey sheet over a dark
      // ground and sky.
      const lightness = skyLightness(altitude);
      const night = sun ? groundDaylight(sun) : 1;
      const shade = Math.round(255 * (0.55 + 0.45 * lightness) * night);
      const tint = (shade << 16) | (shade << 8) | Math.min(255, shade + 6);

      const spread = Math.max(0.55, viewport.width / 1280);
      // Toward the horizon, whichever side of the deck the vehicle is on.
      const towardHorizon = lineY < viewport.height * 0.5 ? 1 : -1;
      const farDrop = towardHorizon * FAR_DECK_HORIZON_DROP * viewport.height;

      for (let i = 0; i < puffs.length; i++) {
        const puff = puffs[i]!;
        const far = i < FAR_COUNT;
        const withinDeck = far ? i : i - FAR_COUNT;
        const deckOffset = far ? farOffset : offset;

        puff.x = -PUFF_SPACING + deckOffset + withinDeck * PUFF_SPACING + jitterX[i]!;
        puff.y = lineY + jitterY[i]! + (far ? farDrop : 0);

        const w = width[i]! * spread * (far ? FAR_DECK_SCALE : 1);
        puff.scale.set(w / norm, (w * aspect[i]!) / norm);
        puff.tint = tint;
        puff.alpha = opacity * opacityOf[i]! * (far ? FAR_DECK_ALPHA : 1);
      }
    },
  };
}
