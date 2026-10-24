/** Refactor: complete pre-change solver/control oracle, including observable
 * helper/getter prefixes. Reuse changes numerical work, never physical output. */
import { afterEach, expect, it, vi, type MockInstance } from 'vitest';
import * as root from '$core/physics/damage-root';
import * as material from '$core/physics/damage-material';
import { writeDamageControls, createDamageControlForces, createDamageControlModel } from '$core/physics/damage-controls';
import { createDamageState, cloneDamageState } from '$core/damage-state';
import { createVehicleComponents } from '$core/physics/vehicle-components';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import * as originalRoot from './fixtures/root-before-scoped-reuse';
import { writeDamageControls as originalControls } from './fixtures/controls-before-scoped-reuse';

afterEach(() => { vi.restoreAllMocks(); });
function fixture(vehicle = SUPER_HEAVY, temperature = 293.15) {
  const partition = createVehicleComponents(vehicle);
  return { state: createDamageState(partition, temperature), model: createDamageControlModel(partition, vehicle),
    out: createDamageControlForces(partition.components.length) };
}
const batch = (work: () => void) => {
  const token = root.beginRootSolveBatch(root.loadedRootAngle, root.endRootSolveBatch);
  try { work(); } finally { root.endRootSolveBatch(token); }
};

it('retains every root bit across laws, signs, temperatures, loads and section variants', () => {
  let cases = 0;
  for (const diameter of [5, 9, 12]) for (const law of ['plate', 'grid'] as const) {
    const section = root.createRootSection(diameter), limit = law === 'plate' ? Math.PI / 2 : Math.PI / 4;
    for (const temperature of [4, 186, 293.15, 773.15, 1073.15, 1173.15, 1400])
      for (const force of [0, Number.MIN_VALUE, 1e-12, 1, 1e4, 1e8, 1e30, Number.MAX_VALUE]) {
        batch(() => {
          for (const command of [-limit, -.3, -Number.MIN_VALUE, -0, 0, Number.MIN_VALUE, .3, limit]) {
            const expected = originalRoot.loadedRootAngle(command, force, diameter * .23, temperature, section, law);
            expect(Object.is(root.loadedRootAngle(command, force, diameter * .23, temperature, section, law), expected)).toBe(true);
            expect(Object.is(root.loadedRootAngle(command, force, diameter * .23, temperature, section, law), expected)).toBe(true);
            cases++;
          }
        });
      }
  }
  expect(cases).toBe(2688);
});

it('matches complete control outputs/masks and preserves both vehicle states', () => {
  for (const vehicle of [SHIP, SUPER_HEAVY]) for (const temperature of [186, 293.15, 973.15, 1173.15, 1400])
    for (const q of [0, 1e-12, 1, 1e4, 1e7]) for (const incidence of [0, .4, 1])
      for (const command of [-.7, -0, 0, .3, .7]) for (const disposition of ['intact', 'detached', 'domain', 'failed'] as const) {
        const f = fixture(vehicle, temperature), expected = createDamageControlForces(f.model.componentCount);
        const index = f.model.columns[0]!.index;
        if (disposition === 'detached') f.state.components[index]!.attached = false;
        if (disposition === 'domain') f.state.components[index]!.root.valid = false;
        if (disposition === 'failed') f.state.components[index]!.permanentFailure = 1;
        const before = cloneDamageState(f.state);
        originalControls(f.state, f.model, q, incidence, command, -.3, expected);
        writeDamageControls(f.state, f.model, q, incidence, command, -.3, f.out);
        expect(f.out).toEqual(expected);
        expect(f.state).toEqual(before);
      }
});

it('pays all three getter prefixes but solves one symmetric numerical root per call', () => {
  const f = fixture(), reads: string[] = [];
  const model = { ...f.model, root: { ...f.model.root,
    get length() { reads.push('length'); return f.model.root.length; },
    get inertia() { reads.push('inertia'); return f.model.root.inertia; } } };
  const hypot = vi.spyOn(Math, 'hypot');
  originalControls(f.state, model, 1e4, 1, .3, 0, f.out);
  const baseline = hypot.mock.calls.length;
  expect(reads).toEqual(['length', 'inertia', 'length', 'inertia', 'length', 'inertia']);
  reads.length = 0; hypot.mockClear();
  writeDamageControls(f.state, model, 1e4, 1, .3, 0, f.out);
  const optimized = hypot.mock.calls.length;
  expect(reads).toEqual(['length', 'inertia', 'length', 'inertia', 'length', 'inertia']);
  // Three per-component moment coefficients remain outside the cached kernel.
  expect(optimized).toBeGreaterThan(3);
  expect(baseline - 3).toBe(3 * (optimized - 3));
  hypot.mockClear();
  const otherOwner = createDamageControlForces(f.model.componentCount);
  writeDamageControls(f.state, model, 1e4, 1, .3, 0, otherOwner);
  expect(hypot).toHaveBeenCalledTimes(optimized);
  expect(otherOwner).toEqual(f.out);
});

it('keys exact derived compliance and magnitude/law, including different raw inputs', () => {
  const section = root.createRootSection(9);
  batch(() => {
    for (const [command, force, lever, law] of [
      [.3, 10000, 2, 'grid'], [-.3, 20000, 1, 'grid'], [.4, 10000, 2, 'grid'],
      [.4, 10001, 2, 'grid'], [.4, 10001, 2, 'plate'], [.3, 10000, 2, 'grid'],
    ] as const) expect(Object.is(root.loadedRootAngle(command, force, lever, 293.15, section, law),
      originalRoot.loadedRootAngle(command, force, lever, 293.15, section, law))).toBe(true);
  });
});

it('preserves getter/coercion order and unusual section/forcing results or exceptions', () => {
  const section = root.createRootSection(9);
  function observed(solve: typeof root.loadedRootAngle) {
    const log: string[] = [];
    const model = { ...section,
      get length() { log.push('get length'); return { valueOf() { log.push('coerce length'); return .45; } } as unknown as number; },
      get inertia() { log.push('get inertia'); return { valueOf() { log.push('coerce inertia'); return section.inertia; } } as unknown as number; } };
    const result = solve(.3, 10000, 2, 293.15, model, 'grid');
    return { log, result };
  }
  batch(() => expect(observed(root.loadedRootAngle)).toEqual(observed(originalRoot.loadedRootAngle)));
  for (const length of [-1, -0, 0, NaN, Infinity, Number.MIN_VALUE]) {
    const model = { ...section, length };
    batch(() => expect(Object.is(root.loadedRootAngle(.3, 10000, 2, 293.15, model, 'grid'),
      originalRoot.loadedRootAngle(.3, 10000, 2, 293.15, model, 'grid'))).toBe(true));
  }
  for (const inertia of [-1, -0, 0, NaN, Infinity, Number.MIN_VALUE]) {
    const model = { ...section, inertia };
    batch(() => expect(Object.is(root.loadedRootAngle(.3, 10000, 2, 293.15, model, 'grid'),
      originalRoot.loadedRootAngle(.3, 10000, 2, 293.15, model, 'grid'))).toBe(true));
  }
  for (const command of [NaN, Infinity, Math.PI]) {
    expect(() => root.loadedRootAngle(command, 1, 1, 293.15, section, 'grid')).toThrow(RangeError);
    expect(() => originalRoot.loadedRootAngle(command, 1, 1, 293.15, section, 'grid')).toThrow(RangeError);
  }
  const throwing = { ...section, get inertia(): number { throw new Error('inertia witness'); } };
  expect(() => batch(() => root.loadedRootAngle(.3, 1, 1, 293.15, throwing, 'grid'))).toThrow('inertia witness');
  expect(() => originalRoot.loadedRootAngle(.3, 1, 1, 293.15, throwing, 'grid')).toThrow('inertia witness');
  expect(observed(root.loadedRootAngle)).toEqual(observed(originalRoot.loadedRootAngle));
});

it('restores outer scope after nested controls, caught inner throws and direct nested root calls', () => {
  for (const cause of ['controls', 'throw', 'direct'] as const) {
    function observed(writer: typeof writeDamageControls, solve: typeof root.loadedRootAngle) {
      const f = fixture(), inner = fixture(), log: string[] = [];
      let inside = false;
      const model = { ...f.model, root: { ...f.model.root,
        get length() {
          log.push('length');
          if (!inside) {
            inside = true;
            try {
              if (cause === 'direct') log.push(String(solve(.4, 20000, 2, 293.15, inner.model.root, 'grid')));
              else writer(inner.state, inner.model, cause === 'throw' ? -1 : 20000, 1, .4, 0, inner.out);
            } catch (error) { log.push(String(error)); } finally { inside = false; }
          }
          return f.model.root.length;
        } } };
      writer(f.state, model, 10000, 1, .3, 0, f.out);
      const first = structuredClone(f.out);
      writer(f.state, f.model, 10000, 1, .3, 0, f.out);
      return { first, out: f.out, inner: inner.out, log };
    }
    expect(observed(writeDamageControls, root.loadedRootAngle)).toEqual(observed(originalControls, originalRoot.loadedRootAngle));
  }
});

it('keeps six-argument replaced solver calls literal and declines a partly replaced scope pair', () => {
  const f = fixture(), spy = vi.spyOn(root, 'loadedRootAngle').mockReturnValue(.123);
  writeDamageControls(f.state, f.model, 10000, 1, .3, 0, f.out);
  expect(spy).toHaveBeenCalledTimes(3);
  expect(spy.mock.calls.every(args => args.length === 6)).toBe(true);
  expect(f.model.columns.map(c => f.out.loadedAngles[c.index])).toEqual([.123, .123, .123]);
  spy.mockRestore();
  const close = vi.spyOn(root, 'endRootSolveBatch').mockImplementation(() => {});
  const hypot = vi.spyOn(Math, 'hypot');
  originalControls(f.state, f.model, 10000, 1, .3, 0, f.out);
  const baseline = hypot.mock.calls.length; hypot.mockClear();
  writeDamageControls(f.state, f.model, 10000, 1, .3, 0, f.out);
  expect(hypot).toHaveBeenCalledTimes(baseline);
  expect(close).not.toHaveBeenCalled();
});

it('invalidates abnormal scope closes and never enables cross-call reuse', () => {
  const section = root.createRootSection(9), hypot = vi.spyOn(Math, 'hypot');
  batch(() => root.loadedRootAngle(.3, 10000, 2, 293.15, section, 'grid'));
  const baseline = hypot.mock.calls.length;
  for (const token of [0, -1, NaN, Infinity, .5, 2]) {
    root.beginRootSolveBatch(root.loadedRootAngle, root.endRootSolveBatch);
    root.loadedRootAngle(.3, 10000, 2, 293.15, section, 'grid');
    root.endRootSolveBatch(token); hypot.mockClear();
    root.loadedRootAngle(.3, 10000, 2, 293.15, section, 'grid');
    expect(hypot).toHaveBeenCalledTimes(baseline);
  }
});

it('pays changing material and section getters before every possible cache hit', () => {
  const f = fixture(), expected = createDamageControlForces(f.model.componentCount);
  const realModulus = material.steelElasticModulus;
  let materialCalls = 0, sectionCalls = 0;
  const calls: { temperature: number; modulus: number }[] = [];
  const modulus = vi.spyOn(material, 'steelElasticModulus')
    .mockImplementation(t => {
      const value = realModulus(t + (materialCalls++ % 2) * 300);
      calls.push({ temperature: t, modulus: value }); return value;
    });
  const model = { ...f.model, root: { ...f.model.root,
    get inertia() { return f.model.root.inertia * (1 + sectionCalls++ * .01); } } };
  originalControls(f.state, model, 10000, 1, .3, 0, expected);
  expect(materialCalls).toBe(3); expect(sectionCalls).toBe(3);
  const originalCalls = [...calls];
  materialCalls = sectionCalls = calls.length = 0; modulus.mockClear();
  writeDamageControls(f.state, model, 10000, 1, .3, 0, f.out);
  expect(f.out).toEqual(expected);
  expect(modulus).toHaveBeenCalledTimes(3); expect(sectionCalls).toBe(3);
  expect(calls).toEqual(originalCalls);
});

it('retains the literal helper path when the optional capability is absent', async () => {
  const solver = vi.fn<typeof root.loadedRootAngle>().mockReturnValue(.123);
  vi.resetModules();
  vi.doMock('$core/physics/damage-root', () => ({ loadedRootAngle: solver,
    rootLoadCoefficient: root.rootLoadCoefficient, rootUtilization: root.rootUtilization }));
  try {
    const controls = await import('$core/physics/damage-controls');
    const f = fixture(), expected = createDamageControlForces(f.model.componentCount);
    vi.spyOn(originalRoot, 'loadedRootAngle').mockReturnValue(.123);
    originalControls(f.state, f.model, 10000, 1, .3, 0, expected);
    controls.writeDamageControls(f.state, f.model, 10000, 1, .3, 0, f.out);
    expect(solver).toHaveBeenCalledTimes(3);
    expect(solver.mock.calls.every(args => args.length === 6)).toBe(true);
    expect(f.model.columns.map(c => f.out.loadedAngles[c.index])).toEqual([.123, .123, .123]);
    expect(f.out).toEqual(expected);
  } finally { vi.doUnmock('$core/physics/damage-root'); vi.resetModules(); }
});

it('retains the already-fetched solver when an argument getter replaces subsequent invocations', () => {
  const f = fixture(), column = f.model.columns[0]!;
  const expectedFirst = originalRoot.loadedRootAngle(.3, 10000 * column.area, column.lever,
    293.15, f.model.root, 'grid');
  let reads = 0, replacement: MockInstance<typeof root.loadedRootAngle> | undefined;
  Object.defineProperty(f.state.components[column.index]!.root, 'temperature', {
    configurable: true,
    get() {
      // First read validates proof domain; second is the already-fetched
      // solver's argument. Later columns must observe the replacement.
      if (++reads === 2) replacement = vi.spyOn(root, 'loadedRootAngle').mockReturnValue(.123);
      return 293.15;
    },
  });
  writeDamageControls(f.state, f.model, 10000, 1, .3, 0, f.out);
  expect(f.out.loadedAngles[column.index]).toBe(expectedFirst);
  expect(f.model.columns.slice(1).map(c => f.out.loadedAngles[c.index])).toEqual([.123, .123]);
  expect(replacement).toHaveBeenCalledTimes(2);
  expect(replacement!.mock.calls.every(args => args.length === 6)).toBe(true);
});
