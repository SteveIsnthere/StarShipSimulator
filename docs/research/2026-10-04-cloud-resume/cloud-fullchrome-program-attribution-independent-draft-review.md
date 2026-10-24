# Actual timer-query attribution draft — fresh independent review

Status: findings before execution approval. Current source/build/map/core proof qualification is not yet provided and syntax/lint checks are intentionally pending while root's CPU cohort runs. This review performed source reads only, with small exact harness hashes; no execution, lint, syntax validation, build, browser or heavy hashing.

- `run-fullchrome-program-attribution.mjs`: `3d4d88352c4d51300fc9d717f1d3b9ada1a5fefcaf1ad3b59922a35a833c6337`
- `program-attribution-hook.mjs`: `89d6c558a33e25726824e8d7aed244afdb49cc4b8ba4aa028c7942625a702096`
- `prepare-fullchrome-program-attribution.py`: `cfc54b831f1b29be15625422c2640dcbb3f2cb1478c95952a14a0572065dd9d4`
- `cloud-fullchrome-program-attribution-declaration.md`: `2967f0caaac630842a7de9cccde9858358fd2c5bb3531e262922ad1e130f9d60`

## Required corrections

1. Program metadata follows shader attachments and final shaderSource text, but not successful linkProgram generations. A program's executable uses sources at its last successful link, not necessarily its later attachment/source state. Capture exact linked shader sources and a successful link generation, handle detach/relink/delete lifecycle honestly, and associate each timed draw with that linked generation. Alternatively reject unsupported mutation while retaining the original successful-link snapshot. The current final-source lookup can falsely label an executable and cannot claim complete actual program/source matching.
2. The exact20 timestamp-set comparison does not alone establish operation completeness. One clear or draw query per frame could hide an unwrapped/missing operation. Independently require each probe frame's recorded timed clear+draw count to match its unchanged original frame.draws count; blits belong to their separate ledger. Retain independent draw witness and all query availability checks. Unknown draw extensions must not silently escape an all-actual-draw claim.
3. Recheck and retain GPU_DISJOINT_EXT immediately after final query result reads and at accepted result boundary. The present drain checks only before reads. A final disjoint change cannot be called valid because all query objects happened to report available.
4. Canonical bloom identification currently uses unrestricted includes(body.trim()), while the declaration promises exact canonical body plus ordinary Pixi prefix. Validate the actual locked-Pixi prefix/suffix and source generation, retaining full actual source/hash; alternatively honestly label this a contains-body candidate requiring fresh actual source inspection before identifying it as canonical bloom. Do not upgrade substring detection into exact shader equivalence.

## Design retained

The single init script has a defined probe→attribution→root witness installation order. Each TIME_ELAPSED query is nonnested around one original clear/draw/blit call, without per-draw gl.finish or polling. The first callback after the original probe's done boundary disarms before new draws; original20 complete frames remain required. Query drain is bounded/asynchronous outside the measurement, and unsupported/disjoint capability explicitly stops without backend/method fallback. All first samples, real GPU completion floors, frozen positive state and same actual three worker identities are retained. Query elapsed semantics and profiling overhead are accurately separated from shader CPU/throughput/compositor acceptance.

Metadata and storage caps are bounded; failure receipts retain partial results and cleanup/source/build/map/bundle checks. Original Node/fullChrome/library/INI3 bytes and owned copied Crashpad identities remain qualified. Current source/map/proof input deliberately permits already approved core changes while requiring renderer/UI/app/public and original probe/testid graph unchanged; the actual qualification must be independently reviewed before setup/launch, including current physics proof/source linkage. It cannot be approved merely because a JSON field says passed.

Optional clarity improvement: write actual browser identity/version and route/backend metadata before an unsupported capability stop, so a no-capture outcome carries its own observed route evidence rather than relying primarily on historical qualification and failure partials.

The proposed original-gl.finish alternative remains contract only, separately reviewed after actual capability outcome. No automatic fallback,300-frame run, quality edit or product acceptance is approved. After corrections, actual qualification and scoped syntax/lint checks, a fresh exact harness review is required before root grants one bounded episode.
