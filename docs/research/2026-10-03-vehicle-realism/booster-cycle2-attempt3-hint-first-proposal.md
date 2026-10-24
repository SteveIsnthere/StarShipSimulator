# Cycle2 attempt3 proposal: initial unpowered secant hint before full coast

2026-10-03. Read-only design, not execution authorization. No new flight, score evaluation, source edit or candidate duration has been executed under this proposal. Parent owns the in-progress exact guidance-physics Refactor.

## Why the previous shortcuts fail

The first default RTLS5.033333s candidate's exact fine replay misses all four catch gates. Its surrogate veto is not a demonstrated false negative. Existing full-coarse scheduling selects a successful5.325s candidate, but its fine proof completes3.025s after cutoff. Strict acceptance requires364 ticks /1092 available search slots saved on the same lattice. Existing increasing-duration common boost reuse is already active; distinct post-cutoff coast/entry trajectories are not interchangeable.

## Generic initial proposal, with no fictional paid residual

Keep the existing source-local `firstDuration` d0 and published fuel upper bound. For an eligible powered-source job, before paying a first complete coast/entry traversal, construct the existing actual cutoff works at d−=d0−6/120 and d+=d0+6/120. Both are whole executable ticks. They use identical immutable source/model/lineage, shared advance/policy, actual alignment, paid ignition/thrust/fuel/RNG/material evolution and the existing bounded common prefix cache. Score each only after its actual shutdown transition, using the existing upright unpowered fall kernel, original catch-body-height target, immutable held input and512-iteration continuation slices.

Define H(d)=cutoffHullX−towerX+existingUnpoweredDownRange(cutoff). H has units metres. Its zero is a geometric unpowered-coast proposal target. It is NOT the actual powered-entry/catch residual R, a handoff certificate, or a source acceptance decision.

Use the ordinary two-point secant proposal:

`dRaw = d− − H− × (d+ − d−) / (H+ − H−)`.

Quantize with the existing executable tick function. Require finite scores and derivative, identical source/model, positive retained fuel and healthy cutoff, in-domain fall completion, strictly interior available fuel bounds, a new executable duration, and no exceeded combined trial cap. Degenerate/undefined/out-of-range proposals fall back to the existing complete first coarse d0 using only compatible earlier prefixes. Do not clamp an out-of-domain root into a claimed solution. These numeric hints create no low/high physical bracket and no cutoff plan.

The proposed duration must then receive a complete actual coarse ready rollout and the unchanged complete120Hz fine replay, physical catch limits, source/epoch checks and strict future deadline. Unsupported or failed full coarse trials proceed through the existing generic actual-endpoint search. The initial hint consumes the one two-score stencil allowance; no second stencil or hidden extra16-trial allowance is added. Coast/entry/terminal source jobs retain their existing path. Eligibility depends on phase/work validity, not scenario id, seed, or a fitted duration/residual threshold.

One clean accounting choice is two initial cutoff hint trials plus each subsequent actual full trial within the original16 combined cap; a hinted duration must still pay a distinct actual full trial before authority. No mechanically evaluated state is credited as a full coarse handoff merely because it scored well in H.

## Why the old source range estimate cannot be relabelled as a paid anchor

The existing initial range estimate describes unpowered fall from the pre-burn source. It is not R(d0) after paid alignment, ignition, fuel loss and later entry burn. Subtracting nominal acceleration×fallTime×d0 simply reproduces the first-duration heuristic and can make its approximate residual zero by construction. That does not supply independent evidence. Likewise `writeBoosterArrival` is a frozen-environment short terminal estimate, not an exact correction from orbital/coast cutoff to later entry readiness. Neither should be used to invent the missing paid R anchor.

Initial secant H therefore makes the approximation explicit rather than claiming to cancel constant bias. The earlier anchored method cancelled a local constant H-to-R bias; this initial method does not. Entry-burn, rotation, wind, material and authority variation can move its root. Actual coarse and fine acceptance remain the answer to that uncertainty.

## Cost hypothesis, not a deadline success claim

The frozen RTLS clock gives roughly955120Hz alignment steps and143 paid startup steps, followed by about76 steady0.05s boost steps and a few live-tail ticks for the existing first-duration neighbourhood. Two compatible cutoff branches therefore cost about1185 distinct mechanical advances with bounded cache reuse, rather than a complete first1893-step coast/entry candidate. A nearby proposed full coarse adds approximately710–725 distinct coast/entry/tail calls; the known successful fine proof costs2540. Estimated total4435–4450 search advances is1480–1484 live ticks (about12.33–12.37s), plus exact hint slice/transition slots. The measured successful candidate's cutoff13.283333s leaves a potentially useful margin if the proposal lands in a supported region.

This arithmetic does not establish the new proposal's duration, support, fine length or cutoff. A bad H root may require another full coarse and miss the deadline. Every actual branch/suffix call remains charged; cached cumulative forecast steps retain the original4000 cap, original900s horizon, observer1+search3 mechanical budget and exact live tick ledger. No observer sharing or large future-state queue is part of this design.

## Next evidence before implementation or another flight

After lead authorization, evaluate only the two ALREADY ENCOUNTERED cutoff stencil durations for each recorded source: default RTLS d0±6ticks and seed123 booster-separation d0±6ticks. Reconstruct them under the frozen source bundle with the unchanged kernel, retain source/prefix hashes and a mechanical/force-slice ledger, compute the above mathematical proposal, and compare it with recorded actual coarse points only as evidence. Do not execute its newly proposed duration, tune its target, try alternate stencils, or change a source constant. A proposed duration's resemblance to a recorded catch is not acceptance.

Falsifiable negative outcome: if either source yields invalid/degenerate/out-of-bounds hints, or H predicts a clearly poor direction relative to its already measured actual residual progression, do not silently replace zero with a calibrated bias/target. Record the failure and revisit the design. If both hints are credible, independent review should freeze the algorithm, fallback and integer cost declaration before the one authorized third diagnostic. The eight-tick seed123 receipt is fragile and must be included in that regression analysis.

## Rejected from existing evidence before execution

The independent reviewer used already recorded seed123 scores: H(24.175)=1186.906218151m and H(24.275)=−599.623213730m. This proposal gives24.241436421s, executable24.241666667s: it increases the burn from24.225s while the actual paid residual−553.275782m and measured shorter trials require a decrease. This is the predeclared poor-direction outcome. No new score or flight was required. Universal hint-first is rejected for this cycle; the zero target must not be fitted to the known catch.
