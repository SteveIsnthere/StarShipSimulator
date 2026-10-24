import { $ as e, A as t, B as n, C as r, D as i, E as a, F as o, G as s, H as c, I as ee, J as l, K as u, L as d, M as f, N as p, O as m, P as h, Q as g, R as _, S as v, T as y, U as b, V as x, W as S, X as C, Y as w, Z as T, _ as E, a as D, at as O, b as k, c as A, ct as j, d as M, et as N, f as P, g as F, h as I, i as L, it as R, j as z, k as B, l as V, m as H, n as U, nt as W, o as te, ot as G, p as K, q, r as J, rt as Y, s as X, st as Z, t as Q, tt as $, u as ne, v as re, w as ie, x as ae, y as oe, z as se } from "./simulation-DqUEjDAx.js";
//#region tests/proofs/fixtures/unpowered-fall-original.ts
function ce(e, t, r = N, i = e.kinematics.pitch) {
	let f = y(), p = d(12), m = o();
	e.damage && h(e, r, m);
	let g = e.damage ? m.totalMass : e.vehicle.vehicleMass, v = a();
	if (!(g > 0)) return v.downRange = NaN, v;
	let E = e.vehicle.vehicleInFlightMaxArea, D = e.world.wind;
	function O(t, a, o) {
		let { inputs: d, acc: m, atmosphere: h } = f, v = Y + t;
		T(Math.max(t, 0), h);
		let y = a - se(D, t), O = o, k = Math.sqrt(y * y + O * O), A = Math.atan2(y, O), j = w(i, A), M = S(j), N = E;
		if (e.damage) {
			let t = r.gridFins ? (e.vehicle.frontFinExtension - 50) / 50 * r.gridFins.maxAngle : e.vehicle.frontFinExtension * .01 * $;
			_(e.damage, ee(r).controls, .5 * h.airDensity * k ** 2, Math.abs(Math.sin(M)), t, e.vehicle.aftFinExtension * .01 * $, p), N = r.maxArea + 1.8 * (p.frontArea + p.aftArea);
		}
		let P = u(G(M), N, r), F = k / C(h.airTemperature);
		d.angleOfMotion = G(A), d.angleOfAttack = G(j), d.aerodynamicDragAcceleration = q(h.airDensity, k, P, s(F)) / g, d.aerodynamicLiftAcceleration = l(h.airDensity, k, G(M), N) / g, m.x = c(d) + n(v, a, o), m.y = b(d, W) + W + x(v, a);
	}
	let k = .25, A = k * .5, j = e.kinematics.altitude, M = 0, P = e.kinematics.speedX, F = e.kinematics.speedY;
	for (let e = 0; e < 4e3; e++) {
		O(j, P, F);
		let n = P + f.acc.x * A, r = F + f.acc.y * A;
		O(j + F * A, n, r);
		let i = P + f.acc.x * k, a = F + f.acc.y * k, o = j + r * k, s = M + n * k;
		if (o <= t) {
			let n = (j - t) / (j - o);
			return v.reached = !0, v.time = (e + n) * k, v.downRange = M + (s - M) * n, v;
		}
		j = o, M = s, P = i, F = a;
	}
	return v.downRange = M, v;
}
//#endregion
export { U as ALL_SCENARIOS, re as BURN_STEP, oe as BURN_STEP_CAP, K as DEFAULT_SEED, k as FALL_STEP, ae as FALL_STEP_CAP, J as INTRO, L as INTRO_RENDER_BOX_HEIGHT, D as LAUNCH_PAD, v as MIN_LOCAL_GRAVITY, te as ORBITAL_PRESETS, X as ORBIT_ALTITUDE, A as PRESETS, N as SHIP, E as SUPER_HEAVY, R as ZERO_RAD, r as advanceUnpoweredFall, H as cloneState, ie as conservativeBurnStartAltitude, y as createBurnScratch, a as createFallResult, I as createInitialState, V as createIntroState, ne as createScenarioState, M as createScenarioVehicle, i as createUnpoweredFallWork, O as deg, P as getScenario, m as landingBurnStartAltitude, B as localGravity, ce as originalUnpoweredFall, G as rad, g as readCounts, e as resetCounts, Q as step, F as syncDerivedFields, t as tailFirstDragDeceleration, z as thrustFor, Z as toDeg, j as toRad, f as unpoweredFallInto, p as writeUnpoweredAcceleration };

//# sourceMappingURL=entry.mjs.map