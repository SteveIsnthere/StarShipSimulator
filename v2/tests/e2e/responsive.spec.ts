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
import { byTestId, readoutTestId, readoutValueTestId } from '../../src/ui/testids';
import { isPhoneLayout, openControls, openYoke, ready } from './helpers';
import { END_MS, EVENT_MS } from '../../src/hud/haptics';

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

/* ── M12.4: nothing on the overlay may sit on top of anything else ──────── */

/**
 * The elements that make up the overlay, by test id.
 *
 * Named rather than discovered, because "every element" is the wrong question:
 * an overlay is nested boxes, and a child is inside its parent by design. These
 * are the SIBLINGS — the things that are laid out against each other and whose
 * only relationship is that they must not collide.
 */
const OVERLAY = [
  readoutTestId('clock'),
  'cinematic-toggle',
  'mute-toggle',
  'open-black-box',
  'open-menu',
  // Only present in cinematic mode, which is why the test enters it: review
  // measured this row sitting on the trajectory map at 844x390, and a check
  // that never turns cinematic on would have shipped it green.
  'camera-modes',
  'timeline',
  'trajectory-map',
] as const;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** True when two boxes share any area at all. */
function intersects(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  );
}

test('no two overlay elements sit on top of each other @mobile', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  // Let the readouts fill: an element with no text has no width, and a strip of
  // zero-width boxes cannot overlap anything.
  await expect
    .poll(async () => (await page.locator(byTestId(readoutValueTestId('clock'))).textContent()) !== '', {
      timeout: 20_000,
    })
    .toBe(true);

  /*
    THE DEFECT THIS EXISTS FOR, stated so it cannot come back quietly. Until
    M12.4 the mission clock filled the top strip and the four top-right buttons
    were positioned absolutely over it, so on a phone the clock's digits sat
    UNDER the CINEMATIC button. It is in `docs/screenshot-phone.png`, it was
    there for two milestones, and nothing failed — because nothing asked. The
    fix was to put them in one flex row, which makes the collision impossible
    rather than unlikely; this is what says so, on all five projects.
  */
  const check = async (mode: string): Promise<string[]> => {
    const boxes = new Map<string, Box>();
    for (const id of OVERLAY) {
      const locator = page.locator(byTestId(id));
      if ((await locator.count()) === 0) continue;
      if (!(await locator.first().isVisible())) continue;
      const box = await locator.first().boundingBox();
      if (box && box.width > 0 && box.height > 0) boxes.set(id, box);
    }
    expect(boxes.size, `${mode}: the overlay is on screen`).toBeGreaterThan(4);

    const collisions: string[] = [];
    const ids = [...boxes.keys()];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = boxes.get(ids[i]!)!;
        const b = boxes.get(ids[j]!)!;
        if (intersects(a, b)) {
          collisions.push(
            `${mode}: ${ids[i]} [${a.x.toFixed(0)},${a.y.toFixed(0)} ${a.width.toFixed(0)}x${a.height.toFixed(0)}]` +
              ` overlaps ${ids[j]} [${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.width.toFixed(0)}x${b.height.toFixed(0)}]`,
          );
        }
      }
    }
    return collisions;
  };

  const plain = await check('flying');
  // And again in cinematic, which adds a row of camera buttons under the others.
  await page.locator(byTestId('cinematic-toggle')).click();
  await expect(page.locator(byTestId('camera-modes'))).toBeVisible();
  const cinematic = await check('cinematic');

  const collisions = [...plain, ...cinematic];
  expect(collisions, collisions.join('\n')).toEqual([]);
});

/**
 * M12.4 — the haptics reach the page, and stop when asked to.
 *
 * `navigator.vibrate` is not implemented in headless Chromium, so this replaces
 * it before the app loads and counts the calls. That is the honest limit of
 * what a browser test can say here: it proves the WIRING — that events reach
 * the platform call, once each, and that reduced motion silences them — and
 * says nothing about whether a phone actually buzzed, which no automated test
 * on any of these five projects could.
 */
test('mission events reach navigator.vibrate, one buzz per event @mobile', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __buzzes: number[] }).__buzzes = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        (window as unknown as { __buzzes: number[] }).__buzzes.push(
          Array.isArray(pattern) ? pattern[0]! : pattern,
        );
        return true;
      },
    });
  });

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  // Vibration is gated on a user gesture, like the audio. Nothing before one.
  expect(await page.evaluate(() => (window as unknown as { __buzzes: number[] }).__buzzes)).toEqual(
    [],
  );

  await page.mouse.click(5, 5);
  await expect(page.locator(byTestId('debrief'))).toHaveCount(1, { timeout: 90_000 });

  /*
    ONE PER EVENT, COUNTED OVER A FLIGHT THAT RAN ENTIRELY AFTER THE GESTURE.

    The first version asserted "more than none", which a dropped buzz would have
    passed. Counting against the timeline instead is the right idea and needs
    one more step to be true: the intro starts at page load and fires LANDING
    BURN on its first step, before anybody has touched the page — and vibration
    is gated on a gesture, so that event legitimately produces no buzz. Flying
    AGAIN from the card gives a whole flight inside the unlocked window, and the
    events of that flight are the ones that must correspond one to one.

    The count comes from the DEBRIEF CARD's event list rather than from the
    timeline's dots. The dots are the natural place to look and are the wrong
    one: the strip renders only the track for the loaded scenario, collapses to
    a line of text on a phone, and its dots are not all in the DOM at every
    viewport. The card lists exactly the events the timeline fired, on every
    project, and it is on screen at the moment this asks.
  */
  const before = (
    await page.evaluate(() => (window as unknown as { __buzzes: number[] }).__buzzes)
  ).length;

  await page.locator(byTestId('debrief-restart')).click();
  await expect(page.locator(byTestId('debrief'))).toHaveCount(0);
  await expect(page.locator(byTestId('debrief'))).toHaveCount(1, { timeout: 90_000 });

  const buzzes = (
    await page.evaluate(() => (window as unknown as { __buzzes: number[] }).__buzzes)
  ).slice(before);
  const fired = await page.locator(`${byTestId('debrief-events')} li`).count();

  expect(fired, 'the second flight fires events').toBeGreaterThan(0);
  expect(buzzes.length, `${fired} events, buzzes: ${buzzes.join(',')}`).toBe(fired);

  // Two lengths and no others, with the long one last: the flight ended.
  for (const ms of buzzes) expect([EVENT_MS, END_MS]).toContain(ms);
  expect(buzzes[buzzes.length - 1], `buzzes: ${buzzes.join(',')}`).toBe(END_MS);
});

test('and reduced motion silences them @mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    (window as unknown as { __buzzes: number[] }).__buzzes = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => {
        (window as unknown as { __buzzes: number[] }).__buzzes.push(1);
        return true;
      },
    });
  });

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await page.mouse.click(5, 5);
  await expect(page.locator(byTestId('debrief'))).toHaveCount(1, { timeout: 90_000 });

  // A phone buzzing in someone's hand is motion in the most literal sense a
  // web page has, and the setting is a request not to be moved.
  expect(
    await page.evaluate(() => (window as unknown as { __buzzes: number[] }).__buzzes),
  ).toEqual([]);
});
