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
 *     P6.1    felt g, thermosphere, start Mach   ALL EIGHT: felt g in its 3 keys; see below
 *     P6.2    the planet is Earth                ALL EIGHT
 *     P6.3    the landing reserve                re-entry and RTLS only
 *     P6.4    six Raptors (4a, 4b)               moved NOTHING (headers only)
 *     P6.5    the slowest start, an 18 t reserve five: one flies, two plan, two dump
 *     P6.8    the heat shield in W/m^2 and K     ALL EIGHT, in thermalPower alone
 *     P6.10   the wind profile and turbulence    headwind only; seven in shape alone
 *     P6.11   review: sweep speed, fixed RVacs   headwind only (the sweep); RVacs moved nothing
 *     P6.12   the tile against its surroundings  ALL EIGHT, in surfaceTemperature alone
 *     P6b.1   body forces and lifting entry      ALL EIGHT: forces, guidance and state shape
 *     P6b.1b  Earth rotation and common aim      ALL EIGHT: turning-ground dynamics
 *     P6b.5   current forces and throttle demand ALL EIGHT: freshness; isolated RTLS motion
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
 * P6.1 (Phase 6, Task 1, Bug fix) is three fixes on one regeneration, and each
 * was measured alone on a preview so the shape could be split by cause:
 *
 * - FELT G. `perceivedG` (and _X, _Y) added a flat 9.807 m/s² back to the net
 *   acceleration, so a free fall at 150 km read 0.03 g and the pad 1.008 g; it
 *   subtracts the simulation's own gravity and polar terms now. The g-limit
 *   read the net acceleration, gravity included, and judges felt g now. Alone
 *   this moves exactly those three keys in all eight fixtures and nothing else:
 *   no golden comes near 13 g either way, so no break-up decision changed.
 * - THE THERMOSPHERE. The 1976 standard's kinetic temperature above 86 km
 *   replaces a single exponential that read 293 K at 100 km (195 K in the
 *   standard). Density is chained from the table and never reads it; only Mach
 *   does. Alone it moves booster-sep only, the one flight above 86 km: the
 *   M2.14 shape again.
 * - THE STARTING MACH. A scenario's spawn state computed Mach against a flat
 *   343 m/s and the still-air speed, and the first step's drag coefficient
 *   reads it. It is the airspeed over the speed of sound at the starting
 *   altitude now. It moves the six flights that start moving below Mach 10,
 *   from their first step; re-entry only in its first sample's Mach (the body
 *   Cd is flat at 2.5 above Mach 10); launch-pad starts at rest and does not
 *   move.
 *
 * THE OUTCOMES (npm run margins, before and after): every flight ends as it
 * did, within 0.4 m of miss and 0.03 t of propellant; the deorbit range and
 * the intro (9.775 s, no engines lit, the same three shutdowns) are unchanged
 * to the digit.
 *
 * P6.2 (Phase 6, Task 2, Fidelity) moving all eight is the M2.12 argument:
 * gravity acts on everything. GM is the published 3.986004418e14 (it was G*M,
 * 3.9857e14) and the radius Earth's mean 6371 km (it was 6400), so the pad
 * pulls 9.820 m/s² where it pulled 9.731, 0.9% harder. The ISA's geopotential
 * moved to the standard's own r0 in the same change. P6.3 (Task 3, Fidelity)
 * rides the same regeneration because Task 2 alone ran the one-engine-out
 * deorbit to 0.000 t: autoLand dumps to a 16 t `landingReserve` rather than the
 * 12 t `dumpLimit`. Measured alone (a preview at 12 t against 16 t), it moves
 * re-entry and RTLS only, from the sample their dumps would have stopped at:
 * booster-sep's window ends before its landing, and before-flip's dump is cut
 * by the flip before it reaches 16 t.
 *
 * THE OUTCOMES, both together: every flight ends as it did. The three that
 * dump through the reserve (booster-sep, RTLS, re-entry) touch down with 4.5 t
 * where they had 1.4 t; the misses are 0.9 m and 0.6 m (3.3 and 4.2); the
 * short landings move by a few hundredths of a tonne. The intro touches down
 * at 9.85 s, 0.075 s later than the 9.775 s anchor, with no engine lit; the
 * engine-out deorbits land with 3 t instead of 0.0 to 0.2 t, and
 * `DEORBIT_ENTRY_RANGE` was re-measured at 841.4 km (miss 0.00 km).
 *
 * P6.4 moving nothing is the check that the engine table is only a table. 4a
 * turned the 3-tuples into arrays over `C.RAPTORS` (a Refactor: every fixture
 * regenerated byte-identical); 4b added three RVacs, which no golden lights,
 * because the autopilot never lights an RVac. Their nine keys are constant, so
 * they live in the headers: every file changes, no rows block does.
 *
 * P6.5 (Task 4c, Fidelity) plans the flip on the ignition delay's 1.2 s
 * maximum rather than 2021's 0.6 s constant, and re-measures the landing
 * reserve at 18 t because the earlier flip costs hover. Before-flip flies the
 * new trigger from its first sample (and lands with 8.5 t, from 5.0); the two
 * landing burns move in `bellyFlopTriggerAltitude` alone, a planning key they
 * never act on; re-entry and RTLS move from the sample their dumps now stop
 * at, 18 t. The intro, the ascent and booster-sep (whose window ends before
 * its landing) do not move. Engine-out deorbits land with 3.8 t;
 * `DEORBIT_ENTRY_RANGE` is 841.8 km (miss 0.30 km).
 *
 * P6.8 (Task 8, Fidelity) moves every fixture in exactly one key, and that is
 * the shape: `thermalPower` is Sutton-Graves in W/m^2 now (k = 1.7415e-4, 951.6
 * times 2021's 1.83e-7), times 1/sqrt(2) broadside for a cylinder's stagnation
 * line, and nothing reads it but the break-up check. One key is added,
 * `surfaceTemperature`, the tile's radiative-equilibrium temperature. No
 * flight's path moves: the deorbit peaks at 1,459 K and the re-entry preset at
 * 1,372 K against the 1,533 K limit, so no break-up decision changed.
 *
 * P6.10 (Task 10, Fidelity) moves the one fixture that carries a wind, and
 * that is the shape: calm air is calm (no profile, no turbulence, no draw), so
 * the seven still-air fixtures keep their rows bit for bit and change only in
 * shape, five constant keys added (`world.gustVertical`, the three turbulence
 * filter states, `rng.counters.turbulence`). `landing-burn-headwind` now flies
 * its 10 m/s surface wind up the TM-2008-215633 profile (12.1 m/s at 150 m)
 * with Dryden gusts from the turbulence stream; `world.gust` leaves the
 * constant block for the rows. It still lands at 25.0 m, 1.9 m further
 * downrange than before.
 *
 * P6.11 (Phase 6's independent review, Fidelity) is two corrections and one
 * latent fix. The turbulence sweeps at the vehicle's speed through the MEAN
 * air, with no floor and no gust feedback; only the windy fixture moves, and
 * it still lands at 25.0 m. The RVacs no longer gimbal: their thrust follows
 * the hull and the gimbal's torque and authority read the sea-level share,
 * which is exactly 1 with no RVac lit, so no fixture moves. The radial coast
 * at a turning rate is unreachable at rate zero.
 *
 * P6.12 (Phase 6 close, Fidelity) moves every fixture in one key,
 * `surfaceTemperature`, and nothing else: the tile's equilibrium now includes
 * its surroundings (the air below 86 km, the mesopause's 186.95 K above), so a
 * vehicle on the pad reads 288 K instead of 0 K. The break-up check reads the
 * flux and does not see it.
 *
 * P6b.1/P6b.1b (approved Phase6b Tasks1+1b, Fidelity) land together:
 * source-derived body-axis forces, lifting entry, bounded range feedback,
 * the measured22t reserve/common2758826m aim and Earth's projected rate.
 * All eight move as predicted, with two entry-history keys added to the
 * schema. Launch/booster/RTLS/reentry remain flying in their recording
 * windows; before-flip, landing-burn, headwind and intro still land. RTLS
 * and reentry's full landing outcomes are checked beyond these windows.
 * Intro retains its original final-descent law: measured touchdown9.858s,
 * all six engines off, against the unchanged9.85s +/-0.5 contract.
 *
 * P6b.5 (Bug fix) reads this step's forces/support/failure state and sizes
 * requested TWR against full-throttle thrust. Watched-red witnesses and the
 * isolated eight-scenario trajectory diff are in the Task1 research evidence.
 * In that pre-rotation isolation only RTLS kinematics moved; all eight changed
 * freshness/time readouts. The separately witnessed nonlinear range-solver
 * Bug fix corrects17.8km interpolation residual inside unchanged authority.
 * No golden flies deorbit; its real health/envelope are separate acceptance.
 *
 * These rows share the coherent Linux baseline from hosted run36985191265,
 * snapshot764d191. Steve approved only the reentry180->600s recording
 * extension on2026-10-02, recorded by Linux run37016645116/snapshot8c5f85a.
 * Its361-sample original prefix is exact;840new tail samples are separately
 * audited in golden-window-audit.json. All seven other files are byte-identical.
 * Every literal descent/survival assertion and full-flight bound is retained.
 * The per-field before/after diff, schemas, digests and
 * landing margins are retained under docs/research/
 * 2026-10-01-phase6b-task1-progress/range-cycle2-golden-audit.json and the
 * associated prediction/accepted-margins logs. Every truth row remains IN.
 * The independent braking-profile audit leaves intro byte-identical across
 * that adaptation alone; the combined new forces/rotation legitimately move it.
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
  // P6b.1/P6b.1b/P6b.5 (all eight): see the table and recorded audit above. Recorded
  // on x86-64 Linux / Node 22 by .github/workflows/golden-regenerate.yml.
  'launch-pad-takeoff': '5637a9251f497b9e0ea517e9166dce44d4f073562dfa85faa87268dcf8ac14b7',
  'booster-sep-boostback': '3434b2f3dd7ec91bb74fc03c606d00692e6bff59791ec69acb37e6dcf4c38fb5',
  'rtls-boostback': '383a0cbfce23268ac9454aab4cd4b1b49d6bd1f4aefb60812b71bfe5934f61a7',
  'reentry-autoland': 'dc11109aa70623ab176b6caeacd51816254f19b7ccd008ed8b9f77e26252464c',
  'before-flip-autoland': '6ba544ad3d97ee4ec2001bc1925a14465e61539a402a61fa8d776ef1aa59c3a3',
  'landing-burn-autoland': 'b4e6e876fc3a0498bc36f39491a9230153af46b48d1cf93cc1be5aca80be1e1f',
  'landing-burn-headwind': '5505a4440bbe31b619a60ee25851d622e69a3971a074ca982853d76dcb017002',
  'intro-demo': 'fd8b81de9959c8246385e24e9708c8d05afa58d49ae2a2ad1b9b469d3b0658fb',
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
