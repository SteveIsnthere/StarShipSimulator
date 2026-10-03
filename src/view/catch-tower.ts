/** Functional catch target, in metres. Geometry never changes the flight;
 * its secured indicator reads the physical catch verdict, not proximity. */
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
  const secured = new Graphics({ label: 'tower-secured' });
  secured.rect(-CATCH.halfWidth, -CATCH.planeAltitude - 0.4, CATCH.halfWidth * 2, 0.4).fill(0x82bca0);
  secured.visible = false;
  container.addChild(mast, arms, secured);
  container.visible = false;
  return {
    container,
    update(camera: CameraState, viewport: Viewport, booster: SimState | undefined) {
      container.visible = booster !== undefined;
      if (!booster) return;
      container.position.set(viewport.width / 2 + (starBaseXPos - camera.posX - camera.shakeX) * viewport.scale,
        viewport.height / 2 + (camera.posY + camera.shakeY) * viewport.scale);
      container.scale.set(viewport.scale);
      secured.visible = booster.status.landed && !booster.status.onTheGround
        && !booster.failures.crashed && !booster.failures.inFlightBreakUp;
    },
  };
}
