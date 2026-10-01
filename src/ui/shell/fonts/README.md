# Fonts

Subsets of three OFL 1.1 families (licences beside them), chosen by `docs/design/design-system.md` §5: Inter 400 and 600 for the interface, Inter Tight 600 for display, JetBrains Mono 500 for measured values. All four together are about 52 kB, against the 80 kB font budget in `scripts/check-budget.mjs`.

Made from the Latin woff2 files in `@fontsource/inter`, `@fontsource/inter-tight` and `@fontsource/jetbrains-mono` 5.3.0, subset with fontTools by `scripts/subset-fonts.mjs` (it holds the charset, the sources and the flags, and reproduces these files byte for byte). `tnum` is kept: every number in the interface is tabular, and `metrics.ts` records the measured digit widths that `tests/ui/tabular-digits.test.ts` checks.

```bash
pip install fonttools brotli
node scripts/subset-fonts.mjs            # rewrites the four woff2 files
node scripts/subset-fonts.mjs --metrics  # prints the record for metrics.ts
```
