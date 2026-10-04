# Held zero-control predictor preparation — 2026-10-03

Tier: Refactor. Existing normal fall timing failed1.570ms versus1ms and4000-step cap failed6.718ms versus2ms on an idle Mac, Node25.8.1. The independent review initially proposed root-solver improvement, then retracted it after the actual benchmark commands were checked. All7280/32000 root calls return early for zero commands; there is no Newton/bisection work to optimize in these inputs. No root solver is changed.

The accepted narrower design runs the first control query normally. In a caller-owned immutable unpowered-fall prediction, both zero commands imply zero delivered angle and effective fin area for every subsequent finite force query, including detached/unavailable roots. Retain that result only within that work item. Live attitude probes and nonzero commands continue normal queries. The original dynamic forcing/inventory validation is shared and still runs. A conservative finite force-scale upper bound prevents reuse when finite dynamic pressure might overflow an individual area multiplication; the full original query then decides whether to throw, including unavailable-component skips.

The prepared result and column-area bound are fields of each owned continuation, reset on initialization and preserved by ordinary job cloning. No shared/global cache, skipped mechanical iteration, changed control authority, physical fit or limit is introduced.

Before implementation,18 Ship/booster normal/capped/windy/nonzero/hot/unavailable/detached/invalid-root/invalid-temperature receipts were frozen from the original path in `tests/proofs/fixtures/unpowered-fall-before-preparation.json`; they are Refactor witnesses, not trajectory golden recordings. Generation source is `freeze-fall-controls.ts.txt`. The original test run had20passes and one intentional RED:37midpointiterations paid74queries instead of1. After implementation,41focused tests pass;22proof cases also cover interleaved predictions sharing scratch, unchanged nonzero work, invalid dynamic forcing, and finite-q force-scale overflow. Exact original output is required, not a widened tolerance.

First isolated timing after preparation: normal and burn pass; capped case remains RED2.338ms versus2ms. This is partial improvement, not performance acceptance. Independent implementation review and profile of the remaining cost are pending. No benchmark bound or retry changed.

## Runtime portability and remaining cost

Located cached declared runtimeNode22.23.3 at `/Users/stevewang/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node`. Newzero-control/material proofs pass, but two earlier continuation-test literals recorded onNode25 differ in the last bits on22. No tolerance was widened: a preserved original midpoint/force-query test helper now computes the reference on the same runtime, and current/sliced outputs must match it exactly. Independent review checked the original arithmetic/order/cap/invalid-mass behavior. RawNode25 literals remain evidence; they are not portable physics truth. The exact proof passes28/28 on22. A direct canonical zero-area proof also covers an actual control-column detachment and permanent failure, closing the initial fixture's nose/hot-stage-only detachment gap.

FirstNode22 timing remainsRED2.650ms capped. Second exactoptimization resolves immutablecontrol-model metadata once perwork, caches constantforceboundcoefficient, and hoists the invariant numeric slice budget/cap.34focusedproofs pass; new fractional/nonfinitebudget-contract case is added but its latestexecution is pending. The next isolatedNode22 timing remainsRED2.441ms capped, normal/burn pass. No lucky rerun or budgetchange. A third proposedsharedforce-vectorcomposition Refactor is underindependentreview, targeting repeatedsin/cos/lift-sign calculations in the existing horizontal/vertical APIs; not implemented.

Latest declared-runtime build passes297.3KiB essentialgzip before the metadata-only follow-up. Wholegate, coverage and goldens remain outstanding.

## Reviewed cycle 2, attempt 2 — exact thrust preparation

The preceding shared-vector change measured 2.28811834 ms at the unchanged
2 ms cap. Cycle 2 attempt 1 removed only the prepared zero-control branch's
validation-only incidence sine, preserving nonfinite-angle rejection and actual
incidence on every canonical fallback. Its 33 focused proofs passed; timing
remained RED at 2.22362084 ms. These are separate implementation measurements,
not repeated attempts to obtain a lucky green.

Fresh review rejected a motion-keyed geometry cache without measured reuse:
the capped benchmark retains the reentry preset's 30-degree pitch, so initial
lift produces horizontal speed immediately despite zero initial horizontal
speed and wind. The measured 3,246 m downrange also contradicts constant motion.
No geometry memo was implemented.

Attempt 2 is a Refactor. The canonical scalar thrust expressions are evaluated
once per `advanceUnpoweredFall` invocation into caller-owned scratch. A shared
composition helper retains both scalar sums, including zero thrust additions,
signed-zero products and the conditional fixed-engine branch. Preparation is
refreshed from the current scratch inputs for every slice, so interleaved work
and between-slice changes retain their original behavior. Live attitude queries
continue to evaluate current thrust normally. No mechanical iteration, model,
control authority or timing bound changed.

The scalar numerical oracle now checks both direct and prepared composition
over the existing dense angle, boundary, signed-zero, cancellation and nonfinite
domain. A new integration witness changes current thrust inputs between slices
of 1, 37 and 512 steps while interleaving two predictions through one scratch.
It compares exact results with the original scalar midpoint implementation;
the reference gained only an optional before-step input stimulus, with its
force expressions and integration order unchanged. The test also requires the
stimulus to change the result, proving that the varying inputs matter.

Declared Node 22.23.3 checks: all 34 focused proofs/continuation tests PASS;
targeted ESLint and TypeScript `--noEmit` each exit 0. The parent confirmed the
preceding build had completed (297.4 KiB essential gzip) before these checks.
Exactly one unchanged timing run followed the completed checks: normal fall
and burn PASS, capped fall remains **RED at 2.321600000000001 ms versus 2 ms**.
The measured time is higher than attempt 1; this attempt does not establish
a performance improvement or acceptance. No benchmark rerun followed.

Raw evidence: `fall-thrust-proof.txt`, `fall-thrust-lint.txt`,
`fall-thrust-typecheck.txt`, and `fall-thrust-timing.txt` in this directory.
The attempted implementation was rejected during cleanup of this task: its
additional production structure has no demonstrated performance benefit.
Only attempt 2's five source/test changes were reverted, preserving the prior
incidence, shared-vector and metadata changes and their original proofs. No
wholesale checkout or reset was used. The original scalar fixture no longer has
the rejected attempt's before-step callback.

The exact rejected delta is recoverable from
`rejected-fall-thrust-preparation.patch`, SHA-256
`e873e05dc32e5dc7d06ab698a7fdbeaf96996304e385aff758335da0bde3db2e`.
`rejected-fall-thrust-preparation.json` records HEAD
`32e5bb386cadee9098d703c67ebdfc9444eb46a6` and SHA-256 hashes of all five files
before and after the attempted change. The base is the uncommitted attempt 1
state, not HEAD alone. `git apply --check` succeeds against the restored files;
the patch is an evidence artifact, not an instruction to apply it.

After restoration, the same focused suites pass **33/33** on Node 22.23.3;
targeted ESLint and TypeScript each exit 0. Evidence is
`fall-thrust-rejected-checks.json` and `fall-thrust-rejected-proof.txt`.
No timing rerun followed the rejection. There is no new full build/gate,
coverage, golden regeneration, merge or deploy. Work stopped at Steve's
requested pause boundary; further optimization remains outstanding.
