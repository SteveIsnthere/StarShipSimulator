/**
 * M9.1: measuring the picture, rather than looking at it.
 *
 * WHY THIS EXISTS, stated plainly because the reason is a mistake rather than a
 * design. Three of M9's findings — a camera that has never framed a re-entry, a
 * shake constant a thousand times too large, a fin trail that saturates at 4% of
 * the structural limit — shipped through three milestones of screenshot review.
 * They were all VISIBLE. Nobody saw them, because a screenshot of a rocket
 * against a sky looks like a rocket against a sky whether or not the rocket is
 * in it. Worse: during the investigation that opened this milestone, a
 * hand-written model of the camera was built to explain the missing vehicle, and
 * it disagreed with the browser twice before the browser turned out to be right
 * both times.
 *
 * So the milestone starts by building the instrument. Every later task states
 * its claim as a number this file can produce.
 *
 * WHAT THIS IS NOT: a golden-image differ. Pixel comparison across five
 * Playwright projects, two device scale factors and a SwiftShader rasteriser is
 * a maintenance tax paid in false failures, and this project retired visual
 * parity at M6 for exactly that reason. Nothing here compares one picture with
 * another picture. It measures STRUCTURE — how much of a region is lit, how far
 * a bright thing extends, how many distinct tones a band contains — and those
 * are claims that survive a renderer changing its mind about antialiasing.
 *
 * WHAT IT CAN PROVE
 *   - a region is lit / is dark / is not one flat colour
 *   - a bright thing extends N pixels, which is N/vehicleHeightPx ship-lengths
 *   - two things are separated in colour (smoke reads grey, fire reads warm)
 *   - the picture changed between two moments
 *
 * WHAT IT CANNOT PROVE
 *   - that any of it LOOKS GOOD. That is a viewing decision and stays the
 *     owner's. A test that claimed otherwise would be lying.
 *   - anything about a specific pixel. Every measurement here is a population
 *     statistic over a region, deliberately, because a single pixel is the one
 *     thing a different rasteriser is entitled to disagree about.
 *   - anything at a non-default zoom: `metrePixels` reconstructs the scale from
 *     `computeViewport`, which needs the manual zoom factor, and the page does
 *     not publish it. Do not press the zoom buttons before measuring.
 *
 * THE OVERLAY IS HIDDEN BEFORE THE SHUTTER, and that is not a detail. Playwright's
 * element screenshot crops the composited PAGE to the element's box, so a shot of
 * the world canvas contains every HUD panel sitting on top of it. The first run
 * of this harness reported the bottom fifth of every frame as near-black at a
 * mean luma of 23 and concluded the ground was unlit; it was measuring the
 * broadcast scrim. So `readFrame` walks from the canvas to the body hiding every
 * sibling on the way up, shoots, and puts them back — `visibility: hidden`, not
 * `display: none`, so nothing reflows and the canvas is never resized out from
 * under the frame being measured.
 *
 * HOW THE PIXELS GET HERE. There is no PNG decoder in this environment — no
 * pngjs, no sharp, no PIL — and adding one to devDependencies to read four
 * numbers out of an image would be a poor trade. So the image never leaves the
 * browser as pixels: Playwright screenshots the canvas, the bytes go back IN as
 * a data URL, and `createImageBitmap` + `OffscreenCanvas` + `getImageData` do
 * the decoding in the page that produced them. One round trip, one evaluate,
 * and the numbers come back as JSON.
 */
import type { Page } from '@playwright/test';
import { computeViewport } from '../../src/view/camera';
import { vehicleHeight } from '../../src/core/constants';
import { byTestId, readoutUnitTestId, readoutValueTestId } from '../../src/ui/testids';

/** A rectangle of the frame, in fractions of the image. `{x:0,y:0,width:1,height:1}` is all of it. */
export interface Region {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const FULL: Region = { x: 0, y: 0, width: 1, height: 1 };

/** The middle of the frame, where the subject is meant to be. */
export const CENTRE: Region = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };

/** The bottom fifth — the ground band, when there is ground in shot. */
export const LOWER: Region = { x: 0, y: 0.8, width: 1, height: 0.2 };

/** What a region is made of. Every field is a population statistic. */
export interface RegionStats {
  /** How many pixels went into these numbers. */
  readonly pixels: number;
  /** 0..255, Rec. 601 luma. */
  readonly meanLuma: number;
  /**
   * Population standard deviation of luma.
   *
   * THE FLATNESS NUMBER. A single untextured fill has a spread near zero
   * whatever colour it is, which is precisely the complaint M9.7 and M9.8 exist
   * to answer, and it is a complaint no screenshot ever made out loud.
   */
  readonly lumaSpread: number;
  /**
   * How many of the sixteen luma buckets hold at least 1% of the region.
   *
   * A coarser companion to `lumaSpread` and worth having separately: a band
   * that is half black and half white has a huge spread and two tones, which is
   * not the same picture as one with a gradient across it.
   */
  readonly toneBuckets: number;
  /** Fraction of pixels with luma above 160 — "lit". */
  readonly brightFraction: number;
  /** Fraction with luma below 64 — "dark". */
  readonly darkFraction: number;
  /**
   * Fraction that read as FIRE: red-dominant and saturated.
   *
   * The separation M9.5 has to produce. Today the plume and the ground smoke
   * draw the same white dot under different tints, so a histogram of an ascent
   * shows one population; the point of four textures is that it should show two.
   */
  readonly warmFraction: number;
  /** Fraction that read as SMOKE: near-neutral, mid luma. */
  readonly greyFraction: number;
  /** The five most populated 4-bit-per-channel colour bins, most first. */
  readonly topColours: readonly { readonly rgb: string; readonly fraction: number }[];
}

/** Ask for the bounding box of everything bright — or dark — in a region. */
export interface ExtentQuery {
  /** Where to look. Defaults to the whole frame. */
  readonly region?: Region;
  /** Luma at or above which a pixel counts. */
  readonly minLuma: number;
  /**
   * Luma at or below which a pixel counts. Optional.
   *
   * With both bounds a query selects a BAND, which is how you find a dark
   * object against a light sky: the vehicle is the only thing in the middle of
   * a clear frame that is neither sky nor cloud. Added at M9.3, where the
   * question was whether the whole picture MOVES, and the only way to answer it
   * is to watch something identifiable hold still or not.
   */
  readonly maxLuma?: number;
  /** When true, only red-dominant saturated pixels count — fire, not cloud. */
  readonly warmOnly?: boolean;
  /**
   * How far red must lead blue for `warmOnly` to accept a pixel. Default 40.
   *
   * RAISED WHERE FIRE HAS TO BE TOLD FROM GROUND. The default separates a plume
   * from a blue sky, which is all it ever had to do — until the M9 look pass
   * warmed `GROUND_COLOR` from a grey-tan to something with chroma in it, at
   * which point the ground itself passed the test at a margin of 62 and every
   * plume measurement started reporting the terrain. A margin of 80 keeps the
   * ground out and lets the plume through, and it is a parameter rather than a
   * new default because "warm" means something different against a blue sky
   * than it does against a brown one.
   */
  readonly minWarmth?: number;
  /**
   * A warmth that admits a pixel EVEN IF it is below `minLuma`. OR, not AND.
   *
   * The one place the harness needs a disjunction, and it needs it because fire
   * is two different things. The throat is nearly white — no chroma at all, and
   * only its BRIGHTNESS tells it from anything else. The halo around a vacuum
   * plume is the opposite: spread over 5.3x the area it is dim, and only its
   * COLOUR tells it from the dark sky it sits on. One threshold cannot hold
   * both, and the M9 look pass proved it by trying: raising `minLuma` to 150 to
   * keep the newly-warm ground out of the low-altitude measurement also cut the
   * vacuum halo down from 0.56 ship-lengths across to something that no longer
   * beat the low-altitude figure, and the spread assertion — the whole point of
   * `plumeSpreadFactor` — failed on two projects.
   *
   * `minLuma: 150, orWarmth: 100` reads as "bright, or unmistakably on fire".
   * The ground is neither: its brightest is luma 147 and red leads blue by at
   * most 62 there, so it fails both clauses. The halo passes the second at an
   * emitted alpha of about 0.48, which is MORE of the plume than the luma floor
   * of 90 this replaced ever admitted.
   */
  readonly orWarmth?: number;
  /** When true, red-dominant pixels are EXCLUDED — a neutral vehicle, not terrain. */
  readonly excludeWarm?: boolean;
}

/** Where the bright thing is, in IMAGE pixels. */
export interface Extent {
  /** False when nothing in the region passed. Every other field is 0. */
  readonly found: boolean;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly widthPx: number;
  readonly heightPx: number;
  /** Longest side. What "extent" means for a plume that can point any way. */
  readonly spanPx: number;
  /** How many pixels passed. */
  readonly count: number;
}

export interface FrameSpec {
  /** Named regions to summarise. */
  readonly regions?: Readonly<Record<string, Region>>;
  /** Named extent queries. */
  readonly extents?: Readonly<Record<string, ExtentQuery>>;
  /**
   * Also return a coarse luminance map, `rows` lines of `cols` characters.
   *
   * FOR A HUMAN READING A FAILURE, and for nothing else — no assertion in this
   * repository should ever be written against these characters. Max-pooled, so a
   * small bright thing survives the downsample; a mean would lose a vehicle.
   * When an occupancy assertion goes red at three in the morning, the difference
   * between "the plume is dim" and "the ship is not in the frame" is visible in
   * twenty lines of text and invisible in a number.
   */
  readonly map?: { readonly cols: number; readonly rows: number };
}

export interface FrameReport {
  readonly imageWidth: number;
  readonly imageHeight: number;
  /** Image pixels per CSS pixel — the device scale factor, measured not assumed. */
  readonly imageScale: number;
  readonly regions: Readonly<Record<string, RegionStats>>;
  readonly extents: Readonly<Record<string, Extent>>;
  /** Present only when `spec.map` asked for it. See the note there. */
  readonly map?: readonly string[];
}

/**
 * Screenshot the world canvas and measure it.
 *
 * One screenshot, one `page.evaluate`. Both halves matter: a helper that took a
 * fresh shot per question would be measuring a different frame each time, and a
 * rocket moves.
 */
export async function readFrame(page: Page, spec: FrameSpec = {}): Promise<FrameReport> {
  const canvas = page.locator(byTestId('world-canvas'));
  const box = await canvas.boundingBox();
  if (!box) throw new Error('the world canvas has no box — is the app mounted?');
  /*
    Hide everything that is not the canvas or one of its ancestors, shoot, and
    restore. See the file header: without this the harness measures the HUD.
  */
  await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error('no world canvas');
    const style = document.createElement('style');
    style.id = 'pixel-harness';
    style.textContent = '[data-pixel-harness-hide]{visibility:hidden!important}';
    document.head.appendChild(style);
    let node: Element = el;
    while (node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node) sibling.setAttribute('data-pixel-harness-hide', '');
      }
      node = node.parentElement;
    }
  }, byTestId('world-canvas'));

  let shot: Buffer;
  try {
    shot = await canvas.screenshot();
  } finally {
    await page.evaluate(() => {
      document.getElementById('pixel-harness')?.remove();
      for (const el of document.querySelectorAll('[data-pixel-harness-hide]')) {
        el.removeAttribute('data-pixel-harness-hide');
      }
    });
  }
  const dataUrl = `data:image/png;base64,${shot.toString('base64')}`;

  const result = await page.evaluate(
    async ([url, json, cssWidth]) => {
      const request: {
        regions: Record<string, Region>;
        extents: Record<string, ExtentQuery>;
        map?: { cols: number; rows: number };
      } = JSON.parse(json as string);

      const blob = await (await fetch(url as string)).blob();
      const bitmap = await createImageBitmap(blob);
      const surface = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = surface.getContext('2d');
      if (!ctx) throw new Error('no 2d context for decoding');
      ctx.drawImage(bitmap, 0, 0);
      // `as unknown as number[]` because the project compiles with
      // noUncheckedIndexedAccess, under which every read of a Uint8ClampedArray
      // is `number | undefined` and this loop would be half assertions.
      const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
        .data as unknown as number[];

      const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
      /** Fire: clearly red-dominant and not washed out to white. */
      const isWarm = (r: number, g: number, b: number, margin = 40) =>
        r > b + margin && r > g + 20 && r > 90;
      /** Smoke: near-neutral and neither black nor blown out. */
      const isGrey = (r: number, g: number, b: number) =>
        Math.max(r, g, b) - Math.min(r, g, b) < 26 && r > 40 && r < 232;

      const bounds = (region: Region) => {
        const x0 = Math.max(0, Math.floor(region.x * bitmap.width));
        const y0 = Math.max(0, Math.floor(region.y * bitmap.height));
        const x1 = Math.min(bitmap.width, Math.ceil((region.x + region.width) * bitmap.width));
        const y1 = Math.min(bitmap.height, Math.ceil((region.y + region.height) * bitmap.height));
        return { x0, y0, x1, y1 };
      };

      const regions: Record<string, unknown> = {};
      for (const [name, region] of Object.entries(request.regions)) {
        const { x0, y0, x1, y1 } = bounds(region);
        let n = 0;
        let sum = 0;
        let sumSq = 0;
        let bright = 0;
        let dark = 0;
        let warm = 0;
        let grey = 0;
        const tone = new Array<number>(16).fill(0);
        const bins = new Map<number, number>();

        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            const i = (py * bitmap.width + px) * 4;
            const r = data[i]!;
            const g = data[i + 1]!;
            const b = data[i + 2]!;
            const l = luma(r, g, b);
            n++;
            sum += l;
            sumSq += l * l;
            if (l >= 160) bright++;
            if (l < 64) dark++;
            if (isWarm(r, g, b)) warm++;
            if (isGrey(r, g, b)) grey++;
            tone[Math.min(15, l >> 4)]!++;
            const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
            bins.set(key, (bins.get(key) ?? 0) + 1);
          }
        }

        const mean = n > 0 ? sum / n : 0;
        const variance = n > 0 ? Math.max(0, sumSq / n - mean * mean) : 0;
        const top = [...bins.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key, count]) => {
            const r = ((key >> 8) & 0xf) * 17;
            const g = ((key >> 4) & 0xf) * 17;
            const b = (key & 0xf) * 17;
            const hex = (v: number) => v.toString(16).padStart(2, '0');
            return { rgb: `#${hex(r)}${hex(g)}${hex(b)}`, fraction: count / Math.max(1, n) };
          });

        regions[name] = {
          pixels: n,
          meanLuma: mean,
          lumaSpread: Math.sqrt(variance),
          toneBuckets: tone.filter((c) => c / Math.max(1, n) >= 0.01).length,
          brightFraction: bright / Math.max(1, n),
          darkFraction: dark / Math.max(1, n),
          warmFraction: warm / Math.max(1, n),
          greyFraction: grey / Math.max(1, n),
          topColours: top,
        };
      }

      const extents: Record<string, unknown> = {};
      for (const [name, query] of Object.entries(request.extents)) {
        const { x0, y0, x1, y1 } = bounds(query.region ?? { x: 0, y: 0, width: 1, height: 1 });
        let left = Infinity;
        let right = -Infinity;
        let top = Infinity;
        let bottom = -Infinity;
        let count = 0;
        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            const i = (py * bitmap.width + px) * 4;
            const r = data[i]!;
            const g = data[i + 1]!;
            const b = data[i + 2]!;
            const l = luma(r, g, b);
            // See `orWarmth`: bright, OR unmistakably on fire.
            const blazing = query.orWarmth !== undefined && r - b >= query.orWarmth;
            if (l < query.minLuma && !blazing) continue;
            if (query.maxLuma !== undefined && l > query.maxLuma) continue;
            const warm = isWarm(r, g, b, query.minWarmth ?? 40);
            if (query.warmOnly === true && !warm) continue;
            if (query.excludeWarm === true && warm) continue;
            count++;
            if (px < left) left = px;
            if (px > right) right = px;
            if (py < top) top = py;
            if (py > bottom) bottom = py;
          }
        }
        const found = count > 0;
        const widthPx = found ? right - left + 1 : 0;
        const heightPx = found ? bottom - top + 1 : 0;
        extents[name] = {
          found,
          left: found ? left : 0,
          right: found ? right : 0,
          top: found ? top : 0,
          bottom: found ? bottom : 0,
          widthPx,
          heightPx,
          spanPx: Math.max(widthPx, heightPx),
          count,
        };
      }

      let map: string[] | undefined;
      if (request.map) {
        const ramp = ' .:-=+*#%@';
        map = [];
        const cellW = bitmap.width / request.map.cols;
        const cellH = bitmap.height / request.map.rows;
        for (let ry = 0; ry < request.map.rows; ry++) {
          let line = '';
          for (let rx = 0; rx < request.map.cols; rx++) {
            let peak = 0;
            const px0 = Math.floor(rx * cellW);
            const px1 = Math.min(bitmap.width, Math.ceil((rx + 1) * cellW));
            const py0 = Math.floor(ry * cellH);
            const py1 = Math.min(bitmap.height, Math.ceil((ry + 1) * cellH));
            for (let py = py0; py < py1; py++) {
              for (let px = px0; px < px1; px++) {
                const i = (py * bitmap.width + px) * 4;
                const l = luma(data[i]!, data[i + 1]!, data[i + 2]!);
                if (l > peak) peak = l;
              }
            }
            line += ramp[Math.min(ramp.length - 1, Math.floor((peak / 256) * ramp.length))]!;
          }
          map.push(line);
        }
      }

      const imageWidth = bitmap.width;
      const imageHeight = bitmap.height;
      // Dimensions read BEFORE the close, because a closed ImageBitmap reports
      // 0x0 and the first run of this harness duly reported a 0x0 image while
      // handing back perfectly good pixel statistics from it.
      bitmap.close();
      return {
        imageWidth,
        imageHeight,
        imageScale: imageWidth / (cssWidth as number),
        regions,
        extents,
        ...(map ? { map } : {}),
      };
    },
    [
      dataUrl,
      JSON.stringify({
        regions: spec.regions ?? {},
        extents: spec.extents ?? {},
        ...(spec.map ? { map: spec.map } : {}),
      }),
      box.width,
    ] as const,
  );

  return result as FrameReport;
}

/** How big the ship is right now, in both pixel systems. */
export interface Scale {
  /** m — read off the HUD, so it is the simulation's altitude and not a guess. */
  readonly altitude: number;
  /** CSS px per metre. */
  readonly cssPerMetre: number;
  /** IMAGE px per metre — what `readFrame`'s numbers are in. */
  readonly imagePerMetre: number;
  /** The drawn vehicle, in image pixels. The unit every extent is reported in. */
  readonly vehicleHeightPx: number;
}

/**
 * Reconstruct the drawn scale, without the page having to publish it.
 *
 * `computeViewport` is the SAME function the renderer sizes itself with, so this
 * is a recomputation rather than a model — the distinction that the investigation
 * got wrong twice. Its inputs are the canvas box, the altitude from the HUD, and
 * the manual zoom, which is assumed to be 1: see the file header.
 */
export async function metrePixels(page: Page): Promise<Scale> {
  const canvas = page.locator(byTestId('world-canvas'));
  const box = await canvas.boundingBox();
  if (!box) throw new Error('the world canvas has no box — is the app mounted?');
  /*
    The readout SWITCHES UNIT at a kilometre (hud/readouts.ts:46), so the number
    on screen is metres or kilometres depending on where the vehicle is. Reading
    only the value node gives an altitude eight hundred times too small above the
    cloud deck, which is exactly the kind of quiet factor this milestone is about.
  */
  const text = await page.locator(byTestId(readoutValueTestId('altitude'))).textContent();
  const unit = await page.locator(byTestId(readoutUnitTestId('altitude'))).textContent();
  const shown = Number(text);
  if (!Number.isFinite(shown)) throw new Error(`altitude readout is not a number: ${text}`);
  const altitude = unit?.trim().toUpperCase() === 'KM' ? shown * 1000 : shown;

  const viewport = computeViewport(box.width, box.height, vehicleHeight, 1, altitude);
  const imageScale = await page.evaluate(() => Math.min(window.devicePixelRatio || 1, 2));
  return {
    altitude,
    cssPerMetre: viewport.scale,
    imagePerMetre: viewport.scale * imageScale,
    vehicleHeightPx: viewport.scale * vehicleHeight * imageScale,
  };
}

/** An extent, said in ship-lengths. The unit M9.6's acceptance line is written in. */
export function inVehicleHeights(extent: Extent, scale: Scale): number {
  return extent.spanPx / scale.vehicleHeightPx;
}

/**
 * The whole report as text, for an assertion message.
 *
 * Every assertion written against this harness should pass this as its message.
 * A bare `expected 0.26 to be greater than 1` says nothing about a picture; the
 * same failure with the region table and the luminance map beside it says
 * whether the plume is short or the ship is absent, which are different bugs.
 */
export function describeFrame(report: FrameReport, scale?: Scale): string {
  const lines: string[] = [
    `frame ${report.imageWidth}x${report.imageHeight} @${report.imageScale.toFixed(2)}x` +
      (scale ? `  altitude ${scale.altitude} m  vehicle ${scale.vehicleHeightPx.toFixed(0)} px` : ''),
  ];
  for (const [name, r] of Object.entries(report.regions)) {
    lines.push(
      `  ${name.padEnd(10)} mean ${r.meanLuma.toFixed(1).padStart(6)}  spread ${r.lumaSpread
        .toFixed(2)
        .padStart(6)}  tones ${String(r.toneBuckets).padStart(2)}  bright ${r.brightFraction.toFixed(
        3,
      )}  dark ${r.darkFraction.toFixed(3)}  warm ${r.warmFraction.toFixed(4)}  top ${r.topColours
        .map((c) => `${c.rgb}:${c.fraction.toFixed(2)}`)
        .join(' ')}`,
    );
  }
  for (const [name, e] of Object.entries(report.extents)) {
    lines.push(
      `  EXT ${name.padEnd(8)} found ${e.found}  span ${e.spanPx}px (${e.widthPx}x${e.heightPx})  n ${e.count}  box (${e.left},${e.top})-(${e.right},${e.bottom})` +
        (scale ? `  = ${inVehicleHeights(e, scale).toFixed(2)} vehicle heights` : ''),
    );
  }
  for (const line of report.map ?? []) lines.push(`  |${line}|`);
  return lines.join('\n');
}
