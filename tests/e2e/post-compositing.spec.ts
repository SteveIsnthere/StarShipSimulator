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

async function render(page: import('@playwright/test').Page, kind: WitnessKind, restore = false): Promise<CompositeReport> {
  await page.route('**/__post-witness.js', (route) => route.fulfill({
    contentType: 'application/javascript', body: source,
  }));
  await page.route('**/__post-witness', (route) => route.fulfill({
    contentType: 'text/html', body: '<script src="/__post-witness.js"></script>',
  }));
  await page.goto('/__post-witness');
  return page.evaluate(([effect, restoreContext, baseline]) => (window as unknown as {
    postWitness(kind: WitnessKind, restore: boolean, baseline: boolean): Promise<CompositeReport>;
  }).postWitness(effect, restoreContext, baseline), [kind, restore, process.env['P6B_COMPOSITING_BASELINE'] === '1'] as const);
}

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
