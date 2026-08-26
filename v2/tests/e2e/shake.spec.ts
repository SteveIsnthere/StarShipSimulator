/**
 * M9.3, in a browser: the lens actually moves now.
 *
 * `tests/view/dynamic-pressure.test.ts` proves the arithmetic — that
 * `shakeAmplitude` returns 0.95 at the 28.6 kPa the RTLS golden reaches, where
 * until this task it returned 0.00095. What arithmetic cannot prove is that the
 * number reaches the screen. The bug being fixed here was wired correctly end to
 * end and multiplied by a constant a thousand times too large, and every unit
 * test of it passed for three milestones.
 *
 * So this asks the picture. It tracks the vehicle's silhouette — the one dark
 * thing in the middle of a clear frame — across a burst of screenshots and
 * measures how far its bounding box wanders VERTICALLY.
 *
 * THREE DESIGN DECISIONS, each of which came out of a measurement that did not
 * work.
 *
 * 1. THE CONTROL IS THE SAME FLIGHT WITH `prefers-reduced-motion`. A frame in
 *    which something moves is not evidence of shake: the vehicle is flying, the
 *    camera is following, the field of view is opening. Reduced motion zeroes
 *    the shake and changes nothing else, so the difference between the two
 *    numbers is the shake and nothing else. It also checks, end to end, that a
 *    player who asked not to be shaken is not.
 *
 * 2. MEASURED IN SLOW MOTION. At real time the vehicle's own drift through the
 *    frame was 39 px over a burst and the shake is about 6; detrending left
 *    3.7 px of shake against 3.2 px of residual curvature, which separates
 *    nothing. At 1/9 the drift is a ninth of that while the shake — a fraction
 *    of the VIEWPORT, deliberately, so it is the same size on screen at every
 *    field of view — is untouched. The measurement became 3.7 against 0.8.
 *
 * 3. VERTICAL ONLY, AND TRIMMED. The horizontal series has outliers: the
 *    silhouette detector occasionally catches a cloud edge entering the region
 *    from the side, which throws the box 100 px in one sample. The vertical
 *    series is clean because nothing else in that band crosses it. The residual
 *    range drops one sample from each end for the same reason — a robust
 *    statistic, because a single misdetection should not be able to pass or fail
 *    this test.
 */
import { expect, test } from '@playwright/test';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';
import { ready } from './helpers';
import { describeFrame, readFrame, type Region } from './pixels';

type Page = import('@playwright/test').Page;

/** Where the vehicle is, in a frame the camera is holding it in. */
const SUBJECT: Region = { x: 0.3, y: 0.2, width: 0.4, height: 0.6 };

/**
 * The vehicle silhouette, as a luma band.
 *
 * Neither sky nor cloud: the drawn Starship sits between 20 and 110 against a
 * sky around 113 at this altitude and clouds well past 150.
 */
const SILHOUETTE = { region: SUBJECT, minLuma: 20, maxLuma: 110 };

async function preset(page: Page, id: string, fields: Record<string, string>): Promise<void> {
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId(`preset-${id}`)).click();
  for (const [name, value] of Object.entries(fields)) {
    await page.locator(byTestId(`field-${name}`)).fill(value);
  }
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();
  await page.waitForTimeout(2_000);
}

/** Put the simulation into 1/9 speed. See decision 2 in the header. */
async function slowMotion(page: Page): Promise<void> {
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('menu-time-direction')).click();
  await page.locator(byTestId('menu-time-rate')).fill('9');
  await expect(page.locator(byTestId('menu-time-readout'))).toHaveText(/1\/9x/);
  await page.locator(byTestId('menu-close')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();
  await page.waitForTimeout(1_000);
}

/** The range of a series after a least-squares straight line is removed. */
function detrendedRange(values: readonly number[]): number {
  const n = values.length;
  const meanIndex = (n - 1) / 2;
  const meanValue = values.reduce((a, b) => a + b, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (i - meanIndex) * (values[i]! - meanValue);
    variance += (i - meanIndex) ** 2;
  }
  const slope = variance === 0 ? 0 : covariance / variance;
  const residuals = values
    .map((v, i) => v - (meanValue + slope * (i - meanIndex)))
    .sort((a, b) => a - b)
    // One sample from each end: a single misdetection must not decide this.
    .slice(1, -1);
  return residuals[residuals.length - 1]! - residuals[0]!;
}

/** How much the silhouette moves vertically, once its steady drift is removed. */
async function verticalWander(page: Page): Promise<{ px: number; last: string; tops: number[] }> {
  const tops: number[] = [];
  let last = '';
  for (let i = 0; i < 16; i++) {
    const report = await readFrame(page, {
      extents: { ship: SILHOUETTE },
      map: { cols: 48, rows: 16 },
    });
    const ship = report.extents['ship']!;
    expect(ship.found, `no vehicle silhouette to track\n${describeFrame(report)}`).toBe(true);
    tops.push(ship.top);
    last = describeFrame(report);
    await page.waitForTimeout(30);
  }
  return { px: detrendedRange(tops), last, tops };
}

/**
 * Ten kilometres at 368 m/s, which is a little over 20 kPa.
 *
 * Placed by the editor rather than flown there: reaching max-Q on an ascent
 * takes a minute of wall clock and lands somewhere slightly different each run,
 * and the question here is about a constant, not about a trajectory.
 */
async function nearMaxQ(page: Page): Promise<void> {
  await preset(page, 'booster-sep', { altitude: '10000', speedX: '368', speedY: '0' });
  await expect
    .poll(
      async () =>
        Number(await page.locator(byTestId(readoutValueTestId('dynamicPressure'))).textContent()),
      { timeout: 20_000, intervals: [200] },
    )
    .toBeGreaterThan(15);
  await slowMotion(page);
}

test('the frame shakes near max-Q, and holds still when asked not to @mobile', async ({ page }) => {
  test.setTimeout(240_000);

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await nearMaxQ(page);
  const shaking = await verticalWander(page);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await nearMaxQ(page);
  const still = await verticalWander(page);

  const report =
    `shaking ${shaking.px.toFixed(1)} px vs reduced motion ${still.px.toFixed(1)} px\n` +
    `  shaking tops: ${shaking.tops.join(' ')}\n  reduced tops: ${still.tops.join(' ')}\n` +
    shaking.last;

  // Before M9.3 the amplitude at this dynamic pressure was 0.0007 of 0.6% of a
  // viewport — four thousandths of a pixel — and these two numbers were the
  // same measurement twice.
  expect(shaking.px, report).toBeGreaterThan(2);
  expect(shaking.px, report).toBeGreaterThan(still.px * 1.5 + 1);
});

test('and does not shake a vehicle standing on the ground @mobile', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Both sources of shake are zero here: no air load and no thrust. If the
  // picture moves in this state, something other than the airframe is moving it.
  await preset(page, 'landing-burn', { altitude: '0', speedX: '0', speedY: '0' });
  await page.waitForTimeout(2_000);
  const resting = await verticalWander(page);

  expect(
    resting.px,
    `${resting.px.toFixed(1)} px of wander at rest\n  tops: ${resting.tops.join(' ')}\n${resting.last}`,
  ).toBeLessThanOrEqual(1);
});
