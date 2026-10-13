# V22 cache baseline

The cache baseline was captured from the live workspace after the V22 candidate source was pinned. Copies of `node_modules/.vite` and `node_modules/.vite-temp` are retained under `cache-before/node_modules/`; metadata manifests and `cache-before-pins.sha256` bind those copies. The static preflight requires each live cache tree to match the retained baseline before a workload can start.

This record and the cache snapshot are readiness artifacts only. No test, build, browser, or simulation workload has run through this packet.

After the successful `npm run build` CPU check, the next static preflight found that the build had changed the live `.vite` root directory mtime. The candidate workload had not started. The original pre-build snapshot is retained under `cache-baseline-before-build-v1/`; the active `cache-before/` snapshot and its content/metadata pins were refreshed from the post-build live caches. Static preflight must pass again before any workload is eligible.
