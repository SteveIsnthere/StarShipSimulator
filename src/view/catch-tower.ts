/** Functional catch target, in metres. Geometry never changes the flight;
 * its secured indicator reads the physical catch verdict, not proximity. */
import { groundDaylight, type SunLight } from './sun';
import { Container, Graphics } from 'pixi.js';
import { starBaseXPos } from '$core/constants';
import { CATCH } from '$core/vehicles/super-heavy';
import type { SimState } from '$core/state';
import type { CameraState, Viewport } from './camera';

export function createCatchTower() {
  const container = new Container({ label: 'catch-tower' });
  const mast = new Graphics({ label: 'tower-mast' });
  mast.rect(-22, -CATCH.planeAltitude - 10, 6, CATCH.planeAltitude + 10).fill(0x626d75);
  for (let y = 0; y < CATCH.planeAltitude + 10; y += 10) {
    mast.moveTo(-22, -y).lineTo(-16, -y - 10).moveTo(-16, -y).lineTo(-22, -y - 10);
  }
  mast.stroke({ color: 0x39444c, width: 0.3 });
  const arms = new Graphics({ label: 'catch-arms' });
  arms.rect(-16, -CATCH.planeAltitude, 16 - CATCH.halfWidth, 1.5)
    .rect(CATCH.halfWidth, -CATCH.planeAltitude, 6, 1.5).fill(0xa4afb7);
  const carriage = new Graphics({ label: 'tower-carriage' });
  carriage.rect(-23, -CATCH.planeAltitude - 5, 8, 10).fill(0x89959d);
  carriage.moveTo(-15, -CATCH.planeAltitude - 4).lineTo(-8, -CATCH.planeAltitude)
    .moveTo(-15, -CATCH.planeAltitude + 4).lineTo(-8, -CATCH.planeAltitude);
  carriage.stroke({ color: 0x495861, width: 0.7 });
  const lights = new Graphics({ label: 'tower-lights' });
  lights.blendMode = 'add';
  for (const y of [30, 70, CATCH.planeAltitude + 10]) {
    lights.circle(-19, -y, 1.2).fill({ color: 0xffc27b, alpha: 0.4 });
    lights.circle(-19, -y, 0.35).fill(0xffe3ba);
  }
  const secured = new Graphics({ label: 'tower-secured' });
  secured.rect(-CATCH.halfWidth, -CATCH.planeAltitude - 0.4, CATCH.halfWidth * 2, 0.4).fill(0x82bca0);
  secured.visible = false;
  container.addChild(mast, arms, carriage, lights, secured);
  container.visible = false;
  return {
    container,
    update(camera: CameraState, viewport: Viewport, booster: SimState | undefined, sun?: SunLight) {
      container.visible = booster !== undefined;
      if (!booster) return;
      container.position.set(viewport.width / 2 + (starBaseXPos - camera.posX - camera.shakeX) * viewport.scale,
        viewport.height / 2 + (camera.posY + camera.shakeY) * viewport.scale);
      container.scale.set(viewport.scale);
      const daylight = sun ? groundDaylight(sun) : 1;
      mast.tint = arms.tint = carriage.tint = Math.round(255 * daylight) * 0x010101;
      lights.alpha = sun ? 1 - sun.daylight : 0;
      secured.visible = booster.status.landed && !booster.status.onTheGround
        && !booster.failures.crashed && !booster.failures.inFlightBreakUp;
    },
  };
}
