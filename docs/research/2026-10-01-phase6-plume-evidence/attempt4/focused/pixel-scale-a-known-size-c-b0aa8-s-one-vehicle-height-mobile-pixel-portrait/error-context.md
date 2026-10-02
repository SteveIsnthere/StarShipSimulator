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
  7  |     <style>body { margin: 0 } canvas { width: 240px; height: 300px; display: block }</style>
  8  |     <canvas data-testid="world-canvas"></canvas>
  9  |     <span data-testid="readout-altitude-value">0</span>
  10 |     <span data-testid="readout-altitude-unit">m</span>
  11 |   `);
  12 |   await page.evaluate(() => {
  13 |     const canvas = document.querySelector('canvas')!;
  14 |     // Match the real renderer's capped backing buffer, while the page and its
  15 |     // screenshot retain their full device pixel ratio.
  16 |     const resolution = Math.min(window.devicePixelRatio || 1, 2);
  17 |     canvas.width = 240 * resolution;
  18 |     canvas.height = 300 * resolution;
  19 |     const context = canvas.getContext('2d')!;
  20 |     context.scale(resolution, resolution);
  21 |     context.fillStyle = 'black';
  22 |     context.fillRect(0, 0, 240, 300);
  23 |     // A 300px viewport draws the baseline 50m ship at exactly 100 CSS pixels.
  24 |     context.fillStyle = 'white';
  25 |     context.fillRect(100, 50, 20, 100);
  26 |   });
  27 |   const scale = await metrePixels(page);
  28 |   const frame = await readFrame(page, { extents: { subject: { minLuma: 200 } } });
  29 |   const subject = frame.extents.subject!;
  30 |   expect(subject.found).toBe(true);
> 31 |   expect(Math.abs(subject.heightPx - scale.vehicleHeightPx), 'screenshot and scale use the same pixels').toBeLessThanOrEqual(1);
     |                                                                                                          ^ Error: screenshot and scale use the same pixels
  32 | 
  33 |   await page.evaluate(() => {
  34 |     const canvas = document.querySelector('canvas')!;
  35 |     const context = canvas.getContext('2d')!;
  36 |     context.fillStyle = 'black';
  37 |     context.fillRect(0, 0, 240, 300);
  38 |   });
  39 |   const erased = await readFrame(page, { extents: { subject: { minLuma: 200 } } });
  40 |   expect(erased.extents.subject!.found, 'the detector rejects the erased subject').toBe(false);
  41 | });
  42 | 
```