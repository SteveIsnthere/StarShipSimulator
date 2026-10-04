# Diagnostic artifact storage

The three byte-identical23.67MB raw trace copies remain in the active workspace. Git preserves one lossless deterministic gzip as `browser-all-threads-trace.json.gz`; `canonical-trace.json` records its digest, expanded digest and exact original paths. To reconstruct the HTML report attachment on a fresh checkout, decompress this canonical file into each listed path and verify the expanded SHA256. Other report/receipt files are preserved directly. This diagnostic passed its harness, not frame-budget acceptance.
