/** Functional Super Heavy geometry in metres, reading real actuator positions.
 * Four grid fins are projected as two edge plates and two face plates in 2D.
 * Detailed surface artwork belongs to the following visual phase. */
import { Container, Graphics } from 'pixi.js';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import type { VehicleView } from './vehicle';
import { FIN_COLOR } from './vehicle';
import { flatLighting } from './lighting';

export function createBoosterVehicle(): VehicleView {
  const container = new Container({ label: 'super-heavy' });
  const hull = new Graphics({ label: 'booster-hull' });
  hull.rect(-4.5, -35.5, 9, 71).fill(FIN_COLOR);
  hull.rect(-4.5, 32.5, 9, 3).fill(0x525b61);
  // Tank welds and the open hot-stage rim make this visibly a booster.
  for (let y = -33; y < 32; y += 6) hull.moveTo(-4.44, y).lineTo(4.44, y);
  hull.stroke({ color: 0x78838b, width: 0.12 });
  const fins = Array.from({ length: 4 }, (_, i) => {
    const fin = new Graphics({ label: `grid-fin-${i + 1}` });
    fin.rect(0, -1.5, 4, 3).fill(FIN_COLOR);
    for (let x = 0.5; x < 4; x += 0.75) fin.moveTo(x, -1.5).lineTo(x, 1.5);
    fin.moveTo(0, 0).lineTo(4, 0).stroke({ color: 0x525b61, width: 0.16 });
    fin.x = i < 2 ? -4.5 : 4.5;
    fin.y = SUPER_HEAVY.height / 2 - SUPER_HEAVY.gridFins!.station;
    return fin;
  });
  container.addChild(fins[0]!, fins[2]!, hull, fins[1]!, fins[3]!);
  return {
    container,
    update(camera, viewport, state, sun) {
      container.position.set(viewport.width / 2 + (state.downRangeDistance - camera.posX - camera.shakeX) * viewport.scale,
        viewport.height / 2 - (state.altitude - camera.posY - camera.shakeY) * viewport.scale);
      container.rotation = state.pitch;
      container.scale.set(viewport.scale);
      const angle = (state.frontFinExtension - 50) / 50 * SUPER_HEAVY.gridFins!.maxAngle;
      for (let i = 0; i < fins.length; i++) {
        const fin = fins[i]!;
        fin.rotation = i < 2 ? Math.PI + angle : -angle;
        // Face plates remain present at neutral; all four articulate together.
        fin.scale.x = i % 2 === 0 ? 1 : 0.45;
      }
      const shade = sun ? Math.round(255 * Math.min(1, flatLighting(sun.south, sun.daylight))) : 255;
      container.tint = (shade << 16) | (shade << 8) | shade;
    },
  };
}
