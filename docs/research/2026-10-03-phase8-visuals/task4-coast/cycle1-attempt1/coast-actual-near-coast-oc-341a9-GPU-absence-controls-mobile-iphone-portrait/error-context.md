# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: coast.spec.ts >> actual near coast ocean and night source have GPU absence controls @mobile
- Location: tests/e2e/coast.spec.ts:17:34

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 42.5
Received:   44
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { build } from 'esbuild';
  3  | import { writeFile } from 'node:fs/promises';
  4  | import type { SimDebug } from '../../src/app/debug';
  5  | import { byTestId } from '../../src/ui/testids';
  6  | import { ready } from './helpers';
  7  | import { painted, visualScene } from './visual-scene-setup';
  8  | import { captureCanvas } from './pixels';
  9  | 
  10 | let source: string;
  11 | test.beforeAll(async () => {
  12 |   source = (await build({ entryPoints: ['tests/e2e/renderer/coast-witness.ts'], bundle: true,
  13 |     write: false, format: 'iife', platform: 'browser', tsconfig: 'tsconfig.json',
  14 |     define: { 'process.env.NODE_ENV': '"production"' } })).outputFiles[0]!.text;
  15 | });
  16 | 
  17 | for (const far of [false, true]) test(`actual ${far ? 'distant' : 'near'} coast ocean and night source have GPU absence controls @mobile`, async ({ page }, info) => {
  18 |   await page.route('**/__coast.js', route => route.fulfill({ contentType: 'application/javascript', body: source }));
  19 |   await page.route('**/__coast', route => route.fulfill({ contentType: 'text/html', body: '<script src="/__coast.js"></script>' }));
  20 |   await page.goto('/__coast');
  21 |   const row = await page.evaluate(async far => {
  22 |     return (window as unknown as { coastWitness: typeof import('./renderer/coast-witness').coastWitness })
  23 |       .coastWitness(innerWidth, innerHeight, far);
  24 |   }, far);
  25 |   expect(row.oceanPixels).toBeGreaterThan(0);
  26 |   expect(row.absentPixels).toBe(0);
  27 |   expect(row.day.right).toBeLessThan(row.day.left);
> 28 |   expect(row.night.right).toBeLessThan(row.day.right * 0.5);
     |                           ^ Error: expect(received).toBeLessThan(expected)
  29 |   expect(row.night.left).toBeLessThan(row.day.left * 0.5);
  30 |   expect(row.nightSourcePixels).toBeGreaterThan(0);
  31 |   for (const [name, data] of [['day', row.dayCapture], ['night', row.nightCapture]]) {
  32 |     await writeFile(info.outputPath(`${name}.png`), Buffer.from(data!.split(',')[1]!, 'base64'));
  33 |   }
  34 |   await info.attach('coast-pixels', { body: JSON.stringify({ ...row, dayCapture: undefined, nightCapture: undefined }), contentType: 'application/json' });
  35 | });
  36 | 
  37 | for (const scene of ['launch', 'landing', 'catch'] as const) test(`coastal environment actual ${scene} capture @mobile`, async ({ page }, info) => {
  38 |   await visualScene(page, scene);
  39 |   await writeFile(info.outputPath(`${scene}.png`), await captureCanvas(page));
  40 | });
  41 | 
  42 | for (const altitude of [20000, 100000]) test(`coastal environment at ${altitude}m day and night @mobile`, async ({ page }, info) => {
  43 |   await page.goto('/?debug=1'); await ready(page);
  44 |   for (const hour of [12, 0]) {
  45 |     await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.pause());
  46 |     await page.locator(byTestId('open-menu')).click();
  47 |     await page.locator(byTestId('preset-booster-sep')).click();
  48 |     for (const [field, value] of Object.entries({ altitude: String(altitude), xPosition: '0', speedX: '0', speedY: '0', launchHour: String(hour) })) {
  49 |       await page.locator(byTestId(`field-${field}`)).fill(value);
  50 |     }
  51 |     await page.locator(byTestId('menu-configure')).click(); await painted(page);
  52 |     expect(await page.evaluate(() => Number((window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry()['kinematics.altitude']))).toBe(altitude);
  53 |     await writeFile(info.outputPath(`${altitude}-${hour}.png`), await captureCanvas(page));
  54 |   }
  55 | });
  56 | 
```