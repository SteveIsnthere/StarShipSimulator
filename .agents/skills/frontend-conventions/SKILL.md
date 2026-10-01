---
name: frontend-conventions
description: Use when touching anything under src/ui — the React shell (src/ui/shell), the session controller (src/ui/session), the vendored kit (src/ui/kit) — or the HUD binders it feeds (src/hud), or when deciding where interface code belongs. Owns the layer map, the shell-talks-only-to-the-session rule, the per-frame discipline (React renders once, binders write the DOM), the session store's rules, the component-folder and 500-line rules, how the vendored kit is used and re-synced, the data-testid contract, layout zones, and how interface code is tested. The visual language is docs/design/design-system.md; core purity is sim-core-conventions.
---

# Frontend conventions

**Rigid: follow it exactly.** A deviation needs Steve's sign-off, recorded under **Approved exceptions** at the bottom. This file owns code structure; the look (tokens, type, geometry, motion, copy) is [docs/design/design-system.md](../../../docs/design/design-system.md) and where things live on screen is [docs/design/ia.md](../../../docs/design/ia.md) — link to them, never restate them.

## Layer map

| Path | Holds | May import |
|---|---|---|
| `src/ui/shell/` | React surfaces, one folder each (`StatusBar/`, `Hud/`, `Controls/`, `Menu/`, …), `App.tsx`, `session-context.ts`, `layout.ts`, `index.css`, fonts | `$ui/session/*`, `$hud/*`, `$app/*`, `$core/*` (types and pure data), `@ui/*`, `react`, `zustand` — **not** `$view/*` or `$audio/*` |
| `src/ui/session/` | The framework-free controller: `session.ts` (loop, tick, commands), `scene.ts` (every Pixi object), `store.ts` (what the interface renders) | everything below it; **not** `react`, `react-dom`, `zustand` (only `zustand/vanilla`), `@ui`, `$ui/shell` |
| `src/ui/kit/` | flight_sim's portable kit, vendored byte for byte | itself (`@ui`) and its own packages — **never edited here** |
| `src/hud/` | Per-frame binders and the pure formatters and models behind readouts, timeline, debrief, map | `$core/*` |
| `src/app/` | Framework-free app logic: loop, input, controls, menu and time settings, preferences, recorder, debug surface | `$core/*` |

The two `src/ui` rows are ESLint errors (`eslint.config.js`), so `npm run lint` proves them.

```ts
// Wrong — a surface reaching into the renderer:
import { worldToScreen } from '$view/camera';
// Right — ask the session; if it lacks a command, add one there.
const session = useSession();
session.zoom(1);
```

## Per-frame discipline

- **React renders on interaction, never per frame.** No `useState`, `setState`, store write or re-render driven by the simulation's clock.
- **Per-frame numbers go through the binders.** A surface renders its elements once, then in a `useEffect` hands the session resolvers that find them (`session.bindHud`, `bindIndicators`, `bindTimeline`, `bindMap`). The binders diff and write text nodes, attributes and classes directly.
- **The store changes on transitions only** — a layer opening, a flight ending, a preference — and the session writes a field only when its value changed.
- **Zero allocation on the per-frame path** (`sim-core-conventions`): anything `scene.draw` or the tick writes every frame is allocated once.
- **Lazy what a later interaction needs.** The black box's charts and GSAP are dynamic imports; `scripts/check-entry-graph.mjs` (in `npm run build`) fails if either reaches the first load.

## The session store

- One store, `src/ui/session/store.ts`. Derived values are selectors (`isPaused`, `isHintOpen`), never stored fields.
- Components read with `useSessionState(selector)` and change things only by calling a session command. A component never calls `store.setState` (tests may).
- No rendering, input handling or side effects inside the store module.

## Surfaces and folders

- One surface per folder under `src/ui/shell/`, named for the surface, its main component in `<Surface>/<Surface>.tsx`. Child components, hooks and helpers stay inside the folder while it is their only consumer.
- **Promotion rule:** used by a second surface → move it to `src/ui/shell/` root (or to the session, if it is logic) in the same change.
- A surface owns its layout zone (`ia.md`; positions are fixed so surfaces never overlap). `usePhoneLayout()` in `layout.ts` is the only phone query; the phone controls sheet publishes its height as `--controls-sheet` for the strip above it.
- **500 lines per file, split first.** Exempt: test files (soft cap 1,000), and the vendored kit.

## The kit

- Use the `@ui` primitive when one exists (Button, Toggle, SliderRow, NumberField, TabStrip, Dialog, KeyCap, Surface, MetricStrip, LabeledValue, …). Do not build a second button, toggle, field or dialog.
- **Never edit `src/ui/kit/`.** A change goes to flight_sim first; then re-sync (`src/ui/kit/PROVENANCE.md`) and update the commit there. `npm run kit:drift` reports upstream changes.
- The kit compiles under `tsconfig.kit.json` (flight_sim's settings) and the app checks against its declarations; its tests run in Vitest's `kit` project.

## The simulation is the source of truth

- Show the simulation's values; never re-derive one in the interface. Formatting and units come from `src/hud/readouts.ts` and its siblings — a surface never converts m to km or rad to ° itself.
- A value the interface needs that the simulation does not expose is derived in `src/hud/` (pure, unit-tested), never in a component and never by adding it to `core/` for display (`sim-core-conventions`).

## The test-id contract

- `src/ui/testids.ts` is the contract with the Playwright suite. Every id in it is rendered exactly once while its surface is showing, with the meaning its group documents. Labels may change; ids may not drift in meaning.
- Playwright specs select by test id or role, never by DOM structure or class.

## Testing

- Each surface has `tests/ui/shell/<Surface>.test.tsx`: first line `// @vitest-environment jsdom`, rendered through `renderWithSession` (`tests/ui/shell/render.tsx`), which gives it a real headless session. Test behaviour: ids render, commands fire (`vi.spyOn(session, …)`), store changes show.
- Session logic is tested headless in `tests/ui/session.test.ts`; it runs without a canvas.
- Browser behaviour is proved by the Playwright suite (`verification-and-gates`).
- The build runs `check-design-contract`, `check-ui-contract` (copy) and `check-entry-graph`, each with a self-test; keep them green, never add an allowance to pass one without a line in this file's exceptions.

## Approved exceptions

*None yet. Each entry: date, file and rule, why, Steve's sign-off.*
