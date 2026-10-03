/** Startup-owned welds, skirt and projected bells in metres. Authored surface
 * detail, not a change to physical hull/engine geometry or heat-shield model. */
import { Container, Graphics } from 'pixi.js';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { RVAC_EXIT_DIAMETER } from '$core/constants';
import { NOZZLE_EXIT_DIAMETER } from './atmosphere-look';

export function createVehicleDetail(height: number, diameter: number, booster: boolean): Container {
  const container = new Container({ label: booster ? 'booster-detail' : 'ship-detail' });
  if (!Number.isFinite(height + diameter) || height <= 0 || diameter <= 0) return container;
  const welds = new Graphics({ label: 'detail-welds' });
  // Rings stay below the Ship nose; booster has a full cylindrical tank wall.
  const top = booster ? -height / 2 + 1 : -height * 0.33;
  for (let y = top; y < height / 2 - 4; y += height / 18) {
    welds.moveTo(-diameter * 0.46, y).lineTo(diameter * 0.46, y);
  }
  welds.stroke({ color: booster ? 0x697780 : 0x343c42, width: diameter * 0.008 });
  container.addChild(welds);
  if (booster) {
    for (const side of [-1, 1]) {
      const rim = new Graphics({ label: side < 0 ? 'detail-rim-left' : 'detail-rim-right' });
      rim.rect(side < 0 ? -diameter / 2 : diameter * 0.34, -height / 2 + 0.3,
        diameter * 0.16, height - 0.6).fill(0xb8c1c7);
      container.addChild(rim);
    }
    const rim = new Graphics({ label: 'detail-hot-stage-rim' });
    for (let x = -diameter * 0.45; x < diameter / 2 - diameter / 24; x += diameter / 12) {
      rim.rect(x, -height / 2 + 0.2, diameter / 24, 1.3).fill(0x3b474f);
    }
    container.addChild(rim);
  }
  const skirt = new Graphics({ label: 'detail-skirt' });
  skirt.rect(-diameter / 2, height / 2 - 1.5, diameter, 0.3).fill(0x59656d);
  container.addChild(skirt);
  const model = booster ? SUPER_HEAVY : SHIP;
  for (let i = 0; i < model.engines.length; i++) {
    const mount = model.engines[i]!;
    const radius = (mount.kind === 'vacuum' ? RVAC_EXIT_DIAMETER : NOZZLE_EXIT_DIAMETER) / 2;
    const bell = new Graphics({ label: `detail-bell-${i}` });
    bell.poly([-radius * 0.35, -radius * 1.8, radius * 0.35, -radius * 1.8,
      radius, 0, -radius, 0]).fill(0x39434a);
    bell.moveTo(-radius, -0.08).lineTo(radius, -0.08).stroke({ color: 0x8e9ba4, width: 0.08 });
    bell.position.set(mount.offAxis * diameter / model.diameter, height / 2);
    container.addChild(bell);
  }
  return container;
}
