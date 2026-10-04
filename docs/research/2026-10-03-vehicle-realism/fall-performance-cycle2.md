# Fall predictor performance — second reviewed cycle

2026-10-03. Refactor tier. Declared runtime is Node22.23.3, from `.nvmrc`; login Node25 measurements remain historical negative evidence.

Fresh independent reviewer approved exact vector composition and identified the acceleration kernel as the dominant cost. ISA inclusive cost is only7.2%; no thermosphere shortcut was implemented.

Attempt1 removes only redundant sine validation on the already prepared zero-control branch. Finite incidence angle uses valid zero sentinel; nonfinite uses NaN through the original validator. First/nonzero/overflow fallback still computes the original sine. Original same-runtime kernel comparison, signed-zero/quadrant/extreme finite angles, nonfinite prepared angles, inventory/forcing/overflow and slicing/interleaving proofs pass33/33. Extreme finite pitch can make the original lift overflow; the proof compares matching exceptions rather than assuming successful finite output.

Unchanged isolated timing test: normalfall and burn PASS; cappedfall2.223620840ms FAIL against2ms. Earlier exactvector cap2.28811834ms also FAIL. No bound/workload/cap changed, no lucky rerun. The proposed one-entry angle-geometry memo was rejected before implementation: the capped source retains30°pitch and lift changes motion immediately, so its motivating constant-angle assumption is false.

Attempt2 prepared exact thrust products once per continuation invocation.34focusedproofs, targetedlint andTypeScript passed, but the single unchangedNode22timing measured2.321600ms and failed. No gain was demonstrated; this added production complexity was rejected and reverted without a timing rerun. See [rejected delta](rejected-fall-thrust-preparation.patch) and the `fall-thrust-*` receipts; [held-control record](held-zero-control-refactor.md) contains restoration hashes/checks. Restored retainedimplementation33proofs/lint/tsc pass. Current timing evidence for that retained implementation remains2.223620840ms.

Paused after these tasks. One further evidence-backed attempt remains in this reviewed cycle; after a third failure obtain a fresh independent review. No geometry memo, thrust-hoisting retry or unmeasured ISA shortcut is the automatic next step.
