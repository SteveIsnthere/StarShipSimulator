/** The screenshot's pixels are device pixels, even when Pixi renders at 2x. */
import { expect, test } from '@playwright/test';
import { metrePixels, readFrame } from './pixels';

test('a known-size canvas subject measures one vehicle height @mobile', async ({ page }) => {
  await page.setContent(`
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <style>body { margin: 0; background: black } canvas { width: 240px; height: 300px; display: block }</style>
    <canvas data-testid="world-canvas"></canvas>
    <span data-testid="readout-altitude-value">0</span>
    <span data-testid="readout-altitude-unit">m</span>
  `);
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    // Match the real renderer's capped backing buffer, while the page and its
    // screenshot retain their full device pixel ratio.
    const resolution = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 240 * resolution;
    canvas.height = 300 * resolution;
    const context = canvas.getContext('2d')!;
    context.scale(resolution, resolution);
    context.fillStyle = 'black';
    context.fillRect(0, 0, 240, 300);
    // A 300px viewport draws the baseline 50m ship at exactly 100 CSS pixels.
    context.fillStyle = 'white';
    // Start on an integer device pixel on every configured DPR (48 * 2.625
    // is 126). This avoids rounding both edges of a half-pixel-height subject.
    context.fillRect(104, 48, 24, 100);
  });
  const scale = await metrePixels(page);
  const frame = await readFrame(page, { extents: { subject: { minLuma: 200 } } });
  const subject = frame.extents.subject!;
  expect(subject.found).toBe(true);
  expect(Math.abs(subject.heightPx - scale.vehicleHeightPx), 'screenshot and scale use the same pixels').toBeLessThanOrEqual(1);

  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'black';
    context.fillRect(0, 0, 240, 300);
  });
  const erased = await readFrame(page, { extents: { subject: { minLuma: 200 } } });
  expect(erased.extents.subject!.found, 'the detector rejects the erased subject').toBe(false);
});
