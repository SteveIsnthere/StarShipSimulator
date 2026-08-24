/**
 * Flight scenarios as data.
 *
 * In 2021 these were `onclick="configScenarioPreset(70000, 45000, 1130, 1130,
 * 45, 500)"` attributes in index.html, which wrote six numbers into six DOM
 * inputs that `configureNewFlight()` later read back out. The numbers are the
 * tuning; the DOM was just where they happened to live. Here they are values.
 *
 * A NOTE ON "THE SIX PRESETS". CLAUDE.md, docs/REBUILD-PLAN.md and the game's
 * own "What's New?" panel all say six scenario presets. index.html ships five
 * `configScenarioPreset(...)` buttons - Booster Sep, RTLS, Re-entry, Before
 * Flip, Landing Burn - and no sixth anywhere in the tree. Reported rather than
 * invented. The sixth is most likely the intro auto-landing demo, which is a
 * scenario in every respect except having a button, and which is included here.
 * If the owner remembers a sixth preset that was cut, it belongs in this file.
 *
 * Units follow the 2021 form fields exactly, including their oddities:
 * altitude in metres, X-position in metres RELATIVE TO STARBASE, speeds in m/s,
 * pitch in DEGREES, and propellant in TONNES.
 */
import * as C from './constants';
import { createInitialState, type SimState } from './state';
import { deg, toRad, type Deg } from './units';

/** The six numbers a 2021 preset button carried, in their original units. */
export interface ScenarioPreset {
  readonly id: string;
  readonly name: string;
  /** What this scenario is for, in a sentence. */
  readonly description: string;
  /** m above ground. */
  readonly altitude: number;
  /** m, relative to StarBase — negative is short of the pad. */
  readonly xPosition: number;
  /** m/s, downrange. */
  readonly speedX: number;
  /** m/s, vertical; negative is falling. */
  readonly speedY: number;
  /** degrees, as typed into the 2021 form. */
  readonly pitch: Deg;
  /** tonnes. */
  readonly propellant: number;
}

/**
 * The five presets shipped in index.html, in their menu order.
 * Values verbatim from the onclick attributes.
 */
export const PRESETS: readonly ScenarioPreset[] = [
  {
    id: 'booster-sep',
    name: 'Booster Sep',
    description: 'Just after stage separation: high, fast, and pointed downrange.',
    altitude: 70_000,
    xPosition: 45_000,
    speedX: 1130,
    speedY: 1130,
    pitch: deg(45),
    propellant: 500,
  },
  {
    id: 'rtls',
    name: 'RTLS',
    description: 'Return to launch site — downrange and climbing, needs a boostback burn.',
    altitude: 15_000,
    xPosition: 5_000,
    speedX: 330,
    speedY: 430,
    pitch: deg(30),
    propellant: 200,
  },
  {
    id: 'reentry',
    name: 'Re-entry',
    description: 'Orbital velocity, 1980 km short of the pad. The hardest one.',
    altitude: 80_000,
    xPosition: -1_980_000,
    speedX: 7300,
    speedY: -30,
    pitch: deg(30),
    propellant: 50,
  },
  {
    id: 'before-flip',
    name: 'Before Flip',
    description: 'Belly-down at terminal velocity, moments from the flip.',
    altitude: 1_000,
    xPosition: -100,
    speedX: 0,
    speedY: -70,
    pitch: deg(90),
    propellant: 30,
  },
  {
    id: 'landing-burn',
    name: 'Landing Burn',
    description: 'Vertical, low and slow. The last few seconds.',
    altitude: 200,
    xPosition: 0,
    speedX: 0,
    speedY: -35,
    pitch: deg(0),
    propellant: 20,
  },
];

/** The launch pad — what `initBackEnd()` produces with no preset applied. */
export const LAUNCH_PAD: ScenarioPreset = {
  id: 'launch-pad',
  name: 'Launch Pad',
  description: 'On the pad at StarBase, full tanks.',
  altitude: C.vehicleHeight / 2,
  xPosition: 0,
  speedX: 0,
  speedY: 0,
  pitch: deg(0),
  propellant: C.propellantMass / 1000,
};

/**
 * utilities/welcome.js:66 — the intro auto-landing demo's initial conditions.
 *
 * `renderBoxPhysicalHeight` is a view constant in 2021 (the world height the
 * camera box covers). The sim only needs the numbers it produced, so it is a
 * parameter here rather than a dependency on view/ — which wall 1 forbids.
 */
export const INTRO_RENDER_BOX_HEIGHT = 1000;

export const INTRO: ScenarioPreset = {
  id: 'intro',
  name: 'Intro Demo',
  description: 'The auto-landing sequence that plays when the game opens.',
  altitude: INTRO_RENDER_BOX_HEIGHT - 1,
  xPosition: 0,
  speedX: 0,
  speedY: -INTRO_RENDER_BOX_HEIGHT / 4,
  pitch: deg(0),
  propellant: 12,
};

export const ALL_SCENARIOS: readonly ScenarioPreset[] = [LAUNCH_PAD, ...PRESETS, INTRO];

/** Look one up by id. */
export function getScenario(id: string): ScenarioPreset | undefined {
  return ALL_SCENARIOS.find((s) => s.id === id);
}

/**
 * Build a SimState from a preset.
 *
 * Applies `configureNewFlight()`'s conversions and clamps verbatim
 * (tools.js:188): altitude is floored at `vehicleHeight / 2` so the vehicle
 * cannot spawn inside the ground, X-position is relative to StarBase, pitch is
 * degrees, and propellant is tonnes capped at 1200 t.
 */
export function createScenarioState(preset: ScenarioPreset, seed?: number): SimState {
  const s = seed === undefined ? createInitialState() : createInitialState(seed);

  let altitude = preset.altitude;
  if (altitude < C.vehicleHeight / 2) altitude = C.vehicleHeight / 2;
  s.kinematics.altitude = altitude;
  s.kinematics.distanceToPlanetCenter = C.planetRadius + altitude;

  s.kinematics.downRangeDistance = preset.xPosition + C.starBaseXpos;
  s.kinematics.downRangeDistanceNextFrame = s.kinematics.downRangeDistance;

  s.kinematics.speedX = preset.speedX;
  s.kinematics.speedY = preset.speedY;
  s.kinematics.trueSpeed = Math.sqrt(preset.speedX ** 2 + preset.speedY ** 2);
  s.kinematics.machSpeed = s.kinematics.trueSpeed / C.speedOfSound;

  s.kinematics.pitch = toRad(preset.pitch);

  let propellantMass = preset.propellant * 1000;
  if (propellantMass > 1_200_000) propellantMass = 1_200_000;
  s.vehicle.propellantMass = propellantMass;
  s.vehicle.vehicleMass = C.vehicleDryMass + propellantMass;

  return s;
}

/**
 * The intro demo, ready to play: final-descent autopilot armed, fins locked,
 * all three engines commanded. welcome.js:66-84.
 */
export function createIntroState(seed?: number): SimState {
  const s = createScenarioState(INTRO, seed);
  s.status.finLocked = true;
  s.autopilot.demoAutoLandOn = true;
  // startRunningGame() calls toggleAllRaptors(). Ignition is a dt countdown now,
  // so they light shortly after the demo begins, exactly as they did in 2021.
  s.engines.ignitionCountdown = [null, null, null];
  return s;
}
