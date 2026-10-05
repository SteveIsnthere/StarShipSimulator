// Exact-source module-mock proofs; frozen expected factories and helpers.
import { expect, it, vi } from 'vitest';

function exact(a: unknown, b: unknown, path = 'result'): void {
  if (typeof a === 'number' && typeof b === 'number') expect(Object.is(a, b), path).toBe(true);
  else if (a && b && typeof a === 'object' && typeof b === 'object') {
    expect(Object.keys(a), path).toEqual(Object.keys(b));
    for (const key of Object.keys(a)) exact((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`);
  } else expect(a, path).toBe(b);
}

for (const target of ['propulsion', 'aero'] as const) for (const style of ['missing-certificate', 'partial-helper'] as const) {
  it(`${target} ${style} preserves independent old outputs, scratches and original helper queries`, async () => {
    vi.resetModules();
    const realProp = await vi.importActual<typeof import('$core/physics/propulsion')>('$core/physics/propulsion');
    const realAero = await vi.importActual<typeof import('$core/physics/aero')>('$core/physics/aero');
    const flow = vi.fn(realProp.engineMassFlow), thrust = vi.fn((...args: Parameters<typeof realProp.engineThrust>) => realProp.engineThrust(...args) * (style === 'partial-helper' ? .99 : 1));
    const area = vi.fn((...args: Parameters<typeof realAero.getCrossSectionalArea>) => realAero.getCrossSectionalArea(...args) * (style === 'partial-helper' ? 1.01 : 1));
    if (target === 'propulsion') vi.doMock('$core/physics/propulsion', () => style === 'missing-certificate'
      ? { engineMassFlow: flow, engineThrust: thrust }
      : { ...realProp, engineMassFlow: flow, engineThrust: thrust });
    else vi.doMock('$core/physics/aero', () => {
      const exports = Object.fromEntries(Object.entries(realAero).filter(([name]) => style !== 'missing-certificate' || name !== 'isCanonicalBurnAero'));
      return { ...exports, getCrossSectionalArea: area };
    });
    const restores: Array<() => void> = [];
    try {
      // Dynamic model import must happen in the same module graph as current;
      // stale pre-reset SUPER_HEAVY identity would mask a faulty fast admission.
      const current = await import('$core/control/guidance-physics');
      const before = await import('./fixtures/burn-before-preparation/guidance-physics');
      const oldProp = await import('./fixtures/burn-before-preparation/propulsion');
      const oldAero = await import('./fixtures/burn-before-preparation/aero');
      const { SUPER_HEAVY } = await import('$core/vehicles/super-heavy');
      const isa = await import('$core/physics/isa');
      const originalIsa = isa.isaAtmosphereInto, isaQueries: number[] = [];
      const isaSpy = vi.spyOn(isa, 'isaAtmosphereInto').mockImplementation((altitude, out) => { isaQueries.push(altitude); originalIsa(altitude, out); });
      restores.push(() => isaSpy.mockRestore());
      const namespace = target === 'propulsion' ? await import('$core/physics/propulsion') : await import('$core/physics/aero');
      if (style === 'missing-certificate') expect((target === 'propulsion' ? 'isCanonicalBurnPropulsion' : 'isCanonicalBurnAero') in namespace).toBe(false);
      const actual = current.createBurnScratch(), expected = before.createBurnScratch();
      actual.duration = expected.duration = -17; actual.capped = expected.capped = true;
      actual.atmosphere.airTemperature = expected.atmosphere.airTemperature = -0;
      actual.atmosphere.airPressure = expected.atmosphere.airPressure = 123;
      const identities = [actual.atmosphere, actual.fallWork, actual.inputs, actual.acc];
      flow.mockClear(); thrust.mockClear(); area.mockClear(); isaQueries.length = 0;
      const got = current.landingBurnStartAltitude(3, 330000, 30, 90.5, actual, SUPER_HEAVY);
      const actualIsaQueries = [...isaQueries]; isaQueries.length = 0;
      const flowLog: unknown[] = [], thrustLog: unknown[] = [], areaLog: unknown[] = [];
      if (target === 'propulsion') {
        const originalFlow = oldProp.engineMassFlow, originalThrust = oldProp.engineThrust;
        const f = vi.spyOn(oldProp, 'engineMassFlow').mockImplementation((...args) => { flowLog.push(args); return originalFlow(...args); });
        const t = vi.spyOn(oldProp, 'engineThrust').mockImplementation((...args) => { thrustLog.push(args); return originalThrust(...args) * (style === 'partial-helper' ? .99 : 1); });
        restores.push(() => f.mockRestore(), () => t.mockRestore());
      } else {
        const originalArea = oldAero.getCrossSectionalArea;
        const a = vi.spyOn(oldAero, 'getCrossSectionalArea').mockImplementation((...args) => { areaLog.push(args); return originalArea(...args) * (style === 'partial-helper' ? 1.01 : 1); });
        restores.push(() => a.mockRestore());
      }
      const want = before.landingBurnStartAltitude(3, 330000, 30, 90.5, expected, SUPER_HEAVY);
      exact(got, want); exact(actual, expected, 'scratch'); exact(actualIsaQueries, isaQueries, 'paid-ISA-queries');
      for (let i = 0; i < identities.length; i++) expect([actual.atmosphere, actual.fallWork, actual.inputs, actual.acc][i]).toBe(identities[i]);
      if (target === 'propulsion') { exact(flow.mock.calls, flowLog); exact(thrust.mock.calls, thrustLog); expect(thrustLog.length).toBeGreaterThan(2); }
      else { exact(area.mock.calls, areaLog); expect(areaLog.length).toBeGreaterThan(2); }
    } finally {
      for (const restore of restores.reverse()) restore();
      vi.doUnmock('$core/physics/propulsion'); vi.doUnmock('$core/physics/aero'); vi.resetModules();
    }
  });
}
