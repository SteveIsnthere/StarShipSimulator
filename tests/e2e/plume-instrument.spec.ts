/** The exhaust instrument rejects background and fire above the nozzle. */
import { expect, test } from '@playwright/test';
import { captureCanvas, readFrame } from './pixels';

test('the paired exhaust mask excludes stars, terrain, reticle and nose fire @mobile', async ({ page }) => {
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{margin:0;background:black}canvas{width:240px;height:300px;display:block}</style>
    <canvas data-testid="world-canvas" width="480" height="600"></canvas>`);
  await page.evaluate(() => {
    const ctx = document.querySelector('canvas')!.getContext('2d')!;
    ctx.scale(2, 2);
    ctx.fillStyle = '#776644'; ctx.fillRect(0, 0, 240, 300);
    // Bright stars and a reticle, including one directly in the exhaust column.
    ctx.fillStyle = '#dcdcdc'; ctx.fillRect(120, 240, 3, 3);
    ctx.fillStyle = 'white'; ctx.fillRect(110, 155, 20, 2);
  });
  const reference = await captureCanvas(page);
  const query = { region: { x: 0.36, y: 0.6, width: 0.28, height: 0.39 }, minLuma: 200, orWarmth: 100 };
  const control = await readFrame(page, { extents: { plume: query } }, reference);
  expect(control.extents.plume!.found, 'unchanged background has no exhaust').toBe(false);
  await page.evaluate(() => {
    const ctx = document.querySelector('canvas')!.getContext('2d')!;
    // Fire above the nozzle must not become a plume, even though it changed.
    ctx.fillStyle = '#ff4000'; ctx.fillRect(100, 100, 40, 40);
  });
  const nose = await readFrame(page, { extents: { plume: query } }, reference);
  expect(nose.extents.plume!.found, 'nose-side fire is above the nozzle').toBe(false);
  await page.evaluate(() => {
    const ctx = document.querySelector('canvas')!.getContext('2d')!;
    // Neutral white core and dim but strongly warm halo must both be admitted.
    ctx.fillStyle = 'white'; ctx.fillRect(112, 184, 8, 32);
    ctx.fillStyle = '#b02000'; ctx.fillRect(104, 192, 8, 8);
    // A faint additive tail over a gray star is changed, but it was already
    // bright. It must not extend the exhaust to the star's location.
    ctx.fillStyle = 'rgb(221,220,220)'; ctx.fillRect(120, 240, 3, 3);
  });
  const subject = await readFrame(page, { extents: { plume: query } }, reference);
  const plume = subject.extents.plume!;
  expect(plume.found).toBe(true);
  expect(Math.abs(plume.top / subject.imageScale - 184)).toBeLessThanOrEqual(1);
  expect(Math.abs((plume.bottom + 1) / subject.imageScale - 216)).toBeLessThanOrEqual(1);
  expect(Math.abs(plume.left / subject.imageScale - 104)).toBeLessThanOrEqual(1);
  expect(Math.abs((plume.right + 1) / subject.imageScale - 120)).toBeLessThanOrEqual(1);
});
