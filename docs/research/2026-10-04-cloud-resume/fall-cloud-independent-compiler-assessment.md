# Independent assessment of completed cloud compiler trace

Read directly from fall-cloud-compiler-receipt/output.txt, not an agent summary.
Receipt exit0 and exact before/after source integrity are recorded. This review
ran no workload and changed no runtime/source/tests/acceptance configuration.

## Observed compiler behavior

Raw lines 3368-3377 show completed TurboFan optimization of fallAcceleration
and advanceUnpoweredFall, with explicit fallAcceleration inline refusals into
the integrator at lines3373-3374 (reason5). Lines3681-3687 repeat those refusals
for capped continuation, while lines3688-3691 complete both OSR and ordinary
TurboFan compilation. This is concrete evidence of a surviving kernel/integrator
call boundary. Reason5 is retained verbatim; no V8 enum mapping was independently
verified, so it must not be represented as a proved object-map or type failure.

The kernel inlines many hot helpers, including ISA in its first compile
(line3258), gravity/drag/lift/sound-speed helpers, and—in the later capped
compile—writeAccelerationComponents(line3592), getCrossSectionalArea(line3646)
and angle wrapping(line3660). The earlier suggestion that scalar composition
necessarily removes an expensive uninlined helper is therefore unsupported for
the final observed capped kernel. Validation is considered for inlining but no
clear completed inline decision for it is shown; that alone does not establish
a costly defect. Concurrent compiler output sometimes interleaves lines.

Recorded kernel-related deoptimizations are concentrated at workload transitions:
ISA/table/pressure named-access feedback at the burn-to-fall boundary(lines3026-
3028); lift-sign comparison feedback when capped work starts(lines3380-3382,
including dependent kernel invalidation); and advanceUnpoweredFall named-access
feedback near the capped result path(line3672), followed by completed ordinary
and OSR compilation. There is no observed repeated wrong-map or steady-state
deoptimization storm. Bytecode offsets are not verified TypeScript source lines.
The trace does not supply time attributable to these events or prove whether a
particular event occurred during warming versus measured calls.

Normal trace-overhead timing0.98031897ms and capped3.89792198ms are diagnostic
only. They cannot replace the original unprofiled1.077726785/3.89177782ms red
receipts, and a lucky normal pass is not acceptance.

## Verdict and smallest next approach

No established exact-output candidate yet credibly closes48.61% of capped time.
Do not authorize a composition-only rewrite on the premise that it repairs
failed inlining: the final trace positively shows that helper being inlined.
Likewise the recorded transition deopts do not justify a48.61% shape-fix claim.

A narrowly separated held-fall force evaluator is now an evidence-backed
compiler hypothesis because the actual integrator-to-kernel boundary survives.
Its purpose would be to separate full live-force/gust/optional-damage dispatch
from held-work mechanics, keep a small numeric kernel, and expose scalar
intermediates to the integrator compiler. This does not permit dropping damage
validation or moving checks that change exception/scratch semantics. It must
retain the original ISA/aero/trig formulas, order, both force queries, all finite
and nonfinite forcing behavior, mutable caller scratch and exact old-reference
proofs. No speedup percentage is established; saving a call boundary alone
cannot be equated with removing the kernel's49.12% self attribution.

If continued investigation is selected, declare a fresh bounded research-only
A/B representation experiment with the source-frozen original as independent
oracle and a small separately owned held evaluator. First prove exact boundary,
complete output/scratch, exception and interleaving equality; then measure the
candidate once under the unchanged original timing workload with exclusive
CPU ownership. Keep it out of production until evidence demonstrates the
required savings. A failure is negative evidence and requires a different
reviewed approach, not another unchanged timing run. Use standing reviewed-cycle
authorization if necessary; do not waive the remaining acceptance gap.
