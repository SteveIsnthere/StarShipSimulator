/**
 * Pooled particle system.
 *
 * THE WOUND THIS CLOSES. backend/utilities/switches.js built a fresh
 * `new PIXI.Container()` and a fresh emitter every time an engine shut down,
 * added it to the scene, and never removed either. Shut three engines down
 * across a flight and three containers leak; do it repeatedly, as the landing
 * autopilot does, and the scene graph grows without bound for the whole session.
 *
 * So: every particle this system will ever use is allocated once, at
 * construction. Emitting takes one from a free list; dying returns it. Nothing
 * is created, and nothing is destroyed, on the per-frame path — which is what
 * CLAUDE.md asks for and what tests/view/particles.test.ts verifies by counting.
 *
 * Particle state lives in parallel typed arrays rather than in objects. That is
 * not premature: at a few thousand live particles, an array-of-objects walks a
 * pointer per field per particle per frame, and the difference shows up in the
 * frame budget long before the visuals do.
 */
import { Container, Rectangle, Sprite, Texture, type Renderer } from 'pixi.js';
import { lerpColourFast } from './colour';

/** How a particle looks and moves over its life. */
export interface EmitterConfig {
  /** Particles emitted per second at full intensity. */
  readonly rate: number;
  /** Seconds a particle lives. */
  readonly life: number;
  /** Random variation in life, as a fraction. 0.3 means +-30%. */
  readonly lifeJitter: number;
  /** m/s, in the emitter's own frame. */
  readonly speed: number;
  readonly speedJitter: number;
  /** rad — half-angle of the emission cone. */
  readonly spread: number;
  /** m/s^2 applied to every particle, e.g. buoyancy for smoke. */
  readonly gravityY: number;
  /** Fraction of velocity shed per second. */
  readonly drag: number;
  /** m — drawn size at birth and at death. */
  readonly startSize: number;
  readonly endSize: number;
  /** 0xRRGGBB at birth and at death. */
  readonly startColor: number;
  readonly endColor: number;
  /** 0..1 at birth and at death. */
  readonly startAlpha: number;
  readonly endAlpha: number;
  /** Whether the particle brightens what is behind it. */
  readonly additive: boolean;
  /**
   * How many times longer than wide the particle is drawn, along its own
   * velocity. 1, the default, is the round blob everything before M7.5 used.
   *
   * Added for the velocity streaks, which are the one effect whose SHAPE is the
   * cue: a dot moving at 3 km/s and a dot moving at 30 look identical on a
   * screen with no motion blur, and a streak does not. Optional so the eight
   * effects that predate it are byte-identical — a stretch of 1 skips the
   * rotation and the anisotropic scale entirely.
   */
  readonly stretch?: number;
  /**
   * Which of the four generated textures this effect draws with (M9.5).
   *
   * Before M9.5 there was one — a 64 px white radial gradient — and all nine
   * effects used it, so the plume, the pad dust, the plasma wake, the shock cone
   * and the explosion were the same dot in different tints. A tint can change
   * what colour something is; it cannot change whether it has an edge.
   */
  readonly texture: ParticleTextureName;
}

/* ------------------------------------------------------------------------ *
 * The texture set (M9.5)
 * ------------------------------------------------------------------------ */

/**
 * The four shapes every effect in this file is built from.
 *
 *   core   a tight hot centre, for additive fire — plume, plasma, entry heat
 *   soft   the 64 px radial gradient that was the only texture until M9.5,
 *          reproduced ramp for ramp so anything tuned against it is unchanged
 *   smoke  low-frequency value noise with a ragged edge — dust, shutdown puffs,
 *          the explosion
 *   wisp   feathered and elongated — the fin vortices and the velocity streaks
 *
 * Four rather than nine: an effect's identity is mostly its colour ramp, its
 * life and its drag, and those are already per-effect. What one texture could
 * not express is the difference between something that GLOWS and something that
 * BILLOWS, which is a difference of edge and of internal structure.
 */
export const PARTICLE_TEXTURES = ['core', 'soft', 'smoke', 'wisp'] as const;
export type ParticleTextureName = (typeof PARTICLE_TEXTURES)[number];

/** The four, ready to draw with. All four share one GPU texture; see `createParticleTextures`. */
export type ParticleTextureSet = Readonly<Record<ParticleTextureName, Texture>>;

/**
 * A counter-based pseudo-random, so the noise is the same noise every run.
 *
 * The same construction as `clouds.ts`'s `puffRandom`, and kept local for the
 * same reason: `view/` reaching into `core/rng` for decoration would blur a
 * boundary worth keeping sharp. Two players must see the same sky and the same
 * smoke, and a committed screenshot must be reproducible.
 */
export function textureRandom(x: number, y: number, salt: number): number {
  let h = Math.imul(x + 1, 0x9e3779b9) ^ Math.imul(y + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35);
  h ^= Math.imul(salt + 1, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 13), 0x165667b1);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * Value noise on a coarse lattice, smoothly interpolated and tileable in angle.
 *
 * LOW FREQUENCY on purpose. A particle is between two and thirty metres across
 * on screen and lives under a second; high-frequency detail in it reads as
 * dither rather than as structure, and costs the same to generate.
 */
function valueNoise(u: number, v: number, lattice: number, salt: number): number {
  const x = u * lattice;
  const y = v * lattice;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);
  const wrap = (n: number) => ((n % lattice) + lattice) % lattice;
  const c00 = textureRandom(wrap(x0), wrap(y0), salt);
  const c10 = textureRandom(wrap(x0 + 1), wrap(y0), salt);
  const c01 = textureRandom(wrap(x0), wrap(y0 + 1), salt);
  const c11 = textureRandom(wrap(x0 + 1), wrap(y0 + 1), salt);
  const top = c00 + (c10 - c00) * fx;
  const bottom = c01 + (c11 - c01) * fx;
  return top + (bottom - top) * fy;
}

/**
 * Write one texture into an RGBA buffer, `cell` by `cell`.
 *
 * PURE, and deliberately separate from anything that touches a canvas: the
 * shapes are the part worth testing, and `tests/view/particle-textures.test.ts`
 * measures their radial profiles in Node with no GPU and no DOM. Every texture
 * is white; colour arrives as a per-particle tint, exactly as before.
 *
 * The outermost two pixels of every cell are forced transparent. All four live
 * in one atlas so they batch as a single draw call, and a bilinear sample at a
 * frame edge would otherwise pick up the neighbour.
 */
export function writeParticleTexture(
  name: ParticleTextureName,
  cell: number,
  out: Uint8ClampedArray,
): void {
  const half = cell / 2;
  const border = 2;

  for (let py = 0; py < cell; py++) {
    for (let px = 0; px < cell; px++) {
      // Centre of the pixel, in units of the cell radius: 0 at the middle, 1 at
      // the edge of the inscribed circle.
      const dx = (px + 0.5 - half) / half;
      const dy = (py + 0.5 - half) / half;
      let alpha: number;

      switch (name) {
        case 'soft': {
          /*
            The 2021 gradient, ramp for ramp: alpha 1 at the centre, 0.65 at 40%
            of the radius, 0 at the rim, linear between. Reproduced rather than
            redesigned so that everything tuned against it before M9.5 — the
            shock cone, and every size and alpha number in EFFECTS — still looks
            like what it was tuned to.
          */
          const t = Math.hypot(dx, dy);
          alpha = t >= 1 ? 0 : t < 0.4 ? 1 - 0.35 * (t / 0.4) : 0.65 * (1 - (t - 0.4) / 0.6);
          break;
        }
        case 'core': {
          /*
            Fire, drawn additively. A small saturated plateau and a fast cubic
            falloff, so overlapping particles build a bright centre and a thin
            halo rather than a uniform wash — which is what an additive blend
            does to a wide gradient, and why the plume read as a candle.
          */
          const t = Math.hypot(dx, dy);
          if (t >= 1) alpha = 0;
          else if (t < 0.14) alpha = 1;
          else {
            const f = 1 - (t - 0.14) / 0.86;
            alpha = f * f * f;
          }
          break;
        }
        case 'smoke': {
          /*
            Something that billows. Two octaves of value noise over a soft
            radial falloff, plus an angular ragged edge, so the silhouette is not
            a circle and the interior is not flat. Non-additive effects draw with
            this, so its structure survives rather than being summed away.
          */
          const t = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          // Ragged rim: the radius at which this direction fades out.
          const rim =
            0.82 + 0.18 * valueNoise((angle + Math.PI) / (Math.PI * 2), 0.5, 6, 0x51ed);
          if (t >= rim) {
            alpha = 0;
            break;
          }
          const body = 1 - smoothstep(Math.min(1, t / rim));
          const coarse = valueNoise((dx + 1) / 2, (dy + 1) / 2, 4, 0x5c00);
          const fine = valueNoise((dx + 1) / 2, (dy + 1) / 2, 9, 0x7a11);
          alpha = body * (0.42 + 0.44 * coarse + 0.24 * fine);
          break;
        }
        case 'wisp': {
          /*
            A torn streak: elongated along x, feathered at both ends, and
            slightly asymmetric so a field of them does not read as a row of
            identical lozenges. Drawn along the particle's own velocity by the
            `stretch` machinery, which multiplies this elongation rather than
            replacing it.
          */
          const ex = dx / 1.0;
          const ey = dy * 2.4;
          const t = Math.hypot(ex, ey);
          if (t >= 1) alpha = 0;
          else {
            const feather = (1 - t) * (1 - t);
            const grain = 0.75 + 0.5 * valueNoise((dx + 1) / 2, (dy + 1) / 2, 5, 0x1b7a);
            alpha = feather * grain;
          }
          break;
        }
      }

      // Transparent margin, so an atlas neighbour can never bleed in.
      if (px < border || py < border || px >= cell - border || py >= cell - border) alpha = 0;

      const i = (py * cell + px) * 4;
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = Math.max(0, Math.min(1, alpha)) * 255;
    }
  }
}

/**
 * The 2021 effects, reproduced as configurations.
 *
 * RevoltFX, which the original used, is a PixiJS v5 library and does not run on
 * v8. These are hand-tuned to match what its bundle produced rather than ported
 * mechanically — the numbers are a look, not a specification, and M3.5 refines
 * them once bloom and shimmer are in.
 */
export const EFFECTS = {
  /**
   * THE THROAT CORE (M9.6). Near-white, very fast, barely spread.
   *
   * The inner column of an exhaust: the part that is still supersonic and still
   * incandescent, and the part shock diamonds live in. Before M9.6 there was no
   * such thing — a single emitter at 95 m/s and 2.2/s of drag carried a particle
   * `(95/2.2)(1 - e^-0.704) = 21.9 m` before it died, on a 50 m vehicle, which
   * is why § 3.2 of the plan calls the result a candle. This one carries
   * `(300/0.85)(1 - e^-0.47) = 135 m`, and it is the emitter the `bands`
   * machinery modulates.
   */
  raptorPlumeCore: {
    rate: 300,
    life: 0.55,
    lifeJitter: 0.22,
    speed: 300,
    speedJitter: 0.14,
    spread: 0.035,
    gravityY: 0,
    drag: 0.85,
    startSize: 1.5,
    endSize: 4.2,
    startColor: 0xffffff,
    endColor: 0xffc46a,
    startAlpha: 0.85,
    endAlpha: 0,
    additive: true,
    texture: 'core',
  },
  /**
   * THE BELL. Translucent, wide, and short next to the core it wraps.
   *
   * This is 2021's `raptorPlume` in its new job. The numbers are retuned rather
   * than kept — a wider cone, a lower alpha, a bigger end size — because it is
   * no longer trying to be the whole plume on its own. The name is unchanged so
   * that every test written against it still means what it meant.
   */
  raptorPlume: {
    rate: 240,
    life: 0.42,
    lifeJitter: 0.35,
    speed: 110,
    speedJitter: 0.32,
    spread: 0.2,
    gravityY: 0,
    drag: 1.9,
    startSize: 3.4,
    endSize: 13,
    startColor: 0xfff0c0,
    endColor: 0xff5a1e,
    startAlpha: 0.5,
    endAlpha: 0,
    additive: true,
    // The bell is the translucent part, so it wants the wide gradient rather
    // than the tight core: what reads as a bell is the soft edge.
    texture: 'soft',
  },
  /** The puff when an engine cuts. This is the one that used to leak. */
  raptorShutdown: {
    rate: 400,
    life: 0.75,
    lifeJitter: 0.4,
    speed: 34,
    speedJitter: 0.6,
    spread: 0.7,
    gravityY: 2,
    drag: 3.2,
    startSize: 2,
    endSize: 14,
    startColor: 0xffd9a0,
    endColor: 0x6a6a72,
    startAlpha: 0.7,
    endAlpha: 0,
    additive: false,
    // It starts as flame and ends as soot, and the soot is what you see: a
    // shutdown puff billows.
    texture: 'smoke',
  },
  /**
   * The plasma trail, M6.7.
   *
   * Distinct from `aeroHeat`, which is the glow AT the nose: this is the
   * ionised wake streaming behind it, and the difference is entirely in the
   * numbers. Long life and low drag so a particle travels far enough to read as
   * a streak; a slow start size so the trail is thin where it leaves the
   * vehicle and blooms behind. The colours run white-hot through orange to a
   * dull red, which is the sequence a real entry shows and the reason it is
   * legible as heat rather than as smoke.
   */
  plasmaTrail: {
    rate: 260,
    life: 1.6,
    lifeJitter: 0.4,
    speed: 130,
    speedJitter: 0.35,
    spread: 0.22,
    gravityY: 0,
    drag: 0.6,
    startSize: 1.6,
    endSize: 22,
    startColor: 0xfff4d6,
    endColor: 0xb32a08,
    startAlpha: 0.55,
    endAlpha: 0,
    additive: true,
    // Ionised gas glowing, not smoke: the same additive argument as the plume.
    texture: 'core',
  },
  /**
   * M7.5 — velocity streaks: the world blowing past, in screen space.
   *
   * The one effect that is not a thing in the world. It is emitted AHEAD of the
   * vehicle and swept backwards along the velocity vector, so it reads as the
   * frame moving rather than as the ship shedding something. Long life and no
   * drag, because a streak that decelerated would be a streak of something the
   * air was catching — and there is nothing there.
   *
   * `stretch` is what makes it a streak rather than a dot: a dot at 3 km/s and
   * a dot at 30 look identical on a screen with no motion blur.
   */
  velocityStreak: {
    rate: 150,
    life: 0.5,
    lifeJitter: 0.35,
    speed: 900,
    speedJitter: 0.3,
    spread: 0.05,
    gravityY: 0,
    drag: 0,
    startSize: 3,
    endSize: 2,
    startColor: 0xffffff,
    endColor: 0xdce8f5,
    startAlpha: 0.30,
    endAlpha: 0,
    additive: true,
    stretch: 9,
    // The one effect whose shape IS the cue. `stretch` elongates the sprite;
    // the wisp's feathered ends are what stop that reading as a stretched dot.
    texture: 'wisp',
  },
  /** Shed vorticity off the fins under dynamic pressure. */
  aeroTrail: {
    rate: 90,
    life: 0.9,
    lifeJitter: 0.3,
    speed: 12,
    speedJitter: 0.5,
    spread: 0.5,
    gravityY: 0,
    drag: 1.4,
    startSize: 1.2,
    endSize: 9,
    startColor: 0xffffff,
    endColor: 0xcfd8e4,
    startAlpha: 0.35,
    endAlpha: 0,
    additive: false,
    // Shed vorticity is a torn filament, not a ball of anything.
    texture: 'wisp',
  },
  /** Dust kicked off the pad. */
  groundSmoke: {
    rate: 300,
    life: 1.8,
    lifeJitter: 0.45,
    speed: 46,
    speedJitter: 0.7,
    spread: 1.25,
    gravityY: 3.5,
    drag: 1.9,
    startSize: 4,
    endSize: 30,
    startColor: 0xd9cbb2,
    endColor: 0x8d8577,
    startAlpha: 0.55,
    endAlpha: 0,
    additive: false,
    // Dust. The effect the ragged edge was designed for.
    texture: 'smoke',
  },
  /** The transonic cone. */
  sonicBoom: {
    rate: 60,
    life: 0.45,
    lifeJitter: 0.2,
    speed: 26,
    speedJitter: 0.25,
    spread: 1.5,
    gravityY: 0,
    drag: 2.6,
    startSize: 6,
    endSize: 22,
    startColor: 0xffffff,
    endColor: 0xdbe6f2,
    startAlpha: 0.3,
    endAlpha: 0,
    additive: false,
    // Condensation, which genuinely is a smooth blob. Kept on the 2021 gradient
    // so the one effect that was right stays exactly as it was.
    texture: 'soft',
  },
  /** Re-entry plasma. Intensity scales with thermal load. */
  aeroHeat: {
    rate: 260,
    life: 0.55,
    lifeJitter: 0.4,
    speed: 55,
    speedJitter: 0.4,
    spread: 0.85,
    gravityY: 0,
    drag: 2.0,
    startSize: 3,
    endSize: 13,
    startColor: 0xfff4d2,
    endColor: 0xff3c14,
    startAlpha: 0.8,
    endAlpha: 0,
    additive: true,
    // The glow at the nose. Fire.
    texture: 'core',
  },
  /** Crash and in-flight breakup. */
  explosion: {
    rate: 2600,
    life: 1.5,
    lifeJitter: 0.55,
    speed: 130,
    speedJitter: 0.8,
    spread: Math.PI,
    gravityY: -9,
    drag: 1.1,
    startSize: 5,
    endSize: 30,
    startColor: 0xfff2c4,
    endColor: 0x53504e,
    startAlpha: 1,
    endAlpha: 0,
    additive: false,
    // Six hundred particles of debris and soot. Anything smooth at that count
    // reads as a spray of dots.
    texture: 'smoke',
  },
} as const satisfies Record<string, EmitterConfig>;

export type EffectName = keyof typeof EFFECTS;

/** Where each texture sits in the atlas, as a 2x2 grid of cells. */
const ATLAS_LAYOUT: Readonly<Record<ParticleTextureName, readonly [number, number]>> = {
  core: [0, 0],
  soft: [1, 0],
  smoke: [0, 1],
  wisp: [1, 1],
};

/**
 * The four particle textures, generated once rather than shipped.
 *
 * ONE GPU TEXTURE, FOUR FRAMES, and that is the whole reason this is an atlas
 * rather than four canvases. Pixi batches sprites by their texture SOURCE; four
 * separate sources with particles interleaved in one container would break the
 * batch on nearly every sprite and turn a single draw call into hundreds. Four
 * frames of one source batch exactly as the single texture did before M9.5.
 *
 * Generated, so the asset budget does not move by a byte and nothing new is
 * fetched. Deterministic, because the noise comes from `textureRandom` — two
 * players see the same smoke, and a committed screenshot is reproducible.
 */
export function createParticleTextures(renderer: Renderer, cell = 64): ParticleTextureSet {
  const canvas = document.createElement('canvas');
  canvas.width = cell * 2;
  canvas.height = cell * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable for particle textures');

  const buffer = new Uint8ClampedArray(cell * cell * 4);
  const image = ctx.createImageData(cell, cell);
  for (const name of PARTICLE_TEXTURES) {
    writeParticleTexture(name, cell, buffer);
    image.data.set(buffer);
    const [col, row] = ATLAS_LAYOUT[name];
    ctx.putImageData(image, col * cell, row * cell);
  }

  const atlas = Texture.from(canvas);
  const source = atlas.source;
  source.scaleMode = 'linear';

  const built = {} as Record<ParticleTextureName, Texture>;
  for (const name of PARTICLE_TEXTURES) {
    const [col, row] = ATLAS_LAYOUT[name];
    built[name] = new Texture({
      source,
      frame: new Rectangle(col * cell, row * cell, cell, cell),
      label: `particle-${name}`,
    });
  }

  void renderer;
  return built;
}

/** Deterministic jitter, so an effect looks the same in a replayed golden. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

export interface ParticleSystem {
  readonly container: Container;
  /** Capacity, fixed at construction. */
  readonly capacity: number;
  /** Currently alive. */
  readonly alive: number;
  /**
   * Emit from a world point.
   *
   * @param intensity 0..1 — scales rate. 0 emits nothing.
   * @param angle rad — direction of the cone, screen space, 0 = right
   * @param dt seconds, used to convert rate into a whole number of particles
   */
  emit(
    effect: EffectName,
    x: number,
    y: number,
    angle: number,
    intensity: number,
    dt: number,
    scale: number,
    /**
     * Multiplier on the emitter's cone half-angle. Defaults to 1.
     *
     * Added in M6.7 for the plume, which is the one effect whose SHAPE is a
     * function of the world rather than a constant: exhaust expands until its
     * pressure matches the air, so the same engine draws a pencil at sea level
     * and a bell in vacuum. A second emitter config would have meant two
     * plumes to keep in step; a number is a number.
     */
    spreadFactor?: number,
    /**
     * Shock diamonds, as a periodic brightness along the flow (M9.6).
     *
     * NOT A FOURTH EFFECT, and that is the design rather than an economy. A
     * shock train is not made of particles: it is the same gas being alternately
     * compressed and expanded as it crosses standing shocks, so what an eye sees
     * is one column of exhaust that is brighter in some places than others. A
     * separate emitter would draw beads NEXT TO the plume rather than bands
     * WITHIN it, and would drift out of step with it the moment the two had
     * different drag.
     *
     * `spacing` is in screen pixels — the caller multiplies the metres
     * `atmosphere-look.ts` returns by the viewport scale. `strength` is 0..1 and
     * 0 switches the whole thing off, including the per-frame distance
     * calculation.
     */
    bandSpacing?: number,
    bandStrength?: number,
  ): void;
  /** One-shot burst, for shutdowns and explosions. */
  burst(effect: EffectName, x: number, y: number, count: number, scale: number): void;
  /** Advance every live particle. */
  update(dt: number): void;
  /** Kill everything without deallocating. */
  clear(): void;
  destroy(): void;
}

/**
 * Build the pool.
 *
 * @param texture the four-texture set, or a single Texture for every effect.
 *   The single form is what the headless tests pass (`Texture.EMPTY`, which
 *   needs no GPU) and what any caller that does not care about shape can pass;
 *   it keeps every assertion written against the pool before M9.5 valid
 *   unchanged, which is what the pooled-allocation contract is worth.
 */
export function createParticleSystem(
  texture: Texture | ParticleTextureSet,
  capacity = 4000,
  seed = 0x9e3779b9,
): ParticleSystem {
  const container = new Container({ label: 'particles' });

  /*
    Resolved once, at construction. A per-spawn branch on which form was passed
    would be a branch on the hot path for a question that cannot change.
  */
  const single = texture instanceof Texture ? texture : undefined;
  const textures: ParticleTextureSet =
    single !== undefined
      ? { core: single, soft: single, smoke: single, wisp: single }
      : (texture as ParticleTextureSet);

  // Every sprite that will ever exist, created now.
  const sprites: Sprite[] = new Array(capacity);
  const x = new Float32Array(capacity);
  const y = new Float32Array(capacity);
  const vx = new Float32Array(capacity);
  const vy = new Float32Array(capacity);
  const age = new Float32Array(capacity);
  const life = new Float32Array(capacity);
  const size0 = new Float32Array(capacity);
  const size1 = new Float32Array(capacity);
  const alpha0 = new Float32Array(capacity);
  const alpha1 = new Float32Array(capacity);
  const dragOf = new Float32Array(capacity);
  const gravityOf = new Float32Array(capacity);
  const colorStart = new Uint32Array(capacity);
  const colorEnd = new Uint32Array(capacity);
  /**
   * Where each particle was born, and how it bands (M9.6).
   *
   * Spawn position is stored because the shock diamonds have to be STATIONARY in
   * the world while the gas moves through them — so the brightness has to be a
   * function of how far a particle has TRAVELLED, not of how old it is. Four
   * more Float32Arrays at 4000 capacity is 64 kB, allocated once with everything
   * else; `bandOf` is 0 for every particle of every other effect, and the update
   * loop skips the whole calculation on that test.
   */
  const spawnX = new Float32Array(capacity);
  const spawnY = new Float32Array(capacity);
  const bandOf = new Float32Array(capacity);
  const bandStrengthOf = new Float32Array(capacity);
  /** 1 for everything that is not a streak. See EmitterConfig.stretch. */
  const stretchOf = new Float32Array(capacity);

  /** Indices of dead particles, used as a stack. */
  const free = new Int32Array(capacity);
  let freeCount = capacity;
  /** Indices of live particles, compacted on death. */
  const live = new Int32Array(capacity);
  let liveCount = 0;

  for (let i = 0; i < capacity; i++) {
    const sprite = new Sprite(textures.soft);
    sprite.anchor.set(0.5);
    sprite.visible = false;
    container.addChild(sprite);
    sprites[i] = sprite;
    free[i] = capacity - 1 - i;
  }

  const random = makeRandom(seed);
  /** Carried fractional particles, so a low rate still emits smoothly. */
  const debt = new Map<EffectName, number>();

  const spawn = (
    config: EmitterConfig,
    px: number,
    py: number,
    angle: number,
    scale: number,
    spreadFactor = 1,
    bandSpacing = 0,
    bandStrength = 0,
  ): void => {
    if (freeCount === 0) return;
    const i = free[--freeCount]!;

    const direction = angle + (random() * 2 - 1) * config.spread * spreadFactor;
    const speed = config.speed * scale * (1 + (random() * 2 - 1) * config.speedJitter);

    x[i] = px;
    y[i] = py;
    vx[i] = Math.cos(direction) * speed;
    vy[i] = Math.sin(direction) * speed;
    age[i] = 0;
    life[i] = config.life * (1 + (random() * 2 - 1) * config.lifeJitter);
    size0[i] = config.startSize * scale;
    size1[i] = config.endSize * scale;
    alpha0[i] = config.startAlpha;
    alpha1[i] = config.endAlpha;
    dragOf[i] = config.drag;
    gravityOf[i] = config.gravityY * scale;
    colorStart[i] = config.startColor;
    colorEnd[i] = config.endColor;
    stretchOf[i] = config.stretch ?? 1;
    spawnX[i] = px;
    spawnY[i] = py;
    bandOf[i] = bandStrength > 0 ? bandSpacing : 0;
    bandStrengthOf[i] = bandStrength;

    const sprite = sprites[i]!;
    sprite.visible = true;
    sprite.blendMode = config.additive ? 'add' : 'normal';
    /*
      Sprites are recycled across effects, so the texture is set per spawn like
      the blend mode. It costs nothing to batch: all four frames share one
      source (see `createParticleTextures`), so a plume particle and a dust
      particle still draw in the same batch.
    */
    sprite.texture = textures[config.texture];
    // Reset, because sprites are recycled: a streak that died rotated would
    // hand its angle to whatever plume particle claimed the slot next.
    if (stretchOf[i] === 1) sprite.rotation = 0;

    live[liveCount++] = i;
  };


  return {
    container,
    capacity,
    get alive() {
      return liveCount;
    },

    emit(effect, px, py, angle, intensity, dt, scale, spreadFactor = 1, bandSpacing = 0, bandStrength = 0) {
      if (intensity <= 0 || dt <= 0) return;
      const config = EFFECTS[effect];
      const wanted = config.rate * intensity * dt + (debt.get(effect) ?? 0);
      const whole = Math.floor(wanted);
      debt.set(effect, wanted - whole);
      for (let n = 0; n < whole; n++) {
        spawn(config, px, py, angle, scale, spreadFactor, bandSpacing, bandStrength);
      }
    },

    burst(effect, px, py, count, scale) {
      const config = EFFECTS[effect];
      for (let n = 0; n < count; n++) {
        spawn(config, px, py, random() * Math.PI * 2, scale);
      }
    },

    update(dt) {
      let write = 0;
      for (let n = 0; n < liveCount; n++) {
        const i = live[n]!;
        age[i]! += dt;
        const t = age[i]! / life[i]!;

        if (t >= 1) {
          sprites[i]!.visible = false;
          free[freeCount++] = i;
          continue;
        }

        const shed = 1 - dragOf[i]! * dt;
        vx[i]! *= shed;
        vy[i]! = vy[i]! * shed - gravityOf[i]! * dt;
        x[i]! += vx[i]! * dt;
        y[i]! += vy[i]! * dt;

        const sprite = sprites[i]!;
        const size = size0[i]! + (size1[i]! - size0[i]!) * t;
        sprite.x = x[i]!;
        sprite.y = y[i]!;
        const stretch = stretchOf[i]!;
        if (stretch === 1) {
          sprite.width = size;
          sprite.height = size;
        } else {
          // Long along its own velocity, thin across it. The rotation is the
          // particle's direction of travel, so a streak always points where it
          // is going rather than where it was emitted.
          sprite.width = size * stretch;
          sprite.height = size;
          sprite.rotation = Math.atan2(vy[i]!, vx[i]!);
        }
        let alpha = alpha0[i]! + (alpha1[i]! - alpha0[i]!) * t;
        /*
          The shock train (M9.6). A cosine of the distance TRAVELLED, so the
          bright bands stand still in the world while the gas streams through
          them — which is what a standing shock is. Every particle of every other
          effect has `bandOf` at 0 and pays one comparison.
        */
        const spacing = bandOf[i]!;
        if (spacing > 0) {
          const dx = x[i]! - spawnX[i]!;
          const dy = y[i]! - spawnY[i]!;
          const travelled = Math.sqrt(dx * dx + dy * dy);
          alpha *= 1 + bandStrengthOf[i]! * Math.cos((travelled / spacing) * Math.PI * 2);
        }
        sprite.alpha = alpha;
        sprite.tint = lerpColourFast(colorStart[i]!, colorEnd[i]!, t);

        live[write++] = i;
      }
      liveCount = write;
    },

    clear() {
      for (let n = 0; n < liveCount; n++) {
        const i = live[n]!;
        sprites[i]!.visible = false;
        free[freeCount++] = i;
      }
      liveCount = 0;
      debt.clear();
    },

    destroy() {
      container.destroy({ children: true });
    },
  };
}
