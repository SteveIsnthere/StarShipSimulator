# Scoped root-kernel reuse — Refactor checkpoint

2026-10-18 UTC. Source basis `3fa8c522`. This is a reviewed numerical Refactor,
not a flight correction or whole CPU/gate acceptance. No physical constant,
iteration, tolerance, force, state/output shape or mechanical-work cap changes.

The measured repeated grid-root kernel was a supported CPU hypothesis. Each
component still invokes the original exported `loadedRootAngle` with six
arguments and its current binding. Every original validation, material query,
early return and section getter/coercion executes in the original order. Only
the unchanged pure midpoint kernel can reuse magnitude/exact compliance/law
within one `writeDamageControls` query. Signed output arithmetic remains
`Math.sign(command) * midpointSum / 2`; zero commands retain their early return.

The optional begin/end pair is captured consistently and admitted against the
canonical solver/close functions. Tokens enforce synchronous nesting and fail
closed on abnormal closure. Nested supported scopes disable lookup/publication
and retain the parent's entry. Outer closure invalidates reuse. Missing/mocked
capabilities retain the original helper calls. No state/model reference survives
in the cache; no allocation or new lifetime registry is needed. Unsupported
section values/nonfinite compliance retain the literal numerical route.
The numerical kernel retains its existing standard-Math assumptions; arbitrary
patched global Math semantics are not claimed as a supported refactor domain.

## Proof and review

[Frozen oracle manifest](oracle-manifest.json) preserves the complete previous
root solver and control evaluator. Only imports differ from their committed
source; independent review also verified their correspondence to `8126077a`.
The proof uses the actual old Newton/cell-certification/fallback implementation.

The first focused selection passes 42/42, including the existing 81,180-case
root test. New proof covers 2,688 signed/extreme scalar cases with repeated
queries, and 3,000 complete both-vehicle control/mask/state comparisons.
Independent review caught a nested proof that overwrote its first output; the
first output is now compared before a later ordinary call can hide it. Further
proof covers missing whole-module capabilities, changing material/getter results,
getter/coercion/throw order, helper replacement during argument evaluation,
unusual inertia, nesting, separate output owners and abnormal closure. All 11
strengthened proof tests pass, 43 unique focused tests across selections.

The counted symmetric witness retains all three original getter prefixes and
per-component moment calculations but executes one numerical kernel rather than
three. Consecutive calls recompute; this is reduced work, not a runtime speedup.
Scoped lint and final build exit 0, first-load JS **299.6/300.0 kB**. An intervening
test-only `spyOn` type error is saved and corrected. Truth after is byte-identical
to the [before report](../terminal-coallocation/truth-after.txt) at `3fa8c522`:
25/26, all Tier A IN, existing Tier B max-Q altitude OUT at 9,528 m.

Independent reviewer `/root/cpu_source_diagnosis_fresh` accepted the concrete
source, strengthened proof, one changed diagnostic and post-result custody.
This is the authorized other-agent HIGH fallback, not an external authenticated
review. No reviewer source edit or workload ran. No golden changed; full replay,
coverage, mutation and phase review remain open.

## One changed reentry diagnostic, still red

The predeclared [804-input plan](attempt-plan.json) retains the original 900 s /
108,000 ticks, 30 s case, one worker, zero retries and landing assertion. Its
exclusive `attempt1` receipt is consumed; do not rerun it unchanged. Raw exit 1
retains the failure: impact **350.850 s / 42,102 ticks**, about 716 km short.

The **entire recorded trace is byte-identical** to the prior diagnostic:
4,693,176 bytes, SHA-256
`1696b9f606de9e70fb979c402d643a7c532c5808bc9a02fad53975eda6060ae9`.
That includes 392 recorded samples plus initial/full terminal snapshots and
result. It does not assert every unsampled intermediate state or all flights.
[Comparison](comparison.json) and independent post-result audit verify custody.

Instrumented case time is 23.015 s versus the earlier 23.429 s. These comparable
observations do not establish a wall-time cure. Sampled self interval weights
move from loaded-root/coefficient 3.941+2.241 s to midpoint/loaded/coefficient
1.612+0.852+1.224 s, while other weights also vary. They are statistical weights,
not exact CPU attribution or invocation counts. Source epochs also differ by
the terminal coallocation correction (including forecasts) and render-only GLSL
comment relocation; the plan lists them. Live coast/entry phases alone would
not exclude a terminal forecast. No solely attributed timing claim follows.

The earlier uninstrumented case exceeded 30 s; broad CPU acceptance stays open.
The physical reentry row, complete matrix, goldens, coverage, mutation, ordered
gate, frame budgets, phase/main merge and live release remain open. Continue
the reviewed early-acquisition design and separate range/orbital tasks.
