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
import { PROPELLANT_CAPACITY } from './physics/mass';
import { toggleAllRaptors } from './control/commands';
import { createInitialState, type SimState } from './state';
import { circularOrbitalSpeed } from './physics/gravity';
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
  /**
   * The preset a custom flight was edited from, if any (M11.4).
   *
   * Data only: nothing in core reads it. The flight editor fills its form from
   * a preset and Configure builds a `custom` preset from the form, and this is
   * how the view learns which scenario that custom flight is a variation of —
   * the sun's hour follows the scenario, and a landing burn moved fifty metres
   * should not jump from afternoon to morning.
   */
  readonly basedOn?: string;
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
 * m — the world height the camera box covers, which sets where the intro starts.
 *
 * In 2021 this was `renderBoxPhysicalHeight = vehicleHeight * vehicleVerticalProportion`
 * (drawMethods.js:30), and `vehicleVerticalProportion` starts at 4 but is then
 * adjusted by `getInitSize()` against the browser window height, clamping the
 * ship's drawn height to 100..220 px. So 50 * 4 = 200 m on most displays, but
 * more on a very tall window: a 2000 px viewport gives ~455 m.
 *
 * THAT MEANS THE INTRO DEMO STARTED AT A DIFFERENT ALTITUDE AND SPEED ON
 * DIFFERENT SCREENS — it opened at `height - 1` metres falling at `height / 4`
 * m/s, both scaled by the viewport. On a tall enough window the demo began too
 * high and too fast for its own `-distanceToGround / 3` descent profile and
 * would arrive hot.
 *
 * v2 pins the canonical 4x value. The intro is in CLAUDE.md's "what must never
 * change" list, and a sequence that plays differently depending on the window
 * cannot be held to a golden fixture. This is also a dependency the sim should
 * never have had: wall 1 forbids core/ importing from view/, and this is
 * exactly the coupling that rule exists to prevent.
 */
export const INTRO_RENDER_BOX_HEIGHT = C.vehicleHeight * 4;

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

/**
 * Orbital presets. M2.9.
 *
 * Listed separately from PRESETS because they are not among the five the 2021
 * game shipped, and could not have been: under the 2021 model the orbital
 * relief term is clamped at g, so a vehicle at orbital speed still falls and
 * "circularize" has nothing to mean. Planet-centered gravity (M2.6, shipped
 * unconditionally at M2.10) is what makes them playable.
 */
/**
 * The altitude the orbital presets fly at. M2.9(b), owner's decision.
 *
 * 150 km, not the 100 km these presets shipped with at M2.6. Measured: a
 * perfectly circular orbit at 100 km decays to the ground within a single lap,
 * purely from drag — which is not a defect, it is what 100 km is. The Karman
 * line is the boundary of space, not a place to park; real objects there
 * deorbit within an orbit or two, and real low orbit starts around 200 km.
 *
 * At 150 km the same orbit loses about 100 m over a full 88-minute lap — real
 * decay, in air 256 times thinner than at 100 km. It is the lowest round number
 * that makes "coast a lap and then deorbit" a thing the player can actually do.
 * (Both figures are M2.14's: before it, the model held the mesopause's scale
 * height forever and 150 km was a vacuum, so nothing decayed at all.)
 */
export const ORBIT_ALTITUDE = 150_000;

/** Circular speed at that altitude, sqrt(GM/r) — 7800.7 m/s. */
const CIRCULAR = circularOrbitalSpeed(C.planetRadius + ORBIT_ALTITUDE);

/**
 * How far short of circular the Circularize preset spawns, in m/s.
 *
 * Small on purpose. The scenario is about closing an orbit that is nearly
 * closed — one short burn, a few seconds at full throttle — not about reaching
 * orbit from a suborbital lob. 20 m/s drops the perigee about 34 km, which is
 * low enough to decay if the player does nothing and high enough to leave time
 * to notice.
 */
const CIRCULARIZE_SHORTFALL = 20;

export const ORBITAL_PRESETS: readonly ScenarioPreset[] = [
  {
    id: 'circularize',
    name: 'Circularize',
    description:
      'Just short of orbital speed at 150 km — a short prograde burn closes the orbit.',
    altitude: ORBIT_ALTITUDE,
    xPosition: 0,
    speedX: CIRCULAR - CIRCULARIZE_SHORTFALL,
    speedY: 0,
    // Nose prograde, so the first thing a burn does is add horizontal speed.
    pitch: deg(90),
    propellant: 200,
  },
  {
    id: 'deorbit',
    name: 'Deorbit Burn',
    description: 'Circular at 150 km, half a lap short of StarBase. Burn retrograde and come home.',
    altitude: ORBIT_ALTITUDE,
    // Half a lap of ground track away, so the deorbit burn has somewhere to aim.
    xPosition: -Math.PI * C.planetRadius,
    speedX: CIRCULAR,
    speedY: 0,
    pitch: deg(90),
    propellant: 300,
  },
];

export const ALL_SCENARIOS: readonly ScenarioPreset[] = [
  LAUNCH_PAD,
  ...PRESETS,
  ...ORBITAL_PRESETS,
  INTRO,
];

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

  s.kinematics.downRangeDistance = preset.xPosition + C.starBaseXPos;
  s.kinematics.downRangeDistanceNextFrame = s.kinematics.downRangeDistance;

  s.kinematics.speedX = preset.speedX;
  s.kinematics.speedY = preset.speedY;
  s.kinematics.trueSpeed = Math.sqrt(preset.speedX ** 2 + preset.speedY ** 2);
  s.kinematics.machSpeed = s.kinematics.trueSpeed / C.speedOfSound;

  s.kinematics.pitch = toRad(preset.pitch);

  let propellantMass = preset.propellant * 1000;
  if (propellantMass > PROPELLANT_CAPACITY) propellantMass = PROPELLANT_CAPACITY;
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
  // welcome.js:84 — startRunningGame() ends with toggleAllRaptors(). Without
  // this the demo has no engines and simply falls; the first golden recording
  // caught exactly that.
  toggleAllRaptors(s);
  return s;
}
