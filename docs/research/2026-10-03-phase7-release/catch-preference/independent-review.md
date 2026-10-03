# Phase 7 ignition-risk preference: affected-conclusion review

**Close the original P2 randomFailure-preference rejection finding for the source pinned below.** No actionable issue found in this correction. This continues my independent in-harness fallback review; it is not a cross-vendor review or whole-release approval.

Reviewed dirty source atop `3047632c73eac9a0c57dcb0ba5591a88f82a06af`. SHA-256:

| File | SHA-256 |
|---|---|
| src/core/control/booster-prediction.ts | 6908425e2a5a87e36d5740082e6d16228ea03f4b80156c36ebf00dff11bd2e32 |
| tests/core/booster-catch-preference.test.ts | 2b018e0852cf4973efd67a620b4e3c2f03d2b426d59757a97d616192ddf88471 |
| tests/fixtures/booster-terminal-ready.json | 1991138444eb617179a146f1f7c1876652edf1588f98ae5510d3d1ff50bb3d57 |

## Correctness and scope

`FailureState` contains eight realized flight failures plus the `randomFailure` preference. The original `Object.values(...).some(Boolean)` rejected a physically successful catch merely because the preference was enabled. The new predicate at `booster-prediction.ts:125–130` excludes exactly that preference, retaining every other current or subsequently added failure field in the veto. Airborne landed status and positive remaining fuel are still required.

I traced ignition and prediction behavior. `rollIgnitionFailure` continues to select the enabled risk rate and draw from the ignitionFailure stream either way; realized ignition failures still mark their actual engine and prevent that engine starting. Those mechanics, the original fixture, forecast cadence/resources, scheduler, catch bounds and physical control authority are unchanged. Successful physical capture can legitimately occur despite a failed individual engine; this correction neither overrides that engine failure nor adds a new requirement that every engine be healthy.

Fine validation still starts from the cloned paid ready state at 1/120 s and advances the real mechanics/control callbacks. A numeric proposal alone remains insufficient. `acceptBoosterReturnPlan` still requires a valid reached forecast, fuel, feasible handoff, terminal validation and a strictly future shutdown timestamp. Current/future cutoff checks and manual invalidation are unchanged. The correction only permits an already proven terminal capture to pass the preference-independent gate; it neither changes RNG nor manufactures a capture.

## Evidence

I independently reran the original isolated repro, retained at `/tmp/starship-phase7-random-setting-repro.ts`. Both preference values now produce an actual fine catch with all eight realized failures false, and both publish the validated plan. Output is retained at `/tmp/starship-phase7-preference-review-repro.log`.

I independently ran the new narrow suite: **10 tests passed**, log `/tmp/starship-phase7-preference-review-tests.log`. Both enabled/disabled preference cases use the unchanged original paid RTLS-ready fixture, real fine mechanics and a 4000-step cap. They require actual airborne capture and additional fuel expenditure, retain the preference and verify publication consumes neither live fuel nor live RNG. Eight negative controls individually set the realized failure fields in that physically caught terminal result and confirm no plan or reached publication is accepted.

The tests intentionally inject a completed validation job to isolate publication; they are not proof of a complete enabled-risk scenario from launch. This is adequate for the reproduced predicate defect and does not claim every risk-enabled flight succeeds. The actual forecast portion still proves the terminal result being evaluated is physical.

Read the retained RED log: enabled preference failed publication while the disabled case and eight fault controls passed (1 failure / 9 passes). Read lead-run final focused log: **67 tests / 6 files passed**, including prediction, terminal checks and all ten actual golden replays. The lead's lint log has zero errors and one pre-existing BlackBox hook warning; truth-after shows all 14 rows IN. I did not rerun full build/gate/coverage/browser checks.

## Disposition

The original preference-rejection finding is closed for the exact source hashes above. Any subsequent affected runtime change requires follow-up. The permanent required-centre-engine staging-status finding remains open; full Phase 7 coverage and release checks remain outstanding. No repository source was edited by this reviewer.
