/**
 * M9.1: the harness, used.
 *
 * A measuring instrument nothing measures with is a claim, not a tool. These
 * four tests are one per surface the rest of M9 will change, and each one is
 * written the same way: assert the STRUCTURAL FACT that must hold now and after
 * the redesign, and print the numbers the later task will tighten.
 *
 *   framing      M9.2 — the vehicle and its plume are in the frame
 *   plume        M9.6 — the plume has a measurable extent, in ship-lengths
 *   cloud deck   M9.7 — the deck is there and is brighter than the sky behind it
 *   ground       M9.8 — the ground band is opaque ground, not sky and not night
 *
 * THE TOLERANCES ARE WIDE ON PURPOSE, and it is worth saying why rather than
 * letting a future session tighten them for neatness. These run on five
 * projects: a 1280x720 desktop at 1x, and four phone viewports at 2.6x, whose
 * drawn vehicle is anywhere from 180 to 420 image pixels tall. A bound tight
 * enough to be interesting on one of them is a false failure on another. What
 * makes these worth having is not their tightness — it is that each one is a
 * number a task can raise, in the same unit the task's acceptance line is
 * written in.
 *
 * Every assertion carries `describeFrame` as its message, so a failure arrives
 * with the region table and a luminance map rather than with one lonely float.
 */
import { expect, test } from '@playwright/test';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';
import { ready, tap } from './helpers';
import {
  describeFrame,
  inVehicleHeights,
  metrePixels,
  readFrame,
  type FrameSpec,
} from './pixels';

type Page = import('@playwright/test').Page;

/** The tall middle column: where the subject of the shot is meant to be. */
const SUBJECT = { x: 0.25, y: 0.1, width: 0.5, height: 0.85 };
/** The top tenth — sky, and nothing else, at every altitude the tests use. */
const SKY = { x: 0, y: 0, width: 1, height: 0.1 };
/** Where the cloud deck sits when the vehicle is above it. */
const DECK = { x: 0, y: 0.44, width: 1, height: 0.22 };
/** The bottom fifth: ground, or the far earth standing in for it. */
const GROUND = { x: 0, y: 0.8, width: 1, height: 0.2 };

const SPEC: FrameSpec = {
  map: { cols: 60, rows: 20 },
  regions: { subject: SUBJECT, sky: SKY, deck: DECK, ground: GROUND },
  extents: { fire: { minLuma: 100, warmOnly: true, region: SUBJECT } },
};

/** Load a scenario preset, optionally editing the flight before it starts. */
async function preset(
  page: Page,
  id: string,
  fields: Record<string, string> = {},
  settleMs = 3_000,
): Promise<void> {
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId(`preset-${id}`)).click();
  for (const [name, value] of Object.entries(fields)) {
    await page.locator(byTestId(`field-${name}`)).fill(value);
  }
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();
  // Long enough for the field of view to finish opening and the emitters to
  // reach a steady state. A shorter wait measures a transient.
  await page.waitForTimeout(settleMs);
}

/**
 * The landing burn, held at altitude with all three engines at full thrust.
 *
 * The scenario the acceptance line names, arranged so the measurement is not a
 * race — and the first arrangement WAS a race, which is worth recording because
 * it is the kind of thing that turns into a quarantined test. Flown by the
 * autopilot the landing burn touches down in a few seconds and cuts the
 * engines, so whether there is a plume in shot depends on how fast the machine
 * running the test is; and holding it at 300 m still lost, because the vehicle
 * free-falls while the taps happen and the four phone projects are slower than
 * the desktop one. On the iPhone project it reached the ground first.
 *
 * So: two kilometres of room, and WAIT FOR THE THROTTLE rather than for a
 * number of milliseconds. The state the test needs is "the engines are at full
 * thrust", and that is a thing the page will say out loud.
 */
async function underPower(page: Page): Promise<void> {
  await preset(page, 'landing-burn', { altitude: '2000', speedX: '0', speedY: '0' }, 500);
  await tap(page, 'all-raptors');
  await tap(page, 'auto-max-thrust');
  await expect
    .poll(async () => Number(await page.locator(byTestId(readoutValueTestId('throttle'))).textContent()), {
      timeout: 30_000,
      intervals: [200],
    })
    .toBeGreaterThan(90);
  // Then long enough for the plume to reach its steady length: a particle lives
  // 0.32 s, so a third of a second is the whole of it.
  await page.waitForTimeout(1_500);
}

test('the vehicle and its plume are in the frame @mobile', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await underPower(page);

  const report = await readFrame(page, SPEC);
  const scale = await metrePixels(page);
  const message = describeFrame(report, scale);
  const fire = report.extents['fire']!;

  /*
    THE FINDING THIS MILESTONE STARTS FROM, as a test.

    On `reentry` today the same measurement returns found=false within four
    seconds of loading and never recovers, because the vehicle is off the left
    edge of the frame and everything drawn at its position went with it. That is
    a camera bug rather than a graphics one and it belongs to M9.2 — but this is
    the assertion that would have caught it three milestones ago.
  */
  expect(fire.found, `no engine fire anywhere in the frame\n${message}`).toBe(true);

  const centre = (fire.left + fire.right) / 2 / report.imageWidth;
  expect(centre, `the plume is at the edge of the frame, not in it\n${message}`).toBeGreaterThan(
    0.1,
  );
  expect(centre, `the plume is at the edge of the frame, not in it\n${message}`).toBeLessThan(0.9);
});

test('the plume has a measurable extent, in ship-lengths @mobile', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await underPower(page);

  const report = await readFrame(page, SPEC);
  const scale = await metrePixels(page);
  const message = describeFrame(report, scale);
  const heights = inVehicleHeights(report.extents['fire']!, scale);

  /*
    Measured today: 0.26 ship-lengths on the desktop project, 0.41 on a Pixel 7.
    A 50 m vehicle with a plume a fifth of its own length is the "candle" the
    plan describes, and M9.6 exists to raise this number past 1. The bound here
    is deliberately not 1: this test states that the plume EXISTS and is
    measured in the right unit, and M9.6's acceptance line is where the floor
    gets raised. A test that failed until a later task fixed it would be a
    broken build, not a measurement.
  */
  expect(heights, `the plume has no extent at all\n${message}`).toBeGreaterThan(0.05);
  expect(heights, `the plume fills the frame — check the emitter scale\n${message}`).toBeLessThan(3);
});

test('the cloud deck is there, and is brighter than the sky behind it @mobile', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await preset(page, 'booster-sep', { altitude: '6000', speedX: '60', speedY: '0' });

  const report = await readFrame(page, SPEC);
  const scale = await metrePixels(page);
  const message = describeFrame(report, scale);
  const deck = report.regions['deck']!;
  const sky = report.regions['sky']!;

  // Six kilometres is above CLOUD_ALTITUDE, so the deck is BELOW the vehicle and
  // lands in the middle of the frame with clear sky above it.
  expect(deck.meanLuma, `no cloud deck below the vehicle\n${message}`).toBeGreaterThan(
    sky.meanLuma + 10,
  );
  expect(deck.brightFraction, `the deck is not lit\n${message}`).toBeGreaterThan(0.02);

  /*
    The number M9.7 raises. Today the deck is eighteen `Graphics` puffs of three
    ellipses each, all at one tint and one alpha, so what spread there is comes
    from the sky showing between them rather than from the clouds having any
    structure of their own: 41.8 on the desktop project, 21.9 on a Pixel 7.
  */
  expect(deck.lumaSpread, `the deck is a single flat value\n${message}`).toBeGreaterThan(5);
});

test('the ground band is ground @mobile', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await preset(page, 'booster-sep', { altitude: '6000', speedX: '60', speedY: '0' });

  const report = await readFrame(page, SPEC);
  const scale = await metrePixels(page);
  const message = describeFrame(report, scale);
  const ground = report.regions['ground']!;

  // Opaque, mid-toned, and not the sky. Everything a band of earth has to be.
  expect(ground.meanLuma, `the ground band is unlit\n${message}`).toBeGreaterThan(80);
  expect(ground.meanLuma, `the ground band is blown out\n${message}`).toBeLessThan(210);
  expect(ground.darkFraction, `the ground band is night\n${message}`).toBeLessThan(0.2);

  /*
    AND THE MEASUREMENT M9.8 EXISTS TO MOVE, recorded here rather than asserted.

    At six kilometres this band is ONE COLOUR: luma spread 0.47 on the desktop
    project and 1.29 on a Pixel 7, a single tone bucket, and a 4-bit colour
    histogram in which one bin holds 100% of the pixels. No screenshot ever said
    that out loud, and it is the whole of M9.8's case.
  */
  expect(
    ground.topColours[0]!.fraction,
    `the ground band has gained structure — M9.8 has landed, so tighten this\n${message}`,
  ).toBeGreaterThan(0.2);
  console.log(
    `ground band flatness: spread ${ground.lumaSpread.toFixed(2)}, ` +
      `${ground.toneBuckets} tone bucket(s), top colour ${ground.topColours[0]!.rgb} ` +
      `at ${(ground.topColours[0]!.fraction * 100).toFixed(0)}%`,
  );
});
