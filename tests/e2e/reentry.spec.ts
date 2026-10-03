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
import { writeFile } from 'node:fs/promises';
import type { SimDebug } from '../../src/app/debug';
import { byTestId } from '../../src/ui/testids';
import { insetLayout } from '../../src/view/reentry';
import { ready } from './helpers';
import { captureCanvas, describeFrame, metrePixels, readFrame, type Region } from './pixels';
import { heatLimit } from '../../src/core/constants';

type Page = import('@playwright/test').Page;

async function preset(page: Page, id: string, settleMs: number, fields: Record<string, string> = {}): Promise<void> {
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId(`preset-${id}`)).click();
  for (const [name, value] of Object.entries(fields)) {
    await page.locator(byTestId(`field-${name}`)).fill(value);
  }
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

test('skin temperature changes actual main and inset pixels independently of equal plasma flux @mobile', async ({ page }, info) => {
  await page.goto('/?debug=1');
  await ready(page);
  await page.evaluate(() => {
    const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
    debug.pause(); debug.setScenario('reentry'); debug.pause();
  });
  const inject = async (temperature: number) => {
    await page.evaluate(({ temperature, flux }) => {
      (window as unknown as { __simDebug: SimDebug }).__simDebug.setState({
        'forces.surfaceTemperature': temperature, 'forces.thermalPower': flux,
      });
    }, { temperature, flux: heatLimit * 0.32 });
    // Wait for rendering, never advance the physical state to manufacture heat.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  };
  const inset = await insetRegion(page);
  await inject(300);
  const cold = await readFrame(page, { regions: { inset, subject: SUBJECT } });
  await inject(1533);
  const hot = await readFrame(page, { regions: { inset, subject: SUBJECT } });
  expect(hot.regions['inset']!.meanLuma, 'hot skin adds emission at identical flux').toBeGreaterThan(cold.regions['inset']!.meanLuma);
  expect(hot.regions['subject']!.meanLuma, 'main view consumes the same independent temperature').toBeGreaterThan(cold.regions['subject']!.meanLuma);
  const paused = await readFrame(page, { regions: { inset, subject: SUBJECT } });
  expect(paused.regions).toEqual(hot.regions);
  await inject(300);
  const restored = await readFrame(page, { regions: { inset, subject: SUBJECT } });
  expect(restored.regions).toEqual(cold.regions);
  console.log('[skin-temperature]', { cold: cold.regions, hot: hot.regions });
  await writeFile(info.outputPath('skin-cold-equal-flux.png'), await captureCanvas(page));
  await inject(1533);
  await writeFile(info.outputPath('skin-hot-equal-flux.png'), await captureCanvas(page));
});

test('the onboard inset shows the vehicle in its sheath, and only while it is hot @mobile', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/?debug=1', { waitUntil: 'load' });
  await ready(page);

  await preset(page, 'reentry', 1_500);
  const hotBox = await page.locator(byTestId('world-canvas')).boundingBox();
  expect(await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation().bodies?.map(body => body.id))).toEqual(['starship']);
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
  // Retain the original cold Ship subject after booster-sep became Super Heavy.
  await preset(page, 'before-flip', 1_200, { altitude: '70000', xPosition: '45000', speedX: '1130', speedY: '1130', pitch: '45', propellant: '500', launchHour: '9.55' });
  expect(await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation().bodies?.map(body => body.id))).toEqual(['starship']);
  expect(await page.locator(byTestId('world-canvas')).boundingBox()).toEqual(hotBox);
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
