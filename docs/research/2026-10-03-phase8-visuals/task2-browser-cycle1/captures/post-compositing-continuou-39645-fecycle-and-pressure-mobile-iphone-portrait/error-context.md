# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: post-compositing.spec.ts >> continuous bell follows actual engine lifecycle and pressure @mobile
- Location: tests/e2e/post-compositing.spec.ts:93:1

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { build } from 'esbuild';
  3   | import type { CompositeReport, WitnessKind } from './renderer/post-witness';
  4   | import type { SamplingRow } from './renderer/post-sampling';
  5   | 
  6   | let source: string;
  7   | test.beforeAll(async () => {
  8   |   const result = await build({ entryPoints: ['tests/e2e/renderer/post-witness.ts'],
  9   |     bundle: true, write: false, format: 'iife', platform: 'browser',
  10  |     tsconfig: 'tsconfig.json', define: { 'process.env.NODE_ENV': '"production"' } });
  11  |   source = result.outputFiles[0]!.text;
  12  | });
  13  | 
  14  | async function openWitness(page: import('@playwright/test').Page): Promise<void> {
  15  |   page.on('console', (message) => { if (message.type() === 'error') console.log('[renderer-error]', message.text()); });
  16  |   page.on('pageerror', (error) => console.log('[renderer-error]', error.message));
  17  |   await page.route('**/__post-witness.js', (route) => route.fulfill({
  18  |     contentType: 'application/javascript', body: source,
  19  |   }));
  20  |   await page.route('**/__post-witness', (route) => route.fulfill({
  21  |     contentType: 'text/html', body: '<script src="/__post-witness.js"></script>',
  22  |   }));
  23  |   await page.goto('/__post-witness');
  24  | }
  25  | 
  26  | async function render(page: import('@playwright/test').Page, kind: WitnessKind, restore = false): Promise<CompositeReport> {
  27  |   await openWitness(page);
  28  |   return page.evaluate(([effect, restoreContext, baseline]) => (window as unknown as {
  29  |     postWitness(kind: WitnessKind, restore: boolean, baseline: boolean): Promise<CompositeReport>;
  30  |   }).postWitness(effect, restoreContext, baseline), [kind, restore, process.env['P6B_COMPOSITING_BASELINE'] === '1'] as const);
  31  | }
  32  | 
  33  | test('local bloom footprint is independent of canvas dimensions @mobile', async ({ page }) => {
  34  |   await openWitness(page);
  35  |   const report = await page.evaluate(() => (window as unknown as {
  36  |     bloomFootprint(): Promise<{ maxDifference: number; directDifference: number; changed: number }>;
  37  |   }).bloomFootprint());
  38  |   console.log('[bloom-footprint]', report);
  39  |   expect(report.directDifference, 'the identical unfiltered local source is a positive control').toBe(0);
  40  |   expect(report.changed, 'bloom actually adds visible light outside the source').toBeGreaterThan(0);
  41  |   expect(report.maxDifference, 'canvas extent cannot change the same local bloom kernel').toBeLessThanOrEqual(1);
  42  | });
  43  | 
  44  | test('bloom preserves production particle coverage on a high-density canvas', async ({ page }) => {
  45  |   test.setTimeout(120000);
  46  |   await openWitness(page);
  47  |   const rows = await page.evaluate(() => (window as unknown as {
  48  |     postSampling(): Promise<SamplingRow[]>;
  49  |   }).postSampling());
  50  |   await test.info().attach('sampling-measurements', { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
  51  |   console.log('[post-sampling]', JSON.stringify(rows));
  52  |   expect(rows.every((row) => row.directPixels > 0 && row.directEnergy > 0), 'each frozen source is visibly present').toBe(true);
  53  |   expect(rows.filter((row) => row.source === 'control').every((row) => row.modes.some((mode) => mode.bleedPixels > 0)),
  54  |     'the several-pixel source produces positive bloom bleed').toBe(true);
  55  |   const actual = rows.filter((row) => row.source === 'particles' && row.resolution === 2)
  56  |     .map((row) => row.modes.find((mode) => mode.name === 'configured')!);
  57  |   expect(Math.max(...actual.map((mode) => mode.maxLoss)), 'bloom preserves directly rendered emission across subpixel phases').toBeLessThanOrEqual(1);
  58  |   expect(actual.every((mode) => mode.lostPixels === 0), 'bloom cannot erase covered source pixels').toBe(true);
  59  | });
  60  | 
  61  | test('bloom adds light without darkening additive exhaust @mobile', async ({ page }) => {
  62  |   const report = await render(page, 'fire');
  63  |   console.log('[post-composite] fire', report);
  64  |   expect(report.directChanged, 'real particles reached the real WebGL canvas').toBeGreaterThan(100);
  65  |   expect(report.directMinimum, 'direct additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
  66  |   expect(report.bloomMinimum, 'bloomed additive fire never subtracts background light').toBeGreaterThanOrEqual(-1);
  67  |   expect(report.bloomVsDirectMinimum, 'bloom never removes direct additive light').toBeGreaterThanOrEqual(-1);
  68  | });
  69  | 
  70  | test('bloom preserves normal smoke occlusion @mobile', async ({ page }) => {
  71  |   const report = await render(page, 'smoke');
  72  |   console.log('[post-composite] smoke', report);
  73  |   expect(report.directChanged, 'the normal smoke positive control is visible').toBeGreaterThan(100);
  74  |   expect(report.directMinimum, 'unfiltered smoke darkens its background').toBeLessThan(-3);
  75  |   expect(report.bloomMinimum, 'filtered smoke still darkens its background').toBeLessThan(-3);
  76  | });
  77  | 
  78  | for (const kind of ['fire-then-smoke', 'smoke-then-fire'] as const) {
  79  |   test(`bloom retains mixed ${kind} compositing @mobile`, async ({ page }) => {
  80  |     const report = await render(page, kind);
  81  |     console.log('[post-composite]', kind, report);
  82  |     expect(report.directChanged).toBeGreaterThan(100);
  83  |     expect(report.bloomVsDirectMinimum, 'bloom never subtracts light in either mixed draw order').toBeGreaterThanOrEqual(-1);
  84  |   });
  85  | }
  86  | 
  87  | test('additive bloom survives a real WebGL context restoration @mobile', async ({ page }) => {
  88  |   const report = await render(page, 'fire', true);
  89  |   expect(report.bloomMinimum).toBeGreaterThanOrEqual(-1);
  90  | });
  91  | 
  92  | 
  93  | test('continuous bell follows actual engine lifecycle and pressure @mobile', async ({ page }) => {
  94  |   await openWitness(page);
  95  |   const report = await page.evaluate(() => (window as unknown as {
  96  |     bellWitness(): Promise<import('./renderer/emissive-bell-witness').BellReport>;
  97  |   }).bellWitness());
  98  |   await test.info().attach('continuous-bell-measurements', { body: JSON.stringify(report), contentType: 'application/json' });
  99  |   console.log('[continuous-bell]', report);
  100 |   expect(report.offEnergy).toBe(0);
> 101 |   expect(report.oneEnergy).toBeGreaterThan(0);
      |                            ^ Error: expect(received).toBeGreaterThan(expected)
  102 |   expect(report.threeEnergy / report.oneEnergy).toBeGreaterThan(2.8);
  103 |   expect(report.threeEnergy / report.oneEnergy).toBeLessThan(3.2);
  104 |   expect(report.pausedDifference).toBe(0);
  105 |   expect(report.restartEnergy).toBe(0);
  106 |   expect(report.widths[0]).toBeGreaterThan(0);
  107 |   expect(report.widths[1]!).toBeGreaterThan(report.widths[0]!);
  108 |   expect(report.smokeMinimum.every(value => value < -3)).toBe(true);
  109 |   expect(report.mixedRed[0]!).toBeLessThan(report.mixedRed[1]! - 3);
  110 | });
  111 | 
```