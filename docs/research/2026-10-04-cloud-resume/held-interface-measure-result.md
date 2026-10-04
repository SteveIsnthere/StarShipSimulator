# Cycle 2 attempt 3: measured research candidate rejected

2026-10-04 UTC. After 76/76 exact-output proofs and fresh completed-proof review,
the parent granted one exclusive-CPU candidate measurement. Immediately before
execution all **754 proof-pinned files** matched; the runner independently
required identical proof/measurement manifests. Exactly one unchanged-workload
candidate timing run followed, exit 1. No original baseline rerun occurred.

| Original assertion | Candidate result | Disposition |
|---|---|---|
| Burn < 0.2 ms/call, 200 warm / 2,000 measured | PASS; successful-test log does not print its exact numeric time | Passed this assertion only |
| Normal fall < 1 ms/call, 20 warm / 200 measured | **1.0078518050000003 ms**, reached 227 s | FAIL |
| Capped fall < 2 ms/call, 5 warm / 50 measured | **4.1946757800000025 ms**, unreached | FAIL |

The source-frozen research candidate does not meet either fall budget. Its capped
measurement also shows no improvement over the preserved first-cloud baseline
3.89177782 ms. One observation per implementation does not establish a statistical
regression estimate; it does establish failed acceptance and no demonstrated
benefit sufficient to justify production integration.

`fall-held-interface-measure-receipt/output.txt` contains the actual assertions
and full run log, SHA-256
`7ef251bfd2121b02ca2d417747f9d97bb698521a270c69ab71d53cd000cea633`.
Runtime is Node 22.23.3, Linux x64. The proof, measurement-before and
measurement-after manifests are exactly equal (754 files), with source-manifest
SHA-256 `8e342264f5dd82463212f6c5cbf5e85c2903f0842b09517b3cd31acbe2deab95`.
All temporary prototype/test/config siblings were removed. CPU ownership was
released immediately after the failed measurement finished.

This run consumes **cycle 2 attempt 3**, exhausting the reviewed cycle. Reject
the prototype for production; retain its complete source, proof and measurement
evidence. The retained production force kernel remains unchanged. Do not rerun
this candidate, apply historical thrust preparation, weaken counts/bounds or
claim physics/performance completion. A new bounded approach requires a fresh
independent review after this exhausted cycle. That review must assess the actual
negative result rather than assume the surviving call boundary was sufficient.
