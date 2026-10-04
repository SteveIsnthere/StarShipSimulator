//#region src/core/units.ts
function e(e) {
	return e;
}
function t(e) {
	return e;
}
function n(e) {
	return e / 180 * Math.PI;
}
function r(e) {
	return e / Math.PI * 180;
}
var i = e(0), a = 6371e3, o = 2 * a * Math.PI, s = 3986004418e5;
o / 86400;
var c = 7292115e-11, l = n(t(25.997));
c * Math.cos(l);
var u = 9.807, d = o / 2, f = Math.PI * (9 / 2) ** 2, p = 35e4, m = 47e4, h = 3500;
m * (9 / 2) ** 2 * .25 + m * 2500 / 12;
var g = .1, _ = 1 / 2, v = 1 / 2, y = (e, t) => ({
	kind: e,
	offAxis: t,
	offAxisForceFraction: -t / Math.sqrt(t ** 2 + 625)
}), ee = [
	y("sea-level", -1),
	y("sea-level", _),
	y("sea-level", v),
	y("vacuum", -3),
	y("vacuum", 1.5),
	y("vacuum", 1.5)
], b = ee.flatMap((e, t) => e.kind === "sea-level" ? [t] : []), x = 21.8, S = n(t(15)), C = 9.80665, te = 23e4 * C, w = 101325;
te / (327 * C) * C * 350, 158645.8058103975 / w, 258e3 * C / (380 * C), Math.PI * (2.3 / 2) ** 2;
var ne = te, re = 8e5, ie = e(1.03), ae = 24.2, oe = 23.3, se = 45.8, ce = 12.6, le = 17415e-8, ue = 5.670374419e-8, de = .85, fe = 1533, pe = 273.15;
de * ue * fe ** 4;
var me = 841800, he = 8e4, ge = u * 1.6, _e = 1 * ne;
_e * 2, _e * 3, 1 * ne * 40 * .01;
var ve = n(t(3)), ye = n(t(10)), be = n(t(20)), xe = 5.5, Se = xe, Ce = Se * 1.5;
Se * 2;
var we = n(t(55)), Te = n(t(85)), Ee = e(Math.PI * .5), De = n(t(30));
//#endregion
//#region src/core/physics/propulsion.ts
function Oe(e, t) {
	return t === "sea-level" ? e.seaLevel.thrustSeaLevel / (e.seaLevel.ispSeaLevel * e.standardGravity) : e.vacuum.thrustVacuum / (e.vacuum.ispVacuum * e.standardGravity);
}
function T(e, t, n) {
	let r = Math.max(0, n) * 1e3, i = t === "sea-level" ? Oe(e, t) * e.standardGravity * e.seaLevel.ispVacuum : e.vacuum.thrustVacuum, a = t === "sea-level" ? (i - e.seaLevel.thrustSeaLevel) / e.referencePressurePa : e.vacuum.effectiveExitArea;
	return Math.max(0, i - r * a);
}
//#endregion
//#region src/core/vehicles/v3.ts
var ke = 9.80665, Ae = Object.freeze({
	standardGravity: ke,
	referencePressurePa: 101325,
	seaLevel: Object.freeze({
		thrustSeaLevel: 25e4 * ke,
		ispSeaLevel: 327,
		ispVacuum: 350
	}),
	vacuum: Object.freeze({
		thrustVacuum: 275e3 * ke,
		ispVacuum: 380,
		effectiveExitArea: Math.PI * (2.3 / 2) ** 2
	})
});
function je(e, t) {
	return Object.freeze({
		kind: e,
		gimballed: t
	});
}
var Me = Object.freeze({
	id: "ship",
	height: 52,
	diameter: 9,
	dryMass: 12e4,
	propellantCapacity: 16e5,
	engines: Object.freeze([
		je("sea-level", !0),
		je("sea-level", !0),
		je("sea-level", !0),
		je("vacuum", !1),
		je("vacuum", !1),
		je("vacuum", !1)
	]),
	propulsion: Ae
}), Ne = Object.freeze({
	id: "super-heavy",
	height: 72,
	diameter: 9,
	dryMass: 2e5,
	propellantCapacity: 365e4,
	engines: Object.freeze(Array.from({ length: 33 }, (e, t) => je("sea-level", t < 13))),
	propulsion: Ae,
	gridFins: Object.freeze({
		count: 3,
		area: 27
	})
});
Object.freeze({
	ship: Me,
	superHeavy: Ne
});
var Pe = 3.6 / 4.6, Fe = 1141, Ie = Me.propellantCapacity, Le = Me.height / 50, Re = 5, ze = Math.PI * (9 / 2) ** 2, Be = Ie * Pe / (Fe * ze), Ve = Ie * .21739130434782605 / (424 * ze), E = Object.freeze({
	id: "ship",
	propulsion: Me.propulsion,
	height: Me.height,
	diameter: Me.diameter,
	dryMass: Me.dryMass,
	propellantCapacity: Ie,
	initialPropellant: p,
	dryCentreOfMass: x * Le,
	tankBottom: Re,
	loxTankHeight: Be,
	ch4TankHeight: Ve,
	ch4TankBottom: Re + Be,
	aftFinStation: (x - ce) * Le,
	frontFinStation: (x + oe) * Le,
	rcsStation: (x + 20) * Le,
	minArea: f,
	maxArea: Me.height * Me.diameter,
	frontFinArea: ae,
	aftFinArea: se,
	engines: Object.freeze(ee.map((e) => Object.freeze({
		...e,
		offAxisForceFraction: -e.offAxis / Math.sqrt(e.offAxis ** 2 + (Me.height / 2) ** 2)
	}))),
	ignitionGroup: b
}), He = 0, Ue = 0;
function We() {
	He++;
}
function Ge() {
	Ue++;
}
function Ke() {
	He = 0, Ue = 0;
}
function qe() {
	return {
		isa: He,
		controls: Ue
	};
}
//#endregion
//#region src/core/physics/isa.ts
var Je = C, Ye = 287.053, Xe = 288.15, Ze = w;
function Qe() {
	let e = [
		[0, -.0065],
		[11e3, 0],
		[2e4, .001],
		[32e3, .0028],
		[47e3, 0],
		[51e3, -.0028],
		[71e3, -.002]
	], t = [], n = Xe, r = Ze;
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
		r = $e(r, n, o, c), n = l;
	}
	return t;
}
function $e(e, t, n, r) {
	return n === 0 ? e * Math.exp(-Je * r / (Ye * t)) : e * ((t + n * r) / t) ** (-Je / (Ye * n));
}
var et = Qe(), tt = 84852, nt = 6356766;
function rt(e) {
	return nt * e / (nt + e);
}
function it(e) {
	let t = et[0];
	for (let n of et) if (e >= n.baseAltitude) t = n;
	else break;
	return t;
}
var at = 86e3, ot = [
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
], st = 1e3, ct = (() => {
	let e = [], t = lt(at);
	for (let n = 0; n < ot.length; n++) {
		let [r, i] = ot[n];
		e.push({
			base: r,
			density: t,
			scaleHeight: i
		});
		let a = ot[n + 1];
		a && (t *= Math.exp(-(a[0] - r) / i));
	}
	return e;
})();
function lt(e) {
	let { pressurePascal: t, temperatureKelvin: n } = ut(e);
	return t / (Ye * n);
}
function ut(e) {
	let t = {
		pressurePascal: 0,
		temperatureKelvin: 0
	};
	return dt(e, t), t;
}
function dt(e, t) {
	let n = Math.max(rt(e), 0), r = Math.min(n, tt), i = it(r), a = r - i.baseAltitude;
	t.temperatureKelvin = i.baseTemperature + i.lapseRate * a, t.pressurePascal = $e(i.basePressure, i.baseTemperature, i.lapseRate, a);
}
function ft(e) {
	let t = {
		airTemperature: 0,
		airPressure: 0,
		airDensity: 0
	};
	return St(e, t), t;
}
var pt = 186.8673, mt = 263.1905, ht = -76.3232, gt = -19.9429, _t = 240, vt = 12, yt = nt / 1e3;
function bt(e) {
	let t = e / 1e3;
	if (t <= 91) return pt;
	if (t <= 110) return mt + ht * Math.sqrt(1 - ((t - 91) / gt) ** 2);
	if (t <= 120) return _t + vt * (t - 110);
	let n = (t - 120) * 6476.766 / (yt + t);
	return st - 640 * Math.exp(-.01875 * n);
}
var xt = {
	pressurePascal: 0,
	temperatureKelvin: 0
};
function St(e, t) {
	if (We(), e <= 86e3) {
		dt(e, xt);
		let { pressurePascal: n, temperatureKelvin: r } = xt;
		t.airTemperature = r - 273.15, t.airPressure = n / 1e3, t.airDensity = n / (Ye * r);
		return;
	}
	let n = ct[0];
	for (let t of ct) if (e >= t.base) n = t;
	else break;
	let r = n.density * Math.exp(-(e - n.base) / n.scaleHeight), i = bt(e);
	t.airTemperature = i - 273.15, t.airPressure = r * Ye * i / 1e3, t.airDensity = r;
}
//#endregion
//#region src/core/physics/atmosphere.ts
function Ct(e) {
	return ft(e);
}
var wt = 1.4, Tt = 287.053;
function Et(e) {
	return Math.sqrt(wt * Tt * (e + 273.15));
}
//#endregion
//#region src/core/physics/aero.ts
function Dt(e, t) {
	return e * t ** 2 * 5e-4;
}
function Ot(e, t, n = E) {
	return Math.abs(Math.sin(e) * t) + Math.abs(Math.cos(e) * n.minArea) / 2.1;
}
function kt(e, t, n, r) {
	return 1 / 2 * e * t ** 2 * r * n;
}
function At(e) {
	let t = Math.abs(e);
	return t >= 1.48 ? -1.1 * t + 1.728 : t >= .52 ? -1 / 9.6 * t + .254 : t >= .47 ? -8 * t + 4.36 : t >= .35 ? 5 / 6 * t + .2083 : 5 / 3.5 * t;
}
function jt(e, t, n, r) {
	return At(n) * e * t ** 2 * r * .5;
}
function Mt(e) {
	return e >= 10 ? 2.5 : e * .1347 + 1.153;
}
function Nt(e, t) {
	return e / t;
}
function Pt(e, t, n) {
	return e * t / n;
}
function Ft(t, n) {
	return e(Math.atan2(t, n));
}
function It(e, t, n, r) {
	return Math.sqrt((e - n) ** 2 + (t - r) ** 2);
}
function Lt(e, t, n, r) {
	return Ft(e - n, t - r);
}
function Rt(t, n) {
	let r = zt(t, n);
	return {
		angleOfAttack: e(r),
		angleInToTheWind: e(Bt(r))
	};
}
function zt(e, t) {
	let n = e - t;
	return n < -Math.PI ? n = Math.PI * 2 + n : n > Math.PI && (n = -(Math.PI * 2 - n)), n;
}
function Bt(e) {
	return e > Math.PI / 2 ? Math.PI - e : e < -Math.PI / 2 ? -Math.PI - e : e;
}
function Vt(e, t, n, r, i = E) {
	let a = e * i.diameter * t ** 2 * r / n;
	return t > 0 ? -a : a;
}
function Ht(e, t, n, r, i, a = E) {
	let o = kt(e, t, Math.abs(Math.sin(r)) * a.frontFinArea, 2) * i;
	return n < 0 ? -o : o;
}
function Ut(e, t, n, r, i, a = E) {
	let o = kt(e, t, Math.abs(Math.sin(r)) * a.aftFinArea, 2) * i;
	return n < 0 ? o : -o;
}
function Wt(e, t, n = E) {
	let r = Math.sin(ie * e * .01), i = Math.sin(ie * t * .01), a = r * n.frontFinArea + i * n.aftFinArea;
	return {
		frontFinEffectiveAreaFraction: r,
		aftFinEffectiveAreaFraction: i,
		totalFinSurfaceArea: a,
		vehicleInFlightMaxArea: n.maxArea + a * 1.8
	};
}
//#endregion
//#region src/core/physics/components.ts
var Gt = Math.PI / 2;
function Kt(e) {
	return -Math.sin(e);
}
function qt(e) {
	return -Math.cos(e);
}
function Jt(e) {
	return -Math.cos(e);
}
function Yt(e) {
	return Math.sin(e);
}
function Xt(e) {
	return Math.sin(e);
}
function Zt(e) {
	return Math.cos(e);
}
function Qt(e) {
	return 0 < e && e < Gt || -Math.PI < e && e < -Gt;
}
function $t(e, t) {
	let n = t(e.gimbalPointingDirection) * e.thrustAcceleration, r = e.fixedThrustAcceleration;
	return r === 0 ? n : n + t(e.pitch) * r;
}
function en(e) {
	let t = Kt(e.angleOfMotion) * e.aerodynamicDragAcceleration, n = Jt(e.angleOfMotion), r = Qt(e.angleOfAttack) ? -n * e.aerodynamicLiftAcceleration : n * e.aerodynamicLiftAcceleration;
	return t + $t(e, Xt) + r;
}
function tn(e, t) {
	let n = qt(e.angleOfMotion) * e.aerodynamicDragAcceleration, r = Yt(e.angleOfMotion), i = Qt(e.angleOfAttack) ? -r * e.aerodynamicLiftAcceleration : r * e.aerodynamicLiftAcceleration, a = $t(e, Zt);
	return -t + n + a + i;
}
function nn(e, t, n) {
	let r = Math.sin(e.angleOfMotion), i = Math.cos(e.angleOfMotion), a = Qt(e.angleOfAttack), o = -r * e.aerodynamicDragAcceleration, s = -i * e.aerodynamicDragAcceleration, c = -i, l = r, u = a ? -c * e.aerodynamicLiftAcceleration : c * e.aerodynamicLiftAcceleration, d = a ? -l * e.aerodynamicLiftAcceleration : l * e.aerodynamicLiftAcceleration, f = Math.sin(e.gimbalPointingDirection) * e.thrustAcceleration, p = Math.cos(e.gimbalPointingDirection) * e.thrustAcceleration;
	e.fixedThrustAcceleration !== 0 && (f += Math.sin(e.pitch) * e.fixedThrustAcceleration, p += Math.cos(e.pitch) * e.fixedThrustAcceleration), n.x = o + f + u, n.y = -t + s + p + d;
}
//#endregion
//#region src/core/physics/gravity.ts
var rn = s;
function an(e) {
	return rn / e ** 2;
}
function on(e) {
	return Math.sqrt(rn / e);
}
function D(e, t, n = 0) {
	return cn(e, t, n) ** 2 / e - an(e);
}
function sn(e, t = 0) {
	return -D(e, 0, t);
}
function cn(e, t, n = 0) {
	return n === 0 ? t : t + n * e;
}
function ln(e, t, n = 0) {
	return n === 0 ? t : t - n * e;
}
function un(e, t, n, r = 0) {
	let i = r === 0 ? t : t + 2 * r * e;
	return -n * i / e;
}
function dn(e, t, n, r, i = 0) {
	let a = cn(e, t, i), o = (a ** 2 + n ** 2) / 2 - rn / e, s = e * a, c = 1 + 2 * o * s ** 2 / rn ** 2, l = Math.sqrt(Math.max(c, 0)), u = s ** 2 / rn;
	if (l < 1e-9 || u / (1 + l) > r) return Infinity;
	let d = (e, t) => {
		let n = (u / e - 1) / l, r = Math.acos(Math.min(1, Math.max(-1, n)));
		return t ? r : 2 * Math.PI - r;
	}, f = d(e, n >= 0), p = d(r, !1);
	if (p < f && (p += 2 * Math.PI), !(p > f)) {
		if (i === 0) return 0;
		if (n > 0 && o >= 0) return Infinity;
		let t = mn(e, n, r);
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
var fn = .1, pn = 1e6;
function mn(e, t, n) {
	let r = e, i = t, a = -an(r), o = 0;
	for (let e = 0; e < pn; e++) {
		let e = r + i * fn + .5 * a * fn * fn;
		if (e <= n) {
			let t = (r - n) / (r - e);
			return o + .5 * (r + n) * t * fn;
		}
		let t = -an(e);
		i += .5 * (a + t) * fn, o += .5 * (r + e) * fn, r = e, a = t;
	}
	return Infinity;
}
//#endregion
//#region src/core/rng.ts
function hn(e) {
	return {
		seed: e >>> 0,
		counters: {
			ignitionDelay: 0,
			ignitionFailure: 0,
			turbulence: 0
		}
	};
}
function gn(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n++) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return t >>> 0;
}
var _n = {
	ignitionDelay: gn("ignitionDelay"),
	ignitionFailure: gn("ignitionFailure"),
	turbulence: gn("turbulence")
};
function vn(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 569420461), t = Math.imul(t ^ t >>> 15, 3545902487), (t ^ t >>> 15) >>> 0;
}
function yn(e, t, n) {
	let r = _n[t], i = vn(e >>> 0 ^ r);
	return i = vn(i ^ n >>> 0), i = vn(i ^ Math.imul(n >>> 0, 2654435769)), i >>> 0;
}
function bn(e, t, n) {
	return yn(e.seed, t, n) / 4294967296;
}
function xn(e, t) {
	let n = bn(e, t, e.counters[t]);
	return e.counters[t] += 1, n;
}
//#endregion
//#region src/core/physics/wind.ts
var Sn = 18.3, Cn = .52, wn = 2, Tn = 1, En = .3048, Dn = 20 * En, On = 10 * En, kn = 1e3 * En;
function An(e) {
	return Cn * Math.max(Math.abs(e), wn) ** -.75;
}
function jn(e, t) {
	return e === 0 ? 0 : e * (Math.min(Math.max(t, Tn), 150) / Sn) ** An(e);
}
function O(e, t) {
	return jn(e.wind, t) + e.gust;
}
function Mn(e, t, n) {
	let r = Math.min(Math.max(t, On), kn) / En, i = .177 + 823e-6 * r, a = .1 * Math.abs(e);
	return n.sigmaW = a, n.sigmaU = a / i ** .4, n.lengthW = r * En, n.lengthU = r / i ** 1.2 * En, n;
}
var Nn = {
	sigmaU: 0,
	sigmaW: 0,
	lengthU: 0,
	lengthW: 0
}, Pn = Math.sqrt(3), Fn = 2;
function In(e, t, n, r, i, a) {
	if (e.wind === 0) return;
	Mn(jn(e.wind, Dn), n, Nn);
	let o = Math.hypot(r - jn(e.wind, n), i), s = Math.sqrt(-2 * Math.log(1 - xn(t, "turbulence"))), c = 2 * Math.PI * xn(t, "turbulence"), l = s * Math.cos(c), u = s * Math.sin(c), d = Math.exp(-o * a / Nn.lengthU);
	e.turbulenceU = d * e.turbulenceU + Math.sqrt(1 - d * d) * l;
	let f = Math.exp(-o * a / Nn.lengthW), p = e.turbulenceW1;
	e.turbulenceW1 = f * p + Math.sqrt(1 - f * f) * u, e.turbulenceW2 = f * e.turbulenceW2 + (1 - f) * p, e.gust = Nn.sigmaU * e.turbulenceU, e.gustVertical = Nn.sigmaW / Math.sqrt(Fn) * (Pn * e.turbulenceW1 + (1 - Pn) * e.turbulenceW2);
}
E.tankBottom, E.propellantCapacity, E.loxTankHeight, E.ch4TankHeight, E.ch4TankBottom, E.dryCentreOfMass, E.aftFinStation, E.rcsStation, E.frontFinStation;
function Ln(e, t = E) {
	return Math.min(1, Math.max(0, e / t.propellantCapacity));
}
function Rn(e, t = E) {
	let n = Ln(e, t), r = t.tankBottom + n * t.loxTankHeight / 2, i = t.ch4TankBottom + n * t.ch4TankHeight / 2;
	return Pe * r + (1 - Pe) * i;
}
function zn(e, t = E) {
	let n = Math.max(0, e);
	return (t.dryMass * t.dryCentreOfMass + n * Rn(n, t)) / (t.dryMass + n);
}
function Bn(e, t, n) {
	return e * ((n.diameter / 2) ** 2 / 4 + t ** 2 / 12);
}
function Vn(e, t = E) {
	let n = Math.max(0, e), r = zn(n, t), i = Ln(n, t), a = Bn(t.dryMass, t.height, t) + t.dryMass * (t.dryCentreOfMass - r) ** 2, o = n * Pe, s = i * t.loxTankHeight, c = t.tankBottom + s / 2, l = Bn(o, s, t) + o * (c - r) ** 2, u = n * (1 - Pe), d = i * t.ch4TankHeight, f = t.ch4TankBottom + d / 2, p = Bn(u, d, t) + u * (f - r) ** 2;
	return a + l + p;
}
function Hn(e, t = E.height) {
	return (e ** 4 + (t - e) ** 4) / 4;
}
function Un(e, t, n = E) {
	let r = zn(e, n);
	t.centreOfMassX = 0, t.centreOfMass = r, t.momentOfInertia = Vn(e, n), t.engineArm = r, t.aftFinArm = r - n.aftFinStation, t.frontFinArm = n.frontFinStation - r, t.rcsArm = n.rcsStation - r, t.rCubedIntegral = Hn(r, n.height);
}
function Wn(e = 0, t = E) {
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
	return Un(e, n, t), n;
}
//#endregion
//#region src/core/physics/grid-fins.ts
function Gn() {
	return {
		forceX: 0,
		forceY: 0,
		torque: 0,
		drag: 0,
		lift: 0
	};
}
function Kn(e, t, n, r, i, a, o, s) {
	s.forceX = s.forceY = s.torque = s.drag = s.lift = 0;
	let c = o.gridFins, l = Math.hypot(t, n);
	if (!c || e <= 0 || l === 0 || r === 0) return;
	let u = Math.max(-c.maxAngle, Math.min(c.maxAngle, r)), d = .5 * e * l * l * c.area;
	s.lift = d * Math.sin(2 * u), s.drag = d * 1.2 * Math.sin(u) ** 2, s.forceX = (-n * s.lift - t * s.drag) / l, s.forceY = (t * s.lift - n * s.drag) / l, s.torque = (c.station - a) * (Math.cos(i) * s.forceX - Math.sin(i) * s.forceY);
}
//#endregion
//#region src/core/physics/damage-material.ts
var qn = 7920, Jn = 293.15, k = 1473.15;
function Yn(e) {
	if (!Number.isFinite(e) || e < 4 || e > 1473.15) throw RangeError("304 thermal temperature must be within4–1473.15K");
}
var Xn = [
	22.0061,
	-127.5528,
	303.647,
	-381.0098,
	274.0328,
	-112.9212,
	24.7593,
	-2.239153
], Zn = [
	-1.4087,
	1.3982,
	.2543,
	-.626,
	.2334,
	.4256,
	-.4658,
	.165,
	-.0199
], Qn = 273.15, $n = 20, er = .0625, tr = Math.ceil(269.15 / er), A = /* @__PURE__ */ new Float64Array(4308), nr = /* @__PURE__ */ new Float64Array(4308);
function rr(e, t) {
	let n = Math.log10(e), r = 0;
	for (let e = t.length - 1; e >= 0; e--) r = r * n + t[e];
	return 10 ** r;
}
function j(e) {
	return Math.min(Qn, 4 + e * er);
}
for (let e = 0; e <= tr; e++) {
	let t = j(e);
	if (A[e] = rr(t, Xn), e > 0) {
		let n = t - j(e - 1);
		nr[e] = nr[e - 1] + n * (A[e - 1] + A[e]) / 2;
	}
}
function ir(e) {
	return 6.683 + .04906 * e + 80.74 * Math.log(e);
}
function ar(e) {
	return 9.705 + .0176 * e - 16e-7 * e ** 2;
}
var or = A[tr], sr = ir(Jn), cr = rr(Qn, Zn), lr = ar(Jn), ur = $n * (or + sr) / 2, dr = -nr[tr] - ur;
function fr(e) {
	return Math.min(4306, Math.floor((e - 4) / er));
}
function pr(e) {
	return (e - Qn) / $n;
}
function mr(e, t, n) {
	return e + (t - e) * n ** 2 * (3 - 2 * n);
}
function hr(e) {
	if (Yn(e), e >= 293.15) return ir(e);
	if (e >= Qn) return mr(or, sr, pr(e));
	let t = fr(e), n = (e - j(t)) / (j(t + 1) - j(t));
	return A[t] + n * (A[t + 1] - A[t]);
}
function gr(e) {
	return Yn(e), e >= 293.15 ? ar(e) : e >= Qn ? mr(cr, lr, pr(e)) : rr(e, Zn);
}
function _r(e) {
	return 6.683 * e + .02453 * e ** 2 + 80.74 * (e * Math.log(e) - e);
}
var vr = _r(Jn), yr = _r(k) - vr;
function br(e) {
	if (e >= 293.15) return _r(e) - vr;
	if (e >= Qn) {
		let t = pr(e);
		return -ur + $n * (or * t + (sr - or) * (t ** 3 - t ** 4 / 2));
	}
	let t = fr(e), n = e - j(t), r = j(t + 1) - j(t), i = (A[t + 1] - A[t]) / r;
	return dr + nr[t] + A[t] * n + i * n ** 2 / 2;
}
function xr(e) {
	return Yn(e), br(e);
}
function Sr(e) {
	let t = 4, n = k;
	for (let r = 0; r < 48; r++) {
		let r = (t + n) / 2;
		br(r) < e ? t = r : n = r;
	}
	return (t + n) / 2;
}
function Cr(e) {
	if (e < -ur) {
		let t = 0, n = tr;
		for (; n - t > 1;) {
			let r = Math.floor((t + n) / 2);
			dr + nr[r] <= e ? t = r : n = r;
		}
		let r = j(t + 1) - j(t), i = A[t], a = (A[t + 1] - i) / r, o = e - (dr + nr[t]), s = 2 * o / (i + Math.sqrt(i * i + 2 * a * o));
		return j(t) + s;
	}
	let t = e < 0 ? Qn : Jn, n = e < 0 ? Jn : k, r = e < 0 ? -ur : 0, i = e < 0 ? 0 : yr, a = t + (n - t) * (e - r) / (i - r);
	for (let r = 0; r < 6; r++) {
		let r = br(a);
		if (r === e) break;
		r < e ? t = a : n = a;
		let i = a - (r - e) / hr(a);
		if (i === a) break;
		a = i > t && i < n ? i : (t + n) / 2;
	}
	return a;
}
function wr(e) {
	if (!Number.isFinite(e) || e < dr || e > yr) throw RangeError("304 specific enthalpy is outside the thermal fit domain");
	if (e === 0) return Jn;
	if (e === dr) return 4;
	if (e === yr) return k;
	let t = Cr(e), n = 4, r = k, i = n, a = r;
	for (let e = 0; e < 48; e++) {
		let o = (n + r) / 2;
		o < t ? n = o : r = o, e === 39 && (i = n, a = r);
	}
	if (br(n) < e && br(r) >= e) return (n + r) / 2;
	if (br(i) < e && br(a) >= e) {
		n = i, r = a;
		for (let t = 40; t < 48; t++) {
			let t = (n + r) / 2;
			br(t) < e ? n = t : r = t;
		}
		return (n + r) / 2;
	}
	return Sr(e);
}
var Tr = [
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
function Er(e, t) {
	if (!Number.isFinite(e) || e <= 0) throw RangeError("304 mechanical temperature must be finite and positiveK");
	if (e > 1173.15) return 0;
	let n = 373.15, r = Tr[0][t];
	if (e <= n) return r;
	for (let i of Tr) {
		if (e <= i[0]) {
			let a = (e - n) / (i[0] - n);
			return r + a * (i[t] - r);
		}
		n = i[0], r = i[t];
	}
	return 0;
}
function Dr(e) {
	return Er(e, 1);
}
function Or(e) {
	return Er(e, 2);
}
//#endregion
//#region src/core/physics/tps-material.ts
var kr = 116.483, Ar = 1922.04, jr = 116.667, Mr = 1922.22, Nr = 101330, Pr = 293.15, M = [
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
], Fr = [
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
], Ir = [
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
function Lr(e, t, n) {
	if (!Number.isFinite(e) || e < t || e > n) throw RangeError("LI900 temperature is outside its material property data domain");
}
function Rr(e) {
	if (!Number.isFinite(e) || e < 0 || e > 101330) throw RangeError("LI900 pressure must be within0–101330Pa");
}
var zr = new Float64Array(M.length);
for (let e = 1; e < M.length; e++) {
	let t = M[e - 1], n = M[e];
	zr[e] = zr[e - 1] + (n[0] - t[0]) * (t[1] + n[1]) / 2;
}
function Br(e) {
	for (let t = 1; t < M.length; t++) if (e < M[t][0]) return t - 1;
	return M.length - 2;
}
function Vr(e) {
	let t = Br(e), n = M[t], r = M[t + 1];
	if (e === r[0]) return zr[t + 1];
	let i = e - n[0], a = (r[1] - n[1]) / (r[0] - n[0]);
	return zr[t] + n[1] * i + a * i ** 2 / 2;
}
var Hr = Vr(Pr), Ur = -Hr, Wr = zr[M.length - 1] - Hr;
function Gr(e) {
	Lr(e, kr, Ar);
	let t = Br(e), n = M[t], r = M[t + 1];
	if (e === r[0]) return r[1];
	let i = (e - n[0]) / (r[0] - n[0]);
	return n[1] + i * (r[1] - n[1]);
}
function Kr(e) {
	return Lr(e, kr, Ar), Vr(e) - Hr;
}
function qr(e) {
	if (!Number.isFinite(e) || e < Ur || e > Wr) throw RangeError("LI900 specific enthalpy is outside the heat-capacity data domain");
	if (e === 0) return Pr;
	if (e === Ur) return kr;
	if (e === Wr) return Ar;
	let t = e + Hr, n = 0, r = M.length - 1;
	for (; r - n > 1;) {
		let e = Math.floor((n + r) / 2);
		zr[e] <= t ? n = e : r = e;
	}
	let i = M[n], a = M[n + 1], o = (a[1] - i[1]) / (a[0] - i[0]), s = t - zr[n], c = 2 * s / (i[1] + Math.sqrt(i[1] ** 2 + 2 * o * s));
	return Math.max(i[0], Math.min(a[0], i[0] + c));
}
function Jr(e, t) {
	let n = Ir[0];
	if (t <= n[0]) return n[1][e];
	for (let n = 1; n < Ir.length; n++) {
		let r = Ir[n];
		if (t === r[0]) return r[1][e];
		if (t < r[0]) {
			let i = Ir[n - 1], a = Math.log(t / i[0]) / Math.log(r[0] / i[0]);
			return i[1][e] + a * (r[1][e] - i[1][e]);
		}
	}
	return Ir[Ir.length - 1][1][e];
}
function Yr(e, t) {
	for (let n = 1; n < Fr.length; n++) {
		let r = Fr[n];
		if (e === r) return Jr(n, t);
		if (e < r) {
			let i = Fr[n - 1], a = Jr(n - 1, t), o = Jr(n, t);
			return a + (e - i) / (r - i) * (o - a);
		}
	}
	return Jr(Fr.length - 1, t);
}
function Xr(e, t) {
	return Lr(e, jr, Mr), Rr(t), Yr(e, t);
}
function Zr(e, t, n) {
	if (Lr(e, jr, Mr), Lr(t, jr, Mr), Rr(n), e === t) return Yr(e, n);
	let r = Math.min(e, t), i = Math.max(e, t), a = 0;
	for (let e = 1; e < Fr.length; e++) {
		let t = Math.max(r, Fr[e - 1]), o = Math.min(i, Fr[e]);
		o > t && (a += (o - t) * (Yr(t, n) + Yr(o, n)) / 2);
	}
	return a / (i - r);
}
var Qr = /* @__PURE__ */ function(e) {
	return e[e.None = 0] = "None", e[e.ProofExceeded = 1] = "ProofExceeded", e[e.MaterialDomain = 2] = "MaterialDomain", e[e.Terminal = 3] = "Terminal", e;
}({});
function $r(e, t) {
	if (!Number.isFinite(e) || !Number.isFinite(t)) throw RangeError("Thermal state requires finite temperature and energy");
	return {
		valid: !0,
		temperature: e,
		energy: t
	};
}
function ei(t, n) {
	let r = t.components.length;
	if (r < 1 || r > 12) throw RangeError("Damage inventory must contain1–12 components");
	if (!(t.hullThermalMass > 0) || !Number.isFinite(t.hullThermalMass)) throw RangeError("Damage state requires positive finite hull thermal mass");
	let i = xr(n), a = t.components.some((e) => e.tpsMass > 0), o = 0;
	if (a) {
		if (n < 116.667 || n > 1922.04) throw RangeError("TPS ambient temperature is outside its thermal data domains");
		o = Kr(n);
	}
	let s = t.components.map((t, r) => {
		if (!(t.rootMass >= 0 && t.tpsMass >= 0) || !Number.isFinite(t.rootMass + t.tpsMass)) throw RangeError("Invalid component thermal mass");
		let a = t.rootMass > 0 ? $r(n, t.rootMass * i) : $r(0, 0), s = () => t.tpsMass > 0 ? $r(n, t.tpsMass / 2 * o) : $r(0, 0);
		return {
			componentIndex: r,
			attached: !0,
			permanentFailure: 0,
			root: a,
			tps: [s(), s()],
			loadedAngle: e(0)
		};
	}), c = s.map((t) => ({
		componentIndex: t.componentIndex,
		active: !1,
		x: 0,
		altitude: 0,
		pitch: e(0),
		speedX: 0,
		speedY: 0,
		angularVelocity: 0
	}));
	return {
		components: s,
		hull: $r(n, t.hullThermalMass * i),
		debris: c,
		terminal: {
			active: !1,
			reason: 0,
			time: 0,
			x: 0,
			altitude: 0,
			pitch: e(0),
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
function ti(e) {
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
function ni(e) {
	let t = .1 * e, n = .15 * e, r = .05 * e, i = .004;
	if (!(t > 2 * i && n > 2 * i)) throw RangeError("Invalid attachment section");
	let a = t * n - (t - 2 * i) * (n - 2 * i), o = (t * n ** 3 - (t - 2 * i) * (n - 2 * i) ** 3) / 12;
	return Object.freeze({
		area: a,
		inertia: o,
		modulus: 2 * o / n,
		length: r,
		heatArea: t * r,
		mass: qn * a * r
	});
}
function ri(e, t) {
	return t === "plate" ? Math.sin(e) : Math.hypot(Math.sin(2 * e), 1.2 * Math.sin(e) ** 2);
}
function ii(e, t, n, r, i, a) {
	let o = Math.abs(e), s = a === "plate" ? Math.PI / 2 : Math.PI / 4;
	if (!Number.isFinite(e) || o > s || t < 0 || n < 0 || !Number.isFinite(t) || !Number.isFinite(n)) throw RangeError("Attachment load outside the monotone force domain");
	let c = Dr(r);
	if (c === 0) return 0;
	if (o === 0 || t === 0 || n === 0) return e;
	let l = t * n * i.length / (c * i.inertia), u = o;
	for (let e = 0; e < 2; e++) {
		let e = ri(u, a), t = Math.sin(u), n = Math.cos(u), r = a === "plate" ? n : e === 0 ? 2 : (2 * Math.sin(2 * u) * Math.cos(2 * u) + 2.88 * t ** 3 * n) / e;
		if (u -= (u + l * e - o) / (1 + l * r), !(u > 0 && u <= o)) break;
	}
	if (u > 0 && u <= o) {
		let t = 0, n = o;
		for (let e = 0; e < 40; e++) {
			let e = (t + n) / 2;
			e < u ? t = e : n = e;
		}
		if (t + l * ri(t, a) < o && n + l * ri(n, a) >= o) return Math.sign(e) * (t + n) / 2;
	}
	let d = 0, f = o;
	for (let e = 0; e < 40; e++) {
		let e = (d + f) / 2;
		e + l * ri(e, a) < o ? d = e : f = e;
	}
	return Math.sign(e) * (d + f) / 2;
}
function ai(e, t, n) {
	let r = Or(t) * n.modulus;
	return r === 0 ? Infinity : Math.abs(e) / r;
}
//#endregion
//#region src/core/physics/vehicle-components.ts
var oi = 1525, si = .004, ci = 144, li = .0254, ui = 20 * Math.PI / 180;
function di(e, t, n, r, i) {
	if (!(t > 0 && i > 0) || !Number.isFinite(t + n + r + i)) throw RangeError("Component slice requires positive finite mass and inertia");
	return Object.freeze({
		role: e,
		mass: t,
		x: n,
		station: r,
		inertia: i
	});
}
function fi(e, t, n, r, i = 0) {
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
function pi(e, t, n, r, i, a, o, s, c) {
	if (!(n > 0 && r > 0)) throw RangeError("Appendage area and span must be positive");
	let l = n / r, u = qn * si * n, d = i * (o + r / 2), f = i * (o + s.length / 2), p = s.heatArea / s.length, m = u * ((r * i) ** 2 + l ** 2) / 12, h = s.mass * ((s.length * i) ** 2 + p ** 2) / 12, g = [di("structure", u, d, a, m), di("root", s.mass, f, a, h)];
	if (c) {
		let e = ci * s.heatArea * li;
		g.push(di("tps", e, f, a, e * ((s.length * i) ** 2 + p ** 2) / 12));
	}
	return fi(e, t, g, {
		x: i * o,
		station: a
	}, r / 2);
}
function mi(e) {
	let { height: t, diameter: n, dryMass: r, dryCentreOfMass: i } = e;
	if (!(t > 0 && n > 0 && r > 0 && i > 0 && i < t) || !Number.isFinite(t + n + r + i)) throw RangeError("Invalid intact vehicle mass geometry");
	let a = n / 2, o = e.id === "ship", s = ni(n), c = [], l = t * (o ? .035 : .03), u = e.engines.length * oi;
	if (c.push(fi(`${o ? "ship" : "booster"}-engine-support`, "engine-support", [di("structure", u, 0, l / 2, u * (a ** 2 / 4 + l ** 2 / 12))])), o) {
		let i = r * .05;
		c.push(fi("ship-nose", "nose", [di("structure", i, 0, t * .87, i * ((.4 * a) ** 2 + (.08 * t) ** 2) / 5)]));
		for (let t of [!0, !1]) for (let r of [-1, 1]) {
			let i = t ? e.frontFinStation : e.aftFinStation;
			c.push(pi(`ship-${t ? "front" : "aft"}-flap-${r < 0 ? "left" : "right"}`, "flap", (t ? e.frontFinArea : e.aftFinArea) / 2, n * (t ? .34 : .46), r, i, a, s, !0));
		}
	} else {
		let i = e.gridFins;
		if (!i || !Number.isInteger(i.count) || i.count < 3) throw RangeError("Booster component partition requires a grid inventory");
		let o = r * .02;
		c.push(fi("booster-hot-stage", "hot-stage", [di("structure", o, 0, t * .975, o * (a ** 2 / 2 + (.05 * t) ** 2 / 12))]));
		for (let e = 0; e < i.count; e++) c.push(pi(`booster-grid-${e}`, "grid-fin", i.area / i.count, n * .46, Math.sin(ui + e * 2 * Math.PI / i.count), i.station, a, s, !1));
	}
	for (let e of c) if (!(e.station >= 0 && e.station <= t)) throw RangeError("Component centroid outside the hull");
	let d = r - c.reduce((e, t) => e + t.mass, 0);
	if (!(d > 0)) throw RangeError("No positive hull mass remains");
	let f = (r * i - c.reduce((e, t) => e + t.mass * t.station, 0)) / d, p = -c.reduce((e, t) => e + t.mass * t.x, 0) / d, m = r * (a ** 2 / 4 + t ** 2 / 12), h = (m - c.reduce((e, t) => e + t.inertia + t.mass * (t.x ** 2 + (t.station - i) ** 2), 0) - d * (p ** 2 + (f - i) ** 2)) / d - a ** 2 / 4, g = t * (o ? .055 : .05), _ = t * (o ? .72 : .93), v = t * (o ? .3 : .5), y = (f - g) * (_ - f);
	if (!(f > g && f < _ && h > 0 && h < y)) throw RangeError("Hull residual moments have no positive supported partition");
	let ee = h / y, b = d * ee * (_ - f) / (_ - g), x = d * ee * (f - g) / (_ - g), S = d - b - x, C = [
		di("structure", b, p, g, b * a ** 2 / 4),
		di("structure", S, p, f, S * a ** 2 / 4),
		di("structure", x, p, _, x * a ** 2 / 4)
	], te = o ? "ship" : "booster", w = fi(`${te}-hull-aft`, "hull", C.filter((e) => e.station < v)), ne = fi(`${te}-hull-forward`, "hull", C.filter((e) => e.station >= v));
	return c.push(w, ne), Object.freeze({
		id: e.id,
		dryMass: r,
		dryCentreOfMassX: 0,
		dryCentreOfMass: i,
		dryMomentOfInertia: m,
		hullThermalMass: w.mass + ne.mass,
		rootSection: s,
		components: Object.freeze(c)
	});
}
//#endregion
//#region src/core/physics/damage-thermal.ts
var hi = 4096, gi = .8, _i = 8, vi = .0254, yi = vi / 2, bi = vi / 4, xi = Math.max(kr, jr), Si = Math.min(Ar, Mr), Ci = gi * ue, wi = xr(4), Ti = xr(k), Ei = Kr(xi), Di = Kr(Si);
function Oi(e) {
	let t = e.components.length, n = e.rootSection;
	if (t < 1 || t > 12 || !(e.hullThermalMass > 0 && n.area > 0 && n.length > 0 && n.heatArea > 0) || !Number.isFinite(e.hullThermalMass + n.area + n.length + n.heatArea)) throw RangeError("Invalid thermal catalogue geometry/inventory");
	let r = hr(4), i = gr(k), a = Gr(kr), o = Xr(Mr, Nr), s = n.length / 2, c = n.area / s, l = s / n.area, u = i * c, d = 4 * Ci * n.heatArea * k ** 3, f = 4 * Ci * n.heatArea * Si ** 3, p = [], m = Infinity, h = 0;
	for (let s = 0; s < t; s++) {
		let t = e.components[s];
		if (!(t.rootMass >= 0 && t.tpsMass >= 0) || !Number.isFinite(t.rootMass + t.tpsMass)) throw RangeError("Invalid component thermal masses");
		if (t.rootMass === 0) {
			if (t.tpsMass > 0) throw RangeError("TPS column requires a finite root");
			continue;
		}
		let g = t.tpsMass / 2, _ = t.rootMass * r;
		if (g > 0) {
			let e = o * n.heatArea / yi, t = 1 / (bi / (o * n.heatArea) + l / i), r = g * a;
			m = Math.min(m, r / (e + f), r / (e + t), _ / (t + u));
		} else m = Math.min(m, _ / (u + d));
		h += u, p.push(Object.freeze({
			componentIndex: s,
			rootMass: t.rootMass,
			tpsCellMass: g,
			heatArea: n.heatArea,
			steelPathRatio: c,
			steelResistanceRatio: l,
			rootMinEnergy: t.rootMass * wi,
			rootMaxEnergy: t.rootMass * Ti,
			tpsMinEnergy: g * Ei,
			tpsMaxEnergy: g * Di
		}));
	}
	return h > 0 && (m = Math.min(m, e.hullThermalMass * r / h)), Object.freeze({
		componentCount: t,
		columns: Object.freeze(p),
		hullMass: e.hullThermalMass,
		hullMinEnergy: e.hullThermalMass * wi,
		hullMaxEnergy: e.hullThermalMass * Ti,
		safeStep: m
	});
}
function ki(e, t, n) {
	if (!Number.isFinite(e.temperature) || e.temperature < t || e.temperature > n || !Number.isFinite(e.energy)) throw RangeError("Valid thermal node has invalid temperature/energy");
}
function Ai(e, t, n, r, i, a) {
	return e.energy += t, !Number.isFinite(e.energy) || e.energy < r || e.energy > i ? (e.valid = !1, !1) : (t !== 0 && (e.temperature = e.energy === r ? a ? xi : 4 : e.energy === i ? a ? Si : k : a ? qr(e.energy / n) : wr(e.energy / n)), !0);
}
function ji(e, t, n, r, i, a) {
	if (!Number.isFinite(n) || n < 0 || n > t.safeStep * _i || !Number.isFinite(r) || r < 0 || !Number.isFinite(i) || i < 186 || i > 1473.15 || !Number.isFinite(a) || a < 0 || a > 101330 || e.components.length !== t.componentCount) throw RangeError("Thermal forcing/inventory outside the supported numerical contract");
	let o = e.hull.valid ? 0 : hi;
	for (let n of t.columns) {
		let t = e.components[n.componentIndex];
		if (t.componentIndex !== n.componentIndex) throw RangeError("Thermal catalogue identity mismatch");
		t.attached && (!t.root.valid || n.tpsCellMass > 0 && (!t.tps[0].valid || !t.tps[1].valid)) && (o |= 1 << n.componentIndex);
	}
	if (o !== 0 || n === 0) return o;
	ki(e.hull, 4, k);
	for (let n of t.columns) {
		let t = e.components[n.componentIndex];
		t.attached && (ki(t.root, 4, k), n.tpsCellMass > 0 && (ki(t.tps[0], xi, Si), ki(t.tps[1], xi, Si)));
	}
	let s = Math.min(_i, Math.max(1, Math.ceil(n / t.safeStep))), c = n / s, l = i ** 4;
	for (let n = 0; n < s; n++) {
		let n = e.hull.temperature, i = gr(n), s = 0;
		for (let u of t.columns) {
			let t = e.components[u.componentIndex];
			if (!t.attached) continue;
			let d = t.root.temperature, f = gr(d), p = c * (f + i) / 2 * u.steelPathRatio * (d - n);
			s += p;
			let m = -p, h = !0;
			if (u.tpsCellMass > 0) {
				let e = t.tps[0], n = t.tps[1], i = e.temperature, o = n.temperature, s = c * Zr(i, o, a) * u.heatArea / yi * (i - o), p = c * (o - d) / (bi / (Xr(o, a) * u.heatArea) + u.steelResistanceRatio / f), g = c * u.heatArea * (r - Ci * (i ** 4 - l));
				m += p, h = Ai(e, g - s, u.tpsCellMass, u.tpsMinEnergy, u.tpsMaxEnergy, !0), Ai(n, s - p, u.tpsCellMass, u.tpsMinEnergy, u.tpsMaxEnergy, !0) || (h = !1);
			} else m += c * u.heatArea * (r - Ci * (d ** 4 - l));
			Ai(t.root, m, u.rootMass, u.rootMinEnergy, u.rootMaxEnergy, !1) || (h = !1), h || (o |= 1 << u.componentIndex);
		}
		if (Ai(e.hull, s, t.hullMass, t.hullMinEnergy, t.hullMaxEnergy, !1) || (o |= hi), o !== 0) return o;
	}
	return 0;
}
//#endregion
//#region src/core/physics/damage-controls.ts
function Mi(e, t) {
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
function Ni(e) {
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
function Pi(e, t, n, r, i) {
	if (!(n >= 0 && r >= 0 && r <= 1) || !Number.isFinite(n) || e.components.length !== t.componentCount || i.loadedAngles.length < t.componentCount) throw RangeError("Invalid component control forcing or inventory");
}
function Fi(e, t, n, r, i, a, o) {
	Ge(), Pi(e, t, n, r, o), o.frontArea = o.aftArea = o.gridLiftArea = o.gridDragArea = 0, o.frontFraction = o.aftFraction = 0, o.proofMask = o.domainMask = 0, o.loadedAngles.fill(0);
	for (let s of t.columns) {
		let c = e.components[s.index];
		if (!c.attached || c.permanentFailure !== Qr.None) continue;
		if (!c.root.valid || Or(c.root.temperature) === 0) {
			o.domainMask |= 1 << s.index;
			continue;
		}
		let l = s.group === "grid", u = s.group === "aft" ? a : i, d = n * s.area * (l ? 1 : 2 * r), f = l ? "grid" : "plate", p = ii(u, d, s.lever, c.root.temperature, t.root, f);
		if (o.loadedAngles[s.index] = p, ai(d * ri(Math.abs(p), f) * s.lever, c.root.temperature, t.root) > 1) {
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
function Ii(e, t) {
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
var Li = {
	airDensity: 0,
	airTemperature: 0,
	airPressure: 0
};
function Ri(e, t, n) {
	if (!(t >= 0 && n >= 0) || !Number.isFinite(t + n)) throw RangeError("Debris drag requires finite nonnegative coefficient and time");
	let r = Math.hypot(e.speedX, e.speedY), i = 1 / (1 + t * r * n);
	return e.speedX *= i, e.speedY *= i, -.5 * r * r * (1 - i) * (1 + i);
}
function zi(e, t, n) {
	St(e.altitude, Li);
	let r = Mt(Math.hypot(e.speedX, e.speedY) / Et(Li.airTemperature));
	Ri(e, Li.airDensity * r * t.dragMultiplier * t.dragArea / (2 * t.mass), n);
}
function Bi(t, n, r) {
	if (!(r >= 0) || !Number.isFinite(r) || t.debris.length !== n.pieces.length) throw RangeError("Debris advance requires matching inventory and finite nonnegative time");
	for (let e = 0; e < t.debris.length; e++) {
		let n = t.debris[e];
		if (n.componentIndex !== e || n.active && !Number.isFinite(n.x + n.altitude + n.speedX + n.speedY + n.pitch + n.angularVelocity)) throw RangeError("Debris active pose and source index must be finite and valid");
	}
	if (r !== 0) for (let i = 0; i < t.debris.length; i++) {
		let o = t.debris[i];
		if (!o.active) continue;
		let s = n.pieces[i];
		if (o.altitude <= s.supportRadius) {
			o.altitude = s.supportRadius, o.speedX = o.speedY = o.angularVelocity = 0;
			continue;
		}
		zi(o, s, r / 2);
		let c = o.x, l = o.altitude, u = o.speedX, d = o.speedY, f = a + l, p = un(f, u, d), m = D(f, u), h = c + u * r + .5 * p * r * r, g = l + d * r + .5 * m * r * r;
		if (g <= s.supportRadius) {
			let t = (l - s.supportRadius) / (l - g);
			o.x = c + (h - c) * t, o.altitude = s.supportRadius, o.pitch = e(o.pitch + o.angularVelocity * r * t), o.speedX = o.speedY = o.angularVelocity = 0;
			continue;
		}
		let _ = a + g;
		o.x = h, o.altitude = g, o.speedX = u + .5 * (p + un(_, u + p * r, d + m * r)) * r, o.speedY = d + .5 * (m + D(_, u + p * r)) * r, o.pitch = e(o.pitch + o.angularVelocity * r), zi(o, s, r / 2);
	}
}
//#endregion
//#region src/core/physics/damage-model.ts
var Vi = /* @__PURE__ */ new WeakMap();
function N(e) {
	let t = Vi.get(e);
	if (t) return t;
	let n = mi(e), r = Object.freeze({
		partition: n,
		thermal: Oi(n),
		controls: Mi(n, e),
		debris: Ii(n, e)
	});
	return Vi.set(e, r), r;
}
//#endregion
//#region src/core/physics/damage-mass.ts
function P() {
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
function Hi(e, t, n, r, i) {
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
		i.retainedDryMass += c.mass, o += c.mass * c.x, s += c.mass * c.station, c.kind === "flap" ? c.id.startsWith("ship-front-flap-") ? i.frontFinCount++ : c.id.startsWith("ship-aft-flap-") && i.aftFinCount++ : c.kind === "grid-fin" ? i.gridFinCount++ : c.kind === "engine-support" && (i.engineSupportAvailable = r.permanentFailure === Qr.None);
	}
	if (i.frontFinArea = r.frontFinArea * i.frontFinCount / 2, i.aftFinArea = r.aftFinArea * i.aftFinCount / 2, i.gridFinArea = r.gridFins ? r.gridFins.area * i.gridFinCount / r.gridFins.count : 0, a) {
		i.retainedDryMass = r.dryMass, i.dryCentreOfMassX = t.dryCentreOfMassX, i.dryCentreOfMass = r.dryCentreOfMass, i.dryMomentOfInertia = t.dryMomentOfInertia, i.totalMass = r.dryMass + i.propellantMass, i.hasMass = !0, i.centreOfMassX = 0, i.centreOfMass = zn(i.propellantMass, r), i.momentOfInertia = Vn(i.propellantMass, r);
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
	let c = Math.min(1, i.propellantMass / r.propellantCapacity), l = i.propellantMass * Pe, u = i.propellantMass * (1 - Pe), d = r.loxTankHeight * c, f = r.ch4TankHeight * c, p = r.tankBottom + d / 2, m = r.ch4TankBottom + f / 2;
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
function F(e, t, n, r) {
	if (e.damage ? Hi(e.damage, N(t).partition, e.vehicle.propellantMass, t, n) : (n.hasMass = !0, n.retainedDryMass = t.dryMass, n.propellantMass = Math.max(0, e.vehicle.propellantMass), n.totalMass = t.dryMass + n.propellantMass, n.dryCentreOfMassX = n.centreOfMassX = 0, n.dryCentreOfMass = t.dryCentreOfMass, n.dryMomentOfInertia = t.dryMass * ((t.diameter / 2) ** 2 / 4 + t.height ** 2 / 12), n.centreOfMass = zn(n.propellantMass, t), n.momentOfInertia = Vn(n.propellantMass, t), n.frontFinCount = t.frontFinArea > 0 ? 2 : 0, n.aftFinCount = t.aftFinArea > 0 ? 2 : 0, n.gridFinCount = t.gridFins?.count ?? 0, n.frontFinArea = t.frontFinArea, n.aftFinArea = t.aftFinArea, n.gridFinArea = t.gridFins?.area ?? 0, n.engineSupportAvailable = !0), r) {
		if (!e.damage) {
			Un(e.vehicle.propellantMass, r, t);
			return;
		}
		r.centreOfMassX = n.centreOfMassX, r.centreOfMass = n.centreOfMass, r.momentOfInertia = n.momentOfInertia, r.engineArm = n.centreOfMass, r.aftFinArm = n.centreOfMass - t.aftFinStation, r.frontFinArm = t.frontFinStation - n.centreOfMass, r.rcsArm = t.rcsStation - n.centreOfMass, r.rCubedIntegral = Hn(n.centreOfMass, t.height);
	}
}
//#endregion
//#region src/core/physics/damage-detachment.ts
function Ui() {
	return {
		before: P(),
		after: P()
	};
}
function Wi(e, t, n, r, i, a, o, s) {
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
	if (o !== Qr.ProofExceeded && o !== Qr.MaterialDomain && o !== Qr.Terminal) throw RangeError("Detachment requires a permanent connection disposition");
	if (Hi(e, t, r, n, s.before), !s.before.hasMass) throw RangeError("Cannot detach from an empty physical owner");
	let d = s.before, f = Math.cos(i.pitch), p = Math.sin(i.pitch);
	for (let n = 0; n < c; n++) if (l & 1 << n) {
		let r = t.components[n], a = e.components[n], s = e.debris[n], c = r.x - d.centreOfMassX, l = r.station - d.centreOfMass, u = f * c + p * l, m = -p * c + f * l;
		s.x = i.x + u, s.altitude = i.altitude + m, s.pitch = i.pitch, s.speedX = i.vx + i.omega * m, s.speedY = i.vy - i.omega * u, s.angularVelocity = i.omega, s.active = !0, a.attached = !1, a.permanentFailure === Qr.None && (a.permanentFailure = o);
	}
	if (Hi(e, t, r, n, s.after), s.after.hasMass) {
		let e = s.after.centreOfMassX - d.centreOfMassX, t = s.after.centreOfMass - d.centreOfMass, n = f * e + p * t, r = -p * e + f * t;
		i.x += n, i.altitude += r, i.vx += i.omega * r, i.vy -= i.omega * n;
	}
	return e.revision++, e.eventCount += u, l;
}
//#endregion
//#region src/core/physics/thermal.ts
function Gi(e, t, n) {
	return le * e ** 3 * Math.sqrt(t / n);
}
function Ki(e, t, n, r) {
	let i = 1 - Math.abs(Math.sin(r)) * (1 - Math.SQRT1_2);
	return Gi(e, t, n) * i;
}
function qi(e, t = 0) {
	return (Math.max(0, e) / (de * ue) + t ** 4) ** .25;
}
var Ji = ft(at).airTemperature + pe;
function Yi(e, t) {
	return e < 86e3 ? t + pe : Ji;
}
//#endregion
//#region src/core/physics/damage-terminal.ts
var Xi = /* @__PURE__ */ function(e) {
	return e[e.Impact = 1] = "Impact", e[e.Pressure = 2] = "Pressure", e[e.Temperature = 4] = "Temperature", e[e.Acceleration = 8] = "Acceleration", e[e.MaterialDomain = 16] = "MaterialDomain", e;
}({}), Zi = P(), Qi = Ui(), I = {
	x: 0,
	altitude: 0,
	pitch: e(0),
	vx: 0,
	vy: 0,
	omega: 0
};
function $i(e) {
	let t = e.forces;
	e.engines.running.fill(!1), e.engines.ignitionCountdown.fill(null), t.thrust = t.thrustAcceleration = t.twr = 0, t.paidThrustAccelerationX = t.paidThrustAccelerationY = 0, t.thrustVectorForce = t.thrustVectorAcceleration = 0, t.offAxisThrustDifferenceAcceleration = 0, t.rcsThrust = t.rcsThrustAngularAcceleration = 0;
}
function ea(e, t, n, r) {
	let i = e.damage;
	if (!i || i.terminal.active) return;
	let a = N(t).partition, o = e.kinematics;
	Hi(i, a, e.vehicle.propellantMass, t, Zi);
	let s = Math.sin(o.pitch), c = Math.cos(o.pitch), l = Zi.centreOfMassX, u = Zi.centreOfMass - t.height / 2, d = c * l + s * u, f = -s * l + c * u;
	I.x = o.downRangeDistance + d, I.altitude = o.altitude + f, I.pitch = o.pitch, I.omega = o.angularVelocity, I.vx = o.speedX + I.omega * f, I.vy = o.speedY - I.omega * d;
	let p = i.terminal;
	p.reason = n, p.time = r, p.x = I.x, p.altitude = I.altitude, p.pitch = I.pitch, p.speedX = I.vx, p.speedY = I.vy, p.angularVelocity = I.omega, p.retainedDryMass = Zi.retainedDryMass, p.retainedPropellant = Zi.propellantMass, p.releasedEnergy = 0;
	let m = (1 << a.components.length) - 1;
	Wi(i, a, t, e.vehicle.propellantMass, I, m, Qr.Terminal, Qi), Hi(i, a, e.vehicle.propellantMass, t, Zi);
	let h = Zi.totalMass;
	p.releasedMomentumX = h * I.vx, p.releasedMomentumY = h * I.vy, p.releasedAngularMomentum = Zi.momentOfInertia * I.omega + (I.altitude - p.altitude) * p.releasedMomentumX - (I.x - p.x) * p.releasedMomentumY, p.releasedKineticEnergy = .5 * h * (I.vx ** 2 + I.vy ** 2) + .5 * Zi.momentOfInertia * I.omega ** 2, e.engines.running.fill(!1), e.engines.failed.fill(!0), e.engines.ignitionCountdown.fill(null), e.vehicle.propellantMass = 0, e.vehicle.vehicleMass = 0, e.vehicle.vehicleMomentOfInertia = 0, p.active = !0;
}
function ta(e) {
	return (e.forces.perceivedG > 13 ? 8 : 0) | (e.forces.surfaceTemperature > 1533 ? 4 : 0) | (e.forces.dynamicPressure > 50 ? 2 : 0) | (e.damage && !e.damage.hull.valid ? 16 : 0);
}
//#endregion
//#region src/core/physics/damage-flight.ts
var na = P(), L = Ni(12);
function ra(e, t, n) {
	F(e, t, na, n), e.vehicle.vehicleMass = na.totalMass, (e.damage || n) && (e.vehicle.vehicleMomentOfInertia = na.momentOfInertia);
}
function ia(e, t) {
	e.damage && (Hi(e.damage, N(t).partition, e.vehicle.propellantMass, t, na), !na.engineSupportAvailable && (e.engines.running.fill(!1), e.engines.failed.fill(!0), e.engines.ignitionCountdown.fill(null)));
}
function aa(e, t, n, r, i) {
	let a = t.gridFins ? i ?? (e.vehicle.frontFinExtension - 50) / 50 * t.gridFins.maxAngle : e.vehicle.frontFinExtension * .01 * ie;
	Fi(e.damage, N(t).controls, n, r, a, e.vehicle.aftFinExtension * .01 * ie, L);
}
function oa(t, n, r, i) {
	if (t.damage) {
		aa(t, n, r, i);
		for (let n = 0; n < t.damage.components.length; n++) {
			let r = t.damage.components[n];
			r.attached && (r.loadedAngle = e(L.loadedAngles[n]));
		}
		t.forces.frontFinEffectiveAreaFraction = L.frontFraction, t.forces.aftFinEffectiveAreaFraction = L.aftFraction, t.vehicle.vehicleInFlightMaxArea = n.maxArea + 1.8 * (L.frontArea + L.aftArea);
	}
}
function sa(t, n, r, i, a, o, s, c, l) {
	if (!t.damage) {
		Kn(n, r, i, l ?? e((t.vehicle.frontFinExtension - 50) / 50 * (s.gridFins?.maxAngle ?? 0)), a, o.centreOfMass, s, c);
		return;
	}
	c.forceX = c.forceY = c.torque = c.drag = c.lift = 0;
	let u = s.gridFins, d = Math.hypot(r, i);
	if (!u || n <= 0 || d === 0) return;
	let f = .5 * n * d * d;
	aa(t, s, f, 0, l);
	let p = N(s).partition.components, m = Math.sin(a), h = Math.cos(a);
	for (let e = 0; e < p.length; e++) {
		let n = p[e];
		if (n.kind !== "grid-fin" || !t.damage.components[e].attached || (L.proofMask | L.domainMask) & 1 << e) continue;
		let a = L.loadedAngles[e], s = f * u.area / u.count * Math.sin(2 * a), l = f * u.area / u.count * 1.2 * Math.sin(a) ** 2, g = (-i * s - r * l) / d, _ = (r * s - i * l) / d, v = n.x - o.centreOfMassX, y = n.station - o.centreOfMass, ee = h * v + m * y, b = -m * v + h * y;
		c.forceX += g, c.forceY += _, c.lift += s, c.drag += l, c.torque += b * g - ee * _;
	}
}
var ca = Ui(), R = {
	x: 0,
	altitude: 0,
	pitch: e(0),
	vx: 0,
	vy: 0,
	omega: 0
};
function la(t, n, r, i) {
	let a = t.damage;
	if (!a || a.terminal.active) return 0;
	let o = N(r), s = ji(a, o.thermal, n, t.forces.thermalPower, Yi(t.kinematics.altitude, t.atmosphere.airTemperature), t.atmosphere.airPressure * 1e3), c = ta(t);
	if (c !== 0) {
		if (i !== "hull") throw RangeError("Terminal live state must publish its hull reference");
		return ea(t, r, c, t.world.environmentTime + n), s;
	}
	aa(t, r, t.forces.dynamicPressure * 1e3, Math.abs(Math.sin(t.kinematics.angleInToTheWind)));
	let l = s & ~hi | L.domainMask, u = L.proofMask & ~l;
	for (let t = 0; t < a.components.length; t++) {
		let n = a.components[t];
		n.attached && !(l & 1 << t) && (n.loadedAngle = e(L.loadedAngles[t]));
	}
	if ((l | u) === 0) return s;
	Hi(a, o.partition, t.vehicle.propellantMass, r, na);
	let d = t.kinematics, f = Math.sin(d.pitch), p = Math.cos(d.pitch), m = i === "hull" ? na.centreOfMassX : 0, h = i === "hull" ? na.centreOfMass - r.height / 2 : 0, g = p * m + f * h, _ = -f * m + p * h;
	R.x = d.downRangeDistance + g, R.altitude = d.altitude + _, R.pitch = d.pitch, R.vx = d.speedX + d.angularVelocity * _, R.vy = d.speedY - d.angularVelocity * g, R.omega = d.angularVelocity;
	let v = a.revision, y = Wi(a, o.partition, r, t.vehicle.propellantMass, R, l, Qr.MaterialDomain, ca);
	return y |= Wi(a, o.partition, r, t.vehicle.propellantMass, R, u, Qr.ProofExceeded, ca), y !== 0 && (a.revision = v + 1), i === "mass" && (d.downRangeDistance = R.x, d.downRangeDistanceNextFrame = R.x, d.altitude = R.altitude, d.speedX = R.vx, d.speedY = R.vy), ra(t, r), ia(t, r), y | s & hi;
}
//#endregion
//#region src/core/control/guidance-physics.ts
var ua = .1;
function da(e) {
	let t = a + e.kinematics.altitude;
	return Math.max(ua, -D(t, e.kinematics.speedX));
}
function fa(e, t, n = E) {
	return e * T(n.propulsion, "sea-level", t);
}
function pa() {
	return {
		fallWork: Na(),
		atmosphere: {
			airTemperature: 0,
			airPressure: 0,
			airDensity: 0
		},
		duration: 0,
		capped: !1,
		inputs: {
			angleOfMotion: e(0),
			angleOfAttack: e(0),
			gimbalPointingDirection: e(0),
			aerodynamicDragAcceleration: 0,
			aerodynamicLiftAcceleration: 0,
			thrustAcceleration: 0,
			fixedThrustAcceleration: 0,
			pitch: e(0)
		},
		acc: {
			x: 0,
			y: 0
		}
	};
}
function ma(t, n, r, i, a = E) {
	let o = i.atmosphere;
	St(t, o);
	let s = n / Et(o.airTemperature);
	return kt(o.airDensity, n, Ot(e(0), a.maxArea, a), Mt(s)) / r;
}
var ha = .05, ga = 1200;
function _a(e, t, n, r, i, a) {
	let o = e * Oe(a.propulsion, "sea-level"), s = ha * .5, c = r, l = 0, u = t;
	i.capped = !1;
	for (let t = 0; t < ga; t++) {
		let r = va(e, c, l, u, i, a), d = l + r * s, f = va(e, c + (l + d) * .5 * s, d, u + o * s, i, a);
		if (f <= 0) return NaN;
		let p = l + f * ha;
		if (p >= n) {
			let e = (n - l) / (p - l);
			return i.duration = (t + e) * ha, c + (l + .5 * (n - l)) * e * ha;
		}
		c += (l + p) * .5 * ha, l = p, u += o * ha;
	}
	return i.capped = !0, NaN;
}
function va(e, t, n, r, i, o) {
	let s = ma(t, n, r, i, o);
	return fa(e, i.atmosphere.airPressure, o) / r + s - sn(a + t);
}
var ya = 24, ba = 1;
function xa(e, t, n, r, i = E) {
	if (e <= 0 || t <= 0) return Infinity;
	let o = t + e * Oe(i.propulsion, "sea-level") * ha + ba, s = fa(e, w / 1e3, i) / o - sn(a + r);
	return s <= 0 ? Infinity : r + Math.max(0, n) ** 2 / (2 * s);
}
function Sa(e, t, n, r, i, o = E, s = o.dryMass) {
	if (e <= 0 || t <= 0 || !(s > 0 && s <= t)) return null;
	if (n <= 0) return r;
	let c = e * Oe(o.propulsion, "sea-level"), l = fa(e, w / 1e3, o) / t - sn(a);
	if (l <= 0) return null;
	let u = Math.max(t - n / l * c, s), d = _a(e, u, n, r, i, o);
	if (Number.isNaN(d)) return null;
	let f = t - c * i.duration - u;
	if (f < 0) return null;
	if (f < ba) return d;
	let p = t - c * i.duration, m = NaN, h = 0;
	for (let a = 0; a < ya; a++) {
		let s = Number.isNaN(m) ? a === 0 ? p : (u + p) / 2 : p - m * (p - u) / (m - f), l = _a(e, s, n, r, i, o);
		if (i.capped) return null;
		let g = Number.isNaN(l) ? NaN : t - c * i.duration - s;
		if (!Number.isNaN(g) && Math.abs(g) < ba) return l;
		if (!Number.isNaN(g) && g > 0 ? (u = s, f = g, d = l, h === 1 && !Number.isNaN(m) && (m *= .5), h = 1) : (p = s, m = g, h === -1 && (f *= .5), h = -1), p - u < ba) break;
	}
	return d;
}
function Ca() {
	return {
		reached: !1,
		time: NaN,
		downRange: 0
	};
}
var wa = .25, Ta = 4e3, Ea = 2;
function Da(t, n, r, i, o, s, c, l, d, f = 0, p = 0, m, h) {
	let { inputs: g, acc: _ } = l, v = a + t, y = l.atmosphere;
	St(Math.max(t, 0), y);
	let ee = n - jn(c, t), b = f === 0 ? ee : ee - f, x = p === 0 ? r : r - p, S = Math.sqrt(b * b + x * x), C = Math.atan2(b, x), te = zt(i, C), w = Bt(te);
	if (m?.damage) {
		let e = h?.controlModel ?? N(d).controls, t = .5 * y.airDensity * S ** 2;
		if (h && h.zeroControlArea !== null && Number.isFinite(t * h.zeroControlColumnArea * Ea)) Pi(m.damage, e, t, Number.isFinite(w) ? 0 : NaN, ja), s = h.zeroControlArea;
		else {
			let n = d.gridFins ? (m.vehicle.frontFinExtension - 50) / 50 * d.gridFins.maxAngle : m.vehicle.frontFinExtension * .01 * ie, r = m.vehicle.aftFinExtension * .01 * ie;
			if (Fi(m.damage, e, t, Math.abs(Math.sin(w)), n, r, ja), s = d.maxArea + 1.8 * (ja.frontArea + ja.aftArea), h && n === 0 && r === 0) {
				h.zeroControlArea = s, h.zeroControlColumnArea = 0;
				for (let t of e.columns) h.zeroControlColumnArea = Math.max(h.zeroControlColumnArea, t.area);
			}
		}
	}
	let ne = Ot(e(w), s, d), re = S / Et(y.airTemperature);
	g.angleOfMotion = e(C), g.angleOfAttack = e(te), g.aerodynamicDragAcceleration = kt(y.airDensity, S, ne, Mt(re)) / o, g.aerodynamicLiftAcceleration = jt(y.airDensity, S, e(w), s) / o, nn(g, u, _), _.x += un(v, n, r), _.y = _.y + u + D(v, n);
}
var Oa = Wn(), ka = Gn(), Aa = P(), ja = Ni(12);
function Ma(e, t, n, r) {
	let i = e.kinematics;
	e.damage && F(e, n, Aa, Oa);
	let a = e.damage ? Aa.totalMass : e.vehicle.vehicleMass;
	if (!(a > 0)) {
		r.acc.x = r.acc.y = 0;
		return;
	}
	Da(i.altitude, i.speedX, i.speedY, t, a, e.vehicle.vehicleInFlightMaxArea, e.world.wind, r, n, e.world.gust, e.world.gustVertical, e), n.gridFins && (e.damage || Un(e.vehicle.propellantMass, Oa, n), sa(e, r.atmosphere.airDensity, i.speedX - jn(e.world.wind, i.altitude) - e.world.gust, i.speedY - e.world.gustVertical, t, Oa, n, ka), r.acc.x += ka.forceX / a, r.acc.y += ka.forceY / a);
}
function Na() {
	return {
		state: null,
		model: E,
		groundAltitude: 0,
		pitch: e(0),
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
		result: Ca()
	};
}
function Pa(e, t, n, r, i) {
	t.damage && F(t, r, Aa), e.state = t, e.model = r, e.groundAltitude = n, e.pitch = i, e.mass = t.damage ? Aa.totalMass : t.vehicle.vehicleMass, e.maxArea = t.vehicle.vehicleInFlightMaxArea, e.referenceWind = t.world.wind, e.zeroControlArea = null, e.zeroControlColumnArea = 0, e.controlModel = t.damage ? N(r).controls : null, e.h = t.kinematics.altitude, e.x = 0, e.vx = t.kinematics.speedX, e.vy = t.kinematics.speedY, e.steps = 0, e.done = !(e.mass > 0), e.result.reached = !1, e.result.time = NaN, e.result.downRange = e.done ? NaN : 0;
}
function Fa(e, t, n = E, r = e.kinematics.pitch) {
	let i = Na();
	return Pa(i, e, t, n, r), i;
}
function Ia(e, t, n) {
	if (e.done) return 0;
	let r = e.state, i = e.model, a = e.pitch, o = e.mass, s = e.maxArea, c = e.referenceWind, l = n.acc, u = wa * .5, d = e.h, f = e.x, p = e.vx, m = e.vy, h = e.steps, g = 0, _ = Math.min(Math.floor(t), Ta - h);
	for (let t = 0; t < _; t++) {
		Da(d, p, m, a, o, s, c, n, i, 0, 0, r, e);
		let t = p + l.x * u, _ = m + l.y * u;
		Da(d + m * u, t, _, a, o, s, c, n, i, 0, 0, r, e);
		let v = p + l.x * wa, y = m + l.y * wa, ee = d + _ * wa, b = f + t * wa, x = h;
		if (h++, g++, ee <= e.groundAltitude) {
			let t = (d - e.groundAltitude) / (d - ee);
			e.result.reached = !0, e.result.time = (x + t) * wa, e.result.downRange = f + (b - f) * t, d = ee, f = b, p = v, m = y, e.done = !0;
			break;
		}
		d = ee, f = b, p = v, m = y;
	}
	return e.h = d, e.x = f, e.vx = p, e.vy = m, e.steps = h, e.result.reached || (e.result.downRange = f), h >= 4e3 && (e.done = !0), g;
}
function La(e, t, n, r, i = E, a = e.kinematics.pitch) {
	let o = n.fallWork;
	Pa(o, e, t, i, a), Ia(o, Ta, n), r.reached = o.result.reached, r.time = o.result.time, r.downRange = o.result.downRange, o.state = null;
}
//#endregion
//#region src/core/vehicles/super-heavy.ts
var z = Object.freeze([
	0,
	1,
	2
]), Ra = Object.freeze(Array.from({ length: 13 }, (e, t) => t));
Object.freeze({
	centre: z,
	inner: Object.freeze(Array.from({ length: 10 }, (e, t) => t + 3)),
	outer: Object.freeze(Array.from({ length: 20 }, (e, t) => t + 13))
});
var za = Ne.height, Ba = Ne.diameter, Va = Ne.propellantCapacity, Ha = 3, Ua = .9 * za, Wa = 66 / 71 * za, Ga = Math.PI * (Ba / 2) ** 2, Ka = Va * Pe / (Fe * Ga), qa = Va * (1 - Pe) / (424 * Ga), Ja = (e, t) => Object.freeze({
	kind: "sea-level",
	offAxis: e,
	gimballed: t,
	offAxisForceFraction: 0
}), Ya = (e, t, n) => Array.from({ length: e }, (r, i) => Ja(t * Math.cos(2 * Math.PI * i / e), n)), Xa = Object.freeze({
	id: "super-heavy",
	propulsion: Ne.propulsion,
	height: za,
	diameter: Ba,
	dryMass: Ne.dryMass,
	propellantCapacity: Va,
	initialPropellant: 5e5,
	dryCentreOfMass: za / 2,
	tankBottom: Ha,
	loxTankHeight: Ka,
	ch4TankHeight: qa,
	ch4TankBottom: Ha + Ka,
	aftFinStation: Ua,
	frontFinStation: Ua,
	rcsStation: Wa,
	minArea: Ga,
	maxArea: za * Ba,
	frontFinArea: 0,
	aftFinArea: 0,
	engines: Object.freeze([
		Ja(0, !0),
		Ja(-.65, !0),
		Ja(.65, !0),
		...Ya(10, 2, !0),
		...Ya(20, 3.8, !1)
	]),
	ignitionGroup: Ra,
	gridFins: Object.freeze({
		count: 3,
		area: Ne.gridFins.area,
		station: Ua,
		maxAngle: Math.PI / 4
	})
}), Za = 65 / 71 * za, B = Object.freeze({
	lugStation: Za,
	planeAltitude: 120,
	bodyCentreAltitude: 120 - (Za - za / 2),
	halfWidth: 2.25,
	maxDownSpeed: 4.5,
	maxLateralSpeed: 1,
	maxPitch: 5 * Math.PI / 180
});
//#endregion
//#region src/core/control/booster-receipts.ts
function Qa(e, t) {
	let n = e.autopilot;
	return t === 1 / 120 && !!e.damage && !n.manualControlOn && (n.autoLandOn || n.autoBoostBackOn) && !n.boosterReturnPlan && (n.boosterPhase === "align-boost" || n.boosterPhase === "boostback" && !Ra.every((t) => e.engines.running[t]));
}
function $a(e, t) {
	for (let n of [
		"boosterFallTime",
		"boosterCoastPitch",
		"boosterForecastBurn"
	]) Object.hasOwn(t.autopilot, n) ? Object.assign(e.autopilot, { [n]: t.autopilot[n] }) : delete e.autopilot[n];
}
function eo(e) {
	if (e && typeof e == "object") {
		for (let t in e) eo(e[t]);
		Object.freeze(e);
	}
	return e;
}
function to(e) {
	if (!e || typeof e != "object") return e;
	let t = Array.isArray(e) ? [] : {};
	for (let n in e) t[n] = to(e[n]);
	return t;
}
function no(e, t, n, r, i, a, o, s, c) {
	return Object.freeze({
		input: eo(V(e)),
		expected: eo(V(t)),
		returned: eo(V(n)),
		dt: r,
		advance: i,
		policy: a,
		model: o,
		modelSnapshot: eo(to(o)),
		lineage: s,
		revision: c
	});
}
function ro(e, t) {
	let n = e?.chunks, r = n?.[n.length - 1], i = r?.[r.length - 1];
	return (e?.size ?? 0) < 1024 && (!i || t > i.input.world.environmentTime) && (!r || r.length < 32 || n.length < 32);
}
function io(e, t) {
	if (!ro(e, t.input.world.environmentTime)) return e;
	let n = [...e?.chunks ?? []], r = n[n.length - 1];
	return r && r.length < 32 ? n[n.length - 1] = Object.freeze([...r, t]) : n.push(Object.freeze([t])), Object.freeze({
		chunks: Object.freeze(n),
		size: (e?.size ?? 0) + 1
	});
}
function ao(e, t, n, r, i, a, o, s) {
	let c = 0, l = 0, u = 0;
	for (; c < e.chunks.length;) {
		let n = e.chunks[c];
		for (; l < n.length && n[l].input.world.environmentTime < t.world.environmentTime;) l++, u++;
		if (l < n.length) break;
		c++, l = 0;
	}
	let d = e.chunks[c]?.[l], f;
	if (d && d.input.world.environmentTime === t.world.environmentTime && d.lineage === o && d.revision === s && d.dt === n && d.advance === r && d.policy === i && d.model === a && fo(d.modelSnapshot, a)) {
		let e = V(d.input);
		$a(e, t), fo(e, t) && (f = d, l++, u++);
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
function oo(e) {
	return e ? {
		...e,
		handoff: { ...e.handoff }
	} : void 0;
}
function so(e) {
	let t = oo(e.plan);
	return t && (Object.freeze(t.handoff), Object.freeze(t)), Object.freeze({
		...e,
		plan: t
	});
}
function V(e) {
	let t = { ...e.autopilot };
	return delete t.boosterSource, delete t.boosterPrediction, So({
		...e,
		autopilot: t
	});
}
function co(e, t) {
	let n = e.autopilot;
	return so({
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
function lo(e, t) {
	let n = e.autopilot;
	t.rangeError === void 0 ? delete n.boosterRangeError : n.boosterRangeError = t.rangeError, t.fallTime === void 0 ? delete n.boosterFallTime : n.boosterFallTime = t.fallTime, t.coastPitch === void 0 ? delete n.boosterCoastPitch : n.boosterCoastPitch = t.coastPitch, t.reached === void 0 ? delete n.boosterForecastReached : n.boosterForecastReached = t.reached;
	let r = oo(t.plan);
	r ? n.boosterReturnPlan = r : delete n.boosterReturnPlan;
}
function uo(e) {
	let t = e.autopilot;
	t.boosterSource && (t.boosterSource.valid = !1), delete t.boosterReturnPlan, delete t.boosterCoastPitch, delete t.boosterForecastReached, t.boosterPrediction?.published && (t.boosterPrediction = {
		...t.boosterPrediction,
		published: void 0
	});
}
function fo(e, t, n = !1) {
	if (Object.is(e, t)) return !0;
	if (e === null || t === null || typeof e != "object" || typeof t != "object" || Array.isArray(e) !== Array.isArray(t) || Array.isArray(e) && e.length !== t.length) return !1;
	let r = e, i = t;
	for (let e in r) if (!(n && (e === "boosterSource" || e === "boosterPrediction")) && (!(e in i) || !fo(r[e], i[e], e === "autopilot"))) return !1;
	for (let e in i) if (!(n && (e === "boosterSource" || e === "boosterPrediction")) && !(e in r)) return !1;
	return !0;
}
function po(e, t) {
	if (!e.damage) return !0;
	let n = e.autopilot, r = n.boosterSource;
	return r ? r.revision !== e.damage.revision || !r.valid || !r.expected || r.expectedDt !== t || !fo(r.expected, e) || n.boosterReturnPlan && n.boosterReturnPlan.sourceLineage !== r.lineageId ? (uo(e), !1) : (r.checked = !0, !0) : !n.boosterReturnPlan || (uo(e), !1);
}
function mo(e) {
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
		event: co(e, 0)
	};
}
function ho(e, t, n, r, i, a) {
	let o = e.autopilot.boosterSource;
	if (!o || !o.valid) return 0;
	if (!o.checked || o.returned.world.environmentTime !== e.world.environmentTime) return uo(e), 0;
	let s = co(e, o.event.sequence + 1), c = V(o.returned);
	if (lo(c, s), a) return fo(s, a.event) ? (e.autopilot.boosterSource = {
		...o,
		event: s,
		returned: V(a.returned),
		expected: V(a.expected),
		expectedDt: t,
		checked: !1
	}, 0) : (uo(e), 0);
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
	}, l || uo(e), 1;
}
function go(e, t, n, r, i) {
	let a = e.autopilot.boosterSource;
	if (!a?.valid || !a.checked || !a.receipts || a.returned.world.environmentTime !== e.world.environmentTime) return;
	let o = co(e, a.event.sequence + 1), s = V(a.returned);
	if (lo(s, o), !Qa(s, t)) return;
	let c = ao(a.receipts, s, t, n, r, i, a.lineageId, a.revision);
	if (e.autopilot.boosterSource = {
		...a,
		receipts: c.queue
	}, !c.receipt) return;
	let l = V(c.receipt.expected), u = V(c.receipt.returned);
	return $a(l, s), $a(u, s), {
		event: o,
		expected: l,
		returned: u
	};
}
function _o(e, t, n, r, i, a, o, s) {
	let c = e.autopilot.boosterSource;
	if (!n || !yo(e, t, i)) return;
	let l = no(t, n, r, i, a, o, s, c.lineageId, c.revision);
	e.autopilot.boosterSource = {
		...c,
		receipts: io(c.receipts, l)
	};
}
function vo(e, t) {
	let n = e.autopilot.boosterSource;
	return !!n && fo(co(e, n.event.sequence + 1), t.event);
}
function yo(e, t, n) {
	let r = e.autopilot.boosterSource;
	return !!r?.valid && Qa(t, n) && ro(r.receipts, t.world.environmentTime);
}
//#endregion
//#region src/core/state.ts
var bo = 1463897163;
function xo(t = bo, n = E) {
	let r = n.height / 2, i = a + r, o = n.dryMass + n.initialPropellant;
	return {
		damage: ei(N(n).partition, Yi(r, ft(r).airTemperature)),
		rng: hn(t),
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
			downRangeDistance: d,
			downRangeDistanceNextFrame: d,
			distanceToPlanetCenter: i,
			orbitalVelocityAtCurrentAltitude: on(i),
			trueSpeed: 0,
			speedX: 0,
			speedY: 0,
			machSpeed: 0,
			accelerationX: 0,
			accelerationY: 0,
			totalAcceleration: Math.sqrt(0 + (-u) ** 2),
			pitch: e(0),
			pitchRateOfChange: 0,
			pitchRecord: n.gridFins ? [0, 0] : [Infinity, Infinity],
			angularVelocity: 0,
			angularAcceleration: 0,
			angleOfMotion: e(0),
			angleOfAttack: e(0),
			angleInToTheWind: e(0)
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
			frontFinEffectiveAreaFraction: Wt(0, 0, n).frontFinEffectiveAreaFraction,
			aftFinEffectiveAreaFraction: Wt(0, 0, n).aftFinEffectiveAreaFraction,
			thermalPower: 0,
			surfaceTemperature: 0,
			dynamicPressure: 0,
			perceivedG: 0,
			perceivedG_X: 0,
			perceivedG_Y: 0
		},
		vehicle: {
			vehicleMass: o,
			propellantMass: n.initialPropellant,
			vehicleMomentOfInertia: n.gridFins ? Vn(n.initialPropellant, n) : o * (n.diameter / 2) ** 2 * .25 + o * n.height ** 2 / 12,
			vehicleInFlightMaxArea: n.maxArea,
			throttle: 100,
			throttleCurrent: 100,
			gimbalPosition: 0,
			gimbalPointingDirection: e(0),
			frontFinExtension: n.gridFins ? 50 : 0,
			aftFinExtension: n.gridFins ? 50 : 0,
			rcsRunTimeRemaining: 25
		},
		engines: {
			running: n.engines.map(() => !1),
			failed: n.engines.map(() => !1),
			ignitionCountdown: n.engines.map(() => null)
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
			holdingPitch: e(0),
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
			landingSiteXPos: d,
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
			horizontalAccelerationByAeroBreakingCorrectionAngle: e(0)
		}
	};
}
function So(e) {
	return {
		damage: e.damage ? ti(e.damage) : null,
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
			...e.autopilot.boosterReturnPlan ? { boosterReturnPlan: oo(e.autopilot.boosterReturnPlan) } : {},
			...e.autopilot.boosterSource ? { boosterSource: {
				...e.autopilot.boosterSource,
				returned: So(e.autopilot.boosterSource.returned),
				expected: e.autopilot.boosterSource.expected ? So(e.autopilot.boosterSource.expected) : void 0,
				event: so(e.autopilot.boosterSource.event)
			} } : {}
		}
	};
}
function Co(e, t = E) {
	let n = Wt(e.vehicle.frontFinExtension, e.vehicle.aftFinExtension, t);
	e.forces.frontFinEffectiveAreaFraction = n.frontFinEffectiveAreaFraction, e.forces.aftFinEffectiveAreaFraction = n.aftFinEffectiveAreaFraction, e.vehicle.vehicleInFlightMaxArea = n.vehicleInFlightMaxArea;
}
//#endregion
//#region src/core/physics/engines.ts
function wo(e) {
	let t = 0;
	for (let n of e) n && (t += 1);
	return t;
}
function To(e, t, n, r) {
	let i = 0;
	for (let a = 0; a < r.engines.length; a++) r.engines[a].kind === t && e[a] === !0 === n && (i += 1);
	return i;
}
function Eo(e, t = E) {
	return To(e, "sea-level", !0, t);
}
function Do(e, t = E) {
	return To(e, "sea-level", !1, t);
}
function H(e, t, n = E) {
	return To(e, "sea-level", !0, n) * T(n.propulsion, "sea-level", t) + To(e, "vacuum", !0, n) * T(n.propulsion, "vacuum", t);
}
function Oo(e, t, n = E) {
	return H(e, t, n) * 40 * .01;
}
function ko(e, t, n, r = E) {
	return H(e, n, r) * t * .01;
}
function Ao(e, t, n = E) {
	if (n.engines.some((e) => e.gimballed === !1 && e.kind === "sea-level")) {
		let t = 0, r = 0;
		for (let i = 0; i < n.engines.length; i++) e[i] && (t++, n.engines[i].gimballed === !0 && r++);
		return t > 0 ? r / t : 0;
	}
	if (To(e, "vacuum", !0, n) === 0) return 1;
	let r = H(e, t, n);
	return r > 0 ? To(e, "sea-level", !0, n) * T(n.propulsion, "sea-level", t) / r : 0;
}
function jo(e, t) {
	return e * Math.sin(.01 * t * S);
}
function Mo(e, t, n, r = E) {
	let i = 0, a = 0;
	for (let t = 0; t < r.engines.length; t++) {
		let n = r.engines[t], o = +!!e[t] * n.offAxisForceFraction;
		n.kind === "sea-level" ? i += o : a += o;
	}
	return i * t * .01 * T(r.propulsion, "sea-level", n) + a * t * .01 * T(r.propulsion, "vacuum", n);
}
function No(t, n) {
	let r = t - .01 * n * S;
	return r > Math.PI ? r -= 2 * Math.PI : r < -Math.PI && (r += 2 * Math.PI), e(r);
}
function Po(e, t, n = E) {
	return To(e, "sea-level", !0, n) * t * .01 * Oe(n.propulsion, "sea-level") + To(e, "vacuum", !0, n) * t * .01 * Oe(n.propulsion, "vacuum");
}
function Fo(e, t, n = E) {
	ia(e, n);
	let { vehicle: r, engines: i, status: a } = e, o = 1;
	if (r.propellantMass > 0) {
		let e = Po(i.running, r.throttleCurrent, n) * t;
		e > r.propellantMass && (o = r.propellantMass / e), r.propellantMass = Math.max(0, r.propellantMass - e);
	} else r.propellantMass = 0;
	return a.dumpingFuel && ((r.propellantMass > 12e3 || a.forceDump) && r.propellantMass > 0 ? r.propellantMass = Math.max(0, r.propellantMass - h * t) : a.dumpingFuel = !a.dumpingFuel), ra(e, n), o;
}
var Io = 1.2;
function Lo(e, t) {
	let { engines: n } = e;
	if (n.running[t] || n.failed[t] || n.ignitionCountdown[t] !== null) return;
	let r = xn(e.rng, "ignitionDelay");
	n.ignitionCountdown[t] = (r * 1.5 + .5) * (600 / 1e3);
}
function Ro(e, t) {
	let n = e.failures.randomFailure ? g : 0, r = xn(e.rng, "ignitionFailure") < n;
	return r && (e.engines.failed[t] = !0), r;
}
function zo(e, t) {
	let { engines: n } = e;
	for (let e = 0; e < n.ignitionCountdown.length; e++) {
		let r = n.ignitionCountdown[e];
		if (r == null) continue;
		let i = r - t;
		i <= 0 ? (n.ignitionCountdown[e] = null, n.running[e] = !0) : n.ignitionCountdown[e] = i;
	}
}
function Bo(e, t) {
	e.engines.running[t] = !1, e.engines.ignitionCountdown[t] = null;
}
function Vo(e) {
	e.failures.fuelRunOut && (e.engines.running.fill(!1), e.engines.ignitionCountdown.fill(null));
}
function Ho(e, t, n, r, i) {
	let a = 0;
	for (let o = 0; o < i.engines.length; o++) if (e[o]) {
		let e = i.engines[o], s = T(i.propulsion, e.kind, n);
		a -= e.offAxis * s * t * .01 * Math.cos(e.gimballed ?? e.kind === "sea-level" ? r : 0);
	}
	return a;
}
//#endregion
//#region src/core/control/booster-return-plan.ts
function Uo(e) {
	delete e.boosterPrediction, delete e.boosterReturnPlan;
}
function Wo(e) {
	let t = e.autopilot, n = e.damage?.revision, r = t.boosterPrediction && t.boosterPrediction.origin.damage?.revision !== n, i = t.boosterReturnPlan && t.boosterReturnPlan.damageRevision !== n;
	return !r && !i ? !1 : (Uo(t), delete t.boosterCoastPitch, delete t.boosterForecastReached, delete t.boosterRangeError, delete t.boosterFallTime, !0);
}
function Go(e) {
	let t = e.forecast;
	return t.reached && !t.failed && t.fuel > 0 && t.handoff !== void 0 && Number.isFinite(t.rangeError) && Number.isFinite(e.shutdownAt) && Number.isFinite(e.burnDuration) && e.burnDuration >= 0;
}
function Ko(e, t) {
	if (!Go(e) || !Go(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || e.coastPitch !== t.coastPitch || t.burnDuration <= e.burnDuration || e.forecast.rangeError * t.forecast.rangeError >= 0) return;
	let n = e.forecast.rangeError / (e.forecast.rangeError - t.forecast.rangeError);
	return e.burnDuration + (t.burnDuration - e.burnDuration) * n;
}
function qo(e, t, n, r = 0) {
	if (!Go(e) || !Go(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || e.coastPitch !== t.coastPitch || e.burnDuration === t.burnDuration || e.forecast.rangeError * t.forecast.rangeError <= 0) return;
	let i = t.forecast.rangeError - e.forecast.rangeError, a = t.burnDuration - t.forecast.rangeError * (t.burnDuration - e.burnDuration) / i, o = t.burnDuration > e.burnDuration ? a > t.burnDuration : a < t.burnDuration;
	return Number.isFinite(a) && o && a > r && a < n ? a : void 0;
}
function Jo(e, t, n) {
	if (!(!Go(e) || !t || !e.forecast.handoff.lateralFeasible || e.shutdownAt <= n)) return {
		originTime: e.originTime,
		shutdownAt: e.shutdownAt,
		...e.damageRevision === void 0 ? {} : { damageRevision: e.damageRevision },
		...e.sourceLineage === void 0 ? {} : { sourceLineage: e.sourceLineage },
		coastPitch: e.coastPitch,
		handoff: { ...e.forecast.handoff }
	};
}
function Yo(e, t, n, r) {
	if (Ko(n, r) === void 0 || !Go(e) || !Go(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || t.damageRevision !== n.damageRevision || t.sourceLineage !== n.sourceLineage || t.originTime !== n.originTime || e.coastPitch !== t.coastPitch || t.coastPitch !== n.coastPitch || e.burnDuration === t.burnDuration) return;
	let i = t.forecast.rangeError - e.forecast.rangeError, a = t.burnDuration - t.forecast.rangeError * (t.burnDuration - e.burnDuration) / i;
	return Number.isFinite(a) && a > n.burnDuration && a < r.burnDuration ? a : void 0;
}
//#endregion
//#region src/core/control/commands.ts
function Xo(e, t) {
	let { engines: n, failures: r } = e, i = n.ignitionCountdown[t] !== null;
	!n.running[t] && !i && !n.failed[t] && !r.fuelRunOut ? Ro(e, t) || Lo(e, t) : Bo(e, t);
}
function U(e, t = E) {
	let { running: n } = e.engines;
	if (n.some(Boolean)) for (let t = 0; t < n.length; t++) n[t] && Xo(e, t);
	else for (let r of t.ignitionGroup) n[r] || Xo(e, r);
}
function Zo(e) {
	e.status.finActive = !e.status.finActive;
}
function Qo(e) {
	e.status.rcsActive = !e.status.rcsActive;
}
function $o(e) {
	e.status.dumpingFuel = !e.status.dumpingFuel;
}
function es(e) {
	e.autopilot.autoMaxThrustOn = !e.autopilot.autoMaxThrustOn;
}
function ts(e) {
	e.autopilot.autoTakeOffOn = !e.autopilot.autoTakeOffOn;
}
function ns(e) {
	e.autopilot.autoBoostBackOn = !e.autopilot.autoBoostBackOn;
}
function rs(e) {
	e.autopilot.autoLandOn = !e.autopilot.autoLandOn;
}
//#endregion
//#region src/core/scenarios.ts
var is = [
	{
		id: "booster-sep",
		name: "Booster Sep",
		description: "Just after stage separation: high, fast, and pointed downrange.",
		altitude: 7e4,
		xPosition: 45e3,
		speedX: 1130,
		speedY: 1130,
		pitch: t(45),
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
		pitch: t(30),
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
		pitch: t(30),
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
		pitch: t(90),
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
		pitch: t(0),
		propellant: 20
	}
], as = {
	id: "launch-pad",
	name: "Launch Pad",
	description: "On the pad at StarBase, full tanks.",
	altitude: E.height / 2,
	xPosition: 0,
	speedX: 0,
	speedY: 0,
	pitch: t(0),
	propellant: p / 1e3
}, os = 200, ss = {
	id: "intro",
	name: "Intro Demo",
	description: "The auto-landing sequence that plays when the game opens.",
	altitude: os - 1,
	xPosition: 0,
	speedX: 0,
	speedY: -os / 4,
	pitch: t(0),
	propellant: 12
}, cs = 15e4, ls = ln(a + cs, on(a + cs)), us = [{
	id: "circularize",
	name: "Circularize",
	description: "Just short of orbital speed at 150 km — a short prograde burn closes the orbit.",
	altitude: cs,
	xPosition: 0,
	speedX: ls - 20,
	speedY: 0,
	pitch: t(90),
	propellant: 200
}, {
	id: "deorbit",
	name: "Deorbit Burn",
	description: "Circular at 150 km, half a lap short of StarBase. Burn retrograde and come home.",
	altitude: cs,
	xPosition: -Math.PI * a,
	speedX: ls,
	speedY: 0,
	pitch: t(90),
	propellant: 300
}], ds = [
	as,
	...is,
	...us,
	ss
];
function fs(e) {
	return ds.find((t) => t.id === e);
}
function ps(e, t) {
	return hs(e, t, E);
}
function ms(e, t) {
	let n = e.id === "custom" ? e.basedOn : e.id, r = n === "booster-sep" || n === "rtls" ? Xa : E;
	return {
		state: hs(e, t, r),
		vehicle: r
	};
}
function hs(e, t, r) {
	let i = xo(t, r), o = e.altitude;
	o < r.height / 2 && (o = r.height / 2), i.kinematics.altitude = o, i.kinematics.distanceToPlanetCenter = a + o, i.kinematics.downRangeDistance = e.xPosition + d, i.kinematics.downRangeDistanceNextFrame = i.kinematics.downRangeDistance, i.kinematics.speedX = e.speedX, i.kinematics.speedY = e.speedY, i.kinematics.trueSpeed = Math.sqrt(e.speedX ** 2 + e.speedY ** 2), i.kinematics.pitch = n(e.pitch), r.gridFins && (i.kinematics.pitchRecord = [i.kinematics.pitch, i.kinematics.pitch]);
	let s = e.propellant * 1e3;
	return s > r.propellantCapacity && (s = r.propellantCapacity), s > 0 || (s = 0), i.vehicle.propellantMass = s, i.vehicle.vehicleMass = r.dryMass + s, r.gridFins && (i.vehicle.vehicleMomentOfInertia = Vn(s, r)), i.world.wind = e.wind ?? 0, i.kinematics.machSpeed = It(i.kinematics.speedX, i.kinematics.speedY, O(i.world, i.kinematics.altitude), i.world.gustVertical) / Et(ft(o).airTemperature), i.damage = ei(N(r).partition, Yi(o, ft(o).airTemperature)), i;
}
function gs(e) {
	let t = ps(ss, e);
	return t.status.finLocked = !0, t.autopilot.demoAutoLandOn = !0, U(t), t;
}
//#endregion
//#region src/core/physics/step-dynamics.ts
function _s() {
	return {
		omega0: 0,
		alpha0: 0,
		bodyAccelerationX: 0,
		bodyAccelerationY: 0,
		burnedFraction: 0,
		gimballedThrust: 0,
		airspeed: 0,
		massProperties: Wn(),
		gridFinForces: Gn()
	};
}
function vs(e, t) {
	let { kinematics: n } = e;
	n.pitchRecord.push(n.pitch), n.pitchRecord.shift();
	let r = n.pitchRecord[0];
	n.pitchRateOfChange = e.damage && !Number.isFinite(r) ? n.angularVelocity : (n.pitch - r) / t;
}
function ys(e) {
	let { kinematics: t } = e;
	t.distanceToPlanetCenter = a + t.altitude, t.orbitalVelocityAtCurrentAltitude = on(t.distanceToPlanetCenter);
}
function bs(t, n) {
	let { kinematics: r, status: i, failures: a, vehicle: o, engines: s } = t;
	r.altitude <= n.height * Math.abs(Math.cos(r.pitch)) * .5 ? (r.speedY < -.5 || n.id === "super-heavy" && r.speedY < 0) && (n.id === "ship" && Math.abs(r.speedX) < 2 && Math.abs(r.speedY) < 10 && Math.abs(r.pitch) < .09 ? (i.landed = !0, r.speedX = 0, r.speedY = 0, r.angularVelocity = 0) : (ea(t, n, Xi.Impact, t.world.environmentTime), a.crashed = !0, r.speedX = 0, r.speedY = 0, r.angularVelocity = 0, r.pitch = e(0), o.propellantMass = 0, s.running.fill(!1), o.rcsRunTimeRemaining = 0)) : (i.landed = !1, i.onTheGround = !1);
}
function xs(e, t, n, r = n.height * Math.abs(Math.cos(e.kinematics.pitch)) * .5) {
	let { kinematics: i, status: a } = e;
	i.altitude > r || i.speedY < -.5 || e.failures.crashed || a.landed || (a.onTheGround = t <= sn(i.distanceToPlanetCenter), a.onTheGround && (i.speedX = 0, i.speedY = 0, i.angularVelocity = 0));
}
function Ss(e, t, n) {
	let { kinematics: r, forces: i, failures: a, vehicle: o, engines: s } = e;
	(i.perceivedG > 13 || i.surfaceTemperature > 1533 || i.dynamicPressure > 50 || e.damage !== null && (e.damage.terminal.active || !e.damage.hull.valid)) && (ea(e, t, ta(e), e.world.environmentTime), a.inFlightBreakUp = !0, r.angularVelocity = 0, o.propellantMass = 0, e.damage || (o.vehicleMass = t.dryMass, Un(0, n.massProperties, t), o.vehicleMomentOfInertia = n.massProperties.momentOfInertia), s.running.fill(!1), s.ignitionCountdown.fill(null), o.rcsRunTimeRemaining = 0, i.rcsThrust = 0);
}
function Cs(e) {
	e.vehicle.propellantMass <= 0 && (e.failures.fuelRunOut = !0);
}
function ws(e, t, n) {
	let { forces: r } = e;
	r.perceivedG_Y = n / C, r.perceivedG_X = t / C, r.perceivedG = Math.sqrt(r.perceivedG_Y ** 2 + r.perceivedG_X ** 2);
}
function Ts(e, t, n, r) {
	let { massProperties: i, gridFinForces: a } = r, o = It(e.kinematics.speedX, e.kinematics.speedY, O(e.world, e.kinematics.altitude), e.world.gustVertical);
	e.world.updatedFrameCount += 1;
	let s = Ct(e.kinematics.altitude);
	if (e.atmosphere.airTemperature = s.airTemperature, e.atmosphere.airPressure = s.airPressure, e.atmosphere.airDensity = s.airDensity, bs(e, n), e.damage?.terminal.active) {
		$i(e), r.bodyAccelerationX = r.bodyAccelerationY = r.burnedFraction = r.gimballedThrust = 0;
		return;
	}
	Cs(e);
	let c = Fo(e, t, n);
	Vo(e), e.vehicle.propellantMass <= 0 && e.engines.ignitionCountdown.fill(null), zo(e, t);
	let l = Wt(e.vehicle.frontFinExtension, e.vehicle.aftFinExtension, n);
	e.forces.frontFinEffectiveAreaFraction = l.frontFinEffectiveAreaFraction, e.forces.aftFinEffectiveAreaFraction = l.aftFinEffectiveAreaFraction, e.vehicle.vehicleInFlightMaxArea = l.vehicleInFlightMaxArea, e.forces.crossSectionalArea = Ot(e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea, n), e.kinematics.angleOfMotion = Ft(e.kinematics.speedX, e.kinematics.speedY);
	let d = Lt(e.kinematics.speedX, e.kinematics.speedY, O(e.world, e.kinematics.altitude), e.world.gustVertical), f = Rt(e.kinematics.pitch, d);
	e.kinematics.angleOfAttack = f.angleOfAttack, e.kinematics.angleInToTheWind = f.angleInToTheWind, e.vehicle.gimbalPointingDirection = No(e.kinematics.pitch, e.vehicle.gimbalPosition), e.forces.thermalPower = Ki(o, e.atmosphere.airDensity, n.diameter / 2, e.kinematics.angleInToTheWind), e.forces.surfaceTemperature = qi(e.forces.thermalPower, Yi(e.kinematics.altitude, e.atmosphere.airTemperature)), e.forces.dynamicPressure = Dt(e.atmosphere.airDensity, o), e.damage && (oa(e, n, e.forces.dynamicPressure * 1e3, Math.abs(Math.sin(e.kinematics.angleInToTheWind))), e.forces.crossSectionalArea = Ot(e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea, n)), vs(e, t), e.forces.aerodynamicDrag = kt(e.atmosphere.airDensity, o, e.forces.crossSectionalArea, Mt(e.kinematics.machSpeed)), e.forces.aerodynamicLift = jt(e.atmosphere.airDensity, o, e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea), e.forces.thrust = ko(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, n) * c, e.forces.aerodynamicDragAcceleration = Nt(e.forces.aerodynamicDrag, e.vehicle.vehicleMass), e.forces.aerodynamicLiftAcceleration = Nt(e.forces.aerodynamicLift, e.vehicle.vehicleMass), e.forces.thrustAcceleration = Nt(e.forces.thrust, e.vehicle.vehicleMass), e.forces.twr = e.forces.thrustAcceleration / u;
	let p = Ao(e.engines.running, e.atmosphere.airPressure, n), m = e.forces.thrust * p;
	e.damage && (e.forces.paidThrustAccelerationX = e.forces.thrustAcceleration * (p * Math.sin(e.vehicle.gimbalPointingDirection) + (1 - p) * Math.sin(e.kinematics.pitch)), e.forces.paidThrustAccelerationY = e.forces.thrustAcceleration * (p * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - p) * Math.cos(e.kinematics.pitch)));
	let h = e.forces.thrust - m, g = {
		angleOfMotion: d,
		angleOfAttack: e.kinematics.angleOfAttack,
		gimbalPointingDirection: e.vehicle.gimbalPointingDirection,
		aerodynamicDragAcceleration: e.forces.aerodynamicDragAcceleration,
		aerodynamicLiftAcceleration: e.forces.aerodynamicLiftAcceleration,
		thrustAcceleration: Nt(m, e.vehicle.vehicleMass),
		fixedThrustAcceleration: Nt(h, e.vehicle.vehicleMass),
		pitch: e.kinematics.pitch
	};
	n.gridFins && (ra(e, n, i), sa(e, e.atmosphere.airDensity, e.kinematics.speedX - O(e.world, e.kinematics.altitude), e.kinematics.speedY - e.world.gustVertical, e.kinematics.pitch, i, n, a));
	let _ = n.gridFins ? en(g) + a.forceX / e.vehicle.vehicleMass : en(g), v = n.gridFins ? tn(g, u) + u + a.forceY / e.vehicle.vehicleMass : tn(g, u) + u;
	r.bodyAccelerationX = _, r.bodyAccelerationY = v, r.burnedFraction = c, r.gimballedThrust = m;
}
function Es(e, t, n, r, i, a) {
	xs(e, r, i, a);
	let s = e.kinematics.distanceToPlanetCenter, c = e.kinematics.speedX, l = e.kinematics.speedY, u = n + un(s, c, l), d = r + D(s, c), f = (e.status.onTheGround || e.status.landed || e.failures.crashed) && d <= 0;
	f && (u = 0, d = 0), ws(e, f ? -un(s, c, l) : n, f ? -D(s, c) : r);
	let p = .5 * t * t;
	e.kinematics.altitude += l * t + d * p, e.kinematics.downRangeDistanceNextFrame = e.kinematics.downRangeDistance + c * t + u * p, e.kinematics.downRangeDistanceNextFrame > o ? e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame - o : e.kinematics.downRangeDistanceNextFrame < 0 ? e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame + o : e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame, ys(e);
	let m = e.kinematics.distanceToPlanetCenter, h = c + u * t, g = l + d * t, _ = f ? 0 : n + un(m, h, g), v = f ? 0 : r + D(m, h);
	return e.kinematics.speedX = c + .5 * (u + _) * t, e.kinematics.speedY = l + .5 * (d + v) * t, e.kinematics.accelerationX = _, e.kinematics.accelerationY = v, e.kinematics.totalAcceleration = Math.sqrt(_ ** 2 + v ** 2), e.kinematics.trueSpeed = Math.sqrt(e.kinematics.speedX ** 2 + e.kinematics.speedY ** 2), f;
}
function Ds(e, t, n) {
	let r = It(e.kinematics.speedX, e.kinematics.speedY, O(e.world, e.kinematics.altitude), e.world.gustVertical);
	e.kinematics.machSpeed = r / Et(e.atmosphere.airTemperature), In(e.world, e.rng, e.kinematics.altitude, e.kinematics.speedX, e.kinematics.speedY, t), n.airspeed = r;
}
function Os(t, n, r, i) {
	let a = .5 * n * n;
	t.kinematics.pitch > Math.PI ? t.kinematics.pitch = e(t.kinematics.pitch - 2 * Math.PI) : t.kinematics.pitch < -Math.PI && (t.kinematics.pitch = e(t.kinematics.pitch + 2 * Math.PI));
	let o = t.kinematics.angularVelocity, s = r ? 0 : t.kinematics.angularAcceleration;
	t.kinematics.pitch = e(t.kinematics.pitch + o * n + s * a), t.kinematics.angularVelocity = o + s * n, i.omega0 = o, i.alpha0 = s;
}
function ks(t, n, r) {
	let { massProperties: i, gridFinForces: a, gimballedThrust: o, burnedFraction: s, airspeed: c } = r;
	t.forces.thrustVectorForce = jo(o, t.vehicle.gimbalPosition), t.forces.frontFinDrag = Ht(t.atmosphere.airDensity, c, t.kinematics.angleOfAttack, t.kinematics.angleInToTheWind, t.forces.frontFinEffectiveAreaFraction, n), t.forces.aftFinDrag = Ut(t.atmosphere.airDensity, c, t.kinematics.angleOfAttack, t.kinematics.angleInToTheWind, t.forces.aftFinEffectiveAreaFraction, n);
	let l = t.vehicle.vehicleMomentOfInertia;
	if (t.forces.thrustVectorAcceleration = Pt(t.forces.thrustVectorForce, i.engineArm, l), t.forces.angularDragAcceleration = Vt(t.atmosphere.airDensity, t.kinematics.angularVelocity, l, i.rCubedIntegral, n), t.forces.frontFinDragAngularAcceleration = Pt(t.forces.frontFinDrag, i.frontFinArm, l), t.forces.aftFinDragAngularAcceleration = Pt(t.forces.aftFinDrag, i.aftFinArm, l), t.forces.rcsThrustAngularAcceleration = Pt(t.forces.rcsThrust, i.rcsArm, l), t.forces.offAxisThrustDifferenceAcceleration = Pt(Mo(t.engines.running, t.vehicle.throttleCurrent, t.atmosphere.airPressure, n), i.engineArm, l), n.gridFins && (sa(t, t.atmosphere.airDensity, t.kinematics.speedX - O(t.world, t.kinematics.altitude), t.kinematics.speedY - t.world.gustVertical, t.kinematics.pitch, i, n, a), t.forces.frontFinDrag = a.lift, t.forces.frontFinDragAngularAcceleration = a.torque / l, t.forces.offAxisThrustDifferenceAcceleration = Ho(t.engines.running, t.vehicle.throttleCurrent, t.atmosphere.airPressure, e(t.vehicle.gimbalPosition * .01 * S), n) * s / l), t.damage) {
		let r = t.vehicle.gimbalPosition * .01 * S, a = o * Math.cos(r) + t.forces.thrust - o;
		t.forces.offAxisThrustDifferenceAcceleration = (Ho(t.engines.running, t.vehicle.throttleCurrent, t.atmosphere.airPressure, e(r), n) * s + i.centreOfMassX * a) / l;
	}
	return t.forces.thrustVectorAcceleration + t.forces.angularDragAcceleration + t.forces.frontFinDragAngularAcceleration + t.forces.aftFinDragAngularAcceleration + t.forces.rcsThrustAngularAcceleration + t.forces.offAxisThrustDifferenceAcceleration;
}
function As(e, t, n, r, i, a) {
	e.kinematics.angularVelocity = n ? 0 : r + .5 * (i + a) * t, e.kinematics.angularAcceleration = n ? 0 : a;
}
function js(e, t, n, r, i) {
	ra(e, n, r.massProperties), e.vehicle.vehicleMomentOfInertia = r.massProperties.momentOfInertia, Os(e, t, i, r);
	let a = ks(e, n, r);
	As(e, t, i, r.omega0, r.alpha0, a);
}
//#endregion
//#region src/core/control/primitives.ts
var Ms = Wn(), W = P(), Ns = Ni(12), Ps = Gn();
function Fs(e, t) {
	let n = e - t;
	return n < -Math.PI ? n = Math.PI * 2 + n : n > Math.PI && (n = -(Math.PI * 2 - n)), n;
}
function Is(e, t, n, r = t, i = E) {
	let a = H(e, n, i), o = Ao(e, n, i);
	return o === 1 ? a * Math.cos(t) : a * o * Math.cos(t) + a * (1 - o) * Math.cos(r);
}
function Ls(e) {
	return Math.sqrt(35 / e * 2e3);
}
function G(t, n, r, i = E) {
	let { kinematics: a, forces: o, status: s, vehicle: c, autopilot: l } = t, u = Fs(a.pitch, n);
	t.damage ? F(t, i, W, Ms) : Un(c.propellantMass, Ms, i);
	let d = !t.damage || W.engineSupportAvailable, f = (-u / r ** 2 - 2 * a.angularVelocity / r - (d ? o.offAxisThrustDifferenceAcceleration : 0)) * (t.damage ? W.momentOfInertia : c.vehicleMomentOfInertia), p = 0, m = () => {
		if (Math.abs(u) > .1) {
			let e = f / Ms.rcsArm;
			e > 0 ? e > 8e5 ? p = 100 : l.rcsThrustCommand = e : e < 0 ? e < -8e5 ? p = -100 : l.rcsThrustCommand = e : p = 0, l.pitchControl = p;
		}
	}, h = d ? o.thrust * Ao(t.engines.running, t.atmosphere.airPressure, i) : 0;
	h > 0 ? (() => {
		let e = f / Ms.engineArm / h;
		e >= 1 ? p = 100 : e <= -1 ? p = -100 : (p = Math.asin(e) * 100 / S, p >= 100 ? p = 100 : p <= -100 && (p = -100)), s.rcsActive && (p *= .98), l.pitchControl = p;
	})() : s.finActive ? (() => {
		let n = It(a.speedX, a.speedY, O(t.world, a.altitude), t.world.gustVertical);
		if (t.damage) {
			let r = 0, o = 0, c = .5 * t.atmosphere.airDensity * n ** 2;
			if (i.gridFins) for (let n = -1; n <= 1; n += 2) sa(t, t.atmosphere.airDensity, a.speedX - O(t.world, a.altitude), a.speedY - t.world.gustVertical, a.pitch, Ms, i, Ps, e(n * i.gridFins.maxAngle)), Ps.torque * f > 0 && Math.abs(Ps.torque) > Math.abs(r) && (r = Ps.torque, o = n * 100);
			else {
				let e = Math.abs(Math.sin(a.angleInToTheWind)), n = a.angleOfAttack < 0 ? -1 : 1;
				for (let a = 0; a < 2; a++) {
					let s = a === 0;
					Fi(t.damage, N(i).controls, c, e, s ? ie : 0, s ? 0 : ie, Ns);
					let l = c * 2 * e * n * (Ns.frontArea * Ms.frontFinArm - Ns.aftArea * Ms.aftFinArm);
					l * f > 0 && Math.abs(l) > Math.abs(r) && (r = l, o = (s ? n : -n) * 100);
				}
			}
			p = r === 0 ? 0 : o * Math.min(1, Math.abs(f / r)), s.rcsActive && (p *= .99, m()), l.pitchControl = p;
			return;
		}
		if (f > 0) {
			let e = kt(t.atmosphere.airDensity, n, i.frontFinArea, 2) * Math.sin(ie) * Ms.frontFinArm + kt(t.atmosphere.airDensity, n, i.aftFinArea, 2) * Ms.aftFinArm;
			p = f / e * 100, p >= 100 && (p = 100);
		} else if (f < 0) {
			let e = kt(t.atmosphere.airDensity, n, i.aftFinArea, 2) * Math.sin(ie) * Ms.aftFinArm + kt(t.atmosphere.airDensity, n, i.frontFinArea, 2) * Ms.frontFinArm;
			p = f / e * 100, p <= -100 && (p = -100);
		} else p = 0;
		s.rcsActive && (p *= .99, m()), l.pitchControl = p;
	})() : m();
}
function Rs(e, t, n = E) {
	zs(e, t * da(e), n);
}
function zs(e, t, n = E) {
	let { vehicle: r, engines: i } = e;
	e.damage && F(e, n, W);
	let a = !e.damage || W.engineSupportAvailable, o = t * (e.damage ? W.totalMass : r.vehicleMass) / (a ? H(i.running, e.atmosphere.airPressure, n) : 0) * 100;
	Number.isNaN(o) && (o = 40), o > 100 ? o = 100 : o < 40 && (o = 40), r.throttle = o;
}
function Bs(e, t, n = E) {
	let { vehicle: r, engines: i } = e;
	e.damage && F(e, n, W);
	let a = !e.damage || W.engineSupportAvailable, o = t * (e.damage ? W.totalMass : r.vehicleMass) * da(e) / (a ? Is(i.running, r.gimbalPointingDirection, e.atmosphere.airPressure, e.kinematics.pitch, n) : 0) * 100;
	Number.isNaN(o) && (o = 40), o > 100 ? o = 100 : o < 40 && (o = 40), r.throttle = o;
}
function Vs(t, n, r, i, a) {
	let o = t.kinematics.speedX - n;
	o < 0 ? (G(t, r, a), -o < i && G(t, e(r * -o / i), a)) : (G(t, e(-r), a), o < i && G(t, e(-r * o / i), a));
}
function Hs(e, t, n, r) {
	let i = e.kinematics.speedY - t;
	i < 0 ? (Bs(e, r), -i < n && Bs(e, 1 - i / n)) : (Bs(e, 0), i < n && Bs(e, 1 - i / n));
}
function Us(e, t, n, r, i = E) {
	let a = t - e.kinematics.trueSpeed;
	a < 0 ? Rs(e, 0, i) : (Rs(e, r, i), a < n && Rs(e, 1 + a / n, i));
}
function Ws(e, t, n) {
	return e / (t * n);
}
function Gs(t, n, r, i) {
	let { status: a, kinematics: o, autopilot: s } = t;
	a.finActive || i(t), s.horizontalAccelerationByAeroBreakingCorrectionAngle = Math.abs(o.accelerationX) > Math.abs(n) ? e(s.horizontalAccelerationByAeroBreakingCorrectionAngle - De * r) : e(s.horizontalAccelerationByAeroBreakingCorrectionAngle + De * r), s.horizontalAccelerationByAeroBreakingCorrectionAngle > Ee ? s.horizontalAccelerationByAeroBreakingCorrectionAngle = Ee : s.horizontalAccelerationByAeroBreakingCorrectionAngle < 0 && (s.horizontalAccelerationByAeroBreakingCorrectionAngle = e(0)), n < 0 ? G(t, e(s.horizontalAccelerationByAeroBreakingCorrectionAngle - Math.PI / 2), 1.5) : G(t, e(-s.horizontalAccelerationByAeroBreakingCorrectionAngle + Math.PI / 2), 1.5);
}
function Ks(e, t, n = E) {
	let { engines: r } = e;
	if (F(e, n, W), !W.engineSupportAvailable || !W.hasMass) return;
	let i = r.running;
	if (Ws(Oo(i, e.atmosphere.airPressure, n), W.totalMass, da(e)) > 1) {
		let r = Eo(i, n);
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
function qs() {
	return {
		x: 0,
		altitude: 0,
		speedX: 0,
		speedY: 0
	};
}
function Js(e, t, n) {
	let r = e.kinematics, i = B.lugStation - t.height / 2;
	n.x = r.downRangeDistance + i * Math.sin(r.pitch), n.altitude = r.altitude + i * Math.cos(r.pitch), n.speedX = r.speedX + i * Math.cos(r.pitch) * r.angularVelocity, n.speedY = r.speedY - i * Math.sin(r.pitch) * r.angularVelocity;
}
var Ys = qs(), Xs = qs(), K = {
	fraction: 0,
	pitch: 0,
	x: 0,
	speedX: 0,
	speedY: 0
};
function Zs(e, t, n) {
	if (n.id !== "super-heavy" || t.status.landed) return !1;
	let r = t.failures;
	if (r.crashed || r.inFlightBreakUp || r.fuelRunOut) return !1;
	let i = t.kinematics, a = n.height * Math.abs(Math.cos(i.pitch)) / 2 + n.diameter * Math.abs(Math.sin(i.pitch)) / 2;
	if (i.altitude <= a || (Js(e, n, Ys), Js(t, n, Xs), !(Ys.altitude > B.planeAltitude && Xs.altitude <= B.planeAltitude))) return !1;
	let o = (Ys.altitude - B.planeAltitude) / (Ys.altitude - Xs.altitude), s = e.kinematics, c = Math.atan2(Math.sin(i.pitch - s.pitch), Math.cos(i.pitch - s.pitch));
	return K.fraction = o, K.pitch = s.pitch + c * o, K.x = s.downRangeDistance + (i.downRangeDistance - s.downRangeDistance) * o + (B.lugStation - n.height / 2) * Math.sin(K.pitch), K.speedX = Ys.speedX + (Xs.speedX - Ys.speedX) * o, K.speedY = Ys.speedY + (Xs.speedY - Ys.speedY) * o, Number.isFinite(K.x) && Number.isFinite(K.pitch) && Number.isFinite(K.speedX) && Number.isFinite(K.speedY) && Math.abs(K.x - d) <= B.halfWidth && Math.abs(K.speedX) <= B.maxLateralSpeed && K.speedY < 0 && K.speedY >= -B.maxDownSpeed && Math.abs(K.pitch) <= B.maxPitch;
}
function Qs(t, n, r) {
	if (!Zs(t, n, r)) return !1;
	let i = n.kinematics, o = t.kinematics;
	return i.downRangeDistance = o.downRangeDistance + (i.downRangeDistance - o.downRangeDistance) * K.fraction, i.downRangeDistanceNextFrame = i.downRangeDistance, i.pitch = e(K.pitch), i.altitude = B.planeAltitude - (B.lugStation - r.height / 2) * Math.cos(i.pitch), i.distanceToPlanetCenter = a + i.altitude, i.speedX = i.speedY = i.trueSpeed = i.angularVelocity = 0, i.accelerationX = i.accelerationY = i.totalAcceleration = i.angularAcceleration = 0, n.status.landed = !0, n.status.onTheGround = !1, n.engines.running.fill(!1), n.engines.ignitionCountdown.fill(null), n.forces.thrust = n.forces.thrustAcceleration = n.forces.twr = n.forces.rcsThrust = 0, n.autopilot.pitchControl = n.autopilot.rcsThrustCommand = 0, !0;
}
//#endregion
//#region src/core/control/booster-arrival.ts
var q = P(), $s = .3;
function ec() {
	return {
		pitch: e(0),
		throttle: 100,
		requiredX: 0,
		requiredY: 0,
		deliveredX: 0,
		deliveredY: 0
	};
}
function tc(t, n, r, i, a) {
	F(t, i, q);
	let o = t.kinematics, s = q.totalMass;
	if (!q.hasMass) {
		a.pitch = e(0), a.throttle = 100, a.requiredX = a.requiredY = a.deliveredX = a.deliveredY = 0;
		return;
	}
	let c = Ao(t.engines.running, t.atmosphere.airPressure, i), l = t.forces.thrust / s, u = t.damage ? t.forces.paidThrustAccelerationX : l * (c * Math.sin(t.vehicle.gimbalPointingDirection) + (1 - c) * Math.sin(o.pitch)), d = t.damage ? t.forces.paidThrustAccelerationY : l * (c * Math.cos(t.vehicle.gimbalPointingDirection) + (1 - c) * Math.cos(o.pitch));
	a.requiredX = n - (o.accelerationX - u), a.requiredY = r - (o.accelerationY - d), a.pitch = e(Math.max(-.3, Math.min($s, Math.atan2(a.requiredX, Math.max(0, a.requiredY)))));
	let f = Math.max(0, a.requiredY) / Math.cos(a.pitch), p = q.engineSupportAvailable ? H(t.engines.running, t.atmosphere.airPressure, i) / s : 0;
	a.throttle = p > 0 ? Math.max(40, Math.min(100, 100 * f / p)) : 100, a.deliveredX = p * a.throttle * .01 * Math.sin(a.pitch), a.deliveredY = p * a.throttle * .01 * Math.cos(a.pitch);
}
var nc = pa(), J = ec();
function rc(t, n, r, i, a, o) {
	return Ma(t, e(o), i, nc), J.requiredX = n - nc.acc.x, J.requiredY = r - nc.acc.y, J.pitch = e(o), J.throttle = a > 0 ? Math.max(40, Math.min(100, 100 * Math.max(0, J.requiredY) / (a * Math.cos(o)))) : 100, J.deliveredX = a * J.throttle * .01 * Math.sin(o), J.deliveredY = a * J.throttle * .01 * Math.cos(o), J.deliveredX - J.requiredX;
}
function ic(e, t) {
	let n = (J.deliveredX - J.requiredX) ** 2 + (J.deliveredY - J.requiredY) ** 2;
	return n >= t ? t : (Object.assign(e, J), n);
}
function ac(e, t, n, r, i, a = $s) {
	F(e, r, q);
	let o = q.engineSupportAvailable && q.hasMass ? H(e.engines.running, e.atmosphere.airPressure, r) / q.totalMass : 0, s = Math.max(0, Math.min($s, a)), c = -s, l = rc(e, t, n, r, o, c), u = ic(i, Infinity);
	for (let a = 1; a <= 16; a++) {
		let d = -s + 2 * s * a / 16, f = rc(e, t, n, r, o, d);
		if (u = ic(i, u), l * f < 0) {
			let a = c, s = d, f = l;
			for (let c = 0; c < 12; c++) {
				let c = (a + s) / 2, l = rc(e, t, n, r, o, c);
				u = ic(i, u), f * l <= 0 ? s = c : (a = c, f = l);
			}
		}
		c = d, l = f;
	}
}
function oc(e, t, n) {
	if (F(e, n, q), !q.engineSupportAvailable || !q.hasMass) return 100;
	let r = Ao(e.engines.running, e.atmosphere.airPressure, n), i = r * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - r) * Math.cos(e.kinematics.pitch), a = e.damage ? e.forces.paidThrustAccelerationY : e.forces.thrust / q.totalMass * i, o = e.kinematics.accelerationY - a;
	F(e, n, q);
	let s = q.engineSupportAvailable && q.hasMass ? H(e.engines.running, e.atmosphere.airPressure, n) / q.totalMass : 0;
	return s <= 0 || i <= 0 ? 100 : Math.max(40, Math.min(100, 100 * Math.max(0, t - o) / (s * i)));
}
function sc() {
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
var cc = qs(), lc = Object.freeze([
	!0,
	!0,
	!0
]), uc = ec();
function dc(e, t, n, r) {
	F(e, n, q);
	let i = q.engineSupportAvailable && q.hasMass && lc.every((t, n) => !e.engines.failed[n]), o = q.totalMass;
	Js(e, n, cc), r.x = cc.x - d, r.height = cc.altitude - B.planeAltitude, r.vx = cc.speedX, r.vy = cc.speedY;
	let s = e.autopilot;
	if (s.boosterArrivalTime === void 0) {
		let e = Math.max(0, r.height), t = Math.max(0, -r.vy), c = 2 * e / (t + 2), l = (i ? H(lc, w / 1e3, n) / o : 0) + D(a + B.bodyCentreAltitude, 0), u = l > 0 ? 6 * e / (Math.sqrt((t + 4) ** 2 + 6 * l * e) + t + 4) : 60;
		s.boosterArrivalTime = Math.max(.5, Math.min(60, Math.max(c, u)));
	}
	s.boosterArrivalTime = Math.max(0, s.boosterArrivalTime - t), r.time = Math.max(.25, s.boosterArrivalTime), r.ax = -6 * r.x / r.time ** 2 - 4 * r.vx / r.time, r.ay = -6 * r.height / r.time ** 2 - 4 * r.vy / r.time + 4 / r.time;
	let c = e.kinematics, l = B.lugStation - n.height / 2;
	r.bodyAX = r.ax - l * (Math.cos(c.pitch) * c.angularAcceleration - Math.sin(c.pitch) * c.angularVelocity ** 2), r.bodyAY = r.ay + l * (Math.sin(c.pitch) * c.angularAcceleration + Math.cos(c.pitch) * c.angularVelocity ** 2), r.centreAX = -6 * (c.downRangeDistance - d) / r.time ** 2 - 4 * c.speedX / r.time, r.centreAY = -6 * (c.altitude - B.bodyCentreAltitude) / r.time ** 2 - 4 * c.speedY / r.time + 4 / r.time;
	let u = i ? H(lc, e.atmosphere.airPressure, n) / o * Math.sin($s) : 0;
	tc(e, r.ax, r.ay, n, uc);
	let f = uc.requiredX;
	tc(e, 6 * r.x / r.time ** 2 + 2 * r.vx / r.time, 6 * r.height / r.time ** 2 + 2 * r.vy / r.time - 8 / r.time, n, uc), r.lateralFeasible = i && Number.isFinite(f) && Number.isFinite(uc.requiredX) && Math.abs(f) <= u && Math.abs(uc.requiredX) <= u;
}
//#endregion
//#region src/core/control/booster-forecast.ts
function fc() {
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
var pc = qs(), mc = qs(), hc = sc();
function Y(e) {
	let t = e * 120, n = Math.round(t);
	return e === n / 120 ? n : Math.ceil(t);
}
function gc(e) {
	return Y(e) / 120;
}
function _c(e, t) {
	return Math.max(0, Y(e) - t.boostSteps - 6 * t.steadySteps) / 120;
}
function vc(e, t, n = 0) {
	let r = V(e);
	if (delete r.autopilot.boosterPrediction, delete r.autopilot.boosterForecastHandoff, r.autopilot.boosterPhase === "align-boost" || r.autopilot.boosterPhase === "boostback" && n <= 0 || !r.autopilot.boosterPhase) {
		r.autopilot.boosterPhase = "coast";
		for (let e = 0; e < r.engines.running.length; e++) Bo(r, e);
	}
	return r.autopilot.boosterCoastPitch = t, {
		state: r,
		initialTime: r.autopilot.boosterFallTime ?? 900,
		initialDraws: r.rng.counters.ignitionFailure,
		burnRemaining: gc(n),
		burnTicks: Y(n),
		cutoffClock: r.world.environmentTime,
		done: !1,
		result: fc()
	};
}
function yc(e, t, n, r, i, a) {
	let o = e.result, s = e.state, c = 0, l = e.reusePrefix, u = e.burnRemaining;
	l && (u = _c(u, l)), l && l.origin === e.origin && l.advance === n && l.policy === r && l.model === i && e.step === void 0 && e.initialTime === l.initialTime && s.autopilot.boosterCoastPitch === l.coastPitch && u > 0 && o.steps === 0 && (s = V(l.state), s.autopilot.boosterForecastBurn = !0, o.time = l.time, o.steps = l.steps, e.prefix = l, e.burnRemaining = u, e.burnTicks = Math.round(u * 120), e.cutoffClock = l.cutoffClock, e.boostSteps = l.boostSteps, e.steadySteps = l.steadySteps), delete e.reusePrefix;
	for (let l = 0; l < t && !e.done; l++) {
		Js(s, i, pc);
		let t = s.autopilot.boosterPhase, l = t === "align-boost" || t === "boostback" || t === "entry" || t === "terminal", u = t === "boostback" && !Ra.every((e) => s.engines.running[e]), f = u || t === "entry" && !(s.autopilot.boosterEntryCentreOnly ? z : Ra).every((e) => s.engines.running[e]) || t === "terminal" && !z.every((e) => s.engines.running[e]), p = t === "align-boost" || f || t === "terminal" && s.autopilot.boosterArrivalTime === void 0 ? 1 / 120 : e.step ?? (e.stopAtHandoff && l || s.kinematics.altitude < 2e3 ? .05 : .25), m = t === "boostback" || !e.stopAtHandoff && e.burnRemaining > 0, h = m && e.burnTicks > 0 ? e.burnTicks < 6 ? 1 / 120 : Math.min(p, .05) : p;
		e.burnRemaining > 0 && (s.autopilot.boosterForecastBurn = !0), s.autopilot.boosterFallTime = Math.max(2, e.initialTime - o.time);
		let g = a?.eligible(s, h), _ = g ? V(s) : void 0, v;
		if (s = n(s, h, g ? (e, t, n) => {
			v = V(e), r(e, t, n);
		} : r, i), o.steps++, c++, _ && a.paid(_, v, s, h), u && (e.boostSteps = (e.boostSteps ?? 0) + 1), t === "boostback" && !u && h === .05 && (e.steadySteps = (e.steadySteps ?? 0) + 1), t === "align-boost" || m) for (let t = 0; t < Math.round(h * 120); t++) e.cutoffClock += 1 / 120;
		if (m && e.burnTicks > 0 && (e.burnTicks = Math.max(0, e.burnTicks - Math.round(h * 120)), e.burnRemaining = e.burnTicks / 120), e.readyHandoff && e.step === void 0 && e.origin && (t === "align-boost" && s.autopilot.boosterPhase === "boostback" || u && e.burnRemaining > 0 && Ra.every((e) => s.engines.running[e]) || t === "boostback" && !u && h === .05)) {
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
			t > 0 && (e.rollingPrefixes = Cc(e.rollingPrefixes, [e.prefix])), t > 0 && !(t & t - 1) && !(e.checkpoints ?? []).some((e) => e.steadySteps === t) && (e.checkpoints = [...e.checkpoints ?? [], e.prefix]);
		}
		if ((m || e.stopAtHandoff && s.autopilot.boosterPhase === "boostback") && e.burnRemaining === 0) {
			delete s.autopilot.boosterForecastBurn, s.autopilot.boosterPhase = "coast";
			for (let e = 0; e < s.engines.running.length; e++) Bo(s, e);
			e.shutdownAt = e.cutoffClock, e.stopAtCutoff && (e.done = !0);
		}
		Js(s, i, mc);
		let y = pc.altitude > B.planeAltitude && mc.altitude <= B.planeAltitude;
		if (o.time += h, e.stopAtHandoff && s.autopilot.boosterPhase === "terminal" && (!e.readyHandoff || t === "terminal" && z.every((e) => s.engines.running[e]))) {
			let t = s.autopilot.boosterArrivalTime;
			dc(s, 0, i, hc), t === void 0 ? delete s.autopilot.boosterArrivalTime : s.autopilot.boosterArrivalTime = t, o.handoff = {
				x: hc.x,
				height: hc.height,
				vx: hc.vx,
				vy: hc.vy,
				time: hc.time,
				lateralFeasible: hc.lateralFeasible
			}, o.rangeError = s.kinematics.downRangeDistance - d + s.kinematics.speedX * hc.time / 3, o.speedX = hc.vx, o.speedY = hc.vy, o.reached = !0, e.done = !0;
		} else if (y) {
			let t = (pc.altitude - B.planeAltitude) / (pc.altitude - mc.altitude);
			o.rangeError = pc.x + (mc.x - pc.x) * t - d, o.time -= h * (1 - t), o.speedX = pc.speedX + (mc.speedX - pc.speedX) * t, o.speedY = pc.speedY + (mc.speedY - pc.speedY) * t, o.reached = !0, e.done = !0;
		}
		(s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp || o.time >= 900 || o.steps >= 4e3) && (e.done = !0);
	}
	return o.reached || (o.rangeError = mc.x - d, o.speedX = mc.speedX, o.speedY = mc.speedY), o.fuel = s.vehicle.propellantMass, o.pitch = s.kinematics.pitch, o.ignitionDraws = s.rng.counters.ignitionFailure - e.initialDraws, o.failed = s.failures.crashed || s.failures.inFlightBreakUp || s.failures.fuelRunOut, e.state = s, c;
}
function bc(e, t, n, r) {
	let i = vc(e, t, n);
	if (i.state = V(e), delete i.state.autopilot.boosterPrediction, i.state.autopilot.boosterPhase || (i.state.autopilot.boosterPhase = "align-boost"), i.state.autopilot.boosterPhase === "boostback" && n <= 0) {
		i.state.autopilot.boosterPhase = "coast";
		for (let e = 0; e < i.state.engines.running.length; e++) Bo(i.state, e);
		i.shutdownAt = e.world.environmentTime;
	}
	return delete i.state.autopilot.boosterReturnPlan, i.state.autopilot.boosterCoastPitch = t, i.stopAtHandoff = !0, r !== void 0 && (i.step = r), i;
}
function xc(e, t, n, r, i) {
	let a = bc(e, t, n, r);
	return a.readyHandoff = !0, a.origin = e, i && (a.reusePrefix = i), a;
}
function Sc(e, t, n, r) {
	let i = xc(e, t, n, void 0, r);
	return i.stopAtCutoff = !0, i;
}
function Cc(e, t) {
	let n = [...e ?? []], r = n[0] ?? t[0];
	for (let e of t) !r || e.steadySteps <= 0 || e.origin !== r.origin || e.advance !== r.advance || e.policy !== r.policy || e.model !== r.model || e.coastPitch !== r.coastPitch || e.initialTime !== r.initialTime || e.boostSteps !== r.boostSteps || n.some((t) => t.steadySteps === e.steadySteps) || n.push(e);
	return n.sort((e, t) => e.steadySteps - t.steadySteps).slice(-8);
}
//#endregion
//#region src/core/control/booster-cutoff-hint.ts
function wc(e, t, n, r, i) {
	if (!e.forecast.reached || e.forecast.failed || e.forecast.fuel <= 0 || !e.forecast.handoff || t.origin !== n.origin || t.model !== n.model || t.origin.world.environmentTime !== e.originTime || t.origin.damage?.revision !== e.damageRevision || !Number.isFinite(t.range) || !Number.isFinite(n.range) || !(t.duration < e.burnDuration && n.duration > e.burnDuration)) return;
	let a = (n.range - t.range) / (n.duration - t.duration), o = e.burnDuration - e.forecast.rangeError / a;
	if (!Number.isFinite(a) || a === 0 || !Number.isFinite(o)) return;
	let s = gc(o);
	return s > r && s < i && s !== e.burnDuration ? s : void 0;
}
//#endregion
//#region src/core/control/booster-prediction.ts
var Tc = P(), Ec = pa(), Dc = 512, Oc = Object.freeze(Ra.map(() => !0));
function kc(t, n, r) {
	let i = V(t);
	delete i.autopilot.boosterPrediction;
	let a = Math.floor(120 * i.vehicle.propellantMass / (Ra.length * Oe(n.propulsion, "sea-level"))) / 120;
	F(i, n, Tc);
	let o = Ra.some((e) => i.engines.failed[e]) ? Oc.map((e, t) => e && !i.engines.failed[t]) : Oc, s = Tc.engineSupportAvailable && Tc.hasMass ? H(o, i.atmosphere.airPressure, n) / Tc.totalMass : 0, c = Math.abs(i.autopilot.boosterRangeError ?? 0) / (s * (i.autopilot.boosterFallTime ?? 0)), l = gc(Number.isFinite(c) && c > 0 && c < a ? Math.max(a / 4, c) : a / 4), u = i.autopilot.boosterPhase === "align-boost" || i.autopilot.boosterPhase === "boostback", d = u ? l : 0;
	return {
		...t.autopilot.boosterSource ? { sourceLineage: t.autopilot.boosterSource.lineageId } : {},
		origin: i,
		rollout: xc(i, e(0), d),
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
function Ac(t) {
	return {
		...t.sourceLineage === void 0 ? {} : { sourceLineage: t.sourceLineage },
		...t.origin.damage ? { damageRevision: t.origin.damage.revision } : {},
		originTime: t.origin.world.environmentTime,
		burnDuration: t.duration,
		shutdownAt: t.rollout.shutdownAt ?? t.origin.world.environmentTime,
		coastPitch: e(0),
		forecast: { ...t.rollout.result }
	};
}
function jc(e) {
	return e.forecast.reached && !e.forecast.failed && e.forecast.fuel > 0 && e.forecast.handoff !== void 0 && Number.isFinite(e.forecast.rangeError);
}
function Mc(t, n, r) {
	if (t.iterations >= 16) {
		Hc(t) || (t.done = !0);
		return;
	}
	let i = t.low?.burnDuration ?? t.lowerDuration, a = t.high?.burnDuration ?? t.upperDuration, o = Y(i) + 1, s = Y(a) - 1, c = Math.max(o, Math.min(s, Y(n))), l;
	for (let e = 0; e <= t.attemptedTicks.length && o <= s; e++) {
		for (let n of [c - e, c + e]) if (n >= o && n <= s && !t.attemptedTicks.includes(n)) {
			l = n;
			break;
		}
		if (l !== void 0) break;
	}
	if (l === void 0) {
		Hc(t) || (t.done = !0);
		return;
	}
	let u = l / 120;
	t.attemptedTicks = [...t.attemptedTicks, l], t.duration = u, t.stage = r, t.iterations++;
	let d = Nc(t, u);
	t.rollout = xc(t.origin, e(0), u, void 0, d);
}
function Nc(e, t) {
	return [
		e.prefix,
		e.startupPrefix,
		...e.checkpoints ?? [],
		...e.rollingPrefixes ?? []
	].filter((e) => !!e && _c(t, e) > 0).sort((e, t) => t.steps - e.steps)[0];
}
function Pc(e) {
	e.rollingPrefixes = Cc(e.rollingPrefixes, e.rollout.rollingPrefixes ?? []), e.rollout.startupPrefix && (e.startupPrefix = e.rollout.startupPrefix), e.rollout.prefix && (!e.prefix || e.rollout.prefix.steadySteps < e.prefix.steadySteps) && (e.prefix = e.rollout.prefix);
	for (let t of e.rollout.checkpoints ?? []) (e.checkpoints ?? []).some((e) => e.steadySteps === t.steadySteps) || (e.checkpoints = [...e.checkpoints ?? [], t]);
}
function Fc(t, n) {
	t.hintTicks = [...t.hintTicks ?? [], Y(n)], t.iterations++, t.duration = n, t.stage = "hint", t.rollout = Sc(t.origin, e(0), n, Nc(t, n));
}
function Ic(e, t) {
	if (!e.rollout.prefix || e.rollout.shutdownAt === void 0 || e.hintTried || e.iterations + 2 > 16 || e.origin.autopilot.boosterPhase === "coast") return !1;
	e.hintTried = !0;
	let n = [(Y(t.burnDuration) - 6) / 120, (Y(t.burnDuration) + 6) / 120];
	return !n.some((t) => t <= e.lowerDuration || t >= e.upperDuration || e.attemptedTicks.includes(Y(t)) || (e.hintTicks ?? []).includes(Y(t))) && (e.hintAnchor = t, e.hintScores = [], e.hintDurations = n, Fc(e, n[0]), !0);
}
function Lc(t, n, r) {
	let i = 0;
	Pc(t);
	let a = t.rollout.state;
	if (!t.hintFallWork && t.rollout.shutdownAt !== void 0 && a.vehicle.propellantMass > 0 && !t.rollout.result.failed && !a.damage?.terminal.active && (t.hintFallWork = Fa(a, B.bodyCentreAltitude, n, e(0))), t.hintFallWork) {
		let e = Ia(t.hintFallWork, r, Ec);
		if (i = e, t.hintForceIterations = (t.hintForceIterations ?? 0) + e, e > 0 && (t.hintForceSlices = (t.hintForceSlices ?? 0) + 1), !t.hintFallWork.done) return i;
		let o = t.hintFallWork.result;
		o.reached && Number.isFinite(o.downRange) && (t.hintScores = [...t.hintScores ?? [], {
			duration: t.duration,
			range: a.kinematics.downRangeDistance - d + o.downRange,
			origin: t.origin,
			model: n
		}]), delete t.hintFallWork;
	}
	if (t.duration === t.hintDurations[0]) return Fc(t, t.hintDurations[1]), i;
	let o = t.hintScores ?? [], s = o.length === 2 ? wc(t.hintAnchor, o[0], o[1], t.lowerDuration, t.upperDuration) : void 0;
	return s === void 0 ? Wc(t) : Mc(t, s, "root"), i;
}
function Rc(e) {
	e.stage = "validate", e.rollout = vc(e.terminalOrigin, e.selected.coastPitch), e.rollout.step = 1 / 120;
}
function zc(e, t, n = e.rollout.state) {
	e.validatedTicks = [...e.validatedTicks ?? [], Y(t.burnDuration)], e.selected = t, e.terminalOrigin = V(n), Rc(e);
}
function Bc(e) {
	let t = e.forecast.handoff, n = t.time, r = 6 * t.x / n ** 2 + 2 * t.vx / n, i = 6 * t.height / n ** 2 + 2 * t.vy / n - 8 / n - D(a + B.bodyCentreAltitude, 0);
	return Math.atan2(r, Math.max(0, i));
}
function Vc(e) {
	return e.forecast.handoff.lateralFeasible && Math.abs(Bc(e)) <= B.maxPitch;
}
function Hc(e) {
	let t = [{
		candidate: e.low,
		ready: e.lowReady
	}, {
		candidate: e.high,
		ready: e.highReady
	}].filter((e) => !!e.candidate && !!e.ready).sort((e, t) => Math.abs(e.candidate.forecast.rangeError) - Math.abs(t.candidate.forecast.rangeError));
	for (let n of t) if (Vc(n.candidate) && !(e.validatedTicks ?? []).includes(Y(n.candidate.burnDuration))) return zc(e, n.candidate, n.ready), !0;
	return !1;
}
function Uc(e) {
	return e.status.landed && !e.status.onTheGround && e.vehicle.propellantMass > 0 && !Object.entries(e.failures).some(([e, t]) => e !== "randomFailure" && t);
}
function Wc(e) {
	if (e.iterations >= 16) {
		Hc(e) || (e.done = !0);
		return;
	}
	if (e.low && e.high) {
		let t = (e.previousCandidate && e.lastCandidate ? Yo(e.previousCandidate, e.lastCandidate, e.low, e.high) : void 0) ?? Ko(e.low, e.high);
		t === void 0 ? e.done = !0 : Mc(e, t, "root");
		return;
	}
	let t = e.low?.burnDuration ?? e.lowerDuration, n = e.high?.burnDuration ?? e.upperDuration, r = e.probeDuration ?? (e.low && !e.high && t === e.firstDuration ? Math.min((Y(t) + 1) / 120, n) : e.high && !e.low && n === e.firstDuration ? Math.max((Y(n) - 1) / 120, t) : (t + n) / 2);
	if (delete e.probeDuration, r <= t || r >= n) {
		let r = (t + n) / 2;
		r <= t || r >= n ? e.done = !0 : Mc(e, r, "upper");
	} else Mc(e, r, "upper");
}
function Gc(e) {
	let t = Ac(e);
	Pc(e), e.lastCandidate ? e.previousCandidate = e.lastCandidate : delete e.previousCandidate, e.lastCandidate = t;
	let n = Math.sign(e.origin.autopilot.boosterRangeError ?? e.origin.kinematics.downRangeDistance - d) || 1;
	if (e.stage === "low") {
		if (jc(t) && (e.low = t, e.lowReady = V(e.rollout.state), e.origin.autopilot.boosterPhase === "coast" || Vc(t))) {
			zc(e, t);
			return;
		}
		Mc(e, e.firstDuration, "upper");
		return;
	}
	if (jc(t)) {
		if (t.forecast.rangeError * n >= 0) {
			let n = e.low ? qo(e.low, t, e.upperDuration) : void 0;
			n !== void 0 && (e.probeDuration = n), e.low = t, e.lowReady = V(e.rollout.state);
		} else {
			let n = e.high ? qo(e.high, t, e.upperDuration, e.lowerDuration) : void 0;
			n !== void 0 && (e.probeDuration = n), e.high = t, e.highReady = V(e.rollout.state);
		}
		if ((!e.low || !e.high) && Vc(t)) {
			zc(e, t);
			return;
		}
		if (e.low && e.high && !e.bracketRefined) {
			e.bracketRefined = !0;
			let t = Ko(e.low, e.high), n = t === void 0 ? void 0 : Y(t);
			if (n !== void 0 && n > Y(e.low.burnDuration) && n < Y(e.high.burnDuration) && !e.attemptedTicks.includes(n) && e.iterations < 16) {
				Mc(e, t, "root");
				return;
			}
		}
		if (Ic(e, t)) return;
		if (e.hintAnchor && !e.hintRefined && t !== e.hintAnchor) {
			e.hintRefined = !0;
			let n = e.low && e.high ? Ko(e.low, e.high) : qo(e.hintAnchor, t, e.upperDuration, e.lowerDuration);
			if (n !== void 0) {
				Mc(e, n, "root");
				return;
			}
		}
		if (Vc(t)) {
			zc(e, t);
			return;
		}
	} else Number.isFinite(t.forecast.rangeError) && t.forecast.rangeError * n > 0 ? e.lowerDuration = e.duration : e.upperDuration = e.duration;
	Wc(e);
}
function Kc(e, t, n, r, i, a = !1) {
	Wo(e);
	let o = e.autopilot, s = o.boosterPrediction, c = !s || s.done ? kc(e, i, s?.published) : {
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
		if (d += yc(c.rollout, u - d, n, r, i, o.boosterSource ? {
			eligible: (t, n) => yo(e, t, n),
			paid: (t, a, o, s) => _o(e, t, a, o, s, n, r, i)
		} : void 0), c.rollout.done) {
			if (c.stage === "hint") f += Lc(c, i, Dc - f);
			else if (c.stage === "validate") {
				if (a && d === l) break;
				let t = c.rollout.state, n = Uc(t), r = (!o.boosterSource || o.boosterSource.valid && o.boosterSource.checked && c.sourceLineage === o.boosterSource.lineageId) && c.origin.damage?.revision === e.damage?.revision && c.selected.damageRevision === c.origin.damage?.revision, i = r ? Jo(c.selected, n, e.world.environmentTime) : void 0;
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
				i || n || c.origin.autopilot.boosterPhase === "coast" ? c.done = !0 : Wc(c);
			} else Gc(c);
		}
		if (c.done || d >= u || f >= Dc || c.rollout === t) break;
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
var qc = Wn(), X = P(), Jc = Gn(), Yc = pa(), Z = Ca(), Xc = ec(), Zc = .5, Qc = sc(), $c = (e, t, n) => Math.max(t, Math.min(n, e));
function el(e, t) {
	for (let n = 0; n < e.engines.running.length; n++) t.includes(n) ? !e.engines.running[n] && e.engines.ignitionCountdown[n] === null && !e.engines.failed[n] && !e.failures.fuelRunOut && Xo(e, n) : Bo(e, n);
}
function tl(t, n, r, i, a) {
	let o = t.kinematics, s = t.autopilot, c = a.gridFins;
	sa(t, t.atmosphere.airDensity, n, r, o.pitch, qc, a, Jc, e(-c.maxAngle));
	let l = Jc.torque;
	sa(t, t.atmosphere.airDensity, n, r, o.pitch, qc, a, Jc, e(c.maxAngle));
	let u = Jc.torque, d = -c.maxAngle, f = c.maxAngle;
	if (Math.abs(u - l) > 1) {
		for (let s = 0; s < 14; s++) {
			let s = (d + f) / 2;
			sa(t, t.atmosphere.airDensity, n, r, o.pitch, qc, a, Jc, e(s)), Jc.torque < i == u > l ? d = s : f = s;
		}
		let p = (d + f) / 2;
		s.boosterFinControl = p / c.maxAngle * 100, sa(t, t.atmosphere.airDensity, n, r, o.pitch, qc, a, Jc, e(p));
	} else s.boosterFinControl = 0;
}
function nl(e, t, n, r, i = !1) {
	let a = e.kinematics, o = e.autopilot, s = Math.atan2(Math.sin(t - a.pitch), Math.cos(t - a.pitch));
	F(e, r, X, qc);
	let c = (s / n ** 2 - 2 * a.angularVelocity / n - (X.engineSupportAvailable ? e.forces.offAxisThrustDifferenceAcceleration : 0) - e.forces.angularDragAcceleration) * (e.damage ? X.momentOfInertia : e.vehicle.vehicleMomentOfInertia), l = (X.engineSupportAvailable ? e.forces.thrust : 0) * Ao(e.engines.running, e.atmosphere.airPressure, r), u = a.speedX - O(e.world, a.altitude), d = a.speedY - e.world.gustVertical;
	sa(e, e.atmosphere.airDensity, u, d, a.pitch, qc, r, Jc);
	let f = Jc.torque, p = l * qc.engineArm * Math.sin(e.vehicle.gimbalPosition * .01 * S), m = f + p;
	l > 0 ? (o.pitchControl = Math.asin($c((c - f) / (l * qc.engineArm), -Math.sin(S), Math.sin(S))) / S * 100, i ? (e.status.finActive = !0, tl(e, u, d, c - p, r)) : (o.boosterFinControl = 0, e.status.finActive = !1)) : (o.pitchControl = 0, e.status.finActive = !0, tl(e, u, d, c, r)), e.status.rcsActive = e.vehicle.rcsRunTimeRemaining > 0, o.rcsThrustCommand = e.status.rcsActive ? $c((c - m) / qc.rcsArm, -re, re) : 0;
}
function rl(t, n, r, i, a = !1) {
	Wo(t);
	let o = t.autopilot;
	if (i) return o.boosterReturnPlan || o.boosterPhase === "entry" || o.boosterPhase === "terminal" ? (o.boosterFallTime = Math.max(2, (o.boosterFallTime ?? 2) - n), 0) : (o.boosterRangeError === void 0 && (La(t, B.bodyCentreAltitude, Yc, Z, r, e(0)), Z.reached && (o.boosterRangeError = t.kinematics.downRangeDistance - d + Z.downRange, o.boosterFallTime = Z.time)), Kc(t, n, i, cl, r, a));
	if (o.boosterPredictorCountdown = (o.boosterPredictorCountdown ?? 0) - n, o.boosterPredictorCountdown > 0) return 0;
	if (La(t, B.bodyCentreAltitude, Yc, Z, r, e(0)), Z.reached && (o.boosterRangeError = t.kinematics.downRangeDistance - d + Z.downRange, o.boosterFallTime = Z.time), o.boosterPhase === "coast" && Z.reached) {
		La(t, B.bodyCentreAltitude, Yc, Z, r, e(.05));
		let n = Z.downRange;
		La(t, B.bodyCentreAltitude, Yc, Z, r, e(-.05));
		let i = (n - Z.downRange) / .1;
		o.boosterCoastPitch = e(Math.abs(i) > 1 ? $c(-(o.boosterRangeError ?? 0) / i, -.2, .2) : 0);
	}
	let s = Math.abs(t.kinematics.accelerationX) * (o.boosterFallTime ?? 0) * .25;
	return o.boosterPredictorCountdown = o.boosterPhase === "boostback" && Math.abs(o.boosterRangeError ?? Infinity) <= 2 * s ? n : .25, 0;
}
function il(e) {
	let t = e.kinematics;
	return St(Math.max(B.bodyCentreAltitude, t.altitude + Math.min(0, t.speedY) * Io - .5 * da(e) * Io ** 2), Yc.atmosphere), Ls(Yc.atmosphere.airDensity);
}
function al(e, t) {
	if (F(e, t, X), !X.engineSupportAvailable || !X.hasMass || z.some((t) => e.engines.failed[t])) return !1;
	let n = Math.max(0, -e.kinematics.speedY);
	if (n === 0) return !1;
	let r = da(e), i = z.every((t) => e.engines.running[t]) ? 0 : Io, a = Math.max(0, (100 - e.vehicle.throttleCurrent) / 60), o = Math.max(i, a), s = n * o + .5 * r * o ** 2, c = n + r * o, l = xa(3, X.totalMass, c, B.bodyCentreAltitude, t), u = e.kinematics.altitude <= l + s ? Sa(3, X.totalMass, c, B.bodyCentreAltitude, Yc, t, X.retainedDryMass) : null;
	return u !== null && e.kinematics.altitude <= u + s;
}
function ol(e, t, n, r) {
	let i = e.autopilot;
	if (r && po(e, t), i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn) {
		i.boosterFinControl = void 0, Uo(i);
		return;
	}
	e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp || (i.boosterPhase ||= "align-boost", r || rl(e, t, n), cl(e, t, n));
}
function sl(e, t, n, r) {
	let i = e.autopilot;
	if (i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn || e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp) return;
	mo(e);
	let a = go(e, t, r, cl, n), o = rl(e, t, n, r, !!a);
	ho(e, t, r, cl, n, a && (vo(e, a) || o >= Math.max(1, Math.floor(480 * t))) ? a : void 0);
}
function cl(t, n, r) {
	Wo(t);
	let i = t.autopilot, a = t.kinematics;
	if (i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn) {
		i.boosterFinControl = void 0;
		return;
	}
	if (t.status.landed || t.failures.crashed || t.failures.inFlightBreakUp) return;
	t.status.translationModeOn = !0, t.status.finLocked = !1, t.status.dumpingFuel = !1, i.boosterPhase ||= "align-boost";
	let o = (i.boosterRangeError ?? a.downRangeDistance - d) >= 0 ? -1 : 1;
	if (i.boosterPhase === "align-boost") {
		el(t, []), t.vehicle.throttle = 100;
		let n = e(o * Math.PI / 2);
		nl(t, n, 1.5, r), Math.abs(Math.atan2(Math.sin(n - a.pitch), Math.cos(n - a.pitch))) < 5 * Math.PI / 180 && Math.abs(a.angularVelocity) < .1 && (i.boosterPhase = "boostback");
	} else if (i.boosterPhase === "boostback") el(t, Ra), t.vehicle.throttle = 100, i.boostBackInitCompleted ||= (i.boostBackDirection = o, !0), nl(t, e(i.boostBackDirection * Math.PI / 2), 1.5, r), !i.boosterForecastBurn && i.boosterReturnPlan && t.world.environmentTime + n >= i.boosterReturnPlan.shutdownAt && (el(t, []), i.boosterPhase = "coast");
	else if (i.boosterPhase === "coast") el(t, []), t.vehicle.throttle = 100, nl(t, i.boosterReturnPlan?.coastPitch ?? i.boosterCoastPitch ?? e(0), 1.5, r), al(t, r) ? i.boosterPhase = "terminal" : Math.hypot(a.speedX - O(t.world, a.altitude), a.speedY - t.world.gustVertical) > il(t) && (i.boosterPhase = "entry");
	else if (i.boosterPhase === "entry") {
		el(t, i.boosterEntryCentreOnly ? z : Ra);
		let e = il(t), n = Math.sqrt(Math.max(0, e ** 2 - a.speedX ** 2)), o = Math.max(0, -a.speedY - n) / 2, s = Math.max(2, 2 * Math.max(0, a.altitude - B.bodyCentreAltitude) / (Math.max(0, -a.speedY) + 2)), c = -6 * (a.downRangeDistance - d) / s ** 2 - 4 * a.speedX / s;
		tc(t, c, o, r, Xc), F(t, r, X);
		let l = X.engineSupportAvailable && X.hasMass ? H([
			!0,
			!0,
			!0
		], t.atmosphere.airPressure, r) / X.totalMass : 0;
		z.every((e) => t.engines.running[e]) && Math.hypot(Xc.requiredX, Xc.requiredY) <= l && (i.boosterEntryCentreOnly = !0, el(t, z)), ac(t, c, o, r, Xc), nl(t, Xc.pitch, .5, r), t.vehicle.throttle = oc(t, o, r), al(t, r) ? i.boosterPhase = "terminal" : a.speedY >= 0 && (el(t, []), i.boosterPhase = "coast");
	} else {
		if (i.boosterTerminalMissed) {
			el(t, []), nl(t, e(0), .5, r);
			return;
		}
		if (i.boosterTerminalIgnitionTime === void 0 && (i.boosterTerminalIgnitionTime = t.world.environmentTime), el(t, z), z.some((e) => t.engines.failed[e]) && (i.boosterTerminalMissed = !0), !z.every((e) => t.engines.running[e]) && (t.world.environmentTime - i.boosterTerminalIgnitionTime > Io + 2 * n && (i.boosterTerminalMissed = !0), !i.boosterTerminalMissed)) {
			t.vehicle.throttle = 100, nl(t, e(0), .5, r);
			return;
		}
		if (dc(t, n, r, Qc), i.boosterArrivalTime === 0 && (i.boosterTerminalMissed = !0), i.boosterTerminalMissed) {
			el(t, []), nl(t, e(0), .5, r);
			return;
		}
		tc(t, Qc.centreAX, Qc.centreAY, r, Xc), nl(t, e(0), Zc, r, !0), i.pitchControl = $c(-Math.atan2(Math.sin(Xc.pitch - a.pitch), Math.cos(Xc.pitch - a.pitch)) / S * 100, -100, 100), t.vehicle.throttle = oc(t, Qc.centreAY, r), H(t.engines.running, t.atmosphere.airPressure, r) === 0 && (t.vehicle.throttle = 100);
	}
}
//#endregion
//#region src/core/autopilot/booster-utilities.ts
function ll(t, n) {
	let { autopilot: r, kinematics: i } = t;
	r.manualControlOn || t.failures.crashed || t.failures.inFlightBreakUp || t.status.landed || (r.pitchHoldOn && (Math.abs(i.pitchRateOfChange) < .4 && (r.holdingPitch = i.pitch), t.status.translationModeOn = !0, nl(t, r.holdingPitch, .5, n)), !r.autoTakeOffOn) || (r.autoTakeOffInitialised ||= (r.autoMaxThrustOn = !0, t.engines.running.some(Boolean) || U(t, n), !0), t.status.translationModeOn = !0, nl(t, i.altitude < 25e3 ? e(we * i.altitude / 25e3) : i.altitude < 8e4 ? e(we + (Te - we) * (i.altitude - 25e3) / 55e3) : Te, 3, n), t.vehicle.propellantMass < 12e3 && t.engines.running.some(Boolean) && (U(t, n), r.autoTakeOffOn = !1));
}
var ul = sn(a), dl = pa(), fl = P();
function pl(e) {
	if (F(e, E, fl), !fl.engineSupportAvailable || !fl.hasMass) return 0;
	let t = fl.totalMass * ul, n = 1;
	return T(E.propulsion, "sea-level", 101325 / 1e3) * .8 < t && (n = 2), T(E.propulsion, "sea-level", 101325 / 1e3) * 2 * .8 < t && (n = 3), Math.min(n, Do(e.engines.failed));
}
function ml(e) {
	return Sa(pl(e), fl.totalMass, -e.kinematics.speedY, 0, dl, E, fl.retainedDryMass) ?? e.kinematics.altitude;
}
function hl(e) {
	let t = -e.kinematics.speedY;
	F(e, E, fl);
	let n = Sa(fl.engineSupportAvailable ? Eo(e.engines.running) : 0, fl.totalMass, t, E.height * .5, dl, E, fl.retainedDryMass);
	return n === null ? e.kinematics.altitude : n + t * 1 * .5;
}
//#endregion
//#region src/core/autopilot/index.ts
var gl = Xo, _l = Zo, vl = Wn(), Q = P();
function yl(e) {
	let { autopilot: t, kinematics: n } = e;
	!t.pitchHoldOn || t.manualControlOn || (Math.abs(n.pitchRateOfChange) < .4 && (t.holdingPitch = n.pitch), G(e, t.holdingPitch, .5));
}
function bl(e, t = E) {
	e.autopilot.autoMaxThrustOn && Us(e, Ls(e.atmosphere.airDensity), 10, 4, t);
}
function xl(t) {
	let { autopilot: n, kinematics: r, vehicle: i, engines: a, status: o } = t;
	!n.autoTakeOffOn || n.manualControlOn || (n.autoTakeOffInitialised ||= (n.autoMaxThrustOn || es(t), wo(a.running) === 0 && U(t), o.finActive && Zo(t), o.finLocked = !0, !0), r.altitude < 25e3 ? G(t, e(we * r.altitude / 25e3), 3) : r.altitude < 8e4 ? G(t, e(we + (Te - we) * (r.altitude - 25e3) / 55e3), 3) : G(t, Te, 3), i.propellantMass < 12e3 && wo(a.running) > 0 && (U(t), ts(t), o.finLocked = !1));
}
function Sl(t, n) {
	let { autopilot: r, kinematics: i, vehicle: a, engines: o } = t;
	if (!r.autoBoostBackOn || r.manualControlOn) return;
	let s = () => {
		ns(t), Cl(t), r.autoLandOn || rs(t);
	};
	if (r.boostBackInitCompleted ||= (r.boostBackDirection = i.downRangeDistance > d - 100 ? -Math.PI * .5 : Math.PI * .5, t.status.rcsActive || Qo(t), wo(o.running) === 0 && U(t), r.autoMaxThrustOn || es(t), r.autoTakeOffOn && ts(t), !0), !r.accelerationStageCompleted) r.decelerationStageEstDuration = Math.abs(i.speedX) / ge + 4, G(t, e(r.boostBackDirection), 1.5), (d - i.downRangeDistance - 100) / (i.speedX * .5) < r.decelerationStageEstDuration + 2 && (d - i.downRangeDistance) / i.speedX > 0 && (U(t), r.autoMaxThrustOn && es(t), r.accelerationStageCompleted = !0);
	else if (r.boostBackDecelerationStageInitCompleted ||= (r.boostBackDecelerationCheckCountdown = 5, !0), r.boostBackDecelerationCheckCountdown !== null && (r.boostBackDecelerationCheckCountdown -= n, r.boostBackDecelerationCheckCountdown <= 0 && (r.boostBackDecelerationCheckCountdown = null, i.accelerationX < 14.906640000000001 && (r.boostBackAeroDeceleration = !1, U(t)))), r.boostBackAeroDeceleration ? Gs(t, r.boostBackDirection < 0 ? ge : -ge, n, _l) : (G(t, e(-r.boostBackDirection), 1), Ks(t, gl), zs(t, ge)), Math.abs(i.speedX) < 3) {
		s();
		return;
	}
	(a.propellantMass < 12e3 || i.altitude < 700 && i.speedY < 0) && s();
}
function Cl(e) {
	let { autopilot: t } = e;
	t.autoBoostBackOn = !1, t.decelerationStageEstDuration = 0, t.boostBackDirection = 0, t.boostBackInitCompleted = !1, t.boostBackAeroDeceleration = !0, t.boostBackDecelerationStageInitCompleted = !1, t.boostBackDecelerationCheckCountdown = null, t.accelerationStageCompleted = !1;
}
function wl(e) {
	let { autopilot: t } = e;
	t.autoLandOn = !1, t.initVehicleConfigCompleted = !1, t.landingSiteXPos = d, t.aeroDescentCompleted = !1, t.fineTunePercentage = void 0, t.bellyFlopTriggerAltitude = 0, t.flipStageInitialised = !1, t.flipCompleted = !1, t.horizontalAdjustmentStageCompleted = !1, t.horizontalAdjustmentStageInitialised = !1, t.horizontalAdjustmentTimeLeft = void 0, t.horizontalAdjustmentDesiredSpeed = void 0, t.effectiveVerticalMaxThrust = void 0, t.finalStagePessimisticAltitude = void 0, t.finalDescentStageInitialised = !1, t.distanceToGround = void 0, t.finalDescentStageCompleted = !1;
}
function Tl(e, t) {
	let { autopilot: n, vehicle: r, engines: i, status: a } = e;
	!n.autoLandOn || n.manualControlOn || (n.initVehicleConfigCompleted ||= (a.finActive || Zo(e), a.rcsActive || Qo(e), r.throttle = 40, r.propellantMass > 18e3 && !a.dumpingFuel && $o(e), wo(i.running) > 0 && U(e), !0), a.dumpingFuel && r.propellantMass <= 18e3 && $o(e), n.aeroDescentCompleted ? n.flipCompleted ? n.horizontalAdjustmentStageCompleted ? n.finalDescentStageCompleted || Al(e, t) : kl(e) : Ol(e) : (El(e), Dl(e)));
}
function El(e) {
	let { autopilot: t, kinematics: n } = e;
	if (n.altitude >= 2500) return;
	let r = pl(e) > 1 ? Ce : xe;
	t.finalStagePessimisticAltitude = ml(e), F(e, E, Q, vl);
	let i = Q.engineSupportAvailable ? Math.min(1, Do(e.engines.failed)) : 0, a = i > 0 && Q.momentOfInertia > 0 && vl.engineArm > 0 ? Pt(i * T(E.propulsion, "sea-level", w / 1e3) * 40 * .01, vl.engineArm, Q.momentOfInertia) : 0;
	if (!(a > 0)) {
		t.bellyFlopTriggerAltitude = Infinity;
		return;
	}
	let o = Math.sqrt((Math.PI / 2 + ye) / 2 / a * 2) * 2;
	t.bellyFlopTriggerAltitude = t.finalStagePessimisticAltitude + -n.speedY * (o + Io) - -30 * r + E.height / 2;
}
function Dl(t) {
	let { autopilot: n, kinematics: r } = t, i = r.downRangeDistance - n.landingSiteXPos + 100, a = -i / r.speedX, o;
	Math.abs(r.speedX) > 20 ? o = r.angleOfMotion - Math.PI : i > 0 ? (o = -ve, a < 5 && a > 0 && (n.fineTunePercentage = Math.abs(r.speedX) > 5 ? 1 : Math.abs(r.speedX) / 5, o = ve * 2 * n.fineTunePercentage)) : (o = ve, a < 5 && a > 0 && (n.fineTunePercentage = Math.abs(r.speedX) > 5 ? 1 : Math.abs(r.speedX) / 5, o = -ve * 2 * n.fineTunePercentage)), G(t, e(o + Math.PI / 2), .7), (r.altitude < n.bellyFlopTriggerAltitude && r.speedY < 5 && r.altitude < 2500 || r.altitude < 300) && (n.aeroDescentCompleted = !0);
}
function Ol(e) {
	let { autopilot: t, kinematics: n, vehicle: r, status: i } = e;
	t.flipStageInitialised ||= (i.dumpingFuel && $o(e), i.rcsActive && Qo(e), U(e), !0), G(e, ye, .4), n.pitch < 0 && (r.throttle = 100), n.pitch < ye && (t.flipCompleted = !0);
}
function kl(e) {
	let { autopilot: t, kinematics: n, engines: r, status: i } = e;
	t.horizontalAdjustmentStageInitialised ||= (i.finActive && Zo(e), i.finLocked = !0, Eo(r.running) < 3 && (t.horizontalAdjustmentVerticalSpeedLimit /= 1.5, t.horizontalAdjustmentHorizontalSpeedLimit *= 2), !0);
	let a = t.landingSiteXPos - n.downRangeDistance, [o, s, c] = r.running;
	o && !s && !c ? a -= 12 : (!o && s && c || !o && (s && !c || !s && c)) && (a += 4), t.finalStagePessimisticAltitude = hl(e), t.horizontalAdjustmentTimeLeft = (n.altitude - t.finalStagePessimisticAltitude - E.height / 2) / -n.speedY, t.horizontalAdjustmentDesiredSpeed = a / t.horizontalAdjustmentTimeLeft, t.horizontalAdjustmentDesiredSpeed > t.horizontalAdjustmentHorizontalSpeedLimit ? t.horizontalAdjustmentDesiredSpeed = t.horizontalAdjustmentHorizontalSpeedLimit : t.horizontalAdjustmentDesiredSpeed < -t.horizontalAdjustmentHorizontalSpeedLimit && (t.horizontalAdjustmentDesiredSpeed = -t.horizontalAdjustmentHorizontalSpeedLimit), n.speedY > t.horizontalAdjustmentVerticalSpeedLimit && Ks(e, gl), t.horizontalAdjustmentTimeLeft < 3 && t.horizontalAdjustmentTimeLeft > -3 ? Vs(e, 0, be, 10, .8) : Vs(e, t.horizontalAdjustmentDesiredSpeed ?? 0, be, 6, 1), Hs(e, t.horizontalAdjustmentVerticalSpeedLimit, 10, 2), t.finalStagePessimisticAltitude * 1.1 > n.altitude && (t.horizontalAdjustmentStageCompleted = !0);
}
function Al(t, n, r = -5, i) {
	let { autopilot: a, kinematics: o, vehicle: s, engines: c, status: l } = t;
	if (a.finalDescentStageInitialised ||= !0, a.distanceToGround = o.altitude - E.height * .5, o.altitude > E.height * .5 + 5) {
		let [n, r, i] = c.running;
		n && !r && !i ? Vs(t, -.8, e(be / 2), 5, .7) : !n && r && i ? Vs(t, .8, e(be / 2), 5, .7) : !n && (r && !i || !r && i) ? Vs(t, .72, e(be / 2), 5, .7) : Vs(t, 0, e(be / 2), 5, .7);
	} else G(t, e(0), .4);
	o.speedY > r && Ks(t, gl);
	let u = -a.distanceToGround / 3 - .1, d = da(t);
	F(t, E, Q);
	let f = (Q.engineSupportAvailable && Q.hasMass ? Is(c.running, s.gimbalPointingDirection, t.atmosphere.airPressure, o.pitch) / Q.totalMass : 0) - d, p = Math.sqrt(2 * Math.max(0, f) * Math.max(0, a.distanceToGround));
	if (!i && f > 0 && -u > p) {
		let e = o.speedY + p, n = 1 + f / d - e / 10;
		Bs(t, Math.max(0, Math.min(3, n)));
	} else Hs(t, u, 10, 3);
	if (o.altitude <= E.height * .5 + .05) {
		if (i) {
			i(t);
			return;
		}
		s.throttle = 40, U(t), l.forceDump = !0, l.dumpingFuel || $o(t), rs(t), wl(t);
	}
}
function jl(e, t) {
	e.autopilot.demoAutoLandOn && Al(e, t, -20, (e) => {
		U(e), e.autopilot.demoAutoLandOn = !1, e.status.finLocked = !1, e.vehicle.propellantMass = p, e.autopilot.pitchControl = 0, e.vehicle.throttle = 100;
	});
}
var Ml = e(-Math.PI / 2);
function Nl(e) {
	let t = e.autopilot.landingSiteXPos - e.kinematics.downRangeDistance;
	return t < 0 ? t + o : t;
}
function Pl(e) {
	let { kinematics: t } = e;
	return dn(t.distanceToPlanetCenter, t.speedX, t.speedY, a + he) + me;
}
function Fl(e) {
	let { kinematics: t, engines: n } = e;
	if (F(e, E, Q), !Q.engineSupportAvailable || !Q.hasMass) return Infinity;
	let r = Do(n.failed);
	if (r <= 0) return Infinity;
	let i = 150 * Q.totalMass / (r * T(E.propulsion, "sea-level", e.atmosphere.airPressure));
	return (t.speedX - 75) * i + dn(t.distanceToPlanetCenter, t.speedX - 150, t.speedY, a + he) + me;
}
function Il(e) {
	let { autopilot: t, kinematics: n, vehicle: r, engines: i, status: a } = e;
	if (!(!t.autoDeorbitOn || t.manualControlOn)) {
		if (t.deorbitInitCompleted ||= (t.landingSiteXPos = d, a.rcsActive || Qo(e), wo(i.running) > 0 && U(e), r.throttle = 100, !0), G(e, Ml, 4), !t.deorbitBurnStarted) {
			let i = Fl(e);
			Number.isFinite(i) && Nl(e) <= i && (t.deorbitTargetSpeed = n.speedX, U(e), r.throttle = 100, t.deorbitBurnStarted = !0);
			return;
		}
		if (!t.deorbitBurnCompleted) {
			let a = t.deorbitTargetSpeed - n.speedX;
			(a >= 75 && Pl(e) <= Nl(e) || a >= 240) && (wo(i.running) > 0 && U(e), r.throttle = 40, t.deorbitBurnCompleted = !0);
			return;
		}
		n.speedY < 0 && (t.autoDeorbitOn = !1, t.autoLandOn || rs(e));
	}
}
function Ll(e, t, n = E, r) {
	if (n.id === "super-heavy") {
		let i = e.autopilot.autoLandOn || e.autopilot.autoBoostBackOn;
		ol(e, t, n, r), i || (bl(e, n), ll(e, n));
		return;
	}
	jl(e, t), bl(e), yl(e), xl(e), Tl(e, t), Sl(e, t), Il(e);
}
//#endregion
//#region src/core/control/actuation.ts
function Rl(e, t, n, r = !1) {
	return e < t + n && e > t - n ? t : (r ? e <= t : e < t) ? e + n : e - n;
}
function zl(e, t, n) {
	e.vehicle.frontFinExtension = Rl(e.vehicle.frontFinExtension, t, 120 * n);
}
function Bl(e, t, n) {
	e.vehicle.aftFinExtension = Rl(e.vehicle.aftFinExtension, t, 120 * n, !0);
}
function Vl(e, t, n) {
	let { status: r, kinematics: i } = e;
	r.finActive ? i.angleOfAttack < 0 ? (zl(e, 50 - t, n), Bl(e, 50 + t, n)) : (zl(e, 50 + t, n), Bl(e, 50 - t, n)) : r.finLocked ? (zl(e, 0, n), Bl(e, 0, n)) : (zl(e, 100, n), Bl(e, 100, n));
}
function Hl(e, t, n, r = !1) {
	let { status: i, vehicle: a, forces: o, autopilot: s } = e, c = s.rcsThrustCommand;
	if (s.rcsThrustCommand = 0, !i.rcsActive || a.rcsRunTimeRemaining <= 0) {
		o.rcsThrust = 0;
		return;
	}
	if (o.rcsThrust = r ? Math.max(-re, Math.min(re, c)) : t > 99 ? re : t < -99 ? -re : c, o.rcsThrust !== 0) {
		let e = 1 / n, t = Math.abs(o.rcsThrust) / re, r = a.rcsRunTimeRemaining * e;
		t >= r ? (o.rcsThrust = Math.sign(o.rcsThrust) * re * r, a.rcsRunTimeRemaining = 0) : a.rcsRunTimeRemaining = (r - t) / e;
	}
}
function Ul(e, t, n) {
	e.vehicle.gimbalPosition = Rl(e.vehicle.gimbalPosition, t, 600 * n);
}
function Wl(e, t) {
	e.vehicle.throttleCurrent = Rl(e.vehicle.throttleCurrent, e.vehicle.throttle, 60 * t);
}
function Gl(e, t, n, r = E, i = !1) {
	e.status.translationModeOn && (r.gridFins ? (zl(e, 50 + (e.status.finActive && !e.status.finLocked ? Math.max(-100, Math.min(100, e.autopilot.boosterFinControl ?? t)) : 0) / 2, n), Bl(e, 50, n)) : Vl(e, t / 2, n), Hl(e, t, n, !!r.gridFins && !i && !e.autopilot.manualControlOn && (e.autopilot.autoLandOn || e.autopilot.autoBoostBackOn || e.autopilot.pitchHoldOn || e.autopilot.autoTakeOffOn) && e.autopilot.boosterFinControl !== void 0), Ul(e, t, n));
}
//#endregion
//#region src/core/control/mechanical.ts
function Kl(e, t, n, r, i, a, o, s = !0) {
	if (t.damage && !t.damage.terminal.active) {
		let e = t.damage.revision;
		la(t, n, i, "hull"), t.damage.revision !== e && i.id === "super-heavy" && Uo(t.autopilot);
	}
	return t.damage?.terminal.active ? (Ss(t, i, o), t.world.environmentTime += n, t) : (a(t, n, i), r.throttle !== void 0 && (t.vehicle.throttle = r.throttle), r.pitchControl !== void 0 && (t.autopilot.pitchControl = r.pitchControl, i.gridFins && (t.autopilot.boosterFinControl = r.pitchControl)), Gl(t, t.autopilot.pitchControl, n, i, r.pitchControl !== void 0), Wl(t, n), Ss(t, i, o), s && i.id === "super-heavy" && Qs(e, t, i), t.world.environmentTime += n, !t.failures.crashed && !t.failures.inFlightBreakUp && !t.status.onTheGround && !t.status.landed && (t.world.timeSpent += n), t);
}
//#endregion
//#region src/core/physics/body-reference.ts
function ql(e, t, n, r) {
	let i = Math.sin(e.pitch), o = Math.cos(e.pitch), s = o * t + i * n, c = -i * t + o * n, l = e.angularVelocity, u = e.angularAcceleration;
	r.downRangeDistance = e.downRangeDistance + s, r.downRangeDistanceNextFrame = r.downRangeDistance, r.altitude = e.altitude + c, r.speedX = e.speedX + l * c, r.speedY = e.speedY - l * s, r.accelerationX = e.accelerationX + u * c - l ** 2 * s, r.accelerationY = e.accelerationY - u * s - l ** 2 * c, r.pitch = e.pitch, r.angularVelocity = l, r.angularAcceleration = u, r.distanceToPlanetCenter = a + r.altitude, r.orbitalVelocityAtCurrentAltitude = on(r.distanceToPlanetCenter), r.trueSpeed = Math.hypot(r.speedX, r.speedY), r.totalAcceleration = Math.hypot(r.accelerationX, r.accelerationY);
}
//#endregion
//#region src/core/mission-free-flight.ts
var $ = _s(), Jl = { ...E }, Yl = { ...Xa };
function Xl(e, t, n, r) {
	let i = e.kinematics, o = Math.sin(i.pitch), s = Math.cos(i.pitch);
	e.damage ? (t.pitch = i.pitch, t.angularVelocity = i.angularVelocity, t.angularAcceleration = i.angularAcceleration, ql(t, -r, -n, i)) : (i.downRangeDistance = t.downRangeDistance - n * o, i.downRangeDistanceNextFrame = i.downRangeDistance, i.altitude = t.altitude - n * s, i.distanceToPlanetCenter = a + i.altitude, i.orbitalVelocityAtCurrentAltitude = on(i.distanceToPlanetCenter), i.speedX = t.speedX - n * i.angularVelocity * s, i.speedY = t.speedY + n * i.angularVelocity * o, i.accelerationX = t.accelerationX - n * (i.angularAcceleration * s - i.angularVelocity ** 2 * o), i.accelerationY = t.accelerationY + n * (i.angularAcceleration * o + i.angularVelocity ** 2 * s), i.totalAcceleration = Math.hypot(i.accelerationX, i.accelerationY)), i.trueSpeed = Math.hypot(i.speedX, i.speedY), i.machSpeed = It(i.speedX, i.speedY, O(e.world, i.altitude), e.world.gustVertical) / Et(e.atmosphere.airTemperature);
}
function Zl(e, t, n, r, i) {
	let o = So(e);
	if (r.id === "super-heavy" && e.status.landed) return o.damage && Bi(o.damage, N(r).debris, t), o.engines.running.fill(!1), o.engines.ignitionCountdown.fill(null), o.world.environmentTime += t, o.world.updatedFrameCount += 1, o;
	if (r.id === "super-heavy" && (n.pitchControl !== void 0 || n.throttle !== void 0) && Uo(o.autopilot), o.damage?.terminal.active) return Bi(o.damage, N(r).debris, t), $i(o), o.world.environmentTime += t, o.world.updatedFrameCount++, o;
	if (Ts(o, t, r, $), o.damage && Bi(o.damage, N(r).debris, t), o.damage?.terminal.active) return o.engines.running.fill(!1), o.engines.ignitionCountdown.fill(null), o.world.environmentTime += t, o;
	ra(o, r, $.massProperties);
	let s = o.kinematics, c = (o.damage ? $.massProperties.centreOfMass : zn(o.vehicle.propellantMass, r)) - r.height / 2, l = o.damage ? $.massProperties.centreOfMassX : 0, u = Math.sin(s.pitch), d = Math.cos(s.pitch), f = {
		...s,
		downRangeDistance: s.downRangeDistance + c * u,
		altitude: s.altitude + c * d,
		speedX: s.speedX + c * s.angularVelocity * d,
		speedY: s.speedY - c * s.angularVelocity * u
	};
	o.damage && ql(s, l, c, f), f.distanceToPlanetCenter = a + f.altitude;
	let p = r.id === "ship" ? Jl : Yl;
	p.height = r.height + 2 * c * Math.sign(d);
	let m = Es({
		kinematics: f,
		forces: o.forces,
		status: o.status,
		failures: o.failures
	}, t, $.bodyAccelerationX, $.bodyAccelerationY, p, o.damage ? r.height * Math.abs(d) / 2 + (f.altitude - s.altitude) : void 0);
	m && (s.angularVelocity = 0), o.damage ? ra(o, r, $.massProperties) : Un(o.vehicle.propellantMass, $.massProperties, r), o.vehicle.vehicleMomentOfInertia = $.massProperties.momentOfInertia, Os(o, t, m, $), Xl(o, f, c, l), Ds(o, t, $);
	let h = ks(o, r, $);
	return As(o, t, m, $.omega0, $.alpha0, h), Xl(o, f, c, l), Kl(e, o, t, n, r, i, $);
}
//#endregion
//#region src/core/step.ts
var Ql = {}, $l = _s();
function eu(e, t, n = Ql, r = E) {
	let i = ru(e, t, n, r, tu);
	return r.id === "super-heavy" && !i.damage?.terminal.active && sl(i, t, r, nu), i;
}
function tu(e, t, n) {
	Ll(e, t, n, nu);
}
function nu(e, t, n, r) {
	return ru(e, t, Ql, r, n);
}
function ru(e, t, n, r, i) {
	if (e.damage) return Zl(e, t, n, r, i);
	let a = So(e);
	if (r.id === "super-heavy" && e.status.landed) return a.engines.running.fill(!1), a.engines.ignitionCountdown.fill(null), a.world.environmentTime += t, a.world.updatedFrameCount += 1, a;
	r.id === "super-heavy" && (n.pitchControl !== void 0 || n.throttle !== void 0) && Uo(a.autopilot), Ts(a, t, r, $l);
	let o = Es(a, t, $l.bodyAccelerationX, $l.bodyAccelerationY, r);
	return Ds(a, t, $l), js(a, t, r, $l, o), Kl(e, a, t, n, r, i, $l);
}
//#endregion
export { Ke as $, ma as A, un as B, Ia as C, Fa as D, Ca as E, P as F, Mt as G, en as H, N as I, jt as J, Ot as K, Ni as L, La as M, Ma as N, Sa as O, F as P, qe as Q, Fi as R, ua as S, pa as T, tn as U, D as V, Bt as W, Et as X, zt as Y, St as Z, Xa as _, as as a, t as at, wa as b, is as c, n as ct, ms as d, E as et, fs as f, Co as g, xo as h, os as i, i as it, fa as j, da as k, gs as l, So as m, ds as n, u as nt, us as o, e as ot, bo as p, kt as q, ss as r, a as rt, cs as s, r as st, eu as t, ie as tt, ps as u, ha as v, xa as w, Ta as x, ga as y, jn as z };

//# sourceMappingURL=simulation-DqUEjDAx.js.map