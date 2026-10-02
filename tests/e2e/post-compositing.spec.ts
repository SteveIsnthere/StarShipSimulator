import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import type { CompositeReport, WitnessKind } from './renderer/post-witness';

let source: string;
test.beforeAll(async () => {
  const result = await build({ entryPoints: ['tests/e2e/renderer/post-witness.ts'],
    bundle: true, write: false, format: 'iife', platform: 'browser',
    tsconfig: 'tsconfig.json', define: { 'process.env.NODE_ENV': '"production"' } });
  source = result.outputFiles[0]!.text;
});

async function openWitness(page: import('@playwright/test').Page): Promise<void> {
  page.on('console', (message) => { if (message.type() === 'error') console.log('[renderer-error]', message.text()); });
  page.on('pageerror', (error) => console.log('[renderer-error]', error.message));
  await page.route('**/__post-witness.js', (route) => route.fulfill({
    contentType: 'application/javascript', body: source,
  }));
  await page.route('**/__post-witness', (route) => route.fulfill({
    contentType: 'text/html', body: '<script src="/__post-witness.js"></script>',
  }));
  await page.goto('/__post-witness');
}

async function render(page: import('@playwright/test').Page, kind: WitnessKind, restore = false): Promise<CompositeReport> {
  await openWitness(page);
  return page.evaluate(([effect, restoreContext, baseline]) => (window as unknown as {
    postWitness(kind: WitnessKind, restore: boolean, baseline: boolean): Promise<CompositeReport>;
  }).postWitness(effect, restoreContext, baseline), [kind, restore, process.env['P6B_COMPOSITING_BASELINE'] === '1'] as const);
}

test('local bloom footprint is independent of canvas dimensions @mobile', async ({ page }) => {
  await openWitness(page);
  const report = await page.evaluate(() => (window as unknown as {
    bloomFootprint(): Promise<{ maxDifference: number; directDifference: number; changed: number }>;
  }).bloomFootprint());
  console.log('[bloom-footprint]', report);
  expect(report.directDifference, 'the identical unfiltered local source is a positive control').toBe(0);
  expect(report.changed, 'bloom actually adds visible light outside the source').toBeGreaterThan(0);
  expect(report.maxDifference, 'canvas extent cannot change the same local bloom kernel').toBeLessThanOrEqual(1);
});

test('bloom adds light without darkening additive exhaust @mobile', async ({ page }) => {
  const report = await render(page, 'fire');
  console.log('[post-composite] fire', report);
  expect(report.directChanged, 'real particles reached the real WebGL canvas').toBeGreaterThan(100);
  expect(report.directMinimum, 'direct additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
  expect(report.bloomMinimum, 'bloomed additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
  expect(report.bloomVsDirectMinimum, 'bloom never removes direct additive light').toBeGreaterThanOrEqual(-1);
});

test('bloom preserves normal smoke occlusion @mobile', async ({ page }) => {
  const report = await render(page, 'smoke');
  console.log('[post-composite] smoke', report);
  expect(report.directChanged, 'the normal smoke positive control is visible').toBeGreaterThan(100);
  expect(report.directMinimum, 'unfiltered smoke darkens its background').toBeLessThan(-3);
  expect(report.bloomMinimum, 'filtered smoke still darkens its background').toBeLessThan(-3);
});

for (const kind of ['fire-then-smoke', 'smoke-then-fire'] as const) {
  test(`bloom retains mixed ${kind} compositing @mobile`, async ({ page }) => {
    const report = await render(page, kind);
    console.log('[post-composite]', kind, report);
    expect(report.directChanged).toBeGreaterThan(100);
    expect(report.bloomVsDirectMinimum, 'bloom never subtracts light in either mixed draw order').toBeGreaterThanOrEqual(-1);
  });
}

test('additive bloom survives a real WebGL context restoration @mobile', async ({ page }) => {
  const report = await render(page, 'fire', true);
  expect(report.bloomMinimum).toBeGreaterThanOrEqual(-1);
});
