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
  // All eight last moved at M11.3, Fidelity: velocity Verlet.
  'launch-pad-takeoff': '2b1e720e7ebb93bb43045e74dd89f66ffba7792ef4aaa20a172c1b8c4bad561a',
  'booster-sep-boostback': '33604d880bce7ab6c0cf6f210aafa09200fd141ff560cbf305cbe76740d9bcc5',
  'rtls-boostback': '88ea14d426433d8b8d967a5432a444015ab06afa2d294beea7fec21d6b710bd6',
  'reentry-autoland': '037ac42d9acc8ff398610d8eb294c82f487b279dbb7de5c19a48f24edfb230ee',
  'before-flip-autoland': 'e16c8a9a5496b0de06f2fd8d18d26903540e256a20d760069a19fcce02bcdd39',
  'landing-burn-autoland': '8e7608fdf52bfce01f89eb4c7cfa088be3c9da852ff068acc9b48a679db6f7d8',
  'landing-burn-headwind': '6b602590e362fc16eefd53818b6418213fd5e90172abee4993eac6d220830bce',
  'intro-demo': '8b7b0482acc57c9d8b33aeef6fe9c2b75a161ce9819cb17fd83b122c9cc989b0',
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
