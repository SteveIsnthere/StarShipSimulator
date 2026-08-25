# Fonts

Four subset faces of **Barlow**, self-hosted. 32.7 kB total.

| File | Face | Used for |
|---|---|---|
| `BarlowSemiCondensed-Regular.woff2` | Barlow Semi Condensed 400 | body, units |
| `BarlowSemiCondensed-Bold.woff2` | Barlow Semi Condensed 700 | values, gauge numerals |
| `BarlowCondensed-Regular.woff2` | Barlow Condensed 400 | uppercase micro-labels |
| `BarlowCondensed-Bold.woff2` | Barlow Condensed 700 | emphasised labels |

## Licence

SIL Open Font License 1.1 — `OFL.txt`, copied verbatim from the Barlow project.
Copyright 2017 The Barlow Project Authors (<https://github.com/jpt/barlow>).
Subsetting is a Modified Version under the OFL; the licence travels with the
files and is precached by the service worker along with them.

## Why not D-DIN

`docs/BROADCAST-UI-PLAN.md` nominated D-DIN, the OFL member of the DIN family
the SpaceX overlay is set in, and made a measurement the decider rather than
taste. D-DIN failed it: its ten digits have nine distinct advance widths and it
ships no `tnum` feature, so a telemetry readout set in it slides sideways as it
counts. The numbers, the reasoning and the test are in `../fonts.ts` and
`tests/ui/tabular-digits.test.ts`.

## Regenerating

These are committed build outputs. `scripts/subset-fonts.mjs` holds the source
URLs, the charset and the subsetter flags:

```sh
pip install fonttools brotli
node scripts/subset-fonts.mjs
```

The `--layout-features=tnum,...` flag is load-bearing. Drop `tnum` and the CSS
keeps asking for tabular figures from a font that no longer has them — the text
still renders, so nothing fails except the alignment.
