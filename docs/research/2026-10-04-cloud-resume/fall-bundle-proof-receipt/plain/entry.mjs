import { $ as e, A as t, B as n, C as r, D as i, E as a, F as o, G as s, H as c, I as l, J as u, K as d, L as f, M as p, N as m, O as h, P as g, Q as _, R as v, S as y, T as b, U as x, V as S, W as C, X as w, Y as T, Z as E, _ as D, a as O, at as k, b as A, c as j, d as M, et as N, f as P, g as F, h as I, i as L, it as R, j as z, k as B, l as V, m as H, n as U, nt as W, o as G, ot as K, p as q, q as J, r as Y, rt as X, s as Z, t as Q, tt as $, u as ee, v as te, w as ne, x as re, y as ie, z as ae } from "./simulation-C1HMHBVP.js";
//#region tests/proofs/fixtures/unpowered-fall-original.ts
function oe(t, r, i = _, p = t.kinematics.pitch) {
	let m = b(), h = f(12), y = o();
	t.damage && g(t, i, y);
	let D = t.damage ? y.totalMass : t.vehicle.vehicleMass, O = a();
	if (!(D > 0)) return O.downRange = NaN, O;
	let k = t.vehicle.vehicleInFlightMaxArea, A = t.world.wind;
	function j(r, a, o) {
		let { inputs: f, acc: g, atmosphere: _ } = m, y = $ + r;
		E(Math.max(r, 0), _);
		let b = a - ae(A, r), O = o, j = Math.sqrt(b * b + O * O), M = Math.atan2(b, O), P = T(p, M), F = C(P), I = k;
		if (t.damage) {
			let n = i.gridFins ? (t.vehicle.frontFinExtension - 50) / 50 * i.gridFins.maxAngle : t.vehicle.frontFinExtension * .01 * e;
			v(t.damage, l(i).controls, .5 * _.airDensity * j ** 2, Math.abs(Math.sin(F)), n, t.vehicle.aftFinExtension * .01 * e, h), I = i.maxArea + 1.8 * (h.frontArea + h.aftArea);
		}
		let L = d(R(F), I, i), z = j / w(_.airTemperature);
		f.angleOfMotion = R(M), f.angleOfAttack = R(P), f.aerodynamicDragAcceleration = J(_.airDensity, j, L, s(z)) / D, f.aerodynamicLiftAcceleration = u(_.airDensity, j, R(F), I) / D, g.x = c(f) + n(y, a, o), g.y = x(f, N) + N + S(y, a);
	}
	let M = .25, P = M * .5, F = t.kinematics.altitude, I = 0, L = t.kinematics.speedX, z = t.kinematics.speedY;
	for (let e = 0; e < 4e3; e++) {
		j(F, L, z);
		let t = L + m.acc.x * P, n = z + m.acc.y * P;
		j(F + z * P, t, n);
		let i = L + m.acc.x * M, a = z + m.acc.y * M, o = F + n * M, s = I + t * M;
		if (o <= r) {
			let t = (F - r) / (F - o);
			return O.reached = !0, O.time = (e + t) * M, O.downRange = I + (s - I) * t, O;
		}
		F = o, I = s, L = i, z = a;
	}
	return O.downRange = I, O;
}
//#endregion
export { U as ALL_SCENARIOS, te as BURN_STEP, ie as BURN_STEP_CAP, q as DEFAULT_SEED, A as FALL_STEP, re as FALL_STEP_CAP, Y as INTRO, L as INTRO_RENDER_BOX_HEIGHT, O as LAUNCH_PAD, y as MIN_LOCAL_GRAVITY, G as ORBITAL_PRESETS, Z as ORBIT_ALTITUDE, j as PRESETS, _ as SHIP, D as SUPER_HEAVY, W as ZERO_RAD, r as advanceUnpoweredFall, H as cloneState, ne as conservativeBurnStartAltitude, b as createBurnScratch, a as createFallResult, I as createInitialState, V as createIntroState, ee as createScenarioState, M as createScenarioVehicle, i as createUnpoweredFallWork, X as deg, P as getScenario, h as landingBurnStartAltitude, B as localGravity, oe as originalUnpoweredFall, R as rad, Q as step, F as syncDerivedFields, t as tailFirstDragDeceleration, z as thrustFor, k as toDeg, K as toRad, p as unpoweredFallInto, m as writeUnpoweredAcceleration };

//# sourceMappingURL=entry.mjs.map