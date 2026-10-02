# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: post-compositing.spec.ts >> bloom retains mixed fire-then-smoke compositing @mobile
- Location: tests/e2e/post-compositing.spec.ts:44:3

# Error details

```
Error: bloom never subtracts light in either mixed draw order

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= -1
Received:    -40
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
  13 | async function render(page: import('@playwright/test').Page, kind: WitnessKind, restore = false): Promise<CompositeReport> {
  14 |   await page.route('**/__post-witness.js', (route) => route.fulfill({
  15 |     contentType: 'application/javascript', body: source,
  16 |   }));
  17 |   await page.route('**/__post-witness', (route) => route.fulfill({
  18 |     contentType: 'text/html', body: '<script src="/__post-witness.js"></script>',
  19 |   }));
  20 |   await page.goto('/__post-witness');
  21 |   return page.evaluate(([effect, restoreContext, baseline]) => (window as unknown as {
  22 |     postWitness(kind: WitnessKind, restore: boolean, baseline: boolean): Promise<CompositeReport>;
  23 |   }).postWitness(effect, restoreContext, baseline), [kind, restore, process.env['P6B_COMPOSITING_BASELINE'] === '1'] as const);
  24 | }
  25 | 
  26 | test('bloom adds light without darkening additive exhaust @mobile', async ({ page }) => {
  27 |   const report = await render(page, 'fire');
  28 |   console.log('[post-composite] fire', report);
  29 |   expect(report.directChanged, 'real particles reached the real WebGL canvas').toBeGreaterThan(100);
  30 |   expect(report.directMinimum, 'direct additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
  31 |   expect(report.bloomMinimum, 'bloomed additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
  32 |   expect(report.bloomVsDirectMinimum, 'bloom never removes direct additive light').toBeGreaterThanOrEqual(-1);
  33 | });
  34 | 
  35 | test('bloom preserves normal smoke occlusion @mobile', async ({ page }) => {
  36 |   const report = await render(page, 'smoke');
  37 |   console.log('[post-composite] smoke', report);
  38 |   expect(report.directChanged, 'the normal smoke positive control is visible').toBeGreaterThan(100);
  39 |   expect(report.directMinimum, 'unfiltered smoke darkens its background').toBeLessThan(-3);
  40 |   expect(report.bloomMinimum, 'filtered smoke still darkens its background').toBeLessThan(-3);
  41 | });
  42 | 
  43 | for (const kind of ['fire-then-smoke', 'smoke-then-fire'] as const) {
  44 |   test(`bloom retains mixed ${kind} compositing @mobile`, async ({ page }) => {
  45 |     const report = await render(page, kind);
  46 |     console.log('[post-composite]', kind, report);
  47 |     expect(report.directChanged).toBeGreaterThan(100);
> 48 |     expect(report.bloomVsDirectMinimum, 'bloom never subtracts light in either mixed draw order').toBeGreaterThanOrEqual(-1);
     |                                                                                                   ^ Error: bloom never subtracts light in either mixed draw order
  49 |   });
  50 | }
  51 | 
  52 | test('additive bloom survives a real WebGL context restoration @mobile', async ({ page }) => {
  53 |   const report = await render(page, 'fire', true);
  54 |   expect(report.bloomMinimum).toBeGreaterThanOrEqual(-1);
  55 | });
  56 | 
```