/**
 * M6.2: the lower third, in a real browser.
 *
 * The unit tests prove the metrics are correct functions of SimState and that
 * the binder diffs them. What only a browser can show is that the wiring holds:
 * that Svelte rendered the skeleton, that the resolver found the arcs and the
 * dots, and that the one rAF subscriber is writing attributes into a live page.
 *
 * That is the same argument M4.1 made for the readouts, and the same failure it
 * protects against — a HUD that is right in Node and blank on screen.
 */
import { expect, test } from '@playwright/test';
import { byTestId, metricSelector, readoutValueTestId } from '../../src/ui/testids';

async function ready(page: import('@playwright/test').Page) {
  await expect
    .poll(
      async () => (await page.locator(byTestId(readoutValueTestId('altitude'))).textContent()) !== '',
      { timeout: 15_000 },
    )
    .toBe(true);
}

test('the old top-left readout block is gone', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // The M4.1 HUD was `.hud`, a thirteen-row grid pinned to the top-left corner.
  // BROADCAST-UI-PLAN § 1: the world fills the frame and the UI annotates it
  // from the edges. Nothing may sit up there any more.
  await expect(page.locator('.hud')).toHaveCount(0);

  const box = await page.locator(byTestId('readout-speed')).boundingBox();
  const viewport = page.viewportSize()!;
  expect(box, 'the speed gauge should be laid out').not.toBeNull();
  // Bottom half of the screen — the lower third, not the top-left corner.
  expect(box!.y).toBeGreaterThan(viewport.height / 2);
});

test('the gauge arcs move as the flight does', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const arc = page.locator(metricSelector('gauge-altitude'));
  await expect(arc).toHaveCount(1);

  // The intro is a descent, so the altitude arc must shrink. Reading the
  // attribute is the point: it proves the METRIC binder is running, which no
  // text readout can show.
  const read = async () => Number(await arc.getAttribute('stroke-dashoffset'));
  const first = await read();
  expect(Number.isFinite(first)).toBe(true);

  await expect.poll(read, { timeout: 8_000, intervals: [100] }).not.toBe(first);
});

test('the engine dots follow the engines', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const dot = page.locator(metricSelector('engine-0'));
  const state = async () => dot.getAttribute('data-state');

  // The intro demo flies its own descent, lighting and shutting engines the
  // whole way down, so within a few seconds the dot must have been lit at least
  // once. A dot stuck on "off" would mean the binder never wrote it.
  await expect.poll(state, { timeout: 20_000, intervals: [100] }).not.toBe('off');

  // And the states it reports are from the documented set, not something the
  // formatter invented.
  const seen = await state();
  expect(['off', 'igniting', 'lit', 'failed']).toContain(seen);
});

test('the propellant bars drain', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const ch4 = page.locator(metricSelector('propellant-ch4'));
  const lox = page.locator(metricSelector('propellant-lox'));

  const width = async (bar: typeof ch4) => Number(await bar.getAttribute('width'));
  const before = await width(ch4);
  expect(before).toBeGreaterThan(0);

  // Both bars are driven by the one propellant mass the simulation has, so they
  // must agree exactly — see hud/metrics.ts for why the pair is drawn at all.
  expect(await width(lox)).toBe(before);

  // The intro burns propellant on the way down.
  await expect.poll(async () => width(ch4), { timeout: 15_000, intervals: [200] }).toBeLessThan(
    before,
  );
});

test('the mission clock counts simulated seconds', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const clock = page.locator(byTestId(readoutValueTestId('clock')));
  await expect(clock).toHaveText(/^\d{2}:\d{2}:\d{2}$/);

  const first = await clock.textContent();
  await expect.poll(async () => clock.textContent(), { timeout: 5_000 }).not.toBe(first);
});

test('the attitude chevron rotates with the pitch readout', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const chevron = page.locator(metricSelector('attitude'));
  const pitch = page.locator(byTestId(readoutValueTestId('pitch')));

  await expect
    .poll(async () => (await chevron.getAttribute('transform')) ?? '', { timeout: 5_000 })
    .toMatch(/^rotate\(-?\d+ 12 12\)$/);

  // The chevron and the number must agree — a chevron that moved between two
  // states the digits did not would read as a rendering bug rather than a
  // rounding choice, which is why both are whole degrees.
  const agree = async () => {
    const transform = (await chevron.getAttribute('transform')) ?? '';
    const angle = Number(/rotate\((-?\d+)/.exec(transform)?.[1]);
    const shown = Number(await pitch.textContent());
    return Math.abs(angle - shown) <= 1;
  };
  expect(await agree()).toBe(true);
});

test('Q is labelled kPa, the unit it has always been', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // 2021 printed PSI beside this number and it was never psi. See
  // docs/PARITY.md and $hud/readouts — a display fix, with core untouched.
  await expect(page.locator(byTestId('readout-dynamicPressure-unit'))).toHaveText('KPA');
});

test('the engineering strip collapses without breaking the gauges', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  const twr = page.locator(byTestId('readout-twr'));
  await expect(twr).toBeVisible();

  await page.locator(byTestId('hud-toggle')).click();
  await expect(twr).not.toBeVisible();

  // dispUpdate.js:193 collapsed everything but altitude and speed. Those two
  // are the gauges now, and they stay.
  await expect(page.locator(byTestId('readout-altitude'))).toBeVisible();
  await expect(page.locator(byTestId('readout-speed'))).toBeVisible();

  // Hidden, not unmounted: the binder holds these nodes and would be writing
  // into orphans otherwise. The value keeps updating behind the collapse.
  const hidden = page.locator(byTestId(readoutValueTestId('twr')));
  const before = await hidden.textContent();
  await expect.poll(async () => hidden.textContent(), { timeout: 8_000 }).not.toBe(before);

  await page.locator(byTestId('hud-toggle')).click();
  await expect(twr).toBeVisible();
});

test('the overlay does not intercept pointer events over the world', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // The broadcast layer covers the whole viewport so the scrims can sit at the
  // edges. If it swallowed clicks, the canvas underneath would be unreachable —
  // which is the classic way a full-bleed overlay breaks everything below it.
  const viewport = page.viewportSize()!;
  const tag = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.tagName ?? '',
    [Math.round(viewport.width / 2), Math.round(viewport.height * 0.9)] as const,
  );
  expect(tag).toBe('CANVAS');
});
