# Exact paid forecast work shared with the continuing source observer

2026-10-03. Read-only design for independent review. No source edit, cache experiment or new flight. Universal unanchored hint-first was rejected from existing seed123 scores; it proposes the wrong direction. This alternative keeps the existing measured full coarse/fine candidate algorithm.

## Existing inputs reject naive reuse

`advanceBoosterSource` builds an input from its independent returned lineage, replays the final immutable poststep metadata event, and independently advances1/120s. `advanceBoosterForecast` instead sets `boosterForecastBurn`, replaces fallTime by its source-relative countdown, and initializes coastPitch0. Those complete input trees differ even when their physical values seem similar. A correct exact-input cache misses; omitting these differences from comparison would violate this design.

Alignment and paid ignition use1/120s. Steady forecast boost uses0.05s and cannot certify a1/120s source endpoint. Distinct candidate coasts/entries remain unshareable. Only the genuinely common120Hz prefix is eligible, and only after exact full input equality at consumption.

## Prerequisite: separate common mechanical inputs from forecast bookkeeping

During alignment/paid startup, candidate burn counters and future coast target belong in the work object. The common mechanical advance must receive the exact declared source metadata event, not added forecast flags/countdowns/coast overrides. At the boundary where candidate cadence or control history becomes different, stop producing observer receipts and resume the established candidate context.

This is a proposed Refactor obligation, not an assumption that metadata is irrelevant. Compare existing and refactored candidate physical/control/RNG/material output at every common transition and after restore into the later coarse/fine path, including full actuator commands, failures, paid force epoch, shutdown clock and complete final forecast. Any changed physical/control number rejects the refactor. Declared nonphysical forecast metadata differences must be explicitly enumerated, never omitted from observer input matching. States with an accepted plan or different issued event receive no sharing unless their exact input matches.

The actual consumption guard remains strict full-tree equality of the independent observer input and the stored paid input. Therefore future source-event changes, manual controls, RNG/material tampering, dt/model/policy mismatch, lineage/revision changes, or any controller value difference produce a cache miss and fresh ordinary observer work. They cannot be healed by copying actual mechanics.

## Receipt and ownership

Each eligible already-paid transition stores: lineage/revision, advance/policy/model identities, exact dt and source clock; immutable full mechanical input; immutable pre-policy endpoint captured inside the policy wrapper; immutable post-policy returned state after ordinary bookkeeping; declared metadata event identity/content. It was evaluated from an independent forecast lineage through the same existing advance and policy, not copied from actual live output.

A consumed hit deep-clones expected/returned into the source object, issues the same exact final event sequence/time, and still validates the next actual pre-policy frame with the existing full-tree `verifyBoosterSource`. Cached terminal-without-policy results retain the original absent expected endpoint and revoke; cached work never creates a healthy source or suppresses a failure. No numerical hash alone certifies equality.

Do not alias mutable forecast work into a receipt. Capture states before later per-work mutation; published older live frames must retain their entire observer/cache data. Inputs after the first may structurally share a previous immutable returned state's physical children, with an owned autopilot metadata overlay; only if that accurately represents the complete exact input. Expected/returned snapshots still require immutable ownership.

Bound storage by the original4000 mechanically evaluated transitions, not an unbounded flight queue. A persistent chunked FIFO (e.g. fixed32-entry immutable leaves, at most125 leaf positions, owned head/tail cursors) can share older leaves between live frames while appending/copying bounded leaf references. Drop consumed head chunks in new frames, leave older frames intact. Stop recording when common120Hz phase ends or the mechanical cap is reached. The first RTLS producer runs ahead of the consumer and may retain hundreds of receipts; rolling8 is not enough. Measure retained bytes and clone/copy costs before accepting this storage. Full-state receipts may be substantially more expensive than current sparse prefixes.

## Budget transaction — avoid a hidden fifth call

Current poststep order runs three search advances and then one observer advance. A zero-new-call observer cache hit could fund one more search call, but the fourth call can complete fine proof and change the final metadata event. If that makes the cached source input mismatch, falling back to a fresh observer advance would become FIVE calls and is forbidden.

A safe transaction design is: prepare the exact source input/event and verified receipt first; only enter shared-credit mode if it matches. Run at mostfour search calls under that credit, while keeping issued live metadata unchanged for this transaction. If a new publication or compatibility telemetry is ready, retain it as an owned pending proof and publish next tick, after its source and strict-future checks, before selecting additional work. Commit the cached observer receipt for the unchanged exact final event. Candidate work can finish, but cannot silently mutate range/fall/coast/plan fields during the shared-credit transaction. Existing publications whose telemetry would change require the ordinary three-search-plus-one-observer path unless their complete event is independently matched.

On a cache miss, run the existing three-search-plus-one-new-observer path. All actual mechanical evaluations remain counted; cache reuse records one consumed paid transition and zero newly evaluated observer transitions. Source validation is still performed against actual mechanics next tick. Pending proof must not restart a new search or gain authority before its ordinary acceptance checks. This changes receipt scheduling only; any pending receipt past cutoff is rejected as before.

Alternative ordering is acceptable only with the same exact final-event matching and a ledger proving no fifth call on every completion/publication/fallback boundary. Do not rely on the practical hope that publication occurs after the common prefix.

## Existing RTLS ledger and fragile feasibility

Live alignment ends7.966667s and all13 return engines are lit9.158333s. From origin0.008333s this suggests roughly1098 common120Hz source transitions. Strict future acceptance needs1092 freed search slots (364ticks) for the already measured2540-step fine proof; the original fine completion is16.308333s and cutoff13.283333s.

If all1098 transitions are exact hits and every credit is used, the ideal shift is1098/360=3.05s: proof completes about13.258333s. One-tick deferred publication gives about13.266667s, approximately TWO ticks before cutoff. This is an optimistic integer-work hypothesis, not a success claim. Initial/final cache boundary misses, unused credit at stage transitions, hint continuation idle slices, pending-publication handling or even a few control metadata misses can eliminate the margin. A source-level ledger must measure actual credits and charge all suffix work before any third flight declaration.

The source must continue to match through alignment/startup; coarse0.05s steady work adds NO observer credits. Additional finer steady prediction solely to make cache hits would change numerical trajectory/cost and is outside this exact-reuse proposal.

## Required preflight evidence and independent tests

1. Enumerate exact original input mismatches; demonstrate normalized common inputs are full-tree equal to independently prepared source inputs, with original/refactored paid physical/control outputs bit-identical.
2. Cached versus freshly advanced observer expected/returned and event metadata must be bit-identical at every eligible node, including thermal/RNG/actuation/force epochs and terminal/no-policy cases. Nonmatching event/model/dt/manual/tampered source must miss, never heal.
3. Prior-frame source/cache/input/proof children remain unchanged after append, consume, clone, fallback and pending publication. Storage never exceeds4000 receipts/declared chunk count; measure actual retained bytes.
4. Scheduler ledger asserts at mostfour new actual calls at every stage, including fine completion, metadata change, cache miss and pending publication. Cached cumulative candidate4000steps/900s and combined16trials remain unchanged.
5. Replay only already evaluated candidates/source common-prefix work, without a new live flight or duration search, to measure exact common hit coverage and integer savings. If fewer than the strict necessary slots remain after pending/transition overhead, reject the deadline claim before flight.

## Recommendation

Conditional investigation only. Exact sharing is physically defensible because it reuses the same independently paid transition, but current code does not supply it. The necessary common-input and source-event refactor plus potentially large persistent receipt queue is substantial, and the measured RTLS margin is very thin. Obtain independent review of provenance, ownership, byte budget and the complete integer ledger before implementation. Do not treat1098 estimated hits as established savings.

## Concrete integration surface for review

A new control-only `booster-paid-prefix.ts` would own immutable receipt/chunk types, exact input comparison and bounded append/lookup/consume. Place its finite index in `BoosterPrediction`, not inside each mechanical SimState or recursively inside `BoosterSource`; `cloneBoosterMechanics` strips the job/source metadata as today. `booster-forecast.ts` captures only eligible common-phase120Hz receipts. `booster-source.ts` gains a prepare/commit receipt transaction retaining its existing fresh-advance fallback and actual pre-policy verifier. `booster-prediction.ts` accepts explicit verified available-call credit, retains pending publication, and accounts all new versus reused work. `autopilot/booster.ts` coordinates the poststep transaction so the final issued source event is exact. Shared state clone behavior must deep-own mutable cursors/pending proof while immutable chunks may be shared. No physics/force/controller functions need new equations or authority.

This is a proposed scope, not current ownership authorization or permission to add fields. It should be independently reviewed as a provenance refactor with numerical-equivalence obligations before core editing.
