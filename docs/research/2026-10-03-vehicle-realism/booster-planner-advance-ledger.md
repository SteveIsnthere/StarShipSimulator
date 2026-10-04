# Exact candidate advance ledger and deadline feasibility

2026-10-03. Read-only lead authorization: replay only the five durations encountered in attempt1, reproduce existing prefix selection, no production edits or new flight/search. `booster-planner-advance-ledger.ts.txt` / `.json` and `/tmp/booster-planner-advance-ledger.txt` contain the witness. The raw terminal print predates a metadata-only correction: its final reusedCounts incorrectly included a charged tail tick when the diagnostic re-observed the borrowed prefix; corrected saved JSON and script do not count that tick twice. No physical replay was repeated for that bookkeeping correction.

All five residuals and shutdown clocks match the production receipt exactly. Core hashes in the JSON are stable before/after execution. The ledger source already includes `paidThrustAccelerationX/Y` use in `writeBoosterThrustRequest`; therefore the healthy cohort is confirmed unchanged on that landed correction. This does not replace the parent agent's independent force-epoch tests.

## Actual source hint and stages

First origin is the returned pristine preset frame at **0.008333333333333333 s**, phase `align-boost`, retained mass700000 kg, all13 planned return engines healthy/supported. Range hint365430.884892 m, falltime309.577124 s, planned acceleration48.733187435 m/s². Raw duration24.222087581 s rounds upward to2907 ticks/24.225 s. Fuel-based upper duration50.3 s; upper/4=12.575 s is **inactive**. No zero-duration trial is charged: the paid initial phase starts directly at stage `upper`, iteration1. Consequently removing the quarter-duration floor or a zero trial cannot improve this particular receipt.

## Charged mechanics

| Candidate ticks / seconds | Charged | Reused | Alignment | Startup | Steady boost | Tail | Coast | Entry | Terminal readiness |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2907 /24.225000 | 3728 | 0 | 1155 | 142 | 460 | 5 | 958 | 1007 | 1 |
| 2906 /24.216667 | 1971 | 1757 | 0 | 0 | 0 | 4 | 958 | 1008 | 1 |
| 2895 /24.125000 | 2415 | 1297 | 0 | 0 | 458 | 5 | 959 | 992 | 1 |
| 2891 /24.091667 | 1957 | 1755 | 0 | 0 | 0 | 1 | 959 | 996 | 1 |
| 2892 /24.100000 | 1956 | 1755 | 0 | 0 | 0 | 2 | 959 | 994 | 1 |

Total charged coarse advances **12027**. Inherited steps remain in each result.steps (3728,3728,3712,3712,3711) but do not consume the new trial budget. Alignment1155 steps=9.625 s at1/120; paid initial ignition142 steps=1.183333 s at1/120. Coast958–959 steps=239.5–239.75 forecast seconds at.25 s. Entry consists of exactly141 fine ignition steps plus866/867/851/855/853 .05 s steps respectively; elapsed44.475/44.525/43.725/43.925/43.825 forecast seconds. The terminal readiness step is already under all-three-running central engines; it is not a free hypothetical ignition.

Durations all remain integer live ticks. The mirrored first probe is2906; measured same-sign secant proposes2895; next secant crosses to2891; signed bracket then proposes2892. No duplicate-duration slot is charged in these five. The next supported candidate with low residual is physically viable but fine validation arrives too late.

## Exactly shareable work

The first candidate has a final common prefix after1757 mechanical advances, paid boost2902 ticks (142 startup+460×6 steady). It legitimately supports2906 with four new tail ticks. Candidate2895 is shorter than that endpoint and must not borrow its fuel/impulse. Current scheduler correctly falls back to the startup endpoint after1297 advances, repeating458 steady steps.

An earlier common prefix after1755 advances, paid boost2890 ticks (142+458×6), actually existed during the first candidate. Retaining that checkpoint would remove **exactly458 additional charged steps** from candidate2895. It already supports2891/2892 through the existing candidate2895 retained prefix, so they yield no further saving. All common alignment and ignition work is already reused. Initial startup, RNG/actuation, priorpaid impulses and source identity must match; partial cutoff tails and coast/entry are candidate-specific.

A deterministic bounded checkpoint policy may preserve the last16 distinct steady endpoints (16 is the existing trial cap) or explicit startup plus a logarithmic checkpoint set. Those are cache policies, not physical parameters. The last16 would include this2890-tick checkpoint, but memory/allocation implications need review. Endpoint equality against uncached mechanics and invalid-cache rejection are mandatory before performance credit. Never reuse a later prefix for a shorter burn, and do not merge nearby coast states.

## Corrected budget verdict

My earlier attempt1 note estimated up to~1920 extra boost-call savings. **The ledger disproves that optimistic estimate:** existing reuse already captures most of them; only458 are additionally available here.

The successful2490-step fine validation costs6.916667 live seconds atthree search advances/tick. Its cutoff33.733333 s requires start before26.816667 s. Current start40.316667 s is13.5 s late.

Deferring the failed2482-step fine trial saves6.894444 s. Adding all458 exact additional prefix savings saves1.272222 s. Together the best timing from those two changes alone is approximately **39.066667 s publication**, still **5.333333 s/~1920 charged advances too late**. This is a timing projection on unchanged observed candidate ordering, not an authorization to replay another live flight. Discrete scheduler rounding accounts for at most a few advance slots and cannot close that deficit.

## Bounded next approach, not yet implementation-ready

A useful next design must avoid at least~1920 genuinely candidate-dependent calls while preserving the selected candidate's complete paid readiness and2490-step fine proof. Cache-only or “choose smaller residual” fixes cannot meet that requirement on the measured ordering.

The most promising bounded architecture is **proposal-only low-fidelity exploration ending at the first actual entry frame**, with the full existing paid coast/entry/readiness and fine proof reserved for a selected candidate. Entry is the largest avoidable suffix on exploratory candidates: omitting the first four exploratory entry suffixes could save1007+1008+992+996=4003 mechanical calls, giving a feasible theoretical envelope even with the final full entry and fine retained (12027−4003+2490=10514 calls, ~29.21 live seconds). These figures are an optimistic accounting ceiling. They do not prove that a cheap proposal can locate the catching tick or that the sequence stays identical.

That proposal requires an independently derived source-local scalar or terminal boundary approximation using retained mass/capability and the actual entry controller. An upright unpowered fall is insufficient proof because entry burns and body rotation change the target response. Approximate scores must have a separate type/contract; they cannot satisfy valid(candidate), become signed physical bracket endpoints, count as actual terminal handoffs, or authorize shutdown. The selected candidate must be replayed from the exact immutable origin through the full existing mechanical entry/readiness before fine validation. Any cheap approximation also needs an explicit deterministic computational budget; moving unrestricted work outside the counted advances would violate the intent.

Recommended immediate action: derive and review that source-local proposal independently before attempt2, or ask a fresh reviewer for a different search representation with a quantified≥1920-call saving. Do not install an empirically selected24.1 s target, fit a hint correction from this result, increase budgets, coarsen fine capture, relax bounds, or publish after cutoff. No attempt2 claim or source change is made here.

## Dimensioned anchored force-only proposal for review

Let d be a whole120Hz boost duration, B(d) its **actually paid** cutoff state from the same immutable source, obtained from a matching earlier boost checkpoint plus counted mechanical advances. Let F(d) [m] be `B(d).hullX − towerX + unpoweredFallInto(B(d), catchCentre, upright).downRange`. For a completed physically valid coarse ready candidate d0 with actual ready residual f0 [m], define **G(d)=f0+F(d)−F(d0)** [m]. This is an anchored approximation of the range response, never a physical handoff. It reuses the existing midpoint force predictor, retained mass/control queries, atmosphere and gravity; it introduces no second physics model or fitted slope constant. The anchor removes a constant entry-policy offset only. It does **not** prove that entry effects, paid fuel, rotation, drag or terminal control respond identically with d.

A bounded search may evaluate G at neighboring available tick endpoints and use the measured secant `d_next=d_b−G(d_b)*(d_b−d_a)/(G(d_b)−G(d_a))` [s], with strict available tick interval, finite/reached checks, no duplicate and wrong-response rejection. For numerical derivative sampling, an existing coarse boost interval .05 s=6 live ticks preserves tail phase; this is an integrator-derived stencil, not fitted to24.1 s. Tick proposals remain canonical. Same-source validity and negative/positive search guards apply, but an approximate sign bracket must use a separate type and cannot enter `valid(candidate)`, physical retained endpoints, arrival feasibility or `acceptBoosterReturnPlan`.

Freeze at most16 hinted tick endpoints per source epoch, at most one existing force-only fall call per endpoint (each capped4000 midpoint steps /8000 acceleration evaluations), and include the real boost advances used to form B(d) in the unchanged mechanical budget. CPU bounding cannot stop at the16-call count: worstcase128000 acceleration queries/source is material, so benchmark/review before choosing synchronous calls versus resumable work using the same midpoint implementation. Never silently add an unbounded force-only root loop outside the existing advance accounting. A capped fall score is invalid; it supplies neither a signed bracket nor a cutoff.

Select a proposed candidate only for **full existing ready replay**, then actual120Hz fine capture. Fully paid candidate residuals may re-anchor G with the newest same-source d0/f0, but no cached slope may cross source identity, topology, model, wind/seed or control history. Pure independent tests must prove G units, source identity, cap rejection, unchanged immutable inputs, no accepted authority from approximate signs, and stale/full-proof/deadline handling. Cached paid endpoints need exact equality witnesses. The cheap stage cannot supply pristine fictitious damage or unpaid ignition.

Measured deadline envelope: initial full3728 +selected suffix≈1956 +actual fine2490 =**8174** search calls/~22.71 live s; one further full refinement suffix≈1956 yields**10130**/~28.14 s. Four full ready trials plus fine is approximately12086/~33.57 s, leaving only~.16 s before33.733333 cutoff *before* hinted boost calls, frame overhead or another failed fine trial. Therefore a concrete design should target no more than **three full ready candidates before the final fine proof**, with all proposal cost included, and must abandon publication when the futuredeadline cannot survive mandatory proof. These are measured-cohort estimates, not general timing guarantees or physical acceptance.

Independent reviewer consultation is underway. Production remains held during the parent's broader sweep. No hinted physical durations beyond the five authorized cohort values have been evaluated in this research.

## Independent consultation and draft kernel contracts

The independent body-moment reviewer agrees with the anchored score but recommends **one or two** initial source-local, phase-aligned stencil branches rather than spending16 exploratory cutoff branches. A failed fine trial adds2482 calls to the three-full envelope10130, yielding12612/360=35.033333 live seconds, already late. Root/preconditioning should precede the fine trial; fine proof still remains mandatory and may legitimately fail. Absolute duration multiples of6 are not the correct steady-phase lattice: startup consumes142 boost ticks here, so steady endpoints are142+6n. Preserve the canonical partial tail and readiness rules.

Lead additionally requires **hint and full trials combined stay within16**, not a new16-hint budget plus16 full candidates. Every paid hint mechanical advance consumes the same shared four-advance allowance; one observer leaves three. Force-only scores need a separate explicit bounded CPU contract. The lead prefers at most12 power-of-two steady-step checkpoints under the4000 forecast-step cap rather than hundreds of full-state snapshots. Such a cache selects the closest earlier admissible checkpoint and replays real remaining boost steps; this trades small memory for charged work, never free impulse. At460 steady steps the closest earlier power-of-two checkpoint is256, so a nearby branch may repeat roughly204 paid steady calls; two hint branches cost roughly408 (1.133333 live seconds), not zero. This can fit the three-full envelope, but maximum replay must be checked before branch acceptance; do not silently allow a short-candidate replay to consume the proof deadline.

Draft **nonflight kernel tests**, to be implemented only after algorithm freeze:

1. Dimensioned synthetic F(d)=a*d+b and R(d)=F(d)+c: anchoring recovers R exactly without knowing c; secant finds the algebraic root inside strict tick limits. Scaling all range values by a common positive unit factor leaves proposed duration unchanged.
2. F(d)=a*d+b, R(d)=F(d)+c+e*(d−d0): demonstrate that the anchored proposal is biased when the entry-policy offset changes. The kernel must not label its zero as a paid candidate, bracket endpoint or accepted catch. This is a required limitation witness, not an expectation to tune e away.
3. Failed/capped/nonfinite force-only output and zero/reversed/insufficient denominator produce no hint. A source/model/topology/wind/control-history mismatch invalidates the anchor and all checkpoints. Caller inputs and older jobs remain unchanged.
4. A hinted duration consumes one of the original16 combined trial slots; duplicate executable ticks consume no new rollout; reaching the cap or insufficient mandatory proof budget rejects/defer proposals before expensive replay. Hint paid mechanical calls reduce the same per-frame allowance as full trials.
5. Prefix endpoints must have strictly fewer paid boost ticks than requested cutoff. Use startup-aware lattice, retain actual partial-tail ticks and source-relative cutoff clock. Power-of-two retained endpoints need cached-versus-uncached paid cutoff equality tests for both a shorter and longer requested duration; do not accept merely equal fuel or position.
6. A synthetic kernel score ofzero never yields `BoosterReturnPlan`; only source-matched fully paid ready and actual fine caught states with a still-future shutdown can publish. A captured fine state with a past cutoff is still rejected.

### Theoretical approximation limit

Write E(d)=R(d)−F(d), with R the fully paid ready residual. Then the anchored approximation error is **R(d)−G(d)=E(d)−E(d0)** exactly. If an independent derivative bound |E'|≤L were known locally, |R−G|≤L|d−d0|; with lower bound |G'|≥m>0, the corresponding root error would be at mostL|d−d0|/m, plus force-integration error divided bym. **No such useful source-derived L or m has been established.** Entry phase changes, ignition, controller saturation, slew, damaged capability and numerical threshold crossing may make the response piecewise rather than differentiable. A universal bound from maximum allowed acceleration and full entry duration would be far too loose to certify catch. Therefore neither a cheap zero nor a cheap sign bracket can establish physical feasibility or a reliable one-tick root neighborhood.

The design is a dimensionally justified preconditioner with a quantified work envelope, not a mathematically proven convergence or flight acceptance method. It requires frozen independent review, bounded predictor-cost measurement and selected full/fine validation. Production and executable test files remain unchanged during the parent's broad sweep.
