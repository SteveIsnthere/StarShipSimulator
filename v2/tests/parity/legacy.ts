/**
 * Loads the 2021 backend into a sandboxed VM context so tests can compare the
 * port against the real thing rather than against a transcription of it.
 *
 * The legacy files are read-only reference (CLAUDE.md); nothing here writes to
 * them. They are plain scripts that assign to globalThis, so a VM context is
 * exactly the right shape: run them, then read the context's globals.
 *
 * Two things must be stubbed for initBackEnd() to complete:
 *   - `document`, because initEngine/initControlInput reach into the DOM to
 *     configure the throttle and pitch sliders (wall 2, in the wild).
 *   - nothing else: getRad lives in physics.js, which we load alongside.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));

/** A DOM stub recording attribute writes, so we can assert on them if needed. */
function stubDocument() {
  const elements = new Map<string, { attributes: Record<string, unknown>; value: string }>();
  return {
    getElementById(id: string) {
      let el = elements.get(id);
      if (!el) {
        el = { attributes: {}, value: '0' };
        elements.set(id, el);
      }
      return {
        setAttribute(name: string, value: unknown) {
          el!.attributes[name] = value;
        },
        get value() {
          return el!.value;
        },
        // The autopilot writes its command back to the slider
        // (`document.getElementById("pitchControl").value = pitchControl`).
        // A setter is needed or that assignment throws under strict mode.
        set value(v: unknown) {
          el!.value = String(v);
        },
        style: {} as Record<string, unknown>,
      };
    },
    _elements: elements,
  };
}

export interface LegacyContext {
  [key: string]: unknown;
}

/**
 * Run the listed legacy scripts in one context and return its globals.
 * Defaults to the set needed for a fully initialised backend.
 */
export function loadLegacy(
  scripts: readonly string[] = ['backend/physics.js', 'backend/initBackEnd.js'],
  { init = true }: { init?: boolean } = {},
): LegacyContext {
  const sandbox: Record<string, unknown> = {
    Math,
    Infinity,
    NaN,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    console,
    document: stubDocument(),
  };
  sandbox['globalThis'] = sandbox;
  const context = createContext(sandbox);

  for (const script of scripts) {
    runInContext(readFileSync(REPO + script, 'utf8'), context, { filename: script });
  }
  if (init) runInContext('initBackEnd()', context, { filename: '<init>' });

  return context as LegacyContext;
}

/**
 * v2 name -> 2021 name.
 *
 * M1.10 renamed identifiers in v2/ only; the 2021 tree keeps its spellings
 * until M5.4 retires it. Parity tests therefore have to speak both languages.
 *
 * Rather than sprinkle 2021 spellings through the tests as bare strings - where
 * a later rename would silently break the correspondence, and where a reader
 * cannot tell a typo from a deliberate misspelling - the translation lives here
 * once. Tests are written entirely in v2 names and the helpers below convert.
 *
 * The full table with rationale is docs/RENAME-MAP.md.
 */
export const LEGACY_NAME: Readonly<Record<string, string>> = {
  gimbalPosition: 'gimbolPosition',
  gimbalPointingDirection: 'gimbolPointingDirection',
  gimbalAngleLimit: 'gimbolAngleLimit',
  gimbalSpeed: 'gimbolSpeed',
  gimbalSpeedPerFrame: 'gimbolSpeedPerFrame',
  getGimbalPointingDirection: 'getGimbolPointingDirection',
  precisionAlignment: 'presisionAlignment',
  throttleLowerLimit: 'throttleLowwerLimmit',
  throttleUpperLimit: 'throttleUpperLimmit',
  frontFinSurfaceArea: 'frontFinSurfaceAera',
  aftFinSurfaceArea: 'aftFinSurfaceAera',
  totalFinSurfaceArea: 'totalFinSurfaceAera',
  finActuationMaxAngle: 'finAcuationMaxAngle',
  finActuationSpeed: 'finAcuationSpeed',
  finActuationSpeedPerFrame: 'finAcuationSpeedPerFrame',
  frontFinExtension: 'frontFinExtention',
  aftFinExtension: 'aftFinExtention',
  raptorIgnitionFailureRate: 'raptorIgnitionFaliureRate',
  randomFailure: 'randomFaliure',
  aeroDescentCompleted: 'aeroDesentCompleted',
  aeroDescentMaxCorrectionAngle: 'aeroDesentMaxCorrectionAngle',
  finalDescentStageCompleted: 'finalDesentStageCompleted',
  finalDescentStageInitialised: 'finalDesentStageInitted',
  horizontalAdjustmentStageInitialised: 'horizontalAdjustmentStageInitted',
  flipStageInitialised: 'flipStageInitted',
  autoTakeOffInitialised: 'autoTakeOffInited',
  planetCircumference: 'planetCirconference',
  planetLinearVelocity: 'planetLineaVelocity',
  integralOfRCubedTimesDx: 'intergalOfRCubedTimesDx',
  inFlightBreakUp: 'inFightBreakUp',
  overGLoad: 'overGload',
  overGLoadWarning: 'overGloadWarning',
  flipInducedXPosChange: 'flipEnducedXposChange',
  boostBackInitCompleted: 'boostBackinitCompleted',
  boostBackDecelerationStageInitCompleted: 'boostBackDecelerationStageinitCompleted',
  boostBackDirection: 'boostbackDirection',
  starBaseXPos: 'starBaseXpos',
  landingSiteXPos: 'landingSiteXpos',
  finalXPosPrediction: 'finalXposPrediction',
  initAutoLandXPosDiffThreshold: 'initAutoLandXposDiffThreshold',
  vehicleVerticalProportion: 'vehicleVerticalPropotion',
};

/** The 2021 spelling of a v2 name, or the name itself if it did not change. */
export function toLegacyName(name: string): string {
  return LEGACY_NAME[name] ?? name;
}

/** Rewrite an object's keys from v2 names to 2021 names. */
export function toLegacyKeys(globals: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(globals)) out[toLegacyName(k)] = v;
  return out;
}

/**
 * Rewrite a snippet of code to run against the 2021 globals.
 *
 * Lets a parity test write `precisionAlignment(0.3, 0.5)` and have the VM see
 * `presisionAlignment(0.3, 0.5)`. Word-boundary matched, longest name first so
 * no rename is applied inside another.
 */
const SORTED_NAMES = Object.keys(LEGACY_NAME).sort((a, b) => b.length - a.length);

export function toLegacySource(source: string): string {
  let out = source;
  for (const name of SORTED_NAMES) {
    out = out.replace(new RegExp(`\\b${name}\\b`, 'g'), LEGACY_NAME[name]!);
  }
  return out;
}
