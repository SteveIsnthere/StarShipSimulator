# Vehicle realism reference ledger — 2026-10-03

Owner rejects existing vehicle realism. Research is in progress; generation and damage-scope choices are pending. Existing physics is50m×9m Ship,71m×9m Super Heavy,6/33 engines and4 grid fins. No new artwork/model is accepted yet.

## Images directly inspected

| Source | What is visible | Limit / use |
|---|---|---|
| [BocaChicaGal / NASASpaceflight Flight5 destacking](https://www.nasaspaceflight.com/2024/10/starship-flight-5-catch/) ([image](https://www.nasaspaceflight.com/wp-content/uploads/2024/10/Booster-12-changes-with-Ship-30-being-destacked-scaled.jpg)) | Booster broad vertical steel highlights, raceway, upper corrugated/slotted ring, projecting lattice grids; Ship dark tiled aft flaps, three wide vacuum bells around smaller central bells, narrow metallic skirt lip | Browser image inspected; web text fetch403 but browser succeeds. Perspective photograph, no calibrated dimensional extraction. Reference only, do not ship copyrighted photo as texture. |
| [John Kraus Flight5 gallery](https://www.johnkrausphotos.com/Galleries/Launches/Starship-Flight-Test-5/i-5Wv9vf5) | Pointed curved Ship nose, smaller high fore flaps, broad aft flaps near base, tiled windward body with restrained steel edge; booster long cylinder and raceway |11Oct2024 photo; original photographer. Fullbody projection affected by perspective and separate lift height; no dimensional engineering claim. |
| [NASA Ames10Sep2024 scale model](https://www.nasa.gov/image-article/starship-super-heavy-breezes-through-wind-tunnel-testing-at-nasa-ames/) ([image](https://www.nasa.gov/wp-content/uploads/2024/09/acd24-0004-005.jpg?w=1024)) | Thick lattice grids, corrugated/perforated upper ring, circular hollow section |1.2% wind-tunnel model. Test rod and mounting fixture are NOT flight geometry; useful for structural silhouettes, not material/weathering reference. |
| [Steve Jurvetson Flight5 landing burn](https://commons.wikimedia.org/wiki/File:SpaceX_Starship_landing_burn_IFT-5.jpg) | Dark returning booster, plume and substantial side flame in dawn exposure |13Oct2024, photographerSteve Jurvetson (not SpaceX official). CC BY2.0 per Commons source page; too dark/obscured to measure material response. Do not infer normal healthy flame placement from one flight image. |

## Sources still requiring detailed verification

- [SpaceX reusability update](https://www.spacex.com/updates/reusability): indexed V3 change claims, browser text not yet read; do not transplant3grids or changed engine bay intoFlight5.
- [FAA8Sep2023 mishap closure](https://www.faa.gov/newsroom/faa-closes-spacex-starship-mishap-investigation): official evidence of leaks/fires and autonomous flight safety corrective actions, not a material fracture law. Realflight termination, propellant release and aerodynamic breakup are different mechanisms; separate them in footage analysis.
- [SpaceX updates](https://new.spacex.com/updates): seek original incident accounts and fourth-flight heat/flap footage; search captions alone are insufficient.

## Current engineering observations

The booster is a flat9m×71m rectangle with detail overlays. Ship uses a legacy photo sprite with generated normals. Failure effects burst600/800 generic particles while body visibility ignores failure. Core impact zeroes velocity/angular velocity/pitch/fuel; breakup zeroes angular velocity/fuel. Render-time previous state can already be failed after multiple120Hzsteps; per-step observation is required to retain pre-failure motion. All are code observations, not new flight-model changes.

## Review jobs

DeepResearch: ChatGPT titleStarship Rendering Research, https://chatgpt.com/c/6ac14acf-cc6c-83e8-8ccc-1c9d45bc9721 ; submitted around18:36UTC, firstcheck18:41UTC shows102searches/researching. Nextcheck≥18:49UTC.
Pro: scrubbed self-contained document /Users/stevewang/.claude/plans/2026-10-03-starship-visual-realism-review.md,1924words. Cold read performed by root after fresh-subagent dispatch was refused by existing thread limit. Upload blocked by extensionfileURLpermission; used fulltextpaste instead, no access settings changed. Browserpaste overwrote clipboard; user must be told. Verify submission after pastedattachmentupload.

## Existing regression result

Task5 corrected terminal64788 COMPLETE0:88/88browser checks,13.3minutes,zero retries. This does not establish reference fidelity or disintegration. Source8c9a0c5 unchanged; no new numerical physics or golden changes.

## Independent checks after the Deep Research report

The complete report is saved as `deep-research-report.md` (21,775characters), exported through the report UI. Download event notification timed out, but the actual Markdown file was verified by its Starship title and copied successfully. Research completed in8minutes with19citedsources/132searches; the research tab is closed. Pro submitted18:49UTC, titleAnswer Section7Pro, https://chatgpt.com/c/6ac14e3e-3958-83e8-ac88-e8d0948cdf02 ; firstcheck showedThinking, not finished. No second Pro round authorized.

- CONFIRMED FROM SOURCE: NASA hot-staging CFD describes exhaust escaping interstage vents and spreading around the booster at low ambient pressure: https://www.nas.nasa.gov/SC24/research/project24.php . This supports vented geometry and qualitative plume routing, not numerical plume photometry.
- QUALIFIED: Report's SN9 deflagration statement is present in FAA March2024 assessment PDFpage77, but the same appendix also discusses detonations and acoustics. It does not prove that every Starship impact should lack a blast or use the same visual template. Adopt only the modest claim that one uniform generic fireball cannot stand for all failure mechanisms. No blast-yield calculation is needed for this renderer.
- UNDECIDABLE: Deep Research's nose/flap tracing ranges lack its actual calibration frames/point coordinates; retain as rough estimates only, not new physical dimensions or geometric truth assertions.
- REJECT AS IMPLEMENTATION INSTRUCTION: Local tile-loss/hinge precursors before terminal failure require simulated local damage state which the current core does not have. Post-failure authored breakup is viable; do not invent precursors or secretly change thermal limits to fit an animation.
- QUALIFIED: Suggested20–30degree visual azimuth and atlas are design options. Need compare actual small-scale prototype under shared sun; report does not certify either renderer choice.

## Real-core event observation — completed

Command `npx vite-node docs/research/2026-10-03-vehicle-realism/failure-observation.ts.txt`, exit0. Outputs `failure-observation.jsonl`, two diagnostic states, two fixed steps each; production unchanged. These are deliberately constructed failure inputs, not successful scenario flights.

Impact: incoming velocity(40,-100)m/s, pitch0.2rad, omega0.4rad/s, fuel350000kg. First returned state and both render-visible finalstates contain zero velocity/pitch/omega/fuel. Per-step callback retained exactly one transition and its incoming state.

Overpressure: incoming velocity(2000,0)m/s, omega0.4rad/s, fuel50000kg; first failure retains translated velocity but zeroes angularvelocity/fuel. Both finalstates are already failed. This confirms the lost-history mechanism in the actual fixedloop, not just the synthetic example. Pre-step kinematics remain up to1/120s earlier than the internal verdict; they must be described as last intact discrete state, not exact substep fracture conditions.

For production observer implementation, preserve first-event identity and timestamp, both bodies, failure reason evidence and lastintactstate. Do not treat observer evidence as approval of geometry or progressive damage.

## Additional code/source checks

- `src/view/particles.ts:670` defaults to4000 particles PER system. `scene-vehicles.ts` creates two systems, so current allocation is8000sprites, not4000combined. Task6 must explicitly account for the combined budget; do not accidentally duplicate it again for debris.
- `src/ui/session/store.ts:84` pauses only for player/debug/layer state. `session.ts:221` sets flightOver without pausing; normal simulated time continues after catastrophe unless an explicit pause/layer applies. A separate autonomous debris wallclock is unnecessary and would violate pause semantics.
- `src/core/mission.ts:209` sets stagingFailed from either body's breakup; it does not set the other body's failure flag. Do not use stagingFailed as a two-body destruction trigger. Actual physical bodies may independently cross limits, which is different from copying a verdict.
- `src/ui/session/mission-controller.ts:34` projects selected state before invoking session onStep, and exposes mission and previousMission. A both-body observer can inspect those at each step independently of selection. Verify this in tests before adopting.
- Flight5 official video page opened with titleStarship’s Fifth Flight Test,3m27sduration, but repeated browser screenshot capture timed out. No video frame was visually inspected; the page was closed. Do not claim footage verification from navigation alone.
- Pixi v8 official performance guidance confirms static Graphics/transforms and batched sprites are reasonable starting points, while many filters/masks/blend changes cost more: https://pixijs.com/8.x/guides/concepts/performance-tips . This supports an implementation candidate, not its benchmark acceptance.
