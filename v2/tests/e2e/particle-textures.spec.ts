/**
 * M9.5, in a browser: the plume has structure instead of a wash.
 *
 * `tests/view/particle-textures.test.ts` proves the four generated shapes are
 * different shapes — radial profiles, ring deviations, silhouette raggedness,
 * aspect ratios, all measured in Node with no GPU. What it cannot prove is what
 * the difference does once a thousand of them are drawn on top of each other
 * with an additive blend, which is the whole argument for `core` existing.
 *
 * THE ARGUMENT, AS A MEASUREMENT. Additive blending SUMS overlapping particles.
 * A wide gradient contributes something everywhere, so a few dozen overlapping
 * particles drive a large area straight to white and the plume becomes a flat
 * blown-out blob with a soft edge — which is what the single 2021 texture did,
 * and a large part of why § 3.2 of the plan describes it as a candle. A tight
 * core contributes almost nothing outside its centre, so the same particles
 * make a small saturated core and a graded halo.
 *
 * So the number is the share of the LIT plume that is BLOWN OUT: pixels at luma
 * 240 or above, against pixels at 170 or above. Measured at sea-level full
 * throttle, five samples, median taken:
 *
 *     single soft texture (before M9.5)     0.35, 0.42, 0.40    median 0.40
 *     the core texture (shipped)            0.14, 0.26, 0.18    median 0.18
 *
 * A RATIO rather than a count, deliberately: the five Playwright projects render
 * at 1x and at 2.6x, so any absolute pixel count differs by a factor of seven
 * between them and a ratio does not.
 *
 * WHAT THIS DOES NOT PROVE, said plainly because the plan asked for it: the
 * milestone's acceptance line hoped the harness would show "smoke and fire
 * separating in a colour histogram". It cannot, honestly — the two populations
 * were already separated in colour before M9.5, by their per-effect TINTS, which
 * have been there since M3.3. What M9.5 changes is shape, and shape is what is
 * measured here and in the unit tests beside it.
 */
import { expect, test } from '@playwright/test';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';
import { ready, tap } from './helpers';
import { describeFrame, readFrame, type Region } from './pixels';

type Page = import('@playwright/test').Page;

/** A tight box on the nozzle, where the plume is and nothing else is. */
const PLUME: Region = { x: 0.42, y: 0.44, width: 0.16, height: 0.3 };

/** Sea-level full throttle, with room below so the vehicle cannot reach the ground. */
async function underPower(page: Page): Promise<void> {
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('preset-landing-burn')).click();
  for (const [name, value] of [['altitude', '2000'], ['speedX', '0'], ['speedY', '0']] as const) {
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
  // A plume particle lives 0.32 s; a second and a half is the whole emitter at
  // steady state rather than a transient.
  await page.waitForTimeout(1_500);
}

test('the plume is a core with a halo, not a flat wash @mobile', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await underPower(page);

  const ratios: number[] = [];
  let last = '';
  for (let i = 0; i < 5; i++) {
    const report = await readFrame(page, {
      regions: { plume: PLUME },
      extents: {
        blown: { region: PLUME, minLuma: 240 },
        lit: { region: PLUME, minLuma: 170 },
      },
      map: { cols: 40, rows: 20 },
    });
    const blown = report.extents['blown']!.count;
    const lit = report.extents['lit']!.count;
    expect(lit, `nothing lit in the plume box\n${describeFrame(report)}`).toBeGreaterThan(20);
    ratios.push(blown / lit);
    last = describeFrame(report);
    await page.waitForTimeout(400);
  }

  ratios.sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)]!;
  const message =
    `blown-out share of the lit plume: ${ratios.map((r) => r.toFixed(2)).join(' ')} ` +
    `(median ${median.toFixed(2)})\n${last}`;

  // The single-texture build measures 0.40 here. 0.32 sits between the two
  // populations with room on both sides for the sampling noise.
  expect(median, message).toBeLessThan(0.32);
  // And the plume is genuinely there rather than dim: something must be blown
  // out, or "less wash" would be satisfied by no plume at all.
  expect(median, message).toBeGreaterThan(0.02);
});
