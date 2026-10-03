/** Six actual production scenes; the identical state without bodies is the
 * pixel detector's negative control. No image-golden or fabricated flight. */
import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import type { SimDebug } from '../../src/app/debug';
import { captureCanvas, HULL_SILHOUETTE, readFrame } from './pixels';
import { painted, visualScene, VISUAL_SCENES } from './visual-scene-setup';

for (const scene of VISUAL_SCENES) {
  test(`actual ${scene} has drawn vehicle structure with a same-state absence control @mobile`, async ({ page }, info) => {
    await visualScene(page, scene);
    const state = await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry());
    const presentation = await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation());
    expect(presentation.bodies?.map(body => body.id)).toEqual(scene === 'staging'
      ? ['starship', 'super-heavy'] : [scene === 'catch' ? 'super-heavy' : 'starship']);
    for (const body of presentation.bodies!) {
      expect(body.width).toBeGreaterThan(0); expect(body.height).toBeGreaterThan(0);
      expect(Number.isFinite(body.x + body.y + body.rotation)).toBe(true);
    }
    await info.attach(`${scene}-state`, { body: JSON.stringify({ state, presentation }), contentType: 'application/json' });
    await writeFile(info.outputPath(`${scene}.png`), await captureCanvas(page));
    await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setVehiclesVisible(false));
    await painted(page);
    expect(await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation().bodies)).toEqual([]);
    const absent = await captureCanvas(page);
    // The existing cold silhouette rejects incandescent entry pixels.
    // Entry uses the established warm detector, with the same cause-off frame.
    const probe = { extents: { vehicle: scene === 'entry' ? { minLuma: 0, warmOnly: true } : HULL_SILHOUETTE } };
    expect((await readFrame(page, probe, absent)).extents['vehicle']!.count).toBe(0);
    await writeFile(info.outputPath(`${scene}-without-vehicles.png`), absent);
    await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setVehiclesVisible(true));
    await painted(page);
    const visible = await readFrame(page, probe, absent);
    expect(visible.extents['vehicle']!.count, 'removing actual bodies must remove measurable image structure').toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry())).toEqual(state);
    await info.attach(`${scene}-pixels`, { body: JSON.stringify(visible.extents), contentType: 'application/json' });
  });
}
