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
import { Container, Sprite, Texture, type Renderer } from 'pixi.js';

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
  /** The Raptor plume. Fast, hot, tight. */
  raptorPlume: {
    rate: 220,
    life: 0.32,
    lifeJitter: 0.35,
    speed: 95,
    speedJitter: 0.3,
    spread: 0.13,
    gravityY: 0,
    drag: 2.2,
    startSize: 2.6,
    endSize: 8,
    startColor: 0xfff0c0,
    endColor: 0xff5a1e,
    startAlpha: 0.95,
    endAlpha: 0,
    additive: true,
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
  },
} as const satisfies Record<string, EmitterConfig>;

export type EffectName = keyof typeof EFFECTS;

/**
 * A soft radial dot, generated once rather than shipped.
 *
 * Keeps the asset budget where it belongs and stays crisp at any resolution.
 * Sixteen concentric rings is enough that the falloff reads as smooth.
 */
export function createParticleTexture(renderer: Renderer, size = 64): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable for particle texture');

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.65)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  void renderer;
  return Texture.from(canvas);
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
  ): void;
  /** One-shot burst, for shutdowns and explosions. */
  burst(effect: EffectName, x: number, y: number, count: number, scale: number): void;
  /** Advance every live particle. */
  update(dt: number): void;
  /** Kill everything without deallocating. */
  clear(): void;
  destroy(): void;
}

export function createParticleSystem(
  texture: Texture,
  capacity = 4000,
  seed = 0x9e3779b9,
): ParticleSystem {
  const container = new Container({ label: 'particles' });

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
  /** 1 for everything that is not a streak. See EmitterConfig.stretch. */
  const stretchOf = new Float32Array(capacity);

  /** Indices of dead particles, used as a stack. */
  const free = new Int32Array(capacity);
  let freeCount = capacity;
  /** Indices of live particles, compacted on death. */
  const live = new Int32Array(capacity);
  let liveCount = 0;

  for (let i = 0; i < capacity; i++) {
    const sprite = new Sprite(texture);
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

    const sprite = sprites[i]!;
    sprite.visible = true;
    sprite.blendMode = config.additive ? 'add' : 'normal';
    // Reset, because sprites are recycled: a streak that died rotated would
    // hand its angle to whatever plume particle claimed the slot next.
    if (stretchOf[i] === 1) sprite.rotation = 0;

    live[liveCount++] = i;
  };

  const lerpColor = (a: number, b: number, t: number): number => {
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    return (
      (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0)
    );
  };

  return {
    container,
    capacity,
    get alive() {
      return liveCount;
    },

    emit(effect, px, py, angle, intensity, dt, scale, spreadFactor = 1) {
      if (intensity <= 0 || dt <= 0) return;
      const config = EFFECTS[effect];
      const wanted = config.rate * intensity * dt + (debt.get(effect) ?? 0);
      const whole = Math.floor(wanted);
      debt.set(effect, wanted - whole);
      for (let n = 0; n < whole; n++) spawn(config, px, py, angle, scale, spreadFactor);
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
        sprite.alpha = alpha0[i]! + (alpha1[i]! - alpha0[i]!) * t;
        sprite.tint = lerpColor(colorStart[i]!, colorEnd[i]!, t);

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
