/**
 * M11.5 — re-entry, measured.
 *
 * The re-entry preset starts at 80 km and 7.3 km/s with HEAT at a third of
 * the limit, so the sheath is on from the first frame and so is the inset.
 * Two claims, each a number the harness can produce:
 *
 *   THE INSET is there, and it is the vehicle: its square at the top-left has
 *   a luma spread no patch of night sky has, and warm pixels — the sheath —
 *   that no patch of sky has at all. On a cold flight the same square is sky.
 *
 *   THE SHEATH is on the vehicle in the main view too: warm pixels inside the
 *   subject region, where before M11.5 the only warmth was the trail's dots.
 */
import { expect, test } from '@playwright/test';
import { byTestId } from '../../src/ui/testids';
import { insetLayout } from '../../src/view/reentry';
import { ready } from './helpers';
import { describeFrame, metrePixels, readFrame, type Region } from './pixels';

type Page = import('@playwright/test').Page;

async function preset(page: Page, id: string, settleMs: number): Promise<void> {
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId(`preset-${id}`)).click();
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();
  await page.waitForTimeout(settleMs);
}

/** The inset's square, as a fraction of the image, from the same layout rule the view uses. */
async function insetRegion(page: Page): Promise<Region> {
  const box = await page.locator(byTestId('world-canvas')).boundingBox();
  if (!box) throw new Error('no canvas');
  const layout = { x: 0, y: 0, size: 0 };
  insetLayout({ width: box.width, height: box.height }, layout);
  // Inside the frame line, so the hairline is not in the numbers.
  return {
    x: (layout.x + 2) / box.width,
    y: (layout.y + 2) / box.height,
    width: (layout.size - 4) / box.width,
    height: (layout.size - 4) / box.height,
  };
}

const SUBJECT: Region = { x: 0.3, y: 0.2, width: 0.4, height: 0.6 };

test('the onboard inset shows the vehicle in its sheath, and only while it is hot @mobile', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await preset(page, 'reentry', 1_500);
  const inset = await insetRegion(page);
  const hot = await readFrame(page, { regions: { inset, subject: SUBJECT }, map: { cols: 60, rows: 20 } });
  const scale = await metrePixels(page);
  const message = describeFrame(hot, scale);
  const window = hot.regions['inset']!;
  // The vehicle: many tones, not the two or three a night sky with stars has.
  expect(window.lumaSpread, `the inset is flat — no vehicle in it\n${message}`).toBeGreaterThan(12);
  expect(window.toneBuckets, `the inset has too few tones to be a lit hull\n${message}`).toBeGreaterThan(3);
  // The sheath: warm, saturated pixels wrapped on the windward side.
  expect(window.warmFraction, `no sheath in the inset\n${message}`).toBeGreaterThan(0.01);
  // And in the main view, on the vehicle itself.
  expect(hot.regions['subject']!.warmFraction, `no sheath on the vehicle\n${message}`).toBeGreaterThan(
    0.0005,
  );

  // A cold flight: the same square is sky — no warmth, and no vehicle.
  await preset(page, 'booster-sep', 1_200);
  const cold = await readFrame(page, { regions: { inset }, map: { cols: 60, rows: 20 } });
  const sky = cold.regions['inset']!;
  const coldMessage = describeFrame(cold, await metrePixels(page));
  expect(sky.warmFraction, `the inset is still showing on a cold flight\n${coldMessage}`).toBeLessThan(
    0.002,
  );
  expect(sky.lumaSpread, `something is drawn in the inset on a cold flight\n${coldMessage}`).toBeLessThan(
    window.lumaSpread * 0.5,
  );
});
