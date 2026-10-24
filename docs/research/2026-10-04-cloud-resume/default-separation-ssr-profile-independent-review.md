# Independent read-only SSR profile review

2026-10-04; reviewer `/root/rtls_implementation`, author `/root/rtls_code_review`. No execution. Current disposition: **withhold clean approval pending actual temporary-driver pinning and declaration reconciliation**.

Reviewed exact initial files:

```text
044fb4b65e3b2f9d1c00c2b8b12d1bde1c11c80bb48fafbb67f278eb1e354d98 default-separation-ssr-profile.ts.txt
ed931b9be075959ce7c1fd34ca01e740b36b34e64b6ae31b24e40e3ee7a4653c run-default-separation-ssr-profile.sh
287ef36175b2e03970a8e85b1a171cae91c49fd28f6a8dbd5f0a0f6cc667f550 default-separation-grid-cost-profile-declaration.md
9ec67bd8675f14bf5e77570bb160c3ed516aa025f7cd17c0b566fffb6bc5be14 terminal-grid-separation-core-hashes.json
f73f320b287ce960437eb44cece0967ee732e50316f6f163d7eeba0bee7c8314 terminal-grid-separation-receipt.jsonl
```

All paths above are within this research directory. The actual physical source/witness pins are verified by the driver before and after the unchanged original `step`; no wrapper or altered paid advance identity is introduced. The two independent default constructors, model object identity, omitted seed, exact120Hz dt, original108000tick limit and first-terminal stopping semantics match current named test recipes. The retained prior witness used optional undefined mechanical inputs; the current standalone recipe uses the tests' empty object input. Exact selected final/previous physical-tree and catch-tick comparison is an explicit required semantic check, not assumed equivalence or a whole-state provenance claim.

The native Inspector profile starts after imports, uses1000microsecond sampling and unchanged source through locked vite-node SSR. It is clearly distinct from Vitest4's three-worker environment, and neither profiled time nor witness equality claims timeout/performance acceptance. Clock compatibility is recorded and the declaration appropriately denies phase-specific attribution when incompatible. Samples are not exact calls; inclusive/exclusive cost separation and no nested summation are required.

Bounds are explicit: maximum108000 ticks, per-iteration120second monotonic work deadline,5second profiler-stop deadline, outer125secondTERM then5secondKILL,16MiB profile-export cap, source-only temp-driver cleanup, exit-status preservation, fresh exclusive receipt directory and no retry. Failures retain partial endpoint/profile/failure evidence where cleanup succeeds; outer termination can prevent final receipts and must be reported as incomplete, never successful.

Finding1: launcher before/after snapshots include the `.ts.txt` template but omit the actual `.ts` temporary file passed to the locked SSR CLI. Matching manifests therefore do not establish unchanged executed driver content. Pin actual temp-driver bytes in both snapshots and assert their pre-execution digest exactly equals the pinned template. Keep the temp file alive through after-snapshot validation, then remove it via the existing trap. This is necessary before source-pinned approval.

Finding2: declaration describes compact planner metadata and distinct transition-boundary intervals, while the current endpoint has only phase/damage revision and current phase spans are merged using pre-step phase. Either implement the bounded declared fields/transition representation or narrow the declaration to the actual captured observations. Do not infer unrecorded planner provenance or exact phase-boundary attribution.

Author and parent received both findings. Re-review exact revised hashes before any run; no production changes or additional flight are authorized by this review.

## Corrected final re-review — clean bounded diagnostic approval

Both findings are resolved in the actual files read again, without execution. Launcher passes the executed temp path into both snapshots, requires its digest equal the template before stepping and after execution, and keeps that file until post-verification/trap cleanup. Declaration now states selected physical trees/final phase without planner export and consecutive pre-step phase spans, assigning crossing steps to the old phase and denying intra-step/boundary isolation. No remaining correctness/provenance blocker was found within this bounded standalone diagnostic scope.

Final independently reviewed pins:

```text
044fb4b65e3b2f9d1c00c2b8b12d1bde1c11c80bb48fafbb67f278eb1e354d98 default-separation-ssr-profile.ts.txt
1f7d9b5ce015f369fe6b93ad4d140b4f4c6dcc7c097613701b61ceccc06434b4 run-default-separation-ssr-profile.sh
833c67163858baa63985caa2227c00e221d28a479ea4eab23207d2619ebd9e3b default-separation-grid-cost-profile-declaration.md
```

Approve **one declared standalone SSR diagnostic** at these pins, only after parent exclusive CPU/source grant; no execution occurred during review. This approval does not apply to production optimization, shared unit/coverage orchestration, Vitest timeout acceptance, physics/catch acceptance or repeated attempts. The ongoing browser cohort retains CPU/source ownership until parent releases it.
