import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import type { CompositeReport, WitnessKind } from './renderer/post-witness';
import type { SamplingRow } from './renderer/post-sampling';

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

test('bloom preserves production particle coverage on a high-density canvas', async ({ page }) => {
  test.setTimeout(120000);
  await openWitness(page);
  const rows = await page.evaluate(() => (window as unknown as {
    postSampling(): Promise<SamplingRow[]>;
  }).postSampling());
  await test.info().attach('sampling-measurements', { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
  console.log('[post-sampling]', JSON.stringify(rows));
  expect(rows.every((row) => row.directPixels > 0 && row.directEnergy > 0), 'each frozen source is visibly present').toBe(true);
  expect(rows.filter((row) => row.source === 'control').every((row) => row.modes.some((mode) => mode.bleedPixels > 0)),
    'the several-pixel source produces positive bloom bleed').toBe(true);
  const actual = rows.filter((row) => row.source === 'particles' && row.resolution === 2)
    .map((row) => row.modes.find((mode) => mode.name === 'configured')!);
  expect(Math.max(...actual.map((mode) => mode.maxLoss)), 'bloom preserves directly rendered emission across subpixel phases').toBeLessThanOrEqual(1);
  expect(actual.every((mode) => mode.lostPixels === 0), 'bloom cannot erase covered source pixels').toBe(true);
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


test('continuous bell follows actual engine lifecycle and pressure @mobile', async ({ page }) => {
  await openWitness(page);
  const report = await page.evaluate(() => (window as unknown as {
    bellWitness(): Promise<import('./renderer/emissive-bell-witness').BellReport>;
  }).bellWitness());
  await test.info().attach('continuous-bell-measurements', { body: JSON.stringify(report), contentType: 'application/json' });
  console.log('[continuous-bell]', report);
  expect(report.offEnergy).toBe(0);
  expect(report.oneEnergy).toBeGreaterThan(0);
  expect(report.threeEnergy / report.oneEnergy).toBeGreaterThan(2.8);
  expect(report.threeEnergy / report.oneEnergy).toBeLessThan(3.2);
  expect(report.pausedDifference).toBe(0);
  expect(report.restartEnergy).toBe(0);
  expect(report.widths[0]).toBeGreaterThan(0);
  expect(report.widths[1]!).toBeGreaterThan(report.widths[0]!);
  expect(report.smokeMinimum.every(value => value < -3)).toBe(true);
  expect(report.mixedRed[0]!).toBeLessThan(report.mixedRed[1]! - 3);
});
