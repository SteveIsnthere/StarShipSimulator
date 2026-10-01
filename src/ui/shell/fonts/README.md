# Fonts

Subsets of three OFL 1.1 families (licences beside them), chosen by `docs/design/design-system.md` §5: Inter 400 and 600 for the interface, Inter Tight 600 for display, JetBrains Mono 500 for measured values. All four together are about 52 kB, against the 80 kB font budget in `scripts/check-budget.mjs`.

Made from the Latin woff2 files in `@fontsource/inter`, `@fontsource/inter-tight` and `@fontsource/jetbrains-mono` 5.3.0, subset with fontTools:

```bash
pyftsubset <source>.woff2 --text="<charset>" --layout-features=tnum,kern,liga,calt,case \
  --flavor=woff2 --no-hinting --desubroutinize --output-file=<Name>.woff2
```

The charset is `scripts/subset-fonts.mjs`'s `CHARSET` plus `−…’“”`. `tnum` is kept: every number in the interface is tabular.
