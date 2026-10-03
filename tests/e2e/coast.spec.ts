import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import type { SimDebug } from '../../src/app/debug';
import { byTestId } from '../../src/ui/testids';
import { ready } from './helpers';
import { painted, visualScene } from './visual-scene-setup';
import { captureCanvas } from './pixels';

let source: string;
test.beforeAll(async () => {
  source = (await build({ entryPoints: ['tests/e2e/renderer/coast-witness.ts'], bundle: true,
    write: false, format: 'iife', platform: 'browser', tsconfig: 'tsconfig.json',
    define: { 'process.env.NODE_ENV': '"production"' } })).outputFiles[0]!.text;
});

for (const far of [false, true]) test(`actual ${far ? 'distant' : 'near'} coast ocean and night source have GPU absence controls @mobile`, async ({ page }, info) => {
  await page.route('**/__coast.js', route => route.fulfill({ contentType: 'application/javascript', body: source }));
  await page.route('**/__coast', route => route.fulfill({ contentType: 'text/html', body: '<script src="/__coast.js"></script>' }));
  await page.goto('/__coast');
  const row = await page.evaluate(async far => {
    return (window as unknown as { coastWitness: typeof import('./renderer/coast-witness').coastWitness })
      .coastWitness(innerWidth, innerHeight, far);
  }, far);
  for (const [name, data] of [['day', row.dayCapture], ['night', row.nightCapture]]) {
    await writeFile(info.outputPath(`${name}.png`), Buffer.from(data!.split(',')[1]!, 'base64'));
  }
  await info.attach('coast-pixels', { body: JSON.stringify({ ...row, dayCapture: undefined, nightCapture: undefined }), contentType: 'application/json' });
  expect(row.oceanPixels).toBeGreaterThan(0);
  expect(row.absentPixels).toBe(0);
  expect(row.day.right).toBeLessThan(row.day.left);
  expect(row.night.right).toBeLessThan(row.day.right * 0.5);
  expect(row.night.left).toBeLessThan(row.day.left * 0.5);
  expect(row.nightSourcePixels).toBeGreaterThan(0);

});

for (const scene of ['launch', 'landing', 'catch'] as const) test(`coastal environment actual ${scene} capture @mobile`, async ({ page }, info) => {
  await visualScene(page, scene);
  await writeFile(info.outputPath(`${scene}.png`), await captureCanvas(page));
});

for (const altitude of [20000, 100000]) test(`coastal environment at ${altitude}m day and night @mobile`, async ({ page }, info) => {
  await page.goto('/?debug=1'); await ready(page);
  for (const hour of [12, 0]) {
    await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.pause());
    await page.locator(byTestId('open-menu')).click();
    await page.locator(byTestId('preset-booster-sep')).click();
    for (const [field, value] of Object.entries({ altitude: String(altitude), xPosition: '0', speedX: '0', speedY: '0', launchHour: String(hour) })) {
      await page.locator(byTestId(`field-${field}`)).fill(value);
    }
    await page.locator(byTestId('menu-configure')).click(); await painted(page);
    expect(await page.evaluate(() => Number((window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry()['kinematics.altitude']))).toBe(altitude);
    await writeFile(info.outputPath(`${altitude}-${hour}.png`), await captureCanvas(page));
  }
});
