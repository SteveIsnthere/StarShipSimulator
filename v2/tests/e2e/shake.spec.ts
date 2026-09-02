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
 * FOUR DESIGN DECISIONS, each of which came out of a measurement that did not
 * work.
 *
 * 0. THE SUBJECT HAS TO HOLD STILL, and that is a fact about the simulation,
 *    not about the view. Decision 1 below only works if the airframe does the
 *    same thing in both runs and does little of it; when M11.8 gave the vehicle
 *    a centre of mass that moves with its propellant, the old subject started
 *    tumbling at 55 deg/s and the comparison became a measurement of the
 *    airframe — 12.3 px shaking against 10.0 still. The state is now chosen so
 *    that it does not, is stated once in `./shake-subject.ts`, and is asserted
 *    in Node in `tests/view/dynamic-pressure.test.ts`: a future change to
 *    `core/` that destabilises it fails in a second rather than fifty minutes.
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
 *    Its AMPLITUDE is untouched. Its frequency is not: `updateCamera` runs from
 *    `onStep`, so the oscillators slow with everything else, and a sampler has
 *    to be told about that rather than left to inherit it. See
 *    `SAMPLE_INTERVAL_MS`.
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
import { HULL_SILHOUETTE, describeFrame, readFrame, type Region } from './pixels';
import { MAX_Q_FIELDS, MAX_Q_PRESET, SUBJECT_WINDOW_SECONDS } from './shake-subject';

type Page = import('@playwright/test').Page;

/** Where the vehicle is, in a frame the camera is holding it in. */
const SUBJECT: Region = { x: 0.3, y: 0.22, width: 0.4, height: 0.3 };

/**
 * The whole world, for the at-rest control.
 *
 * A vehicle standing on the pad sits LOW in the frame — ground mode pins the
 * camera and the ship is near the bottom — so the narrow band above is the wrong
 * place to look for it. It is also the wrong QUESTION there: at rest nothing in
 * the frame moves, so any identifiable feature holding still proves the claim,
 * and the ground holding still proves it more thoroughly than the ship would.
 */
const WHOLE: Region = { x: 0.1, y: 0.15, width: 0.8, height: 0.8 };

/**
 * The vehicle silhouette, as a luma band.
 *
 * Neither sky nor cloud: the drawn Starship sits between 20 and 110 against a
 * sky that is brighter than that everywhere, and clouds well past 150.
 *
 * KEPT ABOVE THE HORIZON, which the region above is narrower than it was for.
 * The M9 look pass warmed and darkened the ground, and the far-earth band
 * promptly walked into this luma window — a 907 px wide "silhouette" that was
 * terrain. `excludeWarm` throws out the bright half of it; the region is what
 * keeps the dark half out, because dark ground is not warm and no colour test
 * can separate it from a dark vehicle.
 */
const SILHOUETTE = { region: SUBJECT, ...HULL_SILHOUETTE };

/**
 * Configure a flight from the editor, optionally in slow motion from step one.
 *
 * ONE MENU VISIT, and at M11.9 that became the point rather than a tidiness.
 * The time-warp control lives in the same panel as the editor and survives
 * `Configure & fly`, which rebuilds the flight and does not touch it — so
 * setting the rate BEFORE configuring means the flight has never run at full
 * speed. The old shape did it in two visits afterwards, and paid two to four
 * seconds of simulated time for the settling wait and the second visit's clicks
 * before the first screenshot: most of the window the subject is flat in, spent
 * on menu latency. See `SUBJECT_WINDOW_SECONDS` in `./shake-subject.ts`.
 *
 * @param settleMs wall-clock milliseconds to let the picture settle. At one
 *   ninth this is a ninth of that in flight, which is the whole trick: the
 *   camera converges on frames, the airframe evolves on `dt`.
 */
async function preset(
  page: Page,
  id: string,
  fields: Record<string, string>,
  options: { slow?: boolean; settleMs?: number } = {},
): Promise<void> {
  await page.locator(byTestId('open-menu')).click();
  if (options.slow === true) {
    await page.locator(byTestId('menu-time-direction')).click();
    await page.locator(byTestId('menu-time-rate')).fill('9');
    await expect(page.locator(byTestId('menu-time-readout'))).toHaveText(/1\/9x/);
  }
  await page.locator(byTestId(`preset-${id}`)).click();
  for (const [name, value] of Object.entries(fields)) {
    await page.locator(byTestId(`field-${name}`)).fill(value);
  }
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();
  await page.waitForTimeout(options.settleMs ?? 2_000);
}

/** The mission clock, in seconds. The simulation's own time, not the wall's. */
async function missionSeconds(page: Page): Promise<number> {
  const text = (await page.locator(byTestId(readoutValueTestId('clock'))).textContent()) ?? '';
  return text
    .trim()
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + (Number.isFinite(part) ? part : 0), 0);
}

/**
 * The range of a series after a least-squares QUADRATIC is removed.
 *
 * A LINE IS NOT ENOUGH, and that is a fact about the flight rather than about
 * statistics. The vehicle is falling under gravity while this samples, so its
 * screen position is a parabola; removing a straight line leaves the curvature
 * behind, and on the landscape phone projects — whose frames are only 360 CSS
 * pixels tall, so the shake is barely two of them — that leftover curve was the
 * same size as the signal. Measured on `pixel-landscape`: 3.1 px of wander with
 * the shake on against 2.1 with it off, which separates nothing.
 *
 * A quadratic removes the fall as well as the drift and leaves the oscillation,
 * which is the only part that is the shake.
 *
 * Solved by normal equations on a 3x3 — small, fixed, and worth writing out
 * rather than reaching for a dependency to fit sixteen points.
 */
function detrendedRange(values: readonly number[]): number {
  const n = values.length;
  // Sums of i^0..i^4 and of v, i*v, i^2*v.
  const s: number[] = [0, 0, 0, 0, 0];
  const t: number[] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const x = i - (n - 1) / 2;
    let p = 1;
    for (let k = 0; k < 5; k++) {
      s[k]! += p;
      if (k < 3) t[k]! += p * values[i]!;
      p *= x;
    }
  }
  // [s0 s1 s2; s1 s2 s3; s2 s3 s4] [c0 c1 c2]^T = [t0 t1 t2]^T
  const m = [
    [s[0]!, s[1]!, s[2]!, t[0]!],
    [s[1]!, s[2]!, s[3]!, t[1]!],
    [s[2]!, s[3]!, s[4]!, t[2]!],
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(m[row]![col]!) > Math.abs(m[pivot]![col]!)) pivot = row;
    }
    const swap = m[col]!;
    m[col] = m[pivot]!;
    m[pivot] = swap;
    const lead = m[col]![col]!;
    if (Math.abs(lead) < 1e-12) continue;
    for (let k = col; k < 4; k++) m[col]![k]! /= lead;
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const factor = m[row]![col]!;
      for (let k = col; k < 4; k++) m[row]![k]! -= factor * m[col]![k]!;
    }
  }
  const c = [m[0]![3]!, m[1]![3]!, m[2]![3]!];

  const residuals = values
    .map((v, i) => {
      const x = i - (n - 1) / 2;
      return v - (c[0]! + c[1]! * x + c[2]! * x * x);
    })
    .sort((a, b) => a - b)
    // One sample from each end: a single misdetection must not decide this.
    .slice(1, -1);
  return residuals[residuals.length - 1]! - residuals[0]!;
}

/**
 * ms between samples, PACED rather than whatever the frames happen to cost.
 *
 * The shake is two sines at 6.2 and 2.5 Hz of simulated time, which at one
 * ninth are 0.69 and 0.28 Hz on the wall — a dominant period of 1.45 seconds.
 * A sampler has to sit inside that, and the first version of this burst did
 * not: `readFrame` with a 48x16 luminance map costs about 1.7 s per frame on
 * this machine, so sixteen samples were spaced 1.7 s apart and ALIASED the
 * thing they were measuring, spending three simulated seconds to do it.
 *
 * So the map — used by exactly one frame, the one quoted in a failure — is
 * asked for only on that frame, and the interval is set here instead of being
 * an accident of how fast the machine renders. 450 ms gives about three samples
 * per period and spans five of them.
 *
 * M10.12 made frames cheaper and the measurement got WORSE, because the
 * sampling window shrank with them and nothing held it: the test then failed by
 * exactly zero margin. This is the same optimisation with the missing half
 * added — cheap frames, and an interval that is stated rather than inherited.
 * A slow machine now costs padding, not window.
 */
const SAMPLE_INTERVAL_MS = 450;

/** How much the silhouette moves vertically, once its steady drift is removed. */
async function verticalWander(
  page: Page,
  query: typeof SILHOUETTE = SILHOUETTE,
): Promise<{ px: number; last: string; tops: number[] }> {
  const tops: number[] = [];
  let last = '';
  for (let i = 0; i < 16; i++) {
    const started = Date.now();
    const report = await readFrame(page, {
      extents: { ship: query },
      // The map is for the human reading a failure, and only the last frame's
      // is ever printed. Asking for sixteen of them is what made the sampler
      // slower than the signal.
      ...(i === 15 ? { map: { cols: 48, rows: 16 } } : {}),
    });
    const ship = report.extents['ship']!;
    expect(ship.found, `no vehicle silhouette to track\n${describeFrame(report)}`).toBe(true);
    tops.push(ship.top);
    last = describeFrame(report);
    const spent = Date.now() - started;
    if (spent < SAMPLE_INTERVAL_MS) await page.waitForTimeout(SAMPLE_INTERVAL_MS - spent);
  }
  return { px: detrendedRange(tops), last, tops };
}

/**
 * Ten kilometres at 368 m/s nose-first and nearly dry, which is 27 kPa.
 *
 * The state, and the argument for it, live in `./shake-subject.ts`, because it
 * is a claim about the SIMULATION rather than about the picture and is asserted
 * in Node — see `tests/view/dynamic-pressure.test.ts`. The short version: this
 * comparison only measures the lens if the airframe holds still while it is
 * photographed, and M11.8 made the previous subject depart at 55 deg/s.
 */
async function nearMaxQ(page: Page): Promise<void> {
  // Six wall seconds of settling, which at one ninth is 0.67 of a simulated one
  // — the camera gets the frames it needs to converge, the airframe barely
  // moves. The old two seconds at full rate cost three times as much flight.
  await preset(page, MAX_Q_PRESET, MAX_Q_FIELDS, { slow: true, settleMs: 6_000 });
  await expect
    .poll(
      async () =>
        Number(await page.locator(byTestId(readoutValueTestId('dynamicPressure'))).textContent()),
      { timeout: 20_000, intervals: [200] },
    )
    .toBeGreaterThan(15);
}

test('the frame shakes near max-Q, and holds still when asked not to @mobile', async ({ page }) => {
  /**
   * Seven minutes, and the number is measured rather than picked. M10.8.
   *
   * This is the most expensive test in the suite: it flies to max-Q TWICE, once
   * normally and once under reduced motion, and reads a pixel silhouette on
   * every sampled frame of both. Measured cost:
   *
   *     alone, one worker, idle box        2.7 min
   *     chromium, under two workers        3.0 min
   *     pixel-portrait, under two workers  3.5 min
   *     pixel-landscape, under two workers TIMED OUT at the old 240 s budget,
   *                                        in two separate full runs
   *
   * The old budget was 4.0 min, which left about 15% of headroom over the idle
   * cost and none at all under parallel load on a four-CPU box. The assertion
   * below is UNCHANGED and still fails if the frame does not shake — what was
   * failing was the clock, not the claim: the same test passes on three other
   * projects in the same run, and alone on this one.
   *
   * Widening a budget to get green is normally how a real regression gets
   * hidden, so the distinction matters: this is not a test that fails when
   * given time. It is a test that was not given enough.
   */
  test.setTimeout(420_000);

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await nearMaxQ(page);
  const shaking = await verticalWander(page);
  const shakingClock = await missionSeconds(page);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await nearMaxQ(page);
  const still = await verticalWander(page);
  const stillClock = await missionSeconds(page);

  const report =
    `shaking ${shaking.px.toFixed(1)} px vs reduced motion ${still.px.toFixed(1)} px\n` +
    `  shaking tops: ${shaking.tops.join(' ')}\n  reduced tops: ${still.tops.join(' ')}\n` +
    shaking.last;

  // Before M9.3 the amplitude at this dynamic pressure was 0.0007 of 0.6% of a
  // viewport — four thousandths of a pixel — and these two numbers were the
  // same measurement twice.
  /*
    THE WINDOW, CHECKED RATHER THAN ASSUMED.

    Everything below rests on the vehicle holding its attitude while it is
    photographed, and that is only true for as long as `SUBJECT_WINDOW_SECONDS`
    of flight — `tests/view/dynamic-pressure.test.ts` replays the same state and
    asserts exactly that far and no further. Nothing in Playwright bounds how
    much simulated time a run consumes, so if a slow machine, a retry, or a
    future edit spends more, the guard stops covering the thing it guards and
    this comparison quietly goes back to measuring an airframe.

    So the run says how far it actually got. Both numbers, because a failure
    here should name which of the two runs overran.
  */
  expect(
    Math.max(shakingClock, stillClock),
    `ran past the window the subject is flat in: T+${shakingClock}s shaking, ` +
      `T+${stillClock}s reduced, against ${SUBJECT_WINDOW_SECONDS}s guarded in ` +
      'tests/view/dynamic-pressure.test.ts',
  ).toBeLessThanOrEqual(SUBJECT_WINDOW_SECONDS);

  expect(shaking.px, report).toBeGreaterThan(1.5);

  /*
    THE CONTROL HAS TO BE STILL, and this is the assertion M11.8 needed and did
    not have. When the subject started tumbling, `still` went from under a pixel
    to 10 of them and the test failed on the line BELOW — reporting a shake that
    had stopped separating, when what had actually happened was that its
    reference had started moving. A bound here says which of the two it is.

    Six pixels, against 1.0 to 3.0 measured across the five projects: loose
    enough for a slow machine's longer burst and a third of what the departing
    airframe drew.
  */
  expect(still.px, report).toBeLessThan(6);

  /*
    One and a half times the control plus a pixel of slack — UNCHANGED, after
    M11.9 tried to raise it to 2 and withdrew that on the evidence.

    Worth recording, because the withdrawal is the honest half. The redesigned
    subject separates far better than the one it replaced — the ratios below run
    2.7x to 12.4x, against 1.2x for the departing airframe — and 2x looked
    plainly affordable on the first five measurements. It was not: those five
    were taken before the sampling interval was fixed, and across ten
    measurements on the final code the worst case is a run reading 5.4 px
    against 2.0, which clears 2x by 13%. A pixel measurement that passes by 13%
    on one machine fails on another, and a flaky test costs more than a slightly
    loose one.

    Ten measurements, two full runs, all five projects:

        chromium           4.2 px shaking vs 0.8 still    5.3x
        pixel-portrait    18.6                  1.5      12.4x
        pixel-landscape   17.4 / 5.4            2.2 / 2.0  7.9x / 2.7x
        iphone-portrait    8.1                  2.5        3.2x
        iphone-landscape   7.7                  1.8        4.3x

    What the residual is now is the vehicle FALLING and the camera following,
    both smooth; nothing in it is the airframe. The claim this line makes is
    still the one it has always made, and the new bound above — that the control
    itself stays under 6 px — is where M11.9's tightening actually went.
  */
  expect(shaking.px, report).toBeGreaterThan(still.px * 1.5 + 0.8);
});

test('and does not shake a vehicle standing on the ground @mobile', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Both sources of shake are zero here: no air load and no thrust. If the
  // picture moves in this state, something other than the airframe is moving it.
  await preset(page, 'landing-burn', { altitude: '0', speedX: '0', speedY: '0' });
  await page.waitForTimeout(2_000);
  const resting = await verticalWander(page, { ...SILHOUETTE, region: WHOLE, excludeWarm: false });

  expect(
    resting.px,
    `${resting.px.toFixed(1)} px of wander at rest\n  tops: ${resting.tops.join(' ')}\n${resting.last}`,
  ).toBeLessThanOrEqual(1);
});
