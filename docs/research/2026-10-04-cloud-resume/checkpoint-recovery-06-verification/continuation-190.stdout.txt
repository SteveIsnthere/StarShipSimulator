/** Exact original-source oracle. No timing acceptance or physical recipe tuning. */
import { describe, expect, it, vi } from 'vitest';
import * as current from '$core/control/guidance-physics';
import * as before from './fixtures/burn-before-preparation/guidance-physics';
import * as propulsion from '$core/physics/propulsion';
import * as aero from '$core/physics/aero';
import * as oldPropulsion from './fixtures/burn-before-preparation/propulsion';
import * as oldAero from './fixtures/burn-before-preparation/aero';
import * as isa from '$core/physics/isa';
import { SHIP, type VehicleDefinition } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { V3_PROPULSION } from '$core/vehicles/v3';

function exact(actual: unknown, expected: unknown, path = 'result'): void {
  if (typeof actual === 'number' && typeof expected === 'number') {
    expect(Object.is(actual, expected), `${path}: ${actual} versus ${expected}`).toBe(true);
  } else if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    expect(Object.keys(actual), path).toEqual(Object.keys(expected));
    for (const key of Object.keys(actual)) exact((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key], `${path}.${key}`);
  } else expect(actual, path).toBe(expected);
}
function seededScratch(factory: typeof current.createBurnScratch = current.createBurnScratch): current.BurnScratch {
  const scratch = factory();
  scratch.duration = -17; scratch.capped = true;
  scratch.atmosphere.airTemperature = -0; scratch.atmosphere.airPressure = 123; scratch.atmosphere.airDensity = 456;
  scratch.acc.x = -0; scratch.acc.y = 789;
  return scratch;
}
type Case = [engines: number, mass: number, speed: number, height: number, dry?: number];
function compare(model: VehicleDefinition, values: Case): void {
  const actual = seededScratch(), expected = seededScratch(before.createBurnScratch);
  const actualIdentities = [actual.atmosphere, actual.fallWork, actual.inputs, actual.acc];
  exact(current.landingBurnStartAltitude(...values.slice(0, 4) as [number, number, number, number], actual, model, values[4] ?? model.dryMass),
    before.landingBurnStartAltitude(...values.slice(0, 4) as [number, number, number, number], expected, model, values[4] ?? model.dryMass));
  exact(actual, expected, 'scratch');
  expect([actual.atmosphere, actual.fallWork, actual.inputs, actual.acc]).toEqual(actualIdentities);
  for (let i = 0; i < actualIdentities.length; i++) expect([actual.atmosphere, actual.fallWork, actual.inputs, actual.acc][i]).toBe(actualIdentities[i]);
}
type Certificate = (self: unknown, ...helpers: unknown[]) => boolean;
function certificate(module: object, name: string): Certificate {
  const value = (module as Record<string, unknown>)[name];
  expect(typeof value, `${name} must certify the actual original module bindings`).toBe('function');
  return value as Certificate;
}

describe('burn preparation retains original source semantics', () => {
  it('admits only genuine helper certificates and rejects a predicate or helper wrapper', () => {
    const prop = certificate(propulsion, 'isCanonicalBurnPropulsion');
    const area = certificate(aero, 'isCanonicalBurnAero');
    expect(prop(prop, propulsion.engineMassFlow, propulsion.engineThrust)).toBe(true);
    expect(area(area, aero.getCrossSectionalArea)).toBe(true);
    expect(prop((...args: unknown[]) => prop(...args as [unknown, ...unknown[]]), propulsion.engineMassFlow, propulsion.engineThrust)).toBe(false);
    expect(prop(prop, (...args: Parameters<typeof propulsion.engineMassFlow>) => propulsion.engineMassFlow(...args), propulsion.engineThrust)).toBe(false);
    expect(area(area, (...args: Parameters<typeof aero.getCrossSectionalArea>) => aero.getCrossSectionalArea(...args))).toBe(false);
  });

  it('the admitted booster is a frozen data graph; the ship ignition array is not admitted', () => {
    const seen = new Set<object>();
    const check = (object: object): void => {
      if (seen.has(object)) return; seen.add(object);
      expect(Object.isFrozen(object)).toBe(true);
      for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(object))) {
        expect('value' in descriptor).toBe(true);
        if (descriptor.value && typeof descriptor.value === 'object') check(descriptor.value);
      }
    };
    check(SUPER_HEAVY);
    expect(SUPER_HEAVY.propulsion).toBe(V3_PROPULSION);
    expect(Object.isFrozen(SHIP.ignitionGroup)).toBe(false);
  });

  it('retains every numerical leaf and scratch identity across boundaries, roots and cap failures', () => {
    const cases: Case[] = [
      [0, 330000, 50, 90.5], [-1, 330000, 50, 90.5], [3, 0, 50, 90.5], [3, -0, 50, 90.5],
      [3, 330000, 0, 90.5], [3, 330000, -0, 90.5], [3, 330000, -1, 90.5],
      [3, 330000, 30, 90.5], [3, 330000, 250, 90.5], [3, 330000, 4000, 90.5],
      [1, 330000, 30, 90.5], [.5, 330000, 30, 90.5], [3, 330000, 50, -100],
      [3, 330000, 50, 86000], [3, 330000, 50, 90000], [3, 330000, 50, 90.5, 330001],
      [3, 330000, 50, 90.5, 0], [3, Number.NaN, 50, 90.5], [3, 330000, Number.NaN, 90.5],
      [3, 330000, Infinity, 90.5], [NaN, 330000, 50, 90.5], [Infinity, 330000, 50, 90.5],
    ];
    let seed = 0x61b0cafe;
    for (let i = 0; i < 24; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      cases.push([3, 280000 + seed % 100000, 20 + seed % 260, 90.5]);
    }
    for (const model of [SUPER_HEAVY, SHIP, { ...SUPER_HEAVY }]) for (const values of cases) compare(model, values);
  });

  it('retains the exact ISA query sequence, count and full scratch after each call', () => {
    const original = isa.isaAtmosphereInto;
    const seen: number[] = [];
    const spy = vi.spyOn(isa, 'isaAtmosphereInto').mockImplementation((altitude, out) => { seen.push(altitude); original(altitude, out); });
    try {
      const expected = seededScratch(before.createBurnScratch), actual = seededScratch();
      const want = before.landingBurnStartAltitude(3, 330000, 125, 90.5, expected, SUPER_HEAVY);
      const oldSequence = [...seen]; seen.length = 0;
      const got = current.landingBurnStartAltitude(3, 330000, 125, 90.5, actual, SUPER_HEAVY);
      exact(got, want); exact(actual, expected); exact(seen, oldSequence);
      expect(spy).toHaveBeenCalledTimes(oldSequence.length * 2);
      expect(oldSequence.length).toBeGreaterThan(2);
    } finally { spy.mockRestore(); }
  });

  it('retains custom getter reads, changing values, thrown error identity and scratch at throw', () => {
    const run = (solver: typeof current.landingBurnStartAltitude, factory: typeof current.createBurnScratch, throwing: boolean) => {
      const log: string[] = [], scratch = seededScratch(factory), error = sentinel;
      let reads = 0;
      const profile = new Proxy({ ...V3_PROPULSION, seaLevel: new Proxy({ ...V3_PROPULSION.seaLevel }, {
        get(target, key, receiver) { log.push(`sea.${String(key)}`); return Reflect.get(target, key, receiver); },
      }) }, { get(target, key, receiver) { log.push(`profile.${String(key)}`); return Reflect.get(target, key, receiver); } });
      const model = new Proxy({ ...SUPER_HEAVY, propulsion: profile }, {
        get(target, key, receiver) {
          log.push(`model.${String(key)}`);
          if (key === 'maxArea') { reads++; if (throwing && reads === 2) throw error; return target.maxArea + reads * .001; }
          return Reflect.get(target, key, receiver);
        },
      });
      let result: number | null | undefined, caught: unknown;
      try { result = solver(3, 330000, 30, 90.5, scratch, model); } catch (e) { caught = e; }
      return { log, scratch, result, caught };
    };
    const sentinel = new Error('second tail area read');
    for (const throwing of [false, true]) {
      const expected = run(before.landingBurnStartAltitude, before.createBurnScratch, throwing), actual = run(current.landingBurnStartAltitude, current.createBurnScratch, throwing);
      exact(actual.log, expected.log); exact(actual.scratch, expected.scratch); exact(actual.result, expected.result);
      expect(actual.caught).toBe(expected.caught);
      if (throwing) expect(actual.caught).toBe(sentinel);
    }
  });

  it('retains frozen accessors, early-return read order and distinct-scratch nested calls', () => {
    const run = (solver: typeof current.landingBurnStartAltitude, factory: typeof current.createBurnScratch, invalid: boolean) => {
      const log: string[] = [], nested = seededScratch(factory), scratch = seededScratch(factory); let entered = false;
      const model = Object.freeze({ ...SUPER_HEAVY,
        get maxArea() {
          log.push('maxArea');
          if (!entered) { entered = true; solver(3, 150000, 30, 25, nested, SHIP); }
          return SUPER_HEAVY.maxArea;
        },
      });
      const result = solver(3, invalid ? 0 : 330000, 30, 90.5, scratch, model);
      return { result, scratch, nested, log };
    };
    for (const invalid of [false, true]) exact(run(current.landingBurnStartAltitude, current.createBurnScratch, invalid), run(before.landingBurnStartAltitude, before.createBurnScratch, invalid));
    const actual = seededScratch(), expected = seededScratch(before.createBurnScratch);
    for (const model of [SUPER_HEAVY, SHIP, SUPER_HEAVY]) {
      exact(current.landingBurnStartAltitude(3, 330000, 30, 90.5, actual, model), before.landingBurnStartAltitude(3, 330000, 30, 90.5, expected, model));
      exact(actual, expected);
    }
  });

  it('observes helpers replaced during ISA scratch writes without restarting any paid query', () => {
    const run = (solver: typeof current.landingBurnStartAltitude, factory: typeof current.createBurnScratch, prop: typeof propulsion | typeof oldPropulsion, area: typeof aero | typeof oldAero) => {
      const scratch = seededScratch(factory), original = area.getCrossSectionalArea, log: string[] = [];
      let temperature = scratch.atmosphere.airTemperature, installed = false, spy: ReturnType<typeof vi.spyOn> | undefined;
      Object.defineProperty(scratch.atmosphere, 'airTemperature', { enumerable: true, configurable: true,
        get: () => temperature,
        set: (value: number) => {
          temperature = value;
          if (!installed) { installed = true; spy = vi.spyOn(area, 'getCrossSectionalArea').mockImplementation((...args) => { log.push('area'); return original(...args) * 1.01; }); }
        },
      });
      try { return { result: solver(3, 330000, 30, 90.5, scratch, SUPER_HEAVY), scratch, log, thrust: prop.engineThrust(V3_PROPULSION, 'sea-level', 0) }; }
      finally { spy?.mockRestore(); }
    };
    exact(run(current.landingBurnStartAltitude, current.createBurnScratch, propulsion, aero), run(before.landingBurnStartAltitude, before.createBurnScratch, oldPropulsion, oldAero));
  });

it('public helpers keep IEEE pressure edges independently of the scalar candidate', () => {
  for (const pressure of [-Infinity, -101.325, -0, 0, Number.MIN_VALUE, 1, 101.325, 1000, Infinity, NaN]) {
    for (const kind of ['sea-level', 'vacuum'] as const)
      exact(propulsion.engineThrust(V3_PROPULSION, kind, pressure), oldPropulsion.engineThrust(V3_PROPULSION, kind, pressure));
  }
  for (const angle of [-Infinity, -0, 0, .01, Math.PI / 2, Infinity, NaN]) {
    for (const area of [-0, 0, 10, Infinity, NaN])
      exact(aero.getCrossSectionalArea(angle as never, area, SUPER_HEAVY), oldAero.getCrossSectionalArea(angle as never, area, SUPER_HEAVY));
  }
});

it('before-call helper wrappers keep original call logs and source-oracle outputs', () => {
  const run = (old: boolean, changed: 'flow' | 'thrust' | 'area') => {
    const physics = old ? oldPropulsion : propulsion, shapes = old ? oldAero : aero;
    const solver = old ? before : current, scratch = seededScratch(solver.createBurnScratch);
    const log: unknown[] = [];
    let restore: (() => void) | undefined;
    if (changed === 'flow') {
      const original = physics.engineMassFlow;
      const spy = vi.spyOn(physics, 'engineMassFlow').mockImplementation((...args) => { log.push(['flow', args[1]]); return original(...args) * .99; });
      restore = () => spy.mockRestore();
    } else if (changed === 'thrust') {
      const original = physics.engineThrust;
      const spy = vi.spyOn(physics, 'engineThrust').mockImplementation((...args) => { log.push(['thrust', args[1], args[2]]); return original(...args) * .99; });
      restore = () => spy.mockRestore();
    } else {
      const original = shapes.getCrossSectionalArea;
      const spy = vi.spyOn(shapes, 'getCrossSectionalArea').mockImplementation((...args) => { log.push(['area', args[0], args[1]]); return original(...args) * 1.01; });
      restore = () => spy.mockRestore();
    }
    try { return { result: solver.landingBurnStartAltitude(3, 330000, 30, 90.5, scratch, SUPER_HEAVY), scratch, log }; }
    finally { restore?.(); }
  };
  for (const changed of ['flow', 'thrust', 'area'] as const) exact(run(false, changed), run(true, changed));
});

it('mid-call flow and thrust replacement stays at original dependency-read sites', () => {
  const error = new Error('late helper failure');
  const run = (old: boolean, mode: 'thrust-at-ISA' | 'thrust-at-pressure' | 'flow-at-ISA', throwing: boolean) => {
    const physics = old ? oldPropulsion : propulsion, solver = old ? before : current;
    const scratch = seededScratch(solver.createBurnScratch), log: unknown[] = [];
    let installed = false, helperCalls = 0, restore: (() => void) | undefined;
    const install = () => {
      if (installed) return; installed = true;
      if (mode === 'flow-at-ISA') {
        const original = physics.engineMassFlow;
        const spy = vi.spyOn(physics, 'engineMassFlow').mockImplementation((...args) => {
          log.push(['flow', args[1]]); if (throwing && ++helperCalls === 2) throw error;
          return original(...args) * .99;
        });
        restore = () => spy.mockRestore();
      } else {
        const original = physics.engineThrust;
        const spy = vi.spyOn(physics, 'engineThrust').mockImplementation((...args) => {
          log.push(['thrust', args[1], args[2]]); if (throwing && ++helperCalls === 2) throw error;
          return original(...args) * .99;
        });
        restore = () => spy.mockRestore();
      }
    };
    const key = mode === 'thrust-at-pressure' ? 'airPressure' : 'airTemperature';
    let value = scratch.atmosphere[key];
    Object.defineProperty(scratch.atmosphere, key, { enumerable: true, configurable: true,
      get: () => { if (mode === 'thrust-at-pressure') install(); return value; },
      set: (next: number) => { value = next; if (mode !== 'thrust-at-pressure') install(); },
    });
    let result: number | null | undefined, caught: unknown;
    try { result = solver.landingBurnStartAltitude(3, 330000, 30, 90.5, scratch, SUPER_HEAVY); } catch (e) { caught = e; }
    finally { restore?.(); }
    return { result, caught, scratch, log };
  };
  for (const mode of ['thrust-at-ISA', 'thrust-at-pressure', 'flow-at-ISA'] as const) for (const throwing of [false, true]) {
    const expected = run(true, mode, throwing), actual = run(false, mode, throwing);
    exact(actual.result, expected.result); exact(actual.scratch, expected.scratch); exact(actual.log, expected.log);
    expect(actual.caught).toBe(expected.caught);
    if (throwing) expect(actual.caught).toBe(error);
  }
});

it('density/area side effects retain getDrag callee-before-arguments order and throws', () => {
  const error = new Error('replacement drag failure');
  const run = (old: boolean, throwing: boolean) => {
    const shapes = old ? oldAero : aero, solver = old ? before : current;
    const scratch = seededScratch(solver.createBurnScratch), log: unknown[] = [];
    const originalArea = shapes.getCrossSectionalArea, originalDrag = shapes.getDrag;
    const restores: Array<() => void> = [];
    let density = scratch.atmosphere.airDensity, installed = false, dragInstalled = false, dragCalls = 0;
    Object.defineProperty(scratch.atmosphere, 'airDensity', { enumerable: true, configurable: true,
      get: () => {
        log.push('density');
        if (!installed) {
          installed = true;
          const spy = vi.spyOn(shapes, 'getCrossSectionalArea').mockImplementation((...args) => {
            log.push('area');
            if (!dragInstalled) {
              dragInstalled = true;
              const drag = vi.spyOn(shapes, 'getDrag').mockImplementation((...dragArgs) => {
                log.push('new-drag'); if (throwing && ++dragCalls === 2) throw error;
                return originalDrag(...dragArgs) * 1.01;
              });
              restores.push(() => drag.mockRestore());
            }
            return originalArea(...args);
          });
          restores.push(() => spy.mockRestore());
        }
        return density;
      },
      set: (next: number) => { density = next; },
    });
    let result: number | null | undefined, caught: unknown;
    try { result = solver.landingBurnStartAltitude(3, 330000, 30, 90.5, scratch, SUPER_HEAVY); } catch (e) { caught = e; }
    finally { for (const restore of restores.reverse()) restore(); }
    return { result, caught, scratch, log };
  };
  for (const throwing of [false, true]) {
    const expected = run(true, throwing), actual = run(false, throwing);
    exact(actual.result, expected.result); exact(actual.scratch, expected.scratch); exact(actual.log, expected.log);
    expect(actual.caught).toBe(expected.caught);
    if (throwing) expect(actual.caught).toBe(error);
  }
});

// Separate complete full/partial mock and aero/propulsion absence collection:
// burn-preparation-module-mock-proofs.ts.txt (fullscratch/identity/helper+ISA logs).
// Complete before/mid predicate and admitted pressure-getter IEEE proof:
// burn-preparation-predicate-pressure-proofs.ts.txt.
// All are concrete research drafts requiring independent review before installation.

it('admitted SUPER_HEAVY keeps pressure-getter IEEE edges, every scratch leaf and exact paid ISA sequence', () => {
  const originalIsa = isa.isaAtmosphereInto, queries: number[] = [];
  const spy = vi.spyOn(isa, 'isaAtmosphereInto').mockImplementation((altitude, out) => { queries.push(altitude); originalIsa(altitude, out); });
  const make = (factory: typeof current.createBurnScratch, pressure: number) => {
    const scratch = seededScratch(factory); let paidPressure = scratch.atmosphere.airPressure;
    Object.defineProperty(scratch.atmosphere, 'airPressure', { enumerable: true, configurable: true,
      get: () => pressure, set: (value: number) => { paidPressure = value; },
    });
    return { scratch, paid: () => paidPressure };
  };
  try {
    for (const pressure of [-Infinity, -101.325, -0, 0, Number.MIN_VALUE, 1, 101.325, Infinity, NaN]) {
      const expected = make(before.createBurnScratch, pressure), actual = make(current.createBurnScratch, pressure);
      const identities = [actual.scratch.atmosphere, actual.scratch.fallWork, actual.scratch.inputs, actual.scratch.acc];
      queries.length = 0;
      const want = before.landingBurnStartAltitude(3, 330000, 30, 90.5, expected.scratch, SUPER_HEAVY);
      const beforeQueries = [...queries]; queries.length = 0;
      const got = current.landingBurnStartAltitude(3, 330000, 30, 90.5, actual.scratch, SUPER_HEAVY);
      exact(got, want); exact(actual.scratch, expected.scratch); exact(actual.paid(), expected.paid());
      exact(queries, beforeQueries);
      for (let i = 0; i < identities.length; i++) expect([actual.scratch.atmosphere, actual.scratch.fallWork, actual.scratch.inputs, actual.scratch.acc][i]).toBe(identities[i]);
      expect(beforeQueries.length).toBeGreaterThan(0);
    }
  } finally { spy.mockRestore(); }
});

it('predicate wrappers before and during a call deny prepared admission and preserve full source semantics', () => {
  const originalIsa = isa.isaAtmosphereInto, queries: number[] = [];
  const isaSpy = vi.spyOn(isa, 'isaAtmosphereInto').mockImplementation((altitude, out) => { queries.push(altitude); originalIsa(altitude, out); });
  try {
    for (const target of ['propulsion', 'aero'] as const) for (const when of ['before', 'ISA'] as const) for (const throwing of [false, true]) {
      const actual = seededScratch(current.createBurnScratch), expected = seededScratch(before.createBurnScratch);
      const decisions: boolean[] = [], selves: unknown[] = []; let installed = false, restore: (() => void) | undefined;
      const install = () => {
        if (installed) return; installed = true;
        if (target === 'propulsion') {
          const original = propulsion.isCanonicalBurnPropulsion;
          const spy = vi.spyOn(propulsion, 'isCanonicalBurnPropulsion').mockImplementation((...args) => {
            selves.push(args[0]); if (throwing) throw predicateError;
            const allowed = original(...args); decisions.push(allowed); return allowed;
          });
          restore = () => spy.mockRestore();
        } else {
          const original = aero.isCanonicalBurnAero;
          const spy = vi.spyOn(aero, 'isCanonicalBurnAero').mockImplementation((...args) => {
            selves.push(args[0]); if (throwing) throw predicateError;
            const allowed = original(...args); decisions.push(allowed); return allowed;
          });
          restore = () => spy.mockRestore();
        }
      };
      const predicateError = new Error('admission predicate is not canonical');
      if (when === 'before') install();
      else {
        let temperature = actual.atmosphere.airTemperature;
        Object.defineProperty(actual.atmosphere, 'airTemperature', { enumerable: true, configurable: true,
          get: () => temperature, set: (value: number) => { temperature = value; install(); },
        });
      }
      try {
        queries.length = 0;
        const want = before.landingBurnStartAltitude(3, 330000, 30, 90.5, expected, SUPER_HEAVY);
        const beforeQueries = [...queries]; queries.length = 0;
        const got = current.landingBurnStartAltitude(3, 330000, 30, 90.5, actual, SUPER_HEAVY);
        exact(got, want); exact(actual, expected); exact(queries, beforeQueries);
        expect(selves.length).toBeGreaterThan(0);
        expect(decisions.every(value => value === false)).toBe(true);
      } finally { restore?.(); }
    }
  } finally { isaSpy.mockRestore(); }
});

});
