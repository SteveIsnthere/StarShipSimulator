/**
 * M5.3: the site works when served from a subdirectory.
 *
 * Everything here passes trivially at a domain root. The point is the subpath:
 * GitHub Pages serves a project site from one, and a single absolute path
 * anywhere in the build — a `<script src="/assets/...">`, a service worker
 * precaching `/index.html` — becomes a 404 that localhost never shows.
 */
import { expect, test } from '@playwright/test';

test('the app loads and flies from a subdirectory', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', (req) => failed.push(req.url()));
  const notFound: string[] = [];
  page.on('response', (res) => {
    if (res.status() >= 400) notFound.push(`${res.url()} ${res.status()}`);
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('./', { waitUntil: 'load' });

  const altitude = page.locator('[data-readout="altitude"] .value');
  await expect.poll(async () => (await altitude.textContent()) !== '', { timeout: 15_000 }).toBe(true);
  await expect(page.locator('canvas')).toBeVisible();

  // The intro flies, so the whole chain is live from a subpath.
  const first = await altitude.textContent();
  await expect.poll(async () => altitude.textContent(), { timeout: 5_000 }).not.toBe(first);

  expect(failed, 'no request may fail').toEqual([]);
  expect(notFound, 'no 404s — this is what an absolute path would produce').toEqual([]);
  expect(errors).toEqual([]);
});

test('every asset is requested under the subpath', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (req) => urls.push(req.url()));

  await page.goto('./', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');

  // blob: and data: URLs never touch the network — PixiJS builds its worker
  // from a blob, which is incidentally why the worker survives being offline.
  // They look like root-level UUIDs in a request log and are not paths at all.
  const IN_MEMORY = /^(blob|data):/;

  const underSubpath = urls.filter((u) => u.includes('/StarShipSimulator/'));
  const stray = urls.filter(
    (u) => !u.includes('/StarShipSimulator/') && !u.includes('/favicon') && !IN_MEMORY.test(u),
  );

  expect(stray, 'an absolute path in the build would appear here').toEqual([]);
  // And the app really did ask for things, so the filter cannot pass by
  // leaving nothing behind.
  expect(underSubpath.length).toBeGreaterThan(10);
});

test('the service worker registers at the subpath scope and precaches it', async ({ page }) => {
  await page.goto('./', { waitUntil: 'load' });

  await expect
    .poll(async () => page.evaluate(() => navigator.serviceWorker?.controller !== null), {
      timeout: 25_000,
    })
    .toBe(true);

  const info = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const names = await caches.keys();
    const cache = await caches.open(names[0]!);
    const keys = (await cache.keys()).map((r) => new URL(r.url).pathname);
    return { scope: registration?.scope ?? '', count: keys.length, keys };
  });

  expect(info.scope).toContain('/StarShipSimulator/');
  expect(info.count).toBeGreaterThan(20);
  // Every cached entry lives under the subpath, not at the root.
  expect(info.keys.filter((k) => !k.startsWith('/StarShipSimulator/'))).toEqual([]);
});

test('it still works offline from a subdirectory', async ({ page }) => {
  await page.goto('./', { waitUntil: 'load' });
  await expect
    .poll(async () => page.evaluate(() => navigator.serviceWorker?.controller !== null), {
      timeout: 25_000,
    })
    .toBe(true);

  await page.context().setOffline(true);

  const failed: string[] = [];
  page.on('requestfailed', (req) => failed.push(req.url()));

  await page.reload({ waitUntil: 'load' });
  await expect
    .poll(
      async () => (await page.locator('[data-readout="altitude"] .value').textContent()) !== '',
      { timeout: 15_000 },
    )
    .toBe(true);

  expect(failed).toEqual([]);
  await expect(page.locator('canvas')).toBeVisible();
});
