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
  'launch-pad-takeoff': 'ea64873aca00a0244403bd2e3e74c117211bf8e2a6c10e3d9e27a6491d3c339c',
  // M2.14, Fidelity: the thermosphere. The only scenario that goes above 86 km.
  'booster-sep-boostback': '3d2af493a69792788e081a8b194e98c6c787bd9a7fc5efe8c0111691086d5298',
  'rtls-boostback': '5bf461e5445341d167dc62bfcc10106e6464be249616a4182475e82c9897b7c3',
  'reentry-autoland': '7c2b8b7f23476a7e3e92e100726876262958db8ddc60558a8027751a3602925d',
  'before-flip-autoland': 'f2c4cc3df2fd7b66523b1312334ce3e568bdc2f758ef413ab24b1d6a5cd787da',
  'landing-burn-autoland': '6d987b5a9a405584c023baf6b4d86fad4b3fbb93364eeab99f79f094947fa8ee',
  // M11.1: new, not moved. The landing burn flown into 10 m/s of downrange wind.
  'landing-burn-headwind': '4431da9f83a9d8d1896aff1e1c131d9b9608fd9ebc0afa5696aa0727660c000f',
  'intro-demo': '9ccbc99467ad598df9ed0e9f7e38960c85948dfffd642f25ca0c344dcc463ffd',
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
