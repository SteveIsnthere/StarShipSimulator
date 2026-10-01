/**
 * The fixture audit trail: every time a golden has moved, and what moved it.
 *
 * WHERE THIS CAME FROM. M2.10 removed the fidelity-flag machinery — deleting
 * `core/flags.ts`, four conditional branches in `step()`, a SimState field the
 * integrator read, and seven quadrant ladders — and the honest question about a
 * restructure that large is not "does it still fly" but "is it the SAME
 * simulation". It was, bit for bit: all seven fixtures' rows came out identical
 * to the flag-on recordings from commit 115879c. Rather than keep a second
 * fixture set around to prove that (which would defeat "one physics, one
 * fixture set"), the proof was reduced to a hash of each rows block.
 *
 * WHAT IT IS NOW. Those hashes turned out to be worth keeping for a second
 * reason: they make every subsequent movement visible and attributable. A tier
 * that claims to move one scenario can be checked against the table below, and
 * a change that moves a fixture nobody expected shows up here first.
 *
 *     M2.10   flags removed                      moved NOTHING — the point
 *     M2.9(a) heatLimit 55 -> 390                re-entry only
 *     M2.11   the dead RCS command               re-entry and RTLS only
 *     M2.12   the doubled tangential term        ALL SEVEN
 *     M2.14   the thermosphere                   booster-sep only
 *     M10.5   the NaN throttle escape            moved NOTHING — see below
 *     M11.1   the wind wiring                    moved NOTHING; one fixture ADDED
 *     M11.2   thrust with altitude               ALL EIGHT
 *     M11.3   velocity Verlet                    ALL EIGHT
 *     M11.8   the centre of mass moves           ALL EIGHT
 *     M12     the angular drag axis              ALL EIGHT
 *     P5.3    guidance on local gravity          ALL EIGHT
 *     P5.4    the burn sized by the predictor    five: three fly, two plan
 *     P5.5    dead prediction fields removed     moved NOTHING (headers only)
 *     P5.6    the trigger computed where it acts re-entry and RTLS, planning keys only
 *
 * Each row is a shape, and the shape is the check. M2.12 moving all seven is
 * not a surprise to be explained away: the term it corrects acts on any vehicle
 * both climbing or falling and moving downrange, which is every scenario except
 * sitting on the pad, and a change that moved fewer would have been the
 * suspicious one. M2.14 moving only booster-sep is the same argument in
 * reverse: it changes the air above 86 km, and booster-sep is the one flight
 * that goes there.
 *
 * M10.5 moving nothing is the same test once more, and it caught a mistake.
 * The fix stops a NaN escaping the throttle clamp (a TWR of zero asked of
 * engines producing no thrust: 0/0). No golden reaches that pair, so none of
 * them may move — and none does.
 *
 * The first attempt DID move five, which is how the error was found. That guard
 * tested `!Number.isFinite` and so swallowed +-Infinity as well as NaN, and
 * Infinity was already handled correctly by the clamp: a positive TWR with no
 * thrust yet means "command everything", and the over-broad guard re-commanded
 * it to the 40% floor, throttling the vehicle down at every engine start. Five
 * moved fixtures were the symptom of a second, undeclared behaviour change
 * hiding inside a declared one. This table is what made it visible.
 *
 * M11.1 moving nothing is the same test a third time, and it caught a first
 * attempt. Wiring `world.wind` into the aerodynamics is a genuine physics
 * change, but every one of the seven fixtures is flown in still air, where
 * `speedX - 0 - 0` is `speedX` exactly and the relative-wind expressions return
 * the same bits as the ground ones — so none of the seven may move, and none
 * does. The first attempt stored the airspeed as two new SimState fields; that
 * moved all seven digests for their SHAPE with no value changed, and review
 * showed it was avoidable: the airspeed is a step-local now, and the digests
 * are exactly where M10.5 left them. The eighth fixture, landing-burn-headwind,
 * is new rather than moved — the landing burn in 10 m/s of downrange wind — and
 * is the only golden in which the wiring does anything at all.
 *
 * M11.2 moving all eight is the M2.12 argument again: a Raptor now makes
 * 230 tf at 327 s on the pad and the same 703 kg/s buys 350 s in vacuum, where
 * before it made a flat 2.2 MN at 650 kg/s everywhere. Every scenario either
 * burns an engine or plans a burn, so every one moves — and the SHAPE of the
 * movement is the check. The four landings all still land, at the same 25.0 m
 * and -0.08 m/s (the soul: the intro auto-landing is unchanged in outcome).
 * Re-entry has its engines off throughout and moves in exactly two keys, the
 * autopilot's `bellyFlopTriggerAltitude` and `finalStagePessimisticAltitude`,
 * 360 rows each, 720 leaves — the planning estimates that read max thrust, and
 * nothing physical. Launch-pad climbs 2.4 km higher in the same 90 s on 7% more
 * thrust as the air thins, and arrives 14.3 t lighter: 3 engines x 53.4 kg/s
 * more flow x 90 s, to the tonne. The headwind landing lights its third engine
 * for a shorter stretch (2.5% more thrust at sea level than the old flat
 * figure) and touches down one sample earlier. The before/after diff is in the
 * commit message.
 *
 * M11.3 moving all eight is the integrator itself changing: every row after the
 * first is a different scheme's arithmetic, and a fixture that did NOT move
 * would mean the new integrator was not running. The shape check is the
 * OUTCOMES. The four landings all still land at 25.0 m — and at a vertical
 * speed of exactly 0.00 rather than the -0.08 m/s the old order left behind
 * (its checkIfCrash zeroed the speed and 3b re-accelerated it under gravity
 * every step; ground contact is explicit now, and a held vehicle has zero
 * speed and zero acceleration, which is also the 1 g the HUD should read on
 * the pad). Every flight ends within metres of where it did: launch-pad 7 m
 * higher at 90 s, booster-sep 2 m, RTLS 0.4 m, re-entry 0.4 m lower — a
 * second-order correction to trajectories that are dominated by thrust and
 * drag, where the first-order error was small to begin with. ONE DISCRETE
 * DECISION MOVED: in landing-burn-headwind the autopilot lit a second engine
 * for one sampled instant at 150 m before and does not now — the burn is flown
 * on one engine throughout, and lands the same. Its still-air twin lights the
 * same engines at the same samples before and after. Review found it by
 * decoding the fixtures, which is what the fixtures are for. The proof that
 * the change is the one claimed is tests/core/verlet.test.ts, against
 * Kepler's closed form: position error falls as dt^2 (ratio 4.0, where Euler
 * gave 2.0) and energy on an eccentric vacuum orbit is conserved to 7e-13 at
 * 1/120 (Euler: 2e-6).
 *
 * M11.8 moving all eight is a geometry change under every flight: the centre
 * of mass follows the propellant now, so the gimbal's arm, both fin arms and
 * the RCS arm are functions of the load rather than constants. The shape is
 * the OUTCOMES, and two of them are the story.
 *
 * The four landings still land at 25.0 m and 0.00 m/s. They fly on twenty to
 * fifty tonnes, where the arms are within a metre or two of the constants they
 * were tuned on — that is what anchoring the layout on the DRY centre of mass
 * buys, and it is why the intro is untouched.
 *
 * The full-tank flights are where it bites, and the first attempt at this task
 * was abandoned because of it. The 2021 flaps are balanced almost exactly
 * about a FIXED centre of mass (front area x arm 564, aft 577), which is what
 * let the launch scenario climb with both pairs at 100% — something no rocket
 * does. Move the centre of mass and the forward pair sits far ahead of it and
 * is strongly destabilising: the ascent pitched to 98 degrees by 90 s and lost
 * half its climb rate. The fix is the one a real vehicle uses rather than a
 * retuned number: `autoTakeOff` stows the flaps, and the ascent comes back
 * BETTER than it was (22 418 m and 513 m/s at 90 s, against 22 352 and 509).
 *
 * RTLS keeps its profile but swaps two events: lighter to turn, it flips
 * sooner and is still burning as it goes over the top, so MECO now follows
 * APOGEE. Apogee drops 20.8 km to 19.3. See tests/hud/timeline.test.ts.
 *
 * P5.3 (Phase 5, Task 3, Fidelity) moving all eight is the shape of a change
 * to the throttle laws every flight runs through: the TWR laws size thrust
 * against `localGravity` (gravity at altitude less the centrifugal term)
 * instead of a flat 9.807 m/s², and boost-back commands its 1.6 g0 deceleration
 * as an acceleration instead of a TWR. The four landings move: up to 1 m of
 * altitude and 1.2 m/s of vertical speed mid-burn, all still touching down at
 * 25.0 m and 0.00 m/s, with slightly more propellant left (a TWR of 1 no longer
 * over-thrusts by 0.8%). Ascent, both boost-backs and re-entry move by under a
 * millimetre, in throttle-command keys only: in their recorded windows the
 * engines are either saturated at full throttle or off, so the law changes the
 * command and almost nothing physical. THE INTRO (protected): the same engines
 * lit at touchdown (none), touchdown 9.775 s against 10.108 s, inside the
 * plan's +-0.5 s; its last engine shuts down 0.33 s sooner, which is the true
 * gravity being lower than the flat one. Margins before and after:
 * tests/golden/landing-margins.json and the commit message.
 *
 * P5.4 (Phase 5, Task 4, Fidelity): the flip trigger and the end of the
 * horizontal adjustment size the landing burn with the predictor (gravity at
 * altitude, thrust at altitude, tail-first drag, mass flow) on the same
 * one-engine ladder, instead of a flat-g, sea-level, drag-free estimate; no
 * margin is added (two were tried and both starved the one-engine-out deorbit
 * of propellant; see src/core/autopilot/landing-burn.ts), and the dead
 * `dualRaptorMode`/`trialRaptorMode` flags go. THREE FLY DIFFERENTLY:
 * before-flip and both landing-burns (up to 41 m and 17 m/s mid-descent), all
 * landing, before-flip 1.5 m from the pad and landing-burn 0.5 m. THE TRADE:
 * the short flights spend propellant (before-flip 7.75 -> 4.61 t, landing-burn
 * 13.97 -> 12.72 t and 2.8 s longer) while the long ones keep more (1.1 -> 1.4
 * t); everything lands. TWO MOVE ONLY
 * IN THEIR PLANNING KEYS: re-entry and RTLS, whose recorded windows reach the
 * aero descent, where the trigger is recomputed every step, but end before the
 * flip: `bellyFlopTriggerAltitude` and `finalStagePessimisticAltitude` change,
 * nothing physical does. The commit predicted re-entry but NOT RTLS, wrongly
 * assuming its 120 s window ended before the aero descent; the code's reach was
 * right, the prediction was not. Ascent, booster-sep and the intro do not move
 * (the intro runs only the final descent, which this does not touch); every
 * fixture's header loses the two flags.
 *
 * P5.5 removed `autopilot.freeFallTimeRemainingPrediction` and
 * `finalXPosPrediction`, set to Infinity and never filled in since the port.
 * They were constant in every fixture, so they lived in the headers: every
 * file changes, no rows block does, and every digest above is unchanged. That
 * is the check that the removal is only a removal.
 *
 * P5.6 computes the flip trigger only below the 2 500 m it can act under
 * (`flipTriggerCeiling`; aeroDescentController reads it nowhere higher): the
 * predictor behind it was too costly to run every step from 80 km down, and it
 * timed the orbit tests out under coverage. Re-entry and RTLS, whose windows
 * end above the ceiling, lose the two planning keys from their rows (they are
 * constant now, so they move to the header); nothing else moves, and the
 * flights are bit-for-bit the same.
 *
 * M12's angular-damping tier moving all eight is the M2.12 argument once more:
 * the term acts on any vehicle rotating in any air, which is every scenario
 * that is not sitting still on the pad. The SHAPE is that the movement is
 * tiny — much smaller than the correction, which is the interesting part.
 *
 * The correction is large. `integralOfRCubedTimesDx` was a fixed 97 656, and
 * that number is wrong twice over: it is `(L/2)^4 / 4`, the integral of |r|^3
 * over ONE END of a 50 m rod about its midpoint, where both ends make torque;
 * and the midpoint is not the axis, because the moment of inertia in the same
 * quotient has been about the moving centre of mass since M11.8. Taken about
 * the real axis the integral is 2.20x larger at dry mass and 5.02x at the
 * shipped 350 t load. (The named debt estimated 1.1x and 2.5x. Both were
 * wrong; `tests/core/mass.test.ts` now measures it instead.)
 *
 * A 2-to-5x change in a damping term that moves the trajectories by metres is
 * not a contradiction: the term is quadratic in the rotation rate and linear in
 * air density, so it is negligible except when a vehicle is turning fast and
 * low. THE OUTCOMES: all four landings still land at 25.0 m and 0.00 m/s — the
 * soul, unchanged. Launch-pad is 0.13 m higher at 90 s. RTLS, which is the one
 * flight that flips hard in thick air, is 5.9 m higher at the end of its 120 s
 * and its vertical speed changes by 0.03 m/s. Booster-sep moves 0.01 m in 120 s
 * and re-entry does not move at the printed precision at all.
 *
 * The peak rotation rates fall, which is the direction more damping must move
 * them, and they are the goldens' own: before-flip 0.8686 to 0.8543 rad/s, RTLS
 * 0.6546 to 0.6519. Launch-pad, both landing burns and the intro do not change
 * in the fourth decimal — they never turn fast enough for a term in omega^2 to
 * matter, which is also why their trajectories hold.
 *
 * ONE TEST BOUND MOVED WITH IT, and it is recorded here rather than quietly
 * relaxed: `camera.test.ts`'s vertical containment for `before-flip-autoland in
 * chase` went from 0.9994 to 1.0003 of a half-frame. That bound is an EQUALITY
 * at the ground-mode handoff — the vehicle is exactly at the frame edge — so it
 * sits on a knife edge and a 0.12 px perturbation lands on either side of it.
 * It has a one-pixel tolerance now, stated in pixels.
 *
 * REPRODUCING A DIGEST. The rows block is everything from the NEWLINE BEFORE the
 * `"rows": [` line to the end of the file, hashed as written. That leading
 * newline is part of the hash, and the recipe here used to omit it, so the
 * documented command did not reproduce the recorded values (found at M10.5).
 * In node:
 *
 *     node -e 'const t=require("fs").readFileSync(FILE,"utf8");
 *              console.log(require("crypto").createHash("sha256")
 *                .update(t.slice(t.indexOf("\n \"rows\": [")))
 *                .digest("hex"))'
 *
 * IF ONE MOVES WITHOUT A TIER TO NAME, physics changed by accident. That is the
 * whole job of this file.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GOLDEN_SPECS } from './scenarios';

const DIR = fileURLToPath(new URL('./fixtures/', import.meta.url));

/** SHA-256 of a fixture's rows block, as written. */
function rowsDigest(id: string): string {
  const text = readFileSync(`${DIR}${id}.json`, 'utf8');
  const start = text.indexOf('\n "rows": [\n');
  expect(start, `${id}: no rows block`).toBeGreaterThan(0);
  return createHash('sha256').update(text.slice(start)).digest('hex');
}

/** Current digests, with the tier that last moved each — see the table above. */
const DIGESTS: Readonly<Record<string, string>> = {
  // P5.3 (all eight), P5.4 (five), P5.6 (two): see the table above.
  'launch-pad-takeoff': '520b3264c3f22ea479601c578ed37436f0a7b85dbdcde56e18c5fb054cc44e27',
  'booster-sep-boostback': '213f6e221a047db82a787eb31d62793c0846cf2b6faf0cfe4fb8ae1add880422',
  'rtls-boostback': '0ca7313673a5546c3e0202ac1987d2f8870db19093fd10b82effbfc9b506eb09',
  'reentry-autoland': '09ac1ce2faaccbbd03ad5831d7810a60a01d4594b86e8fddf77da887623810f5',
  'before-flip-autoland': '46148aebd23beff329356094d15ed307c68c9fcf00915bd1f93d3ede7a00ee6d',
  'landing-burn-autoland': '45f42931ca0eb7f419e6d3ff749b941d3fcb0b466739897c7566bcc8571a44a0',
  'landing-burn-headwind': 'a56dc0fd15ffdcb6500bafcb169a458af55471320e6075ad4d09b61f6a092a1f',
  'intro-demo': 'ebf86ff5b168f716b66def589be50e0db550ec30141769994b663611510fc90b',
};

describe('every fixture is where the declared tiers left it', () => {
  it.each(Object.keys(DIGESTS))('%s rows are as recorded', (id) => {
    expect(rowsDigest(id)).toBe(DIGESTS[id]);
  });

  it('covers every golden scenario, so none can be quietly exempted', () => {
    expect(GOLDEN_SPECS.map((s) => s.id).sort()).toEqual(Object.keys(DIGESTS).sort());
  });

  it('the digest actually discriminates — a changed row changes the hash', () => {
    // A hash test that could not fail would be decoration. Mutating one
    // character of the rows block must move the digest.
    const text = readFileSync(`${DIR}intro-demo.json`, 'utf8');
    const start = text.indexOf('\n "rows": [\n');
    const mutated = text.slice(start).replace('[', '[1,');
    const digest = createHash('sha256').update(mutated).digest('hex');
    expect(digest).not.toBe(DIGESTS['intro-demo']);
  });
});
