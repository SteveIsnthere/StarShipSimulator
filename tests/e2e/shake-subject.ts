/**
 * The state the max-Q shake test measures, in one place — and the reason it is
 * that state and not another.
 *
 * WHAT THE BROWSER TEST NEEDS. `tests/e2e/shake.spec.ts` proves that the lens
 * shake reaches the screen, by tracking the vehicle's silhouette across a burst
 * of screenshots with the shake on and again under `prefers-reduced-motion`.
 * The difference between the two numbers is the shake ONLY IF the vehicle sits
 * still in both. Anything the airframe does on its own appears in both series
 * and, if it is large enough, drowns the thing being measured.
 *
 * So the subject has two requirements, and they pull against each other:
 *
 *   1. Dynamic pressure high enough that `shakeAmplitude` is near saturation —
 *      the shake has to be there to be seen.
 *   2. An attitude that HOLDS for as long as a burst takes. Each of the two
 *      runs reloads the page and starts the flight again, so this is a per-run
 *      window, not their sum: `SUBJECT_WINDOW_SECONDS` below.
 *
 * WHY IT IS FLOWN NOSE-FIRST AND DRY. The loaded, side-on subject below
 * departs under the fin moment. With physical body normal force, even the old
 * 20 t nose-first subject develops enough alpha to exceed the unchanged six
 * deg/s guard. Its CoM is 19.8 m, below the neutral fin station toward the
 * engines; the resulting fin moment increases that departure.
 *
 * Use empty tanks, not a numerically optimized load: dry CoM is 21.8 m above
 * the engines, beyond the area-weighted neutral fin station of 21.61 m.
 * Thus the remaining fin moment restores a small departure instead of
 * amplifying it. This is a ballistic rendering witness, not a preset or a
 * claim about a fueled rocket's max-Q stability. Pitch starts at 90 degrees
 * along the flow. All pressure, attitude, window and screenshot bounds stay
 * unchanged; the old unstable subject remains the positive control.

 */

/** The preset the editor starts from. */
export const MAX_Q_PRESET = 'before-flip';

/**
 * Simulated seconds the browser test is allowed to spend in this state.
 *
 * The number that ties the two halves together, and it is CHECKED at both ends
 * rather than assumed at either. The Node guard replays the subject for exactly
 * this long and asserts it holds; the browser test reads the mission clock
 * after its last screenshot and asserts it did not run past it. Neither claim
 * is worth much alone: a guard over a window the browser exceeds proves nothing
 * about the browser, and a browser test with no guard is what M11.8 broke.
 *
 * Six, against three MEASURED on this machine, so a runner half this speed
 * still fits. Where the three goes is worth knowing, because it is not where it
 * looks: the flight drops to one ninth BEFORE it starts, so configuring it and
 * settling the camera cost under a second of flight between them, and
 * essentially all of the three is the burst itself — sixteen full-page
 * screenshots at about 1.7 seconds each, which is 27 seconds of wall clock and
 * therefore three of flight. The old structure spent two seconds settling at
 * full rate and one or two more working the menu on top of that.
 */
export const SUBJECT_WINDOW_SECONDS = 6;

/**
 * The editor fields, as the strings a player would type into them.
 *
 * Ten kilometres at 368 m/s is a little over 27 kPa. Placed by the editor
 * rather than flown there: reaching max-Q on an ascent takes a minute of wall
 * clock and lands somewhere slightly different each run, and the question here
 * is about a constant, not about a trajectory.
 */
export const MAX_Q_FIELDS: Readonly<Record<string, string>> = {
  altitude: '10000',
  speedX: '368',
  speedY: '0',
  pitch: '90',
  propellant: '0',
  // Retain the original Ship witness's downrange position and morning light.
  xPosition: '45000',
  launchHour: '9.55',
};

/**
 * The same subject the old one was, for the contrast the guard test draws.
 *
 * Kept so the finding is a measurement rather than a claim in a comment: the
 * test that pins the new subject's rigidity also shows this one turning through
 * more than half a revolution in the same window.
 */
export const OLD_MAX_Q_FIELDS: Readonly<Record<string, string>> = {
  altitude: '10000',
  speedX: '368',
  speedY: '0',
  pitch: '45',
  propellant: '500',
  xPosition: '45000',
  launchHour: '9.55',
};
