//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, n = 0, r = 0, i = 0, a = 0;
function o() {
	n++;
}
function s() {
	r++;
}
function c() {
	i++;
}
function l() {
	a++;
}
function u() {
	n = 0, r = 0, i = 0, a = 0;
}
function d() {
	return {
		isa: n,
		controls: r,
		prepared: i,
		fallback: a
	};
}
//#endregion
//#region src/core/units.ts
function f(e) {
	return e;
}
function p(e) {
	return e;
}
function m(e) {
	return e / 180 * Math.PI;
}
function h(e) {
	return e / Math.PI * 180;
}
var g = f(0), _ = 6371e3, v = 2 * _ * Math.PI, y = 3986004418e5;
v / 86400;
var b = 7292115e-11, x = m(p(25.997));
b * Math.cos(x);
var S = 9.807, C = v / 2, ee = Math.PI * (9 / 2) ** 2, te = 35e4, ne = 47e4, re = 3500;
ne * (9 / 2) ** 2 * .25 + ne * 2500 / 12;
var ie = .1, ae = 1 / 2, oe = 1 / 2, se = (e, t) => ({
	kind: e,
	offAxis: t,
	offAxisForceFraction: -t / Math.sqrt(t ** 2 + 625)
}), ce = [
	se("sea-level", -1),
	se("sea-level", ae),
	se("sea-level", oe),
	se("vacuum", -3),
	se("vacuum", 1.5),
	se("vacuum", 1.5)
], le = ce.flatMap((e, t) => e.kind === "sea-level" ? [t] : []), ue = 21.8, de = m(p(15)), fe = 9.80665, pe = 23e4 * fe, me = 101325;
pe / (327 * fe) * fe * 350, 158645.8058103975 / me, 258e3 * fe / (380 * fe), Math.PI * (2.3 / 2) ** 2;
var he = pe, ge = 8e5, _e = f(1.03), ve = 24.2, ye = 23.3, be = 45.8, xe = 12.6, Se = 17415e-8, Ce = 5.670374419e-8, we = .85, Te = 1533, Ee = 273.15;
we * Ce * Te ** 4;
var De = 841800, Oe = 8e4, ke = S * 1.6, Ae = 1 * he;
Ae * 2, Ae * 3, 1 * he * 40 * .01;
var je = m(p(3)), Me = m(p(10)), Ne = m(p(20)), Pe = 5.5, Fe = Pe, Ie = Fe * 1.5;
Fe * 2;
var Le = m(p(55)), Re = m(p(85)), ze = f(Math.PI * .5), Be = m(p(30)), Ve = /* @__PURE__ */ t({
	engineMassFlow: () => w,
	engineThrust: () => T,
	isCanonicalBurnPropulsion: () => He
});
function w(e, t) {
	return t === "sea-level" ? e.seaLevel.thrustSeaLevel / (e.seaLevel.ispSeaLevel * e.standardGravity) : e.vacuum.thrustVacuum / (e.vacuum.ispVacuum * e.standardGravity);
}
function T(e, t, n) {
	let r = Math.max(0, n) * 1e3, i = t === "sea-level" ? w(e, t) * e.standardGravity * e.seaLevel.ispVacuum : e.vacuum.thrustVacuum, a = t === "sea-level" ? (i - e.seaLevel.thrustSeaLevel) / e.referencePressurePa : e.vacuum.effectiveExitArea;
	return Math.max(0, i - r * a);
}
function He(e, t, n) {
	return e === He && t === w && n === T;
}
//#endregion
//#region src/core/vehicles/v3.ts
var Ue = 9.80665, We = Object.freeze({
	standardGravity: Ue,
	referencePressurePa: 101325,
	seaLevel: Object.freeze({
		thrustSeaLevel: 25e4 * Ue,
		ispSeaLevel: 327,
		ispVacuum: 350
	}),
	vacuum: Object.freeze({
		thrustVacuum: 275e3 * Ue,
		ispVacuum: 380,
		effectiveExitArea: Math.PI * (2.3 / 2) ** 2
	})
});
function Ge(e, t) {
	return Object.freeze({
		kind: e,
		gimballed: t
	});
}
var Ke = Object.freeze({
	id: "ship",
	height: 52,
	diameter: 9,
	dryMass: 12e4,
	propellantCapacity: 16e5,
	engines: Object.freeze([
		Ge("sea-level", !0),
		Ge("sea-level", !0),
		Ge("sea-level", !0),
		Ge("vacuum", !1),
		Ge("vacuum", !1),
		Ge("vacuum", !1)
	]),
	propulsion: We
}), qe = Object.freeze({
	id: "super-heavy",
	height: 72,
	diameter: 9,
	dryMass: 2e5,
	propellantCapacity: 365e4,
	engines: Object.freeze(Array.from({ length: 33 }, (e, t) => Ge("sea-level", t < 13))),
	propulsion: We,
	gridFins: Object.freeze({
		count: 3,
		area: 27
	})
});
Object.freeze({
	ship: Ke,
	superHeavy: qe
});
var Je = 3.6 / 4.6, Ye = 1141, Xe = Ke.propellantCapacity, Ze = Ke.height / 50, Qe = 5, $e = Math.PI * (9 / 2) ** 2, et = Xe * Je / (Ye * $e), tt = Xe * .21739130434782605 / (424 * $e), E = Object.freeze({
	id: "ship",
	propulsion: Ke.propulsion,
	height: Ke.height,
	diameter: Ke.diameter,
	dryMass: Ke.dryMass,
	propellantCapacity: Xe,
	initialPropellant: te,
	dryCentreOfMass: ue * Ze,
	tankBottom: Qe,
	loxTankHeight: et,
	ch4TankHeight: tt,
	ch4TankBottom: Qe + et,
	aftFinStation: (ue - xe) * Ze,
	frontFinStation: (ue + ye) * Ze,
	rcsStation: (ue + 20) * Ze,
	minArea: ee,
	maxArea: Ke.height * Ke.diameter,
	frontFinArea: ve,
	aftFinArea: be,
	engines: Object.freeze(ce.map((e) => Object.freeze({
		...e,
		offAxisForceFraction: -e.offAxis / Math.sqrt(e.offAxis ** 2 + (Ke.height / 2) ** 2)
	}))),
	ignitionGroup: le
}), nt = /* @__PURE__ */ t({
	foldedIntoWind: () => ht,
	getAcceleration: () => ct,
	getAftFinDrag: () => vt,
	getAngleOfMotion: () => ut,
	getAngularAcceleration: () => lt,
	getAngularDragAcceleration: () => gt,
	getAttackAngles: () => pt,
	getBodyDragCoefficient: () => st,
	getCrossSectionalArea: () => it,
	getDrag: () => D,
	getDynamicPressure: () => rt,
	getFrontFinDrag: () => _t,
	getLift: () => ot,
	getLiftCoefficient: () => at,
	isCanonicalBurnAero: () => bt,
	relativeAirspeed: () => dt,
	relativeWindAngle: () => ft,
	updateVehicleInFlightMaxArea: () => yt,
	wrappedAttackAngle: () => mt
});
function rt(e, t) {
	return e * t ** 2 * 5e-4;
}
function it(e, t, n = E) {
	return Math.abs(Math.sin(e) * t) + Math.abs(Math.cos(e) * n.minArea) / 2.1;
}
function D(e, t, n, r) {
	return 1 / 2 * e * t ** 2 * r * n;
}
function at(e) {
	let t = Math.abs(e);
	return t >= 1.48 ? -1.1 * t + 1.728 : t >= .52 ? -1 / 9.6 * t + .254 : t >= .47 ? -8 * t + 4.36 : t >= .35 ? 5 / 6 * t + .2083 : 5 / 3.5 * t;
}
function ot(e, t, n, r) {
	return at(n) * e * t ** 2 * r * .5;
}
function st(e) {
	return e >= 10 ? 2.5 : e * .1347 + 1.153;
}
function ct(e, t) {
	return e / t;
}
function lt(e, t, n) {
	return e * t / n;
}
function ut(e, t) {
	return f(Math.atan2(e, t));
}
function dt(e, t, n, r) {
	return Math.sqrt((e - n) ** 2 + (t - r) ** 2);
}
function ft(e, t, n, r) {
	return ut(e - n, t - r);
}
function pt(e, t) {
	let n = mt(e, t);
	return {
		angleOfAttack: f(n),
		angleInToTheWind: f(ht(n))
	};
}
function mt(e, t) {
	let n = e - t;
	return n < -Math.PI ? n = Math.PI * 2 + n : n > Math.PI && (n = -(Math.PI * 2 - n)), n;
}
function ht(e) {
	return e > Math.PI / 2 ? Math.PI - e : e < -Math.PI / 2 ? -Math.PI - e : e;
}
function gt(e, t, n, r, i = E) {
	let a = e * i.diameter * t ** 2 * r / n;
	return t > 0 ? -a : a;
}
function _t(e, t, n, r, i, a = E) {
	let o = D(e, t, Math.abs(Math.sin(r)) * a.frontFinArea, 2) * i;
	return n < 0 ? -o : o;
}
function vt(e, t, n, r, i, a = E) {
	let o = D(e, t, Math.abs(Math.sin(r)) * a.aftFinArea, 2) * i;
	return n < 0 ? o : -o;
}
function yt(e, t, n = E) {
	let r = Math.sin(_e * e * .01), i = Math.sin(_e * t * .01), a = r * n.frontFinArea + i * n.aftFinArea;
	return {
		frontFinEffectiveAreaFraction: r,
		aftFinEffectiveAreaFraction: i,
		totalFinSurfaceArea: a,
		vehicleInFlightMaxArea: n.maxArea + a * 1.8
	};
}
function bt(e, t) {
	return e === bt && t === it;
}
//#endregion
//#region src/core/vehicles/super-heavy.ts
var O = Object.freeze([
	0,
	1,
	2
]), xt = Object.freeze(Array.from({ length: 13 }, (e, t) => t));
Object.freeze({
	centre: O,
	inner: Object.freeze(Array.from({ length: 10 }, (e, t) => t + 3)),
	outer: Object.freeze(Array.from({ length: 20 }, (e, t) => t + 13))
});
var St = qe.height, Ct = qe.diameter, wt = qe.propellantCapacity, Tt = 3, Et = .9 * St, Dt = 66 / 71 * St, Ot = Math.PI * (Ct / 2) ** 2, kt = wt * Je / (Ye * Ot), At = wt * (1 - Je) / (424 * Ot), jt = (e, t) => Object.freeze({
	kind: "sea-level",
	offAxis: e,
	gimballed: t,
	offAxisForceFraction: 0
}), Mt = (e, t, n) => Array.from({ length: e }, (r, i) => jt(t * Math.cos(2 * Math.PI * i / e), n)), Nt = Object.freeze({
	id: "super-heavy",
	propulsion: qe.propulsion,
	height: St,
	diameter: Ct,
	dryMass: qe.dryMass,
	propellantCapacity: wt,
	initialPropellant: 5e5,
	dryCentreOfMass: St / 2,
	tankBottom: Tt,
	loxTankHeight: kt,
	ch4TankHeight: At,
	ch4TankBottom: Tt + kt,
	aftFinStation: Et,
	frontFinStation: Et,
	rcsStation: Dt,
	minArea: Ot,
	maxArea: St * Ct,
	frontFinArea: 0,
	aftFinArea: 0,
	engines: Object.freeze([
		jt(0, !0),
		jt(-.65, !0),
		jt(.65, !0),
		...Mt(10, 2, !0),
		...Mt(20, 3.8, !1)
	]),
	ignitionGroup: xt,
	gridFins: Object.freeze({
		count: 3,
		area: qe.gridFins.area,
		station: Et,
		maxAngle: Math.PI / 4
	})
}), Pt = 65 / 71 * St, k = Object.freeze({
	lugStation: Pt,
	planeAltitude: 120,
	bodyCentreAltitude: 120 - (Pt - St / 2),
	halfWidth: 2.25,
	maxDownSpeed: 4.5,
	maxLateralSpeed: 1,
	maxPitch: 5 * Math.PI / 180
}), Ft = fe, It = 287.053, Lt = 288.15, Rt = me;
function zt() {
	let e = [
		[0, -.0065],
		[11e3, 0],
		[2e4, .001],
		[32e3, .0028],
		[47e3, 0],
		[51e3, -.0028],
		[71e3, -.002]
	], t = [], n = Lt, r = Rt;
	for (let i = 0; i < e.length; i++) {
		let [a, o] = e[i];
		t.push({
			baseAltitude: a,
			baseTemperature: n,
			basePressure: r,
			lapseRate: o
		});
		let s = e[i + 1];
		if (!s) break;
		let c = s[0] - a, l = n + o * c;
		r = Bt(r, n, o, c), n = l;
	}
	return t;
}
function Bt(e, t, n, r) {
	return n === 0 ? e * Math.exp(-Ft * r / (It * t)) : e * ((t + n * r) / t) ** (-Ft / (It * n));
}
var Vt = zt(), Ht = 84852, Ut = 6356766;
function Wt(e) {
	return Ut * e / (Ut + e);
}
function Gt(e) {
	let t = Vt[0];
	for (let n of Vt) if (e >= n.baseAltitude) t = n;
	else break;
	return t;
}
var Kt = 86e3, qt = [
	[86e3, 5440],
	[1e5, 5877],
	[11e4, 7263],
	[12e4, 9473],
	[13e4, 12636],
	[14e4, 16149],
	[15e4, 22523],
	[18e4, 29740],
	[2e5, 37105],
	[25e4, 45546],
	[3e5, 53628],
	[35e4, 53298],
	[4e5, 58515],
	[45e4, 60828],
	[5e5, 63822],
	[6e5, 71835],
	[7e5, 88667],
	[8e5, 124640],
	[9e5, 181050],
	[1e6, 268e3]
], Jt = 1e3, Yt = (() => {
	let e = [], t = Xt(Kt);
	for (let n = 0; n < qt.length; n++) {
		let [r, i] = qt[n];
		e.push({
			base: r,
			density: t,
			scaleHeight: i
		});
		let a = qt[n + 1];
		a && (t *= Math.exp(-(a[0] - r) / i));
	}
	return e;
})();
function Xt(e) {
	let { pressurePascal: t, temperatureKelvin: n } = Zt(e);
	return t / (It * n);
}
function Zt(e) {
	let t = {
		pressurePascal: 0,
		temperatureKelvin: 0
	};
	return Qt(e, t), t;
}
function Qt(e, t) {
	let n = Math.max(Wt(e), 0), r = Math.min(n, Ht), i = Gt(r), a = r - i.baseAltitude;
	t.temperatureKelvin = i.baseTemperature + i.lapseRate * a, t.pressurePascal = Bt(i.basePressure, i.baseTemperature, i.lapseRate, a);
}
function $t(e) {
	let t = {
		airTemperature: 0,
		airPressure: 0,
		airDensity: 0
	};
	return un(e, t), t;
}
var en = 186.8673, tn = 263.1905, nn = -76.3232, rn = -19.9429, an = 240, on = 12, sn = Ut / 1e3;
function cn(e) {
	let t = e / 1e3;
	if (t <= 91) return en;
	if (t <= 110) return tn + nn * Math.sqrt(1 - ((t - 91) / rn) ** 2);
	if (t <= 120) return an + on * (t - 110);
	let n = (t - 120) * 6476.766 / (sn + t);
	return Jt - 640 * Math.exp(-.01875 * n);
}
var ln = {
	pressurePascal: 0,
	temperatureKelvin: 0
};
function un(e, t) {
	if (o(), e <= 86e3) {
		Qt(e, ln);
		let { pressurePascal: n, temperatureKelvin: r } = ln;
		t.airTemperature = r - 273.15, t.airPressure = n / 1e3, t.airDensity = n / (It * r);
		return;
	}
	let n = Yt[0];
	for (let t of Yt) if (e >= t.base) n = t;
	else break;
	let r = n.density * Math.exp(-(e - n.base) / n.scaleHeight), i = cn(e);
	t.airTemperature = i - 273.15, t.airPressure = r * It * i / 1e3, t.airDensity = r;
}
//#endregion
//#region src/core/physics/atmosphere.ts
function dn(e) {
	return $t(e);
}
var fn = 1.4, pn = 287.053;
function mn(e) {
	return Math.sqrt(fn * pn * (e + 273.15));
}
//#endregion
//#region src/core/physics/components.ts
var hn = Math.PI / 2;
function gn(e) {
	return -Math.sin(e);
}
function _n(e) {
	return -Math.cos(e);
}
function vn(e) {
	return -Math.cos(e);
}
function yn(e) {
	return Math.sin(e);
}
function bn(e) {
	return Math.sin(e);
}
function xn(e) {
	return Math.cos(e);
}
function Sn(e) {
	return 0 < e && e < hn || -Math.PI < e && e < -hn;
}
function Cn(e, t) {
	let n = t(e.gimbalPointingDirection) * e.thrustAcceleration, r = e.fixedThrustAcceleration;
	return r === 0 ? n : n + t(e.pitch) * r;
}
function wn(e) {
	let t = gn(e.angleOfMotion) * e.aerodynamicDragAcceleration, n = vn(e.angleOfMotion), r = Sn(e.angleOfAttack) ? -n * e.aerodynamicLiftAcceleration : n * e.aerodynamicLiftAcceleration;
	return t + Cn(e, bn) + r;
}
function Tn(e, t) {
	let n = _n(e.angleOfMotion) * e.aerodynamicDragAcceleration, r = yn(e.angleOfMotion), i = Sn(e.angleOfAttack) ? -r * e.aerodynamicLiftAcceleration : r * e.aerodynamicLiftAcceleration, a = Cn(e, xn);
	return -t + n + a + i;
}
function En(e, t, n) {
	let r = Math.sin(e.angleOfMotion), i = Math.cos(e.angleOfMotion), a = Sn(e.angleOfAttack), o = -r * e.aerodynamicDragAcceleration, s = -i * e.aerodynamicDragAcceleration, c = -i, l = r, u = a ? -c * e.aerodynamicLiftAcceleration : c * e.aerodynamicLiftAcceleration, d = a ? -l * e.aerodynamicLiftAcceleration : l * e.aerodynamicLiftAcceleration, f = Math.sin(e.gimbalPointingDirection) * e.thrustAcceleration, p = Math.cos(e.gimbalPointingDirection) * e.thrustAcceleration;
	e.fixedThrustAcceleration !== 0 && (f += Math.sin(e.pitch) * e.fixedThrustAcceleration, p += Math.cos(e.pitch) * e.fixedThrustAcceleration), n.x = o + f + u, n.y = -t + s + p + d;
}
//#endregion
//#region src/core/physics/gravity.ts
var Dn = y;
function On(e) {
	return Dn / e ** 2;
}
function kn(e) {
	return Math.sqrt(Dn / e);
}
function A(e, t, n = 0) {
	return jn(e, t, n) ** 2 / e - On(e);
}
function An(e, t = 0) {
	return -A(e, 0, t);
}
function jn(e, t, n = 0) {
	return n === 0 ? t : t + n * e;
}
function Mn(e, t, n = 0) {
	return n === 0 ? t : t - n * e;
}
function Nn(e, t, n, r = 0) {
	let i = r === 0 ? t : t + 2 * r * e;
	return -n * i / e;
}
function Pn(e, t, n, r, i = 0) {
	let a = jn(e, t, i), o = (a ** 2 + n ** 2) / 2 - Dn / e, s = e * a, c = 1 + 2 * o * s ** 2 / Dn ** 2, l = Math.sqrt(Math.max(c, 0)), u = s ** 2 / Dn;
	if (l < 1e-9 || u / (1 + l) > r) return Infinity;
	let d = (e, t) => {
		let n = (u / e - 1) / l, r = Math.acos(Math.min(1, Math.max(-1, n)));
		return t ? r : 2 * Math.PI - r;
	}, f = d(e, n >= 0), p = d(r, !1);
	if (p < f && (p += 2 * Math.PI), !(p > f)) {
		if (i === 0) return 0;
		if (n > 0 && o >= 0) return Infinity;
		let t = Ln(e, n, r);
		return Number.isFinite(t) ? -i * t : Infinity;
	}
	let m = (p - f) / 64, h = (e) => u / (1 + l * Math.cos(e)), g = h(f) + h(p);
	for (let e = 1; e < 64; e++) g += h(f + e * m) * (e % 2 == 0 ? 2 : 4);
	let _ = g * m / 3;
	if (i === 0) return _;
	let v = h(f) ** 3 + h(p) ** 3;
	for (let e = 1; e < 64; e++) v += h(f + e * m) ** 3 * (e % 2 == 0 ? 2 : 4);
	return _ - v * m * i / 3 / s;
}
var Fn = .1, In = 1e6;
function Ln(e, t, n) {
	let r = e, i = t, a = -On(r), o = 0;
	for (let e = 0; e < In; e++) {
		let e = r + i * Fn + .5 * a * Fn * Fn;
		if (e <= n) {
			let t = (r - n) / (r - e);
			return o + .5 * (r + n) * t * Fn;
		}
		let t = -On(e);
		i += .5 * (a + t) * Fn, o += .5 * (r + e) * Fn, r = e, a = t;
	}
	return Infinity;
}
//#endregion
//#region src/core/rng.ts
function Rn(e) {
	return {
		seed: e >>> 0,
		counters: {
			ignitionDelay: 0,
			ignitionFailure: 0,
			turbulence: 0
		}
	};
}
function zn(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n++) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return t >>> 0;
}
var Bn = {
	ignitionDelay: zn("ignitionDelay"),
	ignitionFailure: zn("ignitionFailure"),
	turbulence: zn("turbulence")
};
function Vn(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 569420461), t = Math.imul(t ^ t >>> 15, 3545902487), (t ^ t >>> 15) >>> 0;
}
function Hn(e, t, n) {
	let r = Bn[t], i = Vn(e >>> 0 ^ r);
	return i = Vn(i ^ n >>> 0), i = Vn(i ^ Math.imul(n >>> 0, 2654435769)), i >>> 0;
}
function Un(e, t, n) {
	return Hn(e.seed, t, n) / 4294967296;
}
function Wn(e, t) {
	let n = Un(e, t, e.counters[t]);
	return e.counters[t] += 1, n;
}
//#endregion
//#region src/core/physics/wind.ts
var Gn = 18.3, Kn = .52, qn = 2, Jn = 1, Yn = .3048, Xn = 20 * Yn, Zn = 10 * Yn, Qn = 1e3 * Yn;
function $n(e) {
	return Kn * Math.max(Math.abs(e), qn) ** -.75;
}
function er(e, t) {
	return e === 0 ? 0 : e * (Math.min(Math.max(t, Jn), 150) / Gn) ** $n(e);
}
function j(e, t) {
	return er(e.wind, t) + e.gust;
}
function tr(e, t, n) {
	let r = Math.min(Math.max(t, Zn), Qn) / Yn, i = .177 + 823e-6 * r, a = .1 * Math.abs(e);
	return n.sigmaW = a, n.sigmaU = a / i ** .4, n.lengthW = r * Yn, n.lengthU = r / i ** 1.2 * Yn, n;
}
var nr = {
	sigmaU: 0,
	sigmaW: 0,
	lengthU: 0,
	lengthW: 0
}, rr = Math.sqrt(3), ir = 2;
function ar(e, t, n, r, i, a) {
	if (e.wind === 0) return;
	tr(er(e.wind, Xn), n, nr);
	let o = Math.hypot(r - er(e.wind, n), i), s = Math.sqrt(-2 * Math.log(1 - Wn(t, "turbulence"))), c = 2 * Math.PI * Wn(t, "turbulence"), l = s * Math.cos(c), u = s * Math.sin(c), d = Math.exp(-o * a / nr.lengthU);
	e.turbulenceU = d * e.turbulenceU + Math.sqrt(1 - d * d) * l;
	let f = Math.exp(-o * a / nr.lengthW), p = e.turbulenceW1;
	e.turbulenceW1 = f * p + Math.sqrt(1 - f * f) * u, e.turbulenceW2 = f * e.turbulenceW2 + (1 - f) * p, e.gust = nr.sigmaU * e.turbulenceU, e.gustVertical = nr.sigmaW / Math.sqrt(ir) * (rr * e.turbulenceW1 + (1 - rr) * e.turbulenceW2);
}
E.tankBottom, E.propellantCapacity, E.loxTankHeight, E.ch4TankHeight, E.ch4TankBottom, E.dryCentreOfMass, E.aftFinStation, E.rcsStation, E.frontFinStation;
function or(e, t = E) {
	return Math.min(1, Math.max(0, e / t.propellantCapacity));
}
function sr(e, t = E) {
	let n = or(e, t), r = t.tankBottom + n * t.loxTankHeight / 2, i = t.ch4TankBottom + n * t.ch4TankHeight / 2;
	return Je * r + (1 - Je) * i;
}
function cr(e, t = E) {
	let n = Math.max(0, e);
	return (t.dryMass * t.dryCentreOfMass + n * sr(n, t)) / (t.dryMass + n);
}
function lr(e, t, n) {
	return e * ((n.diameter / 2) ** 2 / 4 + t ** 2 / 12);
}
function ur(e, t = E) {
	let n = Math.max(0, e), r = cr(n, t), i = or(n, t), a = lr(t.dryMass, t.height, t) + t.dryMass * (t.dryCentreOfMass - r) ** 2, o = n * Je, s = i * t.loxTankHeight, c = t.tankBottom + s / 2, l = lr(o, s, t) + o * (c - r) ** 2, u = n * (1 - Je), d = i * t.ch4TankHeight, f = t.ch4TankBottom + d / 2, p = lr(u, d, t) + u * (f - r) ** 2;
	return a + l + p;
}
function dr(e, t = E.height) {
	return (e ** 4 + (t - e) ** 4) / 4;
}
function fr(e, t, n = E) {
	let r = cr(e, n);
	t.centreOfMassX = 0, t.centreOfMass = r, t.momentOfInertia = ur(e, n), t.engineArm = r, t.aftFinArm = r - n.aftFinStation, t.frontFinArm = n.frontFinStation - r, t.rcsArm = n.rcsStation - r, t.rCubedIntegral = dr(r, n.height);
}
function pr(e = 0, t = E) {
	let n = {
		centreOfMassX: 0,
		centreOfMass: 0,
		momentOfInertia: 0,
		engineArm: 0,
		aftFinArm: 0,
		frontFinArm: 0,
		rcsArm: 0,
		rCubedIntegral: 0
	};
	return fr(e, n, t), n;
}
//#endregion
//#region src/core/physics/grid-fins.ts
function mr() {
	return {
		forceX: 0,
		forceY: 0,
		torque: 0,
		drag: 0,
		lift: 0
	};
}
function hr(e, t, n, r, i, a, o, s) {
	s.forceX = s.forceY = s.torque = s.drag = s.lift = 0;
	let c = o.gridFins, l = Math.hypot(t, n);
	if (!c || e <= 0 || l === 0 || r === 0) return;
	let u = Math.max(-c.maxAngle, Math.min(c.maxAngle, r)), d = .5 * e * l * l * c.area;
	s.lift = d * Math.sin(2 * u), s.drag = d * 1.2 * Math.sin(u) ** 2, s.forceX = (-n * s.lift - t * s.drag) / l, s.forceY = (t * s.lift - n * s.drag) / l, s.torque = (c.station - a) * (Math.cos(i) * s.forceX - Math.sin(i) * s.forceY);
}
//#endregion
//#region src/core/physics/damage-material.ts
var gr = 7920, _r = 293.15, vr = 1473.15;
function yr(e) {
	if (!Number.isFinite(e) || e < 4 || e > 1473.15) throw RangeError("304 thermal temperature must be within4–1473.15K");
}
var br = [
	22.0061,
	-127.5528,
	303.647,
	-381.0098,
	274.0328,
	-112.9212,
	24.7593,
	-2.239153
], xr = [
	-1.4087,
	1.3982,
	.2543,
	-.626,
	.2334,
	.4256,
	-.4658,
	.165,
	-.0199
], Sr = 273.15, Cr = 20, wr = .0625, Tr = Math.ceil(269.15 / wr), M = /* @__PURE__ */ new Float64Array(4308), Er = /* @__PURE__ */ new Float64Array(4308);
function Dr(e, t) {
	let n = Math.log10(e), r = 0;
	for (let e = t.length - 1; e >= 0; e--) r = r * n + t[e];
	return 10 ** r;
}
function Or(e) {
	return Math.min(Sr, 4 + e * wr);
}
for (let e = 0; e <= Tr; e++) {
	let t = Or(e);
	if (M[e] = Dr(t, br), e > 0) {
		let n = t - Or(e - 1);
		Er[e] = Er[e - 1] + n * (M[e - 1] + M[e]) / 2;
	}
}
function kr(e) {
	return 6.683 + .04906 * e + 80.74 * Math.log(e);
}
function Ar(e) {
	return 9.705 + .0176 * e - 16e-7 * e ** 2;
}
var jr = M[Tr], Mr = kr(_r), Nr = Dr(Sr, xr), Pr = Ar(_r), Fr = Cr * (jr + Mr) / 2, Ir = -Er[Tr] - Fr;
function Lr(e) {
	return Math.min(4306, Math.floor((e - 4) / wr));
}
function Rr(e) {
	return (e - Sr) / Cr;
}
function zr(e, t, n) {
	return e + (t - e) * n ** 2 * (3 - 2 * n);
}
function Br(e) {
	if (yr(e), e >= 293.15) return kr(e);
	if (e >= Sr) return zr(jr, Mr, Rr(e));
	let t = Lr(e), n = (e - Or(t)) / (Or(t + 1) - Or(t));
	return M[t] + n * (M[t + 1] - M[t]);
}
function Vr(e) {
	return yr(e), e >= 293.15 ? Ar(e) : e >= Sr ? zr(Nr, Pr, Rr(e)) : Dr(e, xr);
}
function Hr(e) {
	return 6.683 * e + .02453 * e ** 2 + 80.74 * (e * Math.log(e) - e);
}
var Ur = Hr(_r), Wr = Hr(vr) - Ur;
function Gr(e) {
	if (e >= 293.15) return Hr(e) - Ur;
	if (e >= Sr) {
		let t = Rr(e);
		return -Fr + Cr * (jr * t + (Mr - jr) * (t ** 3 - t ** 4 / 2));
	}
	let t = Lr(e), n = e - Or(t), r = Or(t + 1) - Or(t), i = (M[t + 1] - M[t]) / r;
	return Ir + Er[t] + M[t] * n + i * n ** 2 / 2;
}
function Kr(e) {
	return yr(e), Gr(e);
}
function qr(e) {
	let t = 4, n = vr;
	for (let r = 0; r < 48; r++) {
		let r = (t + n) / 2;
		Gr(r) < e ? t = r : n = r;
	}
	return (t + n) / 2;
}
function Jr(e) {
	if (e < -Fr) {
		let t = 0, n = Tr;
		for (; n - t > 1;) {
			let r = Math.floor((t + n) / 2);
			Ir + Er[r] <= e ? t = r : n = r;
		}
		let r = Or(t + 1) - Or(t), i = M[t], a = (M[t + 1] - i) / r, o = e - (Ir + Er[t]), s = 2 * o / (i + Math.sqrt(i * i + 2 * a * o));
		return Or(t) + s;
	}
	let t = e < 0 ? Sr : _r, n = e < 0 ? _r : vr, r = e < 0 ? -Fr : 0, i = e < 0 ? 0 : Wr, a = t + (n - t) * (e - r) / (i - r);
	for (let r = 0; r < 6; r++) {
		let r = Gr(a);
		if (r === e) break;
		r < e ? t = a : n = a;
		let i = a - (r - e) / Br(a);
		if (i === a) break;
		a = i > t && i < n ? i : (t + n) / 2;
	}
	return a;
}
function Yr(e) {
	if (!Number.isFinite(e) || e < Ir || e > Wr) throw RangeError("304 specific enthalpy is outside the thermal fit domain");
	if (e === 0) return _r;
	if (e === Ir) return 4;
	if (e === Wr) return vr;
	let t = Jr(e), n = 4, r = vr, i = n, a = r;
	for (let e = 0; e < 48; e++) {
		let o = (n + r) / 2;
		o < t ? n = o : r = o, e === 39 && (i = n, a = r);
	}
	if (Gr(n) < e && Gr(r) >= e) return (n + r) / 2;
	if (Gr(i) < e && Gr(a) >= e) {
		n = i, r = a;
		for (let t = 40; t < 48; t++) {
			let t = (n + r) / 2;
			Gr(t) < e ? n = t : r = t;
		}
		return (n + r) / 2;
	}
	return qr(e);
}
var Xr = [
	[
		373.15,
		18721e7,
		223e6
	],
	[
		473.15,
		176314e6,
		19e7
	],
	[
		573.15,
		169642e6,
		18e7
	],
	[
		673.15,
		159526e6,
		172e6
	],
	[
		773.15,
		1468e8,
		153e6
	],
	[
		873.15,
		13739e7,
		136e6
	],
	[
		973.15,
		12545e7,
		112e6
	],
	[
		1073.15,
		10808e7,
		62e6
	],
	[
		1173.15,
		6755e7,
		35e6
	]
];
function Zr(e, t) {
	if (!Number.isFinite(e) || e <= 0) throw RangeError("304 mechanical temperature must be finite and positiveK");
	if (e > 1173.15) return 0;
	let n = 373.15, r = Xr[0][t];
	if (e <= n) return r;
	for (let i of Xr) {
		if (e <= i[0]) {
			let a = (e - n) / (i[0] - n);
			return r + a * (i[t] - r);
		}
		n = i[0], r = i[t];
	}
	return 0;
}
function Qr(e) {
	return Zr(e, 1);
}
function $r(e) {
	return Zr(e, 2);
}
//#endregion
//#region src/core/physics/tps-material.ts
var ei = 116.483, ti = 1922.04, ni = 116.667, ri = 1922.22, ii = 101330, ai = 293.15, N = [
	[116.483, 293],
	[172.039, 440],
	[255.372, 628],
	[394.261, 879],
	[533.15, 1060],
	[672.039, 1150],
	[810.928, 1210],
	[949.817, 1240],
	[1088.71, 1260],
	[1199.82, 1260],
	[1227.59, 1270],
	[1366.48, 1270],
	[1533.15, 1270],
	[1922.04, 1270]
], oi = [
	116.667,
	255.556,
	394.444,
	533.333,
	672.222,
	811.111,
	950,
	1088.89,
	1227.78,
	1366.67,
	1533.33,
	1644.44,
	1811.11,
	1922.22
], si = [
	[10.133, [
		.00865,
		.013,
		.0159,
		.0216,
		.0303,
		.0403,
		.0533,
		.072,
		.0981,
		.127,
		.167,
		.201,
		.267,
		.329
	]],
	[101.33, [
		.013,
		.0173,
		.0216,
		.0289,
		.0374,
		.0476,
		.0606,
		.0795,
		.106,
		.135,
		.177,
		.213,
		.28,
		.339
	]],
	[1013.3, [
		.026,
		.0317,
		.0389,
		.0478,
		.0563,
		.0679,
		.0852,
		.107,
		.133,
		.163,
		.201,
		.241,
		.312,
		.379
	]],
	[10133, [
		.0374,
		.0433,
		.0547,
		.0692,
		.0852,
		.104,
		.125,
		.151,
		.183,
		.22,
		.268,
		.31,
		.384,
		.454
	]],
	[101330, [
		.0403,
		.0476,
		.059,
		.075,
		.0924,
		.114,
		.135,
		.163,
		.196,
		.235,
		.289,
		.336,
		.419,
		.502
	]]
];
function ci(e, t, n) {
	if (!Number.isFinite(e) || e < t || e > n) throw RangeError("LI900 temperature is outside its material property data domain");
}
function li(e) {
	if (!Number.isFinite(e) || e < 0 || e > 101330) throw RangeError("LI900 pressure must be within0–101330Pa");
}
var ui = new Float64Array(N.length);
for (let e = 1; e < N.length; e++) {
	let t = N[e - 1], n = N[e];
	ui[e] = ui[e - 1] + (n[0] - t[0]) * (t[1] + n[1]) / 2;
}
function di(e) {
	for (let t = 1; t < N.length; t++) if (e < N[t][0]) return t - 1;
	return N.length - 2;
}
function fi(e) {
	let t = di(e), n = N[t], r = N[t + 1];
	if (e === r[0]) return ui[t + 1];
	let i = e - n[0], a = (r[1] - n[1]) / (r[0] - n[0]);
	return ui[t] + n[1] * i + a * i ** 2 / 2;
}
var pi = fi(ai), mi = -pi, hi = ui[N.length - 1] - pi;
function gi(e) {
	ci(e, ei, ti);
	let t = di(e), n = N[t], r = N[t + 1];
	if (e === r[0]) return r[1];
	let i = (e - n[0]) / (r[0] - n[0]);
	return n[1] + i * (r[1] - n[1]);
}
function _i(e) {
	return ci(e, ei, ti), fi(e) - pi;
}
function vi(e) {
	if (!Number.isFinite(e) || e < mi || e > hi) throw RangeError("LI900 specific enthalpy is outside the heat-capacity data domain");
	if (e === 0) return ai;
	if (e === mi) return ei;
	if (e === hi) return ti;
	let t = e + pi, n = 0, r = N.length - 1;
	for (; r - n > 1;) {
		let e = Math.floor((n + r) / 2);
		ui[e] <= t ? n = e : r = e;
	}
	let i = N[n], a = N[n + 1], o = (a[1] - i[1]) / (a[0] - i[0]), s = t - ui[n], c = 2 * s / (i[1] + Math.sqrt(i[1] ** 2 + 2 * o * s));
	return Math.max(i[0], Math.min(a[0], i[0] + c));
}
function yi(e, t) {
	let n = si[0];
	if (t <= n[0]) return n[1][e];
	for (let n = 1; n < si.length; n++) {
		let r = si[n];
		if (t === r[0]) return r[1][e];
		if (t < r[0]) {
			let i = si[n - 1], a = Math.log(t / i[0]) / Math.log(r[0] / i[0]);
			return i[1][e] + a * (r[1][e] - i[1][e]);
		}
	}
	return si[si.length - 1][1][e];
}
function bi(e, t) {
	for (let n = 1; n < oi.length; n++) {
		let r = oi[n];
		if (e === r) return yi(n, t);
		if (e < r) {
			let i = oi[n - 1], a = yi(n - 1, t), o = yi(n, t);
			return a + (e - i) / (r - i) * (o - a);
		}
	}
	return yi(oi.length - 1, t);
}
function xi(e, t) {
	return ci(e, ni, ri), li(t), bi(e, t);
}
function Si(e, t, n) {
	if (ci(e, ni, ri), ci(t, ni, ri), li(n), e === t) return bi(e, n);
	let r = Math.min(e, t), i = Math.max(e, t), a = 0;
	for (let e = 1; e < oi.length; e++) {
		let t = Math.max(r, oi[e - 1]), o = Math.min(i, oi[e]);
		o > t && (a += (o - t) * (bi(t, n) + bi(o, n)) / 2);
	}
	return a / (i - r);
}
var Ci = /* @__PURE__ */ function(e) {
	return e[e.None = 0] = "None", e[e.ProofExceeded = 1] = "ProofExceeded", e[e.MaterialDomain = 2] = "MaterialDomain", e[e.Terminal = 3] = "Terminal", e;
}({});
function wi(e, t) {
	if (!Number.isFinite(e) || !Number.isFinite(t)) throw RangeError("Thermal state requires finite temperature and energy");
	return {
		valid: !0,
		temperature: e,
		energy: t
	};
}
function Ti(e, t) {
	let n = e.components.length;
	if (n < 1 || n > 12) throw RangeError("Damage inventory must contain1–12 components");
	if (!(e.hullThermalMass > 0) || !Number.isFinite(e.hullThermalMass)) throw RangeError("Damage state requires positive finite hull thermal mass");
	let r = Kr(t), i = e.components.some((e) => e.tpsMass > 0), a = 0;
	if (i) {
		if (t < 116.667 || t > 1922.04) throw RangeError("TPS ambient temperature is outside its thermal data domains");
		a = _i(t);
	}
	let o = e.components.map((e, n) => {
		if (!(e.rootMass >= 0 && e.tpsMass >= 0) || !Number.isFinite(e.rootMass + e.tpsMass)) throw RangeError("Invalid component thermal mass");
		let i = e.rootMass > 0 ? wi(t, e.rootMass * r) : wi(0, 0), o = () => e.tpsMass > 0 ? wi(t, e.tpsMass / 2 * a) : wi(0, 0);
		return {
			componentIndex: n,
			attached: !0,
			permanentFailure: 0,
			root: i,
			tps: [o(), o()],
			loadedAngle: f(0)
		};
	}), s = o.map((e) => ({
		componentIndex: e.componentIndex,
		active: !1,
		x: 0,
		altitude: 0,
		pitch: f(0),
		speedX: 0,
		speedY: 0,
		angularVelocity: 0
	}));
	return {
		components: o,
		hull: wi(t, e.hullThermalMass * r),
		debris: s,
		terminal: {
			active: !1,
			reason: 0,
			time: 0,
			x: 0,
			altitude: 0,
			pitch: f(0),
			speedX: 0,
			speedY: 0,
			angularVelocity: 0,
			retainedDryMass: 0,
			retainedPropellant: 0,
			releasedEnergy: 0,
			releasedMomentumX: 0,
			releasedMomentumY: 0,
			releasedAngularMomentum: 0,
			releasedKineticEnergy: 0
		},
		revision: 0,
		eventCount: 0
	};
}
function Ei(e) {
	return {
		components: e.components.map((e) => ({
			...e,
			root: { ...e.root },
			tps: [{ ...e.tps[0] }, { ...e.tps[1] }]
		})),
		hull: { ...e.hull },
		debris: e.debris.map((e) => ({ ...e })),
		terminal: { ...e.terminal },
		revision: e.revision,
		eventCount: e.eventCount
	};
}
//#endregion
//#region src/core/physics/damage-root.ts
function Di(e) {
	let t = .1 * e, n = .15 * e, r = .05 * e, i = .004;
	if (!(t > 2 * i && n > 2 * i)) throw RangeError("Invalid attachment section");
	let a = t * n - (t - 2 * i) * (n - 2 * i), o = (t * n ** 3 - (t - 2 * i) * (n - 2 * i) ** 3) / 12;
	return Object.freeze({
		area: a,
		inertia: o,
		modulus: 2 * o / n,
		length: r,
		heatArea: t * r,
		mass: gr * a * r
	});
}
function Oi(e, t) {
	return t === "plate" ? Math.sin(e) : Math.hypot(Math.sin(2 * e), 1.2 * Math.sin(e) ** 2);
}
function ki(e, t, n, r, i, a) {
	let o = Math.abs(e), s = a === "plate" ? Math.PI / 2 : Math.PI / 4;
	if (!Number.isFinite(e) || o > s || t < 0 || n < 0 || !Number.isFinite(t) || !Number.isFinite(n)) throw RangeError("Attachment load outside the monotone force domain");
	let c = Qr(r);
	if (c === 0) return 0;
	if (o === 0 || t === 0 || n === 0) return e;
	let l = t * n * i.length / (c * i.inertia), u = o;
	for (let e = 0; e < 2; e++) {
		let e = Oi(u, a), t = Math.sin(u), n = Math.cos(u), r = a === "plate" ? n : e === 0 ? 2 : (2 * Math.sin(2 * u) * Math.cos(2 * u) + 2.88 * t ** 3 * n) / e;
		if (u -= (u + l * e - o) / (1 + l * r), !(u > 0 && u <= o)) break;
	}
	if (u > 0 && u <= o) {
		let t = 0, n = o;
		for (let e = 0; e < 40; e++) {
			let e = (t + n) / 2;
			e < u ? t = e : n = e;
		}
		if (t + l * Oi(t, a) < o && n + l * Oi(n, a) >= o) return Math.sign(e) * (t + n) / 2;
	}
	let d = 0, f = o;
	for (let e = 0; e < 40; e++) {
		let e = (d + f) / 2;
		e + l * Oi(e, a) < o ? d = e : f = e;
	}
	return Math.sign(e) * (d + f) / 2;
}
function Ai(e, t, n) {
	let r = $r(t) * n.modulus;
	return r === 0 ? Infinity : Math.abs(e) / r;
}
//#endregion
//#region src/core/physics/vehicle-components.ts
var ji = 1525, Mi = .004, Ni = 144, Pi = .0254, Fi = 20 * Math.PI / 180;
function Ii(e, t, n, r, i) {
	if (!(t > 0 && i > 0) || !Number.isFinite(t + n + r + i)) throw RangeError("Component slice requires positive finite mass and inertia");
	return Object.freeze({
		role: e,
		mass: t,
		x: n,
		station: r,
		inertia: i
	});
}
function Li(e, t, n, r, i = 0) {
	let a = n.reduce((e, t) => e + t.mass, 0), o = n.reduce((e, t) => e + t.mass * t.x, 0) / a, s = n.reduce((e, t) => e + t.mass * t.station, 0) / a, c = n.reduce((e, t) => e + t.inertia + t.mass * ((t.x - o) ** 2 + (t.station - s) ** 2), 0);
	return Object.freeze({
		id: e,
		kind: t,
		mass: a,
		x: o,
		station: s,
		inertia: c,
		loadLever: i,
		rootMass: n.reduce((e, t) => e + (t.role === "root" ? t.mass : 0), 0),
		tpsMass: n.reduce((e, t) => e + (t.role === "tps" ? t.mass : 0), 0),
		...r ? { hinge: Object.freeze({ ...r }) } : {},
		slices: Object.freeze(n)
	});
}
function Ri(e, t, n, r, i, a, o, s, c) {
	if (!(n > 0 && r > 0)) throw RangeError("Appendage area and span must be positive");
	let l = n / r, u = gr * Mi * n, d = i * (o + r / 2), f = i * (o + s.length / 2), p = s.heatArea / s.length, m = u * ((r * i) ** 2 + l ** 2) / 12, h = s.mass * ((s.length * i) ** 2 + p ** 2) / 12, g = [Ii("structure", u, d, a, m), Ii("root", s.mass, f, a, h)];
	if (c) {
		let e = Ni * s.heatArea * Pi;
		g.push(Ii("tps", e, f, a, e * ((s.length * i) ** 2 + p ** 2) / 12));
	}
	return Li(e, t, g, {
		x: i * o,
		station: a
	}, r / 2);
}
function zi(e) {
	let { height: t, diameter: n, dryMass: r, dryCentreOfMass: i } = e;
	if (!(t > 0 && n > 0 && r > 0 && i > 0 && i < t) || !Number.isFinite(t + n + r + i)) throw RangeError("Invalid intact vehicle mass geometry");
	let a = n / 2, o = e.id === "ship", s = Di(n), c = [], l = t * (o ? .035 : .03), u = e.engines.length * ji;
	if (c.push(Li(`${o ? "ship" : "booster"}-engine-support`, "engine-support", [Ii("structure", u, 0, l / 2, u * (a ** 2 / 4 + l ** 2 / 12))])), o) {
		let i = r * .05;
		c.push(Li("ship-nose", "nose", [Ii("structure", i, 0, t * .87, i * ((.4 * a) ** 2 + (.08 * t) ** 2) / 5)]));
		for (let t of [!0, !1]) for (let r of [-1, 1]) {
			let i = t ? e.frontFinStation : e.aftFinStation;
			c.push(Ri(`ship-${t ? "front" : "aft"}-flap-${r < 0 ? "left" : "right"}`, "flap", (t ? e.frontFinArea : e.aftFinArea) / 2, n * (t ? .34 : .46), r, i, a, s, !0));
		}
	} else {
		let i = e.gridFins;
		if (!i || !Number.isInteger(i.count) || i.count < 3) throw RangeError("Booster component partition requires a grid inventory");
		let o = r * .02;
		c.push(Li("booster-hot-stage", "hot-stage", [Ii("structure", o, 0, t * .975, o * (a ** 2 / 2 + (.05 * t) ** 2 / 12))]));
		for (let e = 0; e < i.count; e++) c.push(Ri(`booster-grid-${e}`, "grid-fin", i.area / i.count, n * .46, Math.sin(Fi + e * 2 * Math.PI / i.count), i.station, a, s, !1));
	}
	for (let e of c) if (!(e.station >= 0 && e.station <= t)) throw RangeError("Component centroid outside the hull");
	let d = r - c.reduce((e, t) => e + t.mass, 0);
	if (!(d > 0)) throw RangeError("No positive hull mass remains");
	let f = (r * i - c.reduce((e, t) => e + t.mass * t.station, 0)) / d, p = -c.reduce((e, t) => e + t.mass * t.x, 0) / d, m = r * (a ** 2 / 4 + t ** 2 / 12), h = (m - c.reduce((e, t) => e + t.inertia + t.mass * (t.x ** 2 + (t.station - i) ** 2), 0) - d * (p ** 2 + (f - i) ** 2)) / d - a ** 2 / 4, g = t * (o ? .055 : .05), _ = t * (o ? .72 : .93), v = t * (o ? .3 : .5), y = (f - g) * (_ - f);
	if (!(f > g && f < _ && h > 0 && h < y)) throw RangeError("Hull residual moments have no positive supported partition");
	let b = h / y, x = d * b * (_ - f) / (_ - g), S = d * b * (f - g) / (_ - g), C = d - x - S, ee = [
		Ii("structure", x, p, g, x * a ** 2 / 4),
		Ii("structure", C, p, f, C * a ** 2 / 4),
		Ii("structure", S, p, _, S * a ** 2 / 4)
	], te = o ? "ship" : "booster", ne = Li(`${te}-hull-aft`, "hull", ee.filter((e) => e.station < v)), re = Li(`${te}-hull-forward`, "hull", ee.filter((e) => e.station >= v));
	return c.push(ne, re), Object.freeze({
		id: e.id,
		dryMass: r,
		dryCentreOfMassX: 0,
		dryCentreOfMass: i,
		dryMomentOfInertia: m,
		hullThermalMass: ne.mass + re.mass,
		rootSection: s,
		components: Object.freeze(c)
	});
}
//#endregion
//#region src/core/physics/damage-thermal.ts
var Bi = 4096, Vi = .8, Hi = 8, Ui = .0254, Wi = Ui / 2, Gi = Ui / 4, Ki = Math.max(ei, ni), qi = Math.min(ti, ri), Ji = Vi * Ce, Yi = Kr(4), Xi = Kr(vr), Zi = _i(Ki), Qi = _i(qi);
function $i(e) {
	let t = e.components.length, n = e.rootSection;
	if (t < 1 || t > 12 || !(e.hullThermalMass > 0 && n.area > 0 && n.length > 0 && n.heatArea > 0) || !Number.isFinite(e.hullThermalMass + n.area + n.length + n.heatArea)) throw RangeError("Invalid thermal catalogue geometry/inventory");
	let r = Br(4), i = Vr(vr), a = gi(ei), o = xi(ri, ii), s = n.length / 2, c = n.area / s, l = s / n.area, u = i * c, d = 4 * Ji * n.heatArea * vr ** 3, f = 4 * Ji * n.heatArea * qi ** 3, p = [], m = Infinity, h = 0;
	for (let s = 0; s < t; s++) {
		let t = e.components[s];
		if (!(t.rootMass >= 0 && t.tpsMass >= 0) || !Number.isFinite(t.rootMass + t.tpsMass)) throw RangeError("Invalid component thermal masses");
		if (t.rootMass === 0) {
			if (t.tpsMass > 0) throw RangeError("TPS column requires a finite root");
			continue;
		}
		let g = t.tpsMass / 2, _ = t.rootMass * r;
		if (g > 0) {
			let e = o * n.heatArea / Wi, t = 1 / (Gi / (o * n.heatArea) + l / i), r = g * a;
			m = Math.min(m, r / (e + f), r / (e + t), _ / (t + u));
		} else m = Math.min(m, _ / (u + d));
		h += u, p.push(Object.freeze({
			componentIndex: s,
			rootMass: t.rootMass,
			tpsCellMass: g,
			heatArea: n.heatArea,
			steelPathRatio: c,
			steelResistanceRatio: l,
			rootMinEnergy: t.rootMass * Yi,
			rootMaxEnergy: t.rootMass * Xi,
			tpsMinEnergy: g * Zi,
			tpsMaxEnergy: g * Qi
		}));
	}
	return h > 0 && (m = Math.min(m, e.hullThermalMass * r / h)), Object.freeze({
		componentCount: t,
		columns: Object.freeze(p),
		hullMass: e.hullThermalMass,
		hullMinEnergy: e.hullThermalMass * Yi,
		hullMaxEnergy: e.hullThermalMass * Xi,
		safeStep: m
	});
}
function ea(e, t, n) {
	if (!Number.isFinite(e.temperature) || e.temperature < t || e.temperature > n || !Number.isFinite(e.energy)) throw RangeError("Valid thermal node has invalid temperature/energy");
}
function ta(e, t, n, r, i, a) {
	return e.energy += t, !Number.isFinite(e.energy) || e.energy < r || e.energy > i ? (e.valid = !1, !1) : (t !== 0 && (e.temperature = e.energy === r ? a ? Ki : 4 : e.energy === i ? a ? qi : vr : a ? vi(e.energy / n) : Yr(e.energy / n)), !0);
}
function na(e, t, n, r, i, a) {
	if (!Number.isFinite(n) || n < 0 || n > t.safeStep * Hi || !Number.isFinite(r) || r < 0 || !Number.isFinite(i) || i < 186 || i > 1473.15 || !Number.isFinite(a) || a < 0 || a > 101330 || e.components.length !== t.componentCount) throw RangeError("Thermal forcing/inventory outside the supported numerical contract");
	let o = e.hull.valid ? 0 : Bi;
	for (let n of t.columns) {
		let t = e.components[n.componentIndex];
		if (t.componentIndex !== n.componentIndex) throw RangeError("Thermal catalogue identity mismatch");
		t.attached && (!t.root.valid || n.tpsCellMass > 0 && (!t.tps[0].valid || !t.tps[1].valid)) && (o |= 1 << n.componentIndex);
	}
	if (o !== 0 || n === 0) return o;
	ea(e.hull, 4, vr);
	for (let n of t.columns) {
		let t = e.components[n.componentIndex];
		t.attached && (ea(t.root, 4, vr), n.tpsCellMass > 0 && (ea(t.tps[0], Ki, qi), ea(t.tps[1], Ki, qi)));
	}
	let s = Math.min(Hi, Math.max(1, Math.ceil(n / t.safeStep))), c = n / s, l = i ** 4;
	for (let n = 0; n < s; n++) {
		let n = e.hull.temperature, i = Vr(n), s = 0;
		for (let u of t.columns) {
			let t = e.components[u.componentIndex];
			if (!t.attached) continue;
			let d = t.root.temperature, f = Vr(d), p = c * (f + i) / 2 * u.steelPathRatio * (d - n);
			s += p;
			let m = -p, h = !0;
			if (u.tpsCellMass > 0) {
				let e = t.tps[0], n = t.tps[1], i = e.temperature, o = n.temperature, s = c * Si(i, o, a) * u.heatArea / Wi * (i - o), p = c * (o - d) / (Gi / (xi(o, a) * u.heatArea) + u.steelResistanceRatio / f), g = c * u.heatArea * (r - Ji * (i ** 4 - l));
				m += p, h = ta(e, g - s, u.tpsCellMass, u.tpsMinEnergy, u.tpsMaxEnergy, !0), ta(n, s - p, u.tpsCellMass, u.tpsMinEnergy, u.tpsMaxEnergy, !0) || (h = !1);
			} else m += c * u.heatArea * (r - Ji * (d ** 4 - l));
			ta(t.root, m, u.rootMass, u.rootMinEnergy, u.rootMaxEnergy, !1) || (h = !1), h || (o |= 1 << u.componentIndex);
		}
		if (ta(e.hull, s, t.hullMass, t.hullMinEnergy, t.hullMaxEnergy, !1) || (o |= Bi), o !== 0) return o;
	}
	return 0;
}
//#endregion
//#region src/core/physics/damage-controls.ts
function ra(e, t) {
	let n = [];
	for (let r = 0; r < e.components.length; r++) {
		let i = e.components[r];
		if (i.kind === "grid-fin") {
			let e = t.gridFins;
			if (!e) throw RangeError("Grid component requires grid geometry");
			n.push(Object.freeze({
				index: r,
				group: "grid",
				area: e.area / e.count,
				lever: i.loadLever
			}));
		} else if (i.kind === "flap") {
			let e = i.id.includes("-front-");
			n.push(Object.freeze({
				index: r,
				group: e ? "front" : "aft",
				area: (e ? t.frontFinArea : t.aftFinArea) / 2,
				lever: i.loadLever
			}));
		}
	}
	return Object.freeze({
		componentCount: e.components.length,
		root: e.rootSection,
		columns: Object.freeze(n)
	});
}
function ia(e) {
	return {
		frontArea: 0,
		aftArea: 0,
		frontFraction: 0,
		aftFraction: 0,
		gridLiftArea: 0,
		gridDragArea: 0,
		loadedAngles: Array(e).fill(0),
		proofMask: 0,
		domainMask: 0
	};
}
function aa(e, t, n, r, i) {
	if (!(n >= 0 && r >= 0 && r <= 1) || !Number.isFinite(n) || e.components.length !== t.componentCount || i.loadedAngles.length < t.componentCount) throw RangeError("Invalid component control forcing or inventory");
}
function oa(e, t, n, r, i, a, o) {
	s(), aa(e, t, n, r, o), o.frontArea = o.aftArea = o.gridLiftArea = o.gridDragArea = 0, o.frontFraction = o.aftFraction = 0, o.proofMask = o.domainMask = 0, o.loadedAngles.fill(0);
	for (let s of t.columns) {
		let c = e.components[s.index];
		if (!c.attached || c.permanentFailure !== Ci.None) continue;
		if (!c.root.valid || $r(c.root.temperature) === 0) {
			o.domainMask |= 1 << s.index;
			continue;
		}
		let l = s.group === "grid", u = s.group === "aft" ? a : i, d = n * s.area * (l ? 1 : 2 * r), f = l ? "grid" : "plate", p = ki(u, d, s.lever, c.root.temperature, t.root, f);
		if (o.loadedAngles[s.index] = p, Ai(d * Oi(Math.abs(p), f) * s.lever, c.root.temperature, t.root) > 1) {
			o.proofMask |= 1 << s.index;
			continue;
		}
		if (l) o.gridLiftArea += s.area * Math.sin(2 * p), o.gridDragArea += s.area * 1.2 * Math.sin(p) ** 2;
		else {
			let e = Math.sin(p);
			s.group === "front" ? (o.frontArea += s.area * e, o.frontFraction += .5 * e) : (o.aftArea += s.area * e, o.aftFraction += .5 * e);
		}
	}
}
//#endregion
//#region src/core/physics/damage-debris.ts
function sa(e, t) {
	if (e.id !== t.id || e.dryMass !== t.dryMass) throw RangeError("Debris requires matching source vehicle inventory");
	let n = t.diameter, r = t.height, i = t.id === "ship", a = e.components.map((a) => {
		let o, s, c, l = a.kind === "flap" || a.kind === "grid-fin";
		if (l) {
			let r = a.id.startsWith("ship-front"), i = n * (a.kind === "grid-fin" || !r ? .46 : .34);
			o = a.kind === "grid-fin" ? t.gridFins.area / t.gridFins.count : (r ? t.frontFinArea : t.aftFinArea) / 2;
			let l = o / i;
			s = o + .004 * (i + l) + e.rootSection.heatArea, c = 0;
			for (let t of a.slices) {
				let n = t.role === "structure" ? Math.hypot(i, l) / 2 : Math.hypot(e.rootSection.length, e.rootSection.heatArea / e.rootSection.length) / 2;
				c = Math.max(c, Math.hypot(t.x - a.x, t.station - a.station) + n);
			}
		} else {
			let e, t = n;
			a.kind === "engine-support" ? e = r * (i ? .035 : .03) : a.kind === "nose" ? (e = .08 * r, t = .4 * n) : e = a.kind === "hot-stage" ? .05 * r : r * (a.id.endsWith("-aft") ? i ? .3 : .5 : i ? .7 : .5), o = t * e, s = o + Math.PI * t * t / 4;
			let l = 0;
			for (let e of a.slices) l = Math.max(l, Math.hypot(e.x - a.x, e.station - a.station));
			c = l + Math.hypot(t, e) / 2;
		}
		if (!(a.mass > 0 && a.inertia > 0 && s > 0 && c > 0) || !Number.isFinite(a.mass + a.inertia + s + c)) throw RangeError("Debris source geometry must be positive and finite");
		return Object.freeze({
			mass: a.mass,
			inertia: a.inertia,
			broadsideArea: o,
			dragArea: s,
			supportRadius: c,
			dragMultiplier: l ? 1.8 : 1
		});
	});
	return Object.freeze({ pieces: Object.freeze(a) });
}
var ca = {
	airDensity: 0,
	airTemperature: 0,
	airPressure: 0
};
function la(e, t, n) {
	if (!(t >= 0 && n >= 0) || !Number.isFinite(t + n)) throw RangeError("Debris drag requires finite nonnegative coefficient and time");
	let r = Math.hypot(e.speedX, e.speedY), i = 1 / (1 + t * r * n);
	return e.speedX *= i, e.speedY *= i, -.5 * r * r * (1 - i) * (1 + i);
}
function ua(e, t, n) {
	un(e.altitude, ca);
	let r = st(Math.hypot(e.speedX, e.speedY) / mn(ca.airTemperature));
	la(e, ca.airDensity * r * t.dragMultiplier * t.dragArea / (2 * t.mass), n);
}
function da(e, t, n) {
	if (!(n >= 0) || !Number.isFinite(n) || e.debris.length !== t.pieces.length) throw RangeError("Debris advance requires matching inventory and finite nonnegative time");
	for (let t = 0; t < e.debris.length; t++) {
		let n = e.debris[t];
		if (n.componentIndex !== t || n.active && !Number.isFinite(n.x + n.altitude + n.speedX + n.speedY + n.pitch + n.angularVelocity)) throw RangeError("Debris active pose and source index must be finite and valid");
	}
	if (n !== 0) for (let r = 0; r < e.debris.length; r++) {
		let i = e.debris[r];
		if (!i.active) continue;
		let a = t.pieces[r];
		if (i.altitude <= a.supportRadius) {
			i.altitude = a.supportRadius, i.speedX = i.speedY = i.angularVelocity = 0;
			continue;
		}
		ua(i, a, n / 2);
		let o = i.x, s = i.altitude, c = i.speedX, l = i.speedY, u = _ + s, d = Nn(u, c, l), p = A(u, c), m = o + c * n + .5 * d * n * n, h = s + l * n + .5 * p * n * n;
		if (h <= a.supportRadius) {
			let e = (s - a.supportRadius) / (s - h);
			i.x = o + (m - o) * e, i.altitude = a.supportRadius, i.pitch = f(i.pitch + i.angularVelocity * n * e), i.speedX = i.speedY = i.angularVelocity = 0;
			continue;
		}
		let g = _ + h;
		i.x = m, i.altitude = h, i.speedX = c + .5 * (d + Nn(g, c + d * n, l + p * n)) * n, i.speedY = l + .5 * (p + A(g, c + d * n)) * n, i.pitch = f(i.pitch + i.angularVelocity * n), ua(i, a, n / 2);
	}
}
//#endregion
//#region src/core/physics/damage-model.ts
var fa = /* @__PURE__ */ new WeakMap();
function P(e) {
	let t = fa.get(e);
	if (t) return t;
	let n = zi(e), r = Object.freeze({
		partition: n,
		thermal: $i(n),
		controls: ra(n, e),
		debris: sa(n, e)
	});
	return fa.set(e, r), r;
}
//#endregion
//#region src/core/physics/damage-mass.ts
function F() {
	return {
		hasMass: !1,
		retainedDryMass: 0,
		propellantMass: 0,
		totalMass: 0,
		dryCentreOfMassX: 0,
		dryCentreOfMass: 0,
		dryMomentOfInertia: 0,
		centreOfMassX: 0,
		centreOfMass: 0,
		momentOfInertia: 0,
		frontFinCount: 0,
		aftFinCount: 0,
		gridFinCount: 0,
		frontFinArea: 0,
		aftFinArea: 0,
		gridFinArea: 0,
		engineSupportAvailable: !1
	};
}
function pa(e, t, n, r, i) {
	if (!Number.isFinite(n) || t.id !== r.id || t.dryMass !== r.dryMass || t.dryCentreOfMass !== r.dryCentreOfMass || t.dryMomentOfInertia !== r.dryMass * ((r.diameter / 2) ** 2 / 4 + r.height ** 2 / 12) || e.components.length !== t.components.length) throw RangeError("Retained mass requires matching component/model inventory and finite propellant");
	i.hasMass = !1, i.retainedDryMass = 0, i.propellantMass = Math.max(0, n), i.totalMass = 0, i.dryCentreOfMassX = i.dryCentreOfMass = i.dryMomentOfInertia = 0, i.centreOfMassX = i.centreOfMass = i.momentOfInertia = 0, i.frontFinCount = i.aftFinCount = i.gridFinCount = 0, i.frontFinArea = i.aftFinArea = i.gridFinArea = 0, i.engineSupportAvailable = !1;
	let a = !0, o = 0, s = 0;
	for (let n = 0; n < t.components.length; n++) {
		let r = e.components[n];
		if (r.componentIndex !== n) throw RangeError("Component indices must retain catalogue order");
		if (!r.attached) {
			a = !1;
			continue;
		}
		let c = t.components[n];
		i.retainedDryMass += c.mass, o += c.mass * c.x, s += c.mass * c.station, c.kind === "flap" ? c.id.startsWith("ship-front-flap-") ? i.frontFinCount++ : c.id.startsWith("ship-aft-flap-") && i.aftFinCount++ : c.kind === "grid-fin" ? i.gridFinCount++ : c.kind === "engine-support" && (i.engineSupportAvailable = r.permanentFailure === Ci.None);
	}
	if (i.frontFinArea = r.frontFinArea * i.frontFinCount / 2, i.aftFinArea = r.aftFinArea * i.aftFinCount / 2, i.gridFinArea = r.gridFins ? r.gridFins.area * i.gridFinCount / r.gridFins.count : 0, a) {
		i.retainedDryMass = r.dryMass, i.dryCentreOfMassX = t.dryCentreOfMassX, i.dryCentreOfMass = r.dryCentreOfMass, i.dryMomentOfInertia = t.dryMomentOfInertia, i.totalMass = r.dryMass + i.propellantMass, i.hasMass = !0, i.centreOfMassX = 0, i.centreOfMass = cr(i.propellantMass, r), i.momentOfInertia = ur(i.propellantMass, r);
		return;
	}
	if (i.retainedDryMass > 0) {
		i.dryCentreOfMassX = o / i.retainedDryMass, i.dryCentreOfMass = s / i.retainedDryMass;
		for (let n = 0; n < t.components.length; n++) if (e.components[n].attached) {
			let e = t.components[n];
			i.dryMomentOfInertia += e.inertia + e.mass * ((e.x - i.dryCentreOfMassX) ** 2 + (e.station - i.dryCentreOfMass) ** 2);
		}
	}
	if (i.totalMass = i.retainedDryMass + i.propellantMass, i.totalMass === 0) return;
	i.hasMass = !0;
	let c = Math.min(1, i.propellantMass / r.propellantCapacity), l = i.propellantMass * Je, u = i.propellantMass * (1 - Je), d = r.loxTankHeight * c, f = r.ch4TankHeight * c, p = r.tankBottom + d / 2, m = r.ch4TankBottom + f / 2;
	i.centreOfMassX = o / i.totalMass, i.centreOfMass = (s + l * p + u * m) / i.totalMass;
	for (let n = 0; n < t.components.length; n++) if (e.components[n].attached) {
		let e = t.components[n];
		i.momentOfInertia += e.inertia + e.mass * ((e.x - i.centreOfMassX) ** 2 + (e.station - i.centreOfMass) ** 2);
	}
	let h = (r.diameter / 2) ** 2 / 4;
	i.momentOfInertia += l * (h + d ** 2 / 12 + i.centreOfMassX ** 2 + (p - i.centreOfMass) ** 2), i.momentOfInertia += u * (h + f ** 2 / 12 + i.centreOfMassX ** 2 + (m - i.centreOfMass) ** 2);
}
//#endregion
//#region src/core/physics/flight-mass-query.ts
function I(e, t, n, r) {
	if (e.damage ? pa(e.damage, P(t).partition, e.vehicle.propellantMass, t, n) : (n.hasMass = !0, n.retainedDryMass = t.dryMass, n.propellantMass = Math.max(0, e.vehicle.propellantMass), n.totalMass = t.dryMass + n.propellantMass, n.dryCentreOfMassX = n.centreOfMassX = 0, n.dryCentreOfMass = t.dryCentreOfMass, n.dryMomentOfInertia = t.dryMass * ((t.diameter / 2) ** 2 / 4 + t.height ** 2 / 12), n.centreOfMass = cr(n.propellantMass, t), n.momentOfInertia = ur(n.propellantMass, t), n.frontFinCount = t.frontFinArea > 0 ? 2 : 0, n.aftFinCount = t.aftFinArea > 0 ? 2 : 0, n.gridFinCount = t.gridFins?.count ?? 0, n.frontFinArea = t.frontFinArea, n.aftFinArea = t.aftFinArea, n.gridFinArea = t.gridFins?.area ?? 0, n.engineSupportAvailable = !0), r) {
		if (!e.damage) {
			fr(e.vehicle.propellantMass, r, t);
			return;
		}
		r.centreOfMassX = n.centreOfMassX, r.centreOfMass = n.centreOfMass, r.momentOfInertia = n.momentOfInertia, r.engineArm = n.centreOfMass, r.aftFinArm = n.centreOfMass - t.aftFinStation, r.frontFinArm = t.frontFinStation - n.centreOfMass, r.rcsArm = t.rcsStation - n.centreOfMass, r.rCubedIntegral = dr(n.centreOfMass, t.height);
	}
}
//#endregion
//#region src/core/physics/damage-detachment.ts
function ma() {
	return {
		before: F(),
		after: F()
	};
}
function ha(e, t, n, r, i, a, o, s) {
	let c = t.components.length;
	if (c < 1 || c > 12 || e.components.length !== c || e.debris.length !== c || !Number.isInteger(a) || a < 0 || a > (1 << c) - 1) throw RangeError("Detachment requires a bounded matching component mask");
	if (s.before === s.after) throw RangeError("Detachment mass snapshots require distinct scratch");
	if (!Number.isFinite(i.x) || !Number.isFinite(i.altitude) || !Number.isFinite(i.pitch) || !Number.isFinite(i.vx) || !Number.isFinite(i.vy) || !Number.isFinite(i.omega)) throw RangeError("Detachment requires a finite physical COM pose");
	let l = 0, u = 0;
	for (let t = 0; t < c; t++) if (a & 1 << t && e.components[t].attached) {
		let n = e.debris[t];
		if (n.active || n.componentIndex !== t) throw RangeError("An attached component cannot already have a debris owner");
		l |= 1 << t, u++;
	}
	if (l === 0) return 0;
	if (o !== Ci.ProofExceeded && o !== Ci.MaterialDomain && o !== Ci.Terminal) throw RangeError("Detachment requires a permanent connection disposition");
	if (pa(e, t, r, n, s.before), !s.before.hasMass) throw RangeError("Cannot detach from an empty physical owner");
	let d = s.before, f = Math.cos(i.pitch), p = Math.sin(i.pitch);
	for (let n = 0; n < c; n++) if (l & 1 << n) {
		let r = t.components[n], a = e.components[n], s = e.debris[n], c = r.x - d.centreOfMassX, l = r.station - d.centreOfMass, u = f * c + p * l, m = -p * c + f * l;
		s.x = i.x + u, s.altitude = i.altitude + m, s.pitch = i.pitch, s.speedX = i.vx + i.omega * m, s.speedY = i.vy - i.omega * u, s.angularVelocity = i.omega, s.active = !0, a.attached = !1, a.permanentFailure === Ci.None && (a.permanentFailure = o);
	}
	if (pa(e, t, r, n, s.after), s.after.hasMass) {
		let e = s.after.centreOfMassX - d.centreOfMassX, t = s.after.centreOfMass - d.centreOfMass, n = f * e + p * t, r = -p * e + f * t;
		i.x += n, i.altitude += r, i.vx += i.omega * r, i.vy -= i.omega * n;
	}
	return e.revision++, e.eventCount += u, l;
}
//#endregion
//#region src/core/physics/thermal.ts
function ga(e, t, n) {
	return Se * e ** 3 * Math.sqrt(t / n);
}
function _a(e, t, n, r) {
	let i = 1 - Math.abs(Math.sin(r)) * (1 - Math.SQRT1_2);
	return ga(e, t, n) * i;
}
function va(e, t = 0) {
	return (Math.max(0, e) / (we * Ce) + t ** 4) ** .25;
}
var ya = $t(Kt).airTemperature + Ee;
function ba(e, t) {
	return e < 86e3 ? t + Ee : ya;
}
//#endregion
//#region src/core/physics/damage-terminal.ts
var xa = /* @__PURE__ */ function(e) {
	return e[e.Impact = 1] = "Impact", e[e.Pressure = 2] = "Pressure", e[e.Temperature = 4] = "Temperature", e[e.Acceleration = 8] = "Acceleration", e[e.MaterialDomain = 16] = "MaterialDomain", e;
}({}), Sa = F(), Ca = ma(), L = {
	x: 0,
	altitude: 0,
	pitch: f(0),
	vx: 0,
	vy: 0,
	omega: 0
};
function wa(e) {
	let t = e.forces;
	e.engines.running.fill(!1), e.engines.ignitionCountdown.fill(null), t.thrust = t.thrustAcceleration = t.twr = 0, t.paidThrustAccelerationX = t.paidThrustAccelerationY = 0, t.thrustVectorForce = t.thrustVectorAcceleration = 0, t.offAxisThrustDifferenceAcceleration = 0, t.rcsThrust = t.rcsThrustAngularAcceleration = 0;
}
function Ta(e, t, n, r) {
	let i = e.damage;
	if (!i || i.terminal.active) return;
	let a = P(t).partition, o = e.kinematics;
	pa(i, a, e.vehicle.propellantMass, t, Sa);
	let s = Math.sin(o.pitch), c = Math.cos(o.pitch), l = Sa.centreOfMassX, u = Sa.centreOfMass - t.height / 2, d = c * l + s * u, f = -s * l + c * u;
	L.x = o.downRangeDistance + d, L.altitude = o.altitude + f, L.pitch = o.pitch, L.omega = o.angularVelocity, L.vx = o.speedX + L.omega * f, L.vy = o.speedY - L.omega * d;
	let p = i.terminal;
	p.reason = n, p.time = r, p.x = L.x, p.altitude = L.altitude, p.pitch = L.pitch, p.speedX = L.vx, p.speedY = L.vy, p.angularVelocity = L.omega, p.retainedDryMass = Sa.retainedDryMass, p.retainedPropellant = Sa.propellantMass, p.releasedEnergy = 0;
	let m = (1 << a.components.length) - 1;
	ha(i, a, t, e.vehicle.propellantMass, L, m, Ci.Terminal, Ca), pa(i, a, e.vehicle.propellantMass, t, Sa);
	let h = Sa.totalMass;
	p.releasedMomentumX = h * L.vx, p.releasedMomentumY = h * L.vy, p.releasedAngularMomentum = Sa.momentOfInertia * L.omega + (L.altitude - p.altitude) * p.releasedMomentumX - (L.x - p.x) * p.releasedMomentumY, p.releasedKineticEnergy = .5 * h * (L.vx ** 2 + L.vy ** 2) + .5 * Sa.momentOfInertia * L.omega ** 2, e.engines.running.fill(!1), e.engines.failed.fill(!0), e.engines.ignitionCountdown.fill(null), e.vehicle.propellantMass = 0, e.vehicle.vehicleMass = 0, e.vehicle.vehicleMomentOfInertia = 0, p.active = !0;
}
function Ea(e) {
	return (e.forces.perceivedG > 13 ? 8 : 0) | (e.forces.surfaceTemperature > 1533 ? 4 : 0) | (e.forces.dynamicPressure > 50 ? 2 : 0) | (e.damage && !e.damage.hull.valid ? 16 : 0);
}
//#endregion
//#region src/core/physics/damage-flight.ts
var Da = F(), R = ia(12);
function Oa(e, t, n) {
	I(e, t, Da, n), e.vehicle.vehicleMass = Da.totalMass, (e.damage || n) && (e.vehicle.vehicleMomentOfInertia = Da.momentOfInertia);
}
function ka(e, t) {
	e.damage && (pa(e.damage, P(t).partition, e.vehicle.propellantMass, t, Da), !Da.engineSupportAvailable && (e.engines.running.fill(!1), e.engines.failed.fill(!0), e.engines.ignitionCountdown.fill(null)));
}
function Aa(e, t, n, r, i) {
	let a = t.gridFins ? i ?? (e.vehicle.frontFinExtension - 50) / 50 * t.gridFins.maxAngle : e.vehicle.frontFinExtension * .01 * _e;
	oa(e.damage, P(t).controls, n, r, a, e.vehicle.aftFinExtension * .01 * _e, R);
}
function ja(e, t, n, r) {
	if (e.damage) {
		Aa(e, t, n, r);
		for (let t = 0; t < e.damage.components.length; t++) {
			let n = e.damage.components[t];
			n.attached && (n.loadedAngle = f(R.loadedAngles[t]));
		}
		e.forces.frontFinEffectiveAreaFraction = R.frontFraction, e.forces.aftFinEffectiveAreaFraction = R.aftFraction, e.vehicle.vehicleInFlightMaxArea = t.maxArea + 1.8 * (R.frontArea + R.aftArea);
	}
}
function Ma(e, t, n, r, i, a, o, s, c) {
	if (!e.damage) {
		hr(t, n, r, c ?? f((e.vehicle.frontFinExtension - 50) / 50 * (o.gridFins?.maxAngle ?? 0)), i, a.centreOfMass, o, s);
		return;
	}
	s.forceX = s.forceY = s.torque = s.drag = s.lift = 0;
	let l = o.gridFins, u = Math.hypot(n, r);
	if (!l || t <= 0 || u === 0) return;
	let d = .5 * t * u * u;
	Aa(e, o, d, 0, c);
	let p = P(o).partition.components, m = Math.sin(i), h = Math.cos(i);
	for (let t = 0; t < p.length; t++) {
		let i = p[t];
		if (i.kind !== "grid-fin" || !e.damage.components[t].attached || (R.proofMask | R.domainMask) & 1 << t) continue;
		let o = R.loadedAngles[t], c = d * l.area / l.count * Math.sin(2 * o), f = d * l.area / l.count * 1.2 * Math.sin(o) ** 2, g = (-r * c - n * f) / u, _ = (n * c - r * f) / u, v = i.x - a.centreOfMassX, y = i.station - a.centreOfMass, b = h * v + m * y, x = -m * v + h * y;
		s.forceX += g, s.forceY += _, s.lift += c, s.drag += f, s.torque += x * g - b * _;
	}
}
var Na = ma(), z = {
	x: 0,
	altitude: 0,
	pitch: f(0),
	vx: 0,
	vy: 0,
	omega: 0
};
function Pa(e, t, n, r) {
	let i = e.damage;
	if (!i || i.terminal.active) return 0;
	let a = P(n), o = na(i, a.thermal, t, e.forces.thermalPower, ba(e.kinematics.altitude, e.atmosphere.airTemperature), e.atmosphere.airPressure * 1e3), s = Ea(e);
	if (s !== 0) {
		if (r !== "hull") throw RangeError("Terminal live state must publish its hull reference");
		return Ta(e, n, s, e.world.environmentTime + t), o;
	}
	Aa(e, n, e.forces.dynamicPressure * 1e3, Math.abs(Math.sin(e.kinematics.angleInToTheWind)));
	let c = o & ~Bi | R.domainMask, l = R.proofMask & ~c;
	for (let e = 0; e < i.components.length; e++) {
		let t = i.components[e];
		t.attached && !(c & 1 << e) && (t.loadedAngle = f(R.loadedAngles[e]));
	}
	if ((c | l) === 0) return o;
	pa(i, a.partition, e.vehicle.propellantMass, n, Da);
	let u = e.kinematics, d = Math.sin(u.pitch), p = Math.cos(u.pitch), m = r === "hull" ? Da.centreOfMassX : 0, h = r === "hull" ? Da.centreOfMass - n.height / 2 : 0, g = p * m + d * h, _ = -d * m + p * h;
	z.x = u.downRangeDistance + g, z.altitude = u.altitude + _, z.pitch = u.pitch, z.vx = u.speedX + u.angularVelocity * _, z.vy = u.speedY - u.angularVelocity * g, z.omega = u.angularVelocity;
	let v = i.revision, y = ha(i, a.partition, n, e.vehicle.propellantMass, z, c, Ci.MaterialDomain, Na);
	return y |= ha(i, a.partition, n, e.vehicle.propellantMass, z, l, Ci.ProofExceeded, Na), y !== 0 && (i.revision = v + 1), r === "mass" && (u.downRangeDistance = z.x, u.downRangeDistanceNextFrame = z.x, u.altitude = z.altitude, u.speedX = z.vx, u.speedY = z.vy), Oa(e, n), ka(e, n), y | o & Bi;
}
//#endregion
//#region src/core/control/guidance-physics.ts
var Fa = .1;
function Ia(e) {
	let t = _ + e.kinematics.altitude;
	return Math.max(Fa, -A(t, e.kinematics.speedX));
}
function La(e, t, n = E) {
	return e * T(n.propulsion, "sea-level", t);
}
function Ra() {
	return {
		fallWork: co(),
		atmosphere: {
			airTemperature: 0,
			airPressure: 0,
			airDensity: 0
		},
		duration: 0,
		capped: !1,
		inputs: {
			angleOfMotion: f(0),
			angleOfAttack: f(0),
			gimbalPointingDirection: f(0),
			aerodynamicDragAcceleration: 0,
			aerodynamicLiftAcceleration: 0,
			thrustAcceleration: 0,
			fixedThrustAcceleration: 0,
			pitch: f(0)
		},
		acc: {
			x: 0,
			y: 0
		}
	};
}
function za() {
	if (!("isCanonicalBurnPropulsion" in Ve)) return !1;
	try {
		let e = He;
		return typeof e == "function" && e(e, w, T);
	} catch {
		return !1;
	}
}
function Ba() {
	if (!("isCanonicalBurnAero" in nt)) return !1;
	try {
		let e = bt;
		return typeof e == "function" && e(e, it);
	} catch {
		return !1;
	}
}
function Va(e, t, n, r, i = E) {
	let a = r.atmosphere;
	un(e, a);
	let o = t / mn(a.airTemperature);
	return D(a.airDensity, t, it(f(0), i.maxArea, i), st(o)) / n;
}
var B = .05, Ha = 1200;
function Ua(e, t, n, r, i, a) {
	l();
	let o = e * w(a.propulsion, "sea-level"), s = B * .5, c = r, u = 0, d = t;
	i.capped = !1;
	for (let t = 0; t < Ha; t++) {
		let r = Wa(e, c, u, d, i, a), l = u + r * s, f = Wa(e, c + (u + l) * .5 * s, l, d + o * s, i, a);
		if (f <= 0) return NaN;
		let p = u + f * B;
		if (p >= n) {
			let e = (n - u) / (p - u);
			return i.duration = (t + e) * B, c + (u + .5 * (n - u)) * e * B;
		}
		c += (u + p) * .5 * B, u = p, d += o * B;
	}
	return i.capped = !0, NaN;
}
function Wa(e, t, n, r, i, a) {
	let o = Va(t, n, r, i, a);
	return La(e, i.atmosphere.airPressure, a) / r + o - An(_ + t);
}
function Ga(e, t, n, r, i, a, o, s, l, u) {
	c();
	let d = e * (za() ? o : w(a.propulsion, "sea-level")), f = B * .5, p = r, m = 0, h = t;
	i.capped = !1;
	for (let t = 0; t < Ha; t++) {
		let r = qa(e, p, m, h, i, a, s, l, u), o = m + r * f, c = qa(e, p + (m + o) * .5 * f, o, h + d * f, i, a, s, l, u);
		if (c <= 0) return NaN;
		let g = m + c * B;
		if (g >= n) {
			let e = (n - m) / (g - m);
			return i.duration = (t + e) * B, p + (m + .5 * (n - m)) * e * B;
		}
		p += (m + g) * .5 * B, m = g, h += d * B;
	}
	return i.capped = !0, NaN;
}
function Ka(e, t, n, r, i, a) {
	let o = r.atmosphere;
	un(e, o);
	let s = t / mn(o.airTemperature), c = D, l = o.airDensity;
	return c(l, t, Ba() ? a : it(f(0), i.maxArea, i), st(s)) / n;
}
function qa(e, t, n, r, i, a, o, s, c) {
	let l = Ka(t, n, r, i, a, c), u = i.atmosphere.airPressure, d;
	if (za()) {
		let t = Math.max(0, u) * 1e3;
		d = e * Math.max(0, o - t * s);
	} else d = La(e, u, a);
	return d / r + l - An(_ + t);
}
var Ja = 24, Ya = 1;
function Xa(e, t, n, r, i = E) {
	if (e <= 0 || t <= 0) return Infinity;
	let a = t + e * w(i.propulsion, "sea-level") * B + Ya, o = La(e, me / 1e3, i) / a - An(_ + r);
	return o <= 0 ? Infinity : r + Math.max(0, n) ** 2 / (2 * o);
}
function Za(e, t, n, r, i, a = E, o = a.dryMass) {
	if (e <= 0 || t <= 0 || !(o > 0 && o <= t)) return null;
	if (n <= 0) return r;
	let s = e * w(a.propulsion, "sea-level"), c = La(e, me / 1e3, a) / t - An(_);
	if (c <= 0) return null;
	let l = a === Nt && za() && Ba(), u = l ? w(a.propulsion, "sea-level") : 0, d = l ? u * a.propulsion.standardGravity * a.propulsion.seaLevel.ispVacuum : 0, p = l ? (d - a.propulsion.seaLevel.thrustSeaLevel) / a.propulsion.referencePressurePa : 0, m = l ? it(f(0), a.maxArea, a) : 0, h = Math.max(t - n / c * s, o), g = l ? Ga(e, h, n, r, i, a, u, d, p, m) : Ua(e, h, n, r, i, a);
	if (Number.isNaN(g)) return null;
	let v = t - s * i.duration - h;
	if (v < 0) return null;
	if (v < Ya) return g;
	let y = t - s * i.duration, b = NaN, x = 0;
	for (let o = 0; o < Ja; o++) {
		let c = Number.isNaN(b) ? o === 0 ? y : (h + y) / 2 : y - b * (y - h) / (b - v), f = l ? Ga(e, c, n, r, i, a, u, d, p, m) : Ua(e, c, n, r, i, a);
		if (i.capped) return null;
		let _ = Number.isNaN(f) ? NaN : t - s * i.duration - c;
		if (!Number.isNaN(_) && Math.abs(_) < Ya) return f;
		if (!Number.isNaN(_) && _ > 0 ? (h = c, v = _, g = f, x === 1 && !Number.isNaN(b) && (b *= .5), x = 1) : (y = c, b = _, x === -1 && (v *= .5), x = -1), y - h < Ya) break;
	}
	return g;
}
function Qa() {
	return {
		reached: !1,
		time: NaN,
		downRange: 0
	};
}
var $a = .25, eo = 4e3, to = 2;
function no(e, t, n, r, i, a, o, s, c, l = 0, u = 0, d, p) {
	let { inputs: m, acc: h } = s, g = _ + e, v = s.atmosphere;
	un(Math.max(e, 0), v);
	let y = t - er(o, e), b = l === 0 ? y : y - l, x = u === 0 ? n : n - u, C = Math.sqrt(b * b + x * x), ee = Math.atan2(b, x), te = mt(r, ee), ne = ht(te);
	if (d?.damage) {
		let e = p?.controlModel ?? P(c).controls, t = .5 * v.airDensity * C ** 2;
		if (p && p.zeroControlArea !== null && Number.isFinite(t * p.zeroControlColumnArea * to)) aa(d.damage, e, t, Number.isFinite(ne) ? 0 : NaN, oo), a = p.zeroControlArea;
		else {
			let n = c.gridFins ? (d.vehicle.frontFinExtension - 50) / 50 * c.gridFins.maxAngle : d.vehicle.frontFinExtension * .01 * _e, r = d.vehicle.aftFinExtension * .01 * _e;
			if (oa(d.damage, e, t, Math.abs(Math.sin(ne)), n, r, oo), a = c.maxArea + 1.8 * (oo.frontArea + oo.aftArea), p && n === 0 && r === 0) {
				p.zeroControlArea = a, p.zeroControlColumnArea = 0;
				for (let t of e.columns) p.zeroControlColumnArea = Math.max(p.zeroControlColumnArea, t.area);
			}
		}
	}
	let re = it(f(ne), a, c), ie = C / mn(v.airTemperature);
	m.angleOfMotion = f(ee), m.angleOfAttack = f(te), m.aerodynamicDragAcceleration = D(v.airDensity, C, re, st(ie)) / i, m.aerodynamicLiftAcceleration = ot(v.airDensity, C, f(ne), a) / i, En(m, S, h), h.x += Nn(g, t, n), h.y = h.y + S + A(g, t);
}
var ro = pr(), io = mr(), ao = F(), oo = ia(12);
function so(e, t, n, r) {
	let i = e.kinematics;
	e.damage && I(e, n, ao, ro);
	let a = e.damage ? ao.totalMass : e.vehicle.vehicleMass;
	if (!(a > 0)) {
		r.acc.x = r.acc.y = 0;
		return;
	}
	no(i.altitude, i.speedX, i.speedY, t, a, e.vehicle.vehicleInFlightMaxArea, e.world.wind, r, n, e.world.gust, e.world.gustVertical, e), n.gridFins && (e.damage || fr(e.vehicle.propellantMass, ro, n), Ma(e, r.atmosphere.airDensity, i.speedX - er(e.world.wind, i.altitude) - e.world.gust, i.speedY - e.world.gustVertical, t, ro, n, io), r.acc.x += io.forceX / a, r.acc.y += io.forceY / a);
}
function co() {
	return {
		state: null,
		model: E,
		groundAltitude: 0,
		pitch: f(0),
		mass: 0,
		maxArea: 0,
		referenceWind: 0,
		zeroControlArea: null,
		zeroControlColumnArea: 0,
		controlModel: null,
		h: 0,
		x: 0,
		vx: 0,
		vy: 0,
		steps: 0,
		done: !0,
		result: Qa()
	};
}
function lo(e, t, n, r, i) {
	t.damage && I(t, r, ao), e.state = t, e.model = r, e.groundAltitude = n, e.pitch = i, e.mass = t.damage ? ao.totalMass : t.vehicle.vehicleMass, e.maxArea = t.vehicle.vehicleInFlightMaxArea, e.referenceWind = t.world.wind, e.zeroControlArea = null, e.zeroControlColumnArea = 0, e.controlModel = t.damage ? P(r).controls : null, e.h = t.kinematics.altitude, e.x = 0, e.vx = t.kinematics.speedX, e.vy = t.kinematics.speedY, e.steps = 0, e.done = !(e.mass > 0), e.result.reached = !1, e.result.time = NaN, e.result.downRange = e.done ? NaN : 0;
}
function uo(e, t, n = E, r = e.kinematics.pitch) {
	let i = co();
	return lo(i, e, t, n, r), i;
}
function fo(e, t, n) {
	if (e.done) return 0;
	let r = e.state, i = e.model, a = e.pitch, o = e.mass, s = e.maxArea, c = e.referenceWind, l = n.acc, u = $a * .5, d = e.h, f = e.x, p = e.vx, m = e.vy, h = e.steps, g = 0, _ = Math.min(Math.floor(t), eo - h);
	for (let t = 0; t < _; t++) {
		no(d, p, m, a, o, s, c, n, i, 0, 0, r, e);
		let t = p + l.x * u, _ = m + l.y * u;
		no(d + m * u, t, _, a, o, s, c, n, i, 0, 0, r, e);
		let v = p + l.x * $a, y = m + l.y * $a, b = d + _ * $a, x = f + t * $a, S = h;
		if (h++, g++, b <= e.groundAltitude) {
			let t = (d - e.groundAltitude) / (d - b);
			e.result.reached = !0, e.result.time = (S + t) * $a, e.result.downRange = f + (x - f) * t, d = b, f = x, p = v, m = y, e.done = !0;
			break;
		}
		d = b, f = x, p = v, m = y;
	}
	return e.h = d, e.x = f, e.vx = p, e.vy = m, e.steps = h, e.result.reached || (e.result.downRange = f), h >= 4e3 && (e.done = !0), g;
}
function po(e, t, n, r, i = E, a = e.kinematics.pitch) {
	let o = n.fallWork;
	lo(o, e, t, i, a), fo(o, eo, n), r.reached = o.result.reached, r.time = o.result.time, r.downRange = o.result.downRange, o.state = null;
}
//#endregion
//#region src/core/control/booster-receipts.ts
function mo(e, t) {
	let n = e.autopilot;
	return t === 1 / 120 && !!e.damage && !n.manualControlOn && (n.autoLandOn || n.autoBoostBackOn) && !n.boosterReturnPlan && (n.boosterPhase === "align-boost" || n.boosterPhase === "boostback" && !xt.every((t) => e.engines.running[t]));
}
function ho(e, t) {
	for (let n of [
		"boosterFallTime",
		"boosterCoastPitch",
		"boosterForecastBurn"
	]) Object.hasOwn(t.autopilot, n) ? Object.assign(e.autopilot, { [n]: t.autopilot[n] }) : delete e.autopilot[n];
}
function go(e) {
	if (e && typeof e == "object") {
		for (let t in e) go(e[t]);
		Object.freeze(e);
	}
	return e;
}
function _o(e) {
	if (!e || typeof e != "object") return e;
	let t = Array.isArray(e) ? [] : {};
	for (let n in e) t[n] = _o(e[n]);
	return t;
}
function vo(e, t, n, r, i, a, o, s, c) {
	return Object.freeze({
		input: go(V(e)),
		expected: go(V(t)),
		returned: go(V(n)),
		dt: r,
		advance: i,
		policy: a,
		model: o,
		modelSnapshot: go(_o(o)),
		lineage: s,
		revision: c
	});
}
function yo(e, t) {
	let n = e?.chunks, r = n?.[n.length - 1], i = r?.[r.length - 1];
	return (e?.size ?? 0) < 1024 && (!i || t > i.input.world.environmentTime) && (!r || r.length < 32 || n.length < 32);
}
function bo(e, t) {
	if (!yo(e, t.input.world.environmentTime)) return e;
	let n = [...e?.chunks ?? []], r = n[n.length - 1];
	return r && r.length < 32 ? n[n.length - 1] = Object.freeze([...r, t]) : n.push(Object.freeze([t])), Object.freeze({
		chunks: Object.freeze(n),
		size: (e?.size ?? 0) + 1
	});
}
function xo(e, t, n, r, i, a, o, s) {
	let c = 0, l = 0, u = 0;
	for (; c < e.chunks.length;) {
		let n = e.chunks[c];
		for (; l < n.length && n[l].input.world.environmentTime < t.world.environmentTime;) l++, u++;
		if (l < n.length) break;
		c++, l = 0;
	}
	let d = e.chunks[c]?.[l], f;
	if (d && d.input.world.environmentTime === t.world.environmentTime && d.lineage === o && d.revision === s && d.dt === n && d.advance === r && d.policy === i && d.model === a && Do(d.modelSnapshot, a)) {
		let e = V(d.input);
		ho(e, t), Do(e, t) && (f = d, l++, u++);
	}
	if (!u) return {
		receipt: f,
		queue: e
	};
	let p = e.chunks.slice(c);
	return p[0] && (l === p[0].length ? p.shift() : l > 0 && (p[0] = Object.freeze(p[0].slice(l)))), {
		receipt: f,
		queue: Object.freeze({
			chunks: Object.freeze(p),
			size: e.size - u
		})
	};
}
//#endregion
//#region src/core/control/booster-source.ts
function So(e) {
	return e ? {
		...e,
		handoff: { ...e.handoff }
	} : void 0;
}
function Co(e) {
	let t = So(e.plan);
	return t && (Object.freeze(t.handoff), Object.freeze(t)), Object.freeze({
		...e,
		plan: t
	});
}
function V(e) {
	let t = { ...e.autopilot };
	return delete t.boosterSource, delete t.boosterPrediction, Lo({
		...e,
		autopilot: t
	});
}
function wo(e, t) {
	let n = e.autopilot;
	return Co({
		phase: "post-step",
		time: e.world.environmentTime,
		sequence: t,
		rangeError: n.boosterRangeError,
		fallTime: n.boosterFallTime,
		coastPitch: n.boosterCoastPitch,
		reached: n.boosterForecastReached,
		plan: n.boosterReturnPlan
	});
}
function To(e, t) {
	let n = e.autopilot;
	t.rangeError === void 0 ? delete n.boosterRangeError : n.boosterRangeError = t.rangeError, t.fallTime === void 0 ? delete n.boosterFallTime : n.boosterFallTime = t.fallTime, t.coastPitch === void 0 ? delete n.boosterCoastPitch : n.boosterCoastPitch = t.coastPitch, t.reached === void 0 ? delete n.boosterForecastReached : n.boosterForecastReached = t.reached;
	let r = So(t.plan);
	r ? n.boosterReturnPlan = r : delete n.boosterReturnPlan;
}
function Eo(e) {
	let t = e.autopilot;
	t.boosterSource && (t.boosterSource.valid = !1), delete t.boosterReturnPlan, delete t.boosterCoastPitch, delete t.boosterForecastReached, t.boosterPrediction?.published && (t.boosterPrediction = {
		...t.boosterPrediction,
		published: void 0
	});
}
function Do(e, t, n = !1) {
	if (Object.is(e, t)) return !0;
	if (e === null || t === null || typeof e != "object" || typeof t != "object" || Array.isArray(e) !== Array.isArray(t) || Array.isArray(e) && e.length !== t.length) return !1;
	let r = e, i = t;
	for (let e in r) if (!(n && (e === "boosterSource" || e === "boosterPrediction")) && (!(e in i) || !Do(r[e], i[e], e === "autopilot"))) return !1;
	for (let e in i) if (!(n && (e === "boosterSource" || e === "boosterPrediction")) && !(e in r)) return !1;
	return !0;
}
function Oo(e, t) {
	if (!e.damage) return !0;
	let n = e.autopilot, r = n.boosterSource;
	return r ? r.revision !== e.damage.revision || !r.valid || !r.expected || r.expectedDt !== t || !Do(r.expected, e) || n.boosterReturnPlan && n.boosterReturnPlan.sourceLineage !== r.lineageId ? (Eo(e), !1) : (r.checked = !0, !0) : !n.boosterReturnPlan || (Eo(e), !1);
}
function ko(e) {
	if (!e.damage) return;
	let t = e.autopilot, n = t.boosterSource;
	if (n && n.revision === e.damage.revision && (n.valid || t.boosterPrediction && !t.boosterPrediction.done)) return;
	n && delete t.boosterPrediction, delete t.boosterReturnPlan;
	let r = V(e);
	t.boosterSource = {
		lineageId: (n?.lineageId ?? 0) + 1,
		revision: e.damage.revision,
		originTime: e.world.environmentTime,
		valid: !0,
		checked: !0,
		returned: r,
		expected: void 0,
		expectedDt: 0,
		event: wo(e, 0)
	};
}
function Ao(e, t, n, r, i, a) {
	let o = e.autopilot.boosterSource;
	if (!o || !o.valid) return 0;
	if (!o.checked || o.returned.world.environmentTime !== e.world.environmentTime) return Eo(e), 0;
	let s = wo(e, o.event.sequence + 1), c = V(o.returned);
	if (To(c, s), a) return Do(s, a.event) ? (e.autopilot.boosterSource = {
		...o,
		event: s,
		returned: V(a.returned),
		expected: V(a.expected),
		expectedDt: t,
		checked: !1
	}, 0) : (Eo(e), 0);
	let l, u = n(c, t, (e, t, n) => {
		l = V(e), r(e, t, n);
	}, i);
	return e.autopilot.boosterSource = {
		...o,
		event: s,
		returned: V(u),
		expected: l,
		expectedDt: t,
		checked: !1,
		valid: l !== void 0
	}, l || Eo(e), 1;
}
function jo(e, t, n, r, i) {
	let a = e.autopilot.boosterSource;
	if (!a?.valid || !a.checked || !a.receipts || a.returned.world.environmentTime !== e.world.environmentTime) return;
	let o = wo(e, a.event.sequence + 1), s = V(a.returned);
	if (To(s, o), !mo(s, t)) return;
	let c = xo(a.receipts, s, t, n, r, i, a.lineageId, a.revision);
	if (e.autopilot.boosterSource = {
		...a,
		receipts: c.queue
	}, !c.receipt) return;
	let l = V(c.receipt.expected), u = V(c.receipt.returned);
	return ho(l, s), ho(u, s), {
		event: o,
		expected: l,
		returned: u
	};
}
function Mo(e, t, n, r, i, a, o, s) {
	let c = e.autopilot.boosterSource;
	if (!n || !Po(e, t, i)) return;
	let l = vo(t, n, r, i, a, o, s, c.lineageId, c.revision);
	e.autopilot.boosterSource = {
		...c,
		receipts: bo(c.receipts, l)
	};
}
function No(e, t) {
	let n = e.autopilot.boosterSource;
	return !!n && Do(wo(e, n.event.sequence + 1), t.event);
}
function Po(e, t, n) {
	let r = e.autopilot.boosterSource;
	return !!r?.valid && mo(t, n) && yo(r.receipts, t.world.environmentTime);
}
//#endregion
//#region src/core/state.ts
var Fo = 1463897163;
function Io(e = Fo, t = E) {
	let n = t.height / 2, r = _ + n, i = t.dryMass + t.initialPropellant;
	return {
		damage: Ti(P(t).partition, ba(n, $t(n).airTemperature)),
		rng: Rn(e),
		world: {
			environmentTime: 0,
			timeSpent: 0,
			updatedFrameCount: 0,
			wind: 0,
			gust: 0,
			gustVertical: 0,
			turbulenceU: 0,
			turbulenceW1: 0,
			turbulenceW2: 0
		},
		atmosphere: {
			airDensity: 0,
			airPressure: 0,
			airTemperature: 0
		},
		kinematics: {
			altitude: n,
			downRangeDistance: C,
			downRangeDistanceNextFrame: C,
			distanceToPlanetCenter: r,
			orbitalVelocityAtCurrentAltitude: kn(r),
			trueSpeed: 0,
			speedX: 0,
			speedY: 0,
			machSpeed: 0,
			accelerationX: 0,
			accelerationY: 0,
			totalAcceleration: Math.sqrt(0 + (-S) ** 2),
			pitch: f(0),
			pitchRateOfChange: 0,
			pitchRecord: t.gridFins ? [0, 0] : [Infinity, Infinity],
			angularVelocity: 0,
			angularAcceleration: 0,
			angleOfMotion: f(0),
			angleOfAttack: f(0),
			angleInToTheWind: f(0)
		},
		forces: {
			thrust: 0,
			thrustAcceleration: 0,
			paidThrustAccelerationX: 0,
			paidThrustAccelerationY: 0,
			offAxisThrustDifferenceAcceleration: 0,
			twr: 0,
			thrustVectorForce: 0,
			thrustVectorAcceleration: 0,
			rcsThrust: 0,
			rcsThrustAngularAcceleration: 0,
			angularDragAcceleration: 0,
			crossSectionalArea: 100,
			aerodynamicDrag: 0,
			aerodynamicLift: 0,
			aerodynamicDragAcceleration: 0,
			aerodynamicLiftAcceleration: 0,
			frontFinDrag: 0,
			aftFinDrag: 0,
			frontFinDragAngularAcceleration: 0,
			aftFinDragAngularAcceleration: 0,
			frontFinEffectiveAreaFraction: yt(0, 0, t).frontFinEffectiveAreaFraction,
			aftFinEffectiveAreaFraction: yt(0, 0, t).aftFinEffectiveAreaFraction,
			thermalPower: 0,
			surfaceTemperature: 0,
			dynamicPressure: 0,
			perceivedG: 0,
			perceivedG_X: 0,
			perceivedG_Y: 0
		},
		vehicle: {
			vehicleMass: i,
			propellantMass: t.initialPropellant,
			vehicleMomentOfInertia: t.gridFins ? ur(t.initialPropellant, t) : i * (t.diameter / 2) ** 2 * .25 + i * t.height ** 2 / 12,
			vehicleInFlightMaxArea: t.maxArea,
			throttle: 100,
			throttleCurrent: 100,
			gimbalPosition: 0,
			gimbalPointingDirection: f(0),
			frontFinExtension: t.gridFins ? 50 : 0,
			aftFinExtension: t.gridFins ? 50 : 0,
			rcsRunTimeRemaining: 25
		},
		engines: {
			running: t.engines.map(() => !1),
			failed: t.engines.map(() => !1),
			ignitionCountdown: t.engines.map(() => null)
		},
		status: {
			onTheGround: !1,
			landed: !1,
			rcsActive: !1,
			finActive: !1,
			finLocked: !1,
			gearDown: !1,
			dumpingFuel: !1,
			forceDump: !1,
			translationModeOn: !0
		},
		warnings: {
			coldGasLow: !1,
			fuelLow: !1,
			heatDamagedWarning: !1,
			overPressureWarning: !1,
			overGLoadWarning: !1
		},
		failures: {
			crashed: !1,
			inFlightBreakUp: !1,
			coldGasRunOut: !1,
			fuelRunOut: !1,
			heatDamaged: !1,
			overPressure: !1,
			overGLoad: !1,
			flippedOver: !1,
			randomFailure: !1
		},
		autopilot: {
			manualControlOn: !1,
			rcsThrustCommand: 0,
			pitchControl: 0,
			holdingPitch: f(0),
			pitchHoldOn: !1,
			autoBoostBackOn: !1,
			boostBackInitCompleted: !1,
			boostBackAeroDeceleration: !0,
			boostBackDecelerationStageInitCompleted: !1,
			boostBackDecelerationCheckCountdown: null,
			accelerationStageCompleted: !1,
			boostBackDirection: 0,
			decelerationStageEstDuration: 0,
			autoDeorbitOn: !1,
			deorbitInitCompleted: !1,
			deorbitBurnStarted: !1,
			deorbitBurnCompleted: !1,
			deorbitTargetSpeed: void 0,
			autoLandOn: !1,
			initVehicleConfigCompleted: !1,
			landingSiteXPos: C,
			aeroDescentCompleted: !1,
			fineTunePercentage: void 0,
			bellyFlopTriggerAltitude: 0,
			flipStageInitialised: !1,
			flipCompleted: !1,
			horizontalAdjustmentStageCompleted: !1,
			horizontalAdjustmentStageInitialised: !1,
			horizontalAdjustmentTimeLeft: void 0,
			horizontalAdjustmentDesiredSpeed: void 0,
			effectiveVerticalMaxThrust: void 0,
			finalStagePessimisticAltitude: void 0,
			finalDescentStageInitialised: !1,
			distanceToGround: void 0,
			finalDescentStageCompleted: !1,
			autoMaxThrustOn: !1,
			autoTakeOffOn: !1,
			autoTakeOffInitialised: !1,
			horizontalAdjustmentVerticalSpeedLimit: -30,
			horizontalAdjustmentHorizontalSpeedLimit: 5,
			demoAutoLandOn: !1,
			horizontalAccelerationByAeroBreakingCorrectionAngle: f(0)
		}
	};
}
function Lo(e) {
	return {
		damage: e.damage ? Ei(e.damage) : null,
		rng: {
			seed: e.rng.seed,
			counters: { ...e.rng.counters }
		},
		world: { ...e.world },
		atmosphere: { ...e.atmosphere },
		kinematics: {
			...e.kinematics,
			pitchRecord: [e.kinematics.pitchRecord[0], e.kinematics.pitchRecord[1]]
		},
		forces: { ...e.forces },
		vehicle: { ...e.vehicle },
		engines: {
			running: [...e.engines.running],
			failed: [...e.engines.failed],
			ignitionCountdown: [...e.engines.ignitionCountdown]
		},
		status: { ...e.status },
		warnings: { ...e.warnings },
		failures: { ...e.failures },
		autopilot: {
			...e.autopilot,
			...e.autopilot.boosterReturnPlan ? { boosterReturnPlan: So(e.autopilot.boosterReturnPlan) } : {},
			...e.autopilot.boosterSource ? { boosterSource: {
				...e.autopilot.boosterSource,
				returned: Lo(e.autopilot.boosterSource.returned),
				expected: e.autopilot.boosterSource.expected ? Lo(e.autopilot.boosterSource.expected) : void 0,
				event: Co(e.autopilot.boosterSource.event)
			} } : {}
		}
	};
}
function Ro(e, t = E) {
	let n = yt(e.vehicle.frontFinExtension, e.vehicle.aftFinExtension, t);
	e.forces.frontFinEffectiveAreaFraction = n.frontFinEffectiveAreaFraction, e.forces.aftFinEffectiveAreaFraction = n.aftFinEffectiveAreaFraction, e.vehicle.vehicleInFlightMaxArea = n.vehicleInFlightMaxArea;
}
//#endregion
//#region src/core/physics/engines.ts
function zo(e) {
	let t = 0;
	for (let n of e) n && (t += 1);
	return t;
}
function Bo(e, t, n, r) {
	let i = 0;
	for (let a = 0; a < r.engines.length; a++) r.engines[a].kind === t && e[a] === !0 === n && (i += 1);
	return i;
}
function Vo(e, t = E) {
	return Bo(e, "sea-level", !0, t);
}
function Ho(e, t = E) {
	return Bo(e, "sea-level", !1, t);
}
function H(e, t, n = E) {
	return Bo(e, "sea-level", !0, n) * T(n.propulsion, "sea-level", t) + Bo(e, "vacuum", !0, n) * T(n.propulsion, "vacuum", t);
}
function Uo(e, t, n = E) {
	return H(e, t, n) * 40 * .01;
}
function Wo(e, t, n, r = E) {
	return H(e, n, r) * t * .01;
}
function Go(e, t, n = E) {
	if (n.engines.some((e) => e.gimballed === !1 && e.kind === "sea-level")) {
		let t = 0, r = 0;
		for (let i = 0; i < n.engines.length; i++) e[i] && (t++, n.engines[i].gimballed === !0 && r++);
		return t > 0 ? r / t : 0;
	}
	if (Bo(e, "vacuum", !0, n) === 0) return 1;
	let r = H(e, t, n);
	return r > 0 ? Bo(e, "sea-level", !0, n) * T(n.propulsion, "sea-level", t) / r : 0;
}
function Ko(e, t) {
	return e * Math.sin(.01 * t * de);
}
function qo(e, t, n, r = E) {
	let i = 0, a = 0;
	for (let t = 0; t < r.engines.length; t++) {
		let n = r.engines[t], o = +!!e[t] * n.offAxisForceFraction;
		n.kind === "sea-level" ? i += o : a += o;
	}
	return i * t * .01 * T(r.propulsion, "sea-level", n) + a * t * .01 * T(r.propulsion, "vacuum", n);
}
function Jo(e, t) {
	let n = e - .01 * t * de;
	return n > Math.PI ? n -= 2 * Math.PI : n < -Math.PI && (n += 2 * Math.PI), f(n);
}
function Yo(e, t, n = E) {
	return Bo(e, "sea-level", !0, n) * t * .01 * w(n.propulsion, "sea-level") + Bo(e, "vacuum", !0, n) * t * .01 * w(n.propulsion, "vacuum");
}
function Xo(e, t, n = E) {
	ka(e, n);
	let { vehicle: r, engines: i, status: a } = e, o = 1;
	if (r.propellantMass > 0) {
		let e = Yo(i.running, r.throttleCurrent, n) * t;
		e > r.propellantMass && (o = r.propellantMass / e), r.propellantMass = Math.max(0, r.propellantMass - e);
	} else r.propellantMass = 0;
	return a.dumpingFuel && ((r.propellantMass > 12e3 || a.forceDump) && r.propellantMass > 0 ? r.propellantMass = Math.max(0, r.propellantMass - re * t) : a.dumpingFuel = !a.dumpingFuel), Oa(e, n), o;
}
var Zo = 1.2;
function Qo(e, t) {
	let { engines: n } = e;
	if (n.running[t] || n.failed[t] || n.ignitionCountdown[t] !== null) return;
	let r = Wn(e.rng, "ignitionDelay");
	n.ignitionCountdown[t] = (r * 1.5 + .5) * (600 / 1e3);
}
function $o(e, t) {
	let n = e.failures.randomFailure ? ie : 0, r = Wn(e.rng, "ignitionFailure") < n;
	return r && (e.engines.failed[t] = !0), r;
}
function es(e, t) {
	let { engines: n } = e;
	for (let e = 0; e < n.ignitionCountdown.length; e++) {
		let r = n.ignitionCountdown[e];
		if (r == null) continue;
		let i = r - t;
		i <= 0 ? (n.ignitionCountdown[e] = null, n.running[e] = !0) : n.ignitionCountdown[e] = i;
	}
}
function ts(e, t) {
	e.engines.running[t] = !1, e.engines.ignitionCountdown[t] = null;
}
function ns(e) {
	e.failures.fuelRunOut && (e.engines.running.fill(!1), e.engines.ignitionCountdown.fill(null));
}
function rs(e, t, n, r, i) {
	let a = 0;
	for (let o = 0; o < i.engines.length; o++) if (e[o]) {
		let e = i.engines[o], s = T(i.propulsion, e.kind, n);
		a -= e.offAxis * s * t * .01 * Math.cos(e.gimballed ?? e.kind === "sea-level" ? r : 0);
	}
	return a;
}
//#endregion
//#region src/core/control/booster-return-plan.ts
function is(e) {
	delete e.boosterPrediction, delete e.boosterReturnPlan;
}
function as(e) {
	let t = e.autopilot, n = e.damage?.revision, r = t.boosterPrediction && t.boosterPrediction.origin.damage?.revision !== n, i = t.boosterReturnPlan && t.boosterReturnPlan.damageRevision !== n;
	return !r && !i ? !1 : (is(t), delete t.boosterCoastPitch, delete t.boosterForecastReached, delete t.boosterRangeError, delete t.boosterFallTime, !0);
}
function os(e) {
	let t = e.forecast;
	return t.reached && !t.failed && t.fuel > 0 && t.handoff !== void 0 && Number.isFinite(t.rangeError) && Number.isFinite(e.shutdownAt) && Number.isFinite(e.burnDuration) && e.burnDuration >= 0;
}
function ss(e, t) {
	if (!os(e) || !os(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || e.coastPitch !== t.coastPitch || t.burnDuration <= e.burnDuration || e.forecast.rangeError * t.forecast.rangeError >= 0) return;
	let n = e.forecast.rangeError / (e.forecast.rangeError - t.forecast.rangeError);
	return e.burnDuration + (t.burnDuration - e.burnDuration) * n;
}
function cs(e, t, n, r = 0) {
	if (!os(e) || !os(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || e.coastPitch !== t.coastPitch || e.burnDuration === t.burnDuration || e.forecast.rangeError * t.forecast.rangeError <= 0) return;
	let i = t.forecast.rangeError - e.forecast.rangeError, a = t.burnDuration - t.forecast.rangeError * (t.burnDuration - e.burnDuration) / i, o = t.burnDuration > e.burnDuration ? a > t.burnDuration : a < t.burnDuration;
	return Number.isFinite(a) && o && a > r && a < n ? a : void 0;
}
function ls(e, t, n) {
	if (!(!os(e) || !t || !e.forecast.handoff.lateralFeasible || e.shutdownAt <= n)) return {
		originTime: e.originTime,
		shutdownAt: e.shutdownAt,
		...e.damageRevision === void 0 ? {} : { damageRevision: e.damageRevision },
		...e.sourceLineage === void 0 ? {} : { sourceLineage: e.sourceLineage },
		coastPitch: e.coastPitch,
		handoff: { ...e.forecast.handoff }
	};
}
function us(e, t, n, r) {
	if (ss(n, r) === void 0 || !os(e) || !os(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || t.damageRevision !== n.damageRevision || t.sourceLineage !== n.sourceLineage || t.originTime !== n.originTime || e.coastPitch !== t.coastPitch || t.coastPitch !== n.coastPitch || e.burnDuration === t.burnDuration) return;
	let i = t.forecast.rangeError - e.forecast.rangeError, a = t.burnDuration - t.forecast.rangeError * (t.burnDuration - e.burnDuration) / i;
	return Number.isFinite(a) && a > n.burnDuration && a < r.burnDuration ? a : void 0;
}
//#endregion
//#region src/core/control/commands.ts
function ds(e, t) {
	let { engines: n, failures: r } = e, i = n.ignitionCountdown[t] !== null;
	!n.running[t] && !i && !n.failed[t] && !r.fuelRunOut ? $o(e, t) || Qo(e, t) : ts(e, t);
}
function U(e, t = E) {
	let { running: n } = e.engines;
	if (n.some(Boolean)) for (let t = 0; t < n.length; t++) n[t] && ds(e, t);
	else for (let r of t.ignitionGroup) n[r] || ds(e, r);
}
function fs(e) {
	e.status.finActive = !e.status.finActive;
}
function ps(e) {
	e.status.rcsActive = !e.status.rcsActive;
}
function ms(e) {
	e.status.dumpingFuel = !e.status.dumpingFuel;
}
function hs(e) {
	e.autopilot.autoMaxThrustOn = !e.autopilot.autoMaxThrustOn;
}
function gs(e) {
	e.autopilot.autoTakeOffOn = !e.autopilot.autoTakeOffOn;
}
function _s(e) {
	e.autopilot.autoBoostBackOn = !e.autopilot.autoBoostBackOn;
}
function vs(e) {
	e.autopilot.autoLandOn = !e.autopilot.autoLandOn;
}
//#endregion
//#region src/core/scenarios.ts
var ys = [
	{
		id: "booster-sep",
		name: "Booster Sep",
		description: "Just after stage separation: high, fast, and pointed downrange.",
		altitude: 7e4,
		xPosition: 45e3,
		speedX: 1130,
		speedY: 1130,
		pitch: p(45),
		propellant: 500
	},
	{
		id: "rtls",
		name: "RTLS",
		description: "Return to launch site — downrange and climbing, needs a boostback burn.",
		altitude: 15e3,
		xPosition: 5e3,
		speedX: 330,
		speedY: 430,
		pitch: p(30),
		propellant: 200
	},
	{
		id: "reentry",
		name: "Re-entry",
		description: "Orbital velocity, 1980 km short of the pad. The hardest one.",
		altitude: 8e4,
		xPosition: -198e4,
		speedX: 7300,
		speedY: -30,
		pitch: p(30),
		propellant: 50
	},
	{
		id: "before-flip",
		name: "Before Flip",
		description: "Belly-down at terminal velocity, moments from the flip.",
		altitude: 1e3,
		xPosition: -100,
		speedX: 0,
		speedY: -70,
		pitch: p(90),
		propellant: 30
	},
	{
		id: "landing-burn",
		name: "Landing Burn",
		description: "Vertical, low and slow. The last few seconds.",
		altitude: 200,
		xPosition: 0,
		speedX: 0,
		speedY: -35,
		pitch: p(0),
		propellant: 20
	}
], bs = {
	id: "launch-pad",
	name: "Launch Pad",
	description: "On the pad at StarBase, full tanks.",
	altitude: E.height / 2,
	xPosition: 0,
	speedX: 0,
	speedY: 0,
	pitch: p(0),
	propellant: te / 1e3
}, xs = 200, Ss = {
	id: "intro",
	name: "Intro Demo",
	description: "The auto-landing sequence that plays when the game opens.",
	altitude: xs - 1,
	xPosition: 0,
	speedX: 0,
	speedY: -xs / 4,
	pitch: p(0),
	propellant: 12
}, Cs = 15e4, ws = Mn(_ + Cs, kn(_ + Cs)), Ts = [{
	id: "circularize",
	name: "Circularize",
	description: "Just short of orbital speed at 150 km — a short prograde burn closes the orbit.",
	altitude: Cs,
	xPosition: 0,
	speedX: ws - 20,
	speedY: 0,
	pitch: p(90),
	propellant: 200
}, {
	id: "deorbit",
	name: "Deorbit Burn",
	description: "Circular at 150 km, half a lap short of StarBase. Burn retrograde and come home.",
	altitude: Cs,
	xPosition: -Math.PI * _,
	speedX: ws,
	speedY: 0,
	pitch: p(90),
	propellant: 300
}], Es = [
	bs,
	...ys,
	...Ts,
	Ss
];
function Ds(e) {
	return Es.find((t) => t.id === e);
}
function Os(e, t) {
	return As(e, t, E);
}
function ks(e, t) {
	let n = e.id === "custom" ? e.basedOn : e.id, r = n === "booster-sep" || n === "rtls" ? Nt : E;
	return {
		state: As(e, t, r),
		vehicle: r
	};
}
function As(e, t, n) {
	let r = Io(t, n), i = e.altitude;
	i < n.height / 2 && (i = n.height / 2), r.kinematics.altitude = i, r.kinematics.distanceToPlanetCenter = _ + i, r.kinematics.downRangeDistance = e.xPosition + C, r.kinematics.downRangeDistanceNextFrame = r.kinematics.downRangeDistance, r.kinematics.speedX = e.speedX, r.kinematics.speedY = e.speedY, r.kinematics.trueSpeed = Math.sqrt(e.speedX ** 2 + e.speedY ** 2), r.kinematics.pitch = m(e.pitch), n.gridFins && (r.kinematics.pitchRecord = [r.kinematics.pitch, r.kinematics.pitch]);
	let a = e.propellant * 1e3;
	return a > n.propellantCapacity && (a = n.propellantCapacity), a > 0 || (a = 0), r.vehicle.propellantMass = a, r.vehicle.vehicleMass = n.dryMass + a, n.gridFins && (r.vehicle.vehicleMomentOfInertia = ur(a, n)), r.world.wind = e.wind ?? 0, r.kinematics.machSpeed = dt(r.kinematics.speedX, r.kinematics.speedY, j(r.world, r.kinematics.altitude), r.world.gustVertical) / mn($t(i).airTemperature), r.damage = Ti(P(n).partition, ba(i, $t(i).airTemperature)), r;
}
function js(e) {
	let t = Os(Ss, e);
	return t.status.finLocked = !0, t.autopilot.demoAutoLandOn = !0, U(t), t;
}
//#endregion
//#region src/core/physics/step-dynamics.ts
function Ms() {
	return {
		omega0: 0,
		alpha0: 0,
		bodyAccelerationX: 0,
		bodyAccelerationY: 0,
		burnedFraction: 0,
		gimballedThrust: 0,
		airspeed: 0,
		massProperties: pr(),
		gridFinForces: mr()
	};
}
function Ns(e, t) {
	let { kinematics: n } = e;
	n.pitchRecord.push(n.pitch), n.pitchRecord.shift();
	let r = n.pitchRecord[0];
	n.pitchRateOfChange = e.damage && !Number.isFinite(r) ? n.angularVelocity : (n.pitch - r) / t;
}
function Ps(e) {
	let { kinematics: t } = e;
	t.distanceToPlanetCenter = _ + t.altitude, t.orbitalVelocityAtCurrentAltitude = kn(t.distanceToPlanetCenter);
}
function Fs(e, t) {
	let { kinematics: n, status: r, failures: i, vehicle: a, engines: o } = e;
	n.altitude <= t.height * Math.abs(Math.cos(n.pitch)) * .5 ? (n.speedY < -.5 || t.id === "super-heavy" && n.speedY < 0) && (t.id === "ship" && Math.abs(n.speedX) < 2 && Math.abs(n.speedY) < 10 && Math.abs(n.pitch) < .09 ? (r.landed = !0, n.speedX = 0, n.speedY = 0, n.angularVelocity = 0) : (Ta(e, t, xa.Impact, e.world.environmentTime), i.crashed = !0, n.speedX = 0, n.speedY = 0, n.angularVelocity = 0, n.pitch = f(0), a.propellantMass = 0, o.running.fill(!1), a.rcsRunTimeRemaining = 0)) : (r.landed = !1, r.onTheGround = !1);
}
function Is(e, t, n, r = n.height * Math.abs(Math.cos(e.kinematics.pitch)) * .5) {
	let { kinematics: i, status: a } = e;
	i.altitude > r || i.speedY < -.5 || e.failures.crashed || a.landed || (a.onTheGround = t <= An(i.distanceToPlanetCenter), a.onTheGround && (i.speedX = 0, i.speedY = 0, i.angularVelocity = 0));
}
function Ls(e, t, n) {
	let { kinematics: r, forces: i, failures: a, vehicle: o, engines: s } = e;
	(i.perceivedG > 13 || i.surfaceTemperature > 1533 || i.dynamicPressure > 50 || e.damage !== null && (e.damage.terminal.active || !e.damage.hull.valid)) && (Ta(e, t, Ea(e), e.world.environmentTime), a.inFlightBreakUp = !0, r.angularVelocity = 0, o.propellantMass = 0, e.damage || (o.vehicleMass = t.dryMass, fr(0, n.massProperties, t), o.vehicleMomentOfInertia = n.massProperties.momentOfInertia), s.running.fill(!1), s.ignitionCountdown.fill(null), o.rcsRunTimeRemaining = 0, i.rcsThrust = 0);
}
function Rs(e) {
	e.vehicle.propellantMass <= 0 && (e.failures.fuelRunOut = !0);
}
function zs(e, t, n) {
	let { forces: r } = e;
	r.perceivedG_Y = n / fe, r.perceivedG_X = t / fe, r.perceivedG = Math.sqrt(r.perceivedG_Y ** 2 + r.perceivedG_X ** 2);
}
function Bs(e, t, n, r) {
	let { massProperties: i, gridFinForces: a } = r, o = dt(e.kinematics.speedX, e.kinematics.speedY, j(e.world, e.kinematics.altitude), e.world.gustVertical);
	e.world.updatedFrameCount += 1;
	let s = dn(e.kinematics.altitude);
	if (e.atmosphere.airTemperature = s.airTemperature, e.atmosphere.airPressure = s.airPressure, e.atmosphere.airDensity = s.airDensity, Fs(e, n), e.damage?.terminal.active) {
		wa(e), r.bodyAccelerationX = r.bodyAccelerationY = r.burnedFraction = r.gimballedThrust = 0;
		return;
	}
	Rs(e);
	let c = Xo(e, t, n);
	ns(e), e.vehicle.propellantMass <= 0 && e.engines.ignitionCountdown.fill(null), es(e, t);
	let l = yt(e.vehicle.frontFinExtension, e.vehicle.aftFinExtension, n);
	e.forces.frontFinEffectiveAreaFraction = l.frontFinEffectiveAreaFraction, e.forces.aftFinEffectiveAreaFraction = l.aftFinEffectiveAreaFraction, e.vehicle.vehicleInFlightMaxArea = l.vehicleInFlightMaxArea, e.forces.crossSectionalArea = it(e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea, n), e.kinematics.angleOfMotion = ut(e.kinematics.speedX, e.kinematics.speedY);
	let u = ft(e.kinematics.speedX, e.kinematics.speedY, j(e.world, e.kinematics.altitude), e.world.gustVertical), d = pt(e.kinematics.pitch, u);
	e.kinematics.angleOfAttack = d.angleOfAttack, e.kinematics.angleInToTheWind = d.angleInToTheWind, e.vehicle.gimbalPointingDirection = Jo(e.kinematics.pitch, e.vehicle.gimbalPosition), e.forces.thermalPower = _a(o, e.atmosphere.airDensity, n.diameter / 2, e.kinematics.angleInToTheWind), e.forces.surfaceTemperature = va(e.forces.thermalPower, ba(e.kinematics.altitude, e.atmosphere.airTemperature)), e.forces.dynamicPressure = rt(e.atmosphere.airDensity, o), e.damage && (ja(e, n, e.forces.dynamicPressure * 1e3, Math.abs(Math.sin(e.kinematics.angleInToTheWind))), e.forces.crossSectionalArea = it(e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea, n)), Ns(e, t), e.forces.aerodynamicDrag = D(e.atmosphere.airDensity, o, e.forces.crossSectionalArea, st(e.kinematics.machSpeed)), e.forces.aerodynamicLift = ot(e.atmosphere.airDensity, o, e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea), e.forces.thrust = Wo(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, n) * c, e.forces.aerodynamicDragAcceleration = ct(e.forces.aerodynamicDrag, e.vehicle.vehicleMass), e.forces.aerodynamicLiftAcceleration = ct(e.forces.aerodynamicLift, e.vehicle.vehicleMass), e.forces.thrustAcceleration = ct(e.forces.thrust, e.vehicle.vehicleMass), e.forces.twr = e.forces.thrustAcceleration / S;
	let f = Go(e.engines.running, e.atmosphere.airPressure, n), p = e.forces.thrust * f;
	e.damage && (e.forces.paidThrustAccelerationX = e.forces.thrustAcceleration * (f * Math.sin(e.vehicle.gimbalPointingDirection) + (1 - f) * Math.sin(e.kinematics.pitch)), e.forces.paidThrustAccelerationY = e.forces.thrustAcceleration * (f * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - f) * Math.cos(e.kinematics.pitch)));
	let m = e.forces.thrust - p, h = {
		angleOfMotion: u,
		angleOfAttack: e.kinematics.angleOfAttack,
		gimbalPointingDirection: e.vehicle.gimbalPointingDirection,
		aerodynamicDragAcceleration: e.forces.aerodynamicDragAcceleration,
		aerodynamicLiftAcceleration: e.forces.aerodynamicLiftAcceleration,
		thrustAcceleration: ct(p, e.vehicle.vehicleMass),
		fixedThrustAcceleration: ct(m, e.vehicle.vehicleMass),
		pitch: e.kinematics.pitch
	};
	n.gridFins && (Oa(e, n, i), Ma(e, e.atmosphere.airDensity, e.kinematics.speedX - j(e.world, e.kinematics.altitude), e.kinematics.speedY - e.world.gustVertical, e.kinematics.pitch, i, n, a));
	let g = n.gridFins ? wn(h) + a.forceX / e.vehicle.vehicleMass : wn(h), _ = n.gridFins ? Tn(h, S) + S + a.forceY / e.vehicle.vehicleMass : Tn(h, S) + S;
	r.bodyAccelerationX = g, r.bodyAccelerationY = _, r.burnedFraction = c, r.gimballedThrust = p;
}
function Vs(e, t, n, r, i, a) {
	Is(e, r, i, a);
	let o = e.kinematics.distanceToPlanetCenter, s = e.kinematics.speedX, c = e.kinematics.speedY, l = n + Nn(o, s, c), u = r + A(o, s), d = (e.status.onTheGround || e.status.landed || e.failures.crashed) && u <= 0;
	d && (l = 0, u = 0), zs(e, d ? -Nn(o, s, c) : n, d ? -A(o, s) : r);
	let f = .5 * t * t;
	e.kinematics.altitude += c * t + u * f, e.kinematics.downRangeDistanceNextFrame = e.kinematics.downRangeDistance + s * t + l * f, e.kinematics.downRangeDistanceNextFrame > v ? e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame - v : e.kinematics.downRangeDistanceNextFrame < 0 ? e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame + v : e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame, Ps(e);
	let p = e.kinematics.distanceToPlanetCenter, m = s + l * t, h = c + u * t, g = d ? 0 : n + Nn(p, m, h), _ = d ? 0 : r + A(p, m);
	return e.kinematics.speedX = s + .5 * (l + g) * t, e.kinematics.speedY = c + .5 * (u + _) * t, e.kinematics.accelerationX = g, e.kinematics.accelerationY = _, e.kinematics.totalAcceleration = Math.sqrt(g ** 2 + _ ** 2), e.kinematics.trueSpeed = Math.sqrt(e.kinematics.speedX ** 2 + e.kinematics.speedY ** 2), d;
}
function Hs(e, t, n) {
	let r = dt(e.kinematics.speedX, e.kinematics.speedY, j(e.world, e.kinematics.altitude), e.world.gustVertical);
	e.kinematics.machSpeed = r / mn(e.atmosphere.airTemperature), ar(e.world, e.rng, e.kinematics.altitude, e.kinematics.speedX, e.kinematics.speedY, t), n.airspeed = r;
}
function Us(e, t, n, r) {
	let i = .5 * t * t;
	e.kinematics.pitch > Math.PI ? e.kinematics.pitch = f(e.kinematics.pitch - 2 * Math.PI) : e.kinematics.pitch < -Math.PI && (e.kinematics.pitch = f(e.kinematics.pitch + 2 * Math.PI));
	let a = e.kinematics.angularVelocity, o = n ? 0 : e.kinematics.angularAcceleration;
	e.kinematics.pitch = f(e.kinematics.pitch + a * t + o * i), e.kinematics.angularVelocity = a + o * t, r.omega0 = a, r.alpha0 = o;
}
function Ws(e, t, n) {
	let { massProperties: r, gridFinForces: i, gimballedThrust: a, burnedFraction: o, airspeed: s } = n;
	e.forces.thrustVectorForce = Ko(a, e.vehicle.gimbalPosition), e.forces.frontFinDrag = _t(e.atmosphere.airDensity, s, e.kinematics.angleOfAttack, e.kinematics.angleInToTheWind, e.forces.frontFinEffectiveAreaFraction, t), e.forces.aftFinDrag = vt(e.atmosphere.airDensity, s, e.kinematics.angleOfAttack, e.kinematics.angleInToTheWind, e.forces.aftFinEffectiveAreaFraction, t);
	let c = e.vehicle.vehicleMomentOfInertia;
	if (e.forces.thrustVectorAcceleration = lt(e.forces.thrustVectorForce, r.engineArm, c), e.forces.angularDragAcceleration = gt(e.atmosphere.airDensity, e.kinematics.angularVelocity, c, r.rCubedIntegral, t), e.forces.frontFinDragAngularAcceleration = lt(e.forces.frontFinDrag, r.frontFinArm, c), e.forces.aftFinDragAngularAcceleration = lt(e.forces.aftFinDrag, r.aftFinArm, c), e.forces.rcsThrustAngularAcceleration = lt(e.forces.rcsThrust, r.rcsArm, c), e.forces.offAxisThrustDifferenceAcceleration = lt(qo(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, t), r.engineArm, c), t.gridFins && (Ma(e, e.atmosphere.airDensity, e.kinematics.speedX - j(e.world, e.kinematics.altitude), e.kinematics.speedY - e.world.gustVertical, e.kinematics.pitch, r, t, i), e.forces.frontFinDrag = i.lift, e.forces.frontFinDragAngularAcceleration = i.torque / c, e.forces.offAxisThrustDifferenceAcceleration = rs(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, f(e.vehicle.gimbalPosition * .01 * de), t) * o / c), e.damage) {
		let n = e.vehicle.gimbalPosition * .01 * de, i = a * Math.cos(n) + e.forces.thrust - a;
		e.forces.offAxisThrustDifferenceAcceleration = (rs(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, f(n), t) * o + r.centreOfMassX * i) / c;
	}
	return e.forces.thrustVectorAcceleration + e.forces.angularDragAcceleration + e.forces.frontFinDragAngularAcceleration + e.forces.aftFinDragAngularAcceleration + e.forces.rcsThrustAngularAcceleration + e.forces.offAxisThrustDifferenceAcceleration;
}
function Gs(e, t, n, r, i, a) {
	e.kinematics.angularVelocity = n ? 0 : r + .5 * (i + a) * t, e.kinematics.angularAcceleration = n ? 0 : a;
}
function Ks(e, t, n, r, i) {
	Oa(e, n, r.massProperties), e.vehicle.vehicleMomentOfInertia = r.massProperties.momentOfInertia, Us(e, t, i, r);
	let a = Ws(e, n, r);
	Gs(e, t, i, r.omega0, r.alpha0, a);
}
//#endregion
//#region src/core/control/primitives.ts
var qs = pr(), W = F(), Js = ia(12), Ys = mr();
function Xs(e, t) {
	let n = e - t;
	return n < -Math.PI ? n = Math.PI * 2 + n : n > Math.PI && (n = -(Math.PI * 2 - n)), n;
}
function Zs(e, t, n, r = t, i = E) {
	let a = H(e, n, i), o = Go(e, n, i);
	return o === 1 ? a * Math.cos(t) : a * o * Math.cos(t) + a * (1 - o) * Math.cos(r);
}
function Qs(e) {
	return Math.sqrt(35 / e * 2e3);
}
function G(e, t, n, r = E) {
	let { kinematics: i, forces: a, status: o, vehicle: s, autopilot: c } = e, l = Xs(i.pitch, t);
	e.damage ? I(e, r, W, qs) : fr(s.propellantMass, qs, r);
	let u = !e.damage || W.engineSupportAvailable, d = (-l / n ** 2 - 2 * i.angularVelocity / n - (u ? a.offAxisThrustDifferenceAcceleration : 0)) * (e.damage ? W.momentOfInertia : s.vehicleMomentOfInertia), p = 0, m = () => {
		if (Math.abs(l) > .1) {
			let e = d / qs.rcsArm;
			e > 0 ? e > 8e5 ? p = 100 : c.rcsThrustCommand = e : e < 0 ? e < -8e5 ? p = -100 : c.rcsThrustCommand = e : p = 0, c.pitchControl = p;
		}
	}, h = u ? a.thrust * Go(e.engines.running, e.atmosphere.airPressure, r) : 0;
	h > 0 ? (() => {
		let e = d / qs.engineArm / h;
		e >= 1 ? p = 100 : e <= -1 ? p = -100 : (p = Math.asin(e) * 100 / de, p >= 100 ? p = 100 : p <= -100 && (p = -100)), o.rcsActive && (p *= .98), c.pitchControl = p;
	})() : o.finActive ? (() => {
		let t = dt(i.speedX, i.speedY, j(e.world, i.altitude), e.world.gustVertical);
		if (e.damage) {
			let n = 0, a = 0, s = .5 * e.atmosphere.airDensity * t ** 2;
			if (r.gridFins) for (let t = -1; t <= 1; t += 2) Ma(e, e.atmosphere.airDensity, i.speedX - j(e.world, i.altitude), i.speedY - e.world.gustVertical, i.pitch, qs, r, Ys, f(t * r.gridFins.maxAngle)), Ys.torque * d > 0 && Math.abs(Ys.torque) > Math.abs(n) && (n = Ys.torque, a = t * 100);
			else {
				let t = Math.abs(Math.sin(i.angleInToTheWind)), o = i.angleOfAttack < 0 ? -1 : 1;
				for (let i = 0; i < 2; i++) {
					let c = i === 0;
					oa(e.damage, P(r).controls, s, t, c ? _e : 0, c ? 0 : _e, Js);
					let l = s * 2 * t * o * (Js.frontArea * qs.frontFinArm - Js.aftArea * qs.aftFinArm);
					l * d > 0 && Math.abs(l) > Math.abs(n) && (n = l, a = (c ? o : -o) * 100);
				}
			}
			p = n === 0 ? 0 : a * Math.min(1, Math.abs(d / n)), o.rcsActive && (p *= .99, m()), c.pitchControl = p;
			return;
		}
		if (d > 0) {
			let n = D(e.atmosphere.airDensity, t, r.frontFinArea, 2) * Math.sin(_e) * qs.frontFinArm + D(e.atmosphere.airDensity, t, r.aftFinArea, 2) * qs.aftFinArm;
			p = d / n * 100, p >= 100 && (p = 100);
		} else if (d < 0) {
			let n = D(e.atmosphere.airDensity, t, r.aftFinArea, 2) * Math.sin(_e) * qs.aftFinArm + D(e.atmosphere.airDensity, t, r.frontFinArea, 2) * qs.frontFinArm;
			p = d / n * 100, p <= -100 && (p = -100);
		} else p = 0;
		o.rcsActive && (p *= .99, m()), c.pitchControl = p;
	})() : m();
}
function $s(e, t, n = E) {
	ec(e, t * Ia(e), n);
}
function ec(e, t, n = E) {
	let { vehicle: r, engines: i } = e;
	e.damage && I(e, n, W);
	let a = !e.damage || W.engineSupportAvailable, o = t * (e.damage ? W.totalMass : r.vehicleMass) / (a ? H(i.running, e.atmosphere.airPressure, n) : 0) * 100;
	Number.isNaN(o) && (o = 40), o > 100 ? o = 100 : o < 40 && (o = 40), r.throttle = o;
}
function tc(e, t, n = E) {
	let { vehicle: r, engines: i } = e;
	e.damage && I(e, n, W);
	let a = !e.damage || W.engineSupportAvailable, o = t * (e.damage ? W.totalMass : r.vehicleMass) * Ia(e) / (a ? Zs(i.running, r.gimbalPointingDirection, e.atmosphere.airPressure, e.kinematics.pitch, n) : 0) * 100;
	Number.isNaN(o) && (o = 40), o > 100 ? o = 100 : o < 40 && (o = 40), r.throttle = o;
}
function nc(e, t, n, r, i) {
	let a = e.kinematics.speedX - t;
	a < 0 ? (G(e, n, i), -a < r && G(e, f(n * -a / r), i)) : (G(e, f(-n), i), a < r && G(e, f(-n * a / r), i));
}
function rc(e, t, n, r) {
	let i = e.kinematics.speedY - t;
	i < 0 ? (tc(e, r), -i < n && tc(e, 1 - i / n)) : (tc(e, 0), i < n && tc(e, 1 - i / n));
}
function ic(e, t, n, r, i = E) {
	let a = t - e.kinematics.trueSpeed;
	a < 0 ? $s(e, 0, i) : ($s(e, r, i), a < n && $s(e, 1 + a / n, i));
}
function ac(e, t, n) {
	return e / (t * n);
}
function oc(e, t, n, r) {
	let { status: i, kinematics: a, autopilot: o } = e;
	i.finActive || r(e), o.horizontalAccelerationByAeroBreakingCorrectionAngle = Math.abs(a.accelerationX) > Math.abs(t) ? f(o.horizontalAccelerationByAeroBreakingCorrectionAngle - Be * n) : f(o.horizontalAccelerationByAeroBreakingCorrectionAngle + Be * n), o.horizontalAccelerationByAeroBreakingCorrectionAngle > ze ? o.horizontalAccelerationByAeroBreakingCorrectionAngle = ze : o.horizontalAccelerationByAeroBreakingCorrectionAngle < 0 && (o.horizontalAccelerationByAeroBreakingCorrectionAngle = f(0)), t < 0 ? G(e, f(o.horizontalAccelerationByAeroBreakingCorrectionAngle - Math.PI / 2), 1.5) : G(e, f(-o.horizontalAccelerationByAeroBreakingCorrectionAngle + Math.PI / 2), 1.5);
}
function sc(e, t, n = E) {
	let { engines: r } = e;
	if (I(e, n, W), !W.engineSupportAvailable || !W.hasMass) return;
	let i = r.running;
	if (ac(Uo(i, e.atmosphere.airPressure, n), W.totalMass, Ia(e)) > 1) {
		let r = Vo(i, n);
		if (r === 0) return;
		let a = r === 3 ? 0 : r === 2 ? i[0] && i[1] ? 0 : i[1] && i[2] ? 1 : 2 : i[0] ? 0 : i[1] ? 1 : 2;
		if (i[a] && n.engines[a]?.kind === "sea-level") t(e, a);
		else for (let r = 0; r < n.engines.length; r++) if (i[r] && n.engines[r].kind === "sea-level") {
			t(e, r);
			break;
		}
	}
}
//#endregion
//#region src/core/physics/tower-catch.ts
function cc() {
	return {
		x: 0,
		altitude: 0,
		speedX: 0,
		speedY: 0
	};
}
function lc(e, t, n) {
	let r = e.kinematics, i = k.lugStation - t.height / 2;
	n.x = r.downRangeDistance + i * Math.sin(r.pitch), n.altitude = r.altitude + i * Math.cos(r.pitch), n.speedX = r.speedX + i * Math.cos(r.pitch) * r.angularVelocity, n.speedY = r.speedY - i * Math.sin(r.pitch) * r.angularVelocity;
}
var uc = cc(), dc = cc(), K = {
	fraction: 0,
	pitch: 0,
	x: 0,
	speedX: 0,
	speedY: 0
};
function fc(e, t, n) {
	if (n.id !== "super-heavy" || t.status.landed) return !1;
	let r = t.failures;
	if (r.crashed || r.inFlightBreakUp || r.fuelRunOut) return !1;
	let i = t.kinematics, a = n.height * Math.abs(Math.cos(i.pitch)) / 2 + n.diameter * Math.abs(Math.sin(i.pitch)) / 2;
	if (i.altitude <= a || (lc(e, n, uc), lc(t, n, dc), !(uc.altitude > k.planeAltitude && dc.altitude <= k.planeAltitude))) return !1;
	let o = (uc.altitude - k.planeAltitude) / (uc.altitude - dc.altitude), s = e.kinematics, c = Math.atan2(Math.sin(i.pitch - s.pitch), Math.cos(i.pitch - s.pitch));
	return K.fraction = o, K.pitch = s.pitch + c * o, K.x = s.downRangeDistance + (i.downRangeDistance - s.downRangeDistance) * o + (k.lugStation - n.height / 2) * Math.sin(K.pitch), K.speedX = uc.speedX + (dc.speedX - uc.speedX) * o, K.speedY = uc.speedY + (dc.speedY - uc.speedY) * o, Number.isFinite(K.x) && Number.isFinite(K.pitch) && Number.isFinite(K.speedX) && Number.isFinite(K.speedY) && Math.abs(K.x - C) <= k.halfWidth && Math.abs(K.speedX) <= k.maxLateralSpeed && K.speedY < 0 && K.speedY >= -k.maxDownSpeed && Math.abs(K.pitch) <= k.maxPitch;
}
function pc(e, t, n) {
	if (!fc(e, t, n)) return !1;
	let r = t.kinematics, i = e.kinematics;
	return r.downRangeDistance = i.downRangeDistance + (r.downRangeDistance - i.downRangeDistance) * K.fraction, r.downRangeDistanceNextFrame = r.downRangeDistance, r.pitch = f(K.pitch), r.altitude = k.planeAltitude - (k.lugStation - n.height / 2) * Math.cos(r.pitch), r.distanceToPlanetCenter = _ + r.altitude, r.speedX = r.speedY = r.trueSpeed = r.angularVelocity = 0, r.accelerationX = r.accelerationY = r.totalAcceleration = r.angularAcceleration = 0, t.status.landed = !0, t.status.onTheGround = !1, t.engines.running.fill(!1), t.engines.ignitionCountdown.fill(null), t.forces.thrust = t.forces.thrustAcceleration = t.forces.twr = t.forces.rcsThrust = 0, t.autopilot.pitchControl = t.autopilot.rcsThrustCommand = 0, !0;
}
//#endregion
//#region src/core/control/booster-arrival.ts
var q = F(), mc = .3;
function hc() {
	return {
		pitch: f(0),
		throttle: 100,
		requiredX: 0,
		requiredY: 0,
		deliveredX: 0,
		deliveredY: 0
	};
}
function gc(e, t, n, r, i) {
	I(e, r, q);
	let a = e.kinematics, o = q.totalMass;
	if (!q.hasMass) {
		i.pitch = f(0), i.throttle = 100, i.requiredX = i.requiredY = i.deliveredX = i.deliveredY = 0;
		return;
	}
	let s = Go(e.engines.running, e.atmosphere.airPressure, r), c = e.forces.thrust / o, l = e.damage ? e.forces.paidThrustAccelerationX : c * (s * Math.sin(e.vehicle.gimbalPointingDirection) + (1 - s) * Math.sin(a.pitch)), u = e.damage ? e.forces.paidThrustAccelerationY : c * (s * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - s) * Math.cos(a.pitch));
	i.requiredX = t - (a.accelerationX - l), i.requiredY = n - (a.accelerationY - u), i.pitch = f(Math.max(-.3, Math.min(mc, Math.atan2(i.requiredX, Math.max(0, i.requiredY)))));
	let d = Math.max(0, i.requiredY) / Math.cos(i.pitch), p = q.engineSupportAvailable ? H(e.engines.running, e.atmosphere.airPressure, r) / o : 0;
	i.throttle = p > 0 ? Math.max(40, Math.min(100, 100 * d / p)) : 100, i.deliveredX = p * i.throttle * .01 * Math.sin(i.pitch), i.deliveredY = p * i.throttle * .01 * Math.cos(i.pitch);
}
var _c = Ra(), J = hc();
function vc(e, t, n, r, i, a) {
	return so(e, f(a), r, _c), J.requiredX = t - _c.acc.x, J.requiredY = n - _c.acc.y, J.pitch = f(a), J.throttle = i > 0 ? Math.max(40, Math.min(100, 100 * Math.max(0, J.requiredY) / (i * Math.cos(a)))) : 100, J.deliveredX = i * J.throttle * .01 * Math.sin(a), J.deliveredY = i * J.throttle * .01 * Math.cos(a), J.deliveredX - J.requiredX;
}
function yc(e, t) {
	let n = (J.deliveredX - J.requiredX) ** 2 + (J.deliveredY - J.requiredY) ** 2;
	return n >= t ? t : (Object.assign(e, J), n);
}
function bc(e, t, n, r, i, a = mc) {
	I(e, r, q);
	let o = q.engineSupportAvailable && q.hasMass ? H(e.engines.running, e.atmosphere.airPressure, r) / q.totalMass : 0, s = Math.max(0, Math.min(mc, a)), c = -s, l = vc(e, t, n, r, o, c), u = yc(i, Infinity);
	for (let a = 1; a <= 16; a++) {
		let d = -s + 2 * s * a / 16, f = vc(e, t, n, r, o, d);
		if (u = yc(i, u), l * f < 0) {
			let a = c, s = d, f = l;
			for (let c = 0; c < 12; c++) {
				let c = (a + s) / 2, l = vc(e, t, n, r, o, c);
				u = yc(i, u), f * l <= 0 ? s = c : (a = c, f = l);
			}
		}
		c = d, l = f;
	}
}
function xc(e, t, n) {
	if (I(e, n, q), !q.engineSupportAvailable || !q.hasMass) return 100;
	let r = Go(e.engines.running, e.atmosphere.airPressure, n), i = r * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - r) * Math.cos(e.kinematics.pitch), a = e.damage ? e.forces.paidThrustAccelerationY : e.forces.thrust / q.totalMass * i, o = e.kinematics.accelerationY - a;
	I(e, n, q);
	let s = q.engineSupportAvailable && q.hasMass ? H(e.engines.running, e.atmosphere.airPressure, n) / q.totalMass : 0;
	return s <= 0 || i <= 0 ? 100 : Math.max(40, Math.min(100, 100 * Math.max(0, t - o) / (s * i)));
}
function Sc() {
	return {
		x: 0,
		height: 0,
		vx: 0,
		vy: 0,
		time: 0,
		ax: 0,
		ay: 0,
		bodyAX: 0,
		bodyAY: 0,
		centreAX: 0,
		centreAY: 0,
		lateralFeasible: !0
	};
}
var Cc = cc(), wc = Object.freeze([
	!0,
	!0,
	!0
]), Tc = hc();
function Ec(e, t, n, r) {
	I(e, n, q);
	let i = q.engineSupportAvailable && q.hasMass && wc.every((t, n) => !e.engines.failed[n]), a = q.totalMass;
	lc(e, n, Cc), r.x = Cc.x - C, r.height = Cc.altitude - k.planeAltitude, r.vx = Cc.speedX, r.vy = Cc.speedY;
	let o = e.autopilot;
	if (o.boosterArrivalTime === void 0) {
		let e = Math.max(0, r.height), t = Math.max(0, -r.vy), s = 2 * e / (t + 2), c = (i ? H(wc, me / 1e3, n) / a : 0) + A(_ + k.bodyCentreAltitude, 0), l = c > 0 ? 6 * e / (Math.sqrt((t + 4) ** 2 + 6 * c * e) + t + 4) : 60;
		o.boosterArrivalTime = Math.max(.5, Math.min(60, Math.max(s, l)));
	}
	o.boosterArrivalTime = Math.max(0, o.boosterArrivalTime - t), r.time = Math.max(.25, o.boosterArrivalTime), r.ax = -6 * r.x / r.time ** 2 - 4 * r.vx / r.time, r.ay = -6 * r.height / r.time ** 2 - 4 * r.vy / r.time + 4 / r.time;
	let s = e.kinematics, c = k.lugStation - n.height / 2;
	r.bodyAX = r.ax - c * (Math.cos(s.pitch) * s.angularAcceleration - Math.sin(s.pitch) * s.angularVelocity ** 2), r.bodyAY = r.ay + c * (Math.sin(s.pitch) * s.angularAcceleration + Math.cos(s.pitch) * s.angularVelocity ** 2), r.centreAX = -6 * (s.downRangeDistance - C) / r.time ** 2 - 4 * s.speedX / r.time, r.centreAY = -6 * (s.altitude - k.bodyCentreAltitude) / r.time ** 2 - 4 * s.speedY / r.time + 4 / r.time;
	let l = i ? H(wc, e.atmosphere.airPressure, n) / a * Math.sin(mc) : 0;
	gc(e, r.ax, r.ay, n, Tc);
	let u = Tc.requiredX;
	gc(e, 6 * r.x / r.time ** 2 + 2 * r.vx / r.time, 6 * r.height / r.time ** 2 + 2 * r.vy / r.time - 8 / r.time, n, Tc), r.lateralFeasible = i && Number.isFinite(u) && Number.isFinite(Tc.requiredX) && Math.abs(u) <= l && Math.abs(Tc.requiredX) <= l;
}
//#endregion
//#region src/core/control/booster-forecast.ts
function Dc() {
	return {
		reached: !1,
		rangeError: 0,
		time: 0,
		fuel: 0,
		speedX: 0,
		speedY: 0,
		pitch: 0,
		steps: 0,
		ignitionDraws: 0,
		failed: !1
	};
}
var Oc = cc(), kc = cc(), Ac = Sc();
function Y(e) {
	let t = e * 120, n = Math.round(t);
	return e === n / 120 ? n : Math.ceil(t);
}
function jc(e) {
	return Y(e) / 120;
}
function Mc(e, t) {
	return Math.max(0, Y(e) - t.boostSteps - 6 * t.steadySteps) / 120;
}
function Nc(e, t, n = 0) {
	let r = V(e);
	if (delete r.autopilot.boosterPrediction, delete r.autopilot.boosterForecastHandoff, r.autopilot.boosterPhase === "align-boost" || r.autopilot.boosterPhase === "boostback" && n <= 0 || !r.autopilot.boosterPhase) {
		r.autopilot.boosterPhase = "coast";
		for (let e = 0; e < r.engines.running.length; e++) ts(r, e);
	}
	return r.autopilot.boosterCoastPitch = t, {
		state: r,
		initialTime: r.autopilot.boosterFallTime ?? 900,
		initialDraws: r.rng.counters.ignitionFailure,
		burnRemaining: jc(n),
		burnTicks: Y(n),
		cutoffClock: r.world.environmentTime,
		done: !1,
		result: Dc()
	};
}
function Pc(e, t, n, r, i, a) {
	let o = e.result, s = e.state, c = 0, l = e.reusePrefix, u = e.burnRemaining;
	l && (u = Mc(u, l)), l && l.origin === e.origin && l.advance === n && l.policy === r && l.model === i && e.step === void 0 && e.initialTime === l.initialTime && s.autopilot.boosterCoastPitch === l.coastPitch && u > 0 && o.steps === 0 && (s = V(l.state), s.autopilot.boosterForecastBurn = !0, o.time = l.time, o.steps = l.steps, e.prefix = l, e.burnRemaining = u, e.burnTicks = Math.round(u * 120), e.cutoffClock = l.cutoffClock, e.boostSteps = l.boostSteps, e.steadySteps = l.steadySteps), delete e.reusePrefix;
	for (let l = 0; l < t && !e.done; l++) {
		lc(s, i, Oc);
		let t = s.autopilot.boosterPhase, l = t === "align-boost" || t === "boostback" || t === "entry" || t === "terminal", u = t === "boostback" && !xt.every((e) => s.engines.running[e]), d = u || t === "entry" && !(s.autopilot.boosterEntryCentreOnly ? O : xt).every((e) => s.engines.running[e]) || t === "terminal" && !O.every((e) => s.engines.running[e]), f = t === "align-boost" || d || t === "terminal" && s.autopilot.boosterArrivalTime === void 0 ? 1 / 120 : e.step ?? (e.stopAtHandoff && l || s.kinematics.altitude < 2e3 ? .05 : .25), p = t === "boostback" || !e.stopAtHandoff && e.burnRemaining > 0, m = p && e.burnTicks > 0 ? e.burnTicks < 6 ? 1 / 120 : Math.min(f, .05) : f;
		e.burnRemaining > 0 && (s.autopilot.boosterForecastBurn = !0), s.autopilot.boosterFallTime = Math.max(2, e.initialTime - o.time);
		let h = a?.eligible(s, m), g = h ? V(s) : void 0, _;
		if (s = n(s, m, h ? (e, t, n) => {
			_ = V(e), r(e, t, n);
		} : r, i), o.steps++, c++, g && a.paid(g, _, s, m), u && (e.boostSteps = (e.boostSteps ?? 0) + 1), t === "boostback" && !u && m === .05 && (e.steadySteps = (e.steadySteps ?? 0) + 1), t === "align-boost" || p) for (let t = 0; t < Math.round(m * 120); t++) e.cutoffClock += 1 / 120;
		if (p && e.burnTicks > 0 && (e.burnTicks = Math.max(0, e.burnTicks - Math.round(m * 120)), e.burnRemaining = e.burnTicks / 120), e.readyHandoff && e.step === void 0 && e.origin && (t === "align-boost" && s.autopilot.boosterPhase === "boostback" || u && e.burnRemaining > 0 && xt.every((e) => s.engines.running[e]) || t === "boostback" && !u && m === .05)) {
			e.prefix = {
				origin: e.origin,
				state: V(s),
				time: o.time + m,
				steps: o.steps,
				advance: n,
				policy: r,
				model: i,
				coastPitch: s.autopilot.boosterCoastPitch,
				initialTime: e.initialTime,
				boostSteps: e.boostSteps ?? 0,
				steadySteps: e.steadySteps ?? 0,
				cutoffClock: e.cutoffClock
			}, u && (e.startupPrefix = e.prefix);
			let t = e.prefix.steadySteps;
			t > 0 && (e.rollingPrefixes = Rc(e.rollingPrefixes, [e.prefix])), t > 0 && !(t & t - 1) && !(e.checkpoints ?? []).some((e) => e.steadySteps === t) && (e.checkpoints = [...e.checkpoints ?? [], e.prefix]);
		}
		if ((p || e.stopAtHandoff && s.autopilot.boosterPhase === "boostback") && e.burnRemaining === 0) {
			delete s.autopilot.boosterForecastBurn, s.autopilot.boosterPhase = "coast";
			for (let e = 0; e < s.engines.running.length; e++) ts(s, e);
			e.shutdownAt = e.cutoffClock, e.stopAtCutoff && (e.done = !0);
		}
		lc(s, i, kc);
		let v = Oc.altitude > k.planeAltitude && kc.altitude <= k.planeAltitude;
		if (o.time += m, e.stopAtHandoff && s.autopilot.boosterPhase === "terminal" && (!e.readyHandoff || t === "terminal" && O.every((e) => s.engines.running[e]))) {
			let t = s.autopilot.boosterArrivalTime;
			Ec(s, 0, i, Ac), t === void 0 ? delete s.autopilot.boosterArrivalTime : s.autopilot.boosterArrivalTime = t, o.handoff = {
				x: Ac.x,
				height: Ac.height,
				vx: Ac.vx,
				vy: Ac.vy,
				time: Ac.time,
				lateralFeasible: Ac.lateralFeasible
			}, o.rangeError = s.kinematics.downRangeDistance - C + s.kinematics.speedX * Ac.time / 3, o.speedX = Ac.vx, o.speedY = Ac.vy, o.reached = !0, e.done = !0;
		} else if (v) {
			let t = (Oc.altitude - k.planeAltitude) / (Oc.altitude - kc.altitude);
			o.rangeError = Oc.x + (kc.x - Oc.x) * t - C, o.time -= m * (1 - t), o.speedX = Oc.speedX + (kc.speedX - Oc.speedX) * t, o.speedY = Oc.speedY + (kc.speedY - Oc.speedY) * t, o.reached = !0, e.done = !0;
		}
		(s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp || o.time >= 900 || o.steps >= 4e3) && (e.done = !0);
	}
	return o.reached || (o.rangeError = kc.x - C, o.speedX = kc.speedX, o.speedY = kc.speedY), o.fuel = s.vehicle.propellantMass, o.pitch = s.kinematics.pitch, o.ignitionDraws = s.rng.counters.ignitionFailure - e.initialDraws, o.failed = s.failures.crashed || s.failures.inFlightBreakUp || s.failures.fuelRunOut, e.state = s, c;
}
function Fc(e, t, n, r) {
	let i = Nc(e, t, n);
	if (i.state = V(e), delete i.state.autopilot.boosterPrediction, i.state.autopilot.boosterPhase || (i.state.autopilot.boosterPhase = "align-boost"), i.state.autopilot.boosterPhase === "boostback" && n <= 0) {
		i.state.autopilot.boosterPhase = "coast";
		for (let e = 0; e < i.state.engines.running.length; e++) ts(i.state, e);
		i.shutdownAt = e.world.environmentTime;
	}
	return delete i.state.autopilot.boosterReturnPlan, i.state.autopilot.boosterCoastPitch = t, i.stopAtHandoff = !0, r !== void 0 && (i.step = r), i;
}
function Ic(e, t, n, r, i) {
	let a = Fc(e, t, n, r);
	return a.readyHandoff = !0, a.origin = e, i && (a.reusePrefix = i), a;
}
function Lc(e, t, n, r) {
	let i = Ic(e, t, n, void 0, r);
	return i.stopAtCutoff = !0, i;
}
function Rc(e, t) {
	let n = [...e ?? []], r = n[0] ?? t[0];
	for (let e of t) !r || e.steadySteps <= 0 || e.origin !== r.origin || e.advance !== r.advance || e.policy !== r.policy || e.model !== r.model || e.coastPitch !== r.coastPitch || e.initialTime !== r.initialTime || e.boostSteps !== r.boostSteps || n.some((t) => t.steadySteps === e.steadySteps) || n.push(e);
	return n.sort((e, t) => e.steadySteps - t.steadySteps).slice(-8);
}
//#endregion
//#region src/core/control/booster-cutoff-hint.ts
function zc(e, t, n, r, i) {
	if (!e.forecast.reached || e.forecast.failed || e.forecast.fuel <= 0 || !e.forecast.handoff || t.origin !== n.origin || t.model !== n.model || t.origin.world.environmentTime !== e.originTime || t.origin.damage?.revision !== e.damageRevision || !Number.isFinite(t.range) || !Number.isFinite(n.range) || !(t.duration < e.burnDuration && n.duration > e.burnDuration)) return;
	let a = (n.range - t.range) / (n.duration - t.duration), o = e.burnDuration - e.forecast.rangeError / a;
	if (!Number.isFinite(a) || a === 0 || !Number.isFinite(o)) return;
	let s = jc(o);
	return s > r && s < i && s !== e.burnDuration ? s : void 0;
}
//#endregion
//#region src/core/control/booster-prediction.ts
var Bc = F(), Vc = Ra(), Hc = 512, Uc = Object.freeze(xt.map(() => !0));
function Wc(e, t, n) {
	let r = V(e);
	delete r.autopilot.boosterPrediction;
	let i = Math.floor(120 * r.vehicle.propellantMass / (xt.length * w(t.propulsion, "sea-level"))) / 120;
	I(r, t, Bc);
	let a = xt.some((e) => r.engines.failed[e]) ? Uc.map((e, t) => e && !r.engines.failed[t]) : Uc, o = Bc.engineSupportAvailable && Bc.hasMass ? H(a, r.atmosphere.airPressure, t) / Bc.totalMass : 0, s = Math.abs(r.autopilot.boosterRangeError ?? 0) / (o * (r.autopilot.boosterFallTime ?? 0)), c = jc(Number.isFinite(s) && s > 0 && s < i ? Math.max(i / 4, s) : i / 4), l = r.autopilot.boosterPhase === "align-boost" || r.autopilot.boosterPhase === "boostback", u = l ? c : 0;
	return {
		...e.autopilot.boosterSource ? { sourceLineage: e.autopilot.boosterSource.lineageId } : {},
		origin: r,
		rollout: Ic(r, f(0), u),
		stage: l ? "upper" : "low",
		duration: u,
		lowerDuration: 0,
		upperDuration: i,
		firstDuration: c,
		iterations: +!!l,
		attemptedTicks: l ? [Math.round(u * 120)] : [],
		published: n,
		done: !1
	};
}
function Gc(e) {
	return {
		...e.sourceLineage === void 0 ? {} : { sourceLineage: e.sourceLineage },
		...e.origin.damage ? { damageRevision: e.origin.damage.revision } : {},
		originTime: e.origin.world.environmentTime,
		burnDuration: e.duration,
		shutdownAt: e.rollout.shutdownAt ?? e.origin.world.environmentTime,
		coastPitch: f(0),
		forecast: { ...e.rollout.result }
	};
}
function Kc(e) {
	return e.forecast.reached && !e.forecast.failed && e.forecast.fuel > 0 && e.forecast.handoff !== void 0 && Number.isFinite(e.forecast.rangeError);
}
function qc(e, t, n) {
	if (e.iterations >= 16) {
		rl(e) || (e.done = !0);
		return;
	}
	let r = e.low?.burnDuration ?? e.lowerDuration, i = e.high?.burnDuration ?? e.upperDuration, a = Y(r) + 1, o = Y(i) - 1, s = Math.max(a, Math.min(o, Y(t))), c;
	for (let t = 0; t <= e.attemptedTicks.length && a <= o; t++) {
		for (let n of [s - t, s + t]) if (n >= a && n <= o && !e.attemptedTicks.includes(n)) {
			c = n;
			break;
		}
		if (c !== void 0) break;
	}
	if (c === void 0) {
		rl(e) || (e.done = !0);
		return;
	}
	let l = c / 120;
	e.attemptedTicks = [...e.attemptedTicks, c], e.duration = l, e.stage = n, e.iterations++;
	let u = Jc(e, l);
	e.rollout = Ic(e.origin, f(0), l, void 0, u);
}
function Jc(e, t) {
	return [
		e.prefix,
		e.startupPrefix,
		...e.checkpoints ?? [],
		...e.rollingPrefixes ?? []
	].filter((e) => !!e && Mc(t, e) > 0).sort((e, t) => t.steps - e.steps)[0];
}
function Yc(e) {
	e.rollingPrefixes = Rc(e.rollingPrefixes, e.rollout.rollingPrefixes ?? []), e.rollout.startupPrefix && (e.startupPrefix = e.rollout.startupPrefix), e.rollout.prefix && (!e.prefix || e.rollout.prefix.steadySteps < e.prefix.steadySteps) && (e.prefix = e.rollout.prefix);
	for (let t of e.rollout.checkpoints ?? []) (e.checkpoints ?? []).some((e) => e.steadySteps === t.steadySteps) || (e.checkpoints = [...e.checkpoints ?? [], t]);
}
function Xc(e, t) {
	e.hintTicks = [...e.hintTicks ?? [], Y(t)], e.iterations++, e.duration = t, e.stage = "hint", e.rollout = Lc(e.origin, f(0), t, Jc(e, t));
}
function Zc(e, t) {
	if (!e.rollout.prefix || e.rollout.shutdownAt === void 0 || e.hintTried || e.iterations + 2 > 16 || e.origin.autopilot.boosterPhase === "coast") return !1;
	e.hintTried = !0;
	let n = [(Y(t.burnDuration) - 6) / 120, (Y(t.burnDuration) + 6) / 120];
	return !n.some((t) => t <= e.lowerDuration || t >= e.upperDuration || e.attemptedTicks.includes(Y(t)) || (e.hintTicks ?? []).includes(Y(t))) && (e.hintAnchor = t, e.hintScores = [], e.hintDurations = n, Xc(e, n[0]), !0);
}
function Qc(e, t, n) {
	let r = 0;
	Yc(e);
	let i = e.rollout.state;
	if (!e.hintFallWork && e.rollout.shutdownAt !== void 0 && i.vehicle.propellantMass > 0 && !e.rollout.result.failed && !i.damage?.terminal.active && (e.hintFallWork = uo(i, k.bodyCentreAltitude, t, f(0))), e.hintFallWork) {
		let a = fo(e.hintFallWork, n, Vc);
		if (r = a, e.hintForceIterations = (e.hintForceIterations ?? 0) + a, a > 0 && (e.hintForceSlices = (e.hintForceSlices ?? 0) + 1), !e.hintFallWork.done) return r;
		let o = e.hintFallWork.result;
		o.reached && Number.isFinite(o.downRange) && (e.hintScores = [...e.hintScores ?? [], {
			duration: e.duration,
			range: i.kinematics.downRangeDistance - C + o.downRange,
			origin: e.origin,
			model: t
		}]), delete e.hintFallWork;
	}
	if (e.duration === e.hintDurations[0]) return Xc(e, e.hintDurations[1]), r;
	let a = e.hintScores ?? [], o = a.length === 2 ? zc(e.hintAnchor, a[0], a[1], e.lowerDuration, e.upperDuration) : void 0;
	return o === void 0 ? al(e) : qc(e, o, "root"), r;
}
function $c(e) {
	e.stage = "validate", e.rollout = Nc(e.terminalOrigin, e.selected.coastPitch), e.rollout.step = 1 / 120;
}
function el(e, t, n = e.rollout.state) {
	e.validatedTicks = [...e.validatedTicks ?? [], Y(t.burnDuration)], e.selected = t, e.terminalOrigin = V(n), $c(e);
}
function tl(e) {
	let t = e.forecast.handoff, n = t.time, r = 6 * t.x / n ** 2 + 2 * t.vx / n, i = 6 * t.height / n ** 2 + 2 * t.vy / n - 8 / n - A(_ + k.bodyCentreAltitude, 0);
	return Math.atan2(r, Math.max(0, i));
}
function nl(e) {
	return e.forecast.handoff.lateralFeasible && Math.abs(tl(e)) <= k.maxPitch;
}
function rl(e) {
	let t = [{
		candidate: e.low,
		ready: e.lowReady
	}, {
		candidate: e.high,
		ready: e.highReady
	}].filter((e) => !!e.candidate && !!e.ready).sort((e, t) => Math.abs(e.candidate.forecast.rangeError) - Math.abs(t.candidate.forecast.rangeError));
	for (let n of t) if (nl(n.candidate) && !(e.validatedTicks ?? []).includes(Y(n.candidate.burnDuration))) return el(e, n.candidate, n.ready), !0;
	return !1;
}
function il(e) {
	return e.status.landed && !e.status.onTheGround && e.vehicle.propellantMass > 0 && !Object.entries(e.failures).some(([e, t]) => e !== "randomFailure" && t);
}
function al(e) {
	if (e.iterations >= 16) {
		rl(e) || (e.done = !0);
		return;
	}
	if (e.low && e.high) {
		let t = (e.previousCandidate && e.lastCandidate ? us(e.previousCandidate, e.lastCandidate, e.low, e.high) : void 0) ?? ss(e.low, e.high);
		t === void 0 ? e.done = !0 : qc(e, t, "root");
		return;
	}
	let t = e.low?.burnDuration ?? e.lowerDuration, n = e.high?.burnDuration ?? e.upperDuration, r = e.probeDuration ?? (e.low && !e.high && t === e.firstDuration ? Math.min((Y(t) + 1) / 120, n) : e.high && !e.low && n === e.firstDuration ? Math.max((Y(n) - 1) / 120, t) : (t + n) / 2);
	if (delete e.probeDuration, r <= t || r >= n) {
		let r = (t + n) / 2;
		r <= t || r >= n ? e.done = !0 : qc(e, r, "upper");
	} else qc(e, r, "upper");
}
function ol(e) {
	let t = Gc(e);
	Yc(e), e.lastCandidate ? e.previousCandidate = e.lastCandidate : delete e.previousCandidate, e.lastCandidate = t;
	let n = Math.sign(e.origin.autopilot.boosterRangeError ?? e.origin.kinematics.downRangeDistance - C) || 1;
	if (e.stage === "low") {
		if (Kc(t) && (e.low = t, e.lowReady = V(e.rollout.state), e.origin.autopilot.boosterPhase === "coast" || nl(t))) {
			el(e, t);
			return;
		}
		qc(e, e.firstDuration, "upper");
		return;
	}
	if (Kc(t)) {
		if (t.forecast.rangeError * n >= 0) {
			let n = e.low ? cs(e.low, t, e.upperDuration) : void 0;
			n !== void 0 && (e.probeDuration = n), e.low = t, e.lowReady = V(e.rollout.state);
		} else {
			let n = e.high ? cs(e.high, t, e.upperDuration, e.lowerDuration) : void 0;
			n !== void 0 && (e.probeDuration = n), e.high = t, e.highReady = V(e.rollout.state);
		}
		if ((!e.low || !e.high) && nl(t)) {
			el(e, t);
			return;
		}
		if (e.low && e.high && !e.bracketRefined) {
			e.bracketRefined = !0;
			let t = ss(e.low, e.high), n = t === void 0 ? void 0 : Y(t);
			if (n !== void 0 && n > Y(e.low.burnDuration) && n < Y(e.high.burnDuration) && !e.attemptedTicks.includes(n) && e.iterations < 16) {
				qc(e, t, "root");
				return;
			}
		}
		if (Zc(e, t)) return;
		if (e.hintAnchor && !e.hintRefined && t !== e.hintAnchor) {
			e.hintRefined = !0;
			let n = e.low && e.high ? ss(e.low, e.high) : cs(e.hintAnchor, t, e.upperDuration, e.lowerDuration);
			if (n !== void 0) {
				qc(e, n, "root");
				return;
			}
		}
		if (nl(t)) {
			el(e, t);
			return;
		}
	} else Number.isFinite(t.forecast.rangeError) && t.forecast.rangeError * n > 0 ? e.lowerDuration = e.duration : e.upperDuration = e.duration;
	al(e);
}
function sl(e, t, n, r, i, a = !1) {
	as(e);
	let o = e.autopilot, s = o.boosterPrediction, c = !s || s.done ? Wc(e, i, s?.published) : {
		...s,
		...s.hintFallWork ? { hintFallWork: {
			...s.hintFallWork,
			result: { ...s.hintFallWork.result }
		} } : {},
		rollout: {
			...s.rollout,
			state: V(s.rollout.state),
			result: { ...s.rollout.result }
		}
	}, l = Math.max(1, Math.floor(480 * t)), u = o.boosterSource && !a ? Math.max(0, l - 1) : l, d = 0, f = 0;
	for (let t = 0; t < 32 && !c.done; t++) {
		let t = c.rollout;
		if (d += Pc(c.rollout, u - d, n, r, i, o.boosterSource ? {
			eligible: (t, n) => Po(e, t, n),
			paid: (t, a, o, s) => Mo(e, t, a, o, s, n, r, i)
		} : void 0), c.rollout.done) {
			if (c.stage === "hint") f += Qc(c, i, Hc - f);
			else if (c.stage === "validate") {
				if (a && d === l) break;
				let t = c.rollout.state, n = il(t), r = (!o.boosterSource || o.boosterSource.valid && o.boosterSource.checked && c.sourceLineage === o.boosterSource.lineageId) && c.origin.damage?.revision === e.damage?.revision && c.selected.damageRevision === c.origin.damage?.revision, i = r ? ls(c.selected, n, e.world.environmentTime) : void 0;
				if (r && (i || n && c.origin.autopilot.boosterPhase === "coast")) {
					let e = {
						...c.selected.forecast,
						fuel: t.vehicle.propellantMass
					};
					c.published = {
						originTime: c.origin.world.environmentTime,
						originX: c.origin.kinematics.downRangeDistance,
						originVX: c.origin.kinematics.speedX,
						forecast: e,
						...i ? { decision: i } : {}
					}, i && (o.boosterReturnPlan = i, o.boosterCoastPitch = i.coastPitch);
				}
				i || n || c.origin.autopilot.boosterPhase === "coast" ? c.done = !0 : al(c);
			} else ol(c);
		}
		if (c.done || d >= u || f >= Hc || c.rollout === t) break;
	}
	o.boosterPrediction = c;
	let p = c.published;
	if (p) {
		let t = Math.max(0, e.world.environmentTime - p.originTime);
		o.boosterRangeError = p.forecast.rangeError + (p.burnRangeRate ?? 0) * t, o.boosterFallTime = Math.max(0, p.forecast.time - t), o.boosterForecastReached = p.forecast.reached;
	}
	return d;
}
//#endregion
//#region src/core/autopilot/booster.ts
var cl = pr(), X = F(), ll = mr(), ul = Ra(), Z = Qa(), dl = hc(), fl = .5, pl = Sc(), ml = (e, t, n) => Math.max(t, Math.min(n, e));
function hl(e, t) {
	for (let n = 0; n < e.engines.running.length; n++) t.includes(n) ? !e.engines.running[n] && e.engines.ignitionCountdown[n] === null && !e.engines.failed[n] && !e.failures.fuelRunOut && ds(e, n) : ts(e, n);
}
function gl(e, t, n, r, i) {
	let a = e.kinematics, o = e.autopilot, s = i.gridFins;
	Ma(e, e.atmosphere.airDensity, t, n, a.pitch, cl, i, ll, f(-s.maxAngle));
	let c = ll.torque;
	Ma(e, e.atmosphere.airDensity, t, n, a.pitch, cl, i, ll, f(s.maxAngle));
	let l = ll.torque, u = -s.maxAngle, d = s.maxAngle;
	if (Math.abs(l - c) > 1) {
		for (let o = 0; o < 14; o++) {
			let o = (u + d) / 2;
			Ma(e, e.atmosphere.airDensity, t, n, a.pitch, cl, i, ll, f(o)), ll.torque < r == l > c ? u = o : d = o;
		}
		let p = (u + d) / 2;
		o.boosterFinControl = p / s.maxAngle * 100, Ma(e, e.atmosphere.airDensity, t, n, a.pitch, cl, i, ll, f(p));
	} else o.boosterFinControl = 0;
}
function _l(e, t, n, r, i = !1) {
	let a = e.kinematics, o = e.autopilot, s = Math.atan2(Math.sin(t - a.pitch), Math.cos(t - a.pitch));
	I(e, r, X, cl);
	let c = (s / n ** 2 - 2 * a.angularVelocity / n - (X.engineSupportAvailable ? e.forces.offAxisThrustDifferenceAcceleration : 0) - e.forces.angularDragAcceleration) * (e.damage ? X.momentOfInertia : e.vehicle.vehicleMomentOfInertia), l = (X.engineSupportAvailable ? e.forces.thrust : 0) * Go(e.engines.running, e.atmosphere.airPressure, r), u = a.speedX - j(e.world, a.altitude), d = a.speedY - e.world.gustVertical;
	Ma(e, e.atmosphere.airDensity, u, d, a.pitch, cl, r, ll);
	let f = ll.torque, p = l * cl.engineArm * Math.sin(e.vehicle.gimbalPosition * .01 * de), m = f + p;
	l > 0 ? (o.pitchControl = Math.asin(ml((c - f) / (l * cl.engineArm), -Math.sin(de), Math.sin(de))) / de * 100, i ? (e.status.finActive = !0, gl(e, u, d, c - p, r)) : (o.boosterFinControl = 0, e.status.finActive = !1)) : (o.pitchControl = 0, e.status.finActive = !0, gl(e, u, d, c, r)), e.status.rcsActive = e.vehicle.rcsRunTimeRemaining > 0, o.rcsThrustCommand = e.status.rcsActive ? ml((c - m) / cl.rcsArm, -ge, ge) : 0;
}
function vl(e, t, n, r, i = !1) {
	as(e);
	let a = e.autopilot;
	if (r) return a.boosterReturnPlan || a.boosterPhase === "entry" || a.boosterPhase === "terminal" ? (a.boosterFallTime = Math.max(2, (a.boosterFallTime ?? 2) - t), 0) : (a.boosterRangeError === void 0 && (po(e, k.bodyCentreAltitude, ul, Z, n, f(0)), Z.reached && (a.boosterRangeError = e.kinematics.downRangeDistance - C + Z.downRange, a.boosterFallTime = Z.time)), sl(e, t, r, Cl, n, i));
	if (a.boosterPredictorCountdown = (a.boosterPredictorCountdown ?? 0) - t, a.boosterPredictorCountdown > 0) return 0;
	if (po(e, k.bodyCentreAltitude, ul, Z, n, f(0)), Z.reached && (a.boosterRangeError = e.kinematics.downRangeDistance - C + Z.downRange, a.boosterFallTime = Z.time), a.boosterPhase === "coast" && Z.reached) {
		po(e, k.bodyCentreAltitude, ul, Z, n, f(.05));
		let t = Z.downRange;
		po(e, k.bodyCentreAltitude, ul, Z, n, f(-.05));
		let r = (t - Z.downRange) / .1;
		a.boosterCoastPitch = f(Math.abs(r) > 1 ? ml(-(a.boosterRangeError ?? 0) / r, -.2, .2) : 0);
	}
	let o = Math.abs(e.kinematics.accelerationX) * (a.boosterFallTime ?? 0) * .25;
	return a.boosterPredictorCountdown = a.boosterPhase === "boostback" && Math.abs(a.boosterRangeError ?? Infinity) <= 2 * o ? t : .25, 0;
}
function yl(e) {
	let t = e.kinematics;
	return un(Math.max(k.bodyCentreAltitude, t.altitude + Math.min(0, t.speedY) * Zo - .5 * Ia(e) * Zo ** 2), ul.atmosphere), Qs(ul.atmosphere.airDensity);
}
function bl(e, t) {
	if (I(e, t, X), !X.engineSupportAvailable || !X.hasMass || O.some((t) => e.engines.failed[t])) return !1;
	let n = Math.max(0, -e.kinematics.speedY);
	if (n === 0) return !1;
	let r = Ia(e), i = O.every((t) => e.engines.running[t]) ? 0 : Zo, a = Math.max(0, (100 - e.vehicle.throttleCurrent) / 60), o = Math.max(i, a), s = n * o + .5 * r * o ** 2, c = n + r * o, l = Xa(3, X.totalMass, c, k.bodyCentreAltitude, t), u = e.kinematics.altitude <= l + s ? Za(3, X.totalMass, c, k.bodyCentreAltitude, ul, t, X.retainedDryMass) : null;
	return u !== null && e.kinematics.altitude <= u + s;
}
function xl(e, t, n, r) {
	let i = e.autopilot;
	if (r && Oo(e, t), i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn) {
		i.boosterFinControl = void 0, is(i);
		return;
	}
	e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp || (i.boosterPhase ||= "align-boost", r || vl(e, t, n), Cl(e, t, n));
}
function Sl(e, t, n, r) {
	let i = e.autopilot;
	if (i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn || e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp) return;
	ko(e);
	let a = jo(e, t, r, Cl, n), o = vl(e, t, n, r, !!a);
	Ao(e, t, r, Cl, n, a && (No(e, a) || o >= Math.max(1, Math.floor(480 * t))) ? a : void 0);
}
function Cl(e, t, n) {
	as(e);
	let r = e.autopilot, i = e.kinematics;
	if (r.manualControlOn || !r.autoLandOn && !r.autoBoostBackOn) {
		r.boosterFinControl = void 0;
		return;
	}
	if (e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp) return;
	e.status.translationModeOn = !0, e.status.finLocked = !1, e.status.dumpingFuel = !1, r.boosterPhase ||= "align-boost";
	let a = (r.boosterRangeError ?? i.downRangeDistance - C) >= 0 ? -1 : 1;
	if (r.boosterPhase === "align-boost") {
		hl(e, []), e.vehicle.throttle = 100;
		let t = f(a * Math.PI / 2);
		_l(e, t, 1.5, n), Math.abs(Math.atan2(Math.sin(t - i.pitch), Math.cos(t - i.pitch))) < 5 * Math.PI / 180 && Math.abs(i.angularVelocity) < .1 && (r.boosterPhase = "boostback");
	} else if (r.boosterPhase === "boostback") hl(e, xt), e.vehicle.throttle = 100, r.boostBackInitCompleted ||= (r.boostBackDirection = a, !0), _l(e, f(r.boostBackDirection * Math.PI / 2), 1.5, n), !r.boosterForecastBurn && r.boosterReturnPlan && e.world.environmentTime + t >= r.boosterReturnPlan.shutdownAt && (hl(e, []), r.boosterPhase = "coast");
	else if (r.boosterPhase === "coast") hl(e, []), e.vehicle.throttle = 100, _l(e, r.boosterReturnPlan?.coastPitch ?? r.boosterCoastPitch ?? f(0), 1.5, n), bl(e, n) ? r.boosterPhase = "terminal" : Math.hypot(i.speedX - j(e.world, i.altitude), i.speedY - e.world.gustVertical) > yl(e) && (r.boosterPhase = "entry");
	else if (r.boosterPhase === "entry") {
		hl(e, r.boosterEntryCentreOnly ? O : xt);
		let t = yl(e), a = Math.sqrt(Math.max(0, t ** 2 - i.speedX ** 2)), o = Math.max(0, -i.speedY - a) / 2, s = Math.max(2, 2 * Math.max(0, i.altitude - k.bodyCentreAltitude) / (Math.max(0, -i.speedY) + 2)), c = -6 * (i.downRangeDistance - C) / s ** 2 - 4 * i.speedX / s;
		gc(e, c, o, n, dl), I(e, n, X);
		let l = X.engineSupportAvailable && X.hasMass ? H([
			!0,
			!0,
			!0
		], e.atmosphere.airPressure, n) / X.totalMass : 0;
		O.every((t) => e.engines.running[t]) && Math.hypot(dl.requiredX, dl.requiredY) <= l && (r.boosterEntryCentreOnly = !0, hl(e, O)), bc(e, c, o, n, dl), _l(e, dl.pitch, .5, n), e.vehicle.throttle = xc(e, o, n), bl(e, n) ? r.boosterPhase = "terminal" : i.speedY >= 0 && (hl(e, []), r.boosterPhase = "coast");
	} else {
		if (r.boosterTerminalMissed) {
			hl(e, []), _l(e, f(0), .5, n);
			return;
		}
		if (r.boosterTerminalIgnitionTime === void 0 && (r.boosterTerminalIgnitionTime = e.world.environmentTime), hl(e, O), O.some((t) => e.engines.failed[t]) && (r.boosterTerminalMissed = !0), !O.every((t) => e.engines.running[t]) && (e.world.environmentTime - r.boosterTerminalIgnitionTime > Zo + 2 * t && (r.boosterTerminalMissed = !0), !r.boosterTerminalMissed)) {
			e.vehicle.throttle = 100, _l(e, f(0), .5, n);
			return;
		}
		if (Ec(e, t, n, pl), r.boosterArrivalTime === 0 && (r.boosterTerminalMissed = !0), r.boosterTerminalMissed) {
			hl(e, []), _l(e, f(0), .5, n);
			return;
		}
		gc(e, pl.centreAX, pl.centreAY, n, dl), _l(e, f(0), fl, n, !0), r.pitchControl = ml(-Math.atan2(Math.sin(dl.pitch - i.pitch), Math.cos(dl.pitch - i.pitch)) / de * 100, -100, 100), e.vehicle.throttle = xc(e, pl.centreAY, n), H(e.engines.running, e.atmosphere.airPressure, n) === 0 && (e.vehicle.throttle = 100);
	}
}
//#endregion
//#region src/core/autopilot/booster-utilities.ts
function wl(e, t) {
	let { autopilot: n, kinematics: r } = e;
	n.manualControlOn || e.failures.crashed || e.failures.inFlightBreakUp || e.status.landed || (n.pitchHoldOn && (Math.abs(r.pitchRateOfChange) < .4 && (n.holdingPitch = r.pitch), e.status.translationModeOn = !0, _l(e, n.holdingPitch, .5, t)), !n.autoTakeOffOn) || (n.autoTakeOffInitialised ||= (n.autoMaxThrustOn = !0, e.engines.running.some(Boolean) || U(e, t), !0), e.status.translationModeOn = !0, _l(e, r.altitude < 25e3 ? f(Le * r.altitude / 25e3) : r.altitude < 8e4 ? f(Le + (Re - Le) * (r.altitude - 25e3) / 55e3) : Re, 3, t), e.vehicle.propellantMass < 12e3 && e.engines.running.some(Boolean) && (U(e, t), n.autoTakeOffOn = !1));
}
var Tl = An(_), El = Ra(), Dl = F();
function Ol(e) {
	if (I(e, E, Dl), !Dl.engineSupportAvailable || !Dl.hasMass) return 0;
	let t = Dl.totalMass * Tl, n = 1;
	return T(E.propulsion, "sea-level", 101325 / 1e3) * .8 < t && (n = 2), T(E.propulsion, "sea-level", 101325 / 1e3) * 2 * .8 < t && (n = 3), Math.min(n, Ho(e.engines.failed));
}
function kl(e) {
	return Za(Ol(e), Dl.totalMass, -e.kinematics.speedY, 0, El, E, Dl.retainedDryMass) ?? e.kinematics.altitude;
}
function Al(e) {
	let t = -e.kinematics.speedY;
	I(e, E, Dl);
	let n = Za(Dl.engineSupportAvailable ? Vo(e.engines.running) : 0, Dl.totalMass, t, E.height * .5, El, E, Dl.retainedDryMass);
	return n === null ? e.kinematics.altitude : n + t * 1 * .5;
}
//#endregion
//#region src/core/autopilot/index.ts
var jl = ds, Ml = fs, Nl = pr(), Q = F();
function Pl(e) {
	let { autopilot: t, kinematics: n } = e;
	!t.pitchHoldOn || t.manualControlOn || (Math.abs(n.pitchRateOfChange) < .4 && (t.holdingPitch = n.pitch), G(e, t.holdingPitch, .5));
}
function Fl(e, t = E) {
	e.autopilot.autoMaxThrustOn && ic(e, Qs(e.atmosphere.airDensity), 10, 4, t);
}
function Il(e) {
	let { autopilot: t, kinematics: n, vehicle: r, engines: i, status: a } = e;
	!t.autoTakeOffOn || t.manualControlOn || (t.autoTakeOffInitialised ||= (t.autoMaxThrustOn || hs(e), zo(i.running) === 0 && U(e), a.finActive && fs(e), a.finLocked = !0, !0), n.altitude < 25e3 ? G(e, f(Le * n.altitude / 25e3), 3) : n.altitude < 8e4 ? G(e, f(Le + (Re - Le) * (n.altitude - 25e3) / 55e3), 3) : G(e, Re, 3), r.propellantMass < 12e3 && zo(i.running) > 0 && (U(e), gs(e), a.finLocked = !1));
}
function Ll(e, t) {
	let { autopilot: n, kinematics: r, vehicle: i, engines: a } = e;
	if (!n.autoBoostBackOn || n.manualControlOn) return;
	let o = () => {
		_s(e), Rl(e), n.autoLandOn || vs(e);
	};
	if (n.boostBackInitCompleted ||= (n.boostBackDirection = r.downRangeDistance > C - 100 ? -Math.PI * .5 : Math.PI * .5, e.status.rcsActive || ps(e), zo(a.running) === 0 && U(e), n.autoMaxThrustOn || hs(e), n.autoTakeOffOn && gs(e), !0), !n.accelerationStageCompleted) n.decelerationStageEstDuration = Math.abs(r.speedX) / ke + 4, G(e, f(n.boostBackDirection), 1.5), (C - r.downRangeDistance - 100) / (r.speedX * .5) < n.decelerationStageEstDuration + 2 && (C - r.downRangeDistance) / r.speedX > 0 && (U(e), n.autoMaxThrustOn && hs(e), n.accelerationStageCompleted = !0);
	else if (n.boostBackDecelerationStageInitCompleted ||= (n.boostBackDecelerationCheckCountdown = 5, !0), n.boostBackDecelerationCheckCountdown !== null && (n.boostBackDecelerationCheckCountdown -= t, n.boostBackDecelerationCheckCountdown <= 0 && (n.boostBackDecelerationCheckCountdown = null, r.accelerationX < 14.906640000000001 && (n.boostBackAeroDeceleration = !1, U(e)))), n.boostBackAeroDeceleration ? oc(e, n.boostBackDirection < 0 ? ke : -ke, t, Ml) : (G(e, f(-n.boostBackDirection), 1), sc(e, jl), ec(e, ke)), Math.abs(r.speedX) < 3) {
		o();
		return;
	}
	(i.propellantMass < 12e3 || r.altitude < 700 && r.speedY < 0) && o();
}
function Rl(e) {
	let { autopilot: t } = e;
	t.autoBoostBackOn = !1, t.decelerationStageEstDuration = 0, t.boostBackDirection = 0, t.boostBackInitCompleted = !1, t.boostBackAeroDeceleration = !0, t.boostBackDecelerationStageInitCompleted = !1, t.boostBackDecelerationCheckCountdown = null, t.accelerationStageCompleted = !1;
}
function zl(e) {
	let { autopilot: t } = e;
	t.autoLandOn = !1, t.initVehicleConfigCompleted = !1, t.landingSiteXPos = C, t.aeroDescentCompleted = !1, t.fineTunePercentage = void 0, t.bellyFlopTriggerAltitude = 0, t.flipStageInitialised = !1, t.flipCompleted = !1, t.horizontalAdjustmentStageCompleted = !1, t.horizontalAdjustmentStageInitialised = !1, t.horizontalAdjustmentTimeLeft = void 0, t.horizontalAdjustmentDesiredSpeed = void 0, t.effectiveVerticalMaxThrust = void 0, t.finalStagePessimisticAltitude = void 0, t.finalDescentStageInitialised = !1, t.distanceToGround = void 0, t.finalDescentStageCompleted = !1;
}
function Bl(e, t) {
	let { autopilot: n, vehicle: r, engines: i, status: a } = e;
	!n.autoLandOn || n.manualControlOn || (n.initVehicleConfigCompleted ||= (a.finActive || fs(e), a.rcsActive || ps(e), r.throttle = 40, r.propellantMass > 18e3 && !a.dumpingFuel && ms(e), zo(i.running) > 0 && U(e), !0), a.dumpingFuel && r.propellantMass <= 18e3 && ms(e), n.aeroDescentCompleted ? n.flipCompleted ? n.horizontalAdjustmentStageCompleted ? n.finalDescentStageCompleted || Gl(e, t) : Wl(e) : Ul(e) : (Vl(e), Hl(e)));
}
function Vl(e) {
	let { autopilot: t, kinematics: n } = e;
	if (n.altitude >= 2500) return;
	let r = Ol(e) > 1 ? Ie : Pe;
	t.finalStagePessimisticAltitude = kl(e), I(e, E, Q, Nl);
	let i = Q.engineSupportAvailable ? Math.min(1, Ho(e.engines.failed)) : 0, a = i > 0 && Q.momentOfInertia > 0 && Nl.engineArm > 0 ? lt(i * T(E.propulsion, "sea-level", me / 1e3) * 40 * .01, Nl.engineArm, Q.momentOfInertia) : 0;
	if (!(a > 0)) {
		t.bellyFlopTriggerAltitude = Infinity;
		return;
	}
	let o = Math.sqrt((Math.PI / 2 + Me) / 2 / a * 2) * 2;
	t.bellyFlopTriggerAltitude = t.finalStagePessimisticAltitude + -n.speedY * (o + Zo) - -30 * r + E.height / 2;
}
function Hl(e) {
	let { autopilot: t, kinematics: n } = e, r = n.downRangeDistance - t.landingSiteXPos + 100, i = -r / n.speedX, a;
	Math.abs(n.speedX) > 20 ? a = n.angleOfMotion - Math.PI : r > 0 ? (a = -je, i < 5 && i > 0 && (t.fineTunePercentage = Math.abs(n.speedX) > 5 ? 1 : Math.abs(n.speedX) / 5, a = je * 2 * t.fineTunePercentage)) : (a = je, i < 5 && i > 0 && (t.fineTunePercentage = Math.abs(n.speedX) > 5 ? 1 : Math.abs(n.speedX) / 5, a = -je * 2 * t.fineTunePercentage)), G(e, f(a + Math.PI / 2), .7), (n.altitude < t.bellyFlopTriggerAltitude && n.speedY < 5 && n.altitude < 2500 || n.altitude < 300) && (t.aeroDescentCompleted = !0);
}
function Ul(e) {
	let { autopilot: t, kinematics: n, vehicle: r, status: i } = e;
	t.flipStageInitialised ||= (i.dumpingFuel && ms(e), i.rcsActive && ps(e), U(e), !0), G(e, Me, .4), n.pitch < 0 && (r.throttle = 100), n.pitch < Me && (t.flipCompleted = !0);
}
function Wl(e) {
	let { autopilot: t, kinematics: n, engines: r, status: i } = e;
	t.horizontalAdjustmentStageInitialised ||= (i.finActive && fs(e), i.finLocked = !0, Vo(r.running) < 3 && (t.horizontalAdjustmentVerticalSpeedLimit /= 1.5, t.horizontalAdjustmentHorizontalSpeedLimit *= 2), !0);
	let a = t.landingSiteXPos - n.downRangeDistance, [o, s, c] = r.running;
	o && !s && !c ? a -= 12 : (!o && s && c || !o && (s && !c || !s && c)) && (a += 4), t.finalStagePessimisticAltitude = Al(e), t.horizontalAdjustmentTimeLeft = (n.altitude - t.finalStagePessimisticAltitude - E.height / 2) / -n.speedY, t.horizontalAdjustmentDesiredSpeed = a / t.horizontalAdjustmentTimeLeft, t.horizontalAdjustmentDesiredSpeed > t.horizontalAdjustmentHorizontalSpeedLimit ? t.horizontalAdjustmentDesiredSpeed = t.horizontalAdjustmentHorizontalSpeedLimit : t.horizontalAdjustmentDesiredSpeed < -t.horizontalAdjustmentHorizontalSpeedLimit && (t.horizontalAdjustmentDesiredSpeed = -t.horizontalAdjustmentHorizontalSpeedLimit), n.speedY > t.horizontalAdjustmentVerticalSpeedLimit && sc(e, jl), t.horizontalAdjustmentTimeLeft < 3 && t.horizontalAdjustmentTimeLeft > -3 ? nc(e, 0, Ne, 10, .8) : nc(e, t.horizontalAdjustmentDesiredSpeed ?? 0, Ne, 6, 1), rc(e, t.horizontalAdjustmentVerticalSpeedLimit, 10, 2), t.finalStagePessimisticAltitude * 1.1 > n.altitude && (t.horizontalAdjustmentStageCompleted = !0);
}
function Gl(e, t, n = -5, r) {
	let { autopilot: i, kinematics: a, vehicle: o, engines: s, status: c } = e;
	if (i.finalDescentStageInitialised ||= !0, i.distanceToGround = a.altitude - E.height * .5, a.altitude > E.height * .5 + 5) {
		let [t, n, r] = s.running;
		t && !n && !r ? nc(e, -.8, f(Ne / 2), 5, .7) : !t && n && r ? nc(e, .8, f(Ne / 2), 5, .7) : !t && (n && !r || !n && r) ? nc(e, .72, f(Ne / 2), 5, .7) : nc(e, 0, f(Ne / 2), 5, .7);
	} else G(e, f(0), .4);
	a.speedY > n && sc(e, jl);
	let l = -i.distanceToGround / 3 - .1, u = Ia(e);
	I(e, E, Q);
	let d = (Q.engineSupportAvailable && Q.hasMass ? Zs(s.running, o.gimbalPointingDirection, e.atmosphere.airPressure, a.pitch) / Q.totalMass : 0) - u, p = Math.sqrt(2 * Math.max(0, d) * Math.max(0, i.distanceToGround));
	if (!r && d > 0 && -l > p) {
		let t = a.speedY + p, n = 1 + d / u - t / 10;
		tc(e, Math.max(0, Math.min(3, n)));
	} else rc(e, l, 10, 3);
	if (a.altitude <= E.height * .5 + .05) {
		if (r) {
			r(e);
			return;
		}
		o.throttle = 40, U(e), c.forceDump = !0, c.dumpingFuel || ms(e), vs(e), zl(e);
	}
}
function Kl(e, t) {
	e.autopilot.demoAutoLandOn && Gl(e, t, -20, (e) => {
		U(e), e.autopilot.demoAutoLandOn = !1, e.status.finLocked = !1, e.vehicle.propellantMass = te, e.autopilot.pitchControl = 0, e.vehicle.throttle = 100;
	});
}
var ql = f(-Math.PI / 2);
function Jl(e) {
	let t = e.autopilot.landingSiteXPos - e.kinematics.downRangeDistance;
	return t < 0 ? t + v : t;
}
function Yl(e) {
	let { kinematics: t } = e;
	return Pn(t.distanceToPlanetCenter, t.speedX, t.speedY, _ + Oe) + De;
}
function Xl(e) {
	let { kinematics: t, engines: n } = e;
	if (I(e, E, Q), !Q.engineSupportAvailable || !Q.hasMass) return Infinity;
	let r = Ho(n.failed);
	if (r <= 0) return Infinity;
	let i = 150 * Q.totalMass / (r * T(E.propulsion, "sea-level", e.atmosphere.airPressure));
	return (t.speedX - 75) * i + Pn(t.distanceToPlanetCenter, t.speedX - 150, t.speedY, _ + Oe) + De;
}
function Zl(e) {
	let { autopilot: t, kinematics: n, vehicle: r, engines: i, status: a } = e;
	if (!(!t.autoDeorbitOn || t.manualControlOn)) {
		if (t.deorbitInitCompleted ||= (t.landingSiteXPos = C, a.rcsActive || ps(e), zo(i.running) > 0 && U(e), r.throttle = 100, !0), G(e, ql, 4), !t.deorbitBurnStarted) {
			let i = Xl(e);
			Number.isFinite(i) && Jl(e) <= i && (t.deorbitTargetSpeed = n.speedX, U(e), r.throttle = 100, t.deorbitBurnStarted = !0);
			return;
		}
		if (!t.deorbitBurnCompleted) {
			let a = t.deorbitTargetSpeed - n.speedX;
			(a >= 75 && Yl(e) <= Jl(e) || a >= 240) && (zo(i.running) > 0 && U(e), r.throttle = 40, t.deorbitBurnCompleted = !0);
			return;
		}
		n.speedY < 0 && (t.autoDeorbitOn = !1, t.autoLandOn || vs(e));
	}
}
function Ql(e, t, n = E, r) {
	if (n.id === "super-heavy") {
		let i = e.autopilot.autoLandOn || e.autopilot.autoBoostBackOn;
		xl(e, t, n, r), i || (Fl(e, n), wl(e, n));
		return;
	}
	Kl(e, t), Fl(e), Pl(e), Il(e), Bl(e, t), Ll(e, t), Zl(e);
}
//#endregion
//#region src/core/control/actuation.ts
function $l(e, t, n, r = !1) {
	return e < t + n && e > t - n ? t : (r ? e <= t : e < t) ? e + n : e - n;
}
function eu(e, t, n) {
	e.vehicle.frontFinExtension = $l(e.vehicle.frontFinExtension, t, 120 * n);
}
function tu(e, t, n) {
	e.vehicle.aftFinExtension = $l(e.vehicle.aftFinExtension, t, 120 * n, !0);
}
function nu(e, t, n) {
	let { status: r, kinematics: i } = e;
	r.finActive ? i.angleOfAttack < 0 ? (eu(e, 50 - t, n), tu(e, 50 + t, n)) : (eu(e, 50 + t, n), tu(e, 50 - t, n)) : r.finLocked ? (eu(e, 0, n), tu(e, 0, n)) : (eu(e, 100, n), tu(e, 100, n));
}
function ru(e, t, n, r = !1) {
	let { status: i, vehicle: a, forces: o, autopilot: s } = e, c = s.rcsThrustCommand;
	if (s.rcsThrustCommand = 0, !i.rcsActive || a.rcsRunTimeRemaining <= 0) {
		o.rcsThrust = 0;
		return;
	}
	if (o.rcsThrust = r ? Math.max(-ge, Math.min(ge, c)) : t > 99 ? ge : t < -99 ? -ge : c, o.rcsThrust !== 0) {
		let e = 1 / n, t = Math.abs(o.rcsThrust) / ge, r = a.rcsRunTimeRemaining * e;
		t >= r ? (o.rcsThrust = Math.sign(o.rcsThrust) * ge * r, a.rcsRunTimeRemaining = 0) : a.rcsRunTimeRemaining = (r - t) / e;
	}
}
function iu(e, t, n) {
	e.vehicle.gimbalPosition = $l(e.vehicle.gimbalPosition, t, 600 * n);
}
function au(e, t) {
	e.vehicle.throttleCurrent = $l(e.vehicle.throttleCurrent, e.vehicle.throttle, 60 * t);
}
function ou(e, t, n, r = E, i = !1) {
	e.status.translationModeOn && (r.gridFins ? (eu(e, 50 + (e.status.finActive && !e.status.finLocked ? Math.max(-100, Math.min(100, e.autopilot.boosterFinControl ?? t)) : 0) / 2, n), tu(e, 50, n)) : nu(e, t / 2, n), ru(e, t, n, !!r.gridFins && !i && !e.autopilot.manualControlOn && (e.autopilot.autoLandOn || e.autopilot.autoBoostBackOn || e.autopilot.pitchHoldOn || e.autopilot.autoTakeOffOn) && e.autopilot.boosterFinControl !== void 0), iu(e, t, n));
}
//#endregion
//#region src/core/control/mechanical.ts
function su(e, t, n, r, i, a, o, s = !0) {
	if (t.damage && !t.damage.terminal.active) {
		let e = t.damage.revision;
		Pa(t, n, i, "hull"), t.damage.revision !== e && i.id === "super-heavy" && is(t.autopilot);
	}
	return t.damage?.terminal.active ? (Ls(t, i, o), t.world.environmentTime += n, t) : (a(t, n, i), r.throttle !== void 0 && (t.vehicle.throttle = r.throttle), r.pitchControl !== void 0 && (t.autopilot.pitchControl = r.pitchControl, i.gridFins && (t.autopilot.boosterFinControl = r.pitchControl)), ou(t, t.autopilot.pitchControl, n, i, r.pitchControl !== void 0), au(t, n), Ls(t, i, o), s && i.id === "super-heavy" && pc(e, t, i), t.world.environmentTime += n, !t.failures.crashed && !t.failures.inFlightBreakUp && !t.status.onTheGround && !t.status.landed && (t.world.timeSpent += n), t);
}
//#endregion
//#region src/core/physics/body-reference.ts
function cu(e, t, n, r) {
	let i = Math.sin(e.pitch), a = Math.cos(e.pitch), o = a * t + i * n, s = -i * t + a * n, c = e.angularVelocity, l = e.angularAcceleration;
	r.downRangeDistance = e.downRangeDistance + o, r.downRangeDistanceNextFrame = r.downRangeDistance, r.altitude = e.altitude + s, r.speedX = e.speedX + c * s, r.speedY = e.speedY - c * o, r.accelerationX = e.accelerationX + l * s - c ** 2 * o, r.accelerationY = e.accelerationY - l * o - c ** 2 * s, r.pitch = e.pitch, r.angularVelocity = c, r.angularAcceleration = l, r.distanceToPlanetCenter = _ + r.altitude, r.orbitalVelocityAtCurrentAltitude = kn(r.distanceToPlanetCenter), r.trueSpeed = Math.hypot(r.speedX, r.speedY), r.totalAcceleration = Math.hypot(r.accelerationX, r.accelerationY);
}
//#endregion
//#region src/core/mission-free-flight.ts
var $ = Ms(), lu = { ...E }, uu = { ...Nt };
function du(e, t, n, r) {
	let i = e.kinematics, a = Math.sin(i.pitch), o = Math.cos(i.pitch);
	e.damage ? (t.pitch = i.pitch, t.angularVelocity = i.angularVelocity, t.angularAcceleration = i.angularAcceleration, cu(t, -r, -n, i)) : (i.downRangeDistance = t.downRangeDistance - n * a, i.downRangeDistanceNextFrame = i.downRangeDistance, i.altitude = t.altitude - n * o, i.distanceToPlanetCenter = _ + i.altitude, i.orbitalVelocityAtCurrentAltitude = kn(i.distanceToPlanetCenter), i.speedX = t.speedX - n * i.angularVelocity * o, i.speedY = t.speedY + n * i.angularVelocity * a, i.accelerationX = t.accelerationX - n * (i.angularAcceleration * o - i.angularVelocity ** 2 * a), i.accelerationY = t.accelerationY + n * (i.angularAcceleration * a + i.angularVelocity ** 2 * o), i.totalAcceleration = Math.hypot(i.accelerationX, i.accelerationY)), i.trueSpeed = Math.hypot(i.speedX, i.speedY), i.machSpeed = dt(i.speedX, i.speedY, j(e.world, i.altitude), e.world.gustVertical) / mn(e.atmosphere.airTemperature);
}
function fu(e, t, n, r, i) {
	let a = Lo(e);
	if (r.id === "super-heavy" && e.status.landed) return a.damage && da(a.damage, P(r).debris, t), a.engines.running.fill(!1), a.engines.ignitionCountdown.fill(null), a.world.environmentTime += t, a.world.updatedFrameCount += 1, a;
	if (r.id === "super-heavy" && (n.pitchControl !== void 0 || n.throttle !== void 0) && is(a.autopilot), a.damage?.terminal.active) return da(a.damage, P(r).debris, t), wa(a), a.world.environmentTime += t, a.world.updatedFrameCount++, a;
	if (Bs(a, t, r, $), a.damage && da(a.damage, P(r).debris, t), a.damage?.terminal.active) return a.engines.running.fill(!1), a.engines.ignitionCountdown.fill(null), a.world.environmentTime += t, a;
	Oa(a, r, $.massProperties);
	let o = a.kinematics, s = (a.damage ? $.massProperties.centreOfMass : cr(a.vehicle.propellantMass, r)) - r.height / 2, c = a.damage ? $.massProperties.centreOfMassX : 0, l = Math.sin(o.pitch), u = Math.cos(o.pitch), d = {
		...o,
		downRangeDistance: o.downRangeDistance + s * l,
		altitude: o.altitude + s * u,
		speedX: o.speedX + s * o.angularVelocity * u,
		speedY: o.speedY - s * o.angularVelocity * l
	};
	a.damage && cu(o, c, s, d), d.distanceToPlanetCenter = _ + d.altitude;
	let f = r.id === "ship" ? lu : uu;
	f.height = r.height + 2 * s * Math.sign(u);
	let p = Vs({
		kinematics: d,
		forces: a.forces,
		status: a.status,
		failures: a.failures
	}, t, $.bodyAccelerationX, $.bodyAccelerationY, f, a.damage ? r.height * Math.abs(u) / 2 + (d.altitude - o.altitude) : void 0);
	p && (o.angularVelocity = 0), a.damage ? Oa(a, r, $.massProperties) : fr(a.vehicle.propellantMass, $.massProperties, r), a.vehicle.vehicleMomentOfInertia = $.massProperties.momentOfInertia, Us(a, t, p, $), du(a, d, s, c), Hs(a, t, $);
	let m = Ws(a, r, $);
	return Gs(a, t, p, $.omega0, $.alpha0, m), du(a, d, s, c), su(e, a, t, n, r, i, $);
}
//#endregion
//#region src/core/step.ts
var pu = {}, mu = Ms();
function hu(e, t, n = pu, r = E) {
	let i = vu(e, t, n, r, gu);
	return r.id === "super-heavy" && !i.damage?.terminal.active && Sl(i, t, r, _u), i;
}
function gu(e, t, n) {
	Ql(e, t, n, _u);
}
function _u(e, t, n, r) {
	return vu(e, t, pu, r, n);
}
function vu(e, t, n, r, i) {
	if (e.damage) return fu(e, t, n, r, i);
	let a = Lo(e);
	if (r.id === "super-heavy" && e.status.landed) return a.engines.running.fill(!1), a.engines.ignitionCountdown.fill(null), a.world.environmentTime += t, a.world.updatedFrameCount += 1, a;
	r.id === "super-heavy" && (n.pitchControl !== void 0 || n.throttle !== void 0) && is(a.autopilot), Bs(a, t, r, mu);
	let o = Vs(a, t, mu.bodyAccelerationX, mu.bodyAccelerationY, r);
	return Hs(a, t, mu), Ks(a, t, r, mu, o), su(e, a, t, n, r, i, mu);
}
//#endregion
export { st as $, Qa as A, P as B, Ha as C, fo as D, Fa as E, La as F, A as G, oa as H, po as I, mn as J, wn as K, so as L, Za as M, Ia as N, Xa as O, Va as P, ht as Q, I as R, B as S, eo as T, er as U, ia as V, Nn as W, k as X, un as Y, Nt as Z, vs as _, lc as a, _e as at, Io as b, xs as c, C as ct, Cs as d, f as dt, it as et, ys as f, h as ft, Ds as g, ks as h, u as ht, cc as i, E as it, uo as j, Ra as k, bs as l, g as lt, Os as m, d as mt, hu as n, ot as nt, Es as o, S as ot, js as p, m as pt, Tn as q, Cl as r, mt as rt, Ss as s, _ as st, _u as t, D as tt, Ts as u, p as ut, Fo as v, $a as w, Ro as x, Lo as y, F as z };

//# sourceMappingURL=simulation-Yh007HZ3.js.map