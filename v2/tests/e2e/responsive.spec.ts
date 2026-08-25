/**
 * M6.6: the layout holds at every size it claims to.
 *
 * These run in the desktop project AND the four phone projects, and most of
 * them assert the same thing at every size — which is the point. A responsive
 * layout is not "it has media queries", it is "nothing breaks", and the two
 * ways it breaks are the same everywhere: something overflows sideways, or
 * something a finger needs is too small to hit.
 *
 * The handful of assertions that are genuinely about one layout are tagged
 * @portrait-only or @mobile-only and the config routes them accordingly.
 */
import { expect, test } from '@playwright/test';
import { byTestId, readoutValueTestId } from '../../src/ui/testids';
import { isPhoneLayout, openControls, openYoke, ready } from './helpers';

test('nothing overflows sideways, at any size @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // The single most common responsive failure, and the one that ruins a phone:
  // one element a few pixels too wide and the whole page rubber-bands.
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(overflow.scroll, 'the document must not scroll horizontally').toBeLessThanOrEqual(
    overflow.client,
  );
});

test('the overlay stays inside the viewport @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const viewport = page.viewportSize()!;
  // Elements pushed off the bottom edge are the phone-portrait failure mode:
  // the lower third is the tallest thing in the design and has the least room.
  for (const id of ['readout-speed', 'readout-altitude', 'timeline']) {
    const box = await page.locator(byTestId(id)).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.y + box!.height, `${id} bottom`).toBeLessThanOrEqual(viewport.height + 1);
    expect(box!.x, `${id} left`).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width, `${id} right`).toBeLessThanOrEqual(viewport.width + 1);
  }
});

test('every control a finger has to hit is big enough @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await openControls(page);

  // 44px is the floor the plan sets and the one both platform guidelines use.
  // Checked on the real laid-out boxes rather than on the CSS, because padding,
  // line-height and flex all get a vote.
  const SMALL: string[] = [];
  for (const id of [
    'raptor-0',
    'all-raptors',
    'engine-panel-toggle',
    'zoom-in',
    'zoom-out',
    'open-menu',
    'open-black-box',
    'cinematic-toggle',
  ]) {
    const box = await page.locator(byTestId(id)).boundingBox();
    if (!box) continue;
    if (box.height < 43.5) SMALL.push(`${id} ${box.height.toFixed(1)}px tall`);
  }
  expect(SMALL).toEqual([]);
});

const measureCanvas = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="world-canvas"]') as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    return { w: Math.round(rect.width), h: Math.round(rect.height) };
  });

test('the canvas fills the viewport @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const viewport = page.viewportSize()!;
  const canvas = await measureCanvas(page);
  expect(canvas.w).toBe(viewport.width);
  expect(canvas.h).toBe(viewport.height);
});

/**
 * Not tagged @mobile, and that is the point.
 *
 * `setViewportSize` does not resize a device context — Playwright's phone
 * projects carry a fixed viewport from the device descriptor, so this asked a
 * landscape Pixel to become portrait and measured the canvas still 863px wide.
 * The test was wrong, not the renderer.
 *
 * Rotation IS covered on phones, and better: portrait and landscape are
 * separate projects running the whole layout suite, which is a real rotation
 * rather than a simulated one. What is left for the desktop project is the
 * thing only it can check — that the renderer's resize listener fires at all.
 */
test('the renderer follows a window resize', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: viewport.height, height: viewport.width });
  await expect
    .poll(async () => (await measureCanvas(page)).w, { timeout: 5_000 })
    .toBe(viewport.height);
  expect((await measureCanvas(page)).h).toBe(viewport.width);

  await page.setViewportSize(viewport);
});

test('both flight panels are reachable, whatever the layout @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Capability parity, asked the way M6.6 makes it necessary to ask: on a rail
  // layout both are already open, on a phone each is one tap away. Either way
  // every control exists and can be operated.
  await openControls(page);
  await expect(page.locator(byTestId('throttle'))).toBeVisible();
  await expect(page.locator(byTestId('all-raptors'))).toBeVisible();

  await openYoke(page);
  await expect(page.locator(byTestId('yoke-pitch'))).toBeVisible();
  await expect(page.locator(byTestId('auto-land'))).toBeVisible();
});

test('the dials become digits and ticks on a phone @mobile @mobile-only @portrait-only', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  expect(await isPhoneLayout(page), 'this test wants the phone layout').toBe(true);

  // BROADCAST-UI-PLAN § 3: the 92px dial does not fit, so the arc's job passes
  // to a 3px line under the numeral. Both shapes are in the markup; CSS picks.
  const arc = page.locator('[data-metric="gauge-speed"]');
  const tick = page.locator('[data-metric="gauge-speed-bar"]');
  await expect(arc).not.toBeVisible();
  await expect(tick).toBeVisible();

  // And the tick is actually driven, rather than being decoration that happens
  // to be visible.
  const read = async () => Number(await tick.getAttribute('width'));
  const first = await read();
  expect(Number.isFinite(first)).toBe(true);
  await expect.poll(read, { timeout: 10_000, intervals: [150] }).not.toBe(first);

  // The numeral is still there, and still says what it said.
  await expect(page.locator(byTestId(readoutValueTestId('speed')))).not.toBeEmpty();
});

test('the timeline collapses to now and next on a phone @mobile @mobile-only @portrait-only', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  expect(await isPhoneLayout(page)).toBe(true);

  // Seven dots with seven labels do not fit 390px, so the rail goes and the
  // narration — which is the same information in words, and the accessible
  // version of it at every size — becomes the whole timeline.
  await expect(page.locator(byTestId('event-now'))).toBeVisible();
  await expect(page.locator(byTestId('event-now'))).not.toBeEmpty();
});

test('the panels are sheets, and only one opens at a time @mobile @mobile-only @portrait-only', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  expect(await isPhoneLayout(page)).toBe(true);

  const engines = page.locator(byTestId('throttle'));
  const yoke = page.locator(byTestId('yoke-pitch'));

  // Both start closed: the world is the point, and a sheet covers half of it.
  await expect(engines).not.toBeVisible();
  await expect(yoke).not.toBeVisible();

  await page.locator(byTestId('engine-panel-toggle')).click();
  await expect(engines).toBeVisible();

  // Opening the other closes the first. Two sheets stacked over a 390px screen
  // would leave nothing of the flight at all.
  await page.locator(byTestId('yoke-panel-toggle')).click();
  await expect(yoke).toBeVisible();
  await expect(engines).not.toBeVisible();
});

test('a closed sheet cannot be tabbed into @mobile @mobile-only @portrait-only', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  expect(await isPhoneLayout(page)).toBe(true);

  // Same trap as cinematic mode: a panel that is invisible but focusable puts
  // the keyboard somewhere the eye cannot follow.
  const focusable = await page.locator(byTestId('all-raptors')).evaluate((el) => {
    (el as HTMLElement).focus();
    return document.activeElement === el;
  });
  expect(focusable).toBe(false);
});

test('the menu is usable on a phone @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  await page.locator(byTestId('open-menu')).click();
  await expect(page.locator(byTestId('menu'))).toBeVisible();

  // A full-screen card that scrolls, rather than a sheet that clips. Every
  // preset must be reachable — the failure this guards is a fixed-height
  // container with the last preset below the fold and no way down to it.
  const preset = page.locator(byTestId('preset-landing-burn'));
  await preset.scrollIntoViewIfNeeded();
  await expect(preset).toBeVisible();

  const viewport = page.viewportSize()!;
  const box = (await preset.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.height, 'a preset card is a touch target').toBeGreaterThanOrEqual(43.5);

  await page.locator(byTestId('menu-close')).click();
  await expect(page.locator(byTestId('menu'))).toHaveCount(0);
});
