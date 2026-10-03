import { createHotStageMission, stepMission, bodyMassPose } from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/mission.ts';
import { SUPER_HEAVY } from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/vehicles/super-heavy.ts';
import { SHIP } from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/vehicle.ts';
import { rad } from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/units.ts';
import { planetRadius } from '/Users/stevewang/dev/StarShipSimulator-realism/src/core/constants.ts';
const m = createHotStageMission(123); m.phase = 'separated';
for (const s of [m.ship, m.booster]) {
 s.kinematics.altitude = 1e12; s.kinematics.distanceToPlanetCenter = planetRadius + 1e12;
 s.kinematics.pitch = rad(0); s.kinematics.angularVelocity = 1; s.kinematics.angularAcceleration = 0;
 s.kinematics.speedX = s.kinematics.speedY = 0;
 s.engines.running.fill(false); s.engines.ignitionCountdown.fill(null);
}
const before = bodyMassPose(m.booster, SUPER_HEAVY); const n = stepMission(m, 1/120); const after = bodyMassPose(n.booster, SUPER_HEAVY);
console.log('booster mass COM finite-difference vx', (after.x-before.x)*120, 'declared mass COM vx', n.booster.kinematics.speedX);
const sb = bodyMassPose(m.ship, SHIP), sa=bodyMassPose(n.ship, SHIP);
console.log('ship mass COM finite-difference vx', (sa.x-sb.x)*120, 'declared mass COM vx', n.ship.kinematics.speedX);
