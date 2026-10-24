/** Actual cold-origin off-nominal editor flight from the frozen natural witness.
 * No temperature, damage, fuel or engine-running patches during flight. Neutral
 * initialization flags correspond to manual control, fins and translation mode.
 * Physics evidence is separate in damage-natural-flight.test.ts; this checks
 * the live session and the exact component meshes after natural proof loss. */
import { writeFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';
import { test } from './visual-evidence-fixture';
import type { Deg } from '../../src/core/units';
import type { SimDebug } from '../../src/app/debug';
import { circularOrbitalSpeed, groundTangentialSpeed } from '../../src/core/physics/gravity';
import { damageModelFor } from '../../src/core/physics/damage-model';
import { SUPER_HEAVY } from '../../src/core/vehicles/super-heavy';
import { engineMassFlow } from '../../src/core/physics/propulsion';
import { IGNITION_DELAY_MAX_S } from '../../src/core/physics/engines';
import { planetRadius } from '../../src/core/constants';
import { captureCanvas } from './pixels';
import { openControls } from './helpers';

const gridsIndices = damageModelFor(SUPER_HEAVY).partition.components.flatMap((c, i) => c.kind === 'grid-fin' ? [i] : []);
type Telemetry = Record<string, number | boolean>;
const read = (page: Page) => page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry());
const present = (page: Page) => page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation());
async function until(page: Page, phase: 'warm' | 'cutoff' | 'loaded' | 'loss', cap: number) {
  let ticks = 0;
  while (ticks < cap) {
    const result = await page.evaluate(({ phase, count, indices }) => {
      const d = (window as unknown as { __simDebug: SimDebug }).__simDebug;
      for (let i = 0; i < count; i++) {
        const t = d.telemetry();
        const roots = indices.map(index => Number(t[`damage.components[${index}].root.temperature`]));
        const stop = phase === 'warm' ? Math.min(...roots) >= 1073.15
          : phase === 'cutoff' ? Math.hypot(Number(t['kinematics.speedX']), Number(t['kinematics.speedY'])) <= 4000
          : phase === 'loaded' ? Number(t['forces.dynamicPressure']) > 1
          : Number(t['damage.revision']) > 0;
        if (stop || t['damage.terminal.active'] || t['status.onTheGround']) return { done: stop, ticks: i, t };
        d.step(1);
      }
      return { done: false, ticks: count, t: d.telemetry() };
    }, { phase, count: Math.min(1200, cap - ticks), indices: gridsIndices });
    ticks += result.ticks;
    if (result.done) return result.t as Telemetry;
    if (result.t['damage.terminal.active']) console.log('natural terminal', { time: result.t['world.timeSpent'], reason: result.t['damage.terminal.reason'] });
    expect(result.t['damage.terminal.active'], `${phase} terminated prematurely`).toBe(false);
    expect(result.t['status.onTheGround']).toBe(false);
  }
  throw new Error(`${phase} exceeded declared physical phase cap ${cap} ticks`);
}

test('cold editor flight naturally loses grids and renders their real independent pieces @mobile', async ({ page }, info) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => '__simDebug' in window);
  await page.waitForFunction(() => {
    try { return !!(window as unknown as { __simDebug: SimDebug }).__simDebug.presentation(); } catch { return false; }
  });
  const altitude = 80000, radius = planetRadius + altitude;
  const speedX = groundTangentialSpeed(radius, circularOrbitalSpeed(radius));
  await page.evaluate(({ altitude, speedX }) => {
    const d = (window as unknown as { __simDebug: SimDebug }).__simDebug;
    d.pause(); d.setScenario('booster-sep', { altitude, xPosition: 0, speedX, speedY: 0, pitch: -90 as Deg, propellant: 3650, wind: 0 });
    d.setState({ 'status.finActive': true, 'status.translationModeOn': true, 'autopilot.manualControlOn': true });
  }, { altitude, speedX });
  const initial = await read(page);
  expect(initial['rng.seed']).toBe(0x57414c4b);
  for (const i of gridsIndices) expect(Number(initial[`damage.components[${i}].root.temperature`])).toBeLessThan(373.15);
  expect(initial['vehicle.propellantMass']).toBe(3650000);
  const warm = await until(page, 'warm', Math.ceil(718.8414509444451 * 120));
  console.log('natural warm', warm['world.timeSpent']);
  // T toggles hold; D release adopts current attitude/resumes the hold.
  await page.keyboard.press('t'); await page.keyboard.press('d');
  await openControls(page);
  for (const group of ['centre', 'inner', 'outer']) await page.getByTestId(`engine-group-${group}`).click();
  const ignition = await read(page);
  for (let i = 0; i < 33; i++) expect(typeof ignition[`engines.ignitionCountdown[${i}]`]).toBe('number');
  const cutoff = await until(page, 'cutoff', Math.ceil((SUPER_HEAVY.propellantCapacity / (33 * engineMassFlow(SUPER_HEAVY.propulsion, 'sea-level')) + IGNITION_DELAY_MAX_S) * 120));
  expect(Number(cutoff['vehicle.propellantMass'])).toBeLessThan(3650000);
  // Grab the yoke while hold is active, then disable hold and re-enable fins.
  await page.keyboard.down('d');
  await page.keyboard.press('t');
  await page.keyboard.press('f');
  for (const group of ['centre', 'inner', 'outer']) await page.getByTestId(`engine-group-${group}`).click();
  const entry = await read(page);
  expect(entry['status.finActive']).toBe(true);
  expect(entry['autopilot.manualControlOn']).toBe(true);
  const loaded = await until(page, 'loaded', Math.ceil(2 * Math.PI * radius / circularOrbitalSpeed(radius) * 120));
  expect(loaded['damage.revision']).toBe(0);
  // Presentation only: close the engine sheet and use existing player zoom.
  const panelToggle = page.getByTestId('engine-panel-toggle');
  if (await panelToggle.isVisible()) await panelToggle.click();
  await page.waitForTimeout(100);
  const healthyMeshes = (await present(page)).components!.filter(c => c.id.startsWith('booster-grid-'));
  await page.screenshot({ path: info.outputPath('natural-before-loss.png') });
  const loss = await until(page, 'loss', Math.ceil(2 * Math.PI * radius / circularOrbitalSpeed(radius) * 120));
  expect(loss['damage.terminal.active']).toBe(false);
  for (const i of gridsIndices) {
    expect(loss[`damage.components[${i}].attached`]).toBe(false);
    expect(loss[`damage.components[${i}].permanentFailure`]).toBe(1);
    expect(loss[`damage.debris[${i}].active`]).toBe(true);
  }
  await page.waitForTimeout(100);
  // Real player inspection zoom, not default-framing acceptance. Resolve the
  // original hardware only while every surviving part/piece fits the stage.
  function fitsStage(p: Awaited<ReturnType<typeof present>>) {
    return p.components!.filter(c => c.vehicle === 'super-heavy' && c.visible).every(c =>
      c.left >= 0 && c.top >= 0 && c.left + c.width <= p.width && c.top + c.height <= p.height);
  }
  for (let i = 0; i < 40; i++) {
    const before = await present(page);
    const pieces = before.components!.filter(c => c.id.startsWith('booster-grid-'));
    if (pieces.every(c => Math.min(c.width, c.height) >= 3)) break;
    await page.keyboard.press('=');
    await page.waitForTimeout(30);
    if (!fitsStage(await present(page))) {
      await page.keyboard.press('-');
      await page.waitForTimeout(30);
      break;
    }
  }
  await page.screenshot({ path: info.outputPath('natural-immediate-loss.png') });

  const rendered = await present(page);
  const grids = rendered.components!.filter(c => c.id.startsWith('booster-grid-'));
  expect(grids).toHaveLength(3);
  expect(fitsStage(rendered), 'inspection zoom must preserve the actual hull and piece bounds').toBe(true);
  expect(grids.every(c => Math.min(c.width, c.height) >= 3), 'real player view must resolve each grid to at least 3 CSS pixels without cropping the survivor').toBe(true);
  for (const grid of grids) expect(grid.meshIds).toEqual(healthyMeshes.find(c => c.id === grid.id)!.meshIds);
  expect(grids.every(c => c.detached && c.visible && c.meshes > 0)).toBe(true);
  expect(rendered.bodies!.some(body => body.id === 'super-heavy')).toBe(true);
  await page.screenshot({ path: info.outputPath('natural-after-loss.png') });
  const paused = await read(page);
  await page.waitForTimeout(150);
  expect(await read(page)).toEqual(paused);
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setVehiclesVisible(false));
  await page.waitForTimeout(100);
  expect((await present(page)).components!.every(c => !c.visible)).toBe(true);
  const absent = await captureCanvas(page);
  await writeFile(info.outputPath('natural-vehicle-absent.png'), absent);
  await info.attach('natural-vehicle-absent.png', { body: absent, contentType: 'image/png' });
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setVehiclesVisible(true));
  await page.waitForTimeout(100);
  const restored = await captureCanvas(page);
  await writeFile(info.outputPath('natural-restored.png'), restored);
  await info.attach('natural-restored.png', { body: restored, contentType: 'image/png' });
  async function piecePixels(absent: Buffer, restored: Buffer, grids: NonNullable<typeof rendered.components>) {
    return await page.evaluate(async ({ absent, restored, grids, viewport }) => {
    async function pixels(url: string) {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d')!; ctx.drawImage(bitmap, 0, 0);
      return { width: bitmap.width, height: bitmap.height, data: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data };
    }
    const a = await pixels(absent), b = await pixels(restored);
    const sx = b.width / viewport.width, sy = b.height / viewport.height;
    return grids.map(g => {
      let changed = 0;
      for (let y = Math.max(0, Math.floor(g.top * sy)); y < Math.min(b.height, Math.ceil((g.top + g.height) * sy)); y++)
        for (let x = Math.max(0, Math.floor(g.left * sx)); x < Math.min(b.width, Math.ceil((g.left + g.width) * sx)); x++) {
          const i = (y * b.width + x) * 4;
          if (Math.max(Math.abs(a.data[i]! - b.data[i]!), Math.abs(a.data[i + 1]! - b.data[i + 1]!), Math.abs(a.data[i + 2]! - b.data[i + 2]!)) > 8) changed++;
        }
      return { id: g.id, changed };
    });
  }, { absent: `data:image/png;base64,${absent.toString('base64')}`, restored: `data:image/png;base64,${restored.toString('base64')}`,
    grids, viewport: { width: rendered.width, height: rendered.height } });
  }
  const changedByPiece = await piecePixels(absent, restored, grids);
  console.log('natural piece pixels', changedByPiece, JSON.stringify({ grids, viewport: { width: rendered.width, height: rendered.height }, body: rendered.bodies }));
  expect(changedByPiece.every(piece => piece.changed > 0), 'each physical grid mesh contributes pixels inside its actual rendered bounds').toBe(true);
  expect(absent.equals(restored), 'same-state visibility control must change real rendered pixels').toBe(false);
  for (const grid of grids) {
    await page.evaluate(id => (window as unknown as { __simDebug: SimDebug }).__simDebug.setComponentVisible(id, false), grid.id);
    await page.waitForTimeout(100);
    const componentAbsent = await captureCanvas(page);
    expect((await present(page)).components!.find(c => c.id === grid.id)!.visible).toBe(false);
    await page.evaluate(id => (window as unknown as { __simDebug: SimDebug }).__simDebug.setComponentVisible(id, true), grid.id);
    await page.waitForTimeout(100);
    const componentPresent = await captureCanvas(page);
    const result = await piecePixels(componentAbsent, componentPresent, [grid]);
    console.log('individual natural grid control', result);
    await writeFile(info.outputPath(`${grid.id}-absent.png`), componentAbsent);
    await writeFile(info.outputPath(`${grid.id}-present.png`), componentPresent);
    await info.attach(`${grid.id}-absent.png`, { body: componentAbsent, contentType: 'image/png' });
    await info.attach(`${grid.id}-present.png`, { body: componentPresent, contentType: 'image/png' });
    expect(result[0]!.changed, `${grid.id} must itself contribute pixels, independently of the hull`).toBeGreaterThan(0);
  }

  expect(await read(page)).toEqual(paused);
  // Follow remains on the controlled surviving hull. Light debris may leave
  // its field of view as real drag separates them; no framing guarantee here.
  await page.keyboard.up('d');
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.step(120));
  await page.waitForTimeout(100);
  const separated = await read(page), separatedRender = await present(page);
  expect(separated['damage.terminal.active']).toBe(false);
  expect(separatedRender.bodies!.some(body => body.id === 'super-heavy')).toBe(true);
  const survivor = separatedRender.bodies!.find(body => body.id === 'super-heavy')!;
  expect(survivor.x).toBeGreaterThan(0); expect(survivor.x).toBeLessThan(separatedRender.width);
  expect(survivor.y).toBeGreaterThan(0); expect(survivor.y).toBeLessThan(separatedRender.height);
  const laterGrids = separatedRender.components!.filter(c => c.id.startsWith('booster-grid-'));
  expect(new Set(laterGrids.flatMap(c => c.meshIds)).size).toBe(grids.flatMap(c => c.meshIds).length);
  for (const grid of laterGrids) {
    const original = grids.find(c => c.id === grid.id)!;
    expect(grid.detached).toBe(true); expect(grid.meshIds).toEqual(original.meshIds);
    expect(Math.hypot(grid.x - original.x, grid.y - original.y)).toBeGreaterThan(0);
  }
  for (const i of gridsIndices) {
    expect(separated[`damage.components[${i}].attached`]).toBe(false);
    expect(separated[`damage.components[${i}].permanentFailure`]).toBe(1);
    expect(Math.hypot(Number(separated[`damage.debris[${i}].x`]) - Number(separated['kinematics.downRangeDistance']),
      Number(separated[`damage.debris[${i}].altitude`]) - Number(separated['kinematics.altitude'])))
      .toBeGreaterThan(Math.hypot(Number(loss[`damage.debris[${i}].x`]) - Number(loss['kinematics.downRangeDistance']),
        Number(loss[`damage.debris[${i}].altitude`]) - Number(loss['kinematics.altitude'])));
  }
  await page.screenshot({ path: info.outputPath('natural-one-second-separation.png') });
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setScenario('before-flip'));
  await page.waitForTimeout(100);
  expect((await present(page)).components!.filter(c => c.id.startsWith('booster-')).every(c => !c.visible)).toBe(true);
  await page.evaluate(({ altitude, speedX }) => (window as unknown as { __simDebug: SimDebug }).__simDebug.setScenario('booster-sep', { altitude, xPosition: 0, speedX, speedY: 0, pitch: -90 as Deg, propellant: 3650, wind: 0 }), { altitude, speedX });
  await page.waitForTimeout(100);
  expect((await read(page))['damage.revision']).toBe(0);
  expect((await present(page)).components!.filter(c => c.id.startsWith('booster-grid-')).every(c => !c.detached && c.visible)).toBe(true);
  await writeFile(info.outputPath('natural-endpoint.json'), JSON.stringify({ initial, warm, cutoff, loaded, loss, rendered, separated, separatedRender }, null, 2));
  await info.attach('natural-endpoint.json', { body: JSON.stringify({ initial, warm, cutoff, loaded, loss, rendered, separated, separatedRender }, null, 2), contentType: 'application/json' });
});
