# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pixel-scale.spec.ts >> a known-size canvas subject measures one vehicle height @mobile
- Location: tests/e2e/pixel-scale.spec.ts:5:1

# Error details

```
Error: screenshot and scale use the same pixels

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    393.5
```

# Page snapshot

```yaml
- generic [active] [ref=e1]: 0 m
```

# Test source

```ts
  1  | /** The screenshot's pixels are device pixels, even when Pixi renders at 2x. */
  2  | import { expect, test } from '@playwright/test';
  3  | import { metrePixels, readFrame } from './pixels';
  4  | 
  5  | test('a known-size canvas subject measures one vehicle height @mobile', async ({ page }) => {
  6  |   await page.setContent(`
  7  |     <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  8  |     <style>body { margin: 0 } canvas { width: 240px; height: 300px; display: block }</style>
  9  |     <canvas data-testid="world-canvas"></canvas>
  10 |     <span data-testid="readout-altitude-value">0</span>
  11 |     <span data-testid="readout-altitude-unit">m</span>
  12 |   `);
  13 |   await page.evaluate(() => {
  14 |     const canvas = document.querySelector('canvas')!;
  15 |     // Match the real renderer's capped backing buffer, while the page and its
  16 |     // screenshot retain their full device pixel ratio.
  17 |     const resolution = Math.min(window.devicePixelRatio || 1, 2);
  18 |     canvas.width = 240 * resolution;
  19 |     canvas.height = 300 * resolution;
  20 |     const context = canvas.getContext('2d')!;
  21 |     context.scale(resolution, resolution);
  22 |     context.fillStyle = 'black';
  23 |     context.fillRect(0, 0, 240, 300);
  24 |     // A 300px viewport draws the baseline 50m ship at exactly 100 CSS pixels.
  25 |     context.fillStyle = 'white';
  26 |     context.fillRect(100, 50, 20, 100);
  27 |   });
  28 |   const scale = await metrePixels(page);
  29 |   const frame = await readFrame(page, { extents: { subject: { minLuma: 200 } } });
  30 |   const subject = frame.extents.subject!;
  31 |   expect(subject.found).toBe(true);
> 32 |   expect(Math.abs(subject.heightPx - scale.vehicleHeightPx), 'screenshot and scale use the same pixels').toBeLessThanOrEqual(1);
     |                                                                                                          ^ Error: screenshot and scale use the same pixels
  33 | 
  34 |   await page.evaluate(() => {
  35 |     const canvas = document.querySelector('canvas')!;
  36 |     const context = canvas.getContext('2d')!;
  37 |     context.fillStyle = 'black';
  38 |     context.fillRect(0, 0, 240, 300);
  39 |   });
  40 |   const erased = await readFrame(page, { extents: { subject: { minLuma: 200 } } });
  41 |   expect(erased.extents.subject!.found, 'the detector rejects the erased subject').toBe(false);
  42 | });
  43 | 
```