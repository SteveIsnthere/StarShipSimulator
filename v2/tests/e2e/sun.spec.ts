/**
 * M11.4 — the sun, measured.
 *
 * Two flights end on the same pad in the same framing at two different local
 * hours: the intro lands at half past nine with the sun in the east, and the
 * landing burn at four with the sun in the west. Everything the sun does to
 * the picture should DIFFER between the two frames in the direction the
 * geometry says, and this file measures that rather than looking at it:
 *
 *   THE HULL. The flank toward the sun is brighter than the flank away from
 *   it, by the stated margin — and which flank that is swaps with the hour.
 *   The second half is what proves the shading is the sun's and not the
 *   art's: the sprite is painted lit from its right, so the morning frame
 *   alone would pass with no lighting at all.
 *
 *   THE SHADOW. A dark streak on the ground line beside the vehicle's base,
 *   on the side away from the sun. Measured as the left-minus-right luma of
 *   the bottom strip, morning against afternoon: the scenery is identical in
 *   both frames, so the difference of the differences is the shadow alone.
 *
 * Every measurement comes from `readFrame`, which hides the overlay before
 * the shutter, so the lower-third scrim over the pad is not in the numbers.
 */
import { expect, test } from '@playwright/test';
import { vehicleDiameter, vehicleHeight } from '../../src/core/constants';
import { byTestId } from '../../src/ui/testids';
import { ready, tap } from './helpers';
import { describeFrame, metrePixels, readFrame, type FrameReport, type Region } from './pixels';

type Page = import('@playwright/test').Page;

/** The lit flank must out-luma the shaded one by at least this ratio. */
const FLANK_RATIO = 1.25;
/** The shadow must move the bottom strip's left-minus-right luma by at least this much. */
const SHADOW_MARGIN = 8;

/**
 * Wait for touchdown: the altitude readout reaches the pad. Read through
 * `metrePixels`, which knows the readout switches to kilometres above 1000 m;
 * a bare `Number()` of the value node would call 15 km "15" and pass at once.
 */
async function landed(page: Page): Promise<void> {
  await expect
    .poll(async () => (await metrePixels(page)).altitude, { timeout: 90_000, intervals: [500] })
    .toBeLessThan(26);
  // Let the camera settle on the landed vehicle.
  await page.waitForTimeout(2_500);
}

/**
 * Select a preset and fly it down on the autopilot. The intro lands itself;
 * a preset from the menu does not, and without AUTO-LAND the landing burn is
 * a fall — the first run of this measured a crash.
 */
async function presetLanded(page: Page, id: string): Promise<void> {
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId(`preset-${id}`)).click();
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();
  await tap(page, 'auto-land');
  await landed(page);
}

interface PadFrame {
  readonly report: FrameReport;
  readonly message: string;
  readonly left: number;
  readonly right: number;
  readonly bottomLeft: number;
  readonly bottomRight: number;
}

/**
 * Measure the landed vehicle: its two flanks, and the ground line either side
 * of its base. The vehicle stands on the bottom edge at the frame's centre —
 * the camera's floor and its horizontal follow put it there — and its drawn
 * size follows from the viewport, so every region is computed, not guessed.
 */
async function measurePad(page: Page): Promise<PadFrame> {
  const scale = await metrePixels(page);
  const canvas = await page.locator(byTestId('world-canvas')).boundingBox();
  if (!canvas) throw new Error('no canvas');
  const imageScale = scale.imagePerMetre / scale.cssPerMetre;
  const widthPx = canvas.width * imageScale;
  const heightPx = canvas.height * imageScale;
  const vh = scale.vehicleHeightPx;
  const vw = vh * (vehicleDiameter / vehicleHeight);
  const cx = widthPx / 2;
  // The clean hull: below the nose cone, above the aft fins.
  const top = heightPx - 0.88 * vh;
  const bandH = 0.33 * vh;
  const flank = (side: -1 | 1): Region => ({
    x: (cx + side * 0.3 * (vw / 2) + (side < 0 ? -0.6 * (vw / 2) : 0)) / widthPx,
    y: top / heightPx,
    width: (0.6 * (vw / 2)) / widthPx,
    height: bandH / heightPx,
  });
  // The ground line's strip, out to where the longest shadow reaches.
  const stripH = Math.max(6, 8 * imageScale);
  const reach = 1.6 * vh;
  const bottom = (side: -1 | 1): Region => ({
    x: (side < 0 ? cx - reach : cx + 0.6 * vw) / widthPx,
    y: (heightPx - stripH) / heightPx,
    width: (reach - 0.6 * vw) / widthPx,
    height: stripH / heightPx,
  });
  const report = await readFrame(page, {
    regions: {
      left: flank(-1),
      right: flank(1),
      bottomLeft: bottom(-1),
      bottomRight: bottom(1),
    },
    map: { cols: 60, rows: 20 },
  });
  return {
    report,
    message: describeFrame(report, scale),
    left: report.regions['left']!.meanLuma,
    right: report.regions['right']!.meanLuma,
    bottomLeft: report.regions['bottomLeft']!.meanLuma,
    bottomRight: report.regions['bottomRight']!.meanLuma,
  };
}

test('the sun lights the flank it faces, and the other one in the afternoon @mobile', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await landed(page);
  const morning = await measurePad(page);

  await presetLanded(page, 'landing-burn');
  const afternoon = await measurePad(page);

  const note = `morning L ${morning.left.toFixed(1)} R ${morning.right.toFixed(1)} · afternoon L ${afternoon.left.toFixed(1)} R ${afternoon.right.toFixed(1)}`;
  // Morning: sun in the east, the right flank lit.
  expect(morning.right / morning.left, `${note}\n${morning.message}`).toBeGreaterThan(FLANK_RATIO);
  // Afternoon: sun in the west, the LEFT flank lit — the art alone cannot do this.
  expect(afternoon.left / afternoon.right, `${note}\n${afternoon.message}`).toBeGreaterThan(
    FLANK_RATIO,
  );
});

test('the shadow falls away from the sun, and moves with it @mobile', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await landed(page);
  const morning = await measurePad(page);

  await presetLanded(page, 'landing-burn');
  const afternoon = await measurePad(page);

  // Left minus right along the ground line. The morning shadow is on the
  // left (west of the vehicle), so the morning figure is the smaller; the
  // scenery is the same in both frames and cancels.
  const morningLR = morning.bottomLeft - morning.bottomRight;
  const afternoonLR = afternoon.bottomLeft - afternoon.bottomRight;
  const note = `morning L-R ${morningLR.toFixed(1)} (L ${morning.bottomLeft.toFixed(1)} R ${morning.bottomRight.toFixed(1)}) · afternoon L-R ${afternoonLR.toFixed(1)} (L ${afternoon.bottomLeft.toFixed(1)} R ${afternoon.bottomRight.toFixed(1)})`;
  expect(afternoonLR - morningLR, `${note}\n${morning.message}\n${afternoon.message}`).toBeGreaterThan(
    SHADOW_MARGIN,
  );
});
