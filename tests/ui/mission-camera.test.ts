import { expect, it } from 'vitest';
import { createCameraFollow } from '$ui/session/camera-follow';
import { createMissionController } from '$ui/session/mission-controller';
import { createCamera, computeViewport, worldToScreen } from '$view/camera';
import type { ViewApp } from '$view/app';
import { DT } from '$app/loop';

it('fits real attached hulls in a narrow zoomed viewport, then follows an explicit selection', () => {
  const normal = computeViewport(390, 300, 50, 8);
  const fakeView = { viewport: normal, camera: createCamera(normal, 0, 0, 0),
    followAltitude() { this.viewport = normal; } };
  const view = fakeView as unknown as ViewApp;
  const controller = createMissionController();
  controller.startHotStage(123);
  const camera = createCameraFollow();
  camera.reset(view, controller.loop.state, controller.mission);
  for (const [state, halfHeight] of [[controller.mission!.ship, 25], [controller.mission!.booster, 35.5]] as const) {
    const p = worldToScreen(view.camera, view.viewport, state.kinematics.downRangeDistance, state.kinematics.altitude);
    expect(p.y - halfHeight * view.viewport.scale).toBeGreaterThan(0);
    expect(p.y + halfHeight * view.viewport.scale).toBeLessThan(view.viewport.height);
  }
  const before = structuredClone(controller.mission);
  controller.selectVehicle('super-heavy');
  camera.select(view, controller.loop.state);
  expect(view.camera.posX).toBe(controller.loop.state.kinematics.downRangeDistance);
  expect(view.camera.posY).toBe(controller.loop.state.kinematics.altitude);
  expect(view.camera.speedX).toBe(controller.loop.state.kinematics.speedX);
  expect(controller.mission).toEqual(before);
  controller.stage();
  controller.advance(DT);
  camera.step(view, controller.loop.state, controller.mission);
  expect(view.viewport).toBe(normal); // Explicit selection ends pair framing.
});
