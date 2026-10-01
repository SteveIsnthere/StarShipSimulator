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
 *                  is what `plumeSpreadFactor` exists to do. 0.92 to 1.38
 *                  ship-lengths across, against 0.46 to 0.79 low down —
 *                  re-measured when the particle-drag debt was cleared and the
 *                  cone band stopped being nailed to the viewport.
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
import { throttleUpperLimit } from '../../src/core/constants';
import { ready, reveal, tap } from './helpers';
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
 * `warmOnly` excludes the stars, which are white and are everywhere in the
 * vacuum frame. The luma floor does two jobs: it excludes the dark sky around
 * them, and since the M9 look pass it is also what excludes the GROUND.
 *
 * THAT SECOND JOB USED TO BELONG TO THE COLOUR TEST, and it stopped working.
 * Warming `GROUND_COLOR` gave the terrain chroma of its own — red leads blue by
 * 62 there — so it started passing `warmOnly` and the plume measurement began
 * reporting nine ship-lengths of hillside. Raising the warmth margin instead
 * was tried and is worse: the hot part of a plume is nearly WHITE, so a margin
 * strict enough to drop the ground drops the core as well and the measurement
 * collapsed to 0.72.
 *
 * AND A LUMA FLOOR ALONE WAS WRONG TOO, which the browser said and the
 * arithmetic had not. `minLuma: 150` does keep the ground out, and it also cuts
 * the dim halo that is the whole subject of the vacuum measurement — the spread
 * assertion went from comfortable to 0.56 against 0.53 and failed on two
 * projects. Fire is two things at once here: a white-hot throat that only
 * brightness identifies, and a cool wide halo that only colour identifies.
 * `orWarmth` is the disjunction that admits both, and the ground satisfies
 * neither clause. *
 * AND THE LUMA FLOOR MOVED AT M9.15, from 150 to 200, because the number under
 * it was measured before the horizon was. "The brightest the ground ever gets
 * is luma 147" was true when it was written and false three tasks later: the
 * horizon wash mixes terrain toward the SKY, and the sky is the brightest thing
 * in the frame, so washed ground near the horizon now reaches luma 168. At a
 * floor of 150 the whole width of the terrain passed as fire and the plume
 * measured 12.6 ship-lengths across on a landscape phone.
 *
 * Re-measured rather than nudged: on that frame the brightest warm terrain
 * pixel is rgb(183,166,143) at luma 168.0 and the brightest pixel in the plume
 * column is 251.8. A floor of 200 sits between them with 32 of margin below and
 * 52 above, and the plume's cooler body is caught by `orWarmth` regardless of
 * how bright it is.
 */
const PLUME = { region: BELOW, minLuma: 200, orWarmth: 100, warmOnly: true };

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
  /*
    THE THROTTLE, HELD AT MAXIMUM BY HAND — not the Thrust Safe Guard, which is
    what this used to engage and is the reason this spec has been unreliable
    since it was written.

    `auto-max-thrust` is the safe guard: it holds the throttle at whatever keeps
    the vehicle inside its dynamic-pressure limit. That is exactly the right
    control for flying and exactly the wrong one for photographing a plume,
    because the subject here is a vehicle under FULL thrust and the guard's
    entire job is to take full thrust away as speed builds. Instrumented across
    the four samples of one run it read 87, 86, 84, 50 — and the plume, whose
    length scales with power through `PLUME_REACH`, went 1.90, 1.99, 0.79, 0.85
    ship-lengths with it. The measurement was photographing a half-throttled
    engine and reporting it as the plume.

    That is also why holding the ALTITUDE did not help when it was tried: the
    guard responds to dynamic pressure, so it is the SPEED that has to be held
    down, and nothing short of not engaging it does that.
  */
  await reveal(page, 'throttle');
  await page.locator(byTestId('throttle')).fill(String(throttleUpperLimit));
  await page.locator(byTestId('throttle')).dispatchEvent('input');
  await expect
    .poll(
      async () => Number(await page.locator(byTestId(readoutValueTestId('throttle'))).textContent()),
      { timeout: 30_000, intervals: [200] },
    )
    .toBeGreaterThan(90);
  /*
    Long enough for the emitters to reach steady state AND for the vehicle to
    start climbing, which points the flight-path marker away from the box —
    measured on the SIMULATION'S clock, not the wall's. This was
    `waitForTimeout(2_500)`, and it failed the vacuum bloom twice at M11.6, on
    two different projects, with a plume 0.89 long and 0.39 across against
    1.78 and 0.78 on a clean run: under a loaded machine the loop dilates
    simulated time, so two and a half seconds of wall clock were less than a
    second of flight and the vacuum emitters — the slow, wide ones — were
    photographed starved. The T+ readout is the simulation's own clock; three
    seconds of it is three seconds of emission whatever the frame rate.
  */
  const clock = page.locator(byTestId(readoutValueTestId('clock')));
  const seconds = async (): Promise<number> => {
    const text = (await clock.textContent()) ?? '';
    const parts = text.trim().split(':').map(Number);
    return parts.reduce((total, part) => total * 60 + (Number.isFinite(part) ? part : 0), 0);
  };
  const start = await seconds();
  await expect.poll(seconds, { timeout: 60_000, intervals: [200] }).toBeGreaterThanOrEqual(start + 3);
}

/**
 * How deep the cone is measured, in ship-lengths below the nozzle.
 *
 * THIS USED TO BE A FIXED RECTANGLE IN THE VIEWPORT — `{x: 0.3, y: 0.56, width:
 * 0.4, height: 0.08}` — and it was the noisiest measurement in this repository.
 * The reasoning behind it was right: the widest part of a long plume is far
 * from the nozzle, so a whole-plume width says more about where the vehicle
 * drifted to than about the cone. The implementation was wrong, because a
 * rectangle nailed to the viewport is not "just below the nozzle" on a vehicle
 * the camera is chasing at full thrust. Four frames 350 ms apart measured one
 * cone at 0.92, 0.74, 0.49 and 0.53 ship-lengths; frames where the strip missed
 * the plume altogether came back 0.00, and there is one of those in most runs.
 *
 * `topBandPx` (tests/e2e/pixels.ts) anchors the band to the plume's OWN topmost
 * lit row, which is the nozzle. Four tenths of a ship-length below it is on the
 * cone in every frame, whatever the camera is doing.
 */
const CONE_DEPTH_SHIP_LENGTHS = 0.4;

/** The plume's extent and width, in ship-lengths, as a median of four frames. */
async function plume(page: Page): Promise<{ span: number; width: number; last: string }> {
  const spans: number[] = [];
  const widths: number[] = [];
  let clamped = 0;
  const throttles: number[] = [];
  const boxes: string[] = [];
  let last = '';
  /*
    FOUR SAMPLES, AND IT CANNOT BE MORE — which is worth recording because the
    obvious improvement was tried and does not work.

    The vacuum-spread median straddles its bound on one project: three runs on
    pixel-landscape measured the cone at 1.05, 1.13 and 1.15 ship-lengths across
    and one measured 0.85. A plume is stochastic — its width at an instant is
    where a few hundred pooled particles happen to be — so the right answer
    looks like a better estimator rather than a looser bound.

    It is not available here. Each sample is a screenshot plus an in-page decode,
    which under software WebGL costs the better part of a second of FLIGHT, and
    the subject is a vehicle under full thrust. Seven samples carried it from
    2000 m to 4800 m and clean out of the measurement box — "no plume at all",
    which is true and is not the question. Cutting the spacing from 350 ms to
    120 ms changed nothing, because the wait was never what the time was going
    on. More evidence costs altitude, and altitude is the thing being measured
    against.
  */
  for (let i = 0; i < 4; i++) {
    /*
      THE SCALE FIRST, because the band is asked for in image pixels and its
      depth is a ship-length. The vehicle moves between the two calls; at four
      tenths of a ship-length the difference that makes is a pixel or two, and
      the alternative — publishing the scale into the page so one round trip
      could do both — is a production change for a test's convenience.
    */
    const scale = await metrePixels(page);
    /*
      THE SUBJECT, RE-CHECKED ON EVERY FRAME. The failure this spec spent three
      milestones on was never a plume that got shorter; it was a throttle that
      came off while the camera was running, and nothing in the assertion could
      see the difference. Now a sample taken off full thrust fails as itself.
    */
    throttles.push(
      Number(await page.locator(byTestId(readoutValueTestId('throttle'))).textContent()),
    );
    const report = await readFrame(page, {
      regions: { below: BELOW },
      extents: {
        plume: { ...PLUME, topBandPx: CONE_DEPTH_SHIP_LENGTHS * scale.vehicleHeightPx },
      },
      map: { cols: 44, rows: 22 },
    });
    const found = report.extents['plume']!;
    expect(found.found, `no plume at all\n${describeFrame(report, scale)}`).toBe(true);
    spans.push(inVehicleHeights(found, scale));
    widths.push(found.bandWidthPx / scale.vehicleHeightPx);
    /*
      THE ONE WAY THE ANCHOR CAN LIE, counted rather than left implied.

      The band starts at the plume's topmost lit row, and that row is clipped to
      the top of `BELOW`. If the camera ever lags far enough that the nozzle
      sits above y = 0.52, the anchor is the region edge and the band is a fixed
      viewport strip again — the very thing it replaced. It is not a wrong
      answer, it is a less well-aimed one, and the count goes in the line this
      helper prints so a drifting number has somewhere to be explained from.
    */
    if (found.top <= Math.round(BELOW.y * report.imageHeight)) clamped += 1;
    boxes.push(`(${found.left},${found.top})-(${found.right},${found.bottom})n${found.count}`);
    last = describeFrame(report, scale);
    await page.waitForTimeout(350);
  }
  expect(
    Math.min(...throttles),
    `the throttle came off mid-measurement: ${throttles.join('/')}`,
  ).toBeGreaterThan(90);
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  const span = median(spans);
  const width = median(widths);
  /*
    PRINTED ON SUCCESS, not only on failure.

    These two numbers are what the spec is for, and until the particle-drag debt
    was cleared they were only ever visible when they had already gone wrong: the
    measurement lives in an `expect` message, and a passing `expect` says
    nothing. The debt's acceptance line asks for before-and-after numbers on both
    plume specs, which is impossible to satisfy from a green run that prints no
    numbers. One line per measurement, with the project on it, and the medians
    beside the samples they came from.
  */
  const info = test.info();
  console.log(
    `[plume] ${info.project.name} · ${info.title}: ` +
      `${span.toFixed(2)} long, ${width.toFixed(2)} across ` +
      `(spans ${spans.map((n) => n.toFixed(2)).join('/')}, ` +
      `widths ${widths.map((n) => n.toFixed(2)).join('/')}, ` +
      `${clamped}/4 anchored to the region edge; throttle ${throttles.join('/')}; ${boxes.join(' ')})`,
  );
  return { span, width, last };
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

    WIDTH IN SHIP-LENGTHS, measured in a band anchored to the nozzle — see
    `CONE_DEPTH_SHIP_LENGTHS` for why the whole-plume width says nothing and why
    the fixed viewport strip that preceded it said it too unreliably.

    RE-MEASURED when the particle-drag debt was cleared, because the numbers
    that used to be here were taken through the old strip and are not comparable
    with these. Ten runs, five projects twice each, sea level -> vacuum:

      desktop           0.46, 0.53  ->  0.92, 0.92
      Pixel portrait    0.66, 0.78  ->  1.38, 1.14
      Pixel landscape   0.74, 0.69  ->  1.07, 0.93
      iPhone portrait   0.73, 0.72  ->  1.08, 1.25
      iPhone landscape  0.77, 0.79  ->  1.30, 1.10

    Ratios of 1.35 to 2.09 against a bound of 1.2 — the worst case has 12% of
    margin, where the same ten runs through the old strip ranged 1.10 to 1.62
    and failed this bound twice. The instrument moved, not the picture.

    Aspect — width over length — was tried as the more shape-like statistic and
    is worse: in vacuum the black sky lets the faint tail register so the LENGTH
    grows too, which put the desktop project at exactly 1.25 with nothing to
    spare.
  */
  const shape =
    `${message}\n  aspect: ${(low.width / low.span).toFixed(2)} low, ` +
    `${(vacuum.width / vacuum.span).toFixed(2)} vacuum`;
  console.log(shape);
  expect(vacuum.width, shape).toBeGreaterThan(low.width * 1.2);
  expect(vacuum.width, shape).toBeGreaterThan(0.2);
});
