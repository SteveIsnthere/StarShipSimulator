/**
 * M5.1 acceptance: a full playthrough in airplane mode.
 *
 * The 2021 About screen claimed the game "can be played offline". It could not:
 * index.html:420 and :449 pulled PixiJS and Plotly from two CDNs on every load,
 * so with no network there was no renderer at all. This is that claim, made
 * true and then checked — not "the page loads", but a flight flown end to end
 * with the browser context offline.
 */
import { expect, test } from '@playwright/test';

async function ready(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => (await page.locator('[data-testid="readout-altitude-value"]').textContent()) !== '', {
      timeout: 15_000,
    })
    .toBe(true);
}

/** Load once online so the worker installs, then cut the network. */
async function goOffline(page: import('@playwright/test').Page) {
  await page.goto('/', { waitUntil: 'load' });
  await expect
    .poll(async () => page.evaluate(() => navigator.serviceWorker?.controller !== null), {
      timeout: 20_000,
    })
    .toBe(true);
  // The worker controls the page; give the precache a moment to finish filling.
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const names = await caches.keys();
          if (names.length === 0) return 0;
          const cache = await caches.open(names[0]!);
          return (await cache.keys()).length;
        }),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(10);

  await page.context().setOffline(true);
}

test('the whole app loads with the network off', async ({ page }) => {
  await goOffline(page);

  const failed: string[] = [];
  page.on('requestfailed', (req) => failed.push(`${req.url()} ${req.failure()?.errorText}`));

  await page.reload({ waitUntil: 'load' });
  await ready(page);

  expect(failed, 'nothing may fail to load offline').toEqual([]);
  await expect(page.locator('canvas')).toBeVisible();
});

test('a full flight can be flown offline', async ({ page }) => {
  await goOffline(page);
  await page.reload({ waitUntil: 'load' });
  await ready(page);

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // Configure a new flight from the menu — presets, editor, the lot.
  await page.locator('[data-testid="open-menu"]').click();
  await page.locator('[data-testid="preset-landing-burn"]').click();
  await page.locator('[data-testid="menu-configure"]').click();
  await expect(page.locator('[data-testid="menu"]')).toHaveCount(0);

  await expect
    .poll(async () => Number(await page.locator('[data-testid="readout-propellant-value"]').textContent()), {
      timeout: 5_000,
    })
    .toBe(20);

  // Fly it: light the engines from the keyboard, watch the descent arrest.
  const speedY = page.locator('[data-testid="readout-speedY-value"]');
  const falling = Number(await speedY.textContent());
  expect(falling).toBeLessThan(0);

  await page.keyboard.press('Space');
  await expect(page.locator('[data-testid="all-raptors"]')).toHaveClass(/is-on/, {
    timeout: 5_000,
  });
  await expect
    .poll(async () => Number(await speedY.textContent()), { timeout: 15_000 })
    .toBeGreaterThan(falling);

  // Land or crash — either way the flight ends and the restart offers itself.
  await expect(page.locator('[data-testid="restart"]')).toBeVisible({ timeout: 40_000 });

  expect(errors).toEqual([]);
});

test('the black box works offline, chunk and all', async ({ page }) => {
  // The chart chunk is lazy on purpose (M4.5), which means without precaching
  // it would be fetched at the exact moment there is no network. It is in the
  // precache list for that reason, and this is the test that would notice.
  await goOffline(page);
  await page.reload({ waitUntil: 'load' });
  await ready(page);
  await page.waitForTimeout(1_500);

  await page.locator('[data-testid="open-black-box"]').click();
  await expect(page.locator('[data-plot]')).toHaveCount(9, { timeout: 20_000 });
  expect(await page.locator('[data-plot] canvas').count()).toBeGreaterThanOrEqual(9);
});

test('the guide and menu work offline', async ({ page }) => {
  await goOffline(page);
  await page.reload({ waitUntil: 'load' });
  await ready(page);

  await page.locator('[data-testid="open-menu"]').click();
  await page.locator('[data-testid="menu-guide"]').click();
  await expect(page.locator('[data-testid="info-view"]')).toContainText('Backspace');
});

test('the app is installable: manifest and icon are served and cached', async ({ page }) => {
  await goOffline(page);
  await page.reload({ waitUntil: 'load' });
  await ready(page);

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return null;
    const res = await fetch(link.href);
    return res.ok ? ((await res.json()) as { name: string; icons: unknown[] }) : null;
  });

  expect(manifest, 'the manifest must be served from cache offline').not.toBeNull();
  expect(manifest!.name).toBe('Starship Simulator');
  expect(manifest!.icons.length).toBeGreaterThan(0);
});
