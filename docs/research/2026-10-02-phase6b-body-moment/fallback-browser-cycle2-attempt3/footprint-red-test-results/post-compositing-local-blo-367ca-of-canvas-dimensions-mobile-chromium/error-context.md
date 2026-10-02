# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: post-compositing.spec.ts >> local bloom footprint is independent of canvas dimensions @mobile
- Location: tests/e2e/post-compositing.spec.ts:30:1

# Error details

```
Error: canvas extent cannot change the same local bloom kernel

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    46
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { build } from 'esbuild';
  3  | import type { CompositeReport, WitnessKind } from './renderer/post-witness';
  4  | 
  5  | let source: string;
  6  | test.beforeAll(async () => {
  7  |   const result = await build({ entryPoints: ['tests/e2e/renderer/post-witness.ts'],
  8  |     bundle: true, write: false, format: 'iife', platform: 'browser',
  9  |     tsconfig: 'tsconfig.json', define: { 'process.env.NODE_ENV': '"production"' } });
  10 |   source = result.outputFiles[0]!.text;
  11 | });
  12 | 
  13 | async function openWitness(page: import('@playwright/test').Page): Promise<void> {
  14 |   await page.route('**/__post-witness.js', (route) => route.fulfill({
  15 |     contentType: 'application/javascript', body: source,
  16 |   }));
  17 |   await page.route('**/__post-witness', (route) => route.fulfill({
  18 |     contentType: 'text/html', body: '<script src="/__post-witness.js"></script>',
  19 |   }));
  20 |   await page.goto('/__post-witness');
  21 | }
  22 | 
  23 | async function render(page: import('@playwright/test').Page, kind: WitnessKind, restore = false): Promise<CompositeReport> {
  24 |   await openWitness(page);
  25 |   return page.evaluate(([effect, restoreContext, baseline]) => (window as unknown as {
  26 |     postWitness(kind: WitnessKind, restore: boolean, baseline: boolean): Promise<CompositeReport>;
  27 |   }).postWitness(effect, restoreContext, baseline), [kind, restore, process.env['P6B_COMPOSITING_BASELINE'] === '1'] as const);
  28 | }
  29 | 
  30 | test('local bloom footprint is independent of canvas dimensions @mobile', async ({ page }) => {
  31 |   await openWitness(page);
  32 |   const report = await page.evaluate(() => (window as unknown as {
  33 |     bloomFootprint(): Promise<{ maxDifference: number; directDifference: number; changed: number }>;
  34 |   }).bloomFootprint());
  35 |   console.log('[bloom-footprint]', report);
  36 |   expect(report.directDifference, 'the identical unfiltered local source is a positive control').toBe(0);
  37 |   expect(report.changed, 'bloom actually adds visible light outside the source').toBeGreaterThan(0);
> 38 |   expect(report.maxDifference, 'canvas extent cannot change the same local bloom kernel').toBeLessThanOrEqual(1);
     |                                                                                           ^ Error: canvas extent cannot change the same local bloom kernel
  39 | });
  40 | 
  41 | test('bloom adds light without darkening additive exhaust @mobile', async ({ page }) => {
  42 |   const report = await render(page, 'fire');
  43 |   console.log('[post-composite] fire', report);
  44 |   expect(report.directChanged, 'real particles reached the real WebGL canvas').toBeGreaterThan(100);
  45 |   expect(report.directMinimum, 'direct additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
  46 |   expect(report.bloomMinimum, 'bloomed additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
  47 |   expect(report.bloomVsDirectMinimum, 'bloom never removes direct additive light').toBeGreaterThanOrEqual(-1);
  48 | });
  49 | 
  50 | test('bloom preserves normal smoke occlusion @mobile', async ({ page }) => {
  51 |   const report = await render(page, 'smoke');
  52 |   console.log('[post-composite] smoke', report);
  53 |   expect(report.directChanged, 'the normal smoke positive control is visible').toBeGreaterThan(100);
  54 |   expect(report.directMinimum, 'unfiltered smoke darkens its background').toBeLessThan(-3);
  55 |   expect(report.bloomMinimum, 'filtered smoke still darkens its background').toBeLessThan(-3);
  56 | });
  57 | 
  58 | for (const kind of ['fire-then-smoke', 'smoke-then-fire'] as const) {
  59 |   test(`bloom retains mixed ${kind} compositing @mobile`, async ({ page }) => {
  60 |     const report = await render(page, kind);
  61 |     console.log('[post-composite]', kind, report);
  62 |     expect(report.directChanged).toBeGreaterThan(100);
  63 |     expect(report.bloomVsDirectMinimum, 'bloom never subtracts light in either mixed draw order').toBeGreaterThanOrEqual(-1);
  64 |   });
  65 | }
  66 | 
  67 | test('additive bloom survives a real WebGL context restoration @mobile', async ({ page }) => {
  68 |   const report = await render(page, 'fire', true);
  69 |   expect(report.bloomMinimum).toBeGreaterThanOrEqual(-1);
  70 | });
  71 | 
```