/**
 * M9.6, in a browser: the plume reaches, and it blooms.
 *
 * `tests/view/plume.test.ts` proves the arithmetic — that the core emitter
 * carries a particle 135 m against the single 2021 emitter's 21.9, that the bell
 * is short and wide beside it, and that the two shock curves are monotonic,
 * bounded and reach zero where they should. What it cannot prove is that any of
 * it reaches the screen, which is the lesson M9.3 paid for.
 *
 * TWO MEASUREMENTS, in the unit the acceptance line is written in: ship-lengths.
 *
 *   LOW ALTITUDE   the plume must be longer than the vehicle. It measures about
 *                  2.5 ship-lengths; before M9.6 the same measurement on the
 *                  same frame was 0.26.
 *   VACUUM         the plume must be visibly WIDER relative to the ship, which
 *                  is what `plumeSpreadFactor` exists to do. About 1.1
 *                  ship-lengths across, against 0.55 low down.
 *
 * AND WHAT IS NOT MEASURED HERE, said plainly. The acceptance line also asks for
 * "dimmer in vacuum". The harness cannot honestly compare brightness across
 * those two frames: at 2 km the plume is drawn over a sky at luma 152 and at
 * 120 km over one at 17, so any brightness statistic is mostly a statement about
 * the background. The dimming is arithmetic — the same emitted light spread over
 * `plumeScaleFactor` squared, which is 5.3x the area — and it is proved in the
 * unit test beside this one, where it can be.
 */
import { expect, test } from '@playwright/test';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';
import { ready, tap } from './helpers';
import { describeFrame, inVehicleHeights, metrePixels, readFrame, type Region } from './pixels';

type Page = import('@playwright/test').Page;

/**
 * A column strictly BELOW the vehicle, which is where the plume is.
 *
 * Below, because the flight-path marker (M7.5) is drawn at the vehicle along its
 * velocity, and a vehicle climbing under full thrust points it upward — out of
 * this box. Measuring a box centred on the ship measured the instrument as often
 * as the plume.
 */
const BELOW: Region = { x: 0.36, y: 0.52, width: 0.28, height: 0.47 };

/**
 * The plume, as pixels: warm and lit.
 *
 * `warmOnly` is what excludes the stars, which are white and are everywhere in
 * the vacuum frame; the luma floor is what excludes the dark sky around them.
 */
const PLUME = { region: BELOW, minLuma: 90, warmOnly: true };

/** Hold the vehicle at an altitude with all three engines at full thrust. */
async function underPowerAt(page: Page, altitude: string): Promise<void> {
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('preset-landing-burn')).click();
  for (const [name, value] of [
    ['altitude', altitude],
    // Away from StarBase, so the pad's own lights are not in the frame: they are
    // warm, and they are exactly where the plume is looked for.
    ['xPosition', '30000'],
    ['speedX', '0'],
    ['speedY', '0'],
  ] as const) {
    await page.locator(byTestId(`field-${name}`)).fill(value);
  }
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();
  await page.waitForTimeout(500);
  await tap(page, 'all-raptors');
  await tap(page, 'auto-max-thrust');
  await expect
    .poll(
      async () => Number(await page.locator(byTestId(readoutValueTestId('throttle'))).textContent()),
      { timeout: 30_000, intervals: [200] },
    )
    .toBeGreaterThan(90);
  // Long enough for the emitters to reach steady state AND for the vehicle to
  // start climbing, which points the flight-path marker away from the box.
  await page.waitForTimeout(2_500);
}

/** The plume's extent and width, in ship-lengths, as a median of four frames. */
async function plume(page: Page): Promise<{ span: number; width: number; last: string }> {
  const spans: number[] = [];
  const widths: number[] = [];
  let last = '';
  for (let i = 0; i < 4; i++) {
    const report = await readFrame(page, {
      regions: { below: BELOW },
      extents: { plume: PLUME },
      map: { cols: 44, rows: 22 },
    });
    const scale = await metrePixels(page);
    const found = report.extents['plume']!;
    expect(found.found, `no plume at all\n${describeFrame(report, scale)}`).toBe(true);
    spans.push(inVehicleHeights(found, scale));
    widths.push(found.widthPx / scale.vehicleHeightPx);
    last = describeFrame(report, scale);
    await page.waitForTimeout(350);
  }
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  return { span: median(spans), width: median(widths), last };
}

test('the plume is longer than the ship at low altitude @mobile', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await underPowerAt(page, '2000');

  const measured = await plume(page);
  const message =
    `plume spans ${measured.span.toFixed(2)} ship-lengths, ${measured.width.toFixed(2)} across\n` +
    measured.last;

  // The acceptance line's number. Measured at about 2.5; the single 2021 emitter
  // measured 0.26 on the same frame, and its arithmetic says it could not have
  // done better than 0.44.
  expect(measured.span, message).toBeGreaterThan(1);
  // And not a beam: past four ship-lengths it stops reading as attached.
  expect(measured.span, message).toBeLessThan(4);
});

test('and blooms wider than the ship in vacuum @mobile', async ({ page }) => {
  test.setTimeout(240_000);

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await underPowerAt(page, '2000');
  const low = await plume(page);

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await underPowerAt(page, '120000');
  const vacuum = await plume(page);

  const message =
    `low: ${low.span.toFixed(2)} long, ${low.width.toFixed(2)} across · ` +
    `vacuum: ${vacuum.span.toFixed(2)} long, ${vacuum.width.toFixed(2)} across\n${vacuum.last}`;

  /*
    The most recognisable thing about watching an ascent, as a number: the same
    engine draws a pencil at sea level and a bell in vacuum. Width in
    ship-lengths, so the field of view opening with altitude cannot flatter it.
  */
  expect(vacuum.width, message).toBeGreaterThan(low.width * 1.4);
  expect(vacuum.width, message).toBeGreaterThan(0.8);
});
