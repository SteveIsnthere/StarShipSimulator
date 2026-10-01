/**
 * M4.5: the black box, and the 3.5 MB that is no longer on the critical path.
 *
 * 2021 loaded Plotly from a CDN on every page load — for nine charts almost
 * nobody opened, blocking the first frame of a game, and making the whole thing
 * unusable offline. The first test here is that wound, stated as a measurement:
 * no chart code is fetched until the black box is opened.
 */
import { expect, test } from '@playwright/test';

async function ready(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => (await page.locator('[data-testid="readout-altitude-value"]').textContent()) !== '', {
      timeout: 10_000,
    })
    .toBe(true);
}

test('no chart code is loaded until the black box is opened', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    const url = res.url();
    if (/\.(js|css)(\?|$)/.test(url)) scripts.push(url);
  });

  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  // Long enough for the recorder to hold something: the view refuses to load a
  // chart library to draw an empty recording, which is correct behaviour and
  // would make this measurement vacuous.
  await page.waitForTimeout(1_500);
  await page.waitForLoadState('networkidle');

  expect(
    scripts.filter((u) => /uplot/i.test(u)),
    'uPlot must not be in the first load',
  ).toEqual([]);
  // And nothing at all from a third party, which is what M5.1 depends on.
  expect(scripts.filter((u) => !u.startsWith('http://127.0.0.1'))).toEqual([]);

  const beforeCount = scripts.length;
  await page.locator('[data-testid="open-black-box"]').click();

  // Wait for a drawn plot, not for the dialog: the dialog renders immediately
  // and the import resolves later, so asserting on visibility alone reads the
  // request list before the fetch has started.
  await expect(page.locator('[data-plot]').first()).toBeVisible({ timeout: 15_000 });

  // Opening it fetches the chunk, from our own origin.
  expect(scripts.length).toBeGreaterThan(beforeCount);
  expect(scripts.filter((u) => /uplot/i.test(u)).length).toBeGreaterThan(0);
  expect(scripts.filter((u) => !u.startsWith('http://127.0.0.1'))).toEqual([]);
});

test('it draws the nine plots of the flight', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);

  // Give the intro a moment to record something worth plotting.
  await page.waitForTimeout(2_000);
  await page.locator('[data-testid="open-black-box"]').click();

  const plots = page.locator('[data-plot]');
  await expect(plots).toHaveCount(9, { timeout: 15_000 });

  for (const id of [
    'flyPath',
    'motionSpeed',
    'propellant',
    'acceleration',
    'motionAngle',
    'controlInput',
    'thermal',
    'aerodynamicForce',
    'altitude',
  ]) {
    await expect(page.locator(`[data-plot="${id}"]`), id).toBeVisible();
  }

  // Each plot really rendered, rather than leaving an empty div.
  const canvases = await page.locator('[data-plot] canvas').count();
  expect(canvases).toBeGreaterThanOrEqual(9);
});

test('it closes, and the keyboard is suppressed while it is open', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  await page.waitForTimeout(1_000);

  const fins = page.locator('[data-testid="fins"]');
  const before = ((await fins.getAttribute('class')) ?? '').includes('is-on');

  await page.locator('[data-testid="open-black-box"]').click();
  await expect(page.locator('[data-testid="black-box"]')).toBeVisible();

  await page.keyboard.press('f');
  await page.waitForTimeout(300);
  expect(((await fins.getAttribute('class')) ?? '').includes('is-on')).toBe(before);

  await page.locator('[data-testid="black-box-close"]').click();
  await expect(page.locator('[data-testid="black-box"]')).toHaveCount(0);

  // And it works again once closed.
  await page.keyboard.press('f');
  await expect(fins).toHaveClass(before ? /control/ : /is-on/);
});

/* ── M12.3: the black box as an instrument ──────────────────────────────── */

/**
 * Open the black box on a flight that has been recorded for a while.
 *
 * Returns the mission clock at the moment it was opened, which is the upper
 * bound on anything the cursor can legitimately report.
 */
async function openOnAFlight(
  page: import('@playwright/test').Page,
  preset?: string,
): Promise<number> {
  await page.goto('/', { waitUntil: 'load' });
  await ready(page);
  if (preset !== undefined) {
    await page.locator('[data-testid="open-menu"]').click();
    await page.locator(`[data-testid="preset-${preset}"]`).click();
    await page.locator('[data-testid="menu-configure"]').click();
    await expect(page.locator('[data-testid="menu"]')).toHaveCount(0);
  }
  // The flight records as it goes; a couple of seconds is plenty of samples
  // and at least one timeline event.
  await page.waitForTimeout(3_000);
  const clock = (await page.locator('[data-testid="readout-clock-value"]').textContent()) ?? '';
  const elapsed = clock
    .trim()
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + (Number.isFinite(part) ? part : 0), 0);

  await page.locator('[data-testid="open-black-box"]').click();
  await expect(page.locator('[data-testid="black-box"]')).toBeVisible();
  // The charts are a lazy import; wait for one to have been drawn.
  await expect(page.locator('[data-blackbox] .cell canvas').first()).toBeVisible({
    timeout: 30_000,
  });
  return elapsed;
}

test('the shared cursor reads every channel at one moment', async ({ page }) => {
  test.setTimeout(120_000);
  /*
    BOOSTER SEP, and the preset is part of the assertion rather than scenery.
    The intro flies straight down from 500 m, so its downrange never leaves a
    hundred metres — and the bug this test now guards (a cursor reporting the
    x axis instead of the time) would have read `T+26` there and passed. Booster
    Sep starts 45 km downrange, so the same mistake reads `T+45000` against a
    three-second flight.
  */
  const elapsed = await openOnAFlight(page, 'booster-sep');

  const readout = page.locator('[data-testid="black-box-readout"]');
  await expect(readout).toBeVisible();
  // Nothing under the pointer yet, so the strip is a hint rather than numbers.
  await expect(readout.locator('[data-channel]')).toHaveCount(0);

  /*
    Hover the middle of the first plot. The claim is the one the whole feature
    exists for: a cursor on ONE plot reads EVERY channel, including the ones
    drawn on the other eight — "what was the angle of attack when the heating
    peaked" is asked on one plot and answered from another.
  */
  const first = page.locator('[data-blackbox] .cell canvas').first();
  const box = await first.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);

  await expect(readout.locator('[data-channel]').first()).toBeVisible({ timeout: 10_000 });
  const channels = await readout.locator('[data-channel]').count();
  // Every recorded channel, not just the plot's own.
  expect(channels).toBeGreaterThan(10);
  await expect(readout.locator('[data-channel="angleOfAttack"]')).toHaveCount(1);
  await expect(readout.locator('[data-channel="thermalPower"]')).toHaveCount(1);

  /*
    AND THE MOMENT IS A TIME, which is the assertion this test was missing.

    The first plot is `flyPath` — altitude against DOWNRANGE — and the first
    version of the cursor handed the readout whatever was on the x axis. So
    hovering this very plot looked up t = 1565 s in a 198-second recording, the
    readout froze on the last sample of the flight, and its header said
    `T+1565.58`. Counting elements passed anyway. The clock the flight had
    reached when the view opened is the upper bound on anything the cursor can
    honestly report.
  */
  const header = (await readout.locator('.at').first().textContent()) ?? '';
  expect(header, 'the readout names a moment').toMatch(/^T\+\d+\.\d\d$/);
  const at = Number(header.replace('T+', ''));
  expect(at, `${header} against a flight of ${elapsed} s`).toBeGreaterThanOrEqual(0);
  expect(at, `${header} against a flight of ${elapsed} s`).toBeLessThanOrEqual(elapsed + 2);
});

test('the export hands over a CSV of the flight', async ({ page }) => {
  test.setTimeout(120_000);
  await openOnAFlight(page);

  const download = page.waitForEvent('download');
  await page.locator('[data-testid="black-box-export"]').click();
  const file = await download;

  // Named after the flight and its length, not the wall clock.
  expect(file.suggestedFilename()).toMatch(/^starship-[a-z0-9-]+-\d+\.\ds\.csv$/);

  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');

  const lines = text.split('\n').filter((line) => line !== '');
  expect(lines.length, 'a header and many samples').toBeGreaterThan(20);
  expect(lines[0]).toMatch(/^time,/);
  expect(lines[0]).toContain('altitude');
  // Every row has the same number of columns as the header, which is the one
  // way a hand-rolled CSV usually goes wrong.
  const columns = lines[0]!.split(',').length;
  for (const line of lines) expect(line.split(',').length).toBe(columns);
});
