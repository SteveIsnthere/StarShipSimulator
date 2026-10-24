# Independent worker topology preflight review

## Distinct harness startup repair review

The first approved attempt is preserved under `cloud-worker-preflight-artifacts`: failure at1660ms was an unmounted presentation exception before readiness, topology or draw measurement. Its cleanup receipt records no remaining live descendants, no inaccessible owned process, and65ms cleanup; defunct PID1-owned zygotes are not live work. It establishes no observed configuration effect. Its original partial capture repeated the presentation exception and consequently lost the independently available probe snapshot; that loss is retained in cleanup actions.

Fresh narrow comparison to the archived original runner confirms only readiness and partial-receipt repairs. Runner `7e6f3ebe661f75449dce2ac15c9e0e319b1f1716662b0dca440110a3c461c1a6` and distinct declaration `42a9c45f37c4bd64a13a73adbbeddc7a498d7a46b9d6460d048cfe90de322160` require mounted nonzero world canvas, the existing first-written altitude readout and debug presentation, polling100ms for at most20s. Only exact `Error('presentation is not mounted')` returns not ready; other errors propagate. Timeout is correctly passed as the third Playwright waitForFunction argument. Partial probe and renderer reads now have separate component error records within the unchanged500ms retrieval bound.

**Approve ONE distinct declared harness-startup-repair functional preflight**, after parent grants exclusive CPU/browser ownership. Use a fresh private setup directory and these exact pins; retain original shell/flags, three workers,20realworlddraws,90s work plus5s cleanup, all topology/source/build checks and zero automatic retries. Preserve the failed original and this attempt separately. This is no performance or acceptance grant. No browser/build/workload was executed by the reviewer.

Read-only review before launch. No browser, build, performance check or source change executed by the reviewer. This assessment supplements `rtls-code-review-and-separation-assessment.md` and grants no release or performance acceptance.

Reviewed pins:

| File | SHA256 |
| --- | --- |
| `run-swiftshader-worker-preflight.mjs` | `87cd9497bdc1af9ae8a7d11c5a572e506dea47541ba4f2ff3e563320dbbf67d8` |
| `prepare-swiftshader-worker-preflight.sh` | `ae0ef22d4ee90ff0617b5f00a6ec0196f09b3773ebe55547a789ca914a5beb28` |
| `cloud-worker-preflight-declaration.md` | `14e617878723628b4d5c32963a42969aa6333b6d02d2b339137f3064fd17ce7a` |

The private cwd wrapper, original headless-shell, unchanged launch flags and supported ThreadCount=3 configuration match the declared scheduling hypothesis. Source/build matching happens before launch. The production world-canvas witness counts actual draw operations separately from feature-probe contexts. GPU config visibility, pinned Vulkan scheduler construction, loaded library identity and exactly three live named marl workers provide a concrete topology observation. Twenty draws provide functional evidence only; acceptance still requires the original separate 60-warm/300-measured bounds.

## Findings requiring repair before launch

- **P1 — uncancelled launch after cleanup**, runner lines62 and80–87. Racing `run()` against a deadline or interrupt leaves the asynchronous run alive. Timeout during launch can enter cleanup with no browser/PID, finish cleanup and then receive a late browser. Stop further progression at awaited boundaries, bound and close any late launch result, and prove descendant cleanup before exit.
- **P1 — unverified numeric PID kill**, runner lines19,37–41 and84–85. Stored numeric PIDs can be reused before fallback termination. Recheck captured process starttime plus executable/owned ancestry before signaling; record and verify all owned descendants have exited within the declared cleanup bound. A resolved `browser.close()` alone is not that evidence. Failure receipt writes and verification must also fit the cleanup bound.
- **P2 — requested actual argv is absent**, runner line71. The receipt stores explicit input flags, not the browser's actual arguments including Playwright defaults. Record the identified owned browser's actual argv, without collecting unrelated command lines.
- **P2 — build manifest ordering differs**, runner line28 versus preparation Python's whole-path sort. JavaScript locale-based recursive ordering can differ from Python lexical whole-path ordering and cause a false prelaunch identity failure. Use the same deterministic relative-path sorting contract.

**No functional launch approval at these pins.** Repairs and fresh narrow review are required before the parent's explicit exclusive CPU/run grant. No retry or changed worker count is authorized by this assessment.

## Narrow repair reread

### Final reviewed repair and bounded grant

The final runner SHA256 `73465b5185b006f2f951148925d47d793d1b0224d8b202be51df816a3c23ec85`, unchanged setup `6a2a78d13a0c135707d06aff5e2a848e6ec3b1c8bdf84b61409238662d41c4f2`, and revised declaration `daed36cb88d4d9b6e3c9ff04f3e9081220559a882c0667ecf29b8bb273091144` repair the host-specific cleanup finding below. Inventory reads stat metadata first and executable identity only for qualified group/lineage candidates. Registration requires dedicated pgrp equal to owner PID before GO. Pre-registration interruption can identify the runner's direct wrapper child by exact wrapper argv. Selected helper descendants are included; inaccessible owned identities remain failure evidence while cleanup continues. Signals recheck starttime/group/executable. Remaining live descendants or inaccessible owned evidence makes the run fail. The shared cleanup deadline includes partial retrieval and receipts; actual elapsed cleanup is retained.

No actionable blocker remains for **ONE separately declared functional/topology preflight**, after parent grants exclusive CPU/browser ownership, using this exact runner/setup/declaration and original browser/flags. Keep the selected three workers, 90-second operation plus five-second cleanup bounds, 20 actual production world draws, zero retries and fail-closed topology/source/build checks. Do not infer performance, 300-frame acceptance, hardware GPU support, optimal worker count or release approval. The reviewer performed only source reads and the earlier lightweight proc-permission probe; no browser, build or workload executed.

### Earlier repaired-pin finding

Before execution, a final narrow runner change records launch rejection and stops owner polling promptly when the existing 30-second launch fails, rather than waiting for the 90-second outer deadline. Re-read this change at runner SHA256 `3052db2fed01215403536b9bb2dc7338d4c00a9267e554d78ce7e0a8f563577a`, superseding `73465b51…`; setup/declaration are unchanged. The one-functional-run grant above persists at this final pin.

Repaired runner `5dff80db48c2a3b159edc9c980239fe886ef7cc2b7318741021360909e7ef7c4`, preparation `6a2a78d13a0c135707d06aff5e2a848e6ec3b1c8bdf84b61409238662d41c4f2`, declaration `72709e50bc339c4cca973e7b229498b1a57f4704af7e957943fd2c901243f26a` implement owner registration/GO/STOP, stopped-boundary guards, late-result close, captured identities and actual argv/sort repairs.

**P1 — unrelated proc access aborts cleanup**, runner lines25–34 and246–271. The initial descendant snapshot reads every process's executable; `EACCES` escapes `processIdentity`, so cleanup exits before close, fallback signals and receipts. A read-only host probe confirmed uid1000 cannot read `/proc/198/exe` or `/proc/249/exe`. Determine owned group/lineage from stat metadata before executable access; skip inaccessible unrelated processes, while recording any owned inspection failure and continuing cleanup. Same-group admission must require a verified dedicated group (for example registered pgrp equals root PID), rather than assume all same-group browser executables belong to this run. No browser was launched by the reviewer. Functional approval remains withheld at these repaired pins pending that concrete fix.
