# Default RTLS deadline: read-only scheduling feasibility

2026-10-03. No production edit or new flight. Basis: the frozen cycle2 attempt1 RTLS trace/outcome and current scheduler/forecast/source code. Parent retains exclusive guidance-physics Refactor ownership.

## Exact observed obligation

Origin0.008333s, align-boost. First5.033333s candidate completes at5.258333s (1893 cumulative advances), unsupported lateral handoff. Two hints finish5.291667s. The5.2s candidate finishes7.258333s (1883 cumulative advances); its lateral handoff is feasible, but the same terminal cubic nominal final-angle calculation is approximately5.64°, above the original5° catch angle. Its lack of immediate fine priority is therefore consistent with the generic support gate. The5.325s candidate completes9.25s (1893 cumulative advances). Its fine proof takes2540 advances,847 live ticks, completes16.308333s, and genuinely catches. Cutoff13.283333s is correctly refused after expiry.

To retain this exact candidate and fine proof, scheduling must save more than363 live ticks:364 ticks /1092 search-call slots (3.033333s) on the same live lattice. Saving363 ticks would merely finish exactly at cutoff and still fail strict future acceptance. Fine must begin strictly before6.225s, so6.216667s or earlier on this lattice, accounting for exact transitions. Wall-clock optimization does not increase those fixed mechanical slots.

## Existing prefix reuse is insufficient

Both follow-up durations increase. Existing startup/common-steady prefix reuse already applies. Their measured charged spans are236 and239 live ticks, approximately708 and717 new calls. Those are predominantly distinct post-cutoff coast/entry histories; changing burn duration changes mass, pose, RNG/control history and subsequent forces. A coast from one duration cannot certify another. Rolling8 only helps nearby rollback and short extension; it cannot legitimately recover1092 calls here. Removing a whole later coarse trial saves about717 calls, still below the requirement unless combined with another independently justified saving. It also changes candidate selection and requires a new bounded diagnostic.

The present first coarse cannot simply be labelled as the known successful5.325s trial. No known-duration input, fitted residual threshold, preset/seed branch, increased budget, delayed cutoff or omitted fine proof is acceptable.

## Possible exact common observer-work avenue — not ready to implement

During alignment and paid ignition, both source witness and forecast use120Hz. Live alignment finishes7.966667s and all13 engines are lit9.158333s, roughly1098 source ticks. In principle, already independently computed identical mechanical transitions could also supply the observer's next endpoint, freeing its reserved one-call slot for search. This is approximately the right order of saving, with almost no margin beyond1092 required slots.

However, current inputs are not identical full trees: candidate metadata includes forecast-burn and source-relative fall-time overrides. Their irrelevance to alignment/ignition mechanics must be proved, and exact policy metadata events must be reconstructed without copying/healing physical state. The observer's independent provenance contract must remain intact. Coarse0.05s steady boost endpoints cannot certify120Hz observer endpoints. Current prefix caches store only sparse/boundary endpoints, so sharing all earlier120Hz endpoints would require a separately bounded witness queue, potentially hundreds of deep states while the future rollout leads actual flight. A rolling8 cache is insufficient. Source/model/policy identity, time, complete RNG, damage/material state, controls, paid force epoch and future metadata event ordering must all be verified. Do not claim existing code already provides this saving.

A credible proposal needs an exact per-tick ledger, immutable storage bound and byte/work cost, cached-versus-independent full-tree proof including incompatible/tampered events, and unchanged combined4-call/cumulative4000/trial16/900s caps. Until then this avenue is a substantial provenance design change, not a minimal scheduling patch.

## Alternative hint-first initial proposal — separate algorithm change

Paying only the common actual cutoff prefix before choosing an initial duration via the existing unpowered force predictor could avoid the first complete coarse coast/entry traversal. One subsequent full coarse plus full fine has a plausible work envelope below the observed deadline. But there is then no complete paid anchor residual: unpowered H is biased by the real entry burn/rotation. Its zero is merely a proposal, never physical bracket/cutoff authority. The frozen trace does not establish that this alternative proposes a supported candidate or catches. It therefore requires explicit reviewed error/cost assumptions and a new bounded diagnosis authorization; no success is predicted from the known5.325s result.

## Recommendation

Do not implement a prefix-only correction on this evidence. Obtain the independent review's proposed source-compatible work ledger first. Prefer a demonstrably exact reused transition if its provenance/storage proof is manageable; otherwise declare the hint-first approach as a new uncertain search strategy before any second flight. Default booster separation remains a distinct undiagnosed outcome.
