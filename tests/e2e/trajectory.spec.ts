/**
 * M7.1: the trajectory map, in a browser.
 *
 * `tests/hud/trajectory.test.ts` proves the maths and replays the seven goldens
 * through the draw against a stub. What it cannot prove is that any of it is
 * WIRED — that a real canvas exists, that the tick reaches it, that the panel
 * remembers whether you wanted it. That is this file.
 *
 * HOW A CANVAS IS ASSERTED. It is not, directly: pixels can only be compared
 * with other pixels, and a spec that did would go red for a colour change while
 * staying green with a frozen marker. So the renderer writes what it is showing
 * onto the panel as `data-marker` and `data-span` (diffed, like every other
 * attribute in `hud/`), and those are what the two claims below read — the
 * marker moved, and the map re-ranged as the flight grew.
 */
import { expect, test } from '@playwright/test';
import { byTestId } from '../../src/ui/testids';
import { ready } from './helpers';

const MAP = byTestId('trajectory-map');
const TOGGLE = byTestId('map-toggle');

/**
 * Make the map visible whatever this project's layout starts it at, and wait
 * until it has actually drawn.
 *
 * The waiting is not politeness. A map that starts folded — which is every
 * phone project — has a zero-height frame, so the canvas is sized by the
 * ResizeObserver that fires AFTER the panel is revealed, and the first draw
 * comes a tick after that. A spec that read the canvas straight after clicking
 * would be measuring the moment before the map exists.
 */
async function open(page: import('@playwright/test').Page): Promise<void> {
  const expanded = await page.locator(TOGGLE).getAttribute('aria-expanded');
  if (expanded !== 'true') await page.locator(TOGGLE).click();
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(MAP)).toHaveAttribute('data-marker', /\d/);
}

test('the canvas is real and has pixels @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await open(page);

  const size = await page.locator(byTestId('map-canvas')).evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    return { width: canvas.width, height: canvas.height, css: canvas.getBoundingClientRect() };
  });
  // Sized in DEVICE pixels by the component; the exact numbers are the
  // layout's, but a canvas that got sized to nothing is zero.
  expect(size.width).toBeGreaterThan(60);
  expect(size.height).toBeGreaterThan(30);
  // And sized to its box rather than left at the 300x150 the HTML spec gives an
  // unsized canvas — which would silently letterbox everything drawn into it.
  expect(size.width / size.css.width).toBeGreaterThanOrEqual(1);
});

test('the marker moves as the vehicle flies @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await open(page);

  // The intro demo flies itself, which is why it is the soul of the thing and
  // why this spec needs no controls. `open()` has already waited for the first
  // draw, so this is a position rather than an absence.
  const first = await page.locator(MAP).getAttribute('data-marker');

  await expect
    .poll(async () => page.locator(MAP).getAttribute('data-marker'), { timeout: 15_000 })
    .not.toBe(first);
});

test('the map re-ranges as the flight grows @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await open(page);

  /*
    A stage separation is 60-odd km up and moving fast downrange, so the extent
    has to travel a long way as the flight runs on; a map with a fixed range
    would show a dot in a corner for a minute.

    A preset FILLS the editor rather than flying it (tools.js:230 — the pilot
    still presses Configure), so both clicks are needed. Configure is also what
    clears the recorder, which is the map's trail.
  */
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('preset-booster-sep')).click();
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();

  const spans = new Set<string>();
  const started = Date.now();
  while (Date.now() - started < 25_000 && spans.size < 2) {
    const span = await page.locator(MAP).getAttribute('data-span');
    if (span) spans.add(span);
    await page.waitForTimeout(250);
  }
  expect(spans.size, `extents seen: ${[...spans].join(' ')}`).toBeGreaterThanOrEqual(2);

  /*
    And it SNAPPED rather than slid. `niceSpan` rounds every extent to 1, 2 or
    5 times a power of ten, which is what stops the labels and the whole
    picture sliding on every frame — an extent that tracked its content
    continuously would be unreadable. So every value seen must be one of those,
    and there must be a handful of them rather than the hundreds a continuous
    range would have produced in twenty-five seconds.
  */
  const SNAPPED = /^(1|2|5)0*x(1|2|5)0*$/;
  for (const span of spans) {
    // Below the floors the extent is MIN_SPAN_X x MIN_SPAN_Y, which is 1000x500
    // — itself a snapped pair, so the same grammar covers it.
    expect(span, `extent ${span} is not a decade step`).toMatch(SNAPPED);
  }
  expect(spans.size).toBeLessThan(40);
});

test('the trail grows behind the vehicle @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await open(page);

  /*
    The trail is measured by the number of points it is STROKED from, which the
    renderer reports, rather than by counting lit pixels on the canvas.

    Counting pixels was the first version and it was wrong in a way worth
    recording: M7.2's predicted path puts ink on the same canvas, and as the
    prediction converges the map re-ranges under it — so the lit-pixel total can
    FALL while the trail is growing. The measure has to be of the thing being
    claimed.
  */
  const points = async () => Number((await page.locator(MAP).getAttribute('data-trail')) ?? -1);

  await expect.poll(points, { timeout: 10_000 }).toBeGreaterThanOrEqual(0);
  const before = await points();

  await expect
    .poll(points, { timeout: 20_000, message: `trail started at ${before} points` })
    .toBeGreaterThan(before);

  // And it is genuinely being painted, not merely counted.
  const ink = await page.locator(byTestId('map-canvas')).evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return -1;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 8) lit += 1;
    return lit;
  });
  expect(ink).toBeGreaterThan(0);
});

test('the collapse is remembered across a reload @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const toggle = page.locator(TOGGLE);
  const frame = page.locator(byTestId('map-canvas'));

  // Whatever this layout starts at, flip it and check the flip took.
  const started = (await toggle.getAttribute('aria-expanded')) === 'true';
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', String(!started));
  if (started) await expect(frame).toBeHidden();
  else await expect(frame).toBeVisible();

  await page.reload({ waitUntil: 'load' });
  await ready(page);

  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-expanded', String(!started));
});

test('a collapsed map is not drawn into @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await open(page);

  const marker = async () => page.locator(MAP).getAttribute('data-marker');

  await page.locator(TOGGLE).click();
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-expanded', 'false');

  // The tick skips a hidden map entirely, so its reported position freezes.
  // This is the assertion that the collapse actually saves the work rather
  // than only hiding it — the thing a phone is collapsing it for.
  const frozen = await marker();
  await page.waitForTimeout(1_500);
  expect(await marker()).toBe(frozen);
});

test('the map starts folded where there is no room for it @mobile-only', async ({ page }) => {
  // On a phone the lower third has 390px of screen to spend and a map is the
  // first thing that should not be spending it. On a desktop it is on.
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-expanded', 'false');
});

test('the map starts open where there is room', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-expanded', 'true');
});

/* ── M7.2: the predicted path ──────────────────────────────────────────── */

test('the map says where the flight is going, not only where it has been @mobile', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await open(page);

  // The intro is an auto-landing inside the atmosphere, so there is a real
  // touchdown to predict and a miss distance to read.
  await expect(page.locator(MAP)).toHaveAttribute('data-predict', /^touchdown:-?\d+$/);
});

test('the prediction tracks the flight rather than sitting still @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await open(page);

  const predict = async () => page.locator(MAP).getAttribute('data-predict');
  const first = await predict();

  // A prediction that never moved would be a decoration. It moves because the
  // vehicle is burning — an unpowered continuation is exactly the thing a
  // landing burn is changing.
  await expect.poll(predict, { timeout: 20_000 }).not.toBe(first);
});

test('an orbit is told it is an orbit @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await open(page);

  // The acceptance line's own case: a preset that never comes down must show
  // no-solution rather than a wrong number.
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('preset-circularize')).click();
  await page.locator(byTestId('menu-configure')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();

  await expect(page.locator(MAP)).toHaveAttribute('data-predict', /^none:(orbit|out-of-domain)$/);
});
