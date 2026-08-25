/**
 * Art assets and their world dimensions.
 *
 * Ported from render/initGroundObjects.js. Sizes are in METRES, not pixels —
 * the 2021 file already worked that way, deriving each width from its height
 * and the source image's aspect ratio, which is why the ground objects stay
 * proportionate at any zoom.
 *
 * The images are the 2021 ones, copied into v2/public/assets. They are the
 * game's look and there is no reason to redraw them.
 */
import { Assets, type Texture } from 'pixi.js';
import { starBaseXPos } from '$core/constants';

export interface GroundObject {
  readonly id: string;
  readonly src: string;
  /** m */
  readonly height: number;
  /** m */
  readonly width: number;
  /** m — absolute world position. */
  readonly x: number;
  /**
   * Whether the object repositions to stay near the camera when it scrolls off
   * screen. The 2021 game does this for scenery so the world never looks empty.
   */
  readonly roams: boolean;
}

const BASE = 'assets/';

/**
 * initGroundObjects.js, verbatim, including `lunchpad` — the 2021 spelling.
 * M1.10 renamed identifiers in core/; these are filenames and stay as they are.
 */
export const GROUND_OBJECTS: readonly GroundObject[] = [
  {
    id: 'starBaseBackGround2',
    src: `${BASE}starBaseBackGround2.webp`,
    height: 75,
    width: (75 * 1000) / 750,
    x: starBaseXPos - 100,
    roams: false,
  },
  {
    id: 'starBaseBackGround',
    src: `${BASE}starBaseBackGround.webp`,
    height: 30,
    width: (30 * 859) / 200,
    x: starBaseXPos + 100,
    roams: false,
  },
  {
    id: 'sn15',
    src: `${BASE}sn15.webp`,
    height: (30 / 52) * 60,
    width: ((30 / 52) * 60 * 137) / 600,
    x: starBaseXPos - 100,
    roams: false,
  },
  {
    id: 'starhopper',
    src: `${BASE}starhopper.webp`,
    height: 18,
    width: (18 * 52) / 39,
    x: starBaseXPos - 200,
    roams: false,
  },
  {
    id: 'lunchpad_Light1',
    src: `${BASE}lunchpad_Light1.webp`,
    height: 2,
    width: 2 / 4.85,
    x: starBaseXPos - 30,
    roams: false,
  },
  {
    id: 'lunchpad_Light2',
    src: `${BASE}lunchpad_Light2.webp`,
    height: 9,
    width: 9 / 4.85,
    x: starBaseXPos + 30,
    roams: false,
  },
  {
    id: 'tree1',
    src: `${BASE}tree1.webp`,
    height: 10,
    width: (10 / 197) * 150,
    x: starBaseXPos + 90,
    roams: true,
  },
  {
    id: 'tree2',
    src: `${BASE}tree2.webp`,
    height: 7,
    width: (7 / 14) * 15,
    x: starBaseXPos - 40,
    roams: true,
  },
  {
    /**
     * The pig. CLAUDE.md: "The pig at x = 0."
     *
     * It spawns at absolute world x = 0 — half a planet from StarBase — and
     * roams, so it reappears at the edge of the screen wherever you fly. That
     * is the joke, and it is load-bearing.
     */
    id: 'pig',
    src: `${BASE}pig.webp`,
    height: 1,
    width: 1.19,
    x: 0,
    roams: true,
  },
];

export const STARSHIP_TEXTURE = `${BASE}Starship.webp`;

/** Every texture the world needs, loaded once. */
export async function loadTextures(): Promise<Map<string, Texture>> {
  const sources = [...GROUND_OBJECTS.map((o) => o.src), STARSHIP_TEXTURE];
  const loaded = await Assets.load(sources);
  const map = new Map<string, Texture>();
  for (const src of sources) map.set(src, loaded[src] as Texture);
  return map;
}
