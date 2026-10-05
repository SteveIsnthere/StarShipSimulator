/** Actual production scene and canonical two-body clock, on all five viewports. */
import { expect, type Page } from '@playwright/test';
import { test } from './visual-evidence-fixture';
import type { SimDebug } from '../../src/app/debug';
import { byTestId } from '../../src/ui/testids';
import { ready, tap, openYoke } from './helpers';

const presentation = (page: Page) => page.evaluate(() =>
  (window as unknown as { __simDebug: SimDebug }).__simDebug.presentation());
const telemetry = (page: Page) => page.evaluate(() =>
  (window as unknown as { __simDebug: SimDebug }).__simDebug.telemetry());

test('both real staging bodies render and selection preserves the shared paused clock @mobile', async ({ page }, info) => {
  await page.goto('/?debug=1');
  await ready(page);
  await page.locator(byTestId('open-menu')).click();
  await page.locator(byTestId('start-hot-stage')).click();
  await expect(page.locator(byTestId('menu'))).toBeHidden();
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.pause());
  await openYoke(page);
  await expect(page.getByRole('status').filter({ hasText: /^Attached$/ })).toBeVisible();
  await expect.poll(async () => (await presentation(page)).bodies?.map(body => body.id)).toEqual(['starship', 'super-heavy']);
  // No Stage is a positive negative control: real fixed steps keep attachment
  // and do not manufacture Ship ignition or separation.
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.step(32));
  await expect(page.getByRole('status').filter({ hasText: /^Attached$/ })).toBeVisible();
  expect((await telemetry(page))['engines.running[0]']).toBe(false);
  await tap(page, 'stage');
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.step(180));
  await expect(page.getByRole('status').filter({ hasText: /^Separated$/ })).toBeVisible();
  await expect.poll(async () => (await presentation(page)).bell?.visibleMounts).toBe(6);
  const ship = await telemetry(page);
  const renderedShip = (await presentation(page)).bodies!.find(body => body.id === 'starship')!;
  await tap(page, 'select-super-heavy');
  await expect.poll(async () => (await presentation(page)).bell?.visibleMounts).toBe(3);
  const booster = await telemetry(page);
  expect(booster['world.environmentTime']).toBe(ship['world.environmentTime']);
  expect(booster['kinematics.altitude']).not.toBe(ship['kinematics.altitude']);
  expect(booster['vehicle.propellantMass']).not.toBe(ship['vehicle.propellantMass']);
  expect(booster['engines.running[32]']).toBe(false);
  // Group readouts have their own row and stay within the HUD on a phone.
  const groupBounds = await page.getByRole('region', { name: 'Flight data' }).locator('[data-engine-group]').evaluateAll(nodes =>
    nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; }));
  expect(groupBounds).toHaveLength(3);
  for (let i = 1; i < groupBounds.length; i++) expect(groupBounds[i]!.left).toBeGreaterThanOrEqual(groupBounds[i - 1]!.right);
  const rendered = await presentation(page);
  expect(rendered.bodies).toHaveLength(2);
  expect(rendered.bodies!.find(body => body.id === 'super-heavy')!.y).not.toBe(rendered.bodies!.find(body => body.id === 'starship')!.y);
  expect(renderedShip.height).toBeGreaterThan(0);
  const clearFrame = await page.locator(byTestId('world-canvas')).boundingBox();
  const hud = await page.getByRole('region', { name: 'Flight data' }).boundingBox();
  expect(clearFrame!.y).toBeGreaterThanOrEqual(hud!.y + hud!.height - 1);
  for (const body of rendered.bodies!) {
    expect(body.y).toBeGreaterThan(0);
    expect(body.y).toBeLessThan(rendered.height);
  }
  // Selection itself cannot step either body. The actual fixed clock remains
  // paused through repeated input and a real browser frame.
  await page.screenshot({ path: info.outputPath('staged-both-bodies.png') });
  expect(await telemetry(page)).toEqual(booster);
  await tap(page, 'select-ship');
  expect(await telemetry(page)).toEqual(ship);
  await expect(page.locator(byTestId('event-now'))).toHaveText('SEPARATION');
  // Inject a terminal failure solely to expose the actual Fly again command.
  // This is a restart-routing witness, not an autonomous mission loss claim.
  await page.evaluate(() => {
    const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
    debug.setState({ 'failures.inFlightBreakUp': true }); debug.step(1);
  });
  await expect(page.locator(byTestId('debrief'))).toHaveAttribute('data-outcome', 'LOSS');
  await page.locator(byTestId('debrief-restart')).click();
  await expect(page.getByRole('status').filter({ hasText: /^Attached$/ })).toBeVisible();
  await expect.poll(async () => (await presentation(page)).bell?.visibleMounts).toBe(0);
  const restarted = await telemetry(page);
  expect(restarted['world.environmentTime']).toBe(0);
  expect(restarted['engines.running[0]']).toBe(false);
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setScenario('rtls'));
  await expect.poll(async () => (await presentation(page)).bodies?.map(body => body.id)).toEqual(['super-heavy']);
  await expect(page.locator(byTestId('select-ship'))).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { __simDebug: SimDebug }).__simDebug.setScenario('landing-burn'));
  await expect.poll(async () => (await presentation(page)).bodies?.map(body => body.id)).toEqual(['starship']);
  await expect.poll(async () => (await presentation(page)).bell?.visibleMounts).toBe(0);
});
