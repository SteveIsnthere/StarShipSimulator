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
 * WHY IT IS NOW FLOWN NOSE-FIRST AND NEARLY DRY. The original subject was the
 * Booster Sep preset moved to 10 km at 368 m/s, which left its 45-degree pitch
 * and its 500 tonnes untouched: a vehicle side-on to the airstream at 28 kPa
 * with both flap pairs idle at full deflection. It held still for ten
 * milestones because the 2021 flaps balance almost exactly about a FIXED centre
 * of mass. M11.8 made the centre of mass move with the propellant, the forward
 * pair ended up far ahead of it on a full vehicle, and the subject started
 * doing what the physics now says it should: 55 degrees per second inside the
 * window the burst is taken in, which showed up as 10 px of silhouette wander
 * with the shake OFF against 12 px with it on.
 *
 * The two changes below remove that, and neither is a loosening of what is
 * asserted — both make the subject MORE like a real vehicle at max-Q:
 *
 *   pitch 90      nose along the velocity vector, so the angle of attack is
 *                 zero and the flaps make no couple. A real rocket flies max-Q
 *                 at essentially zero alpha for exactly this reason.
 *   propellant 20 the near-dry vehicle, whose centre of mass is at the dry
 *                 station the 2021 flap areas were balanced about, so what
 *                 little alpha develops is nearly untorqued.
 *
 * Measured over the three simulated seconds the spec spends there — a number
 * the spec asserts rather than assumes, see `SUBJECT_WINDOW_SECONDS` — the
 * subject turns 1.0 degree in total and never faster than 0.88 of one per
 * second, where the old one turned 77 and reached 55.3 per second, a factor of
 * 63, with Q above 23 kPa throughout against a shake that saturates at 30. Over
 * the doubled window the guard actually enforces it is 7.2 degrees and 3.3 per
 * second, and the old subject is no longer flying at all.
 *
 * `tests/view/dynamic-pressure.test.ts` asserts both halves of that, so a
 * future change to `core/` that destabilises this state fails in Node in a
 * second rather than in a fifty-minute browser run.
 */

/** The preset the editor starts from. */
export const MAX_Q_PRESET = 'booster-sep';

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
  propellant: '20',
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
};
