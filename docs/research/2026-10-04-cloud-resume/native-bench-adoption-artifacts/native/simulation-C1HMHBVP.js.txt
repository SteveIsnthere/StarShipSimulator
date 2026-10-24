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
], b = ee.flatMap((e, t) => e.kind === "sea-level" ? [t] : []), te = 21.8, x = n(t(15)), S = 9.80665, ne = 23e4 * S, C = 101325;
ne / (327 * S) * S * 350, 158645.8058103975 / C, 258e3 * S / (380 * S), Math.PI * (2.3 / 2) ** 2;
var re = ne, ie = 8e5, w = e(1.03), ae = 24.2, oe = 23.3, se = 45.8, ce = 12.6, le = 17415e-8, ue = 5.670374419e-8, de = .85, fe = 1533, pe = 273.15;
de * ue * fe ** 4;
var me = 841800, he = 8e4, ge = u * 1.6, _e = 1 * re;
_e * 2, _e * 3, 1 * re * 40 * .01;
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
	dryCentreOfMass: te * Le,
	tankBottom: Re,
	loxTankHeight: Be,
	ch4TankHeight: Ve,
	ch4TankBottom: Re + Be,
	aftFinStation: (te - ce) * Le,
	frontFinStation: (te + oe) * Le,
	rcsStation: (te + 20) * Le,
	minArea: f,
	maxArea: Me.height * Me.diameter,
	frontFinArea: ae,
	aftFinArea: se,
	engines: Object.freeze(ee.map((e) => Object.freeze({
		...e,
		offAxisForceFraction: -e.offAxis / Math.sqrt(e.offAxis ** 2 + (Me.height / 2) ** 2)
	}))),
	ignitionGroup: b
}), He = S, Ue = 287.053, We = 288.15, Ge = C;
function Ke() {
	let e = [
		[0, -.0065],
		[11e3, 0],
		[2e4, .001],
		[32e3, .0028],
		[47e3, 0],
		[51e3, -.0028],
		[71e3, -.002]
	], t = [], n = We, r = Ge;
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
		r = qe(r, n, o, c), n = l;
	}
	return t;
}
function qe(e, t, n, r) {
	return n === 0 ? e * Math.exp(-He * r / (Ue * t)) : e * ((t + n * r) / t) ** (-He / (Ue * n));
}
var Je = Ke(), Ye = 84852, Xe = 6356766;
function Ze(e) {
	return Xe * e / (Xe + e);
}
function Qe(e) {
	let t = Je[0];
	for (let n of Je) if (e >= n.baseAltitude) t = n;
	else break;
	return t;
}
var $e = 86e3, et = [
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
], tt = 1e3, nt = (() => {
	let e = [], t = rt($e);
	for (let n = 0; n < et.length; n++) {
		let [r, i] = et[n];
		e.push({
			base: r,
			density: t,
			scaleHeight: i
		});
		let a = et[n + 1];
		a && (t *= Math.exp(-(a[0] - r) / i));
	}
	return e;
})();
function rt(e) {
	let { pressurePascal: t, temperatureKelvin: n } = it(e);
	return t / (Ue * n);
}
function it(e) {
	let t = {
		pressurePascal: 0,
		temperatureKelvin: 0
	};
	return at(e, t), t;
}
function at(e, t) {
	let n = Math.max(Ze(e), 0), r = Math.min(n, Ye), i = Qe(r), a = r - i.baseAltitude;
	t.temperatureKelvin = i.baseTemperature + i.lapseRate * a, t.pressurePascal = qe(i.basePressure, i.baseTemperature, i.lapseRate, a);
}
function ot(e) {
	let t = {
		airTemperature: 0,
		airPressure: 0,
		airDensity: 0
	};
	return gt(e, t), t;
}
var st = 186.8673, ct = 263.1905, lt = -76.3232, ut = -19.9429, dt = 240, ft = 12, pt = Xe / 1e3;
function mt(e) {
	let t = e / 1e3;
	if (t <= 91) return st;
	if (t <= 110) return ct + lt * Math.sqrt(1 - ((t - 91) / ut) ** 2);
	if (t <= 120) return dt + ft * (t - 110);
	let n = (t - 120) * 6476.766 / (pt + t);
	return tt - 640 * Math.exp(-.01875 * n);
}
var ht = {
	pressurePascal: 0,
	temperatureKelvin: 0
};
function gt(e, t) {
	if (e <= 86e3) {
		at(e, ht);
		let { pressurePascal: n, temperatureKelvin: r } = ht;
		t.airTemperature = r - 273.15, t.airPressure = n / 1e3, t.airDensity = n / (Ue * r);
		return;
	}
	let n = nt[0];
	for (let t of nt) if (e >= t.base) n = t;
	else break;
	let r = n.density * Math.exp(-(e - n.base) / n.scaleHeight), i = mt(e);
	t.airTemperature = i - 273.15, t.airPressure = r * Ue * i / 1e3, t.airDensity = r;
}
//#endregion
//#region src/core/physics/atmosphere.ts
function _t(e) {
	return ot(e);
}
var vt = 1.4, yt = 287.053;
function bt(e) {
	return Math.sqrt(vt * yt * (e + 273.15));
}
//#endregion
//#region src/core/physics/aero.ts
function xt(e, t) {
	return e * t ** 2 * 5e-4;
}
function St(e, t, n = E) {
	return Math.abs(Math.sin(e) * t) + Math.abs(Math.cos(e) * n.minArea) / 2.1;
}
function Ct(e, t, n, r) {
	return 1 / 2 * e * t ** 2 * r * n;
}
function wt(e) {
	let t = Math.abs(e);
	return t >= 1.48 ? -1.1 * t + 1.728 : t >= .52 ? -1 / 9.6 * t + .254 : t >= .47 ? -8 * t + 4.36 : t >= .35 ? 5 / 6 * t + .2083 : 5 / 3.5 * t;
}
function Tt(e, t, n, r) {
	return wt(n) * e * t ** 2 * r * .5;
}
function Et(e) {
	return e >= 10 ? 2.5 : e * .1347 + 1.153;
}
function Dt(e, t) {
	return e / t;
}
function Ot(e, t, n) {
	return e * t / n;
}
function kt(t, n) {
	return e(Math.atan2(t, n));
}
function At(e, t, n, r) {
	return Math.sqrt((e - n) ** 2 + (t - r) ** 2);
}
function jt(e, t, n, r) {
	return kt(e - n, t - r);
}
function Mt(t, n) {
	let r = Nt(t, n);
	return {
		angleOfAttack: e(r),
		angleInToTheWind: e(Pt(r))
	};
}
function Nt(e, t) {
	let n = e - t;
	return n < -Math.PI ? n = Math.PI * 2 + n : n > Math.PI && (n = -(Math.PI * 2 - n)), n;
}
function Pt(e) {
	return e > Math.PI / 2 ? Math.PI - e : e < -Math.PI / 2 ? -Math.PI - e : e;
}
function Ft(e, t, n, r, i = E) {
	let a = e * i.diameter * t ** 2 * r / n;
	return t > 0 ? -a : a;
}
function It(e, t, n, r, i, a = E) {
	let o = Ct(e, t, Math.abs(Math.sin(r)) * a.frontFinArea, 2) * i;
	return n < 0 ? -o : o;
}
function Lt(e, t, n, r, i, a = E) {
	let o = Ct(e, t, Math.abs(Math.sin(r)) * a.aftFinArea, 2) * i;
	return n < 0 ? o : -o;
}
function Rt(e, t, n = E) {
	let r = Math.sin(w * e * .01), i = Math.sin(w * t * .01), a = r * n.frontFinArea + i * n.aftFinArea;
	return {
		frontFinEffectiveAreaFraction: r,
		aftFinEffectiveAreaFraction: i,
		totalFinSurfaceArea: a,
		vehicleInFlightMaxArea: n.maxArea + a * 1.8
	};
}
//#endregion
//#region src/core/physics/components.ts
var zt = Math.PI / 2;
function Bt(e) {
	return -Math.sin(e);
}
function Vt(e) {
	return -Math.cos(e);
}
function Ht(e) {
	return -Math.cos(e);
}
function Ut(e) {
	return Math.sin(e);
}
function Wt(e) {
	return Math.sin(e);
}
function Gt(e) {
	return Math.cos(e);
}
function Kt(e) {
	return 0 < e && e < zt || -Math.PI < e && e < -zt;
}
function qt(e, t) {
	let n = t(e.gimbalPointingDirection) * e.thrustAcceleration, r = e.fixedThrustAcceleration;
	return r === 0 ? n : n + t(e.pitch) * r;
}
function Jt(e) {
	let t = Bt(e.angleOfMotion) * e.aerodynamicDragAcceleration, n = Ht(e.angleOfMotion), r = Kt(e.angleOfAttack) ? -n * e.aerodynamicLiftAcceleration : n * e.aerodynamicLiftAcceleration;
	return t + qt(e, Wt) + r;
}
function Yt(e, t) {
	let n = Vt(e.angleOfMotion) * e.aerodynamicDragAcceleration, r = Ut(e.angleOfMotion), i = Kt(e.angleOfAttack) ? -r * e.aerodynamicLiftAcceleration : r * e.aerodynamicLiftAcceleration, a = qt(e, Gt);
	return -t + n + a + i;
}
function Xt(e, t, n) {
	let r = Math.sin(e.angleOfMotion), i = Math.cos(e.angleOfMotion), a = Kt(e.angleOfAttack), o = -r * e.aerodynamicDragAcceleration, s = -i * e.aerodynamicDragAcceleration, c = -i, l = r, u = a ? -c * e.aerodynamicLiftAcceleration : c * e.aerodynamicLiftAcceleration, d = a ? -l * e.aerodynamicLiftAcceleration : l * e.aerodynamicLiftAcceleration, f = Math.sin(e.gimbalPointingDirection) * e.thrustAcceleration, p = Math.cos(e.gimbalPointingDirection) * e.thrustAcceleration;
	e.fixedThrustAcceleration !== 0 && (f += Math.sin(e.pitch) * e.fixedThrustAcceleration, p += Math.cos(e.pitch) * e.fixedThrustAcceleration), n.x = o + f + u, n.y = -t + s + p + d;
}
//#endregion
//#region src/core/physics/gravity.ts
var Zt = s;
function Qt(e) {
	return Zt / e ** 2;
}
function $t(e) {
	return Math.sqrt(Zt / e);
}
function D(e, t, n = 0) {
	return tn(e, t, n) ** 2 / e - Qt(e);
}
function en(e, t = 0) {
	return -D(e, 0, t);
}
function tn(e, t, n = 0) {
	return n === 0 ? t : t + n * e;
}
function nn(e, t, n = 0) {
	return n === 0 ? t : t - n * e;
}
function rn(e, t, n, r = 0) {
	let i = r === 0 ? t : t + 2 * r * e;
	return -n * i / e;
}
function an(e, t, n, r, i = 0) {
	let a = tn(e, t, i), o = (a ** 2 + n ** 2) / 2 - Zt / e, s = e * a, c = 1 + 2 * o * s ** 2 / Zt ** 2, l = Math.sqrt(Math.max(c, 0)), u = s ** 2 / Zt;
	if (l < 1e-9 || u / (1 + l) > r) return Infinity;
	let d = (e, t) => {
		let n = (u / e - 1) / l, r = Math.acos(Math.min(1, Math.max(-1, n)));
		return t ? r : 2 * Math.PI - r;
	}, f = d(e, n >= 0), p = d(r, !1);
	if (p < f && (p += 2 * Math.PI), !(p > f)) {
		if (i === 0) return 0;
		if (n > 0 && o >= 0) return Infinity;
		let t = cn(e, n, r);
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
var on = .1, sn = 1e6;
function cn(e, t, n) {
	let r = e, i = t, a = -Qt(r), o = 0;
	for (let e = 0; e < sn; e++) {
		let e = r + i * on + .5 * a * on * on;
		if (e <= n) {
			let t = (r - n) / (r - e);
			return o + .5 * (r + n) * t * on;
		}
		let t = -Qt(e);
		i += .5 * (a + t) * on, o += .5 * (r + e) * on, r = e, a = t;
	}
	return Infinity;
}
//#endregion
//#region src/core/rng.ts
function ln(e) {
	return {
		seed: e >>> 0,
		counters: {
			ignitionDelay: 0,
			ignitionFailure: 0,
			turbulence: 0
		}
	};
}
function un(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n++) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return t >>> 0;
}
var dn = {
	ignitionDelay: un("ignitionDelay"),
	ignitionFailure: un("ignitionFailure"),
	turbulence: un("turbulence")
};
function fn(e) {
	let t = e >>> 0;
	return t = Math.imul(t ^ t >>> 16, 569420461), t = Math.imul(t ^ t >>> 15, 3545902487), (t ^ t >>> 15) >>> 0;
}
function pn(e, t, n) {
	let r = dn[t], i = fn(e >>> 0 ^ r);
	return i = fn(i ^ n >>> 0), i = fn(i ^ Math.imul(n >>> 0, 2654435769)), i >>> 0;
}
function mn(e, t, n) {
	return pn(e.seed, t, n) / 4294967296;
}
function hn(e, t) {
	let n = mn(e, t, e.counters[t]);
	return e.counters[t] += 1, n;
}
//#endregion
//#region src/core/physics/wind.ts
var gn = 18.3, _n = .52, vn = 2, yn = 1, bn = .3048, xn = 20 * bn, Sn = 10 * bn, Cn = 1e3 * bn;
function wn(e) {
	return _n * Math.max(Math.abs(e), vn) ** -.75;
}
function Tn(e, t) {
	return e === 0 ? 0 : e * (Math.min(Math.max(t, yn), 150) / gn) ** wn(e);
}
function O(e, t) {
	return Tn(e.wind, t) + e.gust;
}
function En(e, t, n) {
	let r = Math.min(Math.max(t, Sn), Cn) / bn, i = .177 + 823e-6 * r, a = .1 * Math.abs(e);
	return n.sigmaW = a, n.sigmaU = a / i ** .4, n.lengthW = r * bn, n.lengthU = r / i ** 1.2 * bn, n;
}
var Dn = {
	sigmaU: 0,
	sigmaW: 0,
	lengthU: 0,
	lengthW: 0
}, On = Math.sqrt(3), kn = 2;
function An(e, t, n, r, i, a) {
	if (e.wind === 0) return;
	En(Tn(e.wind, xn), n, Dn);
	let o = Math.hypot(r - Tn(e.wind, n), i), s = Math.sqrt(-2 * Math.log(1 - hn(t, "turbulence"))), c = 2 * Math.PI * hn(t, "turbulence"), l = s * Math.cos(c), u = s * Math.sin(c), d = Math.exp(-o * a / Dn.lengthU);
	e.turbulenceU = d * e.turbulenceU + Math.sqrt(1 - d * d) * l;
	let f = Math.exp(-o * a / Dn.lengthW), p = e.turbulenceW1;
	e.turbulenceW1 = f * p + Math.sqrt(1 - f * f) * u, e.turbulenceW2 = f * e.turbulenceW2 + (1 - f) * p, e.gust = Dn.sigmaU * e.turbulenceU, e.gustVertical = Dn.sigmaW / Math.sqrt(kn) * (On * e.turbulenceW1 + (1 - On) * e.turbulenceW2);
}
E.tankBottom, E.propellantCapacity, E.loxTankHeight, E.ch4TankHeight, E.ch4TankBottom, E.dryCentreOfMass, E.aftFinStation, E.rcsStation, E.frontFinStation;
function jn(e, t = E) {
	return Math.min(1, Math.max(0, e / t.propellantCapacity));
}
function Mn(e, t = E) {
	let n = jn(e, t), r = t.tankBottom + n * t.loxTankHeight / 2, i = t.ch4TankBottom + n * t.ch4TankHeight / 2;
	return Pe * r + (1 - Pe) * i;
}
function Nn(e, t = E) {
	let n = Math.max(0, e);
	return (t.dryMass * t.dryCentreOfMass + n * Mn(n, t)) / (t.dryMass + n);
}
function Pn(e, t, n) {
	return e * ((n.diameter / 2) ** 2 / 4 + t ** 2 / 12);
}
function Fn(e, t = E) {
	let n = Math.max(0, e), r = Nn(n, t), i = jn(n, t), a = Pn(t.dryMass, t.height, t) + t.dryMass * (t.dryCentreOfMass - r) ** 2, o = n * Pe, s = i * t.loxTankHeight, c = t.tankBottom + s / 2, l = Pn(o, s, t) + o * (c - r) ** 2, u = n * (1 - Pe), d = i * t.ch4TankHeight, f = t.ch4TankBottom + d / 2, p = Pn(u, d, t) + u * (f - r) ** 2;
	return a + l + p;
}
function In(e, t = E.height) {
	return (e ** 4 + (t - e) ** 4) / 4;
}
function Ln(e, t, n = E) {
	let r = Nn(e, n);
	t.centreOfMassX = 0, t.centreOfMass = r, t.momentOfInertia = Fn(e, n), t.engineArm = r, t.aftFinArm = r - n.aftFinStation, t.frontFinArm = n.frontFinStation - r, t.rcsArm = n.rcsStation - r, t.rCubedIntegral = In(r, n.height);
}
function Rn(e = 0, t = E) {
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
	return Ln(e, n, t), n;
}
//#endregion
//#region src/core/physics/grid-fins.ts
function zn() {
	return {
		forceX: 0,
		forceY: 0,
		torque: 0,
		drag: 0,
		lift: 0
	};
}
function Bn(e, t, n, r, i, a, o, s) {
	s.forceX = s.forceY = s.torque = s.drag = s.lift = 0;
	let c = o.gridFins, l = Math.hypot(t, n);
	if (!c || e <= 0 || l === 0 || r === 0) return;
	let u = Math.max(-c.maxAngle, Math.min(c.maxAngle, r)), d = .5 * e * l * l * c.area;
	s.lift = d * Math.sin(2 * u), s.drag = d * 1.2 * Math.sin(u) ** 2, s.forceX = (-n * s.lift - t * s.drag) / l, s.forceY = (t * s.lift - n * s.drag) / l, s.torque = (c.station - a) * (Math.cos(i) * s.forceX - Math.sin(i) * s.forceY);
}
//#endregion
//#region src/core/physics/damage-material.ts
var Vn = 7920, Hn = 293.15, k = 1473.15;
function Un(e) {
	if (!Number.isFinite(e) || e < 4 || e > 1473.15) throw RangeError("304 thermal temperature must be within4–1473.15K");
}
var Wn = [
	22.0061,
	-127.5528,
	303.647,
	-381.0098,
	274.0328,
	-112.9212,
	24.7593,
	-2.239153
], Gn = [
	-1.4087,
	1.3982,
	.2543,
	-.626,
	.2334,
	.4256,
	-.4658,
	.165,
	-.0199
], Kn = 273.15, qn = 20, Jn = .0625, Yn = Math.ceil(269.15 / Jn), A = /* @__PURE__ */ new Float64Array(4308), Xn = /* @__PURE__ */ new Float64Array(4308);
function Zn(e, t) {
	let n = Math.log10(e), r = 0;
	for (let e = t.length - 1; e >= 0; e--) r = r * n + t[e];
	return 10 ** r;
}
function Qn(e) {
	return Math.min(Kn, 4 + e * Jn);
}
for (let e = 0; e <= Yn; e++) {
	let t = Qn(e);
	if (A[e] = Zn(t, Wn), e > 0) {
		let n = t - Qn(e - 1);
		Xn[e] = Xn[e - 1] + n * (A[e - 1] + A[e]) / 2;
	}
}
function $n(e) {
	return 6.683 + .04906 * e + 80.74 * Math.log(e);
}
function er(e) {
	return 9.705 + .0176 * e - 16e-7 * e ** 2;
}
var tr = A[Yn], nr = $n(Hn), rr = Zn(Kn, Gn), ir = er(Hn), ar = qn * (tr + nr) / 2, or = -Xn[Yn] - ar;
function sr(e) {
	return Math.min(4306, Math.floor((e - 4) / Jn));
}
function cr(e) {
	return (e - Kn) / qn;
}
function lr(e, t, n) {
	return e + (t - e) * n ** 2 * (3 - 2 * n);
}
function ur(e) {
	if (Un(e), e >= 293.15) return $n(e);
	if (e >= Kn) return lr(tr, nr, cr(e));
	let t = sr(e), n = (e - Qn(t)) / (Qn(t + 1) - Qn(t));
	return A[t] + n * (A[t + 1] - A[t]);
}
function dr(e) {
	return Un(e), e >= 293.15 ? er(e) : e >= Kn ? lr(rr, ir, cr(e)) : Zn(e, Gn);
}
function fr(e) {
	return 6.683 * e + .02453 * e ** 2 + 80.74 * (e * Math.log(e) - e);
}
var pr = fr(Hn), mr = fr(k) - pr;
function hr(e) {
	if (e >= 293.15) return fr(e) - pr;
	if (e >= Kn) {
		let t = cr(e);
		return -ar + qn * (tr * t + (nr - tr) * (t ** 3 - t ** 4 / 2));
	}
	let t = sr(e), n = e - Qn(t), r = Qn(t + 1) - Qn(t), i = (A[t + 1] - A[t]) / r;
	return or + Xn[t] + A[t] * n + i * n ** 2 / 2;
}
function gr(e) {
	return Un(e), hr(e);
}
function _r(e) {
	let t = 4, n = k;
	for (let r = 0; r < 48; r++) {
		let r = (t + n) / 2;
		hr(r) < e ? t = r : n = r;
	}
	return (t + n) / 2;
}
function vr(e) {
	if (e < -ar) {
		let t = 0, n = Yn;
		for (; n - t > 1;) {
			let r = Math.floor((t + n) / 2);
			or + Xn[r] <= e ? t = r : n = r;
		}
		let r = Qn(t + 1) - Qn(t), i = A[t], a = (A[t + 1] - i) / r, o = e - (or + Xn[t]), s = 2 * o / (i + Math.sqrt(i * i + 2 * a * o));
		return Qn(t) + s;
	}
	let t = e < 0 ? Kn : Hn, n = e < 0 ? Hn : k, r = e < 0 ? -ar : 0, i = e < 0 ? 0 : mr, a = t + (n - t) * (e - r) / (i - r);
	for (let r = 0; r < 6; r++) {
		let r = hr(a);
		if (r === e) break;
		r < e ? t = a : n = a;
		let i = a - (r - e) / ur(a);
		if (i === a) break;
		a = i > t && i < n ? i : (t + n) / 2;
	}
	return a;
}
function yr(e) {
	if (!Number.isFinite(e) || e < or || e > mr) throw RangeError("304 specific enthalpy is outside the thermal fit domain");
	if (e === 0) return Hn;
	if (e === or) return 4;
	if (e === mr) return k;
	let t = vr(e), n = 4, r = k, i = n, a = r;
	for (let e = 0; e < 48; e++) {
		let o = (n + r) / 2;
		o < t ? n = o : r = o, e === 39 && (i = n, a = r);
	}
	if (hr(n) < e && hr(r) >= e) return (n + r) / 2;
	if (hr(i) < e && hr(a) >= e) {
		n = i, r = a;
		for (let t = 40; t < 48; t++) {
			let t = (n + r) / 2;
			hr(t) < e ? n = t : r = t;
		}
		return (n + r) / 2;
	}
	return _r(e);
}
var br = [
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
function xr(e, t) {
	if (!Number.isFinite(e) || e <= 0) throw RangeError("304 mechanical temperature must be finite and positiveK");
	if (e > 1173.15) return 0;
	let n = 373.15, r = br[0][t];
	if (e <= n) return r;
	for (let i of br) {
		if (e <= i[0]) {
			let a = (e - n) / (i[0] - n);
			return r + a * (i[t] - r);
		}
		n = i[0], r = i[t];
	}
	return 0;
}
function Sr(e) {
	return xr(e, 1);
}
function Cr(e) {
	return xr(e, 2);
}
//#endregion
//#region src/core/physics/tps-material.ts
var wr = 116.483, Tr = 1922.04, Er = 116.667, Dr = 1922.22, Or = 101330, kr = 293.15, j = [
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
], Ar = [
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
], jr = [
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
function Mr(e, t, n) {
	if (!Number.isFinite(e) || e < t || e > n) throw RangeError("LI900 temperature is outside its material property data domain");
}
function Nr(e) {
	if (!Number.isFinite(e) || e < 0 || e > 101330) throw RangeError("LI900 pressure must be within0–101330Pa");
}
var Pr = new Float64Array(j.length);
for (let e = 1; e < j.length; e++) {
	let t = j[e - 1], n = j[e];
	Pr[e] = Pr[e - 1] + (n[0] - t[0]) * (t[1] + n[1]) / 2;
}
function Fr(e) {
	for (let t = 1; t < j.length; t++) if (e < j[t][0]) return t - 1;
	return j.length - 2;
}
function Ir(e) {
	let t = Fr(e), n = j[t], r = j[t + 1];
	if (e === r[0]) return Pr[t + 1];
	let i = e - n[0], a = (r[1] - n[1]) / (r[0] - n[0]);
	return Pr[t] + n[1] * i + a * i ** 2 / 2;
}
var Lr = Ir(kr), Rr = -Lr, zr = Pr[j.length - 1] - Lr;
function Br(e) {
	Mr(e, wr, Tr);
	let t = Fr(e), n = j[t], r = j[t + 1];
	if (e === r[0]) return r[1];
	let i = (e - n[0]) / (r[0] - n[0]);
	return n[1] + i * (r[1] - n[1]);
}
function Vr(e) {
	return Mr(e, wr, Tr), Ir(e) - Lr;
}
function Hr(e) {
	if (!Number.isFinite(e) || e < Rr || e > zr) throw RangeError("LI900 specific enthalpy is outside the heat-capacity data domain");
	if (e === 0) return kr;
	if (e === Rr) return wr;
	if (e === zr) return Tr;
	let t = e + Lr, n = 0, r = j.length - 1;
	for (; r - n > 1;) {
		let e = Math.floor((n + r) / 2);
		Pr[e] <= t ? n = e : r = e;
	}
	let i = j[n], a = j[n + 1], o = (a[1] - i[1]) / (a[0] - i[0]), s = t - Pr[n], c = 2 * s / (i[1] + Math.sqrt(i[1] ** 2 + 2 * o * s));
	return Math.max(i[0], Math.min(a[0], i[0] + c));
}
function Ur(e, t) {
	let n = jr[0];
	if (t <= n[0]) return n[1][e];
	for (let n = 1; n < jr.length; n++) {
		let r = jr[n];
		if (t === r[0]) return r[1][e];
		if (t < r[0]) {
			let i = jr[n - 1], a = Math.log(t / i[0]) / Math.log(r[0] / i[0]);
			return i[1][e] + a * (r[1][e] - i[1][e]);
		}
	}
	return jr[jr.length - 1][1][e];
}
function Wr(e, t) {
	for (let n = 1; n < Ar.length; n++) {
		let r = Ar[n];
		if (e === r) return Ur(n, t);
		if (e < r) {
			let i = Ar[n - 1], a = Ur(n - 1, t), o = Ur(n, t);
			return a + (e - i) / (r - i) * (o - a);
		}
	}
	return Ur(Ar.length - 1, t);
}
function Gr(e, t) {
	return Mr(e, Er, Dr), Nr(t), Wr(e, t);
}
function Kr(e, t, n) {
	if (Mr(e, Er, Dr), Mr(t, Er, Dr), Nr(n), e === t) return Wr(e, n);
	let r = Math.min(e, t), i = Math.max(e, t), a = 0;
	for (let e = 1; e < Ar.length; e++) {
		let t = Math.max(r, Ar[e - 1]), o = Math.min(i, Ar[e]);
		o > t && (a += (o - t) * (Wr(t, n) + Wr(o, n)) / 2);
	}
	return a / (i - r);
}
var qr = /* @__PURE__ */ function(e) {
	return e[e.None = 0] = "None", e[e.ProofExceeded = 1] = "ProofExceeded", e[e.MaterialDomain = 2] = "MaterialDomain", e[e.Terminal = 3] = "Terminal", e;
}({});
function Jr(e, t) {
	if (!Number.isFinite(e) || !Number.isFinite(t)) throw RangeError("Thermal state requires finite temperature and energy");
	return {
		valid: !0,
		temperature: e,
		energy: t
	};
}
function Yr(t, n) {
	let r = t.components.length;
	if (r < 1 || r > 12) throw RangeError("Damage inventory must contain1–12 components");
	if (!(t.hullThermalMass > 0) || !Number.isFinite(t.hullThermalMass)) throw RangeError("Damage state requires positive finite hull thermal mass");
	let i = gr(n), a = t.components.some((e) => e.tpsMass > 0), o = 0;
	if (a) {
		if (n < 116.667 || n > 1922.04) throw RangeError("TPS ambient temperature is outside its thermal data domains");
		o = Vr(n);
	}
	let s = t.components.map((t, r) => {
		if (!(t.rootMass >= 0 && t.tpsMass >= 0) || !Number.isFinite(t.rootMass + t.tpsMass)) throw RangeError("Invalid component thermal mass");
		let a = t.rootMass > 0 ? Jr(n, t.rootMass * i) : Jr(0, 0), s = () => t.tpsMass > 0 ? Jr(n, t.tpsMass / 2 * o) : Jr(0, 0);
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
		hull: Jr(n, t.hullThermalMass * i),
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
function Xr(e) {
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
function Zr(e) {
	let t = .1 * e, n = .15 * e, r = .05 * e, i = .004;
	if (!(t > 2 * i && n > 2 * i)) throw RangeError("Invalid attachment section");
	let a = t * n - (t - 2 * i) * (n - 2 * i), o = (t * n ** 3 - (t - 2 * i) * (n - 2 * i) ** 3) / 12;
	return Object.freeze({
		area: a,
		inertia: o,
		modulus: 2 * o / n,
		length: r,
		heatArea: t * r,
		mass: Vn * a * r
	});
}
function Qr(e, t) {
	return t === "plate" ? Math.sin(e) : Math.hypot(Math.sin(2 * e), 1.2 * Math.sin(e) ** 2);
}
function $r(e, t, n, r, i, a) {
	let o = Math.abs(e), s = a === "plate" ? Math.PI / 2 : Math.PI / 4;
	if (!Number.isFinite(e) || o > s || t < 0 || n < 0 || !Number.isFinite(t) || !Number.isFinite(n)) throw RangeError("Attachment load outside the monotone force domain");
	let c = Sr(r);
	if (c === 0) return 0;
	if (o === 0 || t === 0 || n === 0) return e;
	let l = t * n * i.length / (c * i.inertia), u = o;
	for (let e = 0; e < 2; e++) {
		let e = Qr(u, a), t = Math.sin(u), n = Math.cos(u), r = a === "plate" ? n : e === 0 ? 2 : (2 * Math.sin(2 * u) * Math.cos(2 * u) + 2.88 * t ** 3 * n) / e;
		if (u -= (u + l * e - o) / (1 + l * r), !(u > 0 && u <= o)) break;
	}
	if (u > 0 && u <= o) {
		let t = 0, n = o;
		for (let e = 0; e < 40; e++) {
			let e = (t + n) / 2;
			e < u ? t = e : n = e;
		}
		if (t + l * Qr(t, a) < o && n + l * Qr(n, a) >= o) return Math.sign(e) * (t + n) / 2;
	}
	let d = 0, f = o;
	for (let e = 0; e < 40; e++) {
		let e = (d + f) / 2;
		e + l * Qr(e, a) < o ? d = e : f = e;
	}
	return Math.sign(e) * (d + f) / 2;
}
function ei(e, t, n) {
	let r = Cr(t) * n.modulus;
	return r === 0 ? Infinity : Math.abs(e) / r;
}
//#endregion
//#region src/core/physics/vehicle-components.ts
var ti = 1525, ni = .004, ri = 144, ii = .0254, ai = 20 * Math.PI / 180;
function oi(e, t, n, r, i) {
	if (!(t > 0 && i > 0) || !Number.isFinite(t + n + r + i)) throw RangeError("Component slice requires positive finite mass and inertia");
	return Object.freeze({
		role: e,
		mass: t,
		x: n,
		station: r,
		inertia: i
	});
}
function si(e, t, n, r, i = 0) {
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
function ci(e, t, n, r, i, a, o, s, c) {
	if (!(n > 0 && r > 0)) throw RangeError("Appendage area and span must be positive");
	let l = n / r, u = Vn * ni * n, d = i * (o + r / 2), f = i * (o + s.length / 2), p = s.heatArea / s.length, m = u * ((r * i) ** 2 + l ** 2) / 12, h = s.mass * ((s.length * i) ** 2 + p ** 2) / 12, g = [oi("structure", u, d, a, m), oi("root", s.mass, f, a, h)];
	if (c) {
		let e = ri * s.heatArea * ii;
		g.push(oi("tps", e, f, a, e * ((s.length * i) ** 2 + p ** 2) / 12));
	}
	return si(e, t, g, {
		x: i * o,
		station: a
	}, r / 2);
}
function li(e) {
	let { height: t, diameter: n, dryMass: r, dryCentreOfMass: i } = e;
	if (!(t > 0 && n > 0 && r > 0 && i > 0 && i < t) || !Number.isFinite(t + n + r + i)) throw RangeError("Invalid intact vehicle mass geometry");
	let a = n / 2, o = e.id === "ship", s = Zr(n), c = [], l = t * (o ? .035 : .03), u = e.engines.length * ti;
	if (c.push(si(`${o ? "ship" : "booster"}-engine-support`, "engine-support", [oi("structure", u, 0, l / 2, u * (a ** 2 / 4 + l ** 2 / 12))])), o) {
		let i = r * .05;
		c.push(si("ship-nose", "nose", [oi("structure", i, 0, t * .87, i * ((.4 * a) ** 2 + (.08 * t) ** 2) / 5)]));
		for (let t of [!0, !1]) for (let r of [-1, 1]) {
			let i = t ? e.frontFinStation : e.aftFinStation;
			c.push(ci(`ship-${t ? "front" : "aft"}-flap-${r < 0 ? "left" : "right"}`, "flap", (t ? e.frontFinArea : e.aftFinArea) / 2, n * (t ? .34 : .46), r, i, a, s, !0));
		}
	} else {
		let i = e.gridFins;
		if (!i || !Number.isInteger(i.count) || i.count < 3) throw RangeError("Booster component partition requires a grid inventory");
		let o = r * .02;
		c.push(si("booster-hot-stage", "hot-stage", [oi("structure", o, 0, t * .975, o * (a ** 2 / 2 + (.05 * t) ** 2 / 12))]));
		for (let e = 0; e < i.count; e++) c.push(ci(`booster-grid-${e}`, "grid-fin", i.area / i.count, n * .46, Math.sin(ai + e * 2 * Math.PI / i.count), i.station, a, s, !1));
	}
	for (let e of c) if (!(e.station >= 0 && e.station <= t)) throw RangeError("Component centroid outside the hull");
	let d = r - c.reduce((e, t) => e + t.mass, 0);
	if (!(d > 0)) throw RangeError("No positive hull mass remains");
	let f = (r * i - c.reduce((e, t) => e + t.mass * t.station, 0)) / d, p = -c.reduce((e, t) => e + t.mass * t.x, 0) / d, m = r * (a ** 2 / 4 + t ** 2 / 12), h = (m - c.reduce((e, t) => e + t.inertia + t.mass * (t.x ** 2 + (t.station - i) ** 2), 0) - d * (p ** 2 + (f - i) ** 2)) / d - a ** 2 / 4, g = t * (o ? .055 : .05), _ = t * (o ? .72 : .93), v = t * (o ? .3 : .5), y = (f - g) * (_ - f);
	if (!(f > g && f < _ && h > 0 && h < y)) throw RangeError("Hull residual moments have no positive supported partition");
	let ee = h / y, b = d * ee * (_ - f) / (_ - g), te = d * ee * (f - g) / (_ - g), x = d - b - te, S = [
		oi("structure", b, p, g, b * a ** 2 / 4),
		oi("structure", x, p, f, x * a ** 2 / 4),
		oi("structure", te, p, _, te * a ** 2 / 4)
	], ne = o ? "ship" : "booster", C = si(`${ne}-hull-aft`, "hull", S.filter((e) => e.station < v)), re = si(`${ne}-hull-forward`, "hull", S.filter((e) => e.station >= v));
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
var ui = 4096, di = .8, fi = 8, pi = .0254, mi = pi / 2, hi = pi / 4, gi = Math.max(wr, Er), _i = Math.min(Tr, Dr), vi = di * ue, yi = gr(4), bi = gr(k), xi = Vr(gi), Si = Vr(_i);
function Ci(e) {
	let t = e.components.length, n = e.rootSection;
	if (t < 1 || t > 12 || !(e.hullThermalMass > 0 && n.area > 0 && n.length > 0 && n.heatArea > 0) || !Number.isFinite(e.hullThermalMass + n.area + n.length + n.heatArea)) throw RangeError("Invalid thermal catalogue geometry/inventory");
	let r = ur(4), i = dr(k), a = Br(wr), o = Gr(Dr, Or), s = n.length / 2, c = n.area / s, l = s / n.area, u = i * c, d = 4 * vi * n.heatArea * k ** 3, f = 4 * vi * n.heatArea * _i ** 3, p = [], m = Infinity, h = 0;
	for (let s = 0; s < t; s++) {
		let t = e.components[s];
		if (!(t.rootMass >= 0 && t.tpsMass >= 0) || !Number.isFinite(t.rootMass + t.tpsMass)) throw RangeError("Invalid component thermal masses");
		if (t.rootMass === 0) {
			if (t.tpsMass > 0) throw RangeError("TPS column requires a finite root");
			continue;
		}
		let g = t.tpsMass / 2, _ = t.rootMass * r;
		if (g > 0) {
			let e = o * n.heatArea / mi, t = 1 / (hi / (o * n.heatArea) + l / i), r = g * a;
			m = Math.min(m, r / (e + f), r / (e + t), _ / (t + u));
		} else m = Math.min(m, _ / (u + d));
		h += u, p.push(Object.freeze({
			componentIndex: s,
			rootMass: t.rootMass,
			tpsCellMass: g,
			heatArea: n.heatArea,
			steelPathRatio: c,
			steelResistanceRatio: l,
			rootMinEnergy: t.rootMass * yi,
			rootMaxEnergy: t.rootMass * bi,
			tpsMinEnergy: g * xi,
			tpsMaxEnergy: g * Si
		}));
	}
	return h > 0 && (m = Math.min(m, e.hullThermalMass * r / h)), Object.freeze({
		componentCount: t,
		columns: Object.freeze(p),
		hullMass: e.hullThermalMass,
		hullMinEnergy: e.hullThermalMass * yi,
		hullMaxEnergy: e.hullThermalMass * bi,
		safeStep: m
	});
}
function wi(e, t, n) {
	if (!Number.isFinite(e.temperature) || e.temperature < t || e.temperature > n || !Number.isFinite(e.energy)) throw RangeError("Valid thermal node has invalid temperature/energy");
}
function Ti(e, t, n, r, i, a) {
	return e.energy += t, !Number.isFinite(e.energy) || e.energy < r || e.energy > i ? (e.valid = !1, !1) : (t !== 0 && (e.temperature = e.energy === r ? a ? gi : 4 : e.energy === i ? a ? _i : k : a ? Hr(e.energy / n) : yr(e.energy / n)), !0);
}
function Ei(e, t, n, r, i, a) {
	if (!Number.isFinite(n) || n < 0 || n > t.safeStep * fi || !Number.isFinite(r) || r < 0 || !Number.isFinite(i) || i < 186 || i > 1473.15 || !Number.isFinite(a) || a < 0 || a > 101330 || e.components.length !== t.componentCount) throw RangeError("Thermal forcing/inventory outside the supported numerical contract");
	let o = e.hull.valid ? 0 : ui;
	for (let n of t.columns) {
		let t = e.components[n.componentIndex];
		if (t.componentIndex !== n.componentIndex) throw RangeError("Thermal catalogue identity mismatch");
		t.attached && (!t.root.valid || n.tpsCellMass > 0 && (!t.tps[0].valid || !t.tps[1].valid)) && (o |= 1 << n.componentIndex);
	}
	if (o !== 0 || n === 0) return o;
	wi(e.hull, 4, k);
	for (let n of t.columns) {
		let t = e.components[n.componentIndex];
		t.attached && (wi(t.root, 4, k), n.tpsCellMass > 0 && (wi(t.tps[0], gi, _i), wi(t.tps[1], gi, _i)));
	}
	let s = Math.min(fi, Math.max(1, Math.ceil(n / t.safeStep))), c = n / s, l = i ** 4;
	for (let n = 0; n < s; n++) {
		let n = e.hull.temperature, i = dr(n), s = 0;
		for (let u of t.columns) {
			let t = e.components[u.componentIndex];
			if (!t.attached) continue;
			let d = t.root.temperature, f = dr(d), p = c * (f + i) / 2 * u.steelPathRatio * (d - n);
			s += p;
			let m = -p, h = !0;
			if (u.tpsCellMass > 0) {
				let e = t.tps[0], n = t.tps[1], i = e.temperature, o = n.temperature, s = c * Kr(i, o, a) * u.heatArea / mi * (i - o), p = c * (o - d) / (hi / (Gr(o, a) * u.heatArea) + u.steelResistanceRatio / f), g = c * u.heatArea * (r - vi * (i ** 4 - l));
				m += p, h = Ti(e, g - s, u.tpsCellMass, u.tpsMinEnergy, u.tpsMaxEnergy, !0), Ti(n, s - p, u.tpsCellMass, u.tpsMinEnergy, u.tpsMaxEnergy, !0) || (h = !1);
			} else m += c * u.heatArea * (r - vi * (d ** 4 - l));
			Ti(t.root, m, u.rootMass, u.rootMinEnergy, u.rootMaxEnergy, !1) || (h = !1), h || (o |= 1 << u.componentIndex);
		}
		if (Ti(e.hull, s, t.hullMass, t.hullMinEnergy, t.hullMaxEnergy, !1) || (o |= ui), o !== 0) return o;
	}
	return 0;
}
//#endregion
//#region src/core/physics/damage-controls.ts
function Di(e, t) {
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
function Oi(e) {
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
function ki(e, t, n, r, i) {
	if (!(n >= 0 && r >= 0 && r <= 1) || !Number.isFinite(n) || e.components.length !== t.componentCount || i.loadedAngles.length < t.componentCount) throw RangeError("Invalid component control forcing or inventory");
}
function Ai(e, t, n, r, i, a, o) {
	ki(e, t, n, r, o), o.frontArea = o.aftArea = o.gridLiftArea = o.gridDragArea = 0, o.frontFraction = o.aftFraction = 0, o.proofMask = o.domainMask = 0, o.loadedAngles.fill(0);
	for (let s of t.columns) {
		let c = e.components[s.index];
		if (!c.attached || c.permanentFailure !== qr.None) continue;
		if (!c.root.valid || Cr(c.root.temperature) === 0) {
			o.domainMask |= 1 << s.index;
			continue;
		}
		let l = s.group === "grid", u = s.group === "aft" ? a : i, d = n * s.area * (l ? 1 : 2 * r), f = l ? "grid" : "plate", p = $r(u, d, s.lever, c.root.temperature, t.root, f);
		if (o.loadedAngles[s.index] = p, ei(d * Qr(Math.abs(p), f) * s.lever, c.root.temperature, t.root) > 1) {
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
function ji(e, t) {
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
var Mi = {
	airDensity: 0,
	airTemperature: 0,
	airPressure: 0
};
function Ni(e, t, n) {
	if (!(t >= 0 && n >= 0) || !Number.isFinite(t + n)) throw RangeError("Debris drag requires finite nonnegative coefficient and time");
	let r = Math.hypot(e.speedX, e.speedY), i = 1 / (1 + t * r * n);
	return e.speedX *= i, e.speedY *= i, -.5 * r * r * (1 - i) * (1 + i);
}
function Pi(e, t, n) {
	gt(e.altitude, Mi);
	let r = Et(Math.hypot(e.speedX, e.speedY) / bt(Mi.airTemperature));
	Ni(e, Mi.airDensity * r * t.dragMultiplier * t.dragArea / (2 * t.mass), n);
}
function Fi(t, n, r) {
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
		Pi(o, s, r / 2);
		let c = o.x, l = o.altitude, u = o.speedX, d = o.speedY, f = a + l, p = rn(f, u, d), m = D(f, u), h = c + u * r + .5 * p * r * r, g = l + d * r + .5 * m * r * r;
		if (g <= s.supportRadius) {
			let t = (l - s.supportRadius) / (l - g);
			o.x = c + (h - c) * t, o.altitude = s.supportRadius, o.pitch = e(o.pitch + o.angularVelocity * r * t), o.speedX = o.speedY = o.angularVelocity = 0;
			continue;
		}
		let _ = a + g;
		o.x = h, o.altitude = g, o.speedX = u + .5 * (p + rn(_, u + p * r, d + m * r)) * r, o.speedY = d + .5 * (m + D(_, u + p * r)) * r, o.pitch = e(o.pitch + o.angularVelocity * r), Pi(o, s, r / 2);
	}
}
//#endregion
//#region src/core/physics/damage-model.ts
var Ii = /* @__PURE__ */ new WeakMap();
function M(e) {
	let t = Ii.get(e);
	if (t) return t;
	let n = li(e), r = Object.freeze({
		partition: n,
		thermal: Ci(n),
		controls: Di(n, e),
		debris: ji(n, e)
	});
	return Ii.set(e, r), r;
}
//#endregion
//#region src/core/physics/damage-mass.ts
function N() {
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
function Li(e, t, n, r, i) {
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
		i.retainedDryMass += c.mass, o += c.mass * c.x, s += c.mass * c.station, c.kind === "flap" ? c.id.startsWith("ship-front-flap-") ? i.frontFinCount++ : c.id.startsWith("ship-aft-flap-") && i.aftFinCount++ : c.kind === "grid-fin" ? i.gridFinCount++ : c.kind === "engine-support" && (i.engineSupportAvailable = r.permanentFailure === qr.None);
	}
	if (i.frontFinArea = r.frontFinArea * i.frontFinCount / 2, i.aftFinArea = r.aftFinArea * i.aftFinCount / 2, i.gridFinArea = r.gridFins ? r.gridFins.area * i.gridFinCount / r.gridFins.count : 0, a) {
		i.retainedDryMass = r.dryMass, i.dryCentreOfMassX = t.dryCentreOfMassX, i.dryCentreOfMass = r.dryCentreOfMass, i.dryMomentOfInertia = t.dryMomentOfInertia, i.totalMass = r.dryMass + i.propellantMass, i.hasMass = !0, i.centreOfMassX = 0, i.centreOfMass = Nn(i.propellantMass, r), i.momentOfInertia = Fn(i.propellantMass, r);
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
function P(e, t, n, r) {
	if (e.damage ? Li(e.damage, M(t).partition, e.vehicle.propellantMass, t, n) : (n.hasMass = !0, n.retainedDryMass = t.dryMass, n.propellantMass = Math.max(0, e.vehicle.propellantMass), n.totalMass = t.dryMass + n.propellantMass, n.dryCentreOfMassX = n.centreOfMassX = 0, n.dryCentreOfMass = t.dryCentreOfMass, n.dryMomentOfInertia = t.dryMass * ((t.diameter / 2) ** 2 / 4 + t.height ** 2 / 12), n.centreOfMass = Nn(n.propellantMass, t), n.momentOfInertia = Fn(n.propellantMass, t), n.frontFinCount = t.frontFinArea > 0 ? 2 : 0, n.aftFinCount = t.aftFinArea > 0 ? 2 : 0, n.gridFinCount = t.gridFins?.count ?? 0, n.frontFinArea = t.frontFinArea, n.aftFinArea = t.aftFinArea, n.gridFinArea = t.gridFins?.area ?? 0, n.engineSupportAvailable = !0), r) {
		if (!e.damage) {
			Ln(e.vehicle.propellantMass, r, t);
			return;
		}
		r.centreOfMassX = n.centreOfMassX, r.centreOfMass = n.centreOfMass, r.momentOfInertia = n.momentOfInertia, r.engineArm = n.centreOfMass, r.aftFinArm = n.centreOfMass - t.aftFinStation, r.frontFinArm = t.frontFinStation - n.centreOfMass, r.rcsArm = t.rcsStation - n.centreOfMass, r.rCubedIntegral = In(n.centreOfMass, t.height);
	}
}
//#endregion
//#region src/core/physics/damage-detachment.ts
function Ri() {
	return {
		before: N(),
		after: N()
	};
}
function zi(e, t, n, r, i, a, o, s) {
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
	if (o !== qr.ProofExceeded && o !== qr.MaterialDomain && o !== qr.Terminal) throw RangeError("Detachment requires a permanent connection disposition");
	if (Li(e, t, r, n, s.before), !s.before.hasMass) throw RangeError("Cannot detach from an empty physical owner");
	let d = s.before, f = Math.cos(i.pitch), p = Math.sin(i.pitch);
	for (let n = 0; n < c; n++) if (l & 1 << n) {
		let r = t.components[n], a = e.components[n], s = e.debris[n], c = r.x - d.centreOfMassX, l = r.station - d.centreOfMass, u = f * c + p * l, m = -p * c + f * l;
		s.x = i.x + u, s.altitude = i.altitude + m, s.pitch = i.pitch, s.speedX = i.vx + i.omega * m, s.speedY = i.vy - i.omega * u, s.angularVelocity = i.omega, s.active = !0, a.attached = !1, a.permanentFailure === qr.None && (a.permanentFailure = o);
	}
	if (Li(e, t, r, n, s.after), s.after.hasMass) {
		let e = s.after.centreOfMassX - d.centreOfMassX, t = s.after.centreOfMass - d.centreOfMass, n = f * e + p * t, r = -p * e + f * t;
		i.x += n, i.altitude += r, i.vx += i.omega * r, i.vy -= i.omega * n;
	}
	return e.revision++, e.eventCount += u, l;
}
//#endregion
//#region src/core/physics/thermal.ts
function Bi(e, t, n) {
	return le * e ** 3 * Math.sqrt(t / n);
}
function Vi(e, t, n, r) {
	let i = 1 - Math.abs(Math.sin(r)) * (1 - Math.SQRT1_2);
	return Bi(e, t, n) * i;
}
function Hi(e, t = 0) {
	return (Math.max(0, e) / (de * ue) + t ** 4) ** .25;
}
var Ui = ot($e).airTemperature + pe;
function Wi(e, t) {
	return e < 86e3 ? t + pe : Ui;
}
//#endregion
//#region src/core/physics/damage-terminal.ts
var Gi = /* @__PURE__ */ function(e) {
	return e[e.Impact = 1] = "Impact", e[e.Pressure = 2] = "Pressure", e[e.Temperature = 4] = "Temperature", e[e.Acceleration = 8] = "Acceleration", e[e.MaterialDomain = 16] = "MaterialDomain", e;
}({}), Ki = N(), qi = Ri(), F = {
	x: 0,
	altitude: 0,
	pitch: e(0),
	vx: 0,
	vy: 0,
	omega: 0
};
function Ji(e) {
	let t = e.forces;
	e.engines.running.fill(!1), e.engines.ignitionCountdown.fill(null), t.thrust = t.thrustAcceleration = t.twr = 0, t.paidThrustAccelerationX = t.paidThrustAccelerationY = 0, t.thrustVectorForce = t.thrustVectorAcceleration = 0, t.offAxisThrustDifferenceAcceleration = 0, t.rcsThrust = t.rcsThrustAngularAcceleration = 0;
}
function Yi(e, t, n, r) {
	let i = e.damage;
	if (!i || i.terminal.active) return;
	let a = M(t).partition, o = e.kinematics;
	Li(i, a, e.vehicle.propellantMass, t, Ki);
	let s = Math.sin(o.pitch), c = Math.cos(o.pitch), l = Ki.centreOfMassX, u = Ki.centreOfMass - t.height / 2, d = c * l + s * u, f = -s * l + c * u;
	F.x = o.downRangeDistance + d, F.altitude = o.altitude + f, F.pitch = o.pitch, F.omega = o.angularVelocity, F.vx = o.speedX + F.omega * f, F.vy = o.speedY - F.omega * d;
	let p = i.terminal;
	p.reason = n, p.time = r, p.x = F.x, p.altitude = F.altitude, p.pitch = F.pitch, p.speedX = F.vx, p.speedY = F.vy, p.angularVelocity = F.omega, p.retainedDryMass = Ki.retainedDryMass, p.retainedPropellant = Ki.propellantMass, p.releasedEnergy = 0;
	let m = (1 << a.components.length) - 1;
	zi(i, a, t, e.vehicle.propellantMass, F, m, qr.Terminal, qi), Li(i, a, e.vehicle.propellantMass, t, Ki);
	let h = Ki.totalMass;
	p.releasedMomentumX = h * F.vx, p.releasedMomentumY = h * F.vy, p.releasedAngularMomentum = Ki.momentOfInertia * F.omega + (F.altitude - p.altitude) * p.releasedMomentumX - (F.x - p.x) * p.releasedMomentumY, p.releasedKineticEnergy = .5 * h * (F.vx ** 2 + F.vy ** 2) + .5 * Ki.momentOfInertia * F.omega ** 2, e.engines.running.fill(!1), e.engines.failed.fill(!0), e.engines.ignitionCountdown.fill(null), e.vehicle.propellantMass = 0, e.vehicle.vehicleMass = 0, e.vehicle.vehicleMomentOfInertia = 0, p.active = !0;
}
function Xi(e) {
	return (e.forces.perceivedG > 13 ? 8 : 0) | (e.forces.surfaceTemperature > 1533 ? 4 : 0) | (e.forces.dynamicPressure > 50 ? 2 : 0) | (e.damage && !e.damage.hull.valid ? 16 : 0);
}
//#endregion
//#region src/core/physics/damage-flight.ts
var Zi = N(), I = Oi(12);
function Qi(e, t, n) {
	P(e, t, Zi, n), e.vehicle.vehicleMass = Zi.totalMass, (e.damage || n) && (e.vehicle.vehicleMomentOfInertia = Zi.momentOfInertia);
}
function $i(e, t) {
	e.damage && (Li(e.damage, M(t).partition, e.vehicle.propellantMass, t, Zi), !Zi.engineSupportAvailable && (e.engines.running.fill(!1), e.engines.failed.fill(!0), e.engines.ignitionCountdown.fill(null)));
}
function ea(e, t, n, r, i) {
	let a = t.gridFins ? i ?? (e.vehicle.frontFinExtension - 50) / 50 * t.gridFins.maxAngle : e.vehicle.frontFinExtension * .01 * w;
	Ai(e.damage, M(t).controls, n, r, a, e.vehicle.aftFinExtension * .01 * w, I);
}
function ta(t, n, r, i) {
	if (t.damage) {
		ea(t, n, r, i);
		for (let n = 0; n < t.damage.components.length; n++) {
			let r = t.damage.components[n];
			r.attached && (r.loadedAngle = e(I.loadedAngles[n]));
		}
		t.forces.frontFinEffectiveAreaFraction = I.frontFraction, t.forces.aftFinEffectiveAreaFraction = I.aftFraction, t.vehicle.vehicleInFlightMaxArea = n.maxArea + 1.8 * (I.frontArea + I.aftArea);
	}
}
function na(t, n, r, i, a, o, s, c, l) {
	if (!t.damage) {
		Bn(n, r, i, l ?? e((t.vehicle.frontFinExtension - 50) / 50 * (s.gridFins?.maxAngle ?? 0)), a, o.centreOfMass, s, c);
		return;
	}
	c.forceX = c.forceY = c.torque = c.drag = c.lift = 0;
	let u = s.gridFins, d = Math.hypot(r, i);
	if (!u || n <= 0 || d === 0) return;
	let f = .5 * n * d * d;
	ea(t, s, f, 0, l);
	let p = M(s).partition.components, m = Math.sin(a), h = Math.cos(a);
	for (let e = 0; e < p.length; e++) {
		let n = p[e];
		if (n.kind !== "grid-fin" || !t.damage.components[e].attached || (I.proofMask | I.domainMask) & 1 << e) continue;
		let a = I.loadedAngles[e], s = f * u.area / u.count * Math.sin(2 * a), l = f * u.area / u.count * 1.2 * Math.sin(a) ** 2, g = (-i * s - r * l) / d, _ = (r * s - i * l) / d, v = n.x - o.centreOfMassX, y = n.station - o.centreOfMass, ee = h * v + m * y, b = -m * v + h * y;
		c.forceX += g, c.forceY += _, c.lift += s, c.drag += l, c.torque += b * g - ee * _;
	}
}
var ra = Ri(), L = {
	x: 0,
	altitude: 0,
	pitch: e(0),
	vx: 0,
	vy: 0,
	omega: 0
};
function ia(t, n, r, i) {
	let a = t.damage;
	if (!a || a.terminal.active) return 0;
	let o = M(r), s = Ei(a, o.thermal, n, t.forces.thermalPower, Wi(t.kinematics.altitude, t.atmosphere.airTemperature), t.atmosphere.airPressure * 1e3), c = Xi(t);
	if (c !== 0) {
		if (i !== "hull") throw RangeError("Terminal live state must publish its hull reference");
		return Yi(t, r, c, t.world.environmentTime + n), s;
	}
	ea(t, r, t.forces.dynamicPressure * 1e3, Math.abs(Math.sin(t.kinematics.angleInToTheWind)));
	let l = s & ~ui | I.domainMask, u = I.proofMask & ~l;
	for (let t = 0; t < a.components.length; t++) {
		let n = a.components[t];
		n.attached && !(l & 1 << t) && (n.loadedAngle = e(I.loadedAngles[t]));
	}
	if ((l | u) === 0) return s;
	Li(a, o.partition, t.vehicle.propellantMass, r, Zi);
	let d = t.kinematics, f = Math.sin(d.pitch), p = Math.cos(d.pitch), m = i === "hull" ? Zi.centreOfMassX : 0, h = i === "hull" ? Zi.centreOfMass - r.height / 2 : 0, g = p * m + f * h, _ = -f * m + p * h;
	L.x = d.downRangeDistance + g, L.altitude = d.altitude + _, L.pitch = d.pitch, L.vx = d.speedX + d.angularVelocity * _, L.vy = d.speedY - d.angularVelocity * g, L.omega = d.angularVelocity;
	let v = a.revision, y = zi(a, o.partition, r, t.vehicle.propellantMass, L, l, qr.MaterialDomain, ra);
	return y |= zi(a, o.partition, r, t.vehicle.propellantMass, L, u, qr.ProofExceeded, ra), y !== 0 && (a.revision = v + 1), i === "mass" && (d.downRangeDistance = L.x, d.downRangeDistanceNextFrame = L.x, d.altitude = L.altitude, d.speedX = L.vx, d.speedY = L.vy), Qi(t, r), $i(t, r), y | s & ui;
}
//#endregion
//#region src/core/control/guidance-physics.ts
var aa = .1;
function oa(e) {
	let t = a + e.kinematics.altitude;
	return Math.max(aa, -D(t, e.kinematics.speedX));
}
function sa(e, t, n = E) {
	return e * T(n.propulsion, "sea-level", t);
}
function ca() {
	return {
		fallWork: Oa(),
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
function la(t, n, r, i, a = E) {
	let o = i.atmosphere;
	gt(t, o);
	let s = n / bt(o.airTemperature);
	return Ct(o.airDensity, n, St(e(0), a.maxArea, a), Et(s)) / r;
}
var ua = .05, da = 1200;
function fa(e, t, n, r, i, a) {
	let o = e * Oe(a.propulsion, "sea-level"), s = ua * .5, c = r, l = 0, u = t;
	i.capped = !1;
	for (let t = 0; t < da; t++) {
		let r = pa(e, c, l, u, i, a), d = l + r * s, f = pa(e, c + (l + d) * .5 * s, d, u + o * s, i, a);
		if (f <= 0) return NaN;
		let p = l + f * ua;
		if (p >= n) {
			let e = (n - l) / (p - l);
			return i.duration = (t + e) * ua, c + (l + .5 * (n - l)) * e * ua;
		}
		c += (l + p) * .5 * ua, l = p, u += o * ua;
	}
	return i.capped = !0, NaN;
}
function pa(e, t, n, r, i, o) {
	let s = la(t, n, r, i, o);
	return sa(e, i.atmosphere.airPressure, o) / r + s - en(a + t);
}
var ma = 24, ha = 1;
function ga(e, t, n, r, i = E) {
	if (e <= 0 || t <= 0) return Infinity;
	let o = t + e * Oe(i.propulsion, "sea-level") * ua + ha, s = sa(e, C / 1e3, i) / o - en(a + r);
	return s <= 0 ? Infinity : r + Math.max(0, n) ** 2 / (2 * s);
}
function _a(e, t, n, r, i, o = E, s = o.dryMass) {
	if (e <= 0 || t <= 0 || !(s > 0 && s <= t)) return null;
	if (n <= 0) return r;
	let c = e * Oe(o.propulsion, "sea-level"), l = sa(e, C / 1e3, o) / t - en(a);
	if (l <= 0) return null;
	let u = Math.max(t - n / l * c, s), d = fa(e, u, n, r, i, o);
	if (Number.isNaN(d)) return null;
	let f = t - c * i.duration - u;
	if (f < 0) return null;
	if (f < ha) return d;
	let p = t - c * i.duration, m = NaN, h = 0;
	for (let a = 0; a < ma; a++) {
		let s = Number.isNaN(m) ? a === 0 ? p : (u + p) / 2 : p - m * (p - u) / (m - f), l = fa(e, s, n, r, i, o);
		if (i.capped) return null;
		let g = Number.isNaN(l) ? NaN : t - c * i.duration - s;
		if (!Number.isNaN(g) && Math.abs(g) < ha) return l;
		if (!Number.isNaN(g) && g > 0 ? (u = s, f = g, d = l, h === 1 && !Number.isNaN(m) && (m *= .5), h = 1) : (p = s, m = g, h === -1 && (f *= .5), h = -1), p - u < ha) break;
	}
	return d;
}
function va() {
	return {
		reached: !1,
		time: NaN,
		downRange: 0
	};
}
var ya = .25, ba = 4e3, xa = 2;
function Sa(t, n, r, i, o, s, c, l, d, f = 0, p = 0, m, h) {
	let { inputs: g, acc: _ } = l, v = a + t, y = l.atmosphere;
	gt(Math.max(t, 0), y);
	let ee = n - Tn(c, t), b = f === 0 ? ee : ee - f, te = p === 0 ? r : r - p, x = Math.sqrt(b * b + te * te), S = Math.atan2(b, te), ne = Nt(i, S), C = Pt(ne);
	if (m?.damage) {
		let e = h?.controlModel ?? M(d).controls, t = .5 * y.airDensity * x ** 2;
		if (h && h.zeroControlArea !== null && Number.isFinite(t * h.zeroControlColumnArea * xa)) ki(m.damage, e, t, Number.isFinite(C) ? 0 : NaN, Ea), s = h.zeroControlArea;
		else {
			let n = d.gridFins ? (m.vehicle.frontFinExtension - 50) / 50 * d.gridFins.maxAngle : m.vehicle.frontFinExtension * .01 * w, r = m.vehicle.aftFinExtension * .01 * w;
			if (Ai(m.damage, e, t, Math.abs(Math.sin(C)), n, r, Ea), s = d.maxArea + 1.8 * (Ea.frontArea + Ea.aftArea), h && n === 0 && r === 0) {
				h.zeroControlArea = s, h.zeroControlColumnArea = 0;
				for (let t of e.columns) h.zeroControlColumnArea = Math.max(h.zeroControlColumnArea, t.area);
			}
		}
	}
	let re = St(e(C), s, d), ie = x / bt(y.airTemperature);
	g.angleOfMotion = e(S), g.angleOfAttack = e(ne), g.aerodynamicDragAcceleration = Ct(y.airDensity, x, re, Et(ie)) / o, g.aerodynamicLiftAcceleration = Tt(y.airDensity, x, e(C), s) / o, Xt(g, u, _), _.x += rn(v, n, r), _.y = _.y + u + D(v, n);
}
var Ca = Rn(), wa = zn(), Ta = N(), Ea = Oi(12);
function Da(e, t, n, r) {
	let i = e.kinematics;
	e.damage && P(e, n, Ta, Ca);
	let a = e.damage ? Ta.totalMass : e.vehicle.vehicleMass;
	if (!(a > 0)) {
		r.acc.x = r.acc.y = 0;
		return;
	}
	Sa(i.altitude, i.speedX, i.speedY, t, a, e.vehicle.vehicleInFlightMaxArea, e.world.wind, r, n, e.world.gust, e.world.gustVertical, e), n.gridFins && (e.damage || Ln(e.vehicle.propellantMass, Ca, n), na(e, r.atmosphere.airDensity, i.speedX - Tn(e.world.wind, i.altitude) - e.world.gust, i.speedY - e.world.gustVertical, t, Ca, n, wa), r.acc.x += wa.forceX / a, r.acc.y += wa.forceY / a);
}
function Oa() {
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
		result: va()
	};
}
function ka(e, t, n, r, i) {
	t.damage && P(t, r, Ta), e.state = t, e.model = r, e.groundAltitude = n, e.pitch = i, e.mass = t.damage ? Ta.totalMass : t.vehicle.vehicleMass, e.maxArea = t.vehicle.vehicleInFlightMaxArea, e.referenceWind = t.world.wind, e.zeroControlArea = null, e.zeroControlColumnArea = 0, e.controlModel = t.damage ? M(r).controls : null, e.h = t.kinematics.altitude, e.x = 0, e.vx = t.kinematics.speedX, e.vy = t.kinematics.speedY, e.steps = 0, e.done = !(e.mass > 0), e.result.reached = !1, e.result.time = NaN, e.result.downRange = e.done ? NaN : 0;
}
function Aa(e, t, n = E, r = e.kinematics.pitch) {
	let i = Oa();
	return ka(i, e, t, n, r), i;
}
function ja(e, t, n) {
	if (e.done) return 0;
	let r = e.state, i = e.model, a = e.pitch, o = e.mass, s = e.maxArea, c = e.referenceWind, l = n.acc, u = ya * .5, d = e.h, f = e.x, p = e.vx, m = e.vy, h = e.steps, g = 0, _ = Math.min(Math.floor(t), ba - h);
	for (let t = 0; t < _; t++) {
		Sa(d, p, m, a, o, s, c, n, i, 0, 0, r, e);
		let t = p + l.x * u, _ = m + l.y * u;
		Sa(d + m * u, t, _, a, o, s, c, n, i, 0, 0, r, e);
		let v = p + l.x * ya, y = m + l.y * ya, ee = d + _ * ya, b = f + t * ya, te = h;
		if (h++, g++, ee <= e.groundAltitude) {
			let t = (d - e.groundAltitude) / (d - ee);
			e.result.reached = !0, e.result.time = (te + t) * ya, e.result.downRange = f + (b - f) * t, d = ee, f = b, p = v, m = y, e.done = !0;
			break;
		}
		d = ee, f = b, p = v, m = y;
	}
	return e.h = d, e.x = f, e.vx = p, e.vy = m, e.steps = h, e.result.reached || (e.result.downRange = f), h >= 4e3 && (e.done = !0), g;
}
function Ma(e, t, n, r, i = E, a = e.kinematics.pitch) {
	let o = n.fallWork;
	ka(o, e, t, i, a), ja(o, ba, n), r.reached = o.result.reached, r.time = o.result.time, r.downRange = o.result.downRange, o.state = null;
}
//#endregion
//#region src/core/vehicles/super-heavy.ts
var R = Object.freeze([
	0,
	1,
	2
]), Na = Object.freeze(Array.from({ length: 13 }, (e, t) => t));
Object.freeze({
	centre: R,
	inner: Object.freeze(Array.from({ length: 10 }, (e, t) => t + 3)),
	outer: Object.freeze(Array.from({ length: 20 }, (e, t) => t + 13))
});
var Pa = Ne.height, Fa = Ne.diameter, Ia = Ne.propellantCapacity, La = 3, Ra = .9 * Pa, za = 66 / 71 * Pa, Ba = Math.PI * (Fa / 2) ** 2, Va = Ia * Pe / (Fe * Ba), Ha = Ia * (1 - Pe) / (424 * Ba), Ua = (e, t) => Object.freeze({
	kind: "sea-level",
	offAxis: e,
	gimballed: t,
	offAxisForceFraction: 0
}), Wa = (e, t, n) => Array.from({ length: e }, (r, i) => Ua(t * Math.cos(2 * Math.PI * i / e), n)), Ga = Object.freeze({
	id: "super-heavy",
	propulsion: Ne.propulsion,
	height: Pa,
	diameter: Fa,
	dryMass: Ne.dryMass,
	propellantCapacity: Ia,
	initialPropellant: 5e5,
	dryCentreOfMass: Pa / 2,
	tankBottom: La,
	loxTankHeight: Va,
	ch4TankHeight: Ha,
	ch4TankBottom: La + Va,
	aftFinStation: Ra,
	frontFinStation: Ra,
	rcsStation: za,
	minArea: Ba,
	maxArea: Pa * Fa,
	frontFinArea: 0,
	aftFinArea: 0,
	engines: Object.freeze([
		Ua(0, !0),
		Ua(-.65, !0),
		Ua(.65, !0),
		...Wa(10, 2, !0),
		...Wa(20, 3.8, !1)
	]),
	ignitionGroup: Na,
	gridFins: Object.freeze({
		count: 3,
		area: Ne.gridFins.area,
		station: Ra,
		maxAngle: Math.PI / 4
	})
}), Ka = 65 / 71 * Pa, z = Object.freeze({
	lugStation: Ka,
	planeAltitude: 120,
	bodyCentreAltitude: 120 - (Ka - Pa / 2),
	halfWidth: 2.25,
	maxDownSpeed: 4.5,
	maxLateralSpeed: 1,
	maxPitch: 5 * Math.PI / 180
});
//#endregion
//#region src/core/control/booster-receipts.ts
function qa(e, t) {
	let n = e.autopilot;
	return t === 1 / 120 && !!e.damage && !n.manualControlOn && (n.autoLandOn || n.autoBoostBackOn) && !n.boosterReturnPlan && (n.boosterPhase === "align-boost" || n.boosterPhase === "boostback" && !Na.every((t) => e.engines.running[t]));
}
function Ja(e, t) {
	for (let n of [
		"boosterFallTime",
		"boosterCoastPitch",
		"boosterForecastBurn"
	]) Object.hasOwn(t.autopilot, n) ? Object.assign(e.autopilot, { [n]: t.autopilot[n] }) : delete e.autopilot[n];
}
function Ya(e) {
	if (e && typeof e == "object") {
		for (let t in e) Ya(e[t]);
		Object.freeze(e);
	}
	return e;
}
function Xa(e) {
	if (!e || typeof e != "object") return e;
	let t = Array.isArray(e) ? [] : {};
	for (let n in e) t[n] = Xa(e[n]);
	return t;
}
function Za(e, t, n, r, i, a, o, s, c) {
	return Object.freeze({
		input: Ya(B(e)),
		expected: Ya(B(t)),
		returned: Ya(B(n)),
		dt: r,
		advance: i,
		policy: a,
		model: o,
		modelSnapshot: Ya(Xa(o)),
		lineage: s,
		revision: c
	});
}
function Qa(e, t) {
	let n = e?.chunks, r = n?.[n.length - 1], i = r?.[r.length - 1];
	return (e?.size ?? 0) < 1024 && (!i || t > i.input.world.environmentTime) && (!r || r.length < 32 || n.length < 32);
}
function $a(e, t) {
	if (!Qa(e, t.input.world.environmentTime)) return e;
	let n = [...e?.chunks ?? []], r = n[n.length - 1];
	return r && r.length < 32 ? n[n.length - 1] = Object.freeze([...r, t]) : n.push(Object.freeze([t])), Object.freeze({
		chunks: Object.freeze(n),
		size: (e?.size ?? 0) + 1
	});
}
function eo(e, t, n, r, i, a, o, s) {
	let c = 0, l = 0, u = 0;
	for (; c < e.chunks.length;) {
		let n = e.chunks[c];
		for (; l < n.length && n[l].input.world.environmentTime < t.world.environmentTime;) l++, u++;
		if (l < n.length) break;
		c++, l = 0;
	}
	let d = e.chunks[c]?.[l], f;
	if (d && d.input.world.environmentTime === t.world.environmentTime && d.lineage === o && d.revision === s && d.dt === n && d.advance === r && d.policy === i && d.model === a && oo(d.modelSnapshot, a)) {
		let e = B(d.input);
		Ja(e, t), oo(e, t) && (f = d, l++, u++);
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
function to(e) {
	return e ? {
		...e,
		handoff: { ...e.handoff }
	} : void 0;
}
function no(e) {
	let t = to(e.plan);
	return t && (Object.freeze(t.handoff), Object.freeze(t)), Object.freeze({
		...e,
		plan: t
	});
}
function B(e) {
	let t = { ...e.autopilot };
	return delete t.boosterSource, delete t.boosterPrediction, _o({
		...e,
		autopilot: t
	});
}
function ro(e, t) {
	let n = e.autopilot;
	return no({
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
function io(e, t) {
	let n = e.autopilot;
	t.rangeError === void 0 ? delete n.boosterRangeError : n.boosterRangeError = t.rangeError, t.fallTime === void 0 ? delete n.boosterFallTime : n.boosterFallTime = t.fallTime, t.coastPitch === void 0 ? delete n.boosterCoastPitch : n.boosterCoastPitch = t.coastPitch, t.reached === void 0 ? delete n.boosterForecastReached : n.boosterForecastReached = t.reached;
	let r = to(t.plan);
	r ? n.boosterReturnPlan = r : delete n.boosterReturnPlan;
}
function ao(e) {
	let t = e.autopilot;
	t.boosterSource && (t.boosterSource.valid = !1), delete t.boosterReturnPlan, delete t.boosterCoastPitch, delete t.boosterForecastReached, t.boosterPrediction?.published && (t.boosterPrediction = {
		...t.boosterPrediction,
		published: void 0
	});
}
function oo(e, t, n = !1) {
	if (Object.is(e, t)) return !0;
	if (e === null || t === null || typeof e != "object" || typeof t != "object" || Array.isArray(e) !== Array.isArray(t) || Array.isArray(e) && e.length !== t.length) return !1;
	let r = e, i = t;
	for (let e in r) if (!(n && (e === "boosterSource" || e === "boosterPrediction")) && (!(e in i) || !oo(r[e], i[e], e === "autopilot"))) return !1;
	for (let e in i) if (!(n && (e === "boosterSource" || e === "boosterPrediction")) && !(e in r)) return !1;
	return !0;
}
function so(e, t) {
	if (!e.damage) return !0;
	let n = e.autopilot, r = n.boosterSource;
	return r ? r.revision !== e.damage.revision || !r.valid || !r.expected || r.expectedDt !== t || !oo(r.expected, e) || n.boosterReturnPlan && n.boosterReturnPlan.sourceLineage !== r.lineageId ? (ao(e), !1) : (r.checked = !0, !0) : !n.boosterReturnPlan || (ao(e), !1);
}
function co(e) {
	if (!e.damage) return;
	let t = e.autopilot, n = t.boosterSource;
	if (n && n.revision === e.damage.revision && (n.valid || t.boosterPrediction && !t.boosterPrediction.done)) return;
	n && delete t.boosterPrediction, delete t.boosterReturnPlan;
	let r = B(e);
	t.boosterSource = {
		lineageId: (n?.lineageId ?? 0) + 1,
		revision: e.damage.revision,
		originTime: e.world.environmentTime,
		valid: !0,
		checked: !0,
		returned: r,
		expected: void 0,
		expectedDt: 0,
		event: ro(e, 0)
	};
}
function lo(e, t, n, r, i, a) {
	let o = e.autopilot.boosterSource;
	if (!o || !o.valid) return 0;
	if (!o.checked || o.returned.world.environmentTime !== e.world.environmentTime) return ao(e), 0;
	let s = ro(e, o.event.sequence + 1), c = B(o.returned);
	if (io(c, s), a) return oo(s, a.event) ? (e.autopilot.boosterSource = {
		...o,
		event: s,
		returned: B(a.returned),
		expected: B(a.expected),
		expectedDt: t,
		checked: !1
	}, 0) : (ao(e), 0);
	let l, u = n(c, t, (e, t, n) => {
		l = B(e), r(e, t, n);
	}, i);
	return e.autopilot.boosterSource = {
		...o,
		event: s,
		returned: B(u),
		expected: l,
		expectedDt: t,
		checked: !1,
		valid: l !== void 0
	}, l || ao(e), 1;
}
function uo(e, t, n, r, i) {
	let a = e.autopilot.boosterSource;
	if (!a?.valid || !a.checked || !a.receipts || a.returned.world.environmentTime !== e.world.environmentTime) return;
	let o = ro(e, a.event.sequence + 1), s = B(a.returned);
	if (io(s, o), !qa(s, t)) return;
	let c = eo(a.receipts, s, t, n, r, i, a.lineageId, a.revision);
	if (e.autopilot.boosterSource = {
		...a,
		receipts: c.queue
	}, !c.receipt) return;
	let l = B(c.receipt.expected), u = B(c.receipt.returned);
	return Ja(l, s), Ja(u, s), {
		event: o,
		expected: l,
		returned: u
	};
}
function fo(e, t, n, r, i, a, o, s) {
	let c = e.autopilot.boosterSource;
	if (!n || !mo(e, t, i)) return;
	let l = Za(t, n, r, i, a, o, s, c.lineageId, c.revision);
	e.autopilot.boosterSource = {
		...c,
		receipts: $a(c.receipts, l)
	};
}
function po(e, t) {
	let n = e.autopilot.boosterSource;
	return !!n && oo(ro(e, n.event.sequence + 1), t.event);
}
function mo(e, t, n) {
	let r = e.autopilot.boosterSource;
	return !!r?.valid && qa(t, n) && Qa(r.receipts, t.world.environmentTime);
}
//#endregion
//#region src/core/state.ts
var ho = 1463897163;
function go(t = ho, n = E) {
	let r = n.height / 2, i = a + r, o = n.dryMass + n.initialPropellant;
	return {
		damage: Yr(M(n).partition, Wi(r, ot(r).airTemperature)),
		rng: ln(t),
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
			orbitalVelocityAtCurrentAltitude: $t(i),
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
			frontFinEffectiveAreaFraction: Rt(0, 0, n).frontFinEffectiveAreaFraction,
			aftFinEffectiveAreaFraction: Rt(0, 0, n).aftFinEffectiveAreaFraction,
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
			vehicleMomentOfInertia: n.gridFins ? Fn(n.initialPropellant, n) : o * (n.diameter / 2) ** 2 * .25 + o * n.height ** 2 / 12,
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
function _o(e) {
	return {
		damage: e.damage ? Xr(e.damage) : null,
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
			...e.autopilot.boosterReturnPlan ? { boosterReturnPlan: to(e.autopilot.boosterReturnPlan) } : {},
			...e.autopilot.boosterSource ? { boosterSource: {
				...e.autopilot.boosterSource,
				returned: _o(e.autopilot.boosterSource.returned),
				expected: e.autopilot.boosterSource.expected ? _o(e.autopilot.boosterSource.expected) : void 0,
				event: no(e.autopilot.boosterSource.event)
			} } : {}
		}
	};
}
function vo(e, t = E) {
	let n = Rt(e.vehicle.frontFinExtension, e.vehicle.aftFinExtension, t);
	e.forces.frontFinEffectiveAreaFraction = n.frontFinEffectiveAreaFraction, e.forces.aftFinEffectiveAreaFraction = n.aftFinEffectiveAreaFraction, e.vehicle.vehicleInFlightMaxArea = n.vehicleInFlightMaxArea;
}
//#endregion
//#region src/core/physics/engines.ts
function yo(e) {
	let t = 0;
	for (let n of e) n && (t += 1);
	return t;
}
function bo(e, t, n, r) {
	let i = 0;
	for (let a = 0; a < r.engines.length; a++) r.engines[a].kind === t && e[a] === !0 === n && (i += 1);
	return i;
}
function xo(e, t = E) {
	return bo(e, "sea-level", !0, t);
}
function So(e, t = E) {
	return bo(e, "sea-level", !1, t);
}
function V(e, t, n = E) {
	return bo(e, "sea-level", !0, n) * T(n.propulsion, "sea-level", t) + bo(e, "vacuum", !0, n) * T(n.propulsion, "vacuum", t);
}
function Co(e, t, n = E) {
	return V(e, t, n) * 40 * .01;
}
function wo(e, t, n, r = E) {
	return V(e, n, r) * t * .01;
}
function To(e, t, n = E) {
	if (n.engines.some((e) => e.gimballed === !1 && e.kind === "sea-level")) {
		let t = 0, r = 0;
		for (let i = 0; i < n.engines.length; i++) e[i] && (t++, n.engines[i].gimballed === !0 && r++);
		return t > 0 ? r / t : 0;
	}
	if (bo(e, "vacuum", !0, n) === 0) return 1;
	let r = V(e, t, n);
	return r > 0 ? bo(e, "sea-level", !0, n) * T(n.propulsion, "sea-level", t) / r : 0;
}
function Eo(e, t) {
	return e * Math.sin(.01 * t * x);
}
function Do(e, t, n, r = E) {
	let i = 0, a = 0;
	for (let t = 0; t < r.engines.length; t++) {
		let n = r.engines[t], o = +!!e[t] * n.offAxisForceFraction;
		n.kind === "sea-level" ? i += o : a += o;
	}
	return i * t * .01 * T(r.propulsion, "sea-level", n) + a * t * .01 * T(r.propulsion, "vacuum", n);
}
function Oo(t, n) {
	let r = t - .01 * n * x;
	return r > Math.PI ? r -= 2 * Math.PI : r < -Math.PI && (r += 2 * Math.PI), e(r);
}
function ko(e, t, n = E) {
	return bo(e, "sea-level", !0, n) * t * .01 * Oe(n.propulsion, "sea-level") + bo(e, "vacuum", !0, n) * t * .01 * Oe(n.propulsion, "vacuum");
}
function Ao(e, t, n = E) {
	$i(e, n);
	let { vehicle: r, engines: i, status: a } = e, o = 1;
	if (r.propellantMass > 0) {
		let e = ko(i.running, r.throttleCurrent, n) * t;
		e > r.propellantMass && (o = r.propellantMass / e), r.propellantMass = Math.max(0, r.propellantMass - e);
	} else r.propellantMass = 0;
	return a.dumpingFuel && ((r.propellantMass > 12e3 || a.forceDump) && r.propellantMass > 0 ? r.propellantMass = Math.max(0, r.propellantMass - h * t) : a.dumpingFuel = !a.dumpingFuel), Qi(e, n), o;
}
var jo = 1.2;
function Mo(e, t) {
	let { engines: n } = e;
	if (n.running[t] || n.failed[t] || n.ignitionCountdown[t] !== null) return;
	let r = hn(e.rng, "ignitionDelay");
	n.ignitionCountdown[t] = (r * 1.5 + .5) * (600 / 1e3);
}
function No(e, t) {
	let n = e.failures.randomFailure ? g : 0, r = hn(e.rng, "ignitionFailure") < n;
	return r && (e.engines.failed[t] = !0), r;
}
function Po(e, t) {
	let { engines: n } = e;
	for (let e = 0; e < n.ignitionCountdown.length; e++) {
		let r = n.ignitionCountdown[e];
		if (r == null) continue;
		let i = r - t;
		i <= 0 ? (n.ignitionCountdown[e] = null, n.running[e] = !0) : n.ignitionCountdown[e] = i;
	}
}
function Fo(e, t) {
	e.engines.running[t] = !1, e.engines.ignitionCountdown[t] = null;
}
function Io(e) {
	e.failures.fuelRunOut && (e.engines.running.fill(!1), e.engines.ignitionCountdown.fill(null));
}
function Lo(e, t, n, r, i) {
	let a = 0;
	for (let o = 0; o < i.engines.length; o++) if (e[o]) {
		let e = i.engines[o], s = T(i.propulsion, e.kind, n);
		a -= e.offAxis * s * t * .01 * Math.cos(e.gimballed ?? e.kind === "sea-level" ? r : 0);
	}
	return a;
}
//#endregion
//#region src/core/control/booster-return-plan.ts
function Ro(e) {
	delete e.boosterPrediction, delete e.boosterReturnPlan;
}
function zo(e) {
	let t = e.autopilot, n = e.damage?.revision, r = t.boosterPrediction && t.boosterPrediction.origin.damage?.revision !== n, i = t.boosterReturnPlan && t.boosterReturnPlan.damageRevision !== n;
	return !r && !i ? !1 : (Ro(t), delete t.boosterCoastPitch, delete t.boosterForecastReached, delete t.boosterRangeError, delete t.boosterFallTime, !0);
}
function Bo(e) {
	let t = e.forecast;
	return t.reached && !t.failed && t.fuel > 0 && t.handoff !== void 0 && Number.isFinite(t.rangeError) && Number.isFinite(e.shutdownAt) && Number.isFinite(e.burnDuration) && e.burnDuration >= 0;
}
function Vo(e, t) {
	if (!Bo(e) || !Bo(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || e.coastPitch !== t.coastPitch || t.burnDuration <= e.burnDuration || e.forecast.rangeError * t.forecast.rangeError >= 0) return;
	let n = e.forecast.rangeError / (e.forecast.rangeError - t.forecast.rangeError);
	return e.burnDuration + (t.burnDuration - e.burnDuration) * n;
}
function Ho(e, t, n, r = 0) {
	if (!Bo(e) || !Bo(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || e.coastPitch !== t.coastPitch || e.burnDuration === t.burnDuration || e.forecast.rangeError * t.forecast.rangeError <= 0) return;
	let i = t.forecast.rangeError - e.forecast.rangeError, a = t.burnDuration - t.forecast.rangeError * (t.burnDuration - e.burnDuration) / i, o = t.burnDuration > e.burnDuration ? a > t.burnDuration : a < t.burnDuration;
	return Number.isFinite(a) && o && a > r && a < n ? a : void 0;
}
function Uo(e, t, n) {
	if (!(!Bo(e) || !t || !e.forecast.handoff.lateralFeasible || e.shutdownAt <= n)) return {
		originTime: e.originTime,
		shutdownAt: e.shutdownAt,
		...e.damageRevision === void 0 ? {} : { damageRevision: e.damageRevision },
		...e.sourceLineage === void 0 ? {} : { sourceLineage: e.sourceLineage },
		coastPitch: e.coastPitch,
		handoff: { ...e.forecast.handoff }
	};
}
function Wo(e, t, n, r) {
	if (Vo(n, r) === void 0 || !Bo(e) || !Bo(t) || e.originTime !== t.originTime || e.damageRevision !== t.damageRevision || e.sourceLineage !== t.sourceLineage || t.damageRevision !== n.damageRevision || t.sourceLineage !== n.sourceLineage || t.originTime !== n.originTime || e.coastPitch !== t.coastPitch || t.coastPitch !== n.coastPitch || e.burnDuration === t.burnDuration) return;
	let i = t.forecast.rangeError - e.forecast.rangeError, a = t.burnDuration - t.forecast.rangeError * (t.burnDuration - e.burnDuration) / i;
	return Number.isFinite(a) && a > n.burnDuration && a < r.burnDuration ? a : void 0;
}
//#endregion
//#region src/core/control/commands.ts
function Go(e, t) {
	let { engines: n, failures: r } = e, i = n.ignitionCountdown[t] !== null;
	!n.running[t] && !i && !n.failed[t] && !r.fuelRunOut ? No(e, t) || Mo(e, t) : Fo(e, t);
}
function H(e, t = E) {
	let { running: n } = e.engines;
	if (n.some(Boolean)) for (let t = 0; t < n.length; t++) n[t] && Go(e, t);
	else for (let r of t.ignitionGroup) n[r] || Go(e, r);
}
function Ko(e) {
	e.status.finActive = !e.status.finActive;
}
function qo(e) {
	e.status.rcsActive = !e.status.rcsActive;
}
function Jo(e) {
	e.status.dumpingFuel = !e.status.dumpingFuel;
}
function Yo(e) {
	e.autopilot.autoMaxThrustOn = !e.autopilot.autoMaxThrustOn;
}
function Xo(e) {
	e.autopilot.autoTakeOffOn = !e.autopilot.autoTakeOffOn;
}
function Zo(e) {
	e.autopilot.autoBoostBackOn = !e.autopilot.autoBoostBackOn;
}
function Qo(e) {
	e.autopilot.autoLandOn = !e.autopilot.autoLandOn;
}
//#endregion
//#region src/core/scenarios.ts
var $o = [
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
], es = {
	id: "launch-pad",
	name: "Launch Pad",
	description: "On the pad at StarBase, full tanks.",
	altitude: E.height / 2,
	xPosition: 0,
	speedX: 0,
	speedY: 0,
	pitch: t(0),
	propellant: p / 1e3
}, ts = 200, ns = {
	id: "intro",
	name: "Intro Demo",
	description: "The auto-landing sequence that plays when the game opens.",
	altitude: ts - 1,
	xPosition: 0,
	speedX: 0,
	speedY: -ts / 4,
	pitch: t(0),
	propellant: 12
}, rs = 15e4, is = nn(a + rs, $t(a + rs)), as = [{
	id: "circularize",
	name: "Circularize",
	description: "Just short of orbital speed at 150 km — a short prograde burn closes the orbit.",
	altitude: rs,
	xPosition: 0,
	speedX: is - 20,
	speedY: 0,
	pitch: t(90),
	propellant: 200
}, {
	id: "deorbit",
	name: "Deorbit Burn",
	description: "Circular at 150 km, half a lap short of StarBase. Burn retrograde and come home.",
	altitude: rs,
	xPosition: -Math.PI * a,
	speedX: is,
	speedY: 0,
	pitch: t(90),
	propellant: 300
}], os = [
	es,
	...$o,
	...as,
	ns
];
function ss(e) {
	return os.find((t) => t.id === e);
}
function cs(e, t) {
	return us(e, t, E);
}
function ls(e, t) {
	let n = e.id === "custom" ? e.basedOn : e.id, r = n === "booster-sep" || n === "rtls" ? Ga : E;
	return {
		state: us(e, t, r),
		vehicle: r
	};
}
function us(e, t, r) {
	let i = go(t, r), o = e.altitude;
	o < r.height / 2 && (o = r.height / 2), i.kinematics.altitude = o, i.kinematics.distanceToPlanetCenter = a + o, i.kinematics.downRangeDistance = e.xPosition + d, i.kinematics.downRangeDistanceNextFrame = i.kinematics.downRangeDistance, i.kinematics.speedX = e.speedX, i.kinematics.speedY = e.speedY, i.kinematics.trueSpeed = Math.sqrt(e.speedX ** 2 + e.speedY ** 2), i.kinematics.pitch = n(e.pitch), r.gridFins && (i.kinematics.pitchRecord = [i.kinematics.pitch, i.kinematics.pitch]);
	let s = e.propellant * 1e3;
	return s > r.propellantCapacity && (s = r.propellantCapacity), s > 0 || (s = 0), i.vehicle.propellantMass = s, i.vehicle.vehicleMass = r.dryMass + s, r.gridFins && (i.vehicle.vehicleMomentOfInertia = Fn(s, r)), i.world.wind = e.wind ?? 0, i.kinematics.machSpeed = At(i.kinematics.speedX, i.kinematics.speedY, O(i.world, i.kinematics.altitude), i.world.gustVertical) / bt(ot(o).airTemperature), i.damage = Yr(M(r).partition, Wi(o, ot(o).airTemperature)), i;
}
function ds(e) {
	let t = cs(ns, e);
	return t.status.finLocked = !0, t.autopilot.demoAutoLandOn = !0, H(t), t;
}
//#endregion
//#region src/core/physics/step-dynamics.ts
function fs() {
	return {
		omega0: 0,
		alpha0: 0,
		bodyAccelerationX: 0,
		bodyAccelerationY: 0,
		burnedFraction: 0,
		gimballedThrust: 0,
		airspeed: 0,
		massProperties: Rn(),
		gridFinForces: zn()
	};
}
function ps(e, t) {
	let { kinematics: n } = e;
	n.pitchRecord.push(n.pitch), n.pitchRecord.shift();
	let r = n.pitchRecord[0];
	n.pitchRateOfChange = e.damage && !Number.isFinite(r) ? n.angularVelocity : (n.pitch - r) / t;
}
function ms(e) {
	let { kinematics: t } = e;
	t.distanceToPlanetCenter = a + t.altitude, t.orbitalVelocityAtCurrentAltitude = $t(t.distanceToPlanetCenter);
}
function hs(t, n) {
	let { kinematics: r, status: i, failures: a, vehicle: o, engines: s } = t;
	r.altitude <= n.height * Math.abs(Math.cos(r.pitch)) * .5 ? (r.speedY < -.5 || n.id === "super-heavy" && r.speedY < 0) && (n.id === "ship" && Math.abs(r.speedX) < 2 && Math.abs(r.speedY) < 10 && Math.abs(r.pitch) < .09 ? (i.landed = !0, r.speedX = 0, r.speedY = 0, r.angularVelocity = 0) : (Yi(t, n, Gi.Impact, t.world.environmentTime), a.crashed = !0, r.speedX = 0, r.speedY = 0, r.angularVelocity = 0, r.pitch = e(0), o.propellantMass = 0, s.running.fill(!1), o.rcsRunTimeRemaining = 0)) : (i.landed = !1, i.onTheGround = !1);
}
function gs(e, t, n, r = n.height * Math.abs(Math.cos(e.kinematics.pitch)) * .5) {
	let { kinematics: i, status: a } = e;
	i.altitude > r || i.speedY < -.5 || e.failures.crashed || a.landed || (a.onTheGround = t <= en(i.distanceToPlanetCenter), a.onTheGround && (i.speedX = 0, i.speedY = 0, i.angularVelocity = 0));
}
function _s(e, t, n) {
	let { kinematics: r, forces: i, failures: a, vehicle: o, engines: s } = e;
	(i.perceivedG > 13 || i.surfaceTemperature > 1533 || i.dynamicPressure > 50 || e.damage !== null && (e.damage.terminal.active || !e.damage.hull.valid)) && (Yi(e, t, Xi(e), e.world.environmentTime), a.inFlightBreakUp = !0, r.angularVelocity = 0, o.propellantMass = 0, e.damage || (o.vehicleMass = t.dryMass, Ln(0, n.massProperties, t), o.vehicleMomentOfInertia = n.massProperties.momentOfInertia), s.running.fill(!1), s.ignitionCountdown.fill(null), o.rcsRunTimeRemaining = 0, i.rcsThrust = 0);
}
function vs(e) {
	e.vehicle.propellantMass <= 0 && (e.failures.fuelRunOut = !0);
}
function ys(e, t, n) {
	let { forces: r } = e;
	r.perceivedG_Y = n / S, r.perceivedG_X = t / S, r.perceivedG = Math.sqrt(r.perceivedG_Y ** 2 + r.perceivedG_X ** 2);
}
function bs(e, t, n, r) {
	let { massProperties: i, gridFinForces: a } = r, o = At(e.kinematics.speedX, e.kinematics.speedY, O(e.world, e.kinematics.altitude), e.world.gustVertical);
	e.world.updatedFrameCount += 1;
	let s = _t(e.kinematics.altitude);
	if (e.atmosphere.airTemperature = s.airTemperature, e.atmosphere.airPressure = s.airPressure, e.atmosphere.airDensity = s.airDensity, hs(e, n), e.damage?.terminal.active) {
		Ji(e), r.bodyAccelerationX = r.bodyAccelerationY = r.burnedFraction = r.gimballedThrust = 0;
		return;
	}
	vs(e);
	let c = Ao(e, t, n);
	Io(e), e.vehicle.propellantMass <= 0 && e.engines.ignitionCountdown.fill(null), Po(e, t);
	let l = Rt(e.vehicle.frontFinExtension, e.vehicle.aftFinExtension, n);
	e.forces.frontFinEffectiveAreaFraction = l.frontFinEffectiveAreaFraction, e.forces.aftFinEffectiveAreaFraction = l.aftFinEffectiveAreaFraction, e.vehicle.vehicleInFlightMaxArea = l.vehicleInFlightMaxArea, e.forces.crossSectionalArea = St(e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea, n), e.kinematics.angleOfMotion = kt(e.kinematics.speedX, e.kinematics.speedY);
	let d = jt(e.kinematics.speedX, e.kinematics.speedY, O(e.world, e.kinematics.altitude), e.world.gustVertical), f = Mt(e.kinematics.pitch, d);
	e.kinematics.angleOfAttack = f.angleOfAttack, e.kinematics.angleInToTheWind = f.angleInToTheWind, e.vehicle.gimbalPointingDirection = Oo(e.kinematics.pitch, e.vehicle.gimbalPosition), e.forces.thermalPower = Vi(o, e.atmosphere.airDensity, n.diameter / 2, e.kinematics.angleInToTheWind), e.forces.surfaceTemperature = Hi(e.forces.thermalPower, Wi(e.kinematics.altitude, e.atmosphere.airTemperature)), e.forces.dynamicPressure = xt(e.atmosphere.airDensity, o), e.damage && (ta(e, n, e.forces.dynamicPressure * 1e3, Math.abs(Math.sin(e.kinematics.angleInToTheWind))), e.forces.crossSectionalArea = St(e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea, n)), ps(e, t), e.forces.aerodynamicDrag = Ct(e.atmosphere.airDensity, o, e.forces.crossSectionalArea, Et(e.kinematics.machSpeed)), e.forces.aerodynamicLift = Tt(e.atmosphere.airDensity, o, e.kinematics.angleInToTheWind, e.vehicle.vehicleInFlightMaxArea), e.forces.thrust = wo(e.engines.running, e.vehicle.throttleCurrent, e.atmosphere.airPressure, n) * c, e.forces.aerodynamicDragAcceleration = Dt(e.forces.aerodynamicDrag, e.vehicle.vehicleMass), e.forces.aerodynamicLiftAcceleration = Dt(e.forces.aerodynamicLift, e.vehicle.vehicleMass), e.forces.thrustAcceleration = Dt(e.forces.thrust, e.vehicle.vehicleMass), e.forces.twr = e.forces.thrustAcceleration / u;
	let p = To(e.engines.running, e.atmosphere.airPressure, n), m = e.forces.thrust * p;
	e.damage && (e.forces.paidThrustAccelerationX = e.forces.thrustAcceleration * (p * Math.sin(e.vehicle.gimbalPointingDirection) + (1 - p) * Math.sin(e.kinematics.pitch)), e.forces.paidThrustAccelerationY = e.forces.thrustAcceleration * (p * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - p) * Math.cos(e.kinematics.pitch)));
	let h = e.forces.thrust - m, g = {
		angleOfMotion: d,
		angleOfAttack: e.kinematics.angleOfAttack,
		gimbalPointingDirection: e.vehicle.gimbalPointingDirection,
		aerodynamicDragAcceleration: e.forces.aerodynamicDragAcceleration,
		aerodynamicLiftAcceleration: e.forces.aerodynamicLiftAcceleration,
		thrustAcceleration: Dt(m, e.vehicle.vehicleMass),
		fixedThrustAcceleration: Dt(h, e.vehicle.vehicleMass),
		pitch: e.kinematics.pitch
	};
	n.gridFins && (Qi(e, n, i), na(e, e.atmosphere.airDensity, e.kinematics.speedX - O(e.world, e.kinematics.altitude), e.kinematics.speedY - e.world.gustVertical, e.kinematics.pitch, i, n, a));
	let _ = n.gridFins ? Jt(g) + a.forceX / e.vehicle.vehicleMass : Jt(g), v = n.gridFins ? Yt(g, u) + u + a.forceY / e.vehicle.vehicleMass : Yt(g, u) + u;
	r.bodyAccelerationX = _, r.bodyAccelerationY = v, r.burnedFraction = c, r.gimballedThrust = m;
}
function xs(e, t, n, r, i, a) {
	gs(e, r, i, a);
	let s = e.kinematics.distanceToPlanetCenter, c = e.kinematics.speedX, l = e.kinematics.speedY, u = n + rn(s, c, l), d = r + D(s, c), f = (e.status.onTheGround || e.status.landed || e.failures.crashed) && d <= 0;
	f && (u = 0, d = 0), ys(e, f ? -rn(s, c, l) : n, f ? -D(s, c) : r);
	let p = .5 * t * t;
	e.kinematics.altitude += l * t + d * p, e.kinematics.downRangeDistanceNextFrame = e.kinematics.downRangeDistance + c * t + u * p, e.kinematics.downRangeDistanceNextFrame > o ? e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame - o : e.kinematics.downRangeDistanceNextFrame < 0 ? e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame + o : e.kinematics.downRangeDistance = e.kinematics.downRangeDistanceNextFrame, ms(e);
	let m = e.kinematics.distanceToPlanetCenter, h = c + u * t, g = l + d * t, _ = f ? 0 : n + rn(m, h, g), v = f ? 0 : r + D(m, h);
	return e.kinematics.speedX = c + .5 * (u + _) * t, e.kinematics.speedY = l + .5 * (d + v) * t, e.kinematics.accelerationX = _, e.kinematics.accelerationY = v, e.kinematics.totalAcceleration = Math.sqrt(_ ** 2 + v ** 2), e.kinematics.trueSpeed = Math.sqrt(e.kinematics.speedX ** 2 + e.kinematics.speedY ** 2), f;
}
function Ss(e, t, n) {
	let r = At(e.kinematics.speedX, e.kinematics.speedY, O(e.world, e.kinematics.altitude), e.world.gustVertical);
	e.kinematics.machSpeed = r / bt(e.atmosphere.airTemperature), An(e.world, e.rng, e.kinematics.altitude, e.kinematics.speedX, e.kinematics.speedY, t), n.airspeed = r;
}
function Cs(t, n, r, i) {
	let a = .5 * n * n;
	t.kinematics.pitch > Math.PI ? t.kinematics.pitch = e(t.kinematics.pitch - 2 * Math.PI) : t.kinematics.pitch < -Math.PI && (t.kinematics.pitch = e(t.kinematics.pitch + 2 * Math.PI));
	let o = t.kinematics.angularVelocity, s = r ? 0 : t.kinematics.angularAcceleration;
	t.kinematics.pitch = e(t.kinematics.pitch + o * n + s * a), t.kinematics.angularVelocity = o + s * n, i.omega0 = o, i.alpha0 = s;
}
function ws(t, n, r) {
	let { massProperties: i, gridFinForces: a, gimballedThrust: o, burnedFraction: s, airspeed: c } = r;
	t.forces.thrustVectorForce = Eo(o, t.vehicle.gimbalPosition), t.forces.frontFinDrag = It(t.atmosphere.airDensity, c, t.kinematics.angleOfAttack, t.kinematics.angleInToTheWind, t.forces.frontFinEffectiveAreaFraction, n), t.forces.aftFinDrag = Lt(t.atmosphere.airDensity, c, t.kinematics.angleOfAttack, t.kinematics.angleInToTheWind, t.forces.aftFinEffectiveAreaFraction, n);
	let l = t.vehicle.vehicleMomentOfInertia;
	if (t.forces.thrustVectorAcceleration = Ot(t.forces.thrustVectorForce, i.engineArm, l), t.forces.angularDragAcceleration = Ft(t.atmosphere.airDensity, t.kinematics.angularVelocity, l, i.rCubedIntegral, n), t.forces.frontFinDragAngularAcceleration = Ot(t.forces.frontFinDrag, i.frontFinArm, l), t.forces.aftFinDragAngularAcceleration = Ot(t.forces.aftFinDrag, i.aftFinArm, l), t.forces.rcsThrustAngularAcceleration = Ot(t.forces.rcsThrust, i.rcsArm, l), t.forces.offAxisThrustDifferenceAcceleration = Ot(Do(t.engines.running, t.vehicle.throttleCurrent, t.atmosphere.airPressure, n), i.engineArm, l), n.gridFins && (na(t, t.atmosphere.airDensity, t.kinematics.speedX - O(t.world, t.kinematics.altitude), t.kinematics.speedY - t.world.gustVertical, t.kinematics.pitch, i, n, a), t.forces.frontFinDrag = a.lift, t.forces.frontFinDragAngularAcceleration = a.torque / l, t.forces.offAxisThrustDifferenceAcceleration = Lo(t.engines.running, t.vehicle.throttleCurrent, t.atmosphere.airPressure, e(t.vehicle.gimbalPosition * .01 * x), n) * s / l), t.damage) {
		let r = t.vehicle.gimbalPosition * .01 * x, a = o * Math.cos(r) + t.forces.thrust - o;
		t.forces.offAxisThrustDifferenceAcceleration = (Lo(t.engines.running, t.vehicle.throttleCurrent, t.atmosphere.airPressure, e(r), n) * s + i.centreOfMassX * a) / l;
	}
	return t.forces.thrustVectorAcceleration + t.forces.angularDragAcceleration + t.forces.frontFinDragAngularAcceleration + t.forces.aftFinDragAngularAcceleration + t.forces.rcsThrustAngularAcceleration + t.forces.offAxisThrustDifferenceAcceleration;
}
function Ts(e, t, n, r, i, a) {
	e.kinematics.angularVelocity = n ? 0 : r + .5 * (i + a) * t, e.kinematics.angularAcceleration = n ? 0 : a;
}
function Es(e, t, n, r, i) {
	Qi(e, n, r.massProperties), e.vehicle.vehicleMomentOfInertia = r.massProperties.momentOfInertia, Cs(e, t, i, r);
	let a = ws(e, n, r);
	Ts(e, t, i, r.omega0, r.alpha0, a);
}
//#endregion
//#region src/core/control/primitives.ts
var U = Rn(), W = N(), Ds = Oi(12), Os = zn();
function ks(e, t) {
	let n = e - t;
	return n < -Math.PI ? n = Math.PI * 2 + n : n > Math.PI && (n = -(Math.PI * 2 - n)), n;
}
function As(e, t, n, r = t, i = E) {
	let a = V(e, n, i), o = To(e, n, i);
	return o === 1 ? a * Math.cos(t) : a * o * Math.cos(t) + a * (1 - o) * Math.cos(r);
}
function js(e) {
	return Math.sqrt(35 / e * 2e3);
}
function G(t, n, r, i = E) {
	let { kinematics: a, forces: o, status: s, vehicle: c, autopilot: l } = t, u = ks(a.pitch, n);
	t.damage ? P(t, i, W, U) : Ln(c.propellantMass, U, i);
	let d = !t.damage || W.engineSupportAvailable, f = (-u / r ** 2 - 2 * a.angularVelocity / r - (d ? o.offAxisThrustDifferenceAcceleration : 0)) * (t.damage ? W.momentOfInertia : c.vehicleMomentOfInertia), p = 0, m = () => {
		if (Math.abs(u) > .1) {
			let e = f / U.rcsArm;
			e > 0 ? e > 8e5 ? p = 100 : l.rcsThrustCommand = e : e < 0 ? e < -8e5 ? p = -100 : l.rcsThrustCommand = e : p = 0, l.pitchControl = p;
		}
	}, h = d ? o.thrust * To(t.engines.running, t.atmosphere.airPressure, i) : 0;
	h > 0 ? (() => {
		let e = f / U.engineArm / h;
		e >= 1 ? p = 100 : e <= -1 ? p = -100 : (p = Math.asin(e) * 100 / x, p >= 100 ? p = 100 : p <= -100 && (p = -100)), s.rcsActive && (p *= .98), l.pitchControl = p;
	})() : s.finActive ? (() => {
		let n = At(a.speedX, a.speedY, O(t.world, a.altitude), t.world.gustVertical);
		if (t.damage) {
			let r = 0, o = 0, c = .5 * t.atmosphere.airDensity * n ** 2;
			if (i.gridFins) for (let n = -1; n <= 1; n += 2) na(t, t.atmosphere.airDensity, a.speedX - O(t.world, a.altitude), a.speedY - t.world.gustVertical, a.pitch, U, i, Os, e(n * i.gridFins.maxAngle)), Os.torque * f > 0 && Math.abs(Os.torque) > Math.abs(r) && (r = Os.torque, o = n * 100);
			else {
				let e = Math.abs(Math.sin(a.angleInToTheWind)), n = a.angleOfAttack < 0 ? -1 : 1;
				for (let a = 0; a < 2; a++) {
					let s = a === 0;
					Ai(t.damage, M(i).controls, c, e, s ? w : 0, s ? 0 : w, Ds);
					let l = c * 2 * e * n * (Ds.frontArea * U.frontFinArm - Ds.aftArea * U.aftFinArm);
					l * f > 0 && Math.abs(l) > Math.abs(r) && (r = l, o = (s ? n : -n) * 100);
				}
			}
			p = r === 0 ? 0 : o * Math.min(1, Math.abs(f / r)), s.rcsActive && (p *= .99, m()), l.pitchControl = p;
			return;
		}
		if (f > 0) {
			let e = Ct(t.atmosphere.airDensity, n, i.frontFinArea, 2) * Math.sin(w) * U.frontFinArm + Ct(t.atmosphere.airDensity, n, i.aftFinArea, 2) * U.aftFinArm;
			p = f / e * 100, p >= 100 && (p = 100);
		} else if (f < 0) {
			let e = Ct(t.atmosphere.airDensity, n, i.aftFinArea, 2) * Math.sin(w) * U.aftFinArm + Ct(t.atmosphere.airDensity, n, i.frontFinArea, 2) * U.frontFinArm;
			p = f / e * 100, p <= -100 && (p = -100);
		} else p = 0;
		s.rcsActive && (p *= .99, m()), l.pitchControl = p;
	})() : m();
}
function Ms(e, t, n = E) {
	Ns(e, t * oa(e), n);
}
function Ns(e, t, n = E) {
	let { vehicle: r, engines: i } = e;
	e.damage && P(e, n, W);
	let a = !e.damage || W.engineSupportAvailable, o = t * (e.damage ? W.totalMass : r.vehicleMass) / (a ? V(i.running, e.atmosphere.airPressure, n) : 0) * 100;
	Number.isNaN(o) && (o = 40), o > 100 ? o = 100 : o < 40 && (o = 40), r.throttle = o;
}
function Ps(e, t, n = E) {
	let { vehicle: r, engines: i } = e;
	e.damage && P(e, n, W);
	let a = !e.damage || W.engineSupportAvailable, o = t * (e.damage ? W.totalMass : r.vehicleMass) * oa(e) / (a ? As(i.running, r.gimbalPointingDirection, e.atmosphere.airPressure, e.kinematics.pitch, n) : 0) * 100;
	Number.isNaN(o) && (o = 40), o > 100 ? o = 100 : o < 40 && (o = 40), r.throttle = o;
}
function Fs(t, n, r, i, a) {
	let o = t.kinematics.speedX - n;
	o < 0 ? (G(t, r, a), -o < i && G(t, e(r * -o / i), a)) : (G(t, e(-r), a), o < i && G(t, e(-r * o / i), a));
}
function Is(e, t, n, r) {
	let i = e.kinematics.speedY - t;
	i < 0 ? (Ps(e, r), -i < n && Ps(e, 1 - i / n)) : (Ps(e, 0), i < n && Ps(e, 1 - i / n));
}
function Ls(e, t, n, r, i = E) {
	let a = t - e.kinematics.trueSpeed;
	a < 0 ? Ms(e, 0, i) : (Ms(e, r, i), a < n && Ms(e, 1 + a / n, i));
}
function Rs(e, t, n) {
	return e / (t * n);
}
function zs(t, n, r, i) {
	let { status: a, kinematics: o, autopilot: s } = t;
	a.finActive || i(t), s.horizontalAccelerationByAeroBreakingCorrectionAngle = Math.abs(o.accelerationX) > Math.abs(n) ? e(s.horizontalAccelerationByAeroBreakingCorrectionAngle - De * r) : e(s.horizontalAccelerationByAeroBreakingCorrectionAngle + De * r), s.horizontalAccelerationByAeroBreakingCorrectionAngle > Ee ? s.horizontalAccelerationByAeroBreakingCorrectionAngle = Ee : s.horizontalAccelerationByAeroBreakingCorrectionAngle < 0 && (s.horizontalAccelerationByAeroBreakingCorrectionAngle = e(0)), n < 0 ? G(t, e(s.horizontalAccelerationByAeroBreakingCorrectionAngle - Math.PI / 2), 1.5) : G(t, e(-s.horizontalAccelerationByAeroBreakingCorrectionAngle + Math.PI / 2), 1.5);
}
function Bs(e, t, n = E) {
	let { engines: r } = e;
	if (P(e, n, W), !W.engineSupportAvailable || !W.hasMass) return;
	let i = r.running;
	if (Rs(Co(i, e.atmosphere.airPressure, n), W.totalMass, oa(e)) > 1) {
		let r = xo(i, n);
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
function Vs() {
	return {
		x: 0,
		altitude: 0,
		speedX: 0,
		speedY: 0
	};
}
function Hs(e, t, n) {
	let r = e.kinematics, i = z.lugStation - t.height / 2;
	n.x = r.downRangeDistance + i * Math.sin(r.pitch), n.altitude = r.altitude + i * Math.cos(r.pitch), n.speedX = r.speedX + i * Math.cos(r.pitch) * r.angularVelocity, n.speedY = r.speedY - i * Math.sin(r.pitch) * r.angularVelocity;
}
var Us = Vs(), Ws = Vs(), K = {
	fraction: 0,
	pitch: 0,
	x: 0,
	speedX: 0,
	speedY: 0
};
function Gs(e, t, n) {
	if (n.id !== "super-heavy" || t.status.landed) return !1;
	let r = t.failures;
	if (r.crashed || r.inFlightBreakUp || r.fuelRunOut) return !1;
	let i = t.kinematics, a = n.height * Math.abs(Math.cos(i.pitch)) / 2 + n.diameter * Math.abs(Math.sin(i.pitch)) / 2;
	if (i.altitude <= a || (Hs(e, n, Us), Hs(t, n, Ws), !(Us.altitude > z.planeAltitude && Ws.altitude <= z.planeAltitude))) return !1;
	let o = (Us.altitude - z.planeAltitude) / (Us.altitude - Ws.altitude), s = e.kinematics, c = Math.atan2(Math.sin(i.pitch - s.pitch), Math.cos(i.pitch - s.pitch));
	return K.fraction = o, K.pitch = s.pitch + c * o, K.x = s.downRangeDistance + (i.downRangeDistance - s.downRangeDistance) * o + (z.lugStation - n.height / 2) * Math.sin(K.pitch), K.speedX = Us.speedX + (Ws.speedX - Us.speedX) * o, K.speedY = Us.speedY + (Ws.speedY - Us.speedY) * o, Number.isFinite(K.x) && Number.isFinite(K.pitch) && Number.isFinite(K.speedX) && Number.isFinite(K.speedY) && Math.abs(K.x - d) <= z.halfWidth && Math.abs(K.speedX) <= z.maxLateralSpeed && K.speedY < 0 && K.speedY >= -z.maxDownSpeed && Math.abs(K.pitch) <= z.maxPitch;
}
function Ks(t, n, r) {
	if (!Gs(t, n, r)) return !1;
	let i = n.kinematics, o = t.kinematics;
	return i.downRangeDistance = o.downRangeDistance + (i.downRangeDistance - o.downRangeDistance) * K.fraction, i.downRangeDistanceNextFrame = i.downRangeDistance, i.pitch = e(K.pitch), i.altitude = z.planeAltitude - (z.lugStation - r.height / 2) * Math.cos(i.pitch), i.distanceToPlanetCenter = a + i.altitude, i.speedX = i.speedY = i.trueSpeed = i.angularVelocity = 0, i.accelerationX = i.accelerationY = i.totalAcceleration = i.angularAcceleration = 0, n.status.landed = !0, n.status.onTheGround = !1, n.engines.running.fill(!1), n.engines.ignitionCountdown.fill(null), n.forces.thrust = n.forces.thrustAcceleration = n.forces.twr = n.forces.rcsThrust = 0, n.autopilot.pitchControl = n.autopilot.rcsThrustCommand = 0, !0;
}
//#endregion
//#region src/core/control/booster-arrival.ts
var q = N(), qs = .3;
function Js() {
	return {
		pitch: e(0),
		throttle: 100,
		requiredX: 0,
		requiredY: 0,
		deliveredX: 0,
		deliveredY: 0
	};
}
function Ys(t, n, r, i, a) {
	P(t, i, q);
	let o = t.kinematics, s = q.totalMass;
	if (!q.hasMass) {
		a.pitch = e(0), a.throttle = 100, a.requiredX = a.requiredY = a.deliveredX = a.deliveredY = 0;
		return;
	}
	let c = To(t.engines.running, t.atmosphere.airPressure, i), l = t.forces.thrust / s, u = t.damage ? t.forces.paidThrustAccelerationX : l * (c * Math.sin(t.vehicle.gimbalPointingDirection) + (1 - c) * Math.sin(o.pitch)), d = t.damage ? t.forces.paidThrustAccelerationY : l * (c * Math.cos(t.vehicle.gimbalPointingDirection) + (1 - c) * Math.cos(o.pitch));
	a.requiredX = n - (o.accelerationX - u), a.requiredY = r - (o.accelerationY - d), a.pitch = e(Math.max(-.3, Math.min(qs, Math.atan2(a.requiredX, Math.max(0, a.requiredY)))));
	let f = Math.max(0, a.requiredY) / Math.cos(a.pitch), p = q.engineSupportAvailable ? V(t.engines.running, t.atmosphere.airPressure, i) / s : 0;
	a.throttle = p > 0 ? Math.max(40, Math.min(100, 100 * f / p)) : 100, a.deliveredX = p * a.throttle * .01 * Math.sin(a.pitch), a.deliveredY = p * a.throttle * .01 * Math.cos(a.pitch);
}
var Xs = ca(), J = Js();
function Zs(t, n, r, i, a, o) {
	return Da(t, e(o), i, Xs), J.requiredX = n - Xs.acc.x, J.requiredY = r - Xs.acc.y, J.pitch = e(o), J.throttle = a > 0 ? Math.max(40, Math.min(100, 100 * Math.max(0, J.requiredY) / (a * Math.cos(o)))) : 100, J.deliveredX = a * J.throttle * .01 * Math.sin(o), J.deliveredY = a * J.throttle * .01 * Math.cos(o), J.deliveredX - J.requiredX;
}
function Qs(e, t) {
	let n = (J.deliveredX - J.requiredX) ** 2 + (J.deliveredY - J.requiredY) ** 2;
	return n >= t ? t : (Object.assign(e, J), n);
}
function $s(e, t, n, r, i, a = qs) {
	P(e, r, q);
	let o = q.engineSupportAvailable && q.hasMass ? V(e.engines.running, e.atmosphere.airPressure, r) / q.totalMass : 0, s = Math.max(0, Math.min(qs, a)), c = -s, l = Zs(e, t, n, r, o, c), u = Qs(i, Infinity);
	for (let a = 1; a <= 16; a++) {
		let d = -s + 2 * s * a / 16, f = Zs(e, t, n, r, o, d);
		if (u = Qs(i, u), l * f < 0) {
			let a = c, s = d, f = l;
			for (let c = 0; c < 12; c++) {
				let c = (a + s) / 2, l = Zs(e, t, n, r, o, c);
				u = Qs(i, u), f * l <= 0 ? s = c : (a = c, f = l);
			}
		}
		c = d, l = f;
	}
}
function ec(e, t, n) {
	if (P(e, n, q), !q.engineSupportAvailable || !q.hasMass) return 100;
	let r = To(e.engines.running, e.atmosphere.airPressure, n), i = r * Math.cos(e.vehicle.gimbalPointingDirection) + (1 - r) * Math.cos(e.kinematics.pitch), a = e.damage ? e.forces.paidThrustAccelerationY : e.forces.thrust / q.totalMass * i, o = e.kinematics.accelerationY - a;
	P(e, n, q);
	let s = q.engineSupportAvailable && q.hasMass ? V(e.engines.running, e.atmosphere.airPressure, n) / q.totalMass : 0;
	return s <= 0 || i <= 0 ? 100 : Math.max(40, Math.min(100, 100 * Math.max(0, t - o) / (s * i)));
}
function tc() {
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
var nc = Vs(), rc = Object.freeze([
	!0,
	!0,
	!0
]), ic = Js();
function ac(e, t, n, r) {
	P(e, n, q);
	let i = q.engineSupportAvailable && q.hasMass && rc.every((t, n) => !e.engines.failed[n]), o = q.totalMass;
	Hs(e, n, nc), r.x = nc.x - d, r.height = nc.altitude - z.planeAltitude, r.vx = nc.speedX, r.vy = nc.speedY;
	let s = e.autopilot;
	if (s.boosterArrivalTime === void 0) {
		let e = Math.max(0, r.height), t = Math.max(0, -r.vy), c = 2 * e / (t + 2), l = (i ? V(rc, C / 1e3, n) / o : 0) + D(a + z.bodyCentreAltitude, 0), u = l > 0 ? 6 * e / (Math.sqrt((t + 4) ** 2 + 6 * l * e) + t + 4) : 60;
		s.boosterArrivalTime = Math.max(.5, Math.min(60, Math.max(c, u)));
	}
	s.boosterArrivalTime = Math.max(0, s.boosterArrivalTime - t), r.time = Math.max(.25, s.boosterArrivalTime), r.ax = -6 * r.x / r.time ** 2 - 4 * r.vx / r.time, r.ay = -6 * r.height / r.time ** 2 - 4 * r.vy / r.time + 4 / r.time;
	let c = e.kinematics, l = z.lugStation - n.height / 2;
	r.bodyAX = r.ax - l * (Math.cos(c.pitch) * c.angularAcceleration - Math.sin(c.pitch) * c.angularVelocity ** 2), r.bodyAY = r.ay + l * (Math.sin(c.pitch) * c.angularAcceleration + Math.cos(c.pitch) * c.angularVelocity ** 2), r.centreAX = -6 * (c.downRangeDistance - d) / r.time ** 2 - 4 * c.speedX / r.time, r.centreAY = -6 * (c.altitude - z.bodyCentreAltitude) / r.time ** 2 - 4 * c.speedY / r.time + 4 / r.time;
	let u = i ? V(rc, e.atmosphere.airPressure, n) / o * Math.sin(qs) : 0;
	Ys(e, r.ax, r.ay, n, ic);
	let f = ic.requiredX;
	Ys(e, 6 * r.x / r.time ** 2 + 2 * r.vx / r.time, 6 * r.height / r.time ** 2 + 2 * r.vy / r.time - 8 / r.time, n, ic), r.lateralFeasible = i && Number.isFinite(f) && Number.isFinite(ic.requiredX) && Math.abs(f) <= u && Math.abs(ic.requiredX) <= u;
}
//#endregion
//#region src/core/control/booster-forecast.ts
function oc() {
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
var sc = Vs(), cc = Vs(), lc = tc();
function Y(e) {
	let t = e * 120, n = Math.round(t);
	return e === n / 120 ? n : Math.ceil(t);
}
function uc(e) {
	return Y(e) / 120;
}
function dc(e, t) {
	return Math.max(0, Y(e) - t.boostSteps - 6 * t.steadySteps) / 120;
}
function fc(e, t, n = 0) {
	let r = B(e);
	if (delete r.autopilot.boosterPrediction, delete r.autopilot.boosterForecastHandoff, r.autopilot.boosterPhase === "align-boost" || r.autopilot.boosterPhase === "boostback" && n <= 0 || !r.autopilot.boosterPhase) {
		r.autopilot.boosterPhase = "coast";
		for (let e = 0; e < r.engines.running.length; e++) Fo(r, e);
	}
	return r.autopilot.boosterCoastPitch = t, {
		state: r,
		initialTime: r.autopilot.boosterFallTime ?? 900,
		initialDraws: r.rng.counters.ignitionFailure,
		burnRemaining: uc(n),
		burnTicks: Y(n),
		cutoffClock: r.world.environmentTime,
		done: !1,
		result: oc()
	};
}
function pc(e, t, n, r, i, a) {
	let o = e.result, s = e.state, c = 0, l = e.reusePrefix, u = e.burnRemaining;
	l && (u = dc(u, l)), l && l.origin === e.origin && l.advance === n && l.policy === r && l.model === i && e.step === void 0 && e.initialTime === l.initialTime && s.autopilot.boosterCoastPitch === l.coastPitch && u > 0 && o.steps === 0 && (s = B(l.state), s.autopilot.boosterForecastBurn = !0, o.time = l.time, o.steps = l.steps, e.prefix = l, e.burnRemaining = u, e.burnTicks = Math.round(u * 120), e.cutoffClock = l.cutoffClock, e.boostSteps = l.boostSteps, e.steadySteps = l.steadySteps), delete e.reusePrefix;
	for (let l = 0; l < t && !e.done; l++) {
		Hs(s, i, sc);
		let t = s.autopilot.boosterPhase, l = t === "align-boost" || t === "boostback" || t === "entry" || t === "terminal", u = t === "boostback" && !Na.every((e) => s.engines.running[e]), f = u || t === "entry" && !(s.autopilot.boosterEntryCentreOnly ? R : Na).every((e) => s.engines.running[e]) || t === "terminal" && !R.every((e) => s.engines.running[e]), p = t === "align-boost" || f || t === "terminal" && s.autopilot.boosterArrivalTime === void 0 ? 1 / 120 : e.step ?? (e.stopAtHandoff && l || s.kinematics.altitude < 2e3 ? .05 : .25), m = t === "boostback" || !e.stopAtHandoff && e.burnRemaining > 0, h = m && e.burnTicks > 0 ? e.burnTicks < 6 ? 1 / 120 : Math.min(p, .05) : p;
		e.burnRemaining > 0 && (s.autopilot.boosterForecastBurn = !0), s.autopilot.boosterFallTime = Math.max(2, e.initialTime - o.time);
		let g = a?.eligible(s, h), _ = g ? B(s) : void 0, v;
		if (s = n(s, h, g ? (e, t, n) => {
			v = B(e), r(e, t, n);
		} : r, i), o.steps++, c++, _ && a.paid(_, v, s, h), u && (e.boostSteps = (e.boostSteps ?? 0) + 1), t === "boostback" && !u && h === .05 && (e.steadySteps = (e.steadySteps ?? 0) + 1), t === "align-boost" || m) for (let t = 0; t < Math.round(h * 120); t++) e.cutoffClock += 1 / 120;
		if (m && e.burnTicks > 0 && (e.burnTicks = Math.max(0, e.burnTicks - Math.round(h * 120)), e.burnRemaining = e.burnTicks / 120), e.readyHandoff && e.step === void 0 && e.origin && (t === "align-boost" && s.autopilot.boosterPhase === "boostback" || u && e.burnRemaining > 0 && Na.every((e) => s.engines.running[e]) || t === "boostback" && !u && h === .05)) {
			e.prefix = {
				origin: e.origin,
				state: B(s),
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
			t > 0 && (e.rollingPrefixes = _c(e.rollingPrefixes, [e.prefix])), t > 0 && !(t & t - 1) && !(e.checkpoints ?? []).some((e) => e.steadySteps === t) && (e.checkpoints = [...e.checkpoints ?? [], e.prefix]);
		}
		if ((m || e.stopAtHandoff && s.autopilot.boosterPhase === "boostback") && e.burnRemaining === 0) {
			delete s.autopilot.boosterForecastBurn, s.autopilot.boosterPhase = "coast";
			for (let e = 0; e < s.engines.running.length; e++) Fo(s, e);
			e.shutdownAt = e.cutoffClock, e.stopAtCutoff && (e.done = !0);
		}
		Hs(s, i, cc);
		let y = sc.altitude > z.planeAltitude && cc.altitude <= z.planeAltitude;
		if (o.time += h, e.stopAtHandoff && s.autopilot.boosterPhase === "terminal" && (!e.readyHandoff || t === "terminal" && R.every((e) => s.engines.running[e]))) {
			let t = s.autopilot.boosterArrivalTime;
			ac(s, 0, i, lc), t === void 0 ? delete s.autopilot.boosterArrivalTime : s.autopilot.boosterArrivalTime = t, o.handoff = {
				x: lc.x,
				height: lc.height,
				vx: lc.vx,
				vy: lc.vy,
				time: lc.time,
				lateralFeasible: lc.lateralFeasible
			}, o.rangeError = s.kinematics.downRangeDistance - d + s.kinematics.speedX * lc.time / 3, o.speedX = lc.vx, o.speedY = lc.vy, o.reached = !0, e.done = !0;
		} else if (y) {
			let t = (sc.altitude - z.planeAltitude) / (sc.altitude - cc.altitude);
			o.rangeError = sc.x + (cc.x - sc.x) * t - d, o.time -= h * (1 - t), o.speedX = sc.speedX + (cc.speedX - sc.speedX) * t, o.speedY = sc.speedY + (cc.speedY - sc.speedY) * t, o.reached = !0, e.done = !0;
		}
		(s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp || o.time >= 900 || o.steps >= 4e3) && (e.done = !0);
	}
	return o.reached || (o.rangeError = cc.x - d, o.speedX = cc.speedX, o.speedY = cc.speedY), o.fuel = s.vehicle.propellantMass, o.pitch = s.kinematics.pitch, o.ignitionDraws = s.rng.counters.ignitionFailure - e.initialDraws, o.failed = s.failures.crashed || s.failures.inFlightBreakUp || s.failures.fuelRunOut, e.state = s, c;
}
function mc(e, t, n, r) {
	let i = fc(e, t, n);
	if (i.state = B(e), delete i.state.autopilot.boosterPrediction, i.state.autopilot.boosterPhase || (i.state.autopilot.boosterPhase = "align-boost"), i.state.autopilot.boosterPhase === "boostback" && n <= 0) {
		i.state.autopilot.boosterPhase = "coast";
		for (let e = 0; e < i.state.engines.running.length; e++) Fo(i.state, e);
		i.shutdownAt = e.world.environmentTime;
	}
	return delete i.state.autopilot.boosterReturnPlan, i.state.autopilot.boosterCoastPitch = t, i.stopAtHandoff = !0, r !== void 0 && (i.step = r), i;
}
function hc(e, t, n, r, i) {
	let a = mc(e, t, n, r);
	return a.readyHandoff = !0, a.origin = e, i && (a.reusePrefix = i), a;
}
function gc(e, t, n, r) {
	let i = hc(e, t, n, void 0, r);
	return i.stopAtCutoff = !0, i;
}
function _c(e, t) {
	let n = [...e ?? []], r = n[0] ?? t[0];
	for (let e of t) !r || e.steadySteps <= 0 || e.origin !== r.origin || e.advance !== r.advance || e.policy !== r.policy || e.model !== r.model || e.coastPitch !== r.coastPitch || e.initialTime !== r.initialTime || e.boostSteps !== r.boostSteps || n.some((t) => t.steadySteps === e.steadySteps) || n.push(e);
	return n.sort((e, t) => e.steadySteps - t.steadySteps).slice(-8);
}
//#endregion
//#region src/core/control/booster-cutoff-hint.ts
function vc(e, t, n, r, i) {
	if (!e.forecast.reached || e.forecast.failed || e.forecast.fuel <= 0 || !e.forecast.handoff || t.origin !== n.origin || t.model !== n.model || t.origin.world.environmentTime !== e.originTime || t.origin.damage?.revision !== e.damageRevision || !Number.isFinite(t.range) || !Number.isFinite(n.range) || !(t.duration < e.burnDuration && n.duration > e.burnDuration)) return;
	let a = (n.range - t.range) / (n.duration - t.duration), o = e.burnDuration - e.forecast.rangeError / a;
	if (!Number.isFinite(a) || a === 0 || !Number.isFinite(o)) return;
	let s = uc(o);
	return s > r && s < i && s !== e.burnDuration ? s : void 0;
}
//#endregion
//#region src/core/control/booster-prediction.ts
var yc = N(), bc = ca(), xc = 512, Sc = Object.freeze(Na.map(() => !0));
function Cc(t, n, r) {
	let i = B(t);
	delete i.autopilot.boosterPrediction;
	let a = Math.floor(120 * i.vehicle.propellantMass / (Na.length * Oe(n.propulsion, "sea-level"))) / 120;
	P(i, n, yc);
	let o = Na.some((e) => i.engines.failed[e]) ? Sc.map((e, t) => e && !i.engines.failed[t]) : Sc, s = yc.engineSupportAvailable && yc.hasMass ? V(o, i.atmosphere.airPressure, n) / yc.totalMass : 0, c = Math.abs(i.autopilot.boosterRangeError ?? 0) / (s * (i.autopilot.boosterFallTime ?? 0)), l = uc(Number.isFinite(c) && c > 0 && c < a ? Math.max(a / 4, c) : a / 4), u = i.autopilot.boosterPhase === "align-boost" || i.autopilot.boosterPhase === "boostback", d = u ? l : 0;
	return {
		...t.autopilot.boosterSource ? { sourceLineage: t.autopilot.boosterSource.lineageId } : {},
		origin: i,
		rollout: hc(i, e(0), d),
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
function wc(t) {
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
function Tc(e) {
	return e.forecast.reached && !e.forecast.failed && e.forecast.fuel > 0 && e.forecast.handoff !== void 0 && Number.isFinite(e.forecast.rangeError);
}
function Ec(t, n, r) {
	if (t.iterations >= 16) {
		Ic(t) || (t.done = !0);
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
		Ic(t) || (t.done = !0);
		return;
	}
	let u = l / 120;
	t.attemptedTicks = [...t.attemptedTicks, l], t.duration = u, t.stage = r, t.iterations++;
	let d = Dc(t, u);
	t.rollout = hc(t.origin, e(0), u, void 0, d);
}
function Dc(e, t) {
	return [
		e.prefix,
		e.startupPrefix,
		...e.checkpoints ?? [],
		...e.rollingPrefixes ?? []
	].filter((e) => !!e && dc(t, e) > 0).sort((e, t) => t.steps - e.steps)[0];
}
function Oc(e) {
	e.rollingPrefixes = _c(e.rollingPrefixes, e.rollout.rollingPrefixes ?? []), e.rollout.startupPrefix && (e.startupPrefix = e.rollout.startupPrefix), e.rollout.prefix && (!e.prefix || e.rollout.prefix.steadySteps < e.prefix.steadySteps) && (e.prefix = e.rollout.prefix);
	for (let t of e.rollout.checkpoints ?? []) (e.checkpoints ?? []).some((e) => e.steadySteps === t.steadySteps) || (e.checkpoints = [...e.checkpoints ?? [], t]);
}
function kc(t, n) {
	t.hintTicks = [...t.hintTicks ?? [], Y(n)], t.iterations++, t.duration = n, t.stage = "hint", t.rollout = gc(t.origin, e(0), n, Dc(t, n));
}
function Ac(e, t) {
	if (!e.rollout.prefix || e.rollout.shutdownAt === void 0 || e.hintTried || e.iterations + 2 > 16 || e.origin.autopilot.boosterPhase === "coast") return !1;
	e.hintTried = !0;
	let n = [(Y(t.burnDuration) - 6) / 120, (Y(t.burnDuration) + 6) / 120];
	return !n.some((t) => t <= e.lowerDuration || t >= e.upperDuration || e.attemptedTicks.includes(Y(t)) || (e.hintTicks ?? []).includes(Y(t))) && (e.hintAnchor = t, e.hintScores = [], e.hintDurations = n, kc(e, n[0]), !0);
}
function jc(t, n, r) {
	let i = 0;
	Oc(t);
	let a = t.rollout.state;
	if (!t.hintFallWork && t.rollout.shutdownAt !== void 0 && a.vehicle.propellantMass > 0 && !t.rollout.result.failed && !a.damage?.terminal.active && (t.hintFallWork = Aa(a, z.bodyCentreAltitude, n, e(0))), t.hintFallWork) {
		let e = ja(t.hintFallWork, r, bc);
		if (i = e, t.hintForceIterations = (t.hintForceIterations ?? 0) + e, e > 0 && (t.hintForceSlices = (t.hintForceSlices ?? 0) + 1), !t.hintFallWork.done) return i;
		let o = t.hintFallWork.result;
		o.reached && Number.isFinite(o.downRange) && (t.hintScores = [...t.hintScores ?? [], {
			duration: t.duration,
			range: a.kinematics.downRangeDistance - d + o.downRange,
			origin: t.origin,
			model: n
		}]), delete t.hintFallWork;
	}
	if (t.duration === t.hintDurations[0]) return kc(t, t.hintDurations[1]), i;
	let o = t.hintScores ?? [], s = o.length === 2 ? vc(t.hintAnchor, o[0], o[1], t.lowerDuration, t.upperDuration) : void 0;
	return s === void 0 ? Rc(t) : Ec(t, s, "root"), i;
}
function Mc(e) {
	e.stage = "validate", e.rollout = fc(e.terminalOrigin, e.selected.coastPitch), e.rollout.step = 1 / 120;
}
function Nc(e, t, n = e.rollout.state) {
	e.validatedTicks = [...e.validatedTicks ?? [], Y(t.burnDuration)], e.selected = t, e.terminalOrigin = B(n), Mc(e);
}
function Pc(e) {
	let t = e.forecast.handoff, n = t.time, r = 6 * t.x / n ** 2 + 2 * t.vx / n, i = 6 * t.height / n ** 2 + 2 * t.vy / n - 8 / n - D(a + z.bodyCentreAltitude, 0);
	return Math.atan2(r, Math.max(0, i));
}
function Fc(e) {
	return e.forecast.handoff.lateralFeasible && Math.abs(Pc(e)) <= z.maxPitch;
}
function Ic(e) {
	let t = [{
		candidate: e.low,
		ready: e.lowReady
	}, {
		candidate: e.high,
		ready: e.highReady
	}].filter((e) => !!e.candidate && !!e.ready).sort((e, t) => Math.abs(e.candidate.forecast.rangeError) - Math.abs(t.candidate.forecast.rangeError));
	for (let n of t) if (Fc(n.candidate) && !(e.validatedTicks ?? []).includes(Y(n.candidate.burnDuration))) return Nc(e, n.candidate, n.ready), !0;
	return !1;
}
function Lc(e) {
	return e.status.landed && !e.status.onTheGround && e.vehicle.propellantMass > 0 && !Object.entries(e.failures).some(([e, t]) => e !== "randomFailure" && t);
}
function Rc(e) {
	if (e.iterations >= 16) {
		Ic(e) || (e.done = !0);
		return;
	}
	if (e.low && e.high) {
		let t = (e.previousCandidate && e.lastCandidate ? Wo(e.previousCandidate, e.lastCandidate, e.low, e.high) : void 0) ?? Vo(e.low, e.high);
		t === void 0 ? e.done = !0 : Ec(e, t, "root");
		return;
	}
	let t = e.low?.burnDuration ?? e.lowerDuration, n = e.high?.burnDuration ?? e.upperDuration, r = e.probeDuration ?? (e.low && !e.high && t === e.firstDuration ? Math.min((Y(t) + 1) / 120, n) : e.high && !e.low && n === e.firstDuration ? Math.max((Y(n) - 1) / 120, t) : (t + n) / 2);
	if (delete e.probeDuration, r <= t || r >= n) {
		let r = (t + n) / 2;
		r <= t || r >= n ? e.done = !0 : Ec(e, r, "upper");
	} else Ec(e, r, "upper");
}
function zc(e) {
	let t = wc(e);
	Oc(e), e.lastCandidate ? e.previousCandidate = e.lastCandidate : delete e.previousCandidate, e.lastCandidate = t;
	let n = Math.sign(e.origin.autopilot.boosterRangeError ?? e.origin.kinematics.downRangeDistance - d) || 1;
	if (e.stage === "low") {
		if (Tc(t) && (e.low = t, e.lowReady = B(e.rollout.state), e.origin.autopilot.boosterPhase === "coast" || Fc(t))) {
			Nc(e, t);
			return;
		}
		Ec(e, e.firstDuration, "upper");
		return;
	}
	if (Tc(t)) {
		if (t.forecast.rangeError * n >= 0) {
			let n = e.low ? Ho(e.low, t, e.upperDuration) : void 0;
			n !== void 0 && (e.probeDuration = n), e.low = t, e.lowReady = B(e.rollout.state);
		} else {
			let n = e.high ? Ho(e.high, t, e.upperDuration, e.lowerDuration) : void 0;
			n !== void 0 && (e.probeDuration = n), e.high = t, e.highReady = B(e.rollout.state);
		}
		if ((!e.low || !e.high) && Fc(t)) {
			Nc(e, t);
			return;
		}
		if (e.low && e.high && !e.bracketRefined) {
			e.bracketRefined = !0;
			let t = Vo(e.low, e.high), n = t === void 0 ? void 0 : Y(t);
			if (n !== void 0 && n > Y(e.low.burnDuration) && n < Y(e.high.burnDuration) && !e.attemptedTicks.includes(n) && e.iterations < 16) {
				Ec(e, t, "root");
				return;
			}
		}
		if (Ac(e, t)) return;
		if (e.hintAnchor && !e.hintRefined && t !== e.hintAnchor) {
			e.hintRefined = !0;
			let n = e.low && e.high ? Vo(e.low, e.high) : Ho(e.hintAnchor, t, e.upperDuration, e.lowerDuration);
			if (n !== void 0) {
				Ec(e, n, "root");
				return;
			}
		}
		if (Fc(t)) {
			Nc(e, t);
			return;
		}
	} else Number.isFinite(t.forecast.rangeError) && t.forecast.rangeError * n > 0 ? e.lowerDuration = e.duration : e.upperDuration = e.duration;
	Rc(e);
}
function Bc(e, t, n, r, i, a = !1) {
	zo(e);
	let o = e.autopilot, s = o.boosterPrediction, c = !s || s.done ? Cc(e, i, s?.published) : {
		...s,
		...s.hintFallWork ? { hintFallWork: {
			...s.hintFallWork,
			result: { ...s.hintFallWork.result }
		} } : {},
		rollout: {
			...s.rollout,
			state: B(s.rollout.state),
			result: { ...s.rollout.result }
		}
	}, l = Math.max(1, Math.floor(480 * t)), u = o.boosterSource && !a ? Math.max(0, l - 1) : l, d = 0, f = 0;
	for (let t = 0; t < 32 && !c.done; t++) {
		let t = c.rollout;
		if (d += pc(c.rollout, u - d, n, r, i, o.boosterSource ? {
			eligible: (t, n) => mo(e, t, n),
			paid: (t, a, o, s) => fo(e, t, a, o, s, n, r, i)
		} : void 0), c.rollout.done) {
			if (c.stage === "hint") f += jc(c, i, xc - f);
			else if (c.stage === "validate") {
				if (a && d === l) break;
				let t = c.rollout.state, n = Lc(t), r = (!o.boosterSource || o.boosterSource.valid && o.boosterSource.checked && c.sourceLineage === o.boosterSource.lineageId) && c.origin.damage?.revision === e.damage?.revision && c.selected.damageRevision === c.origin.damage?.revision, i = r ? Uo(c.selected, n, e.world.environmentTime) : void 0;
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
				i || n || c.origin.autopilot.boosterPhase === "coast" ? c.done = !0 : Rc(c);
			} else zc(c);
		}
		if (c.done || d >= u || f >= xc || c.rollout === t) break;
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
var Vc = Rn(), X = N(), Hc = zn(), Uc = ca(), Z = va(), Wc = Js(), Gc = .5, Kc = tc(), qc = (e, t, n) => Math.max(t, Math.min(n, e));
function Jc(e, t) {
	for (let n = 0; n < e.engines.running.length; n++) t.includes(n) ? !e.engines.running[n] && e.engines.ignitionCountdown[n] === null && !e.engines.failed[n] && !e.failures.fuelRunOut && Go(e, n) : Fo(e, n);
}
function Yc(t, n, r, i, a) {
	let o = t.kinematics, s = t.autopilot, c = a.gridFins;
	na(t, t.atmosphere.airDensity, n, r, o.pitch, Vc, a, Hc, e(-c.maxAngle));
	let l = Hc.torque;
	na(t, t.atmosphere.airDensity, n, r, o.pitch, Vc, a, Hc, e(c.maxAngle));
	let u = Hc.torque, d = -c.maxAngle, f = c.maxAngle;
	if (Math.abs(u - l) > 1) {
		for (let s = 0; s < 14; s++) {
			let s = (d + f) / 2;
			na(t, t.atmosphere.airDensity, n, r, o.pitch, Vc, a, Hc, e(s)), Hc.torque < i == u > l ? d = s : f = s;
		}
		let p = (d + f) / 2;
		s.boosterFinControl = p / c.maxAngle * 100, na(t, t.atmosphere.airDensity, n, r, o.pitch, Vc, a, Hc, e(p));
	} else s.boosterFinControl = 0;
}
function Xc(e, t, n, r, i = !1) {
	let a = e.kinematics, o = e.autopilot, s = Math.atan2(Math.sin(t - a.pitch), Math.cos(t - a.pitch));
	P(e, r, X, Vc);
	let c = (s / n ** 2 - 2 * a.angularVelocity / n - (X.engineSupportAvailable ? e.forces.offAxisThrustDifferenceAcceleration : 0) - e.forces.angularDragAcceleration) * (e.damage ? X.momentOfInertia : e.vehicle.vehicleMomentOfInertia), l = (X.engineSupportAvailable ? e.forces.thrust : 0) * To(e.engines.running, e.atmosphere.airPressure, r), u = a.speedX - O(e.world, a.altitude), d = a.speedY - e.world.gustVertical;
	na(e, e.atmosphere.airDensity, u, d, a.pitch, Vc, r, Hc);
	let f = Hc.torque, p = l * Vc.engineArm * Math.sin(e.vehicle.gimbalPosition * .01 * x), m = f + p;
	l > 0 ? (o.pitchControl = Math.asin(qc((c - f) / (l * Vc.engineArm), -Math.sin(x), Math.sin(x))) / x * 100, i ? (e.status.finActive = !0, Yc(e, u, d, c - p, r)) : (o.boosterFinControl = 0, e.status.finActive = !1)) : (o.pitchControl = 0, e.status.finActive = !0, Yc(e, u, d, c, r)), e.status.rcsActive = e.vehicle.rcsRunTimeRemaining > 0, o.rcsThrustCommand = e.status.rcsActive ? qc((c - m) / Vc.rcsArm, -ie, ie) : 0;
}
function Zc(t, n, r, i, a = !1) {
	zo(t);
	let o = t.autopilot;
	if (i) return o.boosterReturnPlan || o.boosterPhase === "entry" || o.boosterPhase === "terminal" ? (o.boosterFallTime = Math.max(2, (o.boosterFallTime ?? 2) - n), 0) : (o.boosterRangeError === void 0 && (Ma(t, z.bodyCentreAltitude, Uc, Z, r, e(0)), Z.reached && (o.boosterRangeError = t.kinematics.downRangeDistance - d + Z.downRange, o.boosterFallTime = Z.time)), Bc(t, n, i, nl, r, a));
	if (o.boosterPredictorCountdown = (o.boosterPredictorCountdown ?? 0) - n, o.boosterPredictorCountdown > 0) return 0;
	if (Ma(t, z.bodyCentreAltitude, Uc, Z, r, e(0)), Z.reached && (o.boosterRangeError = t.kinematics.downRangeDistance - d + Z.downRange, o.boosterFallTime = Z.time), o.boosterPhase === "coast" && Z.reached) {
		Ma(t, z.bodyCentreAltitude, Uc, Z, r, e(.05));
		let n = Z.downRange;
		Ma(t, z.bodyCentreAltitude, Uc, Z, r, e(-.05));
		let i = (n - Z.downRange) / .1;
		o.boosterCoastPitch = e(Math.abs(i) > 1 ? qc(-(o.boosterRangeError ?? 0) / i, -.2, .2) : 0);
	}
	let s = Math.abs(t.kinematics.accelerationX) * (o.boosterFallTime ?? 0) * .25;
	return o.boosterPredictorCountdown = o.boosterPhase === "boostback" && Math.abs(o.boosterRangeError ?? Infinity) <= 2 * s ? n : .25, 0;
}
function Qc(e) {
	let t = e.kinematics;
	return gt(Math.max(z.bodyCentreAltitude, t.altitude + Math.min(0, t.speedY) * jo - .5 * oa(e) * jo ** 2), Uc.atmosphere), js(Uc.atmosphere.airDensity);
}
function $c(e, t) {
	if (P(e, t, X), !X.engineSupportAvailable || !X.hasMass || R.some((t) => e.engines.failed[t])) return !1;
	let n = Math.max(0, -e.kinematics.speedY);
	if (n === 0) return !1;
	let r = oa(e), i = R.every((t) => e.engines.running[t]) ? 0 : jo, a = Math.max(0, (100 - e.vehicle.throttleCurrent) / 60), o = Math.max(i, a), s = n * o + .5 * r * o ** 2, c = n + r * o, l = ga(3, X.totalMass, c, z.bodyCentreAltitude, t), u = e.kinematics.altitude <= l + s ? _a(3, X.totalMass, c, z.bodyCentreAltitude, Uc, t, X.retainedDryMass) : null;
	return u !== null && e.kinematics.altitude <= u + s;
}
function el(e, t, n, r) {
	let i = e.autopilot;
	if (r && so(e, t), i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn) {
		i.boosterFinControl = void 0, Ro(i);
		return;
	}
	e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp || (i.boosterPhase ||= "align-boost", r || Zc(e, t, n), nl(e, t, n));
}
function tl(e, t, n, r) {
	let i = e.autopilot;
	if (i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn || e.status.landed || e.failures.crashed || e.failures.inFlightBreakUp) return;
	co(e);
	let a = uo(e, t, r, nl, n), o = Zc(e, t, n, r, !!a);
	lo(e, t, r, nl, n, a && (po(e, a) || o >= Math.max(1, Math.floor(480 * t))) ? a : void 0);
}
function nl(t, n, r) {
	zo(t);
	let i = t.autopilot, a = t.kinematics;
	if (i.manualControlOn || !i.autoLandOn && !i.autoBoostBackOn) {
		i.boosterFinControl = void 0;
		return;
	}
	if (t.status.landed || t.failures.crashed || t.failures.inFlightBreakUp) return;
	t.status.translationModeOn = !0, t.status.finLocked = !1, t.status.dumpingFuel = !1, i.boosterPhase ||= "align-boost";
	let o = (i.boosterRangeError ?? a.downRangeDistance - d) >= 0 ? -1 : 1;
	if (i.boosterPhase === "align-boost") {
		Jc(t, []), t.vehicle.throttle = 100;
		let n = e(o * Math.PI / 2);
		Xc(t, n, 1.5, r), Math.abs(Math.atan2(Math.sin(n - a.pitch), Math.cos(n - a.pitch))) < 5 * Math.PI / 180 && Math.abs(a.angularVelocity) < .1 && (i.boosterPhase = "boostback");
	} else if (i.boosterPhase === "boostback") Jc(t, Na), t.vehicle.throttle = 100, i.boostBackInitCompleted ||= (i.boostBackDirection = o, !0), Xc(t, e(i.boostBackDirection * Math.PI / 2), 1.5, r), !i.boosterForecastBurn && i.boosterReturnPlan && t.world.environmentTime + n >= i.boosterReturnPlan.shutdownAt && (Jc(t, []), i.boosterPhase = "coast");
	else if (i.boosterPhase === "coast") Jc(t, []), t.vehicle.throttle = 100, Xc(t, i.boosterReturnPlan?.coastPitch ?? i.boosterCoastPitch ?? e(0), 1.5, r), $c(t, r) ? i.boosterPhase = "terminal" : Math.hypot(a.speedX - O(t.world, a.altitude), a.speedY - t.world.gustVertical) > Qc(t) && (i.boosterPhase = "entry");
	else if (i.boosterPhase === "entry") {
		Jc(t, i.boosterEntryCentreOnly ? R : Na);
		let e = Qc(t), n = Math.sqrt(Math.max(0, e ** 2 - a.speedX ** 2)), o = Math.max(0, -a.speedY - n) / 2, s = Math.max(2, 2 * Math.max(0, a.altitude - z.bodyCentreAltitude) / (Math.max(0, -a.speedY) + 2)), c = -6 * (a.downRangeDistance - d) / s ** 2 - 4 * a.speedX / s;
		Ys(t, c, o, r, Wc), P(t, r, X);
		let l = X.engineSupportAvailable && X.hasMass ? V([
			!0,
			!0,
			!0
		], t.atmosphere.airPressure, r) / X.totalMass : 0;
		R.every((e) => t.engines.running[e]) && Math.hypot(Wc.requiredX, Wc.requiredY) <= l && (i.boosterEntryCentreOnly = !0, Jc(t, R)), $s(t, c, o, r, Wc), Xc(t, Wc.pitch, .5, r), t.vehicle.throttle = ec(t, o, r), $c(t, r) ? i.boosterPhase = "terminal" : a.speedY >= 0 && (Jc(t, []), i.boosterPhase = "coast");
	} else {
		if (i.boosterTerminalMissed) {
			Jc(t, []), Xc(t, e(0), .5, r);
			return;
		}
		if (i.boosterTerminalIgnitionTime === void 0 && (i.boosterTerminalIgnitionTime = t.world.environmentTime), Jc(t, R), R.some((e) => t.engines.failed[e]) && (i.boosterTerminalMissed = !0), !R.every((e) => t.engines.running[e]) && (t.world.environmentTime - i.boosterTerminalIgnitionTime > jo + 2 * n && (i.boosterTerminalMissed = !0), !i.boosterTerminalMissed)) {
			t.vehicle.throttle = 100, Xc(t, e(0), .5, r);
			return;
		}
		if (ac(t, n, r, Kc), i.boosterArrivalTime === 0 && (i.boosterTerminalMissed = !0), i.boosterTerminalMissed) {
			Jc(t, []), Xc(t, e(0), .5, r);
			return;
		}
		Ys(t, Kc.centreAX, Kc.centreAY, r, Wc), Xc(t, e(0), Gc, r, !0), i.pitchControl = qc(-Math.atan2(Math.sin(Wc.pitch - a.pitch), Math.cos(Wc.pitch - a.pitch)) / x * 100, -100, 100), t.vehicle.throttle = ec(t, Kc.centreAY, r), V(t.engines.running, t.atmosphere.airPressure, r) === 0 && (t.vehicle.throttle = 100);
	}
}
//#endregion
//#region src/core/autopilot/booster-utilities.ts
function rl(t, n) {
	let { autopilot: r, kinematics: i } = t;
	r.manualControlOn || t.failures.crashed || t.failures.inFlightBreakUp || t.status.landed || (r.pitchHoldOn && (Math.abs(i.pitchRateOfChange) < .4 && (r.holdingPitch = i.pitch), t.status.translationModeOn = !0, Xc(t, r.holdingPitch, .5, n)), !r.autoTakeOffOn) || (r.autoTakeOffInitialised ||= (r.autoMaxThrustOn = !0, t.engines.running.some(Boolean) || H(t, n), !0), t.status.translationModeOn = !0, Xc(t, i.altitude < 25e3 ? e(we * i.altitude / 25e3) : i.altitude < 8e4 ? e(we + (Te - we) * (i.altitude - 25e3) / 55e3) : Te, 3, n), t.vehicle.propellantMass < 12e3 && t.engines.running.some(Boolean) && (H(t, n), r.autoTakeOffOn = !1));
}
var il = en(a), al = ca(), ol = N();
function sl(e) {
	if (P(e, E, ol), !ol.engineSupportAvailable || !ol.hasMass) return 0;
	let t = ol.totalMass * il, n = 1;
	return T(E.propulsion, "sea-level", 101325 / 1e3) * .8 < t && (n = 2), T(E.propulsion, "sea-level", 101325 / 1e3) * 2 * .8 < t && (n = 3), Math.min(n, So(e.engines.failed));
}
function cl(e) {
	return _a(sl(e), ol.totalMass, -e.kinematics.speedY, 0, al, E, ol.retainedDryMass) ?? e.kinematics.altitude;
}
function ll(e) {
	let t = -e.kinematics.speedY;
	P(e, E, ol);
	let n = _a(ol.engineSupportAvailable ? xo(e.engines.running) : 0, ol.totalMass, t, E.height * .5, al, E, ol.retainedDryMass);
	return n === null ? e.kinematics.altitude : n + t * 1 * .5;
}
//#endregion
//#region src/core/autopilot/index.ts
var ul = Go, dl = Ko, fl = Rn(), Q = N();
function pl(e) {
	let { autopilot: t, kinematics: n } = e;
	!t.pitchHoldOn || t.manualControlOn || (Math.abs(n.pitchRateOfChange) < .4 && (t.holdingPitch = n.pitch), G(e, t.holdingPitch, .5));
}
function ml(e, t = E) {
	e.autopilot.autoMaxThrustOn && Ls(e, js(e.atmosphere.airDensity), 10, 4, t);
}
function hl(t) {
	let { autopilot: n, kinematics: r, vehicle: i, engines: a, status: o } = t;
	!n.autoTakeOffOn || n.manualControlOn || (n.autoTakeOffInitialised ||= (n.autoMaxThrustOn || Yo(t), yo(a.running) === 0 && H(t), o.finActive && Ko(t), o.finLocked = !0, !0), r.altitude < 25e3 ? G(t, e(we * r.altitude / 25e3), 3) : r.altitude < 8e4 ? G(t, e(we + (Te - we) * (r.altitude - 25e3) / 55e3), 3) : G(t, Te, 3), i.propellantMass < 12e3 && yo(a.running) > 0 && (H(t), Xo(t), o.finLocked = !1));
}
function gl(t, n) {
	let { autopilot: r, kinematics: i, vehicle: a, engines: o } = t;
	if (!r.autoBoostBackOn || r.manualControlOn) return;
	let s = () => {
		Zo(t), _l(t), r.autoLandOn || Qo(t);
	};
	if (r.boostBackInitCompleted ||= (r.boostBackDirection = i.downRangeDistance > d - 100 ? -Math.PI * .5 : Math.PI * .5, t.status.rcsActive || qo(t), yo(o.running) === 0 && H(t), r.autoMaxThrustOn || Yo(t), r.autoTakeOffOn && Xo(t), !0), !r.accelerationStageCompleted) r.decelerationStageEstDuration = Math.abs(i.speedX) / ge + 4, G(t, e(r.boostBackDirection), 1.5), (d - i.downRangeDistance - 100) / (i.speedX * .5) < r.decelerationStageEstDuration + 2 && (d - i.downRangeDistance) / i.speedX > 0 && (H(t), r.autoMaxThrustOn && Yo(t), r.accelerationStageCompleted = !0);
	else if (r.boostBackDecelerationStageInitCompleted ||= (r.boostBackDecelerationCheckCountdown = 5, !0), r.boostBackDecelerationCheckCountdown !== null && (r.boostBackDecelerationCheckCountdown -= n, r.boostBackDecelerationCheckCountdown <= 0 && (r.boostBackDecelerationCheckCountdown = null, i.accelerationX < 14.906640000000001 && (r.boostBackAeroDeceleration = !1, H(t)))), r.boostBackAeroDeceleration ? zs(t, r.boostBackDirection < 0 ? ge : -ge, n, dl) : (G(t, e(-r.boostBackDirection), 1), Bs(t, ul), Ns(t, ge)), Math.abs(i.speedX) < 3) {
		s();
		return;
	}
	(a.propellantMass < 12e3 || i.altitude < 700 && i.speedY < 0) && s();
}
function _l(e) {
	let { autopilot: t } = e;
	t.autoBoostBackOn = !1, t.decelerationStageEstDuration = 0, t.boostBackDirection = 0, t.boostBackInitCompleted = !1, t.boostBackAeroDeceleration = !0, t.boostBackDecelerationStageInitCompleted = !1, t.boostBackDecelerationCheckCountdown = null, t.accelerationStageCompleted = !1;
}
function vl(e) {
	let { autopilot: t } = e;
	t.autoLandOn = !1, t.initVehicleConfigCompleted = !1, t.landingSiteXPos = d, t.aeroDescentCompleted = !1, t.fineTunePercentage = void 0, t.bellyFlopTriggerAltitude = 0, t.flipStageInitialised = !1, t.flipCompleted = !1, t.horizontalAdjustmentStageCompleted = !1, t.horizontalAdjustmentStageInitialised = !1, t.horizontalAdjustmentTimeLeft = void 0, t.horizontalAdjustmentDesiredSpeed = void 0, t.effectiveVerticalMaxThrust = void 0, t.finalStagePessimisticAltitude = void 0, t.finalDescentStageInitialised = !1, t.distanceToGround = void 0, t.finalDescentStageCompleted = !1;
}
function yl(e, t) {
	let { autopilot: n, vehicle: r, engines: i, status: a } = e;
	!n.autoLandOn || n.manualControlOn || (n.initVehicleConfigCompleted ||= (a.finActive || Ko(e), a.rcsActive || qo(e), r.throttle = 40, r.propellantMass > 18e3 && !a.dumpingFuel && Jo(e), yo(i.running) > 0 && H(e), !0), a.dumpingFuel && r.propellantMass <= 18e3 && Jo(e), n.aeroDescentCompleted ? n.flipCompleted ? n.horizontalAdjustmentStageCompleted ? n.finalDescentStageCompleted || wl(e, t) : Cl(e) : Sl(e) : (bl(e), xl(e)));
}
function bl(e) {
	let { autopilot: t, kinematics: n } = e;
	if (n.altitude >= 2500) return;
	let r = sl(e) > 1 ? Ce : xe;
	t.finalStagePessimisticAltitude = cl(e), P(e, E, Q, fl);
	let i = Q.engineSupportAvailable ? Math.min(1, So(e.engines.failed)) : 0, a = i > 0 && Q.momentOfInertia > 0 && fl.engineArm > 0 ? Ot(i * T(E.propulsion, "sea-level", C / 1e3) * 40 * .01, fl.engineArm, Q.momentOfInertia) : 0;
	if (!(a > 0)) {
		t.bellyFlopTriggerAltitude = Infinity;
		return;
	}
	let o = Math.sqrt((Math.PI / 2 + ye) / 2 / a * 2) * 2;
	t.bellyFlopTriggerAltitude = t.finalStagePessimisticAltitude + -n.speedY * (o + jo) - -30 * r + E.height / 2;
}
function xl(t) {
	let { autopilot: n, kinematics: r } = t, i = r.downRangeDistance - n.landingSiteXPos + 100, a = -i / r.speedX, o;
	Math.abs(r.speedX) > 20 ? o = r.angleOfMotion - Math.PI : i > 0 ? (o = -ve, a < 5 && a > 0 && (n.fineTunePercentage = Math.abs(r.speedX) > 5 ? 1 : Math.abs(r.speedX) / 5, o = ve * 2 * n.fineTunePercentage)) : (o = ve, a < 5 && a > 0 && (n.fineTunePercentage = Math.abs(r.speedX) > 5 ? 1 : Math.abs(r.speedX) / 5, o = -ve * 2 * n.fineTunePercentage)), G(t, e(o + Math.PI / 2), .7), (r.altitude < n.bellyFlopTriggerAltitude && r.speedY < 5 && r.altitude < 2500 || r.altitude < 300) && (n.aeroDescentCompleted = !0);
}
function Sl(e) {
	let { autopilot: t, kinematics: n, vehicle: r, status: i } = e;
	t.flipStageInitialised ||= (i.dumpingFuel && Jo(e), i.rcsActive && qo(e), H(e), !0), G(e, ye, .4), n.pitch < 0 && (r.throttle = 100), n.pitch < ye && (t.flipCompleted = !0);
}
function Cl(e) {
	let { autopilot: t, kinematics: n, engines: r, status: i } = e;
	t.horizontalAdjustmentStageInitialised ||= (i.finActive && Ko(e), i.finLocked = !0, xo(r.running) < 3 && (t.horizontalAdjustmentVerticalSpeedLimit /= 1.5, t.horizontalAdjustmentHorizontalSpeedLimit *= 2), !0);
	let a = t.landingSiteXPos - n.downRangeDistance, [o, s, c] = r.running;
	o && !s && !c ? a -= 12 : (!o && s && c || !o && (s && !c || !s && c)) && (a += 4), t.finalStagePessimisticAltitude = ll(e), t.horizontalAdjustmentTimeLeft = (n.altitude - t.finalStagePessimisticAltitude - E.height / 2) / -n.speedY, t.horizontalAdjustmentDesiredSpeed = a / t.horizontalAdjustmentTimeLeft, t.horizontalAdjustmentDesiredSpeed > t.horizontalAdjustmentHorizontalSpeedLimit ? t.horizontalAdjustmentDesiredSpeed = t.horizontalAdjustmentHorizontalSpeedLimit : t.horizontalAdjustmentDesiredSpeed < -t.horizontalAdjustmentHorizontalSpeedLimit && (t.horizontalAdjustmentDesiredSpeed = -t.horizontalAdjustmentHorizontalSpeedLimit), n.speedY > t.horizontalAdjustmentVerticalSpeedLimit && Bs(e, ul), t.horizontalAdjustmentTimeLeft < 3 && t.horizontalAdjustmentTimeLeft > -3 ? Fs(e, 0, be, 10, .8) : Fs(e, t.horizontalAdjustmentDesiredSpeed ?? 0, be, 6, 1), Is(e, t.horizontalAdjustmentVerticalSpeedLimit, 10, 2), t.finalStagePessimisticAltitude * 1.1 > n.altitude && (t.horizontalAdjustmentStageCompleted = !0);
}
function wl(t, n, r = -5, i) {
	let { autopilot: a, kinematics: o, vehicle: s, engines: c, status: l } = t;
	if (a.finalDescentStageInitialised ||= !0, a.distanceToGround = o.altitude - E.height * .5, o.altitude > E.height * .5 + 5) {
		let [n, r, i] = c.running;
		n && !r && !i ? Fs(t, -.8, e(be / 2), 5, .7) : !n && r && i ? Fs(t, .8, e(be / 2), 5, .7) : !n && (r && !i || !r && i) ? Fs(t, .72, e(be / 2), 5, .7) : Fs(t, 0, e(be / 2), 5, .7);
	} else G(t, e(0), .4);
	o.speedY > r && Bs(t, ul);
	let u = -a.distanceToGround / 3 - .1, d = oa(t);
	P(t, E, Q);
	let f = (Q.engineSupportAvailable && Q.hasMass ? As(c.running, s.gimbalPointingDirection, t.atmosphere.airPressure, o.pitch) / Q.totalMass : 0) - d, p = Math.sqrt(2 * Math.max(0, f) * Math.max(0, a.distanceToGround));
	if (!i && f > 0 && -u > p) {
		let e = o.speedY + p, n = 1 + f / d - e / 10;
		Ps(t, Math.max(0, Math.min(3, n)));
	} else Is(t, u, 10, 3);
	if (o.altitude <= E.height * .5 + .05) {
		if (i) {
			i(t);
			return;
		}
		s.throttle = 40, H(t), l.forceDump = !0, l.dumpingFuel || Jo(t), Qo(t), vl(t);
	}
}
function Tl(e, t) {
	e.autopilot.demoAutoLandOn && wl(e, t, -20, (e) => {
		H(e), e.autopilot.demoAutoLandOn = !1, e.status.finLocked = !1, e.vehicle.propellantMass = p, e.autopilot.pitchControl = 0, e.vehicle.throttle = 100;
	});
}
var El = e(-Math.PI / 2);
function Dl(e) {
	let t = e.autopilot.landingSiteXPos - e.kinematics.downRangeDistance;
	return t < 0 ? t + o : t;
}
function Ol(e) {
	let { kinematics: t } = e;
	return an(t.distanceToPlanetCenter, t.speedX, t.speedY, a + he) + me;
}
function kl(e) {
	let { kinematics: t, engines: n } = e;
	if (P(e, E, Q), !Q.engineSupportAvailable || !Q.hasMass) return Infinity;
	let r = So(n.failed);
	if (r <= 0) return Infinity;
	let i = 150 * Q.totalMass / (r * T(E.propulsion, "sea-level", e.atmosphere.airPressure));
	return (t.speedX - 75) * i + an(t.distanceToPlanetCenter, t.speedX - 150, t.speedY, a + he) + me;
}
function Al(e) {
	let { autopilot: t, kinematics: n, vehicle: r, engines: i, status: a } = e;
	if (!(!t.autoDeorbitOn || t.manualControlOn)) {
		if (t.deorbitInitCompleted ||= (t.landingSiteXPos = d, a.rcsActive || qo(e), yo(i.running) > 0 && H(e), r.throttle = 100, !0), G(e, El, 4), !t.deorbitBurnStarted) {
			let i = kl(e);
			Number.isFinite(i) && Dl(e) <= i && (t.deorbitTargetSpeed = n.speedX, H(e), r.throttle = 100, t.deorbitBurnStarted = !0);
			return;
		}
		if (!t.deorbitBurnCompleted) {
			let a = t.deorbitTargetSpeed - n.speedX;
			(a >= 75 && Ol(e) <= Dl(e) || a >= 240) && (yo(i.running) > 0 && H(e), r.throttle = 40, t.deorbitBurnCompleted = !0);
			return;
		}
		n.speedY < 0 && (t.autoDeorbitOn = !1, t.autoLandOn || Qo(e));
	}
}
function jl(e, t, n = E, r) {
	if (n.id === "super-heavy") {
		let i = e.autopilot.autoLandOn || e.autopilot.autoBoostBackOn;
		el(e, t, n, r), i || (ml(e, n), rl(e, n));
		return;
	}
	Tl(e, t), ml(e), pl(e), hl(e), yl(e, t), gl(e, t), Al(e);
}
//#endregion
//#region src/core/control/actuation.ts
function Ml(e, t, n, r = !1) {
	return e < t + n && e > t - n ? t : (r ? e <= t : e < t) ? e + n : e - n;
}
function Nl(e, t, n) {
	e.vehicle.frontFinExtension = Ml(e.vehicle.frontFinExtension, t, 120 * n);
}
function Pl(e, t, n) {
	e.vehicle.aftFinExtension = Ml(e.vehicle.aftFinExtension, t, 120 * n, !0);
}
function Fl(e, t, n) {
	let { status: r, kinematics: i } = e;
	r.finActive ? i.angleOfAttack < 0 ? (Nl(e, 50 - t, n), Pl(e, 50 + t, n)) : (Nl(e, 50 + t, n), Pl(e, 50 - t, n)) : r.finLocked ? (Nl(e, 0, n), Pl(e, 0, n)) : (Nl(e, 100, n), Pl(e, 100, n));
}
function Il(e, t, n, r = !1) {
	let { status: i, vehicle: a, forces: o, autopilot: s } = e, c = s.rcsThrustCommand;
	if (s.rcsThrustCommand = 0, !i.rcsActive || a.rcsRunTimeRemaining <= 0) {
		o.rcsThrust = 0;
		return;
	}
	if (o.rcsThrust = r ? Math.max(-ie, Math.min(ie, c)) : t > 99 ? ie : t < -99 ? -ie : c, o.rcsThrust !== 0) {
		let e = 1 / n, t = Math.abs(o.rcsThrust) / ie, r = a.rcsRunTimeRemaining * e;
		t >= r ? (o.rcsThrust = Math.sign(o.rcsThrust) * ie * r, a.rcsRunTimeRemaining = 0) : a.rcsRunTimeRemaining = (r - t) / e;
	}
}
function Ll(e, t, n) {
	e.vehicle.gimbalPosition = Ml(e.vehicle.gimbalPosition, t, 600 * n);
}
function Rl(e, t) {
	e.vehicle.throttleCurrent = Ml(e.vehicle.throttleCurrent, e.vehicle.throttle, 60 * t);
}
function zl(e, t, n, r = E, i = !1) {
	e.status.translationModeOn && (r.gridFins ? (Nl(e, 50 + (e.status.finActive && !e.status.finLocked ? Math.max(-100, Math.min(100, e.autopilot.boosterFinControl ?? t)) : 0) / 2, n), Pl(e, 50, n)) : Fl(e, t / 2, n), Il(e, t, n, !!r.gridFins && !i && !e.autopilot.manualControlOn && (e.autopilot.autoLandOn || e.autopilot.autoBoostBackOn || e.autopilot.pitchHoldOn || e.autopilot.autoTakeOffOn) && e.autopilot.boosterFinControl !== void 0), Ll(e, t, n));
}
//#endregion
//#region src/core/control/mechanical.ts
function Bl(e, t, n, r, i, a, o, s = !0) {
	if (t.damage && !t.damage.terminal.active) {
		let e = t.damage.revision;
		ia(t, n, i, "hull"), t.damage.revision !== e && i.id === "super-heavy" && Ro(t.autopilot);
	}
	return t.damage?.terminal.active ? (_s(t, i, o), t.world.environmentTime += n, t) : (a(t, n, i), r.throttle !== void 0 && (t.vehicle.throttle = r.throttle), r.pitchControl !== void 0 && (t.autopilot.pitchControl = r.pitchControl, i.gridFins && (t.autopilot.boosterFinControl = r.pitchControl)), zl(t, t.autopilot.pitchControl, n, i, r.pitchControl !== void 0), Rl(t, n), _s(t, i, o), s && i.id === "super-heavy" && Ks(e, t, i), t.world.environmentTime += n, !t.failures.crashed && !t.failures.inFlightBreakUp && !t.status.onTheGround && !t.status.landed && (t.world.timeSpent += n), t);
}
//#endregion
//#region src/core/physics/body-reference.ts
function Vl(e, t, n, r) {
	let i = Math.sin(e.pitch), o = Math.cos(e.pitch), s = o * t + i * n, c = -i * t + o * n, l = e.angularVelocity, u = e.angularAcceleration;
	r.downRangeDistance = e.downRangeDistance + s, r.downRangeDistanceNextFrame = r.downRangeDistance, r.altitude = e.altitude + c, r.speedX = e.speedX + l * c, r.speedY = e.speedY - l * s, r.accelerationX = e.accelerationX + u * c - l ** 2 * s, r.accelerationY = e.accelerationY - u * s - l ** 2 * c, r.pitch = e.pitch, r.angularVelocity = l, r.angularAcceleration = u, r.distanceToPlanetCenter = a + r.altitude, r.orbitalVelocityAtCurrentAltitude = $t(r.distanceToPlanetCenter), r.trueSpeed = Math.hypot(r.speedX, r.speedY), r.totalAcceleration = Math.hypot(r.accelerationX, r.accelerationY);
}
//#endregion
//#region src/core/mission-free-flight.ts
var $ = fs(), Hl = { ...E }, Ul = { ...Ga };
function Wl(e, t, n, r) {
	let i = e.kinematics, o = Math.sin(i.pitch), s = Math.cos(i.pitch);
	e.damage ? (t.pitch = i.pitch, t.angularVelocity = i.angularVelocity, t.angularAcceleration = i.angularAcceleration, Vl(t, -r, -n, i)) : (i.downRangeDistance = t.downRangeDistance - n * o, i.downRangeDistanceNextFrame = i.downRangeDistance, i.altitude = t.altitude - n * s, i.distanceToPlanetCenter = a + i.altitude, i.orbitalVelocityAtCurrentAltitude = $t(i.distanceToPlanetCenter), i.speedX = t.speedX - n * i.angularVelocity * s, i.speedY = t.speedY + n * i.angularVelocity * o, i.accelerationX = t.accelerationX - n * (i.angularAcceleration * s - i.angularVelocity ** 2 * o), i.accelerationY = t.accelerationY + n * (i.angularAcceleration * o + i.angularVelocity ** 2 * s), i.totalAcceleration = Math.hypot(i.accelerationX, i.accelerationY)), i.trueSpeed = Math.hypot(i.speedX, i.speedY), i.machSpeed = At(i.speedX, i.speedY, O(e.world, i.altitude), e.world.gustVertical) / bt(e.atmosphere.airTemperature);
}
function Gl(e, t, n, r, i) {
	let o = _o(e);
	if (r.id === "super-heavy" && e.status.landed) return o.damage && Fi(o.damage, M(r).debris, t), o.engines.running.fill(!1), o.engines.ignitionCountdown.fill(null), o.world.environmentTime += t, o.world.updatedFrameCount += 1, o;
	if (r.id === "super-heavy" && (n.pitchControl !== void 0 || n.throttle !== void 0) && Ro(o.autopilot), o.damage?.terminal.active) return Fi(o.damage, M(r).debris, t), Ji(o), o.world.environmentTime += t, o.world.updatedFrameCount++, o;
	if (bs(o, t, r, $), o.damage && Fi(o.damage, M(r).debris, t), o.damage?.terminal.active) return o.engines.running.fill(!1), o.engines.ignitionCountdown.fill(null), o.world.environmentTime += t, o;
	Qi(o, r, $.massProperties);
	let s = o.kinematics, c = (o.damage ? $.massProperties.centreOfMass : Nn(o.vehicle.propellantMass, r)) - r.height / 2, l = o.damage ? $.massProperties.centreOfMassX : 0, u = Math.sin(s.pitch), d = Math.cos(s.pitch), f = {
		...s,
		downRangeDistance: s.downRangeDistance + c * u,
		altitude: s.altitude + c * d,
		speedX: s.speedX + c * s.angularVelocity * d,
		speedY: s.speedY - c * s.angularVelocity * u
	};
	o.damage && Vl(s, l, c, f), f.distanceToPlanetCenter = a + f.altitude;
	let p = r.id === "ship" ? Hl : Ul;
	p.height = r.height + 2 * c * Math.sign(d);
	let m = xs({
		kinematics: f,
		forces: o.forces,
		status: o.status,
		failures: o.failures
	}, t, $.bodyAccelerationX, $.bodyAccelerationY, p, o.damage ? r.height * Math.abs(d) / 2 + (f.altitude - s.altitude) : void 0);
	m && (s.angularVelocity = 0), o.damage ? Qi(o, r, $.massProperties) : Ln(o.vehicle.propellantMass, $.massProperties, r), o.vehicle.vehicleMomentOfInertia = $.massProperties.momentOfInertia, Cs(o, t, m, $), Wl(o, f, c, l), Ss(o, t, $);
	let h = ws(o, r, $);
	return Ts(o, t, m, $.omega0, $.alpha0, h), Wl(o, f, c, l), Bl(e, o, t, n, r, i, $);
}
//#endregion
//#region src/core/step.ts
var Kl = {}, ql = fs();
function Jl(e, t, n = Kl, r = E) {
	let i = Zl(e, t, n, r, Yl);
	return r.id === "super-heavy" && !i.damage?.terminal.active && tl(i, t, r, Xl), i;
}
function Yl(e, t, n) {
	jl(e, t, n, Xl);
}
function Xl(e, t, n, r) {
	return Zl(e, t, Kl, r, n);
}
function Zl(e, t, n, r, i) {
	if (e.damage) return Gl(e, t, n, r, i);
	let a = _o(e);
	if (r.id === "super-heavy" && e.status.landed) return a.engines.running.fill(!1), a.engines.ignitionCountdown.fill(null), a.world.environmentTime += t, a.world.updatedFrameCount += 1, a;
	r.id === "super-heavy" && (n.pitchControl !== void 0 || n.throttle !== void 0) && Ro(a.autopilot), bs(a, t, r, ql);
	let o = xs(a, t, ql.bodyAccelerationX, ql.bodyAccelerationY, r);
	return Ss(a, t, ql), Es(a, t, r, ql, o), Bl(e, a, t, n, r, i, ql);
}
//#endregion
export { w as $, la as A, rn as B, ja as C, Aa as D, va as E, N as F, Et as G, Jt as H, M as I, Tt as J, St as K, Oi as L, Ma as M, Da as N, _a as O, P, E as Q, Ai as R, aa as S, ca as T, Yt as U, D as V, Pt as W, bt as X, Nt as Y, gt as Z, Ga as _, es as a, r as at, ya as b, $o as c, ls as d, u as et, ss as f, vo as g, go as h, ts as i, e as it, sa as j, oa as k, ds as l, _o as m, os as n, i as nt, as as o, n as ot, ho as p, Ct as q, ns as r, t as rt, rs as s, Jl as t, a as tt, cs as u, ua as v, ga as w, ba as x, da as y, Tn as z };

//# sourceMappingURL=simulation-C1HMHBVP.js.map