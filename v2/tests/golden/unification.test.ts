/**
 * M2.10: the proof that removing the flag machinery changed nothing numerically.
 *
 * Unifying the physics meant deleting `core/flags.ts`, taking four conditional
 * branches out of `step()`, dropping a SimState field the integrator read, and
 * making six quadrant ladders plus a seventh inlined copy collapse to single
 * expressions. That is a large restructure of the hot path, and the honest
 * question about it is not "does it still fly" but "is it the SAME simulation
 * the flags-on path was".
 *
 * It is, bit for bit. The unified fixtures' rows are byte-identical to the
 * flag-on recordings made at commit 115879c, for all seven scenarios. The
 * fidelity arithmetic was deliberately left in the exact operation order the
 * flag-on path used — including the `-gravity … + gravity + real` add-back in
 * `getVerticalAcceleration`, which reads as redundant and is not: float
 * addition is not associative, and rewriting it to look tidier would have moved
 * the last bits.
 *
 * WHY A DIGEST RATHER THAN A SECOND FIXTURE SET. M2.10's other half is "one
 * physics, one fixture set" — keeping the flag-suffixed recordings around to
 * compare against would defeat the point. A hash of the rows block is the whole
 * claim in 64 characters, and it is reproducible from the git history:
 *
 *     git show 115879c:v2/tests/golden/fixtures/reentry-autoland--planetCenteredGravity+realSpeedOfSound+fullISA+collapsedTrig.json \
 *       | sed -n '/^ "rows": \[$/,$p' | shasum -a 256
 *
 * That command printed `ef4c014f…`, which is what the unified re-entry fixture
 * hashed to when M2.10 landed. The other six were recorded the same way at the
 * same commit with all four flags forced on, and are still the digests below.
 * Re-entry's has since moved once, under M2.9(a) — see the table.
 *
 * IF ONE OF THESE MOVES, physics changed — exactly as for the fixtures
 * themselves, and under the same rule: only a declared Bug-fix or Fidelity tier
 * justified in the same commit may do it. The table below is the audit trail of
 * every one that has.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GOLDEN_SPECS } from './scenarios';

const DIR = fileURLToPath(new URL('./fixtures/', import.meta.url));

/**
 * SHA-256 of a fixture's rows block — everything from the `"rows": [` line to
 * the end of the file, as written.
 *
 * The rows block and not the whole file, because the head carries the scenario
 * id and the `constant` block carried the flag fields themselves: with the
 * flags on, all four were constant for a whole flight, so the recorder folded
 * them there along with `orbitGravityAccCompensation` (constant zero once
 * gravity was real). Those five keys are exactly what M2.10 deleted, and
 * nothing else in the two files differs — the key list included.
 */
function rowsDigest(id: string): string {
  const text = readFileSync(`${DIR}${id}.json`, 'utf8');
  const marker = '\n "rows": [\n';
  const start = text.indexOf(marker);
  expect(start, `${id}: no rows block`).toBeGreaterThan(0);
  return createHash('sha256').update(text.slice(start)).digest('hex');
}

/**
 * Recorded at commit 115879c with planetCenteredGravity + realSpeedOfSound +
 * fullISA + collapsedTrig — except `reentry-autoland`, which M2.9(a) moved.
 *
 * That is the whole point of keeping these. The unification did not move a
 * single row; every move since has been one declared tier moving the scenarios
 * it said it would and no others:
 *
 *   M2.9(a)  heatLimit 55 -> 390        re-entry only
 *   M2.11    the dead RCS command       re-entry and RTLS only
 *
 * Five of the seven digests are still, to the character, what the flag-on build
 * produced at 115879c — including `intro-demo`, which CLAUDE.md says must never
 * change and which no tier here has touched.
 */
const FLAG_ON_DIGESTS: Readonly<Record<string, string>> = {
  'launch-pad-takeoff': 'c591afdceb7bf9007e108ba55cd8a54107a534060f5dba4285b91ed9b27e945b',
  'booster-sep-boostback': '1abb2146fa29e8830e85cc20882a7cddd8278e63dfeb0d8fb173b2546bcc4062',
  // M2.11, Bug fix: the autopilot's RCS command was dead. Moved with re-entry.
  'rtls-boostback': '474688c0e8aeb55f0b754db9164aec344466b2b5626a6af1630c9f6fdcfc5ca1',
  // M2.9(a), Bug fix: heatLimit 55 -> 390; then M2.11, Bug fix: the RCS command.
  'reentry-autoland': 'd278673b0d266f4a552b0ae9f36e03a71134f79fa9bdbf3202b0f44897a6f39e',
  'before-flip-autoland': 'd15154ded70543fd272acfae37f15c52b56594c48f23eef2e129aa01e4cf1a8b',
  'landing-burn-autoland': '778d376b6379bbf7844bd8855884ca697f7e670ccd5917aea2aaef7d85f0a520',
  'intro-demo': 'ec9a453bed2fcbb20bc73612de76358a5461132af33d3ce1730c0835d590ddb5',
};

describe('the unified physics is the flag-on physics, bit for bit', () => {
  it.each(Object.keys(FLAG_ON_DIGESTS))('%s rows are as recorded', (id) => {
    expect(rowsDigest(id)).toBe(FLAG_ON_DIGESTS[id]);
  });

  it('covers every golden scenario, so none can be quietly exempted', () => {
    expect(GOLDEN_SPECS.map((s) => s.id).sort()).toEqual(Object.keys(FLAG_ON_DIGESTS).sort());
  });

  it('the digest actually discriminates — a changed row changes the hash', () => {
    // A hash test that could not fail would be decoration. Mutating one
    // character of the rows block must move the digest.
    const text = readFileSync(`${DIR}intro-demo.json`, 'utf8');
    const start = text.indexOf('\n "rows": [\n');
    const mutated = text.slice(start).replace('[', '[1,');
    const digest = createHash('sha256').update(mutated).digest('hex');
    expect(digest).not.toBe(FLAG_ON_DIGESTS['intro-demo']);
  });
});
