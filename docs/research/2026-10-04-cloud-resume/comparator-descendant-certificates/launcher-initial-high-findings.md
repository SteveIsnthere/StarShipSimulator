# Owned pure-control launcher initial HIGH findings

Static read-only review of launch manifest075565132b698a71c3b67d75515bdf1b256c927916be89485de44f929c8758c5 (14 actual listed inputs matched). HOLD pending three bounded repairs; no execution.

1. run-controls.sh hardcodes starship-v1 activation. Use the repository-required exactly-one discovered versioned activate route and fail closed when unavailable.
2. Launcher hashes independently supplied review, review-pins and launch-input digests but never parses the review-pins record to assert its review/inputManifest fields equal these exact files. Bind the approval record directly to reviewed launch input/code before any command.
3. Owner firstFailure records event/launch failures through fail(), but teardown-only or pipe-only failures can finalize with failure nonnull and firstFailure null. Preserve the first actual failure even when born in finalization, independently from subsequent cleanup failure and raw child exit/signal.

PID/start/group/session owner handshake, original owned teardown/descendant logic, combined2MiB bounded output,30s child deadline, exact before/after materialized/Node/product/approved-comparator checks and pure15 controls are otherwise supported by this read. Controls and optional comparator semantics need no change. Fresh actual repaired file hashes/reread are required before launch approval. Parent independently owns/supervises outer lifecycle; this review grants no flight/cost/acceptance.
