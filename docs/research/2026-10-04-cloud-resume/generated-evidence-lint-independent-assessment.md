# Retained generated evidence lint scope — independent assessment

Recommend six explicit generated-output path exclusions in the existing first global `ignores` object of `eslint.config.js`. Preserve all evidence bytes, locations and manifest keys. This is the smallest concrete correction; no source rule or broad research-directory exclusion is needed. No config edit or lint execution was performed by this reviewer.

The actual `/tmp/starship-research-lint.json` reports33 errors for retained `plain/entry.mjs`,1197 for `plain/simulation-C1HMHBVP.js`, and0 for live `isolated-launch-budget.spec.ts`. Examples are prefer-const, no-var and compiled-expression style, rather than a newly introduced live source defect. `eslint.config.js` already globally ignores generated `dist/**` and staged `.subpath/**`, while preserving repository-wide wall6 for source and research harnesses. The retained plain/counted library outputs are immutable Vite compilation evidence qualified by the34-artifact hash manifest, not editable source. Current manifest SHA256 is `5a939da46f59472bc30808b226baf364b316a0b07c5847e675b78bc184d52b82`.

Exact proposed entries, with a comment explaining immutable hashed production-bundle evidence and pointing to its manifest:

```js
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/counted/entry.mjs',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/counted/serviceworker.js',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/counted/simulation-DqUEjDAx.js',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/plain/entry.mjs',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/plain/serviceworker.js',
      'docs/research/2026-10-04-cloud-resume/fall-bundle-proof-receipt/plain/simulation-C1HMHBVP.js',
```

Use these six named files, not `docs/research/**`, not the whole receipt directory and not a generic all-JavaScript docs exemption. Keep all research scripts/configs/specs/builders and the four virtual original/transformed TypeScript source witnesses under existing lint. The exact filenames intentionally cause a future new generated artifact to need an explicit reviewed classification, rather than admitting handwritten files automatically. Do not edit compiled modules to satisfy lint or weaken the original rules.

Renaming to `.txt` or losslessly compressing is viable archival policy but larger than this correction: native proof/qualification loaders currently read the original executable paths, bundle manifests preserve those relative keys, and the green proof/timing lineage expects those bytes at those paths. Restoring to temporary paths would require additional path/source-map/proof integrity and cleanup logic, plus reviewed changes to several harnesses. It offers no physics or lint-source advantage over the six exact generated-file exclusions. Avoid that archive migration as part of this narrow fix.

After root authorizes the minimal ignore edit, verify the six named outputs are ignored and a representative live research harness remains linted, then run the normal required ordered checks. This review does not grant test/build execution or alter immutable proof/source qualification metadata.
