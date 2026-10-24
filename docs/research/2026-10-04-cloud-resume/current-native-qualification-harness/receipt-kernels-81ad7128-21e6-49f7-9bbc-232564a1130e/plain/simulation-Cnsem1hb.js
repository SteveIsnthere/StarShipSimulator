//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
};
//#endregion
//#region src/core/units.ts
function n(e) {
	return e;
}
function r(e) {
	return e;
}
function i(e) {
	return e / 180 * Math.PI;
}
function a(e) {
	return e / Math.PI * 180;
}
var o = n(0), s = 6371e3, c = 2 * s * Math.PI, l = 3986004418e5;
c / 86400;
var u = 7292115e-11, d = i(r(25.997));
u * Math.cos(d);
var f = 9.807, p = c / 2, m = Math.PI * (9 / 2) ** 2, h = 35e4, g = 47e4, _ = 3500;
g * (9 / 2) ** 2 * .25 + g * 2500 / 12;
var v = .1, y = 1 / 2, b = 1 / 2, x = (e, t) => ({
	kind: e,
	offAxis: t,
	offAxisForceFraction: -t / Math.sqrt(t ** 2 + 625)
}), ee = [
	x("sea-level", -1),
	x("sea-level", y),
	x("sea-level", b),
	x("vacuum", -3),
	x("vacuum", 1.5),
	x("vacuum", 1.5)
], te = ee.flatMap((e, t) => e.kind === "sea-level" ? [t] : []), ne = 21.8, S = i(r(15)), C = 9.80665, re = 23e4 * C, ie = 101325;
re / (327 * C) * C * 350, 158645.8058103975 / ie, 258e3 * C / (380 * C), Math.PI * (2.3 / 2) ** 2;
var ae = re, oe = 8e5, se = n(1.03), ce = 24.2, le = 23.3, ue = 45.8, de = 12.6, fe = 17415e-8, pe = 5.670374419e-8, me = .85, he = 1533, ge = 273.15;
me * pe * he ** 4;
var _e = 841800, ve = 8e4, ye = f * 1.6, be = 1 * ae;
be * 2, be * 3, 1 * ae * 40 * .01;
var xe = i(r(3)), Se = i(r(10)), Ce = i(r(20)), we = 5.5, Te = we, Ee = Te * 1.5;
Te * 2;
var De = i(r(55)), Oe = i(r(85)), ke = n(Math.PI * .5), Ae = i(r(30)), je = /* @__PURE__ */ t({
	engineMassFlow: () => w,
	engineThrust: () => T,
	isCanonicalBurnPropulsion: () => Me
});
function w(e, t) {
	return t === "sea-level" ? e.seaLevel.thrustSeaLevel / (e.seaLevel.ispSeaLevel * e.standardGravity) : e.vacuum.thrustVacuum / (e.vacuum.ispVacuum * e.standardGravity);
}
function T(e, t, n) {
	let r = Math.max(0, n) * 1e3, i = t === "sea-level" ? w(e, t) * e.standardGravity * e.seaLevel.ispVacuum : e.vacuum.thrustVacuum, a = t === "sea-level" ? (i - e.seaLevel.thrustSeaLevel) / e.referencePressurePa : e.vacuum.effectiveExitArea;
	return Math.max(0, i - r * a);
}
function Me(e, t, n) {
	return e === Me && t === w && n === T;
}
//#endregion
//#region src/core/vehicles/v3.ts
var Ne = 9.80665, Pe = Object.freeze({
	standardGravity: Ne,
	referencePressurePa: 101325,
	seaLevel: Object.freeze({
		thrustSeaLevel: 25e4 * Ne,
		ispSeaLevel: 327,
		ispVacuum: 350
	}),
	vacuum: Object.freeze({
		thrustVacuum: 275e3 * Ne,
		ispVacuum: 380,
		effectiveExitArea: Math.PI * (2.3 / 2) ** 2
	})
});
function Fe(e, t) {
	return Object.freeze({
		kind: e,
		gimballed: t
	});
}
var Ie = Object.freeze({
	id: "ship",
	height: 52,
	diameter: 9,
	dryMass: 12e4,
	propellantCapacity: 16e5,
	engines: Object.freeze([
		Fe("sea-level", !0),
		Fe("sea-level", !0),
		Fe("sea-level", !0),
		Fe("vacuum", !1),
		Fe("vacuum", !1),
		Fe("vacuum", !1)
	]),
	propulsion: Pe
}), Le = Object.freeze({
	id: "super-heavy",
	height: 72,
	diameter: 9,
	dryMass: 2e5,
	propellantCapacity: 365e4,
	engines: Object.freeze(Array.from({ length: 33 }, (e, t) => Fe("sea-level", t < 13))),
	propulsion: Pe,
	gridFins: Object.freeze({
		count: 3,
		area: 27
	})
});
Object.freeze({
	ship: Ie,
	superHeavy: Le
});
var Re = 3.6 / 4.6, ze = 1141, Be = Ie.propellantCapacity, Ve = Ie.height / 50, He = 5, Ue = Math.PI * (9 / 2) ** 2, We = Be * Re / (ze * Ue), Ge = Be * .21739130434782605 / (424 * Ue), E = Object.freeze({
	id: "ship",
	propulsion: Ie.propulsion,
	height: Ie.height,
	diameter: Ie.diameter,
	dryMass: Ie.dryMass,
	propellantCapacity: Be,
	initialPropellant: h,
	dryCentreOfMass: ne * Ve,
	tankBottom: He,
	loxTankHeight: We,
	ch4TankHeight: Ge,
	ch4TankBottom: He + We,
	aftFinStation: (ne - de) * Ve,
	frontFinStation: (ne + le) * Ve,
	rcsStation: (ne + 20) * Ve,
	minArea: m,
	maxArea: Ie.height * Ie.diameter,
	frontFinArea: ce,
	aftFinArea: ue,
	engines: Object.freeze(ee.map((e) => Object.freeze({
		...e,
		offAxisForceFraction: -e.offAxis / Math.sqrt(e.offAxis ** 2 + (Ie.height / 2) ** 2)
	}))),
	ignitionGroup: te
}), Ke = /* @__PURE__ */ t({
	foldedIntoWind: () => at,
	getAcceleration: () => Qe,
	getAftFinDrag: () => ct,
	getAngleOfMotion: () => et,
	getAngularAcceleration: () => $e,
	getAngularDragAcceleration: () => ot,
	getAttackAngles: () => rt,
	getBodyDragCoefficient: () => Ze,
	getCrossSectionalArea: () => Je,
	getDrag: () => D,
	getDynamicPressure: () => qe,
	getFrontFinDrag: () => st,
	getLift: () => Xe,
	getLiftCoefficient: () => Ye,
	isCanonicalBurnAero: () => ut,
	relativeAirspeed: () => tt,
	relativeWindAngle: () => nt,
	updateVehicleInFlightMaxArea: () => lt,
	wrappedAttackAngle: () => it
});
function qe(e, t) {
	return e * t ** 2 * 5e-4;
}
function Je(e, t, n = E) {
	return Math.abs(Math.sin(e) * t) + Math.abs(Math.cos(e) * n.minArea) / 2.1;
}
function D(e, t, n, r) {
	return 1 / 2 * e * t ** 2 * r * n;
}
function Ye(e) {
	let t = Math.abs(e);
	return t >= 1.48 ? -1.1 * t + 1.728 : t >= .52 ? -1 / 9.6 * t + .254 : t >= .47 ? -8 * t + 4.36 : t >= .35 ? 5 / 6 * t + .2083 : 5 / 3.5 * t;
}
function Xe(e, t, n, r) {
	return Ye(n) * e * t ** 2 * r * .5;
}
function Ze(e) {
	return e >= 10 ? 2.5 : e * .1347 + 1.153;
}
function Qe(e, t) {
	return e / t;
}
function $e(e, t, n) {
	return e * t / n;
}
function et(e, t) {
	return n(Math.atan2(e, t));
}
function tt(e, t, n, r) {
	return Math.sqrt((e - n) ** 2 + (t - r) ** 2);
}
function nt(e, t, n, r) {
	return et(e - n, t - r);
}
function rt(e, t) {
	let r = it(e, t);
	return {
		angleOfAttack: n(r),
		angleInToTheWind: n(at(r))
	};
}
function it(e, t) {
	let n = e - t;
	return n < -Math.PI ? n = Math.PI * 2 + n : n > Math.PI && (n = -(Math.PI * 2 - n)), n;
}
function at(e) {
	return e > Math.PI / 2 ? Math.PI - e : e < -Math.PI / 2 ? -Math.PI - e : e;
}
function ot(e, t, n, r, i = E) {
	let a = e * i.diameter * t ** 2 * r / n;
	return t > 0 ? -a : a;
}
function st(e, t, n, r, i, a = E) {
	let o = D(e, t, Math.abs(Math.sin(r)) * a.frontFinArea, 2) * i;
	return n < 0 ? -o : o;
}
function ct(e, t, n, r, i, a = E) {
	let o = D(e, t, Math.abs(Math.sin(r)) * a.aftFinArea, 2) * i;
	return n < 0 ? o : -o;
}
function lt(e, t, n = E) {
	let r = Math.sin(se * e * .01), i = Math.sin(se * t * .01), a = r * n.frontFinArea + i * n.aftFinArea;
	return {
		frontFinEffectiveAreaFraction: r,
		aftFinEffectiveAreaFraction: i,
		totalFinSurfaceArea: a,
		vehicleInFlightMaxArea: n.maxArea + a * 1.8
	};
}
function ut(e, t) {
	return e === ut && t === Je;
}
//#endregion
//#region src/core/vehicles/super-heavy.ts
var O = Object.freeze([
	0,
	1,
	2
]), dt = Object.freeze(Array.from({ length: 13 }, (e, t) => t));
Object.freeze({
	centre: O,
	inner: Object.freeze(Array.from({ length: 10 }, (e, t) => t + 3)),
	outer: Object.freeze(Array.from({ length: 20 }, (e, t) => t + 13))
});
var ft = Le.height, pt = Le.diameter, mt = Le.propellantCapacity, ht = 3, gt = .9 * ft, _t = 66 / 71 * ft, vt = Math.PI * (pt / 2) ** 2, yt = mt * Re / (ze * vt), bt = mt * (1 - Re) / (424 * vt), xt = (e, t) => Object.freeze({
	kind: "sea-level",
	offAxis: e,
	gimballed: t,
	offAxisForceFraction: 0
}), St = (e, t, n) => Array.from({ length: e }, (r, i) => xt(t * Math.cos(2 * Math.PI * i / e), n)), Ct = Object.freeze({
	id: "super-heavy",
	propulsion: Le.propulsion,
	height: ft,
	diameter: pt,
	dryMass: Le.dryMass,
	propellantCapacity: mt,
	initialPropellant: 5e5,
	dryCentreOfMass: ft / 2,
	tankBottom: ht,
	loxTankHeight: yt,
	ch4TankHeight: bt,
	ch4TankBottom: ht + yt,
	aftFinStation: gt,
	frontFinStation: gt,
	rcsStation: _t,
	minArea: vt,
	maxArea: ft * pt,
	frontFinArea: 0,
	aftFinArea: 0,
	engines: Object.freeze([
		xt(0, !0),
		xt(-.65, !0),
		xt(.65, !0),
		...St(10, 2, !0),
		...St(20, 3.8, !1)
	]),
	ignitionGroup: dt,
	gridFins: Object.freeze({
		count: 3,
		area: Le.gridFins.area,
		station: gt,
		maxAngle: Math.PI / 4
	})
}), wt = 65 / 71 * ft, k = Object.freeze({
	lugStation: wt,
	planeAltitude: 120,
	bodyCentreAltitude: 120 - (wt - ft / 2),
	halfWidth: 2.25,
	maxDownSpeed: 4.5,
	maxLateralSpeed: 1,
	maxPitch: 5 * Math.PI / 180
}), Tt = C, Et = 287.053, Dt = 288.15, Ot = ie;
function kt() {
	let e = [
		[0, -.0065],
		[11e3, 0],
		[2e4, .001],
		[32e3, .0028],
		[47e3, 0],
		[51e3, -.0028],
		[71e3, -.002]
	], t = [], n = Dt, r = Ot;
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
		r = At(r, n, o, c), n = l;
	}
	return t;
}
function At(e, t, n, r) {
	return n === 0 ? e * Math.exp(-Tt * r / (Et * t)) : e * ((t + n * r) / t) ** (-Tt / (Et * n));
}
var jt = kt(), Mt = 84852, Nt = 6356766;
function Pt(e) {
	return Nt * e / (Nt + e);
}
function Ft(e) {
	let t = jt[0];
	for (let n of jt) if (e >= n.baseAltitude) t = n;
	else break;
	return t;
}
var It = 86e3, Lt = [
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
], Rt = 1e3, zt = (() => {
	let e = [], t = Bt(It);
	for (let n = 0; n < Lt.length; n++) {
		let [r, i] = Lt[n];
		e.push({
			base: r,
			density: t,
			scaleHeight: i
		});
		let a = Lt[n + 1];
		a && (t *= Math.exp(-(a[0] - r) / i));
	}
	return e;
})();
function Bt(e) {
	let { pressurePascal: t, temperatureKelvin: n } = Vt(e);
	return t / (Et * n);
}
function Vt(e) {
	let t = {
		pressurePascal: 0,
		temperatureKelvin: 0
	};
	return Ht(e, t), t;
}
function Ht(e, t) {
	let n = Math.max(Pt(e), 0), r = Math.min(n, Mt), i = Ft(r), a = r - i.baseAltitude;
	t.temperatureKelvin = i.baseTemperature + i.lapseRate * a, t.pressurePascal = At(i.basePressure, i.baseTemperature, i.lapseRate, a);
}
function Ut(e) {
	let t = {
		airTemperature: 0,
		airPressure: 0,
		airDensity: 0
	};
	return $t(e, t), t;
}
var Wt = 186.8673, Gt = 263.1905, Kt = -76.3232, qt = -19.9429, Jt = 240, Yt = 12, Xt = Nt / 1e3;
function Zt(e) {
	let t = e / 1e3;
	if (t <= 91) return Wt;
	if (t <= 110) return Gt + Kt * Math.sqrt(1 - ((t - 91) / qt) ** 2);
	if (t <= 120) return Jt + Yt * (t - 110);
	let n = (t - 120) * 6476.766 / (Xt + t);
	return Rt - 640 * Math.exp(-.01875 * n);
}
var Qt = {
	pressurePascal: 0,
	temperatureKelvin: 0
};
function $t(e, t) {
	if (e <= 86e3) {
		Ht(e, Qt);
		let { pressurePascal: n, temperatureKelvin: r } = Qt;
		t.airTemperature = r - 273.15, t.airPressure = n / 1e3, t.airDensity = n / (Et * r);
		return;
	}
	let n = zt[0];
	for (let t of zt) if (e >= t.base) n = t;
	else break;
	let r = n.density * Math.exp(-(e - n.base) / n.scaleHeight), i = Zt(e);
	t.airTemperature = i - 273.15, t.airPressure = r * Et * i / 1e3, t.airDensity = r;
}
//#endregion
//#region src/core/physics/atmosphere.ts
function en(e) {
	return Ut(e);
}
var tn = 1.4, nn = 287.053;
function rn(e) {
	return Math.sqrt(tn * nn * (e + 273.15));
}
//#endregion
//#region src/core/physics/components.ts
var an = Math.PI / 2;
function on(e) {
	return -Math.sin(e);
}
function sn(e) {
	return -Math.cos(e);
}
function cn(e) {
	return -Math.cos(e);
}
function ln(e) {
	return Math.sin(e);
}
function un(e) {
	return Math.sin(e);
}
function dn(e) {
	return Math.cos(e);
}
function fn(e) {
	return 0 < e && e < an || -Math.PI < e && e < -an;
}
function pn(e, t) {
	let n = t(e.gimbalPointingDirection) * e.thrustAcceleration, r = e.fixedThrustAcceleration;
	return r === 0 ? n : n + t(e.pitch) * r;
}
function mn(e) {
	let t = on(e.angleOfMotion) * e.aerodynamicDragAcceleration, n = cn(e.angleOfMotion), r = fn(e.angleOfAttack) ? -n * e.aerodynamicLiftAcceleration : n * e.aerodynamicLiftAcceleration;
	return t + pn(e, un) + r;
}
function hn(e, t) {
	let n = sn(e.angleOfMotion) * e.aerodynamicDragAcceleration, r = ln(e.angleOfMotion), i = fn(e.angleOfAttack) ? -r * e.aerodynamicLiftAcceleration : r * e.aerodynamicLiftAcceleration, a = pn(e, dn);
	return -t + n + a + i;
}
function gn(e, t, n) {
	let r = Math.sin(e.angleOfMotion), i = Math.cos(e.angleOfMotion), a = fn(e.angleOfAttack), o = -r * e.aerodynamicDragAcceleration, s = -i * e.aerodynamicDragAcceleration, c = -i, l = r, u = a ? -c * e.aerodynamicLiftAcceleration : c * e.aerodynamicLiftAcceleration, d = a ? -l * e.aerodynamicLiftAcceleration : l * e.aerodynamicLiftAcceleration, f = Math.sin(e.gimbalPointingDirection) * e.thrustAcceleration, p = Math.cos(e.gimbalPointingDirection) * e.thrustAcceleration;
	e.fixedThrustAcceleration !== 0 && (f += Math.sin(e.pitch) * e.fixedThrustAcceleration, p += Math.cos(e.pitch) * e.fixedThrustAcceleration), n.x = o + f + u, n.y = -t + s + p + d;
}
//#endregion
//#region src/core/physics/gravity.ts
var _n = l;
function vn(e) {
	return _n / e ** 2;
}
function yn(e) {
	return Math.sqrt(_n / e);
}
function A(e, t, n = 0) {
	return xn(e, t, n) ** 2 / e - vn(e);
}
function bn(e, t = 0) {
	return -A(e, 0, t);
}
function xn(e, t, n = 0) {
	return n === 0 ? t : t + n * e;
}
function Sn(e, t, n = 0) {
	return n === 0 ? t : t - n * e;
}
function Cn(e, t, n, r = 0) {
	let i = r === 0 ? t : t + 2 * r * e;
	return -n * i / e;
}
function wn(e, t, n, r, i = 0) {
	let a = xn(e, t, i), o = (a ** 2 + n ** 2) / 2 - _n / e, s = e * a, c = 1 + 2 * o * s ** 2 / _n ** 2, l = Math.sqrt(Math.max(c, 0)), u = s ** 2 / _n;
	if (l < 1e-9 || u / (1 + l) > r) return Infinity;
	let d = (e, t) => {
		let n = (u / e - 1) / l, r = Math.acos(Math.min(1, Math.max(-1, n)));
		return t ? r : 2 * Math.PI - r;
	}, f = d(e, n >= 0), p = d(r, !1);
	if (p < f && (p += 2 * Math.PI), !(p > f)) {
		if (i === 0) return 0;
		if (n > 0 && o >= 0) return Infinity;
		let t = Dn(e, n, r);
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
var Tn = .1, En = 1e6;
function Dn(e, t, n) {
	let r = e, i = t, a = -vn(r), o = 0;
	for (let e = 0; e < En; e++) {
		let e = r + i * Tn + .5 * a * Tn * Tn;
		if (e <= n) {
			let t = (r - n) / (r - e);
			return o + .5 * (r + n) * t * Tn;
		}
		let t = -vn(e);
		i += .5 * (a + t) * Tn, o += .5 * (r + e) * Tn, r = e, a = t;
	}
	return Infinity;
}
//#endregion
//#region src/core/rng.ts
function On(e) {
	return {
		seed: e >>> 0,
		counters: {
			ignitionDelay: 0,
			ignitionFailure: 0,
			turbulence: 0
		}
	};
}
function kn(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n++) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return t >>> 0;
}
var An = {
	ignitionDelay: kn("ignitionDelay"),
	ignitionFailure: kn("ignitionFailure"),
	turbulence: kn("turbulence")
};
function jn(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 569420461), t = Math.imul(t ^ t >>> 15, 3545902487), (t ^ t >>> 15) >>> 0;
}
function Mn(e, t, n) {
	let r = An[t], i = jn(e >>> 0 ^ r);
	return i = jn(i ^ n >>> 0), i = jn(i ^ Math.imul(n >>> 0, 2654435769)), i >>> 0;
}
function Nn(e, t, n) {
	return Mn(e.seed, t, n) / 4294967296;
}
function Pn(e, t) {
	let n = Nn(e, t, e.counters[t]);
	return e.counters[t] += 1, n;
}
//#endregion
//#region src/core/physics/wind.ts
var Fn = 18.3, In = .52, Ln = 2, Rn = 1, zn = .3048, Bn = 20 * zn, Vn = 10 * zn, Hn = 1e3 * zn;
function Un(e) {
	return In * Math.max(Math.abs(e), Ln) ** -.75;
}
function Wn(e, t) {
	return e === 0 ? 0 : e * (Math.min(Math.max(t, Rn), 150) / Fn) ** Un(e);
}
function j(e, t) {
	return Wn(e.wind, t) + e.gust;
}
function Gn(e, t, n) {
	let r = Math.min(Math.max(t, Vn), Hn) / zn, i = .177 + 823e-6 * r, a = .1 * Math.abs(e);
	return n.sigmaW = a, n.sigmaU = a / i ** .4, n.lengthW = r * zn, n.lengthU = r / i ** 1.2 * zn, n;
}
var Kn = {
	sigmaU: 0,
	sigmaW: 0,
	lengthU: 0,
	lengthW: 0
}, qn = Math.sqrt(3), Jn = 2;
function Yn(e, t, n, r, i, a) {
	if (e.wind === 0) return;
	Gn(Wn(e.wind, Bn), n, Kn);
	let o = Math.hypot(r - Wn(e.wind, n), i), s = Math.sqrt(-2 * Math.log(1 - Pn(t, "turbulence"))), c = 2 * Math.PI * Pn(t, "turbulence"), l = s * Math.cos(c), u = s * Math.sin(c), d = Math.exp(-o * a / Kn.lengthU);
	e.turbulenceU = d * e.turbulenceU + Math.sqrt(1 - d * d) * l;
	let f = Math.exp(-o * a / Kn.lengthW), p = e.turbulenceW1;
	e.turbulenceW1 = f * p + Math.sqrt(1 - f * f) * u, e.turbulenceW2 = f * e.turbulenceW2 + (1 - f) * p, e.gust = Kn.sigmaU * e.turbulenceU, e.gustVertical = Kn.sigmaW / Math.sqrt(Jn) * (qn * e.turbulenceW1 + (1 - qn) * e.turbulenceW2);
}
E.tankBottom, E.propellantCapacity, E.loxTankHeight, E.ch4TankHeight, E.ch4TankBottom, E.dryCentreOfMass, E.aftFinStation, E.rcsStation, E.frontFinStation;
function Xn(e, t = E) {
	return Math.min(1, Math.max(0, e / t.propellantCapacity));
}
function Zn(e, t = E) {
	let n = Xn(e, t), r = t.tankBottom + n * t.loxTankHeight / 2, i = t.ch4TankBottom + n * t.ch4TankHeight / 2;
	return Re * r + (1 - Re) * i;
}
function Qn(e, t = E) {
	let n = Math.max(0, e);
	return (t.dryMass * t.dryCentreOfMass + n * Zn(n, t)) / (t.dryMass + n);
}
function $n(e, t, n) {
	return e * ((n.diameter / 2) ** 2 / 4 + t ** 2 / 12);
}
function er(e, t = E) {
	let n = Math.max(0, e), r = Qn(n, t), i = Xn(n, t), a = $n(t.dryMass, t.height, t) + t.dryMass * (t.dryCentreOfMass - r) ** 2, o = n * Re, s = i * t.loxTankHeight, c = t.tankBottom + s / 2, l = $n(o, s, t) + o * (c - r) ** 2, u = n * (1 - Re), d = i * t.ch4TankHeight, f = t.ch4TankBottom + d / 2, p = $n(u, d, t) + u * (f - r) ** 2;
	return a + l + p;
}
function tr(e, t = E.height) {
	return (e ** 4 + (t - e) ** 4) / 4;
}
function nr(e, t, n = E) {
	let r = Qn(e, n);
	t.centreOfMassX = 0, t.centreOfMass = r, t.momentOfInertia = er(e, n), t.engineArm = r, t.aftFinArm = r - n.aftFinStation, t.frontFinArm = n.frontFinStation - r, t.rcsArm = n.rcsStation - r, t.rCubedIntegral = tr(r, n.height);
}
function rr(e = 0, t = E) {
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
	return nr(e, n, t), n;
}
//#endregion
//#region src/core/physics/grid-fins.ts
function ir() {
	return {
		forceX: 0,
		forceY: 0,
		torque: 0,
		drag: 0,
		lift: 0
	};
}
function ar(e, t, n, r, i, a, o, s) {
	s.forceX = s.forceY = s.torque = s.drag = s.lift = 0;
	let c = o.gridFins, l = Math.hypot(t, n);
	if (!c || e <= 0 || l === 0 || r === 0) return;
	let u = Math.max(-c.maxAngle, Math.min(c.maxAngle, r)), d = .5 * e * l * l * c.area;
	s.lift = d * Math.sin(2 * u), s.drag = d * 1.2 * Math.sin(u) ** 2, s.forceX = (-n * s.lift - t * s.drag) / l, s.forceY = (t * s.lift - n * s.drag) / l, s.torque = (c.station - a) * (Math.cos(i) * s.forceX - Math.sin(i) * s.forceY);
}
//#endregion
//#region src/core/physics/damage-material.ts
var or = 7920, sr = 293.15, cr = 1473.15;
function lr(e) {
	if (!Number.isFinite(e) || e < 4 || e > 1473.15) throw RangeError("304 thermal temperature must be within4–1473.15K");
}
var ur = [
	22.0061,
	-127.5528,
	303.647,
	-381.0098,
	274.0328,
	-112.9212,
	24.7593,
	-2.239153
], dr = [
	-1.4087,
	1.3982,
	.2543,
	-.626,
	.2334,
	.4256,
	-.4658,
	.165,
	-.0199
], fr = 273.15, pr = 20, mr = .0625, hr = Math.ceil(269.15 / mr), M = /* @__PURE__ */ new Float64Array(4308), gr = /* @__PURE__ */ new Float64Array(4308);
function _r(e, t) {
	let n = Math.log10(e), r = 0;
	for (let e = t.length - 1; e >= 0; e--) r = r * n + t[e];
	return 10 ** r;
}
function vr(e) {
	return Math.min(fr, 4 + e * mr);
}
for (let e = 0; e <= hr; e++) {
	let t = vr(e);
	if (M[e] = _r(t, ur), e > 0) {
		let n = t - vr(e - 1);
		gr[e] = gr[e - 1] + n * (M[e - 1] + M[e]) / 2;
	}
}
function yr(e) {
	return 6.683 + .04906 * e + 80.74 * Math.log(e);
}
function br(e) {
	return 9.705 + .0176 * e - 16e-7 * e ** 2;
}
var xr = M[hr], Sr = yr(sr), Cr = _r(fr, dr), wr = br(sr), Tr = pr * (xr + Sr) / 2, Er = -gr[hr] - Tr;
function Dr(e) {
	return Math.min(4306, Math.floor((e - 4) / mr));
}
function Or(e) {
	return (e - fr) / pr;
}
function kr(e, t, n) {
	return e + (t - e) * n ** 2 * (3 - 2 * n);
}
function Ar(e) {
	if (lr(e), e >= 293.15) return yr(e);
	if (e >= fr) return kr(xr, Sr, Or(e));
	let t = Dr(e), n = (e - vr(t)) / (vr(t + 1) - vr(t));
	return M[t] + n * (M[t + 1] - M[t]);
}
function jr(e) {
	return lr(e), e >= 293.15 ? br(e) : e >= fr ? kr(Cr, wr, Or(e)) : _r(e, dr);
}
function Mr(e) {
	return 6.683 * e + .02453 * e ** 2 + 80.74 * (e * Math.log(e) - e);
}
var Nr = Mr(sr), Pr = Mr(cr) - Nr;
function Fr(e) {
	if (e >= 293.15) return Mr(e) - Nr;
	if (e >= fr) {
		let t = Or(e);
		return -Tr + pr * (xr * t + (Sr - xr) * (t ** 3 - t ** 4 / 2));
	}
	let t = Dr(e), n = e - vr(t), r = vr(t + 1) - vr(t), i = (M[t + 1] - M[t]) / r;
	return Er + gr[t] + M[t] * n + i * n ** 2 / 2;
}
function Ir(e) {
	return lr(e), Fr(e);
}
function Lr(e) {
	let t = 4, n = cr;
	for (let r = 0; r < 48; r++) {
		let r = (t + n) / 2;
		Fr(r) < e ? t = r : n = r;
	}
	return (t + n) / 2;
}
function Rr(e) {
	if (e < -Tr) {
		let t = 0, n = hr;
		for (; n - t > 1;) {
			let r = Math.floor((t + n) / 2);
			Er + gr[r] <= e ? t = r : n = r;
		}
		let r = vr(t + 1) - vr(t), i = M[t], a = (M[t + 1] - i) / r, o = e - (Er + gr[t]), s = 2 * o / (i + Math.sqrt(i * i + 2 * a * o));
		return vr(t) + s;
	}
	let t = e < 0 ? fr : sr, n = e < 0 ? sr : cr, r = e < 0 ? -Tr : 0, i = e < 0 ? 0 : Pr, a = t + (n - t) * (e - r) / (i - r);
	for (let r = 0; r < 6; r++) {
		let r = Fr(a);
		if (r === e) break;
		r < e ? t = a : n = a;
		let i = a - (r - e) / Ar(a);
		if (i === a) break;
		a = i > t && i < n ? i : (t + n) / 2;
	}
	return a;
}
function zr(e) {
	if (!Number.isFinite(e) || e < Er || e > Pr) throw RangeError("304 specific enthalpy is outside the thermal fit domain");
	if (e === 0) return sr;
	if (e === Er) return 4;
	if (e === Pr) return cr;
	let t = Rr(e), n = 4, r = cr, i = n, a = r;
	for (let e = 0; e < 48; e++) {
		let o = (n + r) / 2;
		o < t ? n = o : r = o, e === 39 && (i = n, a = r);
	}
	if (Fr(n) < e && Fr(r) >= e) return (n + r) / 2;
	if (Fr(i) < e && Fr(a) >= e) {
		n = i, r = a;
		for (let t = 40; t < 48; t++) {
			let t = (n + r) / 2;
			Fr(t) < e ? n = t : r = t;
		}
		return (n + r) / 2;
	}
	return Lr(e);
}
var Br = [
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
function Vr(e, t) {
	if (!Number.isFinite(e) || e <= 0) throw RangeError("304 mechanical temperature must be finite and positiveK");
	if (e > 1173.15) return 0;
	let n = 373.15, r = Br[0][t];
	if (e <= n) return r;
	for (let i of Br) {
		if (e <= i[0]) {
			let a = (e - n) / (i[0] - n);
			return r + a * (i[t] - r);
		}
		n = i[0], r = i[t];
	}
	return 0;
}
function Hr(e) {
	return Vr(e, 1);
}
function Ur(e) {
	return Vr(e, 2);
}
//#endregion
//#region src/core/physics/tps-material.ts
var Wr = 116.483, Gr = 1922.04, Kr = 116.667, qr = 1922.22, Jr = 101330, Yr = 293.15, N = [
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
], Xr = [
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
], Zr = [
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
function Qr(e, t, n) {
	if (!Number.isFinite(e) || e < t || e > n) throw RangeError("LI900 temperature is outside its material property data domain");
}
function $r(e) {
	if (!Number.isFinite(e) || e < 0 || e > 101330) throw RangeError("LI900 pressure must be within0–101330Pa");
}
var ei = new Float64Array(N.length);
for (let e = 1; e < N.length; e++) {
	let t = N[e - 1], n = N[e];
	ei[e] = ei[e - 1] + (n[0] - t[0]) * (t[1] + n[1]) / 2;
}
function ti(e) {
	for (let t = 1; t < N.length; t++) if (e < N[t][0]) return t - 1;
	return N.length - 2;
}
function ni(e) {
	let t = ti(e), n = N[t], r = N[t + 1];
	if (e === r[0]) return ei[t + 1];
	let i = e - n[0], a = (r[1] - n[1]) / (r[0] - n[0]);
	return ei[t] + n[1] * i + a * i ** 2 / 2;
}
var ri = ni(Yr), ii = -ri, ai = ei[N.length - 1] - ri;
function oi(e) {
	Qr(e, Wr, Gr);
	let t = ti(e), n = N[t], r = N[t + 1];
	if (e === r[0]) return r[1];
	let i = (e - n[0]) / (r[0] - n[0]);
	return n[1] + i * (r[1] - n[1]);
}
function si(e) {
	return Qr(e, Wr, Gr), ni(e) - ri;
}
function ci(e) {
	if (!Number.isFinite(e) || e < ii || e > ai) throw RangeError("LI900 specific enthalpy is outside the heat-capacity data domain");
	if (e === 0) return Yr;
	if (e === ii) return Wr;
	if (e === ai) return Gr;
	let t = e + ri, n = 0, r = N.length - 1;
	for (; r - n > 1;) {
		let e = Math.floor((n + r) / 2);
		ei[e] <= t ? n = e : r = e;
	}
	let i = N[n], a = N[n + 1], o = (a[1] - i[1]) / (a[0] - i[0]), s = t - ei[n], c = 2 * s / (i[1] + Math.sqrt(i[1] ** 2 + 2 * o * s));
	return Math.max(i[0], Math.min(a[0], i[0] + c));
}
function li(e, t) {
	let n = Zr[0];
	if (t <= n[0]) return n[1][e];
	for (let n = 1; n < Zr.length; n++) {
		let r = Zr[n];
		if (t === r[0]) return r[1][e];
		if (t < r[0]) {
			let i = Zr[n - 1], a = Math.log(t / i[0]) / Math.log(r[0] / i[0]);
			return i[1][e] + a * (r[1][e] - i[1][e]);
		}
	}
	return Zr[Zr.length - 1][1][e];
}
function ui(e, t) {
	for (let n = 1; n < Xr.length; n++) {
		let r = Xr[n];
		if (e === r) return li(n, t);
		if (e < r) {
			let i = Xr[n - 1], a = li(n - 1, t), o = li(n, t);
			return a + (e - i) / (r - i) * (o - a);
		}
	}
	return li(Xr.length - 1, t);
}
function di(e, t) {
	return Qr(e, Kr, qr), $r(t), ui(e, t);
}
function fi(e, t, n) {
	if (Qr(e, Kr, qr), Qr(t, Kr, qr), $r(n), e === t) return ui(e, n);
	let r = Math.min(e, t), i = Math.max(e, t), a = 0;
	for (let e = 1; e < Xr.length; e++) {
		let t = Math.max(r, Xr[e - 1]), o = Math.min(i, Xr[e]);
		o > t && (a += (o - t) * (ui(t, n) + ui(o, n)) / 2);
	}
	return a / (i - r);
}
var pi = /* @__PURE__ */ function(e) {
	return e[e.None = 0] = "None", e[e.ProofExceeded = 1] = "ProofExceeded", e[e.MaterialDomain = 2] = "MaterialDomain", e[e.Terminal = 3] = "Terminal", e;
}({});
function mi(e, t) {
	if (!Number.isFinite(e) || !Number.isFinite(t)) throw RangeError("Thermal state requires finite temperature and energy");
	return {
		valid: !0,
		temperature: e,
		energy: t
	};
}
function hi(e, t) {
	let r = e.components.length;
	if (r < 1 || r > 12) throw RangeError("Damage inventory must contain1–12 components");
	if (!(e.hullThermalMass > 0) || !Number.isFinite(e.hullThermalMass)) throw RangeError("Damage state requires positive finite hull thermal mass");
	let i = Ir(t), a = e.components.some((e) => e.tpsMass > 0), o = 0;
	if (a) {
		if (t < 116.667 || t > 1922.04) throw RangeError("TPS ambient temperature is outside its thermal data domains");
		o = si(t);
	}
	let s = e.components.map((e, r) => {
		if (!(e.rootMass >= 0 && e.tpsMass >= 0) || !Number.isFinite(e.rootMass + e.tpsMass)) throw RangeError("Invalid component thermal mass");
		let a = e.rootMass > 0 ? mi(t, e.rootMass * i) : mi(0, 0), s = () => e.tpsMass > 0 ? mi(t, e.tpsMass / 2 * o) : mi(0, 0);
		return {
			componentIndex: r,
			attached: !0,
			permanentFailure: 0,
			root: a,
			tps: [s(), s()],
			loadedAngle: n(0)
		};
	}), c = s.map((e) => ({
		componentIndex: e.componentIndex,
		active: !1,
		x: 0,
		altitude: 0,
		pitch: n(0),
		speedX: 0,
		speedY: 0,
		angularVelocity: 0
	}));
	return {
		components: s,
		hull: mi(t, e.hullThermalMass * i),
		debris: c,
		terminal: {
			active: !1,
			reason: 0,
			time: 0,
			x: 0,
			altitude: 0,
			pitch: n(0),
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
function gi(e) {
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
function _i(e) {
	let t = .1 * e, n = .15 * e, r = .05 * e, i = .004;
	if (!(t > 2 * i && n > 2 * i)) throw RangeError("Invalid attachment section");
	let a = t * n - (t - 2 * i) * (n - 2 * i), o = (t * n ** 3 - (t - 2 * i) * (n - 2 * i) ** 3) / 12;
	return Object.freeze({
		area: a,
		inertia: o,
		modulus: 2 * o / n,
		length: r,
		heatArea: t * r,
		mass: or * a * r
	});
}
function vi(e, t) {
	return t === "plate" ? Math.sin(e) : Math.hypot(Math.sin(2 * e), 1.2 * Math.sin(e) ** 2);
}
function yi(e, t, n, r, i, a) {
	let o = Math.abs(e), s = a === "plate" ? Math.PI / 2 : Math.PI / 4;
	if (!Number.isFinite(e) || o > s || t < 0 || n < 0 || !Number.isFinite(t) || !Number.isFinite(n)) throw RangeError("Attachment load outside the monotone force domain");
	let c = Hr(r);
	if (c === 0) return 0;
	if (o === 0 || t === 0 || n === 0) return e;
	let l = t * n * i.length / (c * i.inertia), u = o;
	for (let e = 0; e < 2; e++) {
		let e = vi(u, a), t = Math.sin(u), n = Math.cos(u), r = a === "plate" ? n : e === 0 ? 2 : (2 * Math.sin(2 * u) * Math.cos(2 * u) + 2.88 * t ** 3 * n) / e;
		if (u -= (u + l * e - o) / (1 + l * r), !(u > 0 && u <= o)) break;
	}
	if (u > 0 && u <= o) {
		let t = 0, n = o;
		for (let e = 0; e < 40; e++) {
			let e = (t + n) / 2;
			e < u ? t = e : n = e;
		}
		if (t + l * vi(t, a) < o && n + l * vi(n, a) >= o) return Math.sign(e) * (t + n) / 2;
	}
	let d = 0, f = o;
	for (let e = 0; e < 40; e++) {
		let e = (d + f) / 2;
		e + l * vi(e, a) < o ? d = e : f = e;
	}
	return Math.sign(e) * (d + f) / 2;
}
function bi(e, t, n) {
	let r = Ur(t) * n.modulus;
	return r === 0 ? Infinity : Math.abs(e) / r;
}
//#endregion
//#region src/core/physics/vehicle-components.ts
var xi = 1525, Si = .004, Ci = 144, wi = .0254, Ti = 20 * Math.PI / 180;
function Ei(e, t, n, r, i) {
	if (!(t > 0 && i > 0) || !Number.isFinite(t + n + r + i)) throw RangeError("Component slice requires positive finite mass and inertia");
	return Object.freeze({
		role: e,
		mass: t,
		x: n,
		station: r,
		inertia: i
	});
}
function Di(e, t, n, r, i = 0) {
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
function Oi(e, t, n, r, i, a, o, s, c) {
	if (!(n > 0 && r > 0)) throw RangeError("Appendage area and span must be positive");
	let l = n / r, u = or * Si * n, d = i * (o + r / 2), f = i * (o + s.length / 2), p = s.heatArea / s.length, m = u * ((r * i) ** 2 + l ** 2) / 12, h = s.mass * ((s.length * i) ** 2 + p ** 2) / 12, g = [Ei("structure", u, d, a, m), Ei("root", s.mass, f, a, h)];
	if (c) {
		let e = Ci * s.heatArea * wi;
		g.push(Ei("tps", e, f, a, e * ((s.length * i) ** 2 + p ** 2) / 12));
	}
	return Di(e, t, g, {
		x: i * o,
		station: a
	}, r / 2);
}
function ki(e) {
	let { height: t, diameter: n, dryMass: r, dryCentreOfMass: i } = e;
	if (!(t > 0 && n > 0 && r > 0 && i > 0 && i < t) || !Number.isFinite(t + n + r + i)) throw RangeError("Invalid intact vehicle mass geometry");
	let a = n / 2, o = e.id === "ship", s = _i(n), c = [], l = t * (o ? .035 : .03), u = e.engines.length * xi;
	if (c.push(Di(`${o ? "ship" : "booster"}-engine-support`, "engine-support", [Ei("structure", u, 0, l / 2, u * (a ** 2 / 4 + l ** 2 / 12))])), o) {
		let i = r * .05;
		c.push(Di("ship-nose", "nose", [Ei("structure", i, 0, t * .87, i * ((.4 * a) ** 2 + (.08 * t) ** 2) / 5)]));
		for (let t of [!0, !1]) for (let r of [-1, 1]) {
			let i = t ? e.frontFinStation : e.aftFinStation;
			c.push(Oi(`ship-${t ? "front" : "aft"}-flap-${r < 0 ? "left" : "right"}`, "flap", (t ? e.frontFinArea : e.aftFinArea) / 2, n * (t ? .34 : .46), r, i, a, s, !0));
		}
	} else {
		let i = e.gridFins;
		if (!i || !Number.isInteger(i.count) || i.count < 3) throw RangeError("Booster component partition requires a grid inventory");
		let o = r * .02;
		c.push(Di("booster-hot-stage", "hot-stage", [Ei("structure", o, 0, t * .975, o * (a ** 2 / 2 + (.05 * t) ** 2 / 12))]));
		for (let e = 0; e < i.count; e++) c.push(Oi(`booster-grid-${e}`, "grid-fin", i.area / i.count, n * .46, Math.sin(Ti + e * 2 * Math.PI / i.count), i.station, a, s, !1));
	}
	for (let e of c) if (!(e.station >= 0 && e.station <= t)) throw RangeError("Component centroid outside the hull");
	let d = r - c.reduce((e, t) => e + t.mass, 0);
	if (!(d > 0)) throw RangeError("No positive hull mass remains");
	let f = (r * i - c.reduce((e, t) => e + t.mass * t.station, 0)) / d, p = -c.reduce((e, t) => e + t.mass * t.x, 0) / d, m = r * (a ** 2 / 4 + t ** 2 / 12), h = (m - c.reduce((e, t) => e + t.inertia + t.mass * (t.x ** 2 + (t.station - i) ** 2), 0) - d * (p ** 2 + (f - i) ** 2)) / d - a ** 2 / 4, g = t * (o ? .055 : .05), _ = t * (o ? .72 : .93), v = t * (o ? .3 : .5), y = (f - g) * (_ - f);
	if (!(f > g && f < _ && h > 0 && h < y)) throw RangeError("Hull residual moments have no positive supported partition");
	let b = h / y, x = d * b * (_ - f) / (_ - g), ee = d * b * (f - g) / (_ - g), te = d - x - ee, ne = [
		Ei("structure", x, p, g, x * a ** 2 / 4),
		Ei("structure", te, p, f, te * a ** 2 / 4),
		Ei("structure", ee, p, _, ee * a ** 2 / 4)
	], S = o ? "ship" : "booster", C = Di(`${S}-hull-aft`, "hull", ne.filter((e) => e.station < v)), re = Di(`${S}-hull-forward`, "hull", ne.filter((e) => e.station >= v));
	return c.push(C, re), Object.freeze({
		id: e.id,
		dryMass: r,
		dryCentreOfMassX: 0,
		dryCentreOfMass: i,
		dryMomentOfInertia: m,
		hullThermalMass: C.mass + re.mass,
		rootSection: s,
		components: Object.freeze(c)
	});
}
//#endregion
//#region src/core/physics/damage-thermal.ts
var Ai = 4096, ji = .8, Mi = 8, Ni = .0254, Pi = Ni / 2, Fi = Ni / 4, Ii = Math.max(Wr, Kr), Li = Math.min(Gr, qr), Ri = ji * pe, zi = Ir(4), Bi = Ir(cr), Vi = si(Ii), Hi = si(Li);
function Ui(e) {
	let t = e.components.length, n = e.rootSection;
	if (t < 1 || t > 12 || !(e.hullThermalMass > 0 && n.area > 0 && n.length > 0 && n.heatArea > 0) || !Number.isFinite(e.hullThermalMass + n.area + n.length + n.heatArea)) throw RangeError("Invalid thermal catalogue geometry/inventory");
	let r = Ar(4), i = jr(cr), a = oi(Wr), o = di(qr, Jr), s = n.length / 2, c = n.area / s, l = s / n.area, u = i * c, d = 4 * Ri * n.heatArea * cr ** 3, f = 4 * Ri * n.heatArea * Li ** 3, p = [], m = Infinity, h = 0;
	for (let s = 0; s < t; s++) {
		let t = e.components[s];
		if (!(t.rootMass >= 0 && t.tpsMass >= 0) || !Number.isFinite(t.rootMass + t.tpsMass)) throw RangeError("Invalid component thermal masses");
		if (t.rootMass === 0) {
			if (t.tpsMass > 0) throw RangeError("TPS column requires a finite root");
			continue;
		}
		let g = t.tpsMass / 2, _ = t.rootMass * r;
		if (g > 0) {
			let e = o * n.heatArea / Pi, t = 1 / (Fi / (o * n.heatArea) + l / i), r = g * a;
			m = Math.min(m, r / (e + f), r / (e + t), _ / (t + u));
		} else m = Math.min(m, _ / (u + d));
		h += u, p.push(Object.freeze({
			componentIndex: s,
			rootMass: t.rootMass,
			tpsCellMass: g,
			heatArea: n.heatArea,
			steelPathRatio: c,
			steelResistanceRatio: l,
			rootMinEnergy: t.rootMass * zi,
			rootMaxEnergy: t.rootMass * Bi,
			tpsMinEnergy: g * Vi,
			tpsMaxEnergy: g * Hi
		}));
	}
	return h > 0 && (m = Math.min(m, e.hullThermalMass * r / h)), Object.freeze({
		componentCount: t,
		columns: Object.freeze(p),
		hullMass: e.hullThermalMass,
		hullMinEnergy: e.hullThermalMass * zi,
		hullMaxEnergy: e.hullThermalMass * Bi,
		safeStep: m
	});
}
function Wi(e, t, n) {
	if (!Number.isFinite(e.temperature) || e.temperature < t || e.temperature > n || !Number.isFinite(e.energy)) throw RangeError("Valid thermal node has invalid temperature/energy");
}
function Gi(e, t, n, r, i, a) {
	return e.energy += t, !Number.isFinite(e.energy) || e.energy < r || e.energy > i ? (e.valid = !1, !1) : (t !== 0 && (e.temperature = e.energy === r ? a ? Ii : 4 : e.energy === i ? a ? Li : cr : a ? ci(e.energy / n) : zr(e.energy / n)), !0);
}
function Ki(e, t, n, r, i, a) {
	if (!Number.isFinite(n) || n < 0 || n > t.safeStep * Mi || !Number.isFinite(r) || r < 0 || !Number.isFinite(i) || i < 186 || i > 1473.15 || !Number.isFinite(a) || a < 0 || a > 101330 || e.components.length !== t.componentCount) throw RangeError("Thermal forcing/inventory outside the supported numerical contract");
	let o = e.hull.valid ? 0 : Ai;
	for (let n of t.columns) {
		let t = e.components[n.componentIndex];
		if (t.componentIndex !== n.componentIndex) throw RangeError("Thermal catalogue identity mismatch");
		t.attached && (!t.root.valid || n.tpsCellMass > 0 && (!t.tps[0].valid || !t.tps[1].valid)) && (o |= 1 << n.componentIndex);
	}
	if (o !== 0 || n === 0) return o;
	Wi(e.hull, 4, cr);
	for (let n of t.columns) {
		let t = e.components[n.componentIndex];
		t.attached && (Wi(t.root, 4, cr), n.tpsCellMass > 0 && (Wi(t.tps[0], Ii, Li), Wi(t.tps[1], Ii, Li)));
	}
	let s = Math.min(Mi, Math.max(1, Math.ceil(n / t.safeStep))), c = n / s, l = i ** 4;
	for (let n = 0; n < s; n++) {
		let n = e.hull.temperature, i = jr(n), s = 0;
		for (let u of t.columns) {
			let t = e.components[u.componentIndex];
			if (!t.attached) continue;
			let d = t.root.temperature, f = jr(d), p = c * (f + i) / 2 * u.steelPathRatio * (d - n);
			s += p;
			let m = -p, h = !0;
			if (u.tpsCellMass > 0) {
				let e = t.tps[0], n = t.tps[1], i = e.temperature, o = n.temperature, s = c * fi(i, o, a) * u.heatArea / Pi * (i - o), p = c * (o - d) / (Fi / (di(o, a) * u.heatArea) + u.steelResistanceRatio / f), g = c * u.heatArea * (r - Ri * (i ** 4 - l));
				m += p, h = Gi(e, g - s, u.tpsCellMass, u.tpsMinEnergy, u.tpsMaxEnergy, !0), Gi(n, s - p, u.tpsCellMass, u.tpsMinEnergy, u.tpsMaxEnergy, !0) || (h = !1);
			} else m += c * u.heatArea * (r - Ri * (d ** 4 - l));
			Gi(t.root, m, u.rootMass, u.rootMinEnergy, u.rootMaxEnergy, !1) || (h = !1), h || (o |= 1 << u.componentIndex);
		}
		if (Gi(e.hull, s, t.hullMass, t.hullMinEnergy, t.hullMaxEnergy, !1) || (o |= Ai), o !== 0) return o;
	}
	return 0;
}
//#endregion
//#region src/core/physics/damage-controls.ts
function qi(e, t) {
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
function Ji(e) {
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
function Yi(e, t, n, r, i) {
	if (!(n >= 0 && r >= 0 && r <= 1) || !Number.isFinite(n) || e.components.length !== t.componentCount || i.loadedAngles.length < t.componentCount) throw RangeError("Invalid component control forcing or inventory");
}
function Xi(e, t, n, r, i, a, o) {
	Yi(e, t, n, r, o), o.frontArea = o.aftArea = o.gridLiftArea = o.gridDragArea = 0, o.frontFraction = o.aftFraction = 0, o.proofMask = o.domainMask = 0, o.loadedAngles.fill(0);
	for (let s of t.columns) {
		let c = e.components[s.index];
		if (!c.attached || c.permanentFailure !== pi.None) continue;
		if (!c.root.valid || Ur(c.root.temperature) === 0) {
			o.domainMask |= 1 << s.index;
			continue;
		}
		let l = s.group === "grid", u = s.group === "aft" ? a : i, d = n * s.area * (l ? 1 : 2 * r), f = l ? "grid" : "plate", p = yi(u, d, s.lever, c.root.temperature, t.root, f);
		if (o.loadedAngles[s.index] = p, bi(d * vi(Math.abs(p), f) * s.lever, c.root.temperature, t.root) > 1) {
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
function Zi(e, t) {
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
var Qi = {
	airDensity: 0,
	airTemperature: 0,
	airPressure: 0
};
function $i(e, t, n) {
	if (!(t >= 0 && n >= 0) || !Number.isFinite(t + n)) throw RangeError("Debris drag requires finite nonnegative coefficient and time");
	let r = Math.hypot(e.speedX, e.speedY), i = 1 / (1 + t * r * n);
	return e.speedX *= i, e.speedY *= i, -.5 * r * r * (1 - i) * (1 + i);
}
function ea(e, t, n) {
	$t(e.altitude, Qi);
	let r = Ze(Math.hypot(e.speedX, e.speedY) / rn(Qi.airTemperature));
	$i(e, Qi.airDensity * r * t.dragMultiplier * t.dragArea / (2 * t.mass), n);
}
function ta(e, t, r) {
	if (!(r >= 0) || !Number.isFinite(r) || e.debris.length !== t.pieces.length) throw RangeError("Debris advance requires matching inventory and finite nonnegative time");
	for (let t = 0; t < e.debris.length; t++) {
		let n = e.debris[t];
		if (n.componentIndex !== t || n.active && !Number.isFinite(n.x + n.altitude + n.speedX + n.speedY + n.pitch + n.angularVelocity)) throw RangeError("Debris active pose and source index must be finite and valid");
	}
	if (r !== 0) for (let i = 0; i < e.debris.length; i++) {
		let a = e.debris[i];
		if (!a.active) continue;
		let o = t.pieces[i];
		if (a.altitude <= o.supportRadius) {
			a.altitude = o.supportRadius, a.speedX = a.speedY = a.angularVelocity = 0;
			continue;
		}
		ea(a, o, r / 2);
		let c = a.x, l = a.altitude, u = a.speedX, d = a.speedY, f = s + l, p = Cn(f, u, d), m = A(f, u), h = c + u * r + .5 * p * r * r, g = l + d * r + .5 * m * r * r;
		if (g <= o.supportRadius) {
			let e = (l - o.supportRadius) / (l - g);
			a.x = c + (h - c) * e, a.altitude = o.supportRadius, a.pitch = n(a.pitch + a.angularVelocity * r * e), a.speedX = a.speedY = a.angularVelocity = 0;
			continue;
		}
		let _ = s + g;
		a.x = h, a.altitude = g, a.speedX = u + .5 * (p + Cn(_, u + p * r, d + m * r)) * r, a.speedY = d + .5 * (m + A(_, u + p * r)) * r, a.pitch = n(a.pitch + a.angularVelocity * r), ea(a, o, r / 2);
	}
}
//#endregion
//#region src/core/physics/damage-model.ts
var na = /* @__PURE__ */ new WeakMap();
function P(e) {
	let t = na.get(e);
	if (t) return t;
	let n = ki(e), r = Object.freeze({
		partition: n,
		thermal: Ui(n),
		controls: qi(n, e),
		debris: Zi(n, e)
	});
	return na.set(e, r), r;
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
function ra(e, t, n, r, i) {
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
		i.retainedDryMass += c.mass, o += c.mass * c.x, s += c.mass * c.station, c.kind === "flap" ? c.id.startsWith("ship-front-flap-") ? i.frontFinCount++ : c.id.startsWith("ship-aft-flap-") && i.aftFinCount++ : c.kind === "grid-fin" ? i.gridFinCount++ : c.kind === "engine-support" && (i.engineSupportAvailable = r.permanentFailure === pi.None);
	}
	if (i.frontFinArea = r.frontFinArea * i.frontFinCount / 2, i.aftFinArea = r.aftFinArea * i.aftFinCount / 2, i.gridFinArea = r.gridFins ? r.gridFins.area * i.gridFinCount / r.gridFins.count : 0, a) {
		i.retainedDryMass = r.dryMass, i.dryCentreOfMassX = t.dryCentreOfMassX, i.dryCentreOfMass = r.dryCentreOfMass, i.dryMomentOfInertia = t.dryMomentOfInertia, i.totalMass = r.dryMass + i.propellantMass, i.hasMass = !0, i.centreOfMassX = 0, i.centreOfMass = Qn(i.propellantMass, r), i.momentOfInertia = er(i.propellantMass, r);
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
	let c = Math.min(1, i.propellantMass / r.propellantCapacity), l = i.propellantMass * Re, u = i.propellantMass * (1 - Re), d = r.loxTankHeight * c, f = r.ch4TankHeight * c, p = r.tankBottom + d / 2, m = r.ch4TankBottom + f / 2;
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
	if (e.damage ? ra(e.damage, P(t).partition, e.vehicle.propellantMass, t, n) : (n.hasMass = !0, n.retainedDryMass = t.dryMass, n.propellantMass = Math.max(0, e.vehicle.propellantMass), n.totalMass = t.dryMass + n.propellantMass, n.dryCentreOfMassX = n.centreOfMassX = 0, n.dryCentreOfMass = t.dryCentreOfMass, n.dryMomentOfInertia = t.dryMass * ((t.diameter / 2) ** 2 / 4 + t.height ** 2 / 12), n.centreOfMass = Qn(n.propellantMass, t), n.momentOfInertia = er(n.propellantMass, t), n.frontFinCount = t.frontFinArea > 0 ? 2 : 0, n.aftFinCount = t.aftFinArea > 0 ? 2 : 0, n.gridFinCount = t.gridFins?.count ?? 0, n.frontFinArea = t.frontFinArea, n.aftFinArea = t.aftFinArea, n.gridFinArea = t.gridFins?.area ?? 0, n.engineSupportAvailable = !0), r) {
		if (!e.damage) {
			nr(e.vehicle.propellantMass, r, t);
			return;
		}
		r.centreOfMassX = n.centreOfMassX, r.centreOfMass = n.centreOfMass, r.momentOfInertia = n.momentOfInertia, r.engineArm = n.centreOfMass, r.aftFinArm = n.centreOfMass - t.aftFinStation, r.frontFinArm = t.frontFinStation - n.centreOfMass, r.rcsArm = t.rcsStation - n.centreOfMass, r.rCubedIntegral = tr(n.centreOfMass, t.height);
	}
}
//#endregion
//#region src/core/physics/damage-detachment.ts
function ia() {
	return {
		before: F(),
		after: F()
	};
}
function aa(e, t, n, r, i, a, o, s) {
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
	if (o !== pi.ProofExceeded && o !== pi.MaterialDomain && o !== pi.Terminal) throw RangeError("Detachment requires a permanent connection disposition");
	if (ra(e, t, r, n, s.before), !s.before.hasMass) throw RangeError("Cannot detach from an empty physical owner");
	let d = s.before, f = Math.cos(i.pitch), p = Math.sin(i.pitch);
	for (let n = 0; n < c; n++) if (l & 1 << n) {
		let r = t.components[n], a = e.components[n], s = e.debris[n], c = r.x - d.centreOfMassX, l = r.station - d.centreOfMass, u = f * c + p * l, m = -p * c + f * l;
		s.x = i.x + u, s.altitude = i.altitude + m, s.pitch = i.pitch, s.speedX = i.vx + i.omega * m, s.speedY = i.vy - i.omega * u, s.angularVelocity = i.omega, s.active = !0, a.attached = !1, a.permanentFailure === pi.None && (a.permanentFailure = o);
	}
	if (ra(e, t, r, n, s.after), s.after.hasMass) {
		let e = s.after.centreOfMassX - d.centreOfMassX, t = s.after.centreOfMass - d.centreOfMass, n = f * e + p * t, r = -p * e + f * t;
		i.x += n, i.altitude += r, i.vx += i.omega * r, i.vy -= i.omega * n;
	}
	return e.revision++, e.eventCount += u, l;
}
//#endregion
//#region src/core/physics/thermal.ts
function oa(e, t, n) {
	return fe * e ** 3 * Math.sqrt(t / n);
}
function sa(e, t, n, r) {
	let i = 1 - Math.abs(Math.sin(r)) * (1 - Math.SQRT1_2);
	return oa(e, t, n) * i;
}
function ca(e, t = 0) {
	return (Math.max(0, e) / (me * pe) + t ** 4) ** .25;
}
var la = Ut(It).airTemperature + ge;
function ua(e, t) {
	return e < 86e3 ? t + ge : la;
}
//#endregion
//#region src/core/physics/damage-terminal.ts
var da = /* @__PURE__ */ function(e) {
	return e[e.Impact = 1] = "Impact", e[e.Pressure = 2] = "Pressure", e[e.Temperature = 4] = "Temperature", e[e.Acceleration = 8] = "Acceleration", e[e.MaterialDomain = 16] = "MaterialDomain", e;
}({}), fa = F(), pa = ia(), L = {
	x: 0,
	altitude: 0,
	pitch: n(0),
	vx: 0,
	vy: 0,
	omega: 0
};
function ma(e) {
	let t = e.forces;
	e.engines.running.fill(!1), e.engines.ignitionCountdown.fill(null), t.thrust = t.thrustAcceleration = t.twr = 0, t.paidThrustAccelerationX = t.paidThrustAccelerationY = 0, t.thrustVectorForce = t.thrustVectorAcceleration = 0, t.offAxisThrustDifferenceAcceleration = 0, t.rcsThrust = t.rcsThrustAngularAcceleration = 0;
}
function ha(e, t, n, r) {
	let i = e.damage;
	if (!i || i.terminal.active) return;
	let a = P(t).partition, o = e.kinematics;
	ra(i, a, e.vehicle.propellantMass, t, fa);
	let s = Math.sin(o.pitch), c = Math.cos(o.pitch), l = fa.centreOfMassX, u = fa.centreOfMass - t.height / 2, d = c * l + s * u, f = -s * l + c * u;
	L.x = o.downRangeDistance + d, L.altitude = o.altitude + f, L.pitch = o.pitch, L.omega = o.angularVelocity, L.vx = o.speedX + L.omega * f, L.vy = o.speedY - L.omega * d;
	let p = i.terminal;
	p.reason = n, p.time = r, p.x = L.x, p.altitude = L.altitude, p.pitch = L.pitch, p.speedX = L.vx, p.speedY = L.vy, p.angularVelocity = L.omega, p.retainedDryMass = fa.retainedDryMass, p.retainedPropellant = fa.propellantMass, p.releasedEnergy = 0;
	let m = (1 << a.components.length) - 1;
	aa(i, a, t, e.vehicle.propellantMass, L, m, pi.Terminal, pa), ra(i, a, e.vehicle.propellantMass, t, fa);
	let h = fa.totalMass;
	p.releasedMomentumX = h * L.vx, p.releasedMomentumY = h * L.vy, p.releasedAngularMomentum = fa.momentOfInertia * L.omega + (L.altitude - p.altitude) * p.releasedMomentumX - (L.x - p.x) * p.releasedMomentumY, p.releasedKineticEnergy = .5 * h * (L.vx ** 2 + L.vy ** 2) + .5 * fa.momentOfInertia * L.omega ** 2, e.engines.running.fill(!1), e.engines.failed.fill(!0), e.engines.ignitionCountdown.fill(null), e.vehicle.propellantMass = 0, e.vehicle.vehicleMass = 0, e.vehicle.vehicleMomentOfInertia = 0, p.active = !0;
}
function ga(e) {
	return (e.forces.perceivedG > 13 ? 8 : 0) | (e.forces.surfaceTemperature > 1533 ? 4 : 0) | (e.forces.dynamicPressure > 50 ? 2 : 0) | (e.damage && !e.damage.hull.valid ? 16 : 0);
}
//#endregion
//#region src/core/physics/damage-flight.ts
var _a = F(), R = Ji(12);
function va(e, t, n) {
	I(e, t, _a, n), e.vehicle.vehicleMass = _a.totalMass, (e.damage || n) && (e.vehicle.vehicleMomentOfInertia = _a.momentOfInertia);
}
function ya(e, t) {
	e.damage && (ra(e.damage, P(t).partition, e.vehicle.propellantMass, t, _a), !_a.engineSupportAvailable && (e.engines.running.fill(!1), e.engines.failed.fill(!0), e.engines.ignitionCountdown.fill(null)));
}
function ba(e, t, n, r, i) {
	let a = t.gridFins ? i ?? (e.vehicle.frontFinExtension - 50) / 50 * t.gridFins.maxAngle : e.vehicle.frontFinExtension * .01 * se;
	Xi(e.damage, P(t).controls, n, r, a, e.vehicle.aftFinExtension * .01 * se, R);
}
function xa(e, t, r, i) {
	if (e.damage) {
		ba(e, t, r, i);
		for (let t = 0; t < e.damage.components.length; t++) {
			let r = e.damage.components[t];
			r.attached && (r.loadedAngle = n(R.loadedAngles[t]));
		}
		e.forces.frontFinEffectiveAreaFraction = R.frontFraction, e.forces.aftFinEffectiveAreaFraction = R.aftFraction, e.vehicle.vehicleInFlightMaxArea = t.maxArea + 1.8 * (R.frontArea + R.aftArea);
	}
}
function Sa(e, t, r, i, a, o, s, c, l) {
	if (!e.damage) {
		ar(t, r, i, l ?? n((e.vehicle.frontFinExtension - 50) / 50 * (s.gridFins?.maxAngle ?? 0)), a, o.centreOfMass, s, c);
		return;
	}
	c.forceX = c.forceY = c.torque = c.drag = c.lift = 0;
	let u = s.gridFins, d = Math.hypot(r, i);
	if (!u || t <= 0 || d === 0) return;
	let f = .5 * t * d * d;
	ba(e, s, f, 0, l);
	let p = P(s).partition.components, m = Math.sin(a), h = Math.cos(a);
	for (let t = 0; t < p.length; t++) {
		let n = p[t];
		if (n.kind !== "grid-fin" || !e.damage.components[t].attached || (R.proofMask | R.domainMask) & 1 << t) continue;
		let a = R.loadedAngles[t], s = f * u.area / u.count * Math.sin(2 * a), l = f * u.area / u.count * 1.2 * Math.sin(a) ** 2, g = (-i * s - r * l) / d, _ = (r * s - i * l) / d, v = n.x - o.centreOfMassX, y = n.station - o.centreOfMass, b = h * v + m * y, x = -m * v + h * y;
		c.forceX += g, c.forceY += _, c.lift += s, c.drag += l, c.torque += x * g - b * _;
	}
}
var Ca = ia(), z = {
	x: 0,
	altitude: 0,
	pitch: n(0),
	vx: 0,
	vy: 0,
	omega: 0
};
function wa(e, t, r, i) {
	let a = e.damage;
	if (!a || a.terminal.active) return 0;
	let o = P(r), s = Ki(a, o.thermal, t, e.forces.thermalPower, ua(e.kinematics.altitude, e.atmosphere.airTemperature), e.atmosphere.airPressure * 1e3), c = ga(e);
	if (c !== 0) {
		if (i !== "hull") throw RangeError("Terminal live state must publish its hull reference");
		return ha(e, r, c, e.world.environmentTime + t), s;
	}
	ba(e, r, e.forces.dynamicPressure * 1e3, Math.abs(Math.sin(e.kinematics.angleInToTheWind)));
	let l = s & ~Ai | R.domainMask, u = R.proofMask & ~l;
	for (let e = 0; e < a.components.length; e++) {
		let t = a.components[e];
		t.attached && !(l & 1 << e) && (t.loadedAngle = n(R.loadedAngles[e]));
	}
	if ((l | u) === 0) return s;
	ra(a, o.partition, e.vehicle.propellantMass, r, _a);
	let d = e.kinematics, f = Math.sin(d.pitch), p = Math.cos(d.pitch), m = i === "hull" ? _a.centreOfMassX : 0, h = i === "hull" ? _a.centreOfMass - r.height / 2 : 0, g = p * m + f * h, _ = -f * m + p * h;
	z.x = d.downRangeDistance + g, z.altitude = d.altitude + _, z.pitch = d.pitch, z.vx = d.speedX + d.angularVelocity * _, z.vy = d.speedY - d.angularVelocity * g, z.omega = d.angularVelocity;
	let v = a.revision, y = aa(a, o.partition, r, e.vehicle.propellantMass, z, l, pi.MaterialDomain, Ca);
	return y |= aa(a, o.partition, r, e.vehicle.propellantMass, z, u, pi.ProofExceeded, Ca), y !== 0 && (a.revision = v + 1), i === "mass" && (d.downRangeDistance = z.x, d.downRangeDistanceNextFrame = z.x, d.altitude = z.altitude, d.speedX = z.vx, d.speedY = z.vy), va(e, r), ya(e, r), y | s & Ai;
}
//#endregion
//#region src/core/control/guidance-physics.ts
var Ta = .1;
function Ea(e) {
	let t = s + e.kinematics.altitude;
	return Math.max(Ta, -A(t, e.kinematics.speedX));
}
function Da(e, t, n = E) {
	return e * T(n.propulsion, "sea-level", t);
}
function Oa() {
	return {
		fallWork: Qa(),
		atmosphere: {
			airTemperature: 0,
			airPressure: 0,
			airDensity: 0
		},
		duration: 0,
		capped: !1,
		inputs: {
			angleOfMotion: n(0),
			angleOfAttack: n(0),
			gimbalPointingDirection: n(0),
			aerodynamicDragAcceleration: 0,
			aerodynamicLiftAcceleration: 0,
			thrustAcceleration: 0,
			fixedThrustAcceleration: 0,
			pitch: n(0)
		},
		acc: {
			x: 0,
			y: 0
		}
	};
}
function ka() {
	if (!("isCanonicalBurnPropulsion" in je)) return !1;
	try {
		let e = Me;
		return typeof e == "function" && e(e, w, T);
	} catch {
		return !1;
	}
}
function Aa() {
	if (!("isCanonicalBurnAero" in Ke)) return !1;
	try {
		let e = ut;
		return typeof e == "function" && e(e, Je);
	} catch {
		return !1;
	}
}
function ja(e, t, r, i, a = E) {
	let o = i.atmosphere;
	$t(e, o);
	let s = t / rn(o.airTemperature);
	return D(o.airDensity, t, Je(n(0), a.maxArea, a), Ze(s)) / r;
}
var B = .05, Ma = 1200;
function Na(e, t, n, r, i, a) {
	let o = e * w(a.propulsion, "sea-level"), s = B * .5, c = r, l = 0, u = t;
	i.capped = !1;
	for (let t = 0; t < Ma; t++) {
		let r = Pa(e, c, l, u, i, a), d = l + r * s, f = Pa(e, c + (l + d) * .5 * s, d, u + o * s, i, a);
		if (f <= 0) return NaN;
		let p = l + f * B;
		if (p >= n) {
			let e = (n - l) / (p - l);
			return i.duration = (t + e) * B, c + (l + .5 * (n - l)) * e * B;
		}
		c += (l + p) * .5 * B, l = p, u += o * B;
	}
	return i.capped = !0, NaN;
}
function Pa(e, t, n, r, i, a) {
	let o = ja(t, n, r, i, a);
	return Da(e, i.atmosphere.airPressure, a) / r + o - bn(s + t);
}
function Fa(e, t, n, r, i, a, o, s, c, l) {
	let u = e * (ka() ? o : w(a.propulsion, "sea-level")), d = B * .5, f = r, p = 0, m = t;
	i.capped = !1;
	for (let t = 0; t < Ma; t++) {
		let r = La(e, f, p, m, i, a, s, c, l), o = p + r * d, h = La(e, f + (p + o) * .5 * d, o, m + u * d, i, a, s, c, l);
		if (h <= 0) return NaN;
		let g = p + h * B;
		if (g >= n) {
			let e = (n - p) / (g - p);
			return i.duration = (t + e) * B, f + (p + .5 * (n - p)) * e * B;
		}
		f += (p + g) * .5 * B, p = g, m += u * B;
	}
	return i.capped = !0, NaN;
}
function Ia(e, t, r, i, a, o) {
	let s = i.atmosphere;
	$t(e, s);
	let c = t / rn(s.airTemperature), l = D, u = s.airDensity;
	return l(u, t, Aa() ? o : Je(n(0), a.maxArea, a), Ze(c)) / r;
}
function La(e, t, n, r, i, a, o, c, l) {
	let u = Ia(t, n, r, i, a, l), d = i.atmosphere.airPressure, f;
	if (ka()) {
		let t = Math.max(0, d) * 1e3;
		f = e * Math.max(0, o - t * c);
	} else f = Da(e, d, a);
	return f / r + u - bn(s + t);
}
var Ra = 24, za = 1;
function Ba(e, t, n, r, i = E) {
	if (e <= 0 || t <= 0) return Infinity;
	let a = t + e * w(i.propulsion, "sea-level") * B + za, o = Da(e, ie / 1e3, i) / a - bn(s + r);
	return o <= 0 ? Infinity : r + Math.max(0, n) ** 2 / (2 * o);
}
function Va(e, t, r, i, a, o = E, c = o.dryMass) {
	if (e <= 0 || t <= 0 || !(c > 0 && c <= t)) return null;
	if (r <= 0) return i;
	let l = e * w(o.propulsion, "sea-level"), u = Da(e, ie / 1e3, o) / t - bn(s);
	if (u <= 0) return null;
	let d = o === Ct && ka() && Aa(), f = d ? w(o.propulsion, "sea-level") : 0, p = d ? f * o.propulsion.standardGravity * o.propulsion.seaLevel.ispVacuum : 0, m = d ? (p - o.propulsion.seaLevel.thrustSeaLevel) / o.propulsion.referencePressurePa : 0, h = d ? Je(n(0), o.maxArea, o) : 0, g = Math.max(t - r / u * l, c), _ = d ? Fa(e, g, r, i, a, o, f, p, m, h) : Na(e, g, r, i, a, o);
	if (Number.isNaN(_)) return null;
	let v = t - l * a.duration - g;
	if (v < 0) return null;
	if (v < za) return _;
	let y = t - l * a.duration, b = NaN, x = 0;
	for (let n = 0; n < Ra; n++) {
		let s = Number.isNaN(b) ? n === 0 ? y : (g + y) / 2 : y - b * (y - g) / (b - v), c = d ? Fa(e, s, r, i, a, o, f, p, m, h) : Na(e, s, r, i, a, o);
		if (a.capped) return null;
		let u = Number.isNaN(c) ? NaN : t - l * a.duration - s;
		if (!Number.isNaN(u) && Math.abs(u) < za) return c;
		if (!Number.isNaN(u) && u > 0 ? (g = s, v = u, _ = c, x === 1 && !Number.isNaN(b) && (b *= .5), x = 1) : (y = s, b = u, x === -1 && (v *= .5), x = -1), y - g < za) break;
	}
	return _;
}
function Ha() {
	return {
		reached: !1,
		time: NaN,
		downRange: 0
	};
}
var Ua = .25, Wa = 4e3, Ga = 2;
function Ka(e, t, r, i, a, o, c, l, u, d = 0, p = 0, m, h) {
	let { inputs: g, acc: _ } = l, v = s + e, y = l.atmosphere;
	$t(Math.max(e, 0), y);
	let b = t - Wn(c, e), x = d === 0 ? b : b - d, ee = p === 0 ? r : r - p, te = Math.sqrt(x * x + ee * ee), ne = Math.atan2(x, ee), S = it(i, ne), C = at(S);
	if (m?.damage) {
		let e = h?.controlModel ?? P(u).controls, t = .5 * y.airDensity * te ** 2;
		if (h && h.zeroControlArea !== null && Number.isFinite(t * h.zeroControlColumnArea * Ga)) Yi(m.damage, e, t, Number.isFinite(C) ? 0 : NaN, Xa), o = h.zeroControlArea;
		else {
			let n = u.gridFins ? (m.vehicle.frontFinExtension - 50) / 50 * u.gridFins.maxAngle : m.vehicle.frontFinExtension * .01 * se, r = m.vehicle.aftFinExtension * .01 * se;
			if (Xi(m.damage, e, t, Math.abs(Math.sin(C)), n, r, Xa), o = u.maxArea + 1.8 * (Xa.frontArea + Xa.aftArea), h && n === 0 && r === 0) {
				h.zeroControlArea = o, h.zeroControlColumnArea = 0;
				for (let t of e.columns) h.zeroControlColumnArea = Math.max(h.zeroControlColumnArea, t.area);
			}
		}
	}
	let re = Je(n(C), o, u), ie = te / rn(y.airTemperature);
	g.angleOfMotion = n(ne), g.angleOfAttack = n(S), g.aerodynamicDragAcceleration = D(y.airDensity, te, re, Ze(ie)) / a, g.aerodynamicLiftAcceleration = Xe(y.airDensity, te, n(C), o) / a, gn(g, f, _), _.x += Cn(v, t, r), _.y = _.y + f + A(v, t);
}
var qa = rr(), Ja = ir(), Ya = F(), Xa = Ji(12);
function Za(e, t, n, r) {
	let i = e.kinematics;
	e.damage && I(e, n, Ya, qa);
	let a = e.damage ? Ya.totalMass : e.vehicle.vehicleMass;
	if (!(a > 0)) {
		r.acc.x = r.acc.y = 0;
		return;
	}
	Ka(i.altitude, i.speedX, i.speedY, t, a, e.vehicle.vehicleInFlightMaxArea, e.world.wind, r, n, e.world.gust, e.world.gustVertical, e), n.gridFins && (e.damage || nr(e.vehicle.propellantMass, qa, n), Sa(e, r.atmosphere.airDensity, i.speedX - Wn(e.world.wind, i.altitude) - e.world.gust, i.speedY - e.world.gustVertical, t, qa, n, Ja), r.acc.x += Ja.forceX / a, r.acc.y += Ja.forceY / a);
}
function Qa() {
	return {
		state: null,
		model: E,
		groundAltitude: 0,
		pitch: n(0),
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
		result: Ha()
	};
}
function $a(e, t, n, r, i) {
	t.damage && I(t, r, Ya), e.state = t, e.model = r, e.groundAltitude = n, e.pitch = i, e.mass = t.damage ? Ya.totalMass : t.vehicle.vehicleMass, e.maxArea = t.vehicle.vehicleInFlightMaxArea, e.referenceWind = t.world.wind, e.zeroControlArea = null, e.zeroControlColumnArea = 0, e.controlModel = t.damage ? P(r).controls : null, e.h = t.kinematics.altitude, e.x = 0, e.vx = t.kinematics.speedX, e.vy = t.kinematics.speedY, e.steps = 0, e.done = !(e.mass > 0), e.result.reached = !1, e.result.time = NaN, e.result.downRange = e.done ? NaN : 0;
}
function eo(e, t, n = E, r = e.kinematics.pitch) {
	let i = Qa();
	return $a(i, e, t, n, r), i;
}
function to(e, t, n) {
	if (e.done) return 0;
	let r = e.state, i = e.model, a = e.pitch, o = e.mass, s = e.maxArea, c = e.referenceWind, l = n.acc, u = Ua * .5, d = e.h, f = e.x, p = e.vx, m = e.vy, h = e.steps, g = 0, _ = Math.min(Math.floor(t), Wa - h);
	for (let t = 0; t < _; t++) {
		Ka(d, p, m, a, o, s, c, n, i, 0, 0, r, e);
		let t = p + l.x * u, _ = m + l.y * u;
		Ka(d + m * u, t, _, a, o, s, c, n, i, 0, 0, r, e);
		let v = p + l.x * Ua, y = m + l.y * Ua, b = d + _ * Ua, x = f + t * Ua, ee = h;
		if (h++, g++, b <= e.groundAltitude) {
			let t = (d - e.groundAltitude) / (d - b);
			e.result.reached = !0, e.result.time = (ee + t) * Ua, e.result.downRange = f + (x - f) * t, d = b, f = x, p = v, m = y, e.done = !0;
			break;
		}
		d = b, f = x, p = v, m = y;
	}
	return e.h = d, e.x = f, e.vx = p, e.vy = m, e.steps = h, e.result.reached || (e.result.downRange = f), h >= 4e3 && (e.done = !0), g;
}
function no(e, t, n, r, i = E, a = e.kinematics.pitch) {
	let o = n.fallWork;
	$a(o, e, t, i, a), to(o, Wa, n), r.reached = o.result.reached, r.time = o.result.time, r.downRange = o.result.downRange, o.state = null;
}
//#endregion
//#region src/core/control/booster-receipts.ts
function ro(e, t) {
	let n = e.autopilot;
	return t === 1 / 120 && !!e.damage && !n.manualControlOn && (n.autoLandOn || n.autoBoostBackOn) && !n.boosterReturnPlan && (n.boosterPhase === "align-boost" || n.boosterPhase === "boostback" && !dt.every((t) => e.engines.running[t]));
}
function io(e, t) {
	for (let n of [
		"boosterFallTime",
		"boosterCoastPitch",
		"boosterForecastBurn"
	]) Object.hasOwn(t.autopilot, n) ? Object.assign(e.autopilot, { [n]: t.autopilot[n] }) : delete e.autopilot[n];
}
function ao(e) {
	if (e && typeof e == "object") {
		for (let t in e) ao(e[t]);
		Object.freeze(e);
	}
	return e;
}
function oo(e) {
	if (!e || typeof e != "object") return e;
	let t = Array.isArray(e) ? [] : {};
	for (let n in e) t[n] = oo(e[n]);
	return t;
}
function so(e, t, n, r, i, a, o, s, c) {
	return Object.freeze({
		input: ao(V(e)),
		expected: ao(V(t)),
		returned: ao(V(n)),
		dt: r,
		advance: i,
		policy: a,
		model: o,
		modelSnapshot: ao(oo(o)),
		lineage: s,
		revision: c
	});
}
function co(e, t) {
	let n = e?.chunks, r = n?.[n.length - 1], i = r?.[r.length - 1];
	return (e?.size ?? 0) < 1024 && (!i || t > i.input.world.environmentTime) && (!r || r.length < 32 || n.length < 32);
}
function lo(e, t) {
	if (!co(e, t.input.world.environmentTime)) return e;
	let n = [...e?.chunks ?? []], r = n[n.length - 1];
	return r && r.length < 32 ? n[n.length - 1] = Object.freeze([...r, t]) : n.push(Object.freeze([t])), Object.freeze({
		chunks: Object.freeze(n),
		size: (e?.size ?? 0) + 1
	});
}
function uo(e, t, n, r, i, a, o, s) {
	let c = 0, l = 0, u = 0;
	for (; c < e.chunks.length;) {
		let n = e.chunks[c];
		for (; l < n.length && n[l].input.world.environmentTime < t.world.environmentTime;) l++, u++;
		if (l < n.length) break;
		c++, l = 0;
	}
	let d = e.chunks[c]?.[l], f;
	if (d && d.input.world.environmentTime === t.world.environmentTime && d.lineage === o && d.revision === s && d.dt === n && d.advance === r && d.policy === i && d.model === a && _o(d.modelSnapshot, a)) {
		let e = V(d.input);
		io(e, t), _o(e, t) && (f = d, l++, u++);
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
function fo(e) {
	return e ? {
		...e,
		handoff: { ...e.handoff }
	} : void 0;
}
function po(e) {
	let t = fo(e.plan);
	return t && (Object.freeze(t.handoff), Object.freeze(t)), Object.freeze({
		...e,
		plan: t
	});
}
function V(e) {
	let t = { ...e.autopilot };
	return delete t.boosterSource, delete t.boosterPrediction, Do({
		...e,
		autopilot: t
	});
}
function mo(e, t) {
	let n = e.autopilot;
	return po({
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
function ho(e, t) {
	let n = e.autopilot;
	t.rangeError === void 0 ? delete n.boosterRangeError : n.boosterRangeError = t.rangeError, t.fallTime === void 0 ? delete n.boosterFallTime : n.boosterFallTime = t.fallTime, t.coastPitch === void 0 ? delete n.boosterCoastPitch : n.boosterCoastPitch = t.coastPitch, t.reached === void 0 ? delete n.boosterForecastReached : n.boosterForecastReached = t.reached;
	let r = fo(t.plan);
	r ? n.boosterReturnPlan = r : delete n.boosterReturnPlan;
}
function go(e) {
	let t = e.autopilot;
	t.boosterSource && (t.boosterSource.valid = !1), delete t.boosterReturnPlan, delete t.boosterCoastPitch, delete t.boosterForecastReached, t.boosterPrediction?.published && (t.boosterPrediction = {
		...t.boosterPrediction,
		published: void 0
	});
}
function _o(e, t, n = !1) {
	if (Object.is(e, t)) return !0;
	if (e === null || t === null || typeof e != "object" || typeof t != "object" || Array.isArray(e) !== Array.isArray(t) || Array.isArray(e) && e.length !== t.length) return !1;
	let r = e, i = t;
	for (let e in r) if (!(n && (e === "boosterSource" || e === "boosterPrediction")) && (!(e in i) || !_o(r[e], i[e], e === "autopilot"))) return !1;
	for (let e in i) if (!(n && (e === "boosterSource" || e === "boosterPrediction")) && !(e in r)) return !1;
	return !0;
}
function vo(e, t) {
	if (!e.damage) return !0;
	let n = e.autopilot, r = n.boosterSource;
	return r ? r.revision !== e.damage.revision || !r.valid || !r.expected || r.expectedDt !== t || !_o(r.expected, e) || n.boosterReturnPlan && n.boosterReturnPlan.sourceLineage !== r.lineageId ? (go(e), !1) : (r.checked = !0, !0) : !n.boosterReturnPlan || (go(e), !1);
}
function yo(e) {
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
		event: mo(e, 0)
	};
}
function bo(e, t, n, r, i, a) {
	let o = e.autopilot.boosterSource;
	if (!o || !o.valid) return 0;
	if (!o.checked || o.returned.world.environmentTime !== e.world.environmentTime) return go(e), 0;
	let s = mo(e, o.event.sequence + 1), c = V(o.returned);
	if (ho(c, s), a) return _o(s, a.event) ? (e.autopilot.boosterSource = {
		...o,
		event: s,
		returned: V(a.returned),
		expected: V(a.expected),
		expectedDt: t,
		checked: !1
	}, 0) : (go(e), 0);
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
	}, l || go(e), 1;
}
function xo(e, t, n, r, i) {
	let a = e.autopilot.boosterSource;
	if (!a?.valid || !a.checked || !a.receipts || a.returned.world.environmentTime !== e.world.environmentTime) return;
	let o = mo(e, a.event.sequence + 1), s = V(a.returned);
	if (ho(s, o), !ro(s, t)) return;
	let c = uo(a.receipts, s, t, n, r, i, a.lineageId, a.revision);
	if (e.autopilot.boosterSource = {
		...a,
		receipts: c.queue
	}, !c.receipt) return;
	let l = V(c.receipt.expected), u = V(c.receipt.returned);
	return io(l, s), io(u, s), {
		event: o,
		expected: l,
		returned: u
	};
}
function So(e, t, n, r, i, a, o, s) {
	let c = e.autopilot.boosterSource;
	if (!n || !wo(e, t, i)) return;
	let l = so(t, n, r, i, a, o, s, c.lineageId, c.revision);
	e.autopilot.boosterSource = {
		...c,
		receipts: lo(c.receipts, l)
	};
}
function Co(e, t) {
	let n = e.autopilot.boosterSource;
	return !!n && _o(mo(e, n.event.sequence + 1), t.event);
}
function wo(e, t, n) {
	let r = e.autopilot.boosterSource;
	return !!r?.valid && ro(t, n) && co(r.receipts, t.world.environmentTime);
}
//#endregion
//#region src/core/state.ts
var To = 1463897163;
function Eo(e = To, t = E) {
	let r = t.height / 2, i = s + r, a = t.dryMass + t.initialPropellant;
	return {
		damage: hi(P(t).partition, ua(r, Ut(r).airTemperature)),
		rng: On(e),
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
			altitude: r,
			downRangeDistance: p,
			downRangeDistanceNextFrame: p,
			distanceToPlanetCenter: i,
			orbitalVelocityAtCurrentAltitude: yn(i),
			trueSpeed: 0,
			speedX: 0,
			speedY: 0,
			machSpeed: 0,
			accelerationX: 0,
			accelerationY: 0,
			totalAcceleration: Math.sqrt(0 + (-f) ** 2),
			pitch: n(0),
			pitchRateOfChange: 0,
			pitchRecord: t.gridFins ? [0, 0] : [Infinity, Infinity],
			angularVelocity: 0,
			angularAcceleration: 0,
			angleOfMotion: n(0),
			angleOfAttack: n(0),
			angleInToTheWind: n(0)
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
			frontFinEffectiveAreaFraction: lt(0, 0, t).frontFinEffectiveAreaFraction,
			aftFinEffectiveAreaFraction: lt(0, 0, t).aftFinEffectiveAreaFraction,
			thermalPower: 0,
			surfaceTemperature: 0,
			dynamicPressure: 0,
			perceivedG: 0,
			perceivedG_X: 0,
			perceivedG_Y: 0
		},
		vehicle: {
			vehicleMass: a,
			propellantMass: t.initialPropellant,
			vehicleMomentOfInertia: t.gridFins ? er(t.initialPropellant, t) : a * (t.diameter / 2) ** 2 * .25 + a * t.height ** 2 / 12,
			vehicleInFlightMaxArea: t.maxArea,
			throttle: 100,
			throttleCurrent: 100,
			gimbalPosition: 0,
			gimbalPointingDirection: n(0),
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
			holdingPitch: n(0),
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
			landingSiteXPos: p,
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
			horizontalAccelerationByAeroBreakingCorrectionAngle: n(0)
		}
	};
}
function Do(e) {
	return {
		damage: e.damage ? gi(e.damage) : null,
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
			...e.autopilot.boosterReturnPlan ? { boosterReturnPlan: fo(e.autopilot.boosterReturnPlan) } : {},
			...e.autopilot.boosterSource ? { boosterSource: {
				...e.autopilot.boosterSource,
				returned: Do(e.autopilot.boosterSource.returned),
				expected: e.autopilot.boosterSource.expected ? Do(e.autopilot.boosterSource.expected) : void 0,
				event: po(e.autopilot.boosterSource.event)
			} } : {}
		}
	};
}
function Oo(e, t = E) {
	let n = lt(e.vehicle.frontFinExtension, e.vehicle.aftFinExtension, t);
	e.forces.frontFinEffectiveAreaFraction = n.frontFinEffectiveAreaFraction, e.forces.aftFinEffectiveAreaFraction = n.aftFinEffectiveAreaFraction, e.vehicle.vehicleInFlightMaxArea = n.vehicleInFlightMaxArea;
}
//#endregion
//#region src/core/physics/engines.ts
function ko(e) {
	let t = 0;
	for (let n of e) n && (t += 1);
	return t;
}
function Ao(e, t, n, r) {
	let i = 0;
	for (let a = 0; a < r.engines.length; a++) r.engines[a].kind === t && e[a] === !0 === n && (i += 1);
	return i;
}
function jo(e, t = E) {
	return Ao(e, "sea-level", !0, t);
}
function Mo(e, t = E) {
	return Ao(e, "sea-level", !1, t);
}
function H(e, t, n = E) {
	return Ao(e, "sea-level", !0, n) * T(n.propulsion, "sea-level", t) + Ao(e, "vacuum", !0, n) * T(n.propulsion, "vacuum", t);
}
function No(e, t, n = E) {
	return H(e, t, n) * 40 * .01;
}
function Po(e, t, n, r = E) {
	return H(e, n, r) * t * .01;
}
function Fo(e, t, n = E) {
	if (n.engines.some((e) => e.gimballed === !1 && e.kind === "sea-level")) {
		let t = 0, r = 0;
		for (let i = 0; i < n.engines.length; i++) e[i] && (t++, n.engines[i].gimballed === !0 && r++);
		return t > 0 ? r / t : 0;
	}
	if (Ao(e, "vacuum", !0, n) === 0) return 1;
	let r = H(e, t, n);
	return r > 0 ? Ao(e, "sea-level", !0, n) * T(n.propulsion, "sea-level", t) / r : 0;
}
function Io(e, t) {
	return e * Math.sin(.01 * t * S);
}
function Lo(e, t, n, r = E) {
	let i = 0, a = 0;
	for (let t = 0; t < r.engines.length; t++) {
		let n = r.engines[t], o = +!!e[t] * n.offAxisForceFraction;
		n.kind === "sea-level" ? i += o : a += o;
	}
	return i * t * .01 * T(r.propulsion, "sea-level", n) + a * t * .01 * T(r.propulsion, "vacuum", n);
}
function Ro(e, t) {
	let r = e - .01 * t * S;
	return r > Math.PI ? r -= 2 * Math.PI : r < -Math.PI && (r += 2 * Math.PI), n(r);
}
function zo(e, t, n = E) {
	return Ao(e, "sea-level", !0, n) * t * .01 * w(n.propulsion, "sea-level") + Ao(e, "vacuum", !0, n) * t * .01 * w(n.propulsion, "vacuum");
}
function Bo(e, t, n = E) {
	ya(e, n);
	let { vehicle: r, engines: i, status: a } = e, o = 1;
	if (r.propellantMass > 0) {
		let e = zo(i.running, r.throttleCurrent, n) * t;
		e > r.propellantMass && (o = r.propellantMass / e), r.propellantMass = Math.max(0, r.propellantMass - e);
	} else r.propellantMass = 0;
	return a.dumpingFuel && ((r.propellantMass > 12e3 || a.forceDump) && r.propellantMass > 0 ? r.propellantMass = Math.max(0, r.propellantMass - _ * t) : a.dumpingFuel = !a.dumpingFuel), va(e, n), o;
}
var Vo = 1.2;
function Ho(e, t) {
	let { engines: n } = e;
	if (n.running[t] || n.failed[t] || n.ignitionCountdown[t] !== null) return;
	let r = Pn(e.rng, "ignitionDelay");
	n.ignitionCountdown[t] = (r * 1.5 + .5) * (600 / 1e3);
}
function Uo(e, t) {
	let n = e.failures.randomFailure ? v : 0, r = Pn(e.rng, "ignitionFailure") < n;
	return r && (e.engines.failed[t] = !0), r;
}
function Wo(e, t) {
	let { engines: n } = e;
	for (let e = 0; e < n.ignitionCountdown.length; e++) {
		let r = n.ignitionCountdown[e];
		if (r == null) continue;
		let i = r - t;
		i <= 0 ? (n.ignitionCountdown[e] = null, n.running[e] = !0) : n.ignitionCountdown[e] = i;
	}
}
function Go(e, t) {
	e.engines.running[t] = !1, e.engines.ignitionCountdown[t] = null;
}
function Ko(e) {
	e.failures.fuelRunOut && (e.engines.running.fill(!1), e.engines.ignitionCountdown.fill(null));
}
function qo(e, t, n, r, i) {
	let a = 0;
	for (let o = 0; o < i.engines.length; o++) if (e[o]) {
		let e = i.engines[o], s = T(i.propulsion, e.kind, n);
		a -= e.offAxis * s * t * .01 * Math.cos(e.gimballed ?? e.kind === "sea-level" ? r : 0);
	}
	return a;
}
//#endregion
//#region src/core/control/booster-return-plan.ts
function Jo(e) {
	delete e.boosterPrediction, delete e.boosterReturnPlan;
}
function Yo(e) {
	let t = e.autopilot, n = e.damage?.revision, r = t.boosterPrediction && t.boosterPrediction.origin.damage?.revision !== n, i = t.boosterReturnPlan && t.boosterReturnPlan.damageRevision !== n;
	return !r && !i ? !1 : (Jo(t), delete t.boosterCoastPitch, delete t.boosterForecastReached, delete t.boosterRangeError, delete t.boosterFallTime, !0);
}
function Xo(e) {
	let t = e.forecast;
	return t.reached && !t.failed && t.fuel > 0 && t.handoff !== void 0 && Number.isFinite(t.rangeError) && Number.isFinite(e.shutdownAt) && Number.isFinite(e.burnDuration) && e.burnDuration >= 0;
}
function Zo(e, t) {
	if (!Xo(e) || !Xo(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || e.coastPitch !== t.coastPitch || t.burnDuration <= e.burnDuration || e.forecast.rangeError * t.forecast.rangeError >= 0) return;
	let n = e.forecast.rangeError / (e.forecast.rangeError - t.forecast.rangeError);
	return e.burnDuration + (t.burnDuration - e.burnDuration) * n;
}
function Qo(e, t, n, r = 0) {
	if (!Xo(e) || !Xo(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || e.coastPitch !== t.coastPitch || e.burnDuration === t.burnDuration || e.forecast.rangeError * t.forecast.rangeError <= 0) return;
	let i = t.forecast.rangeError - e.forecast.rangeError, a = t.burnDuration - t.forecast.rangeError * (t.burnDuration - e.burnDuration) / i, o = t.burnDuration > e.burnDuration ? a > t.burnDuration : a < t.burnDuration;
	return Number.isFinite(a) && o && a > r && a < n ? a : void 0;
}
function $o(e, t, n) {
	if (!(!Xo(e) || !t || !e.forecast.handoff.lateralFeasible || e.shutdownAt <= n)) return {
		originTime: e.originTime,
		shutdownAt: e.shutdownAt,
		...e.damageRevision === void 0 ? {} : { damageRevision: e.damageRevision },
		...e.sourceLineage === void 0 ? {} : { sourceLineage: e.sourceLineage },
		coastPitch: e.coastPitch,
		handoff: { ...e.forecast.handoff }
	};
}
function es(e, t, n, r) {
	if (Zo(n, r) === void 0 || !Xo(e) || !Xo(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || t.damageRevision !== n.damageRevision || t.sourceLineage !== n.sourceLineage || t.originTime !== n.originTime || e.coastPitch !== t.coastPitch || t.coastPitch !== n.coastPitch || e.burnDuration === t.burnDuration) return;
	let i = t.forecast.rangeError - e.forecast.rangeError, a = t.burnDuration - t.forecast.rangeError * (t.burnDuration - e.burnDuration) / i;
	return Number.isFinite(a) && a > n.burnDuration && a < r.burnDuration ? a : void 0;
}
//#endregion
//#region src/core/control/commands.ts
function ts(e, t) {
	let { engines: n, failures: r } = e, i = n.ignitionCountdown[t] !== null;
	!n.running[t] && !i && !n.failed[t] && !r.fuelRunOut ? Uo(e, t) || Ho(e, t) : Go(e, t);
}
function U(e, t = E) {
	let { running: n } = e.engines;
	if (n.some(Boolean)) for (let t = 0; t < n.length; t++) n[t] && ts(e, t);
	else for (let r of t.ignitionGroup) n[r] || ts(e, r);
}
function ns(e) {
	e.status.finActive = !e.status.finActive;
}
function rs(e) {
	e.status.rcsActive = !e.status.rcsActive;
}
function is(e) {
	e.status.dumpingFuel = !e.status.dumpingFuel;
}
function as(e) {
	e.autopilot.autoMaxThrustOn = !e.autopilot.autoMaxThrustOn;
}
function os(e) {
	e.autopilot.autoTakeOffOn = !e.autopilot.autoTakeOffOn;
}
function ss(e) {
	e.autopilot.autoBoostBackOn = !e.autopilot.autoBoostBackOn;
}
function cs(e) {
	e.autopilot.autoLandOn = !e.autopilot.autoLandOn;
}
//#endregion
//#region src/core/scenarios.ts
var ls = [
	{
		id: "booster-sep",
		name: "Booster Sep",
		description: "Just after stage separation: high, fast, and pointed downrange.",
		altitude: 7e4,
		xPosition: 45e3,
		speedX: 1130,
		speedY: 1130,
		pitch: r(45),
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
		pitch: r(30),
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
		pitch: r(30),
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
		pitch: r(90),
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
		pitch: r(0),
		propellant: 20
	}
], us = {
	id: "launch-pad",
	name: "Launch Pad",
	description: "On the pad at StarBase, full tanks.",
	altitude: E.height / 2,
	xPosition: 0,
	speedX: 0,
	speedY: 0,
	pitch: r(0),
	propellant: h / 1e3
}, ds = 200, fs = {
	id: "intro",
	name: "Intro Demo",
	description: "The auto-landing sequence that plays when the game opens.",
	altitude: ds - 1,
	xPosition: 0,
	speedX: 0,
	speedY: -ds / 4,
	pitch: r(0),
	propellant: 12
}, ps = 15e4, ms = Sn(s + ps, yn(s + ps)), hs = [{
	id: "circularize",
	name: "Circularize",
	description: "Just short of orbital speed at 150 km — a short prograde burn closes the orbit.",
	altitude: ps,
	xPosition: 0,
	speedX: ms - 20,
	speedY: 0,
	pitch: r(90),
	propellant: 200
}, {
	id: "deorbit",
	name: "Deorbit Burn",
	description: "Circular at 150 km, half a lap short of StarBase. Burn retrograde and come home.",
	altitude: ps,
	xPosition: -Math.PI * s,
	speedX: ms,
	speedY: 0,
	pitch: r(90),
	propellant: 300
}], gs = [
	us,
	...ls,
	...hs,
	fs
];
function _s(e) {
	return gs.find((t) => t.id === e);
}
function vs(e, t) {
	return bs(e, t, E);
}
function ys(e, t) {
	let n = e.id === "custom" ? e.basedOn : e.id, r = n === "booster-sep" || n === "rtls" ? Ct : E;
	return {
		state: bs(e, t, r),
		vehicle: r
	};
}
function bs(e, t, n) {
	let r = Eo(t, n), a = e.altitude;
	a < n.height / 2 && (a = n.height / 2), r.kinematics.altitude = a, r.kinematics.distanceToPlanetCenter = s + a, r.kinematics.downRangeDistance = e.xPosition + p, r.kinematics.downRangeDistanceNextFrame = r.kinematics.downRangeDistance, r.kinematics.speedX = e.speedX, r.kinematics.speedY = e.speedY, r.kinematics.trueSpeed = Math.sqrt(e.speedX ** 2 + e.speedY ** 2), r.kinematics.pitch = i(e.pitch), n.gridFins && (r.kinematics.pitchRecord = [r.kinematics.pitch, r.kinematics.pitch]);
	let o = e.propellant * 1e3;
	return o > n.propellantCapacity && (o = n.propellantCapacity), o > 0 || (o = 0), r.vehicle.propellantMass = o, r.vehicle.vehicleMass = n.dryMass + o, n.gridFins && (r.vehicle.vehicleMomentOfInertia = er(o, n)), r.world.wind = e.wind ?? 0, r.kinematics.machSpeed = tt(r.kinematics.speedX, r.kinematics.speedY, j(r.world, r.kinematics.altitude), r.world.gustVertical) / rn(Ut(a).airTemperature), r.damage = hi(P(n).partition, ua(a, Ut(a).airTemperature)), r;
}
function xs(e) {
	let t = vs(fs, e);
	return t.status.finLocked = !0, t.autopilot.demoAutoLandOn = !0, U(t), t;
}
//#endregion
//#region src/core/physics/step-dynamics.ts
function Ss() {
	return {
		omega0: 0,
		alpha0: 0,
		bodyAccelerationX: 0,
		bodyAccelerationY: 0,
		burnedFraction: 0,
		gimballedThrust: 0,
		airspeed: 0,
		massProperties: rr(),
		gridFinForces: ir()
	};
}
function Cs(e, t) {
	let { kinematics: n } = e;
	n.pitchRecord.push(n.pitch), n.pitchRecord.shift();
	let r = n.pitchRecord[0];
	n.pitchRateOfChange = e.damage && !Number.isFinite(r) ? n.angularVelocity : (n.pitch - r) / t;
}
function ws(e) {
	let { kinematics: t } = e;
	t.distanceToPlanetCenter = s + t.altitude, t.orbitalVelocityAtCurrentAltitude = yn(t.distanceToPlanetCenter);
}
function Ts(e, t) {
	let { kinematics: r, status: i, failures: a, vehicle: o, engines: s } = e;
	r.altitude <= t.height * Math.abs(Math.cos(r.pitch)) * .5 ? (r.speedY < -.5 || t.id === "super-heavy" && r.speedY < 0) && (t.id === "ship" && Math.abs(r.speedX) < 2 && Math.abs(r.speedY) < 10 && Math.abs(r.pitch) < .09 ? (i.landed = !0, r.speedX = 0, r.speedY = 0, r.angularVelocity = 0) : (ha(e, t, da.Impact, e.world.environmentTime), a.crashed = !0, r.speedX = 0, r.speedY = 0, r.angularVelocity = 0, r.pitch = n(0), o.propellantMass = 0, s.running.fill(!1), o.rcsRunTimeRemaining = 0)) : (i.landed = !1, i.onTheGround = !1);
}
function Es(e, t, n, r = n.height * Math.abs(Math.cos(e.kinematics.pitch)) * .5) {
	let { kinematics: i, status: a } = e;
	i.altitude > r || i.speedY < -.5 || e.failures.crashed || a.landed || (a.onTheGround = t <= bn(i.distanceToPlanetCenter), a.onTheGround && (i.speedX = 0, i.speedY = 0, i.angularVelocity = 0));
}
function Ds(e, t, n) {
	let { kinematics: r, forces: i, failures: a, vehicle: o, engines: s } = e;
	(i.perceivedG > 13 || i.surfaceTemperature > 1533 || i.dynamicPressure > 50 || e.damage !== null && (e.damage.terminal.active || !e.damage.hull.valid)) && (ha(e, t, ga(e), e.world.environmentTime), a.inFlightBreakUp = !0, r.angularVelocity = 0, o.propellantMass = 0, e.damage || (o.vehicleMass = t.dryMass, nr(0, n.massProperties, t), o.vehicleMomentOfInertia = n.massProperties.momentOfInertia), s.running.fill(!1), s.ignitionCountdown.fill(null), o.rcsRunTimeRemaining = 0, i.rcsThrust = 0);
}
function Os(e) {
	e.vehicle.propellantMass <= 0 && (e.failures.fuelRunOut = !0);
}
function ks(e, t, n) {
	let { forces: r } = e;
	r.perceivedG_Y = n / C, r.perceivedG_X = t / C, r.perceivedG = Math.sqrt(r.perceivedG_Y ** 2 + r.perceivedG_X ** 2);
}
function As(e, t, n, r) {
	let { massProperties: i, gridFinForces: a } = r, o = tt(e.kinematics.speedX, e.kinematics.speedY, j(e.world, e.kinematics.altitude), e.world.gustVertical);
	e.world.updatedFrameCount += 1;
	let s = en(e.kinematics.altitude);
	if (e.atmosphere.airTemperature = s.airTemperature, e.atmosphere.airPressure = s.airPressure, e.atmosphere.airDensity = s.airDensity, Ts(e, n), e.damage?.terminal.active) {
		ma(e), r.bodyAccelerationX = r.bodyAccelerationY = r.burnedFraction = r.gimballedThrust = 0;
		return;
	}
	Os(e);
	let c = Bo(e, t, n);
	Ko(e), e.vehicle.propellantMass <= 0 && e.engines.ignitionCountdown.fill(null), Wo(e, t);
	let l = lt(e.vehicle.frontFinExtension, e.vehicle.aftFinExtension, n);
	e.forces.frontFinEffectiveAreaFraction = l.frontFinEffectiveAreaFraction, e.forces.aftFinEffectiveAreaFraction = l.aftFinEffectiveAreaFraction, e.vehicle.vehicleInFlightMaxArea = l.vehicleInFlightMaxArea, e.forces.crossSectionalArea = Je(e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea, n), e.kinematics.angleOfMotion = et(e.kinematics.speedX, e.kinematics.speedY);
	let u = nt(e.kinematics.speedX, e.kinematics.speedY, j(e.world, e.kinematics.altitude), e.world.gustVertical), d = rt(e.kinematics.pitch, u);
	e.kinematics.angleOfAttack = d.angleOfAttack, e.kinematics.angleInToTheWind = d.angleInToTheWind, e.vehicle.gimbalPointingDirection = Ro(e.kinematics.pitch, e.vehicle.gimbalPosition), e.forces.thermalPower = sa(o, e.atmosphere.airDensity, n.diameter / 2, e.kinematics.angleInToTheWind), e.forces.surfaceTemperature = ca(e.forces.thermalPower, ua(e.kinematics.altitude, e.atmosphere.airTemperature)), e.forces.dynamicPressure = qe(e.atmosphere.airDensity, o), e.damage && (xa(e, n, e.forces.dynamicPressure * 1e3, Math.abs(Math.sin(e.kinematics.angleInToTheWind))), e.forces.crossSectionalArea = Je(e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea, n)), Cs(e, t), e.forces.aerodynamicDrag = D(e.atmosphere.airDensity, o, e.forces.crossSectionalArea, Ze(e.kinematics.machSpeed)), e.forces.aerodynamicLift = Xe(e.atmosphere.airDensity, o, e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea), e.forces.thrust = Po(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, n) * c, e.forces.aerodynamicDragAcceleration = Qe(e.forces.aerodynamicDrag, e.vehicle.vehicleMass), e.forces.aerodynamicLiftAcceleration = Qe(e.forces.aerodynamicLift, e.vehicle.vehicleMass), e.forces.thrustAcceleration = Qe(e.forces.thrust, e.vehicle.vehicleMass), e.forces.twr = e.forces.thrustAcceleration / f;
	let p = Fo(e.engines.running, e.atmosphere.airPressure, n), m = e.forces.thrust * p;
	e.damage && (e.forces.paidThrustAccelerationX = e.forces.thrustAcceleration * (p * Math.sin(e.vehicle.gimbalPointingDirection) + (1 - p) * Math.sin(e.kinematics.pitch)), e.forces.paidThrustAccelerationY = e.forces.thrustAcceleration * (p * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - p) * Math.cos(e.kinematics.pitch)));
	let h = e.forces.thrust - m, g = {
		angleOfMotion: u,
		angleOfAttack: e.kinematics.angleOfAttack,
		gimbalPointingDirection: e.vehicle.gimbalPointingDirection,
		aerodynamicDragAcceleration: e.forces.aerodynamicDragAcceleration,
		aerodynamicLiftAcceleration: e.forces.aerodynamicLiftAcceleration,
		thrustAcceleration: Qe(m, e.vehicle.vehicleMass),
		fixedThrustAcceleration: Qe(h, e.vehicle.vehicleMass),
		pitch: e.kinematics.pitch
	};
	n.gridFins && (va(e, n, i), Sa(e, e.atmosphere.airDensity, e.kinematics.speedX - j(e.world, e.kinematics.altitude), e.kinematics.speedY - e.world.gustVertical, e.kinematics.pitch, i, n, a));
	let _ = n.gridFins ? mn(g) + a.forceX / e.vehicle.vehicleMass : mn(g), v = n.gridFins ? hn(g, f) + f + a.forceY / e.vehicle.vehicleMass : hn(g, f) + f;
	r.bodyAccelerationX = _, r.bodyAccelerationY = v, r.burnedFraction = c, r.gimballedThrust = m;
}
function js(e, t, n, r, i, a) {
	Es(e, r, i, a);
	let o = e.kinematics.distanceToPlanetCenter, s = e.kinematics.speedX, l = e.kinematics.speedY, u = n + Cn(o, s, l), d = r + A(o, s), f = (e.status.onTheGround || e.status.landed || e.failures.crashed) && d <= 0;
	f && (u = 0, d = 0), ks(e, f ? -Cn(o, s, l) : n, f ? -A(o, s) : r);
	let p = .5 * t * t;
	e.kinematics.altitude += l * t + d * p, e.kinematics.downRangeDistanceNextFrame = e.kinematics.downRangeDistance + s * t + u * p, e.kinematics.downRangeDistanceNextFrame > c ? e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame - c : e.kinematics.downRangeDistanceNextFrame < 0 ? e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame + c : e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame, ws(e);
	let m = e.kinematics.distanceToPlanetCenter, h = s + u * t, g = l + d * t, _ = f ? 0 : n + Cn(m, h, g), v = f ? 0 : r + A(m, h);
	return e.kinematics.speedX = s + .5 * (u + _) * t, e.kinematics.speedY = l + .5 * (d + v) * t, e.kinematics.accelerationX = _, e.kinematics.accelerationY = v, e.kinematics.totalAcceleration = Math.sqrt(_ ** 2 + v ** 2), e.kinematics.trueSpeed = Math.sqrt(e.kinematics.speedX ** 2 + e.kinematics.speedY ** 2), f;
}
function Ms(e, t, n) {
	let r = tt(e.kinematics.speedX, e.kinematics.speedY, j(e.world, e.kinematics.altitude), e.world.gustVertical);
	e.kinematics.machSpeed = r / rn(e.atmosphere.airTemperature), Yn(e.world, e.rng, e.kinematics.altitude, e.kinematics.speedX, e.kinematics.speedY, t), n.airspeed = r;
}
function Ns(e, t, r, i) {
	let a = .5 * t * t;
	e.kinematics.pitch > Math.PI ? e.kinematics.pitch = n(e.kinematics.pitch - 2 * Math.PI) : e.kinematics.pitch < -Math.PI && (e.kinematics.pitch = n(e.kinematics.pitch + 2 * Math.PI));
	let o = e.kinematics.angularVelocity, s = r ? 0 : e.kinematics.angularAcceleration;
	e.kinematics.pitch = n(e.kinematics.pitch + o * t + s * a), e.kinematics.angularVelocity = o + s * t, i.omega0 = o, i.alpha0 = s;
}
function Ps(e, t, r) {
	let { massProperties: i, gridFinForces: a, gimballedThrust: o, burnedFraction: s, airspeed: c } = r;
	e.forces.thrustVectorForce = Io(o, e.vehicle.gimbalPosition), e.forces.frontFinDrag = st(e.atmosphere.airDensity, c, e.kinematics.angleOfAttack, e.kinematics.angleInToTheWind, e.forces.frontFinEffectiveAreaFraction, t), e.forces.aftFinDrag = ct(e.atmosphere.airDensity, c, e.kinematics.angleOfAttack, e.kinematics.angleInToTheWind, e.forces.aftFinEffectiveAreaFraction, t);
	let l = e.vehicle.vehicleMomentOfInertia;
	if (e.forces.thrustVectorAcceleration = $e(e.forces.thrustVectorForce, i.engineArm, l), e.forces.angularDragAcceleration = ot(e.atmosphere.airDensity, e.kinematics.angularVelocity, l, i.rCubedIntegral, t), e.forces.frontFinDragAngularAcceleration = $e(e.forces.frontFinDrag, i.frontFinArm, l), e.forces.aftFinDragAngularAcceleration = $e(e.forces.aftFinDrag, i.aftFinArm, l), e.forces.rcsThrustAngularAcceleration = $e(e.forces.rcsThrust, i.rcsArm, l), e.forces.offAxisThrustDifferenceAcceleration = $e(Lo(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, t), i.engineArm, l), t.gridFins && (Sa(e, e.atmosphere.airDensity, e.kinematics.speedX - j(e.world, e.kinematics.altitude), e.kinematics.speedY - e.world.gustVertical, e.kinematics.pitch, i, t, a), e.forces.frontFinDrag = a.lift, e.forces.frontFinDragAngularAcceleration = a.torque / l, e.forces.offAxisThrustDifferenceAcceleration = qo(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, n(e.vehicle.gimbalPosition * .01 * S), t) * s / l), e.damage) {
		let r = e.vehicle.gimbalPosition * .01 * S, a = o * Math.cos(r) + e.forces.thrust - o;
		e.forces.offAxisThrustDifferenceAcceleration = (qo(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, n(r), t) * s + i.centreOfMassX * a) / l;
	}
	return e.forces.thrustVectorAcceleration + e.forces.angularDragAcceleration + e.forces.frontFinDragAngularAcceleration + e.forces.aftFinDragAngularAcceleration + e.forces.rcsThrustAngularAcceleration + e.forces.offAxisThrustDifferenceAcceleration;
}
function Fs(e, t, n, r, i, a) {
	e.kinematics.angularVelocity = n ? 0 : r + .5 * (i + a) * t, e.kinematics.angularAcceleration = n ? 0 : a;
}
function Is(e, t, n, r, i) {
	va(e, n, r.massProperties), e.vehicle.vehicleMomentOfInertia = r.massProperties.momentOfInertia, Ns(e, t, i, r);
	let a = Ps(e, n, r);
	Fs(e, t, i, r.omega0, r.alpha0, a);
}
//#endregion
//#region src/core/control/primitives.ts
var Ls = rr(), W = F(), Rs = Ji(12), zs = ir();
function Bs(e, t) {
	let n = e - t;
	return n < -Math.PI ? n = Math.PI * 2 + n : n > Math.PI && (n = -(Math.PI * 2 - n)), n;
}
function Vs(e, t, n, r = t, i = E) {
	let a = H(e, n, i), o = Fo(e, n, i);
	return o === 1 ? a * Math.cos(t) : a * o * Math.cos(t) + a * (1 - o) * Math.cos(r);
}
function Hs(e) {
	return Math.sqrt(35 / e * 2e3);
}
function G(e, t, r, i = E) {
	let { kinematics: a, forces: o, status: s, vehicle: c, autopilot: l } = e, u = Bs(a.pitch, t);
	e.damage ? I(e, i, W, Ls) : nr(c.propellantMass, Ls, i);
	let d = !e.damage || W.engineSupportAvailable, f = (-u / r ** 2 - 2 * a.angularVelocity / r - (d ? o.offAxisThrustDifferenceAcceleration : 0)) * (e.damage ? W.momentOfInertia : c.vehicleMomentOfInertia), p = 0, m = () => {
		if (Math.abs(u) > .1) {
			let e = f / Ls.rcsArm;
			e > 0 ? e > 8e5 ? p = 100 : l.rcsThrustCommand = e : e < 0 ? e < -8e5 ? p = -100 : l.rcsThrustCommand = e : p = 0, l.pitchControl = p;
		}
	}, h = d ? o.thrust * Fo(e.engines.running, e.atmosphere.airPressure, i) : 0;
	h > 0 ? (() => {
		let e = f / Ls.engineArm / h;
		e >= 1 ? p = 100 : e <= -1 ? p = -100 : (p = Math.asin(e) * 100 / S, p >= 100 ? p = 100 : p <= -100 && (p = -100)), s.rcsActive && (p *= .98), l.pitchControl = p;
	})() : s.finActive ? (() => {
		let t = tt(a.speedX, a.speedY, j(e.world, a.altitude), e.world.gustVertical);
		if (e.damage) {
			let r = 0, o = 0, c = .5 * e.atmosphere.airDensity * t ** 2;
			if (i.gridFins) for (let t = -1; t <= 1; t += 2) Sa(e, e.atmosphere.airDensity, a.speedX - j(e.world, a.altitude), a.speedY - e.world.gustVertical, a.pitch, Ls, i, zs, n(t * i.gridFins.maxAngle)), zs.torque * f > 0 && Math.abs(zs.torque) > Math.abs(r) && (r = zs.torque, o = t * 100);
			else {
				let t = Math.abs(Math.sin(a.angleInToTheWind)), n = a.angleOfAttack < 0 ? -1 : 1;
				for (let a = 0; a < 2; a++) {
					let s = a === 0;
					Xi(e.damage, P(i).controls, c, t, s ? se : 0, s ? 0 : se, Rs);
					let l = c * 2 * t * n * (Rs.frontArea * Ls.frontFinArm - Rs.aftArea * Ls.aftFinArm);
					l * f > 0 && Math.abs(l) > Math.abs(r) && (r = l, o = (s ? n : -n) * 100);
				}
			}
			p = r === 0 ? 0 : o * Math.min(1, Math.abs(f / r)), s.rcsActive && (p *= .99, m()), l.pitchControl = p;
			return;
		}
		if (f > 0) {
			let n = D(e.atmosphere.airDensity, t, i.frontFinArea, 2) * Math.sin(se) * Ls.frontFinArm + D(e.atmosphere.airDensity, t, i.aftFinArea, 2) * Ls.aftFinArm;
			p = f / n * 100, p >= 100 && (p = 100);
		} else if (f < 0) {
			let n = D(e.atmosphere.airDensity, t, i.aftFinArea, 2) * Math.sin(se) * Ls.aftFinArm + D(e.atmosphere.airDensity, t, i.frontFinArea, 2) * Ls.frontFinArm;
			p = f / n * 100, p <= -100 && (p = -100);
		} else p = 0;
		s.rcsActive && (p *= .99, m()), l.pitchControl = p;
	})() : m();
}
function Us(e, t, n = E) {
	Ws(e, t * Ea(e), n);
}
function Ws(e, t, n = E) {
	let { vehicle: r, engines: i } = e;
	e.damage && I(e, n, W);
	let a = !e.damage || W.engineSupportAvailable, o = t * (e.damage ? W.totalMass : r.vehicleMass) / (a ? H(i.running, e.atmosphere.airPressure, n) : 0) * 100;
	Number.isNaN(o) && (o = 40), o > 100 ? o = 100 : o < 40 && (o = 40), r.throttle = o;
}
function Gs(e, t, n = E) {
	let { vehicle: r, engines: i } = e;
	e.damage && I(e, n, W);
	let a = !e.damage || W.engineSupportAvailable, o = t * (e.damage ? W.totalMass : r.vehicleMass) * Ea(e) / (a ? Vs(i.running, r.gimbalPointingDirection, e.atmosphere.airPressure, e.kinematics.pitch, n) : 0) * 100;
	Number.isNaN(o) && (o = 40), o > 100 ? o = 100 : o < 40 && (o = 40), r.throttle = o;
}
function Ks(e, t, r, i, a) {
	let o = e.kinematics.speedX - t;
	o < 0 ? (G(e, r, a), -o < i && G(e, n(r * -o / i), a)) : (G(e, n(-r), a), o < i && G(e, n(-r * o / i), a));
}
function qs(e, t, n, r) {
	let i = e.kinematics.speedY - t;
	i < 0 ? (Gs(e, r), -i < n && Gs(e, 1 - i / n)) : (Gs(e, 0), i < n && Gs(e, 1 - i / n));
}
function Js(e, t, n, r, i = E) {
	let a = t - e.kinematics.trueSpeed;
	a < 0 ? Us(e, 0, i) : (Us(e, r, i), a < n && Us(e, 1 + a / n, i));
}
function Ys(e, t, n) {
	return e / (t * n);
}
function Xs(e, t, r, i) {
	let { status: a, kinematics: o, autopilot: s } = e;
	a.finActive || i(e), s.horizontalAccelerationByAeroBreakingCorrectionAngle = Math.abs(o.accelerationX) > Math.abs(t) ? n(s.horizontalAccelerationByAeroBreakingCorrectionAngle - Ae * r) : n(s.horizontalAccelerationByAeroBreakingCorrectionAngle + Ae * r), s.horizontalAccelerationByAeroBreakingCorrectionAngle > ke ? s.horizontalAccelerationByAeroBreakingCorrectionAngle = ke : s.horizontalAccelerationByAeroBreakingCorrectionAngle < 0 && (s.horizontalAccelerationByAeroBreakingCorrectionAngle = n(0)), t < 0 ? G(e, n(s.horizontalAccelerationByAeroBreakingCorrectionAngle - Math.PI / 2), 1.5) : G(e, n(-s.horizontalAccelerationByAeroBreakingCorrectionAngle + Math.PI / 2), 1.5);
}
function Zs(e, t, n = E) {
	let { engines: r } = e;
	if (I(e, n, W), !W.engineSupportAvailable || !W.hasMass) return;
	let i = r.running;
	if (Ys(No(i, e.atmosphere.airPressure, n), W.totalMass, Ea(e)) > 1) {
		let r = jo(i, n);
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
function Qs() {
	return {
		x: 0,
		altitude: 0,
		speedX: 0,
		speedY: 0
	};
}
function $s(e, t, n) {
	let r = e.kinematics, i = k.lugStation - t.height / 2;
	n.x = r.downRangeDistance + i * Math.sin(r.pitch), n.altitude = r.altitude + i * Math.cos(r.pitch), n.speedX = r.speedX + i * Math.cos(r.pitch) * r.angularVelocity, n.speedY = r.speedY - i * Math.sin(r.pitch) * r.angularVelocity;
}
var ec = Qs(), tc = Qs(), K = {
	fraction: 0,
	pitch: 0,
	x: 0,
	speedX: 0,
	speedY: 0
};
function nc(e, t, n) {
	if (n.id !== "super-heavy" || t.status.landed) return !1;
	let r = t.failures;
	if (r.crashed || r.inFlightBreakUp || r.fuelRunOut) return !1;
	let i = t.kinematics, a = n.height * Math.abs(Math.cos(i.pitch)) / 2 + n.diameter * Math.abs(Math.sin(i.pitch)) / 2;
	if (i.altitude <= a || ($s(e, n, ec), $s(t, n, tc), !(ec.altitude > k.planeAltitude && tc.altitude <= k.planeAltitude))) return !1;
	let o = (ec.altitude - k.planeAltitude) / (ec.altitude - tc.altitude), s = e.kinematics, c = Math.atan2(Math.sin(i.pitch - s.pitch), Math.cos(i.pitch - s.pitch));
	return K.fraction = o, K.pitch = s.pitch + c * o, K.x = s.downRangeDistance + (i.downRangeDistance - s.downRangeDistance) * o + (k.lugStation - n.height / 2) * Math.sin(K.pitch), K.speedX = ec.speedX + (tc.speedX - ec.speedX) * o, K.speedY = ec.speedY + (tc.speedY - ec.speedY) * o, Number.isFinite(K.x) && Number.isFinite(K.pitch) && Number.isFinite(K.speedX) && Number.isFinite(K.speedY) && Math.abs(K.x - p) <= k.halfWidth && Math.abs(K.speedX) <= k.maxLateralSpeed && K.speedY < 0 && K.speedY >= -k.maxDownSpeed && Math.abs(K.pitch) <= k.maxPitch;
}
function rc(e, t, r) {
	if (!nc(e, t, r)) return !1;
	let i = t.kinematics, a = e.kinematics;
	return i.downRangeDistance = a.downRangeDistance + (i.downRangeDistance - a.downRangeDistance) * K.fraction, i.downRangeDistanceNextFrame = i.downRangeDistance, i.pitch = n(K.pitch), i.altitude = k.planeAltitude - (k.lugStation - r.height / 2) * Math.cos(i.pitch), i.distanceToPlanetCenter = s + i.altitude, i.speedX = i.speedY = i.trueSpeed = i.angularVelocity = 0, i.accelerationX = i.accelerationY = i.totalAcceleration = i.angularAcceleration = 0, t.status.landed = !0, t.status.onTheGround = !1, t.engines.running.fill(!1), t.engines.ignitionCountdown.fill(null), t.forces.thrust = t.forces.thrustAcceleration = t.forces.twr = t.forces.rcsThrust = 0, t.autopilot.pitchControl = t.autopilot.rcsThrustCommand = 0, !0;
}
//#endregion
//#region src/core/control/booster-arrival.ts
var q = F(), ic = .3;
function ac() {
	return {
		pitch: n(0),
		throttle: 100,
		requiredX: 0,
		requiredY: 0,
		deliveredX: 0,
		deliveredY: 0
	};
}
function oc(e, t, r, i, a) {
	I(e, i, q);
	let o = e.kinematics, s = q.totalMass;
	if (!q.hasMass) {
		a.pitch = n(0), a.throttle = 100, a.requiredX = a.requiredY = a.deliveredX = a.deliveredY = 0;
		return;
	}
	let c = Fo(e.engines.running, e.atmosphere.airPressure, i), l = e.forces.thrust / s, u = e.damage ? e.forces.paidThrustAccelerationX : l * (c * Math.sin(e.vehicle.gimbalPointingDirection) + (1 - c) * Math.sin(o.pitch)), d = e.damage ? e.forces.paidThrustAccelerationY : l * (c * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - c) * Math.cos(o.pitch));
	a.requiredX = t - (o.accelerationX - u), a.requiredY = r - (o.accelerationY - d), a.pitch = n(Math.max(-.3, Math.min(ic, Math.atan2(a.requiredX, Math.max(0, a.requiredY)))));
	let f = Math.max(0, a.requiredY) / Math.cos(a.pitch), p = q.engineSupportAvailable ? H(e.engines.running, e.atmosphere.airPressure, i) / s : 0;
	a.throttle = p > 0 ? Math.max(40, Math.min(100, 100 * f / p)) : 100, a.deliveredX = p * a.throttle * .01 * Math.sin(a.pitch), a.deliveredY = p * a.throttle * .01 * Math.cos(a.pitch);
}
var sc = Oa(), J = ac();
function cc(e, t, r, i, a, o) {
	return Za(e, n(o), i, sc), J.requiredX = t - sc.acc.x, J.requiredY = r - sc.acc.y, J.pitch = n(o), J.throttle = a > 0 ? Math.max(40, Math.min(100, 100 * Math.max(0, J.requiredY) / (a * Math.cos(o)))) : 100, J.deliveredX = a * J.throttle * .01 * Math.sin(o), J.deliveredY = a * J.throttle * .01 * Math.cos(o), J.deliveredX - J.requiredX;
}
function lc(e, t) {
	let n = (J.deliveredX - J.requiredX) ** 2 + (J.deliveredY - J.requiredY) ** 2;
	return n >= t ? t : (Object.assign(e, J), n);
}
function uc(e, t, n, r, i, a = ic) {
	I(e, r, q);
	let o = q.engineSupportAvailable && q.hasMass ? H(e.engines.running, e.atmosphere.airPressure, r) / q.totalMass : 0, s = Math.max(0, Math.min(ic, a)), c = -s, l = cc(e, t, n, r, o, c), u = lc(i, Infinity);
	for (let a = 1; a <= 16; a++) {
		let d = -s + 2 * s * a / 16, f = cc(e, t, n, r, o, d);
		if (u = lc(i, u), l * f < 0) {
			let a = c, s = d, f = l;
			for (let c = 0; c < 12; c++) {
				let c = (a + s) / 2, l = cc(e, t, n, r, o, c);
				u = lc(i, u), f * l <= 0 ? s = c : (a = c, f = l);
			}
		}
		c = d, l = f;
	}
}
function dc(e, t, n) {
	if (I(e, n, q), !q.engineSupportAvailable || !q.hasMass) return 100;
	let r = Fo(e.engines.running, e.atmosphere.airPressure, n), i = r * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - r) * Math.cos(e.kinematics.pitch), a = e.damage ? e.forces.paidThrustAccelerationY : e.forces.thrust / q.totalMass * i, o = e.kinematics.accelerationY - a;
	I(e, n, q);
	let s = q.engineSupportAvailable && q.hasMass ? H(e.engines.running, e.atmosphere.airPressure, n) / q.totalMass : 0;
	return s <= 0 || i <= 0 ? 100 : Math.max(40, Math.min(100, 100 * Math.max(0, t - o) / (s * i)));
}
function fc() {
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
var pc = Qs(), mc = Object.freeze([
	!0,
	!0,
	!0
]), hc = ac();
function gc(e, t, n, r) {
	I(e, n, q);
	let i = q.engineSupportAvailable && q.hasMass && mc.every((t, n) => !e.engines.failed[n]), a = q.totalMass;
	$s(e, n, pc), r.x = pc.x - p, r.height = pc.altitude - k.planeAltitude, r.vx = pc.speedX, r.vy = pc.speedY;
	let o = e.autopilot;
	if (o.boosterArrivalTime === void 0) {
		let e = Math.max(0, r.height), t = Math.max(0, -r.vy), c = 2 * e / (t + 2), l = (i ? H(mc, ie / 1e3, n) / a : 0) + A(s + k.bodyCentreAltitude, 0), u = l > 0 ? 6 * e / (Math.sqrt((t + 4) ** 2 + 6 * l * e) + t + 4) : 60;
		o.boosterArrivalTime = Math.max(.5, Math.min(60, Math.max(c, u)));
	}
	o.boosterArrivalTime = Math.max(0, o.boosterArrivalTime - t), r.time = Math.max(.25, o.boosterArrivalTime), r.ax = -6 * r.x / r.time ** 2 - 4 * r.vx / r.time, r.ay = -6 * r.height / r.time ** 2 - 4 * r.vy / r.time + 4 / r.time;
	let c = e.kinematics, l = k.lugStation - n.height / 2;
	r.bodyAX = r.ax - l * (Math.cos(c.pitch) * c.angularAcceleration - Math.sin(c.pitch) * c.angularVelocity ** 2), r.bodyAY = r.ay + l * (Math.sin(c.pitch) * c.angularAcceleration + Math.cos(c.pitch) * c.angularVelocity ** 2), r.centreAX = -6 * (c.downRangeDistance - p) / r.time ** 2 - 4 * c.speedX / r.time, r.centreAY = -6 * (c.altitude - k.bodyCentreAltitude) / r.time ** 2 - 4 * c.speedY / r.time + 4 / r.time;
	let u = i ? H(mc, e.atmosphere.airPressure, n) / a * Math.sin(ic) : 0;
	oc(e, r.ax, r.ay, n, hc);
	let d = hc.requiredX;
	oc(e, 6 * r.x / r.time ** 2 + 2 * r.vx / r.time, 6 * r.height / r.time ** 2 + 2 * r.vy / r.time - 8 / r.time, n, hc), r.lateralFeasible = i && Number.isFinite(d) && Number.isFinite(hc.requiredX) && Math.abs(d) <= u && Math.abs(hc.requiredX) <= u;
}
//#endregion
//#region src/core/control/booster-forecast.ts
function _c() {
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
var vc = Qs(), yc = Qs(), bc = fc();
function Y(e) {
	let t = e * 120, n = Math.round(t);
	return e === n / 120 ? n : Math.ceil(t);
}
function xc(e) {
	return Y(e) / 120;
}
function Sc(e, t) {
	return Math.max(0, Y(e) - t.boostSteps - 6 * t.steadySteps) / 120;
}
function Cc(e, t, n = 0) {
	let r = V(e);
	if (delete r.autopilot.boosterPrediction, delete r.autopilot.boosterForecastHandoff, r.autopilot.boosterPhase === "align-boost" || r.autopilot.boosterPhase === "boostback" && n <= 0 || !r.autopilot.boosterPhase) {
		r.autopilot.boosterPhase = "coast";
		for (let e = 0; e < r.engines.running.length; e++) Go(r, e);
	}
	return r.autopilot.boosterCoastPitch = t, {
		state: r,
		initialTime: r.autopilot.boosterFallTime ?? 900,
		initialDraws: r.rng.counters.ignitionFailure,
		burnRemaining: xc(n),
		burnTicks: Y(n),
		cutoffClock: r.world.environmentTime,
		done: !1,
		result: _c()
	};
}
function wc(e, t, n, r, i, a) {
	let o = e.result, s = e.state, c = 0, l = e.reusePrefix, u = e.burnRemaining;
	l && (u = Sc(u, l)), l && l.origin === e.origin && l.advance === n && l.policy === r && l.model === i && e.step === void 0 && e.initialTime === l.initialTime && s.autopilot.boosterCoastPitch === l.coastPitch && u > 0 && o.steps === 0 && (s = V(l.state), s.autopilot.boosterForecastBurn = !0, o.time = l.time, o.steps = l.steps, e.prefix = l, e.burnRemaining = u, e.burnTicks = Math.round(u * 120), e.cutoffClock = l.cutoffClock, e.boostSteps = l.boostSteps, e.steadySteps = l.steadySteps), delete e.reusePrefix;
	for (let l = 0; l < t && !e.done; l++) {
		$s(s, i, vc);
		let t = s.autopilot.boosterPhase, l = t === "align-boost" || t === "boostback" || t === "entry" || t === "terminal", u = t === "boostback" && !dt.every((e) => s.engines.running[e]), d = u || t === "entry" && !(s.autopilot.boosterEntryCentreOnly ? O : dt).every((e) => s.engines.running[e]) || t === "terminal" && !O.every((e) => s.engines.running[e]), f = t === "align-boost" || d || t === "terminal" && s.autopilot.boosterArrivalTime === void 0 ? 1 / 120 : e.step ?? (e.stopAtHandoff && l || s.kinematics.altitude < 2e3 ? .05 : .25), m = t === "boostback" || !e.stopAtHandoff && e.burnRemaining > 0, h = m && e.burnTicks > 0 ? e.burnTicks < 6 ? 1 / 120 : Math.min(f, .05) : f;
		e.burnRemaining > 0 && (s.autopilot.boosterForecastBurn = !0), s.autopilot.boosterFallTime = Math.max(2, e.initialTime - o.time);
		let g = a?.eligible(s, h), _ = g ? V(s) : void 0, v;
		if (s = n(s, h, g ? (e, t, n) => {
			v = V(e), r(e, t, n);
		} : r, i), o.steps++, c++, _ && a.paid(_, v, s, h), u && (e.boostSteps = (e.boostSteps ?? 0) + 1), t === "boostback" && !u && h === .05 && (e.steadySteps = (e.steadySteps ?? 0) + 1), t === "align-boost" || m) for (let t = 0; t < Math.round(h * 120); t++) e.cutoffClock += 1 / 120;
		if (m && e.burnTicks > 0 && (e.burnTicks = Math.max(0, e.burnTicks - Math.round(h * 120)), e.burnRemaining = e.burnTicks / 120), e.readyHandoff && e.step === void 0 && e.origin && (t === "align-boost" && s.autopilot.boosterPhase === "boostback" || u && e.burnRemaining > 0 && dt.every((e) => s.engines.running[e]) || t === "boostback" && !u && h === .05)) {
			e.prefix = {
				origin: e.origin,
				state: V(s),
				time: o.time + h,
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
			t > 0 && (e.rollingPrefixes = Oc(e.rollingPrefixes, [e.prefix])), t > 0 && !(t & t - 1) && !(e.checkpoints ?? []).some((e) => e.steadySteps === t) && (e.checkpoints = [...e.checkpoints ?? [], e.prefix]);
		}
		if ((m || e.stopAtHandoff && s.autopilot.boosterPhase === "boostback") && e.burnRemaining === 0) {
			delete s.autopilot.boosterForecastBurn, s.autopilot.boosterPhase = "coast";
			for (let e = 0; e < s.engines.running.length; e++) Go(s, e);
			e.shutdownAt = e.cutoffClock, e.stopAtCutoff && (e.done = !0);
		}
		$s(s, i, yc);
		let y = vc.altitude > k.planeAltitude && yc.altitude <= k.planeAltitude;
		if (o.time += h, e.stopAtHandoff && s.autopilot.boosterPhase === "terminal" && (!e.readyHandoff || t === "terminal" && O.every((e) => s.engines.running[e]))) {
			let t = s.autopilot.boosterArrivalTime;
			gc(s, 0, i, bc), t === void 0 ? delete s.autopilot.boosterArrivalTime : s.autopilot.boosterArrivalTime = t, o.handoff = {
				x: bc.x,
				height: bc.height,
				vx: bc.vx,
				vy: bc.vy,
				time: bc.time,
				lateralFeasible: bc.lateralFeasible
			}, o.rangeError = s.kinematics.downRangeDistance - p + s.kinematics.speedX * bc.time / 3, o.speedX = bc.vx, o.speedY = bc.vy, o.reached = !0, e.done = !0;
		} else if (y) {
			let t = (vc.altitude - k.planeAltitude) / (vc.altitude - yc.altitude);
			o.rangeError = vc.x + (yc.x - vc.x) * t - p, o.time -= h * (1 - t), o.speedX = vc.speedX + (yc.speedX - vc.speedX) * t, o.speedY = vc.speedY + (yc.speedY - vc.speedY) * t, o.reached = !0, e.done = !0;
		}
		(s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp || o.time >= 900 || o.steps >= 4e3) && (e.done = !0);
	}
	return o.reached || (o.rangeError = yc.x - p, o.speedX = yc.speedX, o.speedY = yc.speedY), o.fuel = s.vehicle.propellantMass, o.pitch = s.kinematics.pitch, o.ignitionDraws = s.rng.counters.ignitionFailure - e.initialDraws, o.failed = s.failures.crashed || s.failures.inFlightBreakUp || s.failures.fuelRunOut, e.state = s, c;
}
function Tc(e, t, n, r) {
	let i = Cc(e, t, n);
	if (i.state = V(e), delete i.state.autopilot.boosterPrediction, i.state.autopilot.boosterPhase || (i.state.autopilot.boosterPhase = "align-boost"), i.state.autopilot.boosterPhase === "boostback" && n <= 0) {
		i.state.autopilot.boosterPhase = "coast";
		for (let e = 0; e < i.state.engines.running.length; e++) Go(i.state, e);
		i.shutdownAt = e.world.environmentTime;
	}
	return delete i.state.autopilot.boosterReturnPlan, i.state.autopilot.boosterCoastPitch = t, i.stopAtHandoff = !0, r !== void 0 && (i.step = r), i;
}
function Ec(e, t, n, r, i) {
	let a = Tc(e, t, n, r);
	return a.readyHandoff = !0, a.origin = e, i && (a.reusePrefix = i), a;
}
function Dc(e, t, n, r) {
	let i = Ec(e, t, n, void 0, r);
	return i.stopAtCutoff = !0, i;
}
function Oc(e, t) {
	let n = [...e ?? []], r = n[0] ?? t[0];
	for (let e of t) !r || e.steadySteps <= 0 || e.origin !== r.origin || e.advance !== r.advance || e.policy !== r.policy || e.model !== r.model || e.coastPitch !== r.coastPitch || e.initialTime !== r.initialTime || e.boostSteps !== r.boostSteps || n.some((t) => t.steadySteps === e.steadySteps) || n.push(e);
	return n.sort((e, t) => e.steadySteps - t.steadySteps).slice(-8);
}
//#endregion
//#region src/core/control/booster-cutoff-hint.ts
function kc(e, t, n, r, i) {
	if (!e.forecast.reached || e.forecast.failed || e.forecast.fuel <= 0 || !e.forecast.handoff || t.origin !== n.origin || t.model !== n.model || t.origin.world.environmentTime !== e.originTime || t.origin.damage?.revision !== e.damageRevision || !Number.isFinite(t.range) || !Number.isFinite(n.range) || !(t.duration < e.burnDuration && n.duration > e.burnDuration)) return;
	let a = (n.range - t.range) / (n.duration - t.duration), o = e.burnDuration - e.forecast.rangeError / a;
	if (!Number.isFinite(a) || a === 0 || !Number.isFinite(o)) return;
	let s = xc(o);
	return s > r && s < i && s !== e.burnDuration ? s : void 0;
}
//#endregion
//#region src/core/control/booster-prediction.ts
var Ac = F(), jc = Oa(), Mc = 512, Nc = Object.freeze(dt.map(() => !0));
function Pc(e, t, r) {
	let i = V(e);
	delete i.autopilot.boosterPrediction;
	let a = Math.floor(120 * i.vehicle.propellantMass / (dt.length * w(t.propulsion, "sea-level"))) / 120;
	I(i, t, Ac);
	let o = dt.some((e) => i.engines.failed[e]) ? Nc.map((e, t) => e && !i.engines.failed[t]) : Nc, s = Ac.engineSupportAvailable && Ac.hasMass ? H(o, i.atmosphere.airPressure, t) / Ac.totalMass : 0, c = Math.abs(i.autopilot.boosterRangeError ?? 0) / (s * (i.autopilot.boosterFallTime ?? 0)), l = xc(Number.isFinite(c) && c > 0 && c < a ? Math.max(a / 4, c) : a / 4), u = i.autopilot.boosterPhase === "align-boost" || i.autopilot.boosterPhase === "boostback", d = u ? l : 0;
	return {
		...e.autopilot.boosterSource ? { sourceLineage: e.autopilot.boosterSource.lineageId } : {},
		origin: i,
		rollout: Ec(i, n(0), d),
		stage: u ? "upper" : "low",
		duration: d,
		lowerDuration: 0,
		upperDuration: a,
		firstDuration: l,
		iterations: +!!u,
		attemptedTicks: u ? [Math.round(d * 120)] : [],
		published: r,
		done: !1
	};
}
function Fc(e) {
	return {
		...e.sourceLineage === void 0 ? {} : { sourceLineage: e.sourceLineage },
		...e.origin.damage ? { damageRevision: e.origin.damage.revision } : {},
		originTime: e.origin.world.environmentTime,
		burnDuration: e.duration,
		shutdownAt: e.rollout.shutdownAt ?? e.origin.world.environmentTime,
		coastPitch: n(0),
		forecast: { ...e.rollout.result }
	};
}
function Ic(e) {
	return e.forecast.reached && !e.forecast.failed && e.forecast.fuel > 0 && e.forecast.handoff !== void 0 && Number.isFinite(e.forecast.rangeError);
}
function Lc(e, t, r) {
	if (e.iterations >= 16) {
		qc(e) || (e.done = !0);
		return;
	}
	let i = e.low?.burnDuration ?? e.lowerDuration, a = e.high?.burnDuration ?? e.upperDuration, o = Y(i) + 1, s = Y(a) - 1, c = Math.max(o, Math.min(s, Y(t))), l;
	for (let t = 0; t <= e.attemptedTicks.length && o <= s; t++) {
		for (let n of [c - t, c + t]) if (n >= o && n <= s && !e.attemptedTicks.includes(n)) {
			l = n;
			break;
		}
		if (l !== void 0) break;
	}
	if (l === void 0) {
		qc(e) || (e.done = !0);
		return;
	}
	let u = l / 120;
	e.attemptedTicks = [...e.attemptedTicks, l], e.duration = u, e.stage = r, e.iterations++;
	let d = Rc(e, u);
	e.rollout = Ec(e.origin, n(0), u, void 0, d);
}
function Rc(e, t) {
	return [
		e.prefix,
		e.startupPrefix,
		...e.checkpoints ?? [],
		...e.rollingPrefixes ?? []
	].filter((e) => !!e && Sc(t, e) > 0).sort((e, t) => t.steps - e.steps)[0];
}
function zc(e) {
	e.rollingPrefixes = Oc(e.rollingPrefixes, e.rollout.rollingPrefixes ?? []), e.rollout.startupPrefix && (e.startupPrefix = e.rollout.startupPrefix), e.rollout.prefix && (!e.prefix || e.rollout.prefix.steadySteps < e.prefix.steadySteps) && (e.prefix = e.rollout.prefix);
	for (let t of e.rollout.checkpoints ?? []) (e.checkpoints ?? []).some((e) => e.steadySteps === t.steadySteps) || (e.checkpoints = [...e.checkpoints ?? [], t]);
}
function Bc(e, t) {
	e.hintTicks = [...e.hintTicks ?? [], Y(t)], e.iterations++, e.duration = t, e.stage = "hint", e.rollout = Dc(e.origin, n(0), t, Rc(e, t));
}
function Vc(e, t) {
	if (!e.rollout.prefix || e.rollout.shutdownAt === void 0 || e.hintTried || e.iterations + 2 > 16 || e.origin.autopilot.boosterPhase === "coast") return !1;
	e.hintTried = !0;
	let n = [(Y(t.burnDuration) - 6) / 120, (Y(t.burnDuration) + 6) / 120];
	return !n.some((t) => t <= e.lowerDuration || t >= e.upperDuration || e.attemptedTicks.includes(Y(t)) || (e.hintTicks ?? []).includes(Y(t))) && (e.hintAnchor = t, e.hintScores = [], e.hintDurations = n, Bc(e, n[0]), !0);
}
function Hc(e, t, r) {
	let i = 0;
	zc(e);
	let a = e.rollout.state;
	if (!e.hintFallWork && e.rollout.shutdownAt !== void 0 && a.vehicle.propellantMass > 0 && !e.rollout.result.failed && !a.damage?.terminal.active && (e.hintFallWork = eo(a, k.bodyCentreAltitude, t, n(0))), e.hintFallWork) {
		let n = to(e.hintFallWork, r, jc);
		if (i = n, e.hintForceIterations = (e.hintForceIterations ?? 0) + n, n > 0 && (e.hintForceSlices = (e.hintForceSlices ?? 0) + 1), !e.hintFallWork.done) return i;
		let o = e.hintFallWork.result;
		o.reached && Number.isFinite(o.downRange) && (e.hintScores = [...e.hintScores ?? [], {
			duration: e.duration,
			range: a.kinematics.downRangeDistance - p + o.downRange,
			origin: e.origin,
			model: t
		}]), delete e.hintFallWork;
	}
	if (e.duration === e.hintDurations[0]) return Bc(e, e.hintDurations[1]), i;
	let o = e.hintScores ?? [], s = o.length === 2 ? kc(e.hintAnchor, o[0], o[1], e.lowerDuration, e.upperDuration) : void 0;
	return s === void 0 ? Yc(e) : Lc(e, s, "root"), i;
}
function Uc(e) {
	e.stage = "validate", e.rollout = Cc(e.terminalOrigin, e.selected.coastPitch), e.rollout.step = 1 / 120;
}
function Wc(e, t, n = e.rollout.state) {
	e.validatedTicks = [...e.validatedTicks ?? [], Y(t.burnDuration)], e.selected = t, e.terminalOrigin = V(n), Uc(e);
}
function Gc(e) {
	let t = e.forecast.handoff, n = t.time, r = 6 * t.x / n ** 2 + 2 * t.vx / n, i = 6 * t.height / n ** 2 + 2 * t.vy / n - 8 / n - A(s + k.bodyCentreAltitude, 0);
	return Math.atan2(r, Math.max(0, i));
}
function Kc(e) {
	return e.forecast.handoff.lateralFeasible && Math.abs(Gc(e)) <= k.maxPitch;
}
function qc(e) {
	let t = [{
		candidate: e.low,
		ready: e.lowReady
	}, {
		candidate: e.high,
		ready: e.highReady
	}].filter((e) => !!e.candidate && !!e.ready).sort((e, t) => Math.abs(e.candidate.forecast.rangeError) - Math.abs(t.candidate.forecast.rangeError));
	for (let n of t) if (Kc(n.candidate) && !(e.validatedTicks ?? []).includes(Y(n.candidate.burnDuration))) return Wc(e, n.candidate, n.ready), !0;
	return !1;
}
function Jc(e) {
	return e.status.landed && !e.status.onTheGround && e.vehicle.propellantMass > 0 && !Object.entries(e.failures).some(([e, t]) => e !== "randomFailure" && t);
}
function Yc(e) {
	if (e.iterations >= 16) {
		qc(e) || (e.done = !0);
		return;
	}
	if (e.low && e.high) {
		let t = (e.previousCandidate && e.lastCandidate ? es(e.previousCandidate, e.lastCandidate, e.low, e.high) : void 0) ?? Zo(e.low, e.high);
		t === void 0 ? e.done = !0 : Lc(e, t, "root");
		return;
	}
	let t = e.low?.burnDuration ?? e.lowerDuration, n = e.high?.burnDuration ?? e.upperDuration, r = e.probeDuration ?? (e.low && !e.high && t === e.firstDuration ? Math.min((Y(t) + 1) / 120, n) : e.high && !e.low && n === e.firstDuration ? Math.max((Y(n) - 1) / 120, t) : (t + n) / 2);
	if (delete e.probeDuration, r <= t || r >= n) {
		let r = (t + n) / 2;
		r <= t || r >= n ? e.done = !0 : Lc(e, r, "upper");
	} else Lc(e, r, "upper");
}
function Xc(e) {
	let t = Fc(e);
	zc(e), e.lastCandidate ? e.previousCandidate = e.lastCandidate : delete e.previousCandidate, e.lastCandidate = t;
	let n = Math.sign(e.origin.autopilot.boosterRangeError ?? e.origin.kinematics.downRangeDistance - p) || 1;
	if (e.stage === "low") {
		if (Ic(t) && (e.low = t, e.lowReady = V(e.rollout.state), e.origin.autopilot.boosterPhase === "coast" || Kc(t))) {
			Wc(e, t);
			return;
		}
		Lc(e, e.firstDuration, "upper");
		return;
	}
	if (Ic(t)) {
		if (t.forecast.rangeError * n >= 0) {
			let n = e.low ? Qo(e.low, t, e.upperDuration) : void 0;
			n !== void 0 && (e.probeDuration = n), e.low = t, e.lowReady = V(e.rollout.state);
		} else {
			let n = e.high ? Qo(e.high, t, e.upperDuration, e.lowerDuration) : void 0;
			n !== void 0 && (e.probeDuration = n), e.high = t, e.highReady = V(e.rollout.state);
		}
		if ((!e.low || !e.high) && Kc(t)) {
			Wc(e, t);
			return;
		}
		if (e.low && e.high && !e.bracketRefined) {
			e.bracketRefined = !0;
			let t = Zo(e.low, e.high), n = t === void 0 ? void 0 : Y(t);
			if (n !== void 0 && n > Y(e.low.burnDuration) && n < Y(e.high.burnDuration) && !e.attemptedTicks.includes(n) && e.iterations < 16) {
				Lc(e, t, "root");
				return;
			}
		}
		if (Vc(e, t)) return;
		if (e.hintAnchor && !e.hintRefined && t !== e.hintAnchor) {
			e.hintRefined = !0;
			let n = e.low && e.high ? Zo(e.low, e.high) : Qo(e.hintAnchor, t, e.upperDuration, e.lowerDuration);
			if (n !== void 0) {
				Lc(e, n, "root");
				return;
			}
		}
		if (Kc(t)) {
			Wc(e, t);
			return;
		}
	} else Number.isFinite(t.forecast.rangeError) && t.forecast.rangeError * n > 0 ? e.lowerDuration = e.duration : e.upperDuration = e.duration;
	Yc(e);
}
function Zc(e, t, n, r, i, a = !1) {
	Yo(e);
	let o = e.autopilot, s = o.boosterPrediction, c = !s || s.done ? Pc(e, i, s?.published) : {
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
		if (d += wc(c.rollout, u - d, n, r, i, o.boosterSource ? {
			eligible: (t, n) => wo(e, t, n),
			paid: (t, a, o, s) => So(e, t, a, o, s, n, r, i)
		} : void 0), c.rollout.done) {
			if (c.stage === "hint") f += Hc(c, i, Mc - f);
			else if (c.stage === "validate") {
				if (a && d === l) break;
				let t = c.rollout.state, n = Jc(t), r = (!o.boosterSource || o.boosterSource.valid && o.boosterSource.checked && c.sourceLineage === o.boosterSource.lineageId) && c.origin.damage?.revision === e.damage?.revision && c.selected.damageRevision === c.origin.damage?.revision, i = r ? $o(c.selected, n, e.world.environmentTime) : void 0;
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
				i || n || c.origin.autopilot.boosterPhase === "coast" ? c.done = !0 : Yc(c);
			} else Xc(c);
		}
		if (c.done || d >= u || f >= Mc || c.rollout === t) break;
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
var Qc = rr(), X = F(), $c = ir(), el = Oa(), Z = Ha(), tl = ac(), nl = .5, rl = fc(), il = (e, t, n) => Math.max(t, Math.min(n, e));
function al(e, t) {
	for (let n = 0; n < e.engines.running.length; n++) t.includes(n) ? !e.engines.running[n] && e.engines.ignitionCountdown[n] === null && !e.engines.failed[n] && !e.failures.fuelRunOut && ts(e, n) : Go(e, n);
}
function ol(e, t, r, i, a) {
	let o = e.kinematics, s = e.autopilot, c = a.gridFins;
	Sa(e, e.atmosphere.airDensity, t, r, o.pitch, Qc, a, $c, n(-c.maxAngle));
	let l = $c.torque;
	Sa(e, e.atmosphere.airDensity, t, r, o.pitch, Qc, a, $c, n(c.maxAngle));
	let u = $c.torque, d = -c.maxAngle, f = c.maxAngle;
	if (Math.abs(u - l) > 1) {
		for (let s = 0; s < 14; s++) {
			let s = (d + f) / 2;
			Sa(e, e.atmosphere.airDensity, t, r, o.pitch, Qc, a, $c, n(s)), $c.torque < i == u > l ? d = s : f = s;
		}
		let p = (d + f) / 2;
		s.boosterFinControl = p / c.maxAngle * 100, Sa(e, e.atmosphere.airDensity, t, r, o.pitch, Qc, a, $c, n(p));
	} else s.boosterFinControl = 0;
}
function sl(e, t, n, r, i = !1) {
	let a = e.kinematics, o = e.autopilot, s = Math.atan2(Math.sin(t - a.pitch), Math.cos(t - a.pitch));
	I(e, r, X, Qc);
	let c = (s / n ** 2 - 2 * a.angularVelocity / n - (X.engineSupportAvailable ? e.forces.offAxisThrustDifferenceAcceleration : 0) - e.forces.angularDragAcceleration) * (e.damage ? X.momentOfInertia : e.vehicle.vehicleMomentOfInertia), l = (X.engineSupportAvailable ? e.forces.thrust : 0) * Fo(e.engines.running, e.atmosphere.airPressure, r), u = a.speedX - j(e.world, a.altitude), d = a.speedY - e.world.gustVertical;
	Sa(e, e.atmosphere.airDensity, u, d, a.pitch, Qc, r, $c);
	let f = $c.torque, p = l * Qc.engineArm * Math.sin(e.vehicle.gimbalPosition * .01 * S), m = f + p;
	l > 0 ? (o.pitchControl = Math.asin(il((c - f) / (l * Qc.engineArm), -Math.sin(S), Math.sin(S))) / S * 100, i ? (e.status.finActive = !0, ol(e, u, d, c - p, r)) : (o.boosterFinControl = 0, e.status.finActive = !1)) : (o.pitchControl = 0, e.status.finActive = !0, ol(e, u, d, c, r)), e.status.rcsActive = e.vehicle.rcsRunTimeRemaining > 0, o.rcsThrustCommand = e.status.rcsActive ? il((c - m) / Qc.rcsArm, -oe, oe) : 0;
}
function cl(e, t, r, i, a = !1) {
	Yo(e);
	let o = e.autopilot;
	if (i) return o.boosterReturnPlan || o.boosterPhase === "entry" || o.boosterPhase === "terminal" ? (o.boosterFallTime = Math.max(2, (o.boosterFallTime ?? 2) - t), 0) : (o.boosterRangeError === void 0 && (no(e, k.bodyCentreAltitude, el, Z, r, n(0)), Z.reached && (o.boosterRangeError = e.kinematics.downRangeDistance - p + Z.downRange, o.boosterFallTime = Z.time)), Zc(e, t, i, pl, r, a));
	if (o.boosterPredictorCountdown = (o.boosterPredictorCountdown ?? 0) - t, o.boosterPredictorCountdown > 0) return 0;
	if (no(e, k.bodyCentreAltitude, el, Z, r, n(0)), Z.reached && (o.boosterRangeError = e.kinematics.downRangeDistance - p + Z.downRange, o.boosterFallTime = Z.time), o.boosterPhase === "coast" && Z.reached) {
		no(e, k.bodyCentreAltitude, el, Z, r, n(.05));
		let t = Z.downRange;
		no(e, k.bodyCentreAltitude, el, Z, r, n(-.05));
		let i = (t - Z.downRange) / .1;
		o.boosterCoastPitch = n(Math.abs(i) > 1 ? il(-(o.boosterRangeError ?? 0) / i, -.2, .2) : 0);
	}
	let s = Math.abs(e.kinematics.accelerationX) * (o.boosterFallTime ?? 0) * .25;
	return o.boosterPredictorCountdown = o.boosterPhase === "boostback" && Math.abs(o.boosterRangeError ?? Infinity) <= 2 * s ? t : .25, 0;
}
function ll(e) {
	let t = e.kinematics;
	return $t(Math.max(k.bodyCentreAltitude, t.altitude + Math.min(0, t.speedY) * Vo - .5 * Ea(e) * Vo ** 2), el.atmosphere), Hs(el.atmosphere.airDensity);
}
function ul(e, t) {
	if (I(e, t, X), !X.engineSupportAvailable || !X.hasMass || O.some((t) => e.engines.failed[t])) return !1;
	let n = Math.max(0, -e.kinematics.speedY);
	if (n === 0) return !1;
	let r = Ea(e), i = O.every((t) => e.engines.running[t]) ? 0 : Vo, a = Math.max(0, (100 - e.vehicle.throttleCurrent) / 60), o = Math.max(i, a), s = n * o + .5 * r * o ** 2, c = n + r * o, l = Ba(3, X.totalMass, c, k.bodyCentreAltitude, t), u = e.kinematics.altitude <= l + s ? Va(3, X.totalMass, c, k.bodyCentreAltitude, el, t, X.retainedDryMass) : null;
	return u !== null && e.kinematics.altitude <= u + s;
}
function dl(e, t, n, r) {
	let i = e.autopilot;
	if (r && vo(e, t), i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn) {
		i.boosterFinControl = void 0, Jo(i);
		return;
	}
	e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp || (i.boosterPhase ||= "align-boost", r || cl(e, t, n), pl(e, t, n));
}
function fl(e, t, n, r) {
	let i = e.autopilot;
	if (i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn || e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp) return;
	yo(e);
	let a = xo(e, t, r, pl, n), o = cl(e, t, n, r, !!a);
	bo(e, t, r, pl, n, a && (Co(e, a) || o >= Math.max(1, Math.floor(480 * t))) ? a : void 0);
}
function pl(e, t, r) {
	Yo(e);
	let i = e.autopilot, a = e.kinematics;
	if (i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn) {
		i.boosterFinControl = void 0;
		return;
	}
	if (e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp) return;
	e.status.translationModeOn = !0, e.status.finLocked = !1, e.status.dumpingFuel = !1, i.boosterPhase ||= "align-boost";
	let o = (i.boosterRangeError ?? a.downRangeDistance - p) >= 0 ? -1 : 1;
	if (i.boosterPhase === "align-boost") {
		al(e, []), e.vehicle.throttle = 100;
		let t = n(o * Math.PI / 2);
		sl(e, t, 1.5, r), Math.abs(Math.atan2(Math.sin(t - a.pitch), Math.cos(t - a.pitch))) < 5 * Math.PI / 180 && Math.abs(a.angularVelocity) < .1 && (i.boosterPhase = "boostback");
	} else if (i.boosterPhase === "boostback") al(e, dt), e.vehicle.throttle = 100, i.boostBackInitCompleted ||= (i.boostBackDirection = o, !0), sl(e, n(i.boostBackDirection * Math.PI / 2), 1.5, r), !i.boosterForecastBurn && i.boosterReturnPlan && e.world.environmentTime + t >= i.boosterReturnPlan.shutdownAt && (al(e, []), i.boosterPhase = "coast");
	else if (i.boosterPhase === "coast") al(e, []), e.vehicle.throttle = 100, sl(e, i.boosterReturnPlan?.coastPitch ?? i.boosterCoastPitch ?? n(0), 1.5, r), ul(e, r) ? i.boosterPhase = "terminal" : Math.hypot(a.speedX - j(e.world, a.altitude), a.speedY - e.world.gustVertical) > ll(e) && (i.boosterPhase = "entry");
	else if (i.boosterPhase === "entry") {
		al(e, i.boosterEntryCentreOnly ? O : dt);
		let t = ll(e), n = Math.sqrt(Math.max(0, t ** 2 - a.speedX ** 2)), o = Math.max(0, -a.speedY - n) / 2, s = Math.max(2, 2 * Math.max(0, a.altitude - k.bodyCentreAltitude) / (Math.max(0, -a.speedY) + 2)), c = -6 * (a.downRangeDistance - p) / s ** 2 - 4 * a.speedX / s;
		oc(e, c, o, r, tl), I(e, r, X);
		let l = X.engineSupportAvailable && X.hasMass ? H([
			!0,
			!0,
			!0
		], e.atmosphere.airPressure, r) / X.totalMass : 0;
		O.every((t) => e.engines.running[t]) && Math.hypot(tl.requiredX, tl.requiredY) <= l && (i.boosterEntryCentreOnly = !0, al(e, O)), uc(e, c, o, r, tl), sl(e, tl.pitch, .5, r), e.vehicle.throttle = dc(e, o, r), ul(e, r) ? i.boosterPhase = "terminal" : a.speedY >= 0 && (al(e, []), i.boosterPhase = "coast");
	} else {
		if (i.boosterTerminalMissed) {
			al(e, []), sl(e, n(0), .5, r);
			return;
		}
		if (i.boosterTerminalIgnitionTime === void 0 && (i.boosterTerminalIgnitionTime = e.world.environmentTime), al(e, O), O.some((t) => e.engines.failed[t]) && (i.boosterTerminalMissed = !0), !O.every((t) => e.engines.running[t]) && (e.world.environmentTime - i.boosterTerminalIgnitionTime > Vo + 2 * t && (i.boosterTerminalMissed = !0), !i.boosterTerminalMissed)) {
			e.vehicle.throttle = 100, sl(e, n(0), .5, r);
			return;
		}
		if (gc(e, t, r, rl), i.boosterArrivalTime === 0 && (i.boosterTerminalMissed = !0), i.boosterTerminalMissed) {
			al(e, []), sl(e, n(0), .5, r);
			return;
		}
		oc(e, rl.centreAX, rl.centreAY, r, tl), sl(e, n(0), nl, r, !0), i.pitchControl = il(-Math.atan2(Math.sin(tl.pitch - a.pitch), Math.cos(tl.pitch - a.pitch)) / S * 100, -100, 100), e.vehicle.throttle = dc(e, rl.centreAY, r), H(e.engines.running, e.atmosphere.airPressure, r) === 0 && (e.vehicle.throttle = 100);
	}
}
//#endregion
//#region src/core/autopilot/booster-utilities.ts
function ml(e, t) {
	let { autopilot: r, kinematics: i } = e;
	r.manualControlOn || e.failures.crashed || e.failures.inFlightBreakUp || e.status.landed || (r.pitchHoldOn && (Math.abs(i.pitchRateOfChange) < .4 && (r.holdingPitch = i.pitch), e.status.translationModeOn = !0, sl(e, r.holdingPitch, .5, t)), !r.autoTakeOffOn) || (r.autoTakeOffInitialised ||= (r.autoMaxThrustOn = !0, e.engines.running.some(Boolean) || U(e, t), !0), e.status.translationModeOn = !0, sl(e, i.altitude < 25e3 ? n(De * i.altitude / 25e3) : i.altitude < 8e4 ? n(De + (Oe - De) * (i.altitude - 25e3) / 55e3) : Oe, 3, t), e.vehicle.propellantMass < 12e3 && e.engines.running.some(Boolean) && (U(e, t), r.autoTakeOffOn = !1));
}
var hl = bn(s), gl = Oa(), _l = F();
function vl(e) {
	if (I(e, E, _l), !_l.engineSupportAvailable || !_l.hasMass) return 0;
	let t = _l.totalMass * hl, n = 1;
	return T(E.propulsion, "sea-level", 101325 / 1e3) * .8 < t && (n = 2), T(E.propulsion, "sea-level", 101325 / 1e3) * 2 * .8 < t && (n = 3), Math.min(n, Mo(e.engines.failed));
}
function yl(e) {
	return Va(vl(e), _l.totalMass, -e.kinematics.speedY, 0, gl, E, _l.retainedDryMass) ?? e.kinematics.altitude;
}
function bl(e) {
	let t = -e.kinematics.speedY;
	I(e, E, _l);
	let n = Va(_l.engineSupportAvailable ? jo(e.engines.running) : 0, _l.totalMass, t, E.height * .5, gl, E, _l.retainedDryMass);
	return n === null ? e.kinematics.altitude : n + t * 1 * .5;
}
//#endregion
//#region src/core/autopilot/index.ts
var xl = ts, Sl = ns, Cl = rr(), Q = F();
function wl(e) {
	let { autopilot: t, kinematics: n } = e;
	!t.pitchHoldOn || t.manualControlOn || (Math.abs(n.pitchRateOfChange) < .4 && (t.holdingPitch = n.pitch), G(e, t.holdingPitch, .5));
}
function Tl(e, t = E) {
	e.autopilot.autoMaxThrustOn && Js(e, Hs(e.atmosphere.airDensity), 10, 4, t);
}
function El(e) {
	let { autopilot: t, kinematics: r, vehicle: i, engines: a, status: o } = e;
	!t.autoTakeOffOn || t.manualControlOn || (t.autoTakeOffInitialised ||= (t.autoMaxThrustOn || as(e), ko(a.running) === 0 && U(e), o.finActive && ns(e), o.finLocked = !0, !0), r.altitude < 25e3 ? G(e, n(De * r.altitude / 25e3), 3) : r.altitude < 8e4 ? G(e, n(De + (Oe - De) * (r.altitude - 25e3) / 55e3), 3) : G(e, Oe, 3), i.propellantMass < 12e3 && ko(a.running) > 0 && (U(e), os(e), o.finLocked = !1));
}
function Dl(e, t) {
	let { autopilot: r, kinematics: i, vehicle: a, engines: o } = e;
	if (!r.autoBoostBackOn || r.manualControlOn) return;
	let s = () => {
		ss(e), Ol(e), r.autoLandOn || cs(e);
	};
	if (r.boostBackInitCompleted ||= (r.boostBackDirection = i.downRangeDistance > p - 100 ? -Math.PI * .5 : Math.PI * .5, e.status.rcsActive || rs(e), ko(o.running) === 0 && U(e), r.autoMaxThrustOn || as(e), r.autoTakeOffOn && os(e), !0), !r.accelerationStageCompleted) r.decelerationStageEstDuration = Math.abs(i.speedX) / ye + 4, G(e, n(r.boostBackDirection), 1.5), (p - i.downRangeDistance - 100) / (i.speedX * .5) < r.decelerationStageEstDuration + 2 && (p - i.downRangeDistance) / i.speedX > 0 && (U(e), r.autoMaxThrustOn && as(e), r.accelerationStageCompleted = !0);
	else if (r.boostBackDecelerationStageInitCompleted ||= (r.boostBackDecelerationCheckCountdown = 5, !0), r.boostBackDecelerationCheckCountdown !== null && (r.boostBackDecelerationCheckCountdown -= t, r.boostBackDecelerationCheckCountdown <= 0 && (r.boostBackDecelerationCheckCountdown = null, i.accelerationX < 14.906640000000001 && (r.boostBackAeroDeceleration = !1, U(e)))), r.boostBackAeroDeceleration ? Xs(e, r.boostBackDirection < 0 ? ye : -ye, t, Sl) : (G(e, n(-r.boostBackDirection), 1), Zs(e, xl), Ws(e, ye)), Math.abs(i.speedX) < 3) {
		s();
		return;
	}
	(a.propellantMass < 12e3 || i.altitude < 700 && i.speedY < 0) && s();
}
function Ol(e) {
	let { autopilot: t } = e;
	t.autoBoostBackOn = !1, t.decelerationStageEstDuration = 0, t.boostBackDirection = 0, t.boostBackInitCompleted = !1, t.boostBackAeroDeceleration = !0, t.boostBackDecelerationStageInitCompleted = !1, t.boostBackDecelerationCheckCountdown = null, t.accelerationStageCompleted = !1;
}
function kl(e) {
	let { autopilot: t } = e;
	t.autoLandOn = !1, t.initVehicleConfigCompleted = !1, t.landingSiteXPos = p, t.aeroDescentCompleted = !1, t.fineTunePercentage = void 0, t.bellyFlopTriggerAltitude = 0, t.flipStageInitialised = !1, t.flipCompleted = !1, t.horizontalAdjustmentStageCompleted = !1, t.horizontalAdjustmentStageInitialised = !1, t.horizontalAdjustmentTimeLeft = void 0, t.horizontalAdjustmentDesiredSpeed = void 0, t.effectiveVerticalMaxThrust = void 0, t.finalStagePessimisticAltitude = void 0, t.finalDescentStageInitialised = !1, t.distanceToGround = void 0, t.finalDescentStageCompleted = !1;
}
function Al(e, t) {
	let { autopilot: n, vehicle: r, engines: i, status: a } = e;
	!n.autoLandOn || n.manualControlOn || (n.initVehicleConfigCompleted ||= (a.finActive || ns(e), a.rcsActive || rs(e), r.throttle = 40, r.propellantMass > 18e3 && !a.dumpingFuel && is(e), ko(i.running) > 0 && U(e), !0), a.dumpingFuel && r.propellantMass <= 18e3 && is(e), n.aeroDescentCompleted ? n.flipCompleted ? n.horizontalAdjustmentStageCompleted ? n.finalDescentStageCompleted || Fl(e, t) : Pl(e) : Nl(e) : (jl(e), Ml(e)));
}
function jl(e) {
	let { autopilot: t, kinematics: n } = e;
	if (n.altitude >= 2500) return;
	let r = vl(e) > 1 ? Ee : we;
	t.finalStagePessimisticAltitude = yl(e), I(e, E, Q, Cl);
	let i = Q.engineSupportAvailable ? Math.min(1, Mo(e.engines.failed)) : 0, a = i > 0 && Q.momentOfInertia > 0 && Cl.engineArm > 0 ? $e(i * T(E.propulsion, "sea-level", ie / 1e3) * 40 * .01, Cl.engineArm, Q.momentOfInertia) : 0;
	if (!(a > 0)) {
		t.bellyFlopTriggerAltitude = Infinity;
		return;
	}
	let o = Math.sqrt((Math.PI / 2 + Se) / 2 / a * 2) * 2;
	t.bellyFlopTriggerAltitude = t.finalStagePessimisticAltitude + -n.speedY * (o + Vo) - -30 * r + E.height / 2;
}
function Ml(e) {
	let { autopilot: t, kinematics: r } = e, i = r.downRangeDistance - t.landingSiteXPos + 100, a = -i / r.speedX, o;
	Math.abs(r.speedX) > 20 ? o = r.angleOfMotion - Math.PI : i > 0 ? (o = -xe, a < 5 && a > 0 && (t.fineTunePercentage = Math.abs(r.speedX) > 5 ? 1 : Math.abs(r.speedX) / 5, o = xe * 2 * t.fineTunePercentage)) : (o = xe, a < 5 && a > 0 && (t.fineTunePercentage = Math.abs(r.speedX) > 5 ? 1 : Math.abs(r.speedX) / 5, o = -xe * 2 * t.fineTunePercentage)), G(e, n(o + Math.PI / 2), .7), (r.altitude < t.bellyFlopTriggerAltitude && r.speedY < 5 && r.altitude < 2500 || r.altitude < 300) && (t.aeroDescentCompleted = !0);
}
function Nl(e) {
	let { autopilot: t, kinematics: n, vehicle: r, status: i } = e;
	t.flipStageInitialised ||= (i.dumpingFuel && is(e), i.rcsActive && rs(e), U(e), !0), G(e, Se, .4), n.pitch < 0 && (r.throttle = 100), n.pitch < Se && (t.flipCompleted = !0);
}
function Pl(e) {
	let { autopilot: t, kinematics: n, engines: r, status: i } = e;
	t.horizontalAdjustmentStageInitialised ||= (i.finActive && ns(e), i.finLocked = !0, jo(r.running) < 3 && (t.horizontalAdjustmentVerticalSpeedLimit /= 1.5, t.horizontalAdjustmentHorizontalSpeedLimit *= 2), !0);
	let a = t.landingSiteXPos - n.downRangeDistance, [o, s, c] = r.running;
	o && !s && !c ? a -= 12 : (!o && s && c || !o && (s && !c || !s && c)) && (a += 4), t.finalStagePessimisticAltitude = bl(e), t.horizontalAdjustmentTimeLeft = (n.altitude - t.finalStagePessimisticAltitude - E.height / 2) / -n.speedY, t.horizontalAdjustmentDesiredSpeed = a / t.horizontalAdjustmentTimeLeft, t.horizontalAdjustmentDesiredSpeed > t.horizontalAdjustmentHorizontalSpeedLimit ? t.horizontalAdjustmentDesiredSpeed = t.horizontalAdjustmentHorizontalSpeedLimit : t.horizontalAdjustmentDesiredSpeed < -t.horizontalAdjustmentHorizontalSpeedLimit && (t.horizontalAdjustmentDesiredSpeed = -t.horizontalAdjustmentHorizontalSpeedLimit), n.speedY > t.horizontalAdjustmentVerticalSpeedLimit && Zs(e, xl), t.horizontalAdjustmentTimeLeft < 3 && t.horizontalAdjustmentTimeLeft > -3 ? Ks(e, 0, Ce, 10, .8) : Ks(e, t.horizontalAdjustmentDesiredSpeed ?? 0, Ce, 6, 1), qs(e, t.horizontalAdjustmentVerticalSpeedLimit, 10, 2), t.finalStagePessimisticAltitude * 1.1 > n.altitude && (t.horizontalAdjustmentStageCompleted = !0);
}
function Fl(e, t, r = -5, i) {
	let { autopilot: a, kinematics: o, vehicle: s, engines: c, status: l } = e;
	if (a.finalDescentStageInitialised ||= !0, a.distanceToGround = o.altitude - E.height * .5, o.altitude > E.height * .5 + 5) {
		let [t, r, i] = c.running;
		t && !r && !i ? Ks(e, -.8, n(Ce / 2), 5, .7) : !t && r && i ? Ks(e, .8, n(Ce / 2), 5, .7) : !t && (r && !i || !r && i) ? Ks(e, .72, n(Ce / 2), 5, .7) : Ks(e, 0, n(Ce / 2), 5, .7);
	} else G(e, n(0), .4);
	o.speedY > r && Zs(e, xl);
	let u = -a.distanceToGround / 3 - .1, d = Ea(e);
	I(e, E, Q);
	let f = (Q.engineSupportAvailable && Q.hasMass ? Vs(c.running, s.gimbalPointingDirection, e.atmosphere.airPressure, o.pitch) / Q.totalMass : 0) - d, p = Math.sqrt(2 * Math.max(0, f) * Math.max(0, a.distanceToGround));
	if (!i && f > 0 && -u > p) {
		let t = o.speedY + p, n = 1 + f / d - t / 10;
		Gs(e, Math.max(0, Math.min(3, n)));
	} else qs(e, u, 10, 3);
	if (o.altitude <= E.height * .5 + .05) {
		if (i) {
			i(e);
			return;
		}
		s.throttle = 40, U(e), l.forceDump = !0, l.dumpingFuel || is(e), cs(e), kl(e);
	}
}
function Il(e, t) {
	e.autopilot.demoAutoLandOn && Fl(e, t, -20, (e) => {
		U(e), e.autopilot.demoAutoLandOn = !1, e.status.finLocked = !1, e.vehicle.propellantMass = h, e.autopilot.pitchControl = 0, e.vehicle.throttle = 100;
	});
}
var Ll = n(-Math.PI / 2);
function Rl(e) {
	let t = e.autopilot.landingSiteXPos - e.kinematics.downRangeDistance;
	return t < 0 ? t + c : t;
}
function zl(e) {
	let { kinematics: t } = e;
	return wn(t.distanceToPlanetCenter, t.speedX, t.speedY, s + ve) + _e;
}
function Bl(e) {
	let { kinematics: t, engines: n } = e;
	if (I(e, E, Q), !Q.engineSupportAvailable || !Q.hasMass) return Infinity;
	let r = Mo(n.failed);
	if (r <= 0) return Infinity;
	let i = 150 * Q.totalMass / (r * T(E.propulsion, "sea-level", e.atmosphere.airPressure));
	return (t.speedX - 75) * i + wn(t.distanceToPlanetCenter, t.speedX - 150, t.speedY, s + ve) + _e;
}
function Vl(e) {
	let { autopilot: t, kinematics: n, vehicle: r, engines: i, status: a } = e;
	if (!(!t.autoDeorbitOn || t.manualControlOn)) {
		if (t.deorbitInitCompleted ||= (t.landingSiteXPos = p, a.rcsActive || rs(e), ko(i.running) > 0 && U(e), r.throttle = 100, !0), G(e, Ll, 4), !t.deorbitBurnStarted) {
			let i = Bl(e);
			Number.isFinite(i) && Rl(e) <= i && (t.deorbitTargetSpeed = n.speedX, U(e), r.throttle = 100, t.deorbitBurnStarted = !0);
			return;
		}
		if (!t.deorbitBurnCompleted) {
			let a = t.deorbitTargetSpeed - n.speedX;
			(a >= 75 && zl(e) <= Rl(e) || a >= 240) && (ko(i.running) > 0 && U(e), r.throttle = 40, t.deorbitBurnCompleted = !0);
			return;
		}
		n.speedY < 0 && (t.autoDeorbitOn = !1, t.autoLandOn || cs(e));
	}
}
function Hl(e, t, n = E, r) {
	if (n.id === "super-heavy") {
		let i = e.autopilot.autoLandOn || e.autopilot.autoBoostBackOn;
		dl(e, t, n, r), i || (Tl(e, n), ml(e, n));
		return;
	}
	Il(e, t), Tl(e), wl(e), El(e), Al(e, t), Dl(e, t), Vl(e);
}
//#endregion
//#region src/core/control/actuation.ts
function Ul(e, t, n, r = !1) {
	return e < t + n && e > t - n ? t : (r ? e <= t : e < t) ? e + n : e - n;
}
function Wl(e, t, n) {
	e.vehicle.frontFinExtension = Ul(e.vehicle.frontFinExtension, t, 120 * n);
}
function Gl(e, t, n) {
	e.vehicle.aftFinExtension = Ul(e.vehicle.aftFinExtension, t, 120 * n, !0);
}
function Kl(e, t, n) {
	let { status: r, kinematics: i } = e;
	r.finActive ? i.angleOfAttack < 0 ? (Wl(e, 50 - t, n), Gl(e, 50 + t, n)) : (Wl(e, 50 + t, n), Gl(e, 50 - t, n)) : r.finLocked ? (Wl(e, 0, n), Gl(e, 0, n)) : (Wl(e, 100, n), Gl(e, 100, n));
}
function ql(e, t, n, r = !1) {
	let { status: i, vehicle: a, forces: o, autopilot: s } = e, c = s.rcsThrustCommand;
	if (s.rcsThrustCommand = 0, !i.rcsActive || a.rcsRunTimeRemaining <= 0) {
		o.rcsThrust = 0;
		return;
	}
	if (o.rcsThrust = r ? Math.max(-oe, Math.min(oe, c)) : t > 99 ? oe : t < -99 ? -oe : c, o.rcsThrust !== 0) {
		let e = 1 / n, t = Math.abs(o.rcsThrust) / oe, r = a.rcsRunTimeRemaining * e;
		t >= r ? (o.rcsThrust = Math.sign(o.rcsThrust) * oe * r, a.rcsRunTimeRemaining = 0) : a.rcsRunTimeRemaining = (r - t) / e;
	}
}
function Jl(e, t, n) {
	e.vehicle.gimbalPosition = Ul(e.vehicle.gimbalPosition, t, 600 * n);
}
function Yl(e, t) {
	e.vehicle.throttleCurrent = Ul(e.vehicle.throttleCurrent, e.vehicle.throttle, 60 * t);
}
function Xl(e, t, n, r = E, i = !1) {
	e.status.translationModeOn && (r.gridFins ? (Wl(e, 50 + (e.status.finActive && !e.status.finLocked ? Math.max(-100, Math.min(100, e.autopilot.boosterFinControl ?? t)) : 0) / 2, n), Gl(e, 50, n)) : Kl(e, t / 2, n), ql(e, t, n, !!r.gridFins && !i && !e.autopilot.manualControlOn && (e.autopilot.autoLandOn || e.autopilot.autoBoostBackOn || e.autopilot.pitchHoldOn || e.autopilot.autoTakeOffOn) && e.autopilot.boosterFinControl !== void 0), Jl(e, t, n));
}
//#endregion
//#region src/core/control/mechanical.ts
function Zl(e, t, n, r, i, a, o, s = !0) {
	if (t.damage && !t.damage.terminal.active) {
		let e = t.damage.revision;
		wa(t, n, i, "hull"), t.damage.revision !== e && i.id === "super-heavy" && Jo(t.autopilot);
	}
	return t.damage?.terminal.active ? (Ds(t, i, o), t.world.environmentTime += n, t) : (a(t, n, i), r.throttle !== void 0 && (t.vehicle.throttle = r.throttle), r.pitchControl !== void 0 && (t.autopilot.pitchControl = r.pitchControl, i.gridFins && (t.autopilot.boosterFinControl = r.pitchControl)), Xl(t, t.autopilot.pitchControl, n, i, r.pitchControl !== void 0), Yl(t, n), Ds(t, i, o), s && i.id === "super-heavy" && rc(e, t, i), t.world.environmentTime += n, !t.failures.crashed && !t.failures.inFlightBreakUp && !t.status.onTheGround && !t.status.landed && (t.world.timeSpent += n), t);
}
//#endregion
//#region src/core/physics/body-reference.ts
function Ql(e, t, n, r) {
	let i = Math.sin(e.pitch), a = Math.cos(e.pitch), o = a * t + i * n, c = -i * t + a * n, l = e.angularVelocity, u = e.angularAcceleration;
	r.downRangeDistance = e.downRangeDistance + o, r.downRangeDistanceNextFrame = r.downRangeDistance, r.altitude = e.altitude + c, r.speedX = e.speedX + l * c, r.speedY = e.speedY - l * o, r.accelerationX = e.accelerationX + u * c - l ** 2 * o, r.accelerationY = e.accelerationY - u * o - l ** 2 * c, r.pitch = e.pitch, r.angularVelocity = l, r.angularAcceleration = u, r.distanceToPlanetCenter = s + r.altitude, r.orbitalVelocityAtCurrentAltitude = yn(r.distanceToPlanetCenter), r.trueSpeed = Math.hypot(r.speedX, r.speedY), r.totalAcceleration = Math.hypot(r.accelerationX, r.accelerationY);
}
//#endregion
//#region src/core/mission-free-flight.ts
var $ = Ss(), $l = { ...E }, eu = { ...Ct };
function tu(e, t, n, r) {
	let i = e.kinematics, a = Math.sin(i.pitch), o = Math.cos(i.pitch);
	e.damage ? (t.pitch = i.pitch, t.angularVelocity = i.angularVelocity, t.angularAcceleration = i.angularAcceleration, Ql(t, -r, -n, i)) : (i.downRangeDistance = t.downRangeDistance - n * a, i.downRangeDistanceNextFrame = i.downRangeDistance, i.altitude = t.altitude - n * o, i.distanceToPlanetCenter = s + i.altitude, i.orbitalVelocityAtCurrentAltitude = yn(i.distanceToPlanetCenter), i.speedX = t.speedX - n * i.angularVelocity * o, i.speedY = t.speedY + n * i.angularVelocity * a, i.accelerationX = t.accelerationX - n * (i.angularAcceleration * o - i.angularVelocity ** 2 * a), i.accelerationY = t.accelerationY + n * (i.angularAcceleration * a + i.angularVelocity ** 2 * o), i.totalAcceleration = Math.hypot(i.accelerationX, i.accelerationY)), i.trueSpeed = Math.hypot(i.speedX, i.speedY), i.machSpeed = tt(i.speedX, i.speedY, j(e.world, i.altitude), e.world.gustVertical) / rn(e.atmosphere.airTemperature);
}
function nu(e, t, n, r, i) {
	let a = Do(e);
	if (r.id === "super-heavy" && e.status.landed) return a.damage && ta(a.damage, P(r).debris, t), a.engines.running.fill(!1), a.engines.ignitionCountdown.fill(null), a.world.environmentTime += t, a.world.updatedFrameCount += 1, a;
	if (r.id === "super-heavy" && (n.pitchControl !== void 0 || n.throttle !== void 0) && Jo(a.autopilot), a.damage?.terminal.active) return ta(a.damage, P(r).debris, t), ma(a), a.world.environmentTime += t, a.world.updatedFrameCount++, a;
	if (As(a, t, r, $), a.damage && ta(a.damage, P(r).debris, t), a.damage?.terminal.active) return a.engines.running.fill(!1), a.engines.ignitionCountdown.fill(null), a.world.environmentTime += t, a;
	va(a, r, $.massProperties);
	let o = a.kinematics, c = (a.damage ? $.massProperties.centreOfMass : Qn(a.vehicle.propellantMass, r)) - r.height / 2, l = a.damage ? $.massProperties.centreOfMassX : 0, u = Math.sin(o.pitch), d = Math.cos(o.pitch), f = {
		...o,
		downRangeDistance: o.downRangeDistance + c * u,
		altitude: o.altitude + c * d,
		speedX: o.speedX + c * o.angularVelocity * d,
		speedY: o.speedY - c * o.angularVelocity * u
	};
	a.damage && Ql(o, l, c, f), f.distanceToPlanetCenter = s + f.altitude;
	let p = r.id === "ship" ? $l : eu;
	p.height = r.height + 2 * c * Math.sign(d);
	let m = js({
		kinematics: f,
		forces: a.forces,
		status: a.status,
		failures: a.failures
	}, t, $.bodyAccelerationX, $.bodyAccelerationY, p, a.damage ? r.height * Math.abs(d) / 2 + (f.altitude - o.altitude) : void 0);
	m && (o.angularVelocity = 0), a.damage ? va(a, r, $.massProperties) : nr(a.vehicle.propellantMass, $.massProperties, r), a.vehicle.vehicleMomentOfInertia = $.massProperties.momentOfInertia, Ns(a, t, m, $), tu(a, f, c, l), Ms(a, t, $);
	let h = Ps(a, r, $);
	return Fs(a, t, m, $.omega0, $.alpha0, h), tu(a, f, c, l), Zl(e, a, t, n, r, i, $);
}
//#endregion
//#region src/core/step.ts
var ru = {}, iu = Ss();
function au(e, t, n = ru, r = E) {
	let i = cu(e, t, n, r, ou);
	return r.id === "super-heavy" && !i.damage?.terminal.active && fl(i, t, r, su), i;
}
function ou(e, t, n) {
	Hl(e, t, n, su);
}
function su(e, t, n, r) {
	return cu(e, t, ru, r, n);
}
function cu(e, t, n, r, i) {
	if (e.damage) return nu(e, t, n, r, i);
	let a = Do(e);
	if (r.id === "super-heavy" && e.status.landed) return a.engines.running.fill(!1), a.engines.ignitionCountdown.fill(null), a.world.environmentTime += t, a.world.updatedFrameCount += 1, a;
	r.id === "super-heavy" && (n.pitchControl !== void 0 || n.throttle !== void 0) && Jo(a.autopilot), As(a, t, r, iu);
	let o = js(a, t, iu.bodyAccelerationX, iu.bodyAccelerationY, r);
	return Ms(a, t, iu), Is(a, t, r, iu, o), Zl(e, a, t, n, r, i, iu);
}
//#endregion
export { Ze as $, Ha as A, P as B, Ma as C, to as D, Ta as E, Da as F, A as G, Xi as H, no as I, rn as J, mn as K, Za as L, Va as M, Ea as N, Ba as O, ja as P, at as Q, I as R, B as S, Wa as T, Wn as U, Ji as V, Cn as W, k as X, $t as Y, Ct as Z, cs as _, $s as a, se as at, Eo as b, ds as c, p as ct, ps as d, n as dt, Je as et, ls as f, a as ft, _s as g, ys as h, Qs as i, E as it, eo as j, Oa as k, us as l, o as lt, vs as m, au as n, Xe as nt, gs as o, f as ot, xs as p, i as pt, hn as q, pl as r, it as rt, fs as s, s as st, su as t, D as tt, hs as u, r as ut, To as v, Ua as w, Oo as x, Do as y, F as z };

//# sourceMappingURL=simulation-Cnsem1hb.js.map