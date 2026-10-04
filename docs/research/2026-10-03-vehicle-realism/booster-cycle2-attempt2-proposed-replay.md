# Proposed bounded replay — first default RTLS candidate

2026-10-03. Lead APPROVED execution of this exact one-candidate replay; declaration recorded before execution. This supersedes the unexecuted5.2s-candidate proposal after correcting its scheduling arithmetic. Lead requested one highest-value exact replay; no production routing/filter change is authorized here.

## Candidate and question

Replay only the already encountered first default RTLS candidate: burn604/120s=5.033333333333333s, coarse completion5.258333333333384s, cutoff12.99166666666657s. Its coarse handoff is lateralFeasible=false. In booster-arrival.ts this flag is explicitly a frozen-environment steady-thrust-cone estimate; evolving mechanical replay remains the actual contact proof. The question is whether that approximation rejects a physically catchable candidate which could have been proved before its cutoff. Do not assume the answer.

The5.2s candidate completes later at7.258333s; its nominal21.606s fine horizon probably costs longer than its remaining5.9live seconds. Testing it first is less useful to this deadline defect.

## Exact single-candidate experiment

Use the already frozen cycle2-attempt1 esbuild source bundle with only its diagnostic harness replaced; preserve original hash and record derived harness/bundle hash. Construct unchanged default RTLS, autoLandOn, make exactly the first production tick to recover the original0.008333s source origin. Reconstruct only604/120s through createBoosterReadyWork with original shared mechanics/policy and original4000advance/900s caps. No new duration, alternate seed, injected physical state or live continuation.

Before fine work, require exact equality of reconstructed shutdown and complete coarse forecast against the first candidate in cycle2-attempt1-rtls.jsonl:1893steps; time97.61666666666645s; fuel139532.90280392722kg; residual385.79413769071664m; speedX−25.079538706198775m/s; speedY−276.6802266435034m/s; pitch0.11238382052718968rad; complete handoff. Stop on mismatch without repairing state.

On exact reproduction, clone its paid ready state and use precisely the existing beginTerminal equivalent: createBoosterForecastWork(ready,coastPitch), step1/120, shared advanceMechanics/runBoosterPolicy. Stop actual catch, actual terminal, original4000step or900s cap. Record both states around lug-plane crossing, incoming interpolated lug position/velocity/pitch, actual catch result, damage/engine/fuel state, total paid advances. Only this candidate belongs to the proposed replay.

## Interpretation

Compute earliest publication as5.258333333333384s+ceil(fineAdvances/3)/120. It must be strictly before12.99166666666657s; inspect exact floating-point comparisons. The7.733333s slack can pay roughly2784fine advances; nominal handoff21.570836s suggests about2589advances. This candidate plausibly fits, but actual catch and duration remain unknown.

If fine misses, retain the unchanged physical rejection; do not try a second duration under this declaration. If fine catches but is late, routing alone does not solve the deadline. If fine catches in time, this demonstrates an approximation false-negative and supports review of a narrow routing/acceptance correction, not automatic implementation.

Important: acceptBoosterReturnPlan also requires handoff.lateralFeasible=true. Earlier scheduling alone cannot publish this candidate even if authoritative fine contact succeeds. Any correction must explicitly review that surrogate veto while preserving physical catch limits, fuel, source lineage/revision, actual fine proof and still-future cutoff. No false coarse flag may simply be rewritten to true.

The seed123 booster first24.225s candidate also has lateralFeasible=false. A blanket fine-first policy therefore risks spending scarce time on it and breaking its existing eight-tick publication margin. Its impact needs a separate evidence-backed review; do not extrapolate default RTLS's result into global routing. No large observer queue, budget increase, physical-limit change, or second flight follows from this proposal.

## Frozen execution hypothesis

The coarse lateral-feasibility estimate may be a false-negative. The measured ready-to-cutoff slack is7.733333s; the handoff21.570836s horizon predicts roughly2589fine advances,863scheduler ticks and7.191667live seconds, projecting about0.542s positive slack if actual fine contact succeeds. This is a falsifiable estimate only. The original mechanically frozen source is used, not the parent’s later zero-control Refactor. No follow-up candidate is authorized if this one misses.
