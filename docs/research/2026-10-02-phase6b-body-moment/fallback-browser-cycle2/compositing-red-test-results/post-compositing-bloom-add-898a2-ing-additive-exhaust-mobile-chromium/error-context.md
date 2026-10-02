# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: post-compositing.spec.ts >> bloom adds light without darkening additive exhaust @mobile
- Location: tests/e2e/post-compositing.spec.ts:26:1

# Error details

```
Error: bloomed additive fire never subtracts background light

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= -1
Received:    -59
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { build } from 'esbuild';
  3  | import type { CompositeReport } from './renderer/post-witness';
  4  | 
  5  | let source: string;
  6  | test.beforeAll(async () => {
  7  |   const result = await build({ entryPoints: ['tests/e2e/renderer/post-witness.ts'],
  8  |     bundle: true, write: false, format: 'iife', platform: 'browser',
  9  |     tsconfig: 'tsconfig.json', define: { 'process.env.NODE_ENV': '"production"' } });
  10 |   source = result.outputFiles[0]!.text;
  11 | });
  12 | 
  13 | async function render(page: import('@playwright/test').Page, smoke: boolean): Promise<CompositeReport> {
  14 |   await page.route('**/__post-witness.js', (route) => route.fulfill({
  15 |     contentType: 'application/javascript', body: source,
  16 |   }));
  17 |   await page.route('**/__post-witness', (route) => route.fulfill({
  18 |     contentType: 'text/html', body: '<script src="/__post-witness.js"></script>',
  19 |   }));
  20 |   await page.goto('/__post-witness');
  21 |   return page.evaluate((normalSmoke) => (window as unknown as {
  22 |     postWitness(smoke: boolean): Promise<CompositeReport>;
  23 |   }).postWitness(normalSmoke), smoke);
  24 | }
  25 | 
  26 | test('bloom adds light without darkening additive exhaust @mobile', async ({ page }) => {
  27 |   const report = await render(page, false);
  28 |   console.log('[post-composite] fire', report);
  29 |   expect(report.directChanged, 'real particles reached the real WebGL canvas').toBeGreaterThan(100);
  30 |   expect(report.directMinimum, 'direct additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
> 31 |   expect(report.bloomMinimum, 'bloomed additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
     |                                                                                         ^ Error: bloomed additive fire never subtracts background light
  32 |   expect(report.bloomVsDirectMinimum, 'bloom never removes direct additive light').toBeGreaterThanOrEqual(-1);
  33 | });
  34 | 
  35 | test('bloom preserves normal smoke occlusion @mobile', async ({ page }) => {
  36 |   const report = await render(page, true);
  37 |   console.log('[post-composite] smoke', report);
  38 |   expect(report.directChanged, 'the normal smoke positive control is visible').toBeGreaterThan(100);
  39 |   expect(report.directMinimum, 'unfiltered smoke darkens its background').toBeLessThan(-3);
  40 |   expect(report.bloomMinimum, 'filtered smoke still darkens its background').toBeLessThan(-3);
  41 | });
  42 | 
```