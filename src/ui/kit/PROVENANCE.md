# Vendored from flight_sim

This directory is a byte-for-byte copy of `flight_sim/web/src/ui/` (Steve's flight simulator, "Flying Bricks"), the portable UI kit its design system is built on.

- **Source commit:** `1e2f067c21dcaec734585b14dd8d69083a706267` (last change to `web/src/ui`, 2026-09-30).
- **Copied:** everything, including `BrickField/` (Flying Bricks' loading field), which this app does not use and the bundler drops. Copying it keeps the directory identical, so `npm run kit:drift` can compare exactly.
- **How it compiles here:** under `tsconfig.kit.json`, with flight_sim's compiler settings, emitting declarations the app checks against. ESLint skips it (flight_sim lints it). Its own tests run in Vitest's `kit` project under jsdom.
- **Do not edit files here.** A change goes to flight_sim first; then re-sync with `rsync -a --delete --exclude PROVENANCE.md <flight_sim>/web/src/ui/ src/ui/kit/` and update the commit above. `npm run kit:drift` reports what has changed upstream.
- **Design rules** for using it: `docs/design/design-system.md`.
