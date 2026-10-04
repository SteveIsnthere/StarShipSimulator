import { $ as e, A as t, B as n, C as r, D as i, E as a, F as o, G as s, H as c, I as l, J as u, K as d, L as f, M as p, N as m, O as h, P as g, Q as _, R as v, S as y, T as b, U as x, V as S, W as C, X as w, Y as T, Z as E, _ as D, a as O, at as k, b as A, c as j, ct as M, d as N, dt as P, et as F, f as I, ft as L, g as R, h as z, ht as B, i as V, it as H, j as U, k as W, l as G, lt as K, m as q, mt as J, n as ee, nt as Y, o as X, ot as Z, p as Q, pt as $, q as te, r as ne, rt as re, s as ie, st as ae, t as oe, tt as se, u as ce, ut as le, v as ue, w as de, x as fe, y as pe, z as me } from "./simulation-Yh007HZ3.js";
//#region tests/proofs/fixtures/unpowered-fall-original.ts
function he(r, i, a = H, o = r.kinematics.pitch) {
	let l = W(), f = S(12), p = me();
	r.damage && v(r, a, p);
	let m = r.damage ? p.totalMass : r.vehicle.vehicleMass, h = t();
	if (!(m > 0)) return h.downRange = NaN, h;
	let g = r.vehicle.vehicleInFlightMaxArea, y = r.world.wind;
	function b(t, i, p) {
		let { inputs: h, acc: v, atmosphere: b } = l, S = ae + t;
		T(Math.max(t, 0), b);
		let w = i - x(y, t), E = p, D = Math.sqrt(w * w + E * E), O = Math.atan2(w, E), A = re(o, O), j = _(A), M = g;
		if (r.damage) {
			let e = a.gridFins ? (r.vehicle.frontFinExtension - 50) / 50 * a.gridFins.maxAngle : r.vehicle.frontFinExtension * .01 * k;
			c(r.damage, n(a).controls, .5 * b.airDensity * D ** 2, Math.abs(Math.sin(j)), e, r.vehicle.aftFinExtension * .01 * k, f), M = a.maxArea + 1.8 * (f.frontArea + f.aftArea);
		}
		let N = F(P(j), M, a), I = D / u(b.airTemperature);
		h.angleOfMotion = P(O), h.angleOfAttack = P(A), h.aerodynamicDragAcceleration = se(b.airDensity, D, N, e(I)) / m, h.aerodynamicLiftAcceleration = Y(b.airDensity, D, P(j), M) / m, v.x = d(h) + C(S, i, p), v.y = te(h, Z) + Z + s(S, i);
	}
	let w = .25, E = w * .5, D = r.kinematics.altitude, O = 0, A = r.kinematics.speedX, j = r.kinematics.speedY;
	for (let e = 0; e < 4e3; e++) {
		b(D, A, j);
		let t = A + l.acc.x * E, n = j + l.acc.y * E;
		b(D + j * E, t, n);
		let r = A + l.acc.x * w, a = j + l.acc.y * w, o = D + n * w, s = O + t * w;
		if (o <= i) {
			let t = (D - i) / (D - o);
			return h.reached = !0, h.time = (e + t) * w, h.downRange = O + (s - O) * t, h;
		}
		D = o, O = s, A = r, j = a;
	}
	return h.downRange = O, h;
}
//#endregion
export { X as ALL_SCENARIOS, y as BURN_STEP, r as BURN_STEP_CAP, w as CATCH, ue as DEFAULT_SEED, de as FALL_STEP, b as FALL_STEP_CAP, ie as INTRO, j as INTRO_RENDER_BOX_HEIGHT, G as LAUNCH_PAD, a as MIN_LOCAL_GRAVITY, ce as ORBITAL_PRESETS, N as ORBIT_ALTITUDE, I as PRESETS, H as SHIP, E as SUPER_HEAVY, K as ZERO_RAD, oe as advanceMechanics, i as advanceUnpoweredFall, pe as cloneState, h as conservativeBurnStartAltitude, W as createBurnScratch, V as createCatchPose, t as createFallResult, A as createInitialState, Q as createIntroState, q as createScenarioState, z as createScenarioVehicle, U as createUnpoweredFallWork, le as deg, R as getScenario, p as landingBurnStartAltitude, m as localGravity, he as originalUnpoweredFall, P as rad, J as readCounts, B as resetCounts, ne as runBoosterPolicy, M as starBaseXPos, ee as step, fe as syncDerivedFields, g as tailFirstDragDeceleration, o as thrustFor, L as toDeg, $ as toRad, D as toggleAutoLand, l as unpoweredFallInto, O as writeCatchPose, f as writeUnpoweredAcceleration };

//# sourceMappingURL=entry.mjs.map