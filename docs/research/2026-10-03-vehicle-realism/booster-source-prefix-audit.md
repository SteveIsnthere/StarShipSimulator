# Booster source-prefix correctness audit — 2026-10-03

Read-only design investigation. No source guard implemented. Existing topology guards remain useful, but do not certify continuous thermal-source consistency.

## Finding

An exact independently evolved live-source observer can detect unexpected changes to the source. It does **not** certify that an accepted candidate experienced the same physical/control prefix. Advertising that observer as candidate certification would overstate its guarantee.

The existing fine replay cannot supply the missing prefix fingerprints:

- `src/core/control/booster-prediction.ts`, `validate` and `beginTerminal`: `terminalOrigin` is cloned from the completed ready trial; validation starts there with `step=1/120`, rather than at `job.origin`.
- `src/core/control/booster-forecast.ts`, `advanceBoosterForecast`: ready trials use .05 s powered intervals and .25 s high-altitude coast intervals (with fine startup/terminal exceptions). They overwrite `boosterFallTime` from their forecast time and set `boosterForecastBurn`.
- `createBoosterHandoffWork` removes the accepted return plan and supplies a proposed coast pitch. Live policy consumes published return-plan/coast/range bookkeeping. Thus matching source generation or replaying live policy does not establish candidate-policy equivalence.
- `src/core/autopilot/booster.ts`, `runBoosterPolicy`: a future accepted cutoff may act during boostback, before the fine terminal replay's initial state. A fingerprint available only in terminal cannot revoke an unsafe earlier cutoff in time.

## Sound exact-prefix contract

A true candidate certificate needs a fine executed prefix from the candidate's original physical source, on the actual live cadence and policy-input history. Before any plan publication or cutoff, compare the independently paid predicted **pre-policy** endpoint with the actual pre-policy endpoint at the same clock. Matching must cover:

1. physical kinematics, forces, mass/fuel, actuator positions/commands, engine running/failure/countdown state;
2. all damage thermal energies, valid-domain state, temperatures, loaded angles, attachment/failure/terminal state;
3. atmosphere, wind/turbulence filters, simulation RNG seed and physical stream counters;
4. every policy input, including finite arrival deadlines, boost direction, active plan identity/cutoff/coast pitch, and scheduler-published range/fall-time inputs that affect policy.

Exclude forecast jobs and observer objects themselves; keep observer snapshots free of observers/jobs so deep cloning is finite and owned. Do not copy actual physical/thermal values into an expected endpoint to repair a mismatch. Scheduler metadata can be replayed only as explicit time-stamped policy inputs; candidate verification must consume that same history. An already mismatched candidate remains nonpublishable; finishing its bounded work must not restore eligibility.

Matching source-prefix observer evolution with *live* policy is a useful diagnostic, but is a weaker contract unless a corresponding candidate prefix has independently consumed the identical policy history. A selected candidate must be certified against that prefix; no plan-transition mirroring can substitute for this proof.

## Cost/deadline constraint

There is no sound drop-in implementation established within the current contracts:

- The scheduler permits four mechanical advances per live 1/120 s interval. Reserving one for a live observer leaves three for search, and changes receipt latency.
- Every trial stops after 4000 advances. At uniformly fine cadence this is only 33.333… seconds, whereas the existing solver admits up to 900 simulated seconds and relies on coarse upstream intervals.
- Replaying a complete fine candidate from its source would therefore change accepted horizon/work limits, rather than merely add fingerprints to current terminal validation.
- Revalidating from the latest live state on every thermal change risks job starvation. Rebasing a completed ready state onto actual heat is not a paid mechanical replay.
- The frozen-physics `tests/core/booster-planning-latency.test.ts` retains its computational latency/purity meaning, but is not an evolving-source consistency witness. Keep its numerical bounds; add actual evolving paid-step deadline acceptance for any new scheduler.

Do not silently replace the four-advance cap, 4000-step limit, future-shutdown requirement, or old latency witness. Any implementation must demonstrate that its exact-prefix work reaches a supported future cutoff in the actual evolving simulator. That liveness proof is currently absent.

## Conservative alternative and recommendation

A coarse candidate could instead use a proven propagated error envelope against retained precontact capture margins and attachment/material-domain reserves. Neither envelope nor positive reserve is currently retained. Proof utilization and the 1173.15 K material exit can have arbitrarily small remaining margin; temperature-to-modulus/proof derivatives alone do not bound closed-loop position, velocity and capture error. Two endpoint rollouts also cannot establish a universal bound through discontinuous detachment/control branches.

Keep source unchanged pending a bounded prefix-verification architecture or a documented physical error envelope. Do not claim that topology guards, a pure live shadow, terminal-only fine fingerprints, or an arbitrary temperature/age cutoff resolve the continuous-source requirement. A fail-closed guard that simply rejects all coarse-prefix candidates would preserve safety but fail required planning liveness, so it is not proposed as a completed fix.


## Approved implementation scope — continuing source provenance

2026-10-03 independent reviewer accepts the narrower source-continuity guarantee. This does not certify exact candidate prefixes or strengthen existing coarse/fine capture validation. Implement a persistent independently evolved live lineage with its own identity separate from topology revision. The lineage survives completed/replaced jobs and accepted plans. Verify the same pre-policy endpoint after physical damage and before actual policy can cut off engines; compare every mechanical/control/RNG field, excluding recursive jobs/observer only. Poststep events enumerate scheduler-owned range/fall/coast/reached/accepted-plan metadata, phase-stamped and immutable; replay only those inputs onto independently evolved state. No actual physical/thermal state copying heals mismatch.

An equal-topology mismatch permanently disqualifies that lineage and its jobs/plans. Finish bounded disqualified work; only then a fresh distinct lineage can start from current state. New topology/reset also permits a distinct source. One observer mechanical advance leaves at most three search advances per production call. Pure calculator witnesses may retain four advances, but their plans cannot acquire actual flight cutoff authority without a verified production lineage. Add expected warming, consistent energy+temperature tamper, event ordering, plan persistence, physical RNG, clone purity and actual evolving booster/RTLS deadline witnesses. Keep frozen calculator bounds and all original work/capture/deadline limits. Liveness remains a required measurement, not an assumption.


### Implementation and bounded verification handoff

New `control/booster-source.ts`: continuing distinct lineageId, full fixed-schema physical/control/RNG comparison at pre-policy phase, independent returned/expected mechanics snapshots, immutable explicit poststep metadata event, sticky rejection until bounded job ends, then a fresh distinct source. `cloneState` owns all observer children and plan handoff; future forecast/prediction clones omit recursive observer/jobs. Production poststep resumes at most3 search advances plus1 observer; pure calculator-only witnesses retain4 and cannot become live cutoff authority without verified lineage. This is provenance only; existing coarse ready/fine terminal acceptance stays unchanged.

Observed RED missing-module `/tmp/booster-source-red.txt` preceded implementation. Focused source invariants passed12 tests before final additional actual-flight calculator rejection; owned lint and TypeScript passed. Related final cohort before that last diagnostics wording change:23PASS/1RED across24 tests. Both frozen calculator latency cases retain all original numerical/work/deadline checks and pass using explicitly declared calculator mode (observer and job lineage tags absent); damage-forecast7 tests pass. Actual evolving RTLS publishes a source-tagged future physically validated cutoff. Actual evolving booster-sep fails required publication, without weakening that new acceptance assertion.

Independent bounded old4search/noobserver diagnostic versus new1observer+3search: both reach the same Acceleration(reason8) breakup at53.758333333330924s, altitude117280.45185261713m, vx−2173.44237262778m/s, vy630.0943334647902m/s, retained propellant67552.24260963257kg. No plan was published by either. Observer matches through53.74999999999759s, then independently predicts that same next-step terminal event; no policy callback exists on terminal advance, so authority is correctly revoked one interval before actual terminal. Raw command/source/results retained in `v3-booster-source-baseline-comparison.txt`. This establishes a preexisting nominal evolving-flight failure, not a proven budget regression. Source grid station was subsequently corrected by parent to.90H; final related rerun still has the same booster-sep liveness RED. No gate/release claim, guidance changes or deadline changes were made here.


Final handoff cohort: `npx vitest run tests/core/booster-source.test.ts tests/core/damage-forecast.test.ts tests/core/booster-planning-latency.test.ts` →23PASS/1RED (24tests,10.01s), retained in `v3-booster-source-handoff-cohort.txt`. RED is the required actual evolving booster-sep future plan, not source mismatch: observer stays exact until its independently predicted acceleration terminal; test still demands plan defined. Post-parent-grid-station correction terminal prediction remains at53.758333333330924s with67552.24260963257kg fuel; its slightly changed pose is printed in the final log, whereas the earlier baseline comparison retains its original model values. Owned lint passes and fresh `npx tsc --noEmit` passes; logs retained. No gate/commit/merge or claim of complete nominal flight acceptance. Source handed back to parent for integration and required refinement tests.
