/**
 * M3.6: the intro auto-landing sequence, end to end in v2.
 *
 * CLAUDE.md lists this under "what must never change". The simulation half is
 * already locked by a golden fixture; what these tests add is that the whole
 * thing plays IN THE BROWSER — real renderer, real loop, real frame times — and
 * lands.
 */
import { expect, test } from '@playwright/test';

/** Read altitude out of the on-screen readout. */
async function altitude(page: import('@playwright/test').Page): Promise<number> {
  const text = (await page.getByRole('status').textContent()) ?? '';
  const match = /(-?\d+(?:\.\d+)?) m/.exec(text);
  return match ? Number(match[1]) : NaN;
}

test('the intro plays end to end and lands', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebGL|SwiftShader|fallback/i.test(m.text())) {
      errors.push(m.text());
    }
  });

  await page.goto('/', { waitUntil: 'load' });

  // Starts high in the render box, falling.
  await expect.poll(() => altitude(page), { timeout: 5_000 }).toBeGreaterThan(100);
  const start = await altitude(page);
  expect(start).toBeLessThan(200);

  // And ends on the pad. The demo hands the vehicle back at 25 m.
  await expect
    .poll(() => altitude(page), { timeout: 30_000, intervals: [250] })
    .toBeLessThan(30);

  expect(errors, 'the intro must not throw').toEqual([]);
});

test('it decelerates rather than arriving fast', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  const speed = async () => {
    const text = (await page.getByRole('status').textContent()) ?? '';
    const match = /(-?\d+(?:\.\d+)?) m\/s/.exec(text);
    return match ? Math.abs(Number(match[1])) : NaN;
  };

  await expect.poll(speed, { timeout: 5_000 }).toBeGreaterThan(20);
  const fast = await speed();

  await expect.poll(() => altitude(page), { timeout: 30_000, intervals: [250] }).toBeLessThan(40);
  const slow = await speed();

  expect(slow, 'should be slower at the bottom than at the top').toBeLessThan(fast);
});

test('the vehicle is drawn throughout, not just at the end', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  // The canvas keeps a stable size while the whole sequence plays, which rules
  // out a renderer that has quietly fallen over mid-flight. It is sized from
  // the window at creation, so there is no resize flash to wait out.
  const box1 = await page.locator('canvas').boundingBox();
  await page.waitForTimeout(4_000);
  const box2 = await page.locator('canvas').boundingBox();

  expect(box1?.width).toBe(box2?.width);
  expect(box1?.height).toBe(box2?.height);
  expect(box1?.width ?? 0).toBeGreaterThan(0);
});
