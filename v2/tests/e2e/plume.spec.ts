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

/**
 * A thin strip just below the nozzle, where the plume's WIDTH is the cone angle
 * and nothing else.
 *
 * Measuring width over the whole `BELOW` box did not work and the reason is
 * worth recording: the widest part of a long plume is far from the nozzle, so
 * how much of it lands inside a fixed box depends on where the climbing vehicle
 * happens to be. Run to run on the same project that moved the low-altitude
 * width between 0.72 and 0.84 ship-lengths, which is most of the difference the
 * measurement was trying to detect. In the NEAR FIELD the cone is the cone.
 */
const NEAR_FIELD: Region = { x: 0.3, y: 0.56, width: 0.4, height: 0.08 };

/** The plume's extent and width, in ship-lengths, as a median of four frames. */
async function plume(page: Page): Promise<{ span: number; width: number; last: string }> {
  const spans: number[] = [];
  const widths: number[] = [];
  let last = '';
  for (let i = 0; i < 4; i++) {
    const report = await readFrame(page, {
      regions: { below: BELOW },
      extents: { plume: PLUME, nearField: { ...PLUME, region: NEAR_FIELD } },
      map: { cols: 44, rows: 22 },
    });
    const scale = await metrePixels(page);
    const found = report.extents['plume']!;
    expect(found.found, `no plume at all\n${describeFrame(report, scale)}`).toBe(true);
    spans.push(inVehicleHeights(found, scale));
    const near = report.extents['nearField']!;
    widths.push(near.found ? near.widthPx / scale.vehicleHeightPx : 0);
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
  /*
    And not a beam. Six rather than four, because the portrait phone projects
    measure 3 to 4.2 where the desktop measures 2.5: their frames are 2202 px
    tall against a 135 px vehicle, so the measurement box holds nearly eight
    ship-lengths and catches the faint tail the desktop box clips. The
    arithmetic says the core carries a particle 2.7 ship-lengths; what varies
    between projects is how much of the fade is above the luma floor.
  */
  expect(measured.span, message).toBeLessThan(6);
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
    engine draws a PENCIL at sea level and a BELL in vacuum.

    WIDTH IN SHIP-LENGTHS, measured in the NEAR FIELD — see `NEAR_FIELD` for why
    the whole-plume width was too noisy to say anything with. Across the five
    projects, over two runs:

      desktop           0.66-0.73  ->  0.97-1.14
      Pixel portrait    0.92-0.94  ->  1.32-1.53
      Pixel landscape   0.91-0.96  ->  1.57-1.60
      iPhone portrait   1.10       ->  1.76
      iPhone landscape  1.10       ->  1.77

    Ratios of 1.33 to 1.73, against a bound of 1.2. Aspect — width over length —
    was tried as the more shape-like statistic and is worse: in vacuum the black
    sky lets the faint tail register so the LENGTH grows too, which put the
    desktop project at exactly 1.25 with nothing to spare.
  */
  const shape =
    `${message}\n  aspect: ${(low.width / low.span).toFixed(2)} low, ` +
    `${(vacuum.width / vacuum.span).toFixed(2)} vacuum`;
  console.log(shape);
  expect(vacuum.width, shape).toBeGreaterThan(low.width * 1.2);
  expect(vacuum.width, shape).toBeGreaterThan(0.2);
});
