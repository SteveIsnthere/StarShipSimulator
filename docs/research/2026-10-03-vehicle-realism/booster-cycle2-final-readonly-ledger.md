# Cycle2 handover: routing options and shared-work ledger

2026-10-03. Read-only assessment completed before the owner's requested pause. No production edits, new flight, candidate replay or hint scoring in this task. Existing receipts only. Parent owns the independent guidance performance Refactor.

## Simpler routing does not establish a solution

The already implemented anchored hint is `d1=d0−R0/H'`; it already chooses5.2s after the first actual RTLS coarse residual385.794m. Applying that same anchored correction again is not a new fix. The5.2s actual residual165.312m and first residual produce the existing measured secant5.325s. Universal unanchored H-zero was rejected by recorded seed123 data: it increases burn where actual paid residuals require a decrease.

A perfect second-duration proposal can save the third coarse traversal, but that traversal costs about715 actual calls, less than the strict1092-slot requirement. Thus candidate selection alone cannot make the known2540-step fine proof timely when the first full coarse is still paid.

The5.2s ready endpoint is7.258333s, cutoff13.158333s. Strict same-lattice future acceptance permits at most707 additional scheduler ticks,2121 fine advances. Its handoff time21.606138s predicts about2593 steps, substantially above this allowance. This is a cost prediction, not a proven physical lower bound: the first failed fine replay crossed early in2208 steps, so nominal arrival time does not bound every actual trajectory. No exact5.2s fine result exists in these receipts. Testing it merely because it might terminate early is not an evidence-backed production routing correction, and no such replay was executed.

Initialization is also heuristic: first source range estimate14303.058817m, fall time101.584913s. Even sea-level minimum full13-engine acceleration gives an initial ratio below1.77s; the fuel-quarter floor dominates, producing the observed5.033333s. Removing that floor would propose a much shorter burn while already measured residuals require a longer burn. Replacing it by a known5.325s duration, tuned fraction, seed branch or fabricated paid anchor is rejected. A principled improved first guess remains a separate unproved algorithm.

## Recoverable existing scheduler waste

Current `advanceBoosterPrediction` invokes `advanceBoosterForecast` once, then handles completion and schedules the next stage. It forfeits the remaining mechanical budget on a completion tick. The recorded durations, cumulative step counts and common steady-lattice prefixes yield this receipt-consistent reconstruction:

| segment | distinct mechanical calls | live ticks at3/call budget | forfeited slots |
|---|---:|---:|---:|
| First complete coarse |1893|631|0|
| Both cutoff hints |9|4|3|
|5.2s complete coarse suffix |708|236|0|
|5.325s complete coarse suffix |715|239|2|
| Fine proof |2540|847|1|
| Total |5865|1957|6|

The nine hint calls follow from the common startup144 burn ticks: lower598 ticks borrows the75-steady prefix then pays4 tail ticks; upper610 ticks borrows the76-steady prefix then pays one0.05s step plus4 tail ticks. Alignment954+startup144=1098 common120Hz transitions. The5.2s coarse cumulative1883 borrows the77-steady prefix,1098+77=1175, leaving708 calls. The5.325s cumulative1893 borrows the80-steady prefix,1098+80=1178, leaving715. These prefix counts are reconstructed from the original clock and the current fixed6-tick lattice, not instrumented cache fields (the receipt omitted them). Require direct exact-candidate ledger verification before relying on them.

Generic stage-budget carry can recover at most these observed six forfeited slots under the original3-search path: only two live ticks, nowhere near the deadline by itself. It is useful in combination with exact observer reuse because it prevents four-call chunk boundary losses. Each carried call still pays real mechanics and retains cumulative4000/candidate and900s caps. At most512 force-hint iterations may execute per live tick TOTAL; carry must not call `completeHint` repeatedly and multiply that slice budget. Force budget and mechanical budget need separate explicit integers. If the force allowance is exhausted, stop the hint continuation even with mechanical allowance left; carry into other work only when the actual stage is ready.

## Shared common-prefix feasibility with carry — conditional ledger

Only candidate alignment/paid startup uses120Hz, approximately1098 source transitions. Current inputs differ in forecast metadata and must not be reused as-is. Source-identical common-input normalization and bit-identical physical/control/RNG/material proof remain prerequisites. Full exact source input comparison, independent paid pre/post-policy receipts and actual next-state verification remain mandatory;0.05s steady/coast work is excluded.

Prepare-before-produce may miss the first receipt; assume at most1097 usable credits instead of1098. If those credits are all exact matches, a completion at live tick1590 has capacity3×1590+1097=5867 new mechanical calls, enough for the reconstructed5865 work total. Tick1590 corresponds13.25s. The recorded cutoff13.283333s lies at abouttick1594; the ideal carried ledger therefore leaves four ticks. At the last strictly eligible tick1593, available capacity is5876, only11 calls above5865. This remains a fragile hypothesis, not a robust margin claim. More than11 additional lost/missed slots can invalidate it, before accounting any force-only idle tick.

For this RTLS case, shared credits end around9.158s and hypothesized fine completion is13.25s, so publication occurs on the ordinary3-search+one-new-observer path. A deferred-publication tick is not intrinsically needed here. The generic fifth-call protection remains essential when a fourth credited search call could change the final observer event during the common interval: hold event mutation/pending receipt or reject the credit transaction; never fall back to a fifth advance.

No storage/cost claim follows from4000 maximum receipts. A bounded immutable chunked queue may structurally share exact mechanical inputs with prior immutable returned snapshots; expected pre-policy and returned states must remain independent immutable receipts. Measure retained bytes and owned-clone cost. Rolling8 cannot hold a producer running hundreds of live ticks ahead. No input key may omit forecast/control metadata to force a hit.

## Concrete next bounded task after pause

Read-only frozen-source mechanical ledger/normalization experiment, explicitly authorized before running:

1. Reconstruct ONLY already encountered RTLS common prefix/candidates5.033333,5.2,5.325 and the two existing cutoff stencil branches, under original caps. Record exact paid/reused steps and force continuation iterations; no new duration or live flight.
2. Compare each independently prepared observer input against the candidate input before normalization, enumerate every mismatch, and test a small declared common-input normalization in a research-only wrapper. Compare original versus normalized complete paid physical/control/RNG/material outcomes at every boundary and after restored candidate context. Stop on a changed value; do not heal it.
3. Feed the recorded exact work events through a PURE integer scheduler with stage carry and512-total hint force allowance. Report every new call, reuse credit, initial/final cache miss, idle slot and final receipt event. Require at mostfour new calls at every tick and strictly future publication. Include the generic publication/cache-miss fifth-call case and immutable ownership/storage byte bound.

Only if that experiment produces enough exact matches AND a valid strict integer deadline should independent review approve a small production implementation and the one remaining cycle2 attempt3 actual diagnostic. Otherwise reject this design before another flight. No implementation or new diagnostic run is authorized by this handover.
