# AGENTS.md

Arcus is a Home Assistant Marketplace Dashboard plugin: one self-contained
frontend bundle, a dashboard strategy, and visual editors. Single package,
no monorepo. Published at `liltoto/ha-arcus`; current release `v0.3.0`.

## Commands

- `npm run dev` — esbuild watch on `:5173` plus Panda `cssgen --watch`;
  builds `dist/arcus.js` and `dev/fixture.js`. Harness: `/dev/index.html`
  (`?full=1`, `?light=1`).
- `npm test` — Vitest + happy-dom. One file:
  `npx vitest run tests/<name>.test.tsx`.
- `npm run test:coverage` — Vitest with Istanbul coverage; writes
  `coverage/coverage-final.json` for `fallow:health` and `fallow:audit`.
- `npm run typecheck` — `tsc --noEmit`, strict.
- `npm run build` — production Panda CSS (minified and hashed) plus minified
  `dist/arcus.js` without sourcemap. `dist/` is gitignored; stop `npm run dev`
  first and run `npm run build` before release/asset checks, or the watcher can
  overwrite `dist/arcus.js` with the development build.
- If `styled-system/` is missing after a clean checkout, run
  `npx panda codegen`; `npm ci` normally does this via `prepare`.
- `npm run size` — asserts `dist/arcus.js` is within the 400 KB gzip budget.
- `npm run fallow:dead` — Fallow dead-code gate (unused files/exports/deps).
- `npm run fallow:arch` — Fallow architecture check of atomic-design boundaries.
- `npm run fallow:dupes` — Fallow copy-paste report; fails above the 2% ceiling.
- `npm run fallow:audit` — changed-file Fallow audit; PRs gate on new findings.
- `npm run fallow:health` — Fallow health score from Istanbul coverage; fails below 80.
- `npm run fallow` — full local Fallow report across every detector.
- `npm run storybook` — Storybook on `:6006`.
- `npm run build-storybook` — static Storybook build; CI runs this as a gate.
- `npm run visual` — Playwright; starts `npm run dev` via `webServer`.
- `npm run lint` is broken (no `eslint.config.*`); don't use it as a gate.
- Verify before pushing:
  `npm run typecheck && npm run test:coverage && npm run fallow:dead && npm run fallow:arch && npm run fallow:dupes && npm run fallow:health && npm run build && npm run size && npm run build-storybook`.
- Fallow config lives in `.fallowrc.jsonc`: `legacy/` is excluded,
  `getStubConfig`/`getConfig` are allowlisted because Home Assistant calls them
  reflectively, `boundaries` document the atomic-design layer rules, and
  `duplicates.threshold` caps duplication at 2%. `fallow:audit` gates only
  changed files. Before deleting an export, confirm with
  `npx fallow dead-code --trace <file>:<export>`.

## Architecture

- `src/main.ts` is the bundle entrypoint and must import every element module
  (`card`, `editor`, `strategy`, `strategy-editor`). There is no `views/`
  bundle anymore. Tests import modules directly, so add new elements to
  `main.ts` and `tests/smoke.test.ts`.
- `src/card.ts` owns `arcus-card`: `hass`, config, `HomeModel`, routing,
  history, theme, clock, and the action bridge. It mounts exactly one React
  root inside the card's shadow DOM and renders `src/ui/ArcusApp.tsx`.
- `src/ui/` is the dashboard UI, organized by atomic design:
  `atoms/` (pure primitives), `molecules/` (domain-shaped pure components),
  `organisms/` (sections and sheet bodies), `templates/` (layout shells), and
  `pages/` (data-wired composition). Put a component in the smallest layer
  that fits; molecules must remain pure props.
- `src/ui/providers/ArcusProvider.tsx` exposes the small contexts
  (`hass`, `model`, `config`, `t`, `bindings`, `route`, `actions`, `history`,
  `now`) through `src/ui/hooks.ts`. Organisms and pages use those hooks; atoms
  and molecules do not.
- `src/ui/pages/SheetFrame.tsx` owns the scrim, focus trap, Escape,
  drag-to-dismiss, and scroll reset. It is a page-level route shell that
  `HomePage` passes into `HomeTemplate` as the `sheet` slot, so it can use
  `SheetPage`/`SheetTemplate` without an organism importing pages or templates.
  `src/ui/pages/SheetPage.tsx` resolves a route through
  `src/ui/pages/layerRegistry.ts`. Every sheet body lives in
  `src/ui/organisms/layers/`; add a route by adding a body and a registry entry.
- `src/model/discover.ts` discovers rooms from HA's area/device/entity
  registries; `src/model/build.ts` builds `HomeModel`. `RoomModel` sensor fields
  are `EntityRef | null`, not raw IDs; `roomStats`/`lightStats` carry computed
  counts because light/opening models have no live state. `src/model/lights.ts`
  is the single light-ID flattener; don't re-add local group loops.
- `src/ui/molecules/HistoryChart.tsx` is the shared economy/tech history chart.
  Storybook sheet frames come from `src/ui/storybook/with-sheet.tsx`.
- `src/strategy.ts` generates one panel view and declares
  `registryDependencies = ["areas", "devices", "entities", "floors"]`. Keep it,
  or the card receives empty registries.
- `src/config.ts` `normalizeConfig` is the single config normalizer; `areas`
  normalizes to `{ include, exclude, order }`.
- `panda.config.ts` owns the global reset, palette variables, conditions, and
  static tokens. `src/ui/styles/*.ts` define component styles with Panda
  `css()`; `src/ui/styles/classes.ts` exports `c()`, which keeps the semantic
  class name (tests/Playwright hook) and appends the generated Panda class.
  Import `css` directly from `styled-system/css` in a style module so Panda's
  extractor sees it. `styled-system/` is generated and gitignored; `prepare`
  runs `panda codegen`.
- `src/ui/styles/panda.css` is only the Panda layer declaration. Storybook and
  Vitest run it through `@pandacss/vite`; esbuild serves the generated
  `styled-system/styles.css` for it. `src/ui/styles/index.ts` injects
  `FONT_FACE_CSS + panda.css?inline` into the card's shadow root. Do not add a
  second global stylesheet or edit `dist/arcus.js` by hand.
- In `css()` objects, conditions use underscore keys (`_phone`, `_compact`,
  `_light`). `globalCss` is the base layer and loses to utility classes, so
  keep component responsive/density overrides in `css()`.
- Keep the semantic class tokens. `c("room-card")` returns
  `room-card <panda>`; tests and Playwright select the semantic token. Never
  replace it with only the generated Panda class.
- When generating HTML strings, put `c()` on the element that owns a standalone
  style (`wday`, `price-bars`, …); child classes can rely on nested selectors.
- A chart that sets `pointer-events: none` must restore `pointer-events: auto`
  on its `[data-graph]` SVG, or the hover/touch readout stops receiving events.
- `src/editor.ts` keeps its small `EDITOR_STYLES` string for the two config
  editors. They run in separate shadow roots and use HA's native theme
  variables; do not inject the dashboard stylesheet there.
- Storybook uses `.storybook/main.ts` and `.storybook/preview.tsx`, a real
  shadow-root decorator, and a global fixture provider. Stories are the
  component docs and the `build-storybook` gate; Playwright remains the visual
  source of truth.
- The bundle embeds Fraunces/Inter Tight as data URLs. Do not add Google Fonts,
  CDNs, or runtime imports; the release workflow rejects
  `fonts.googleapis|unpkg|cdn.jsdelivr`.

## Fixtures, tests, and screenshots

- `dev/mock.js` is shared by the dev harness and `tests/fixtures/home.ts`;
  changing it changes both.
- `examples/hjem.yaml` is the real-home config (Outdoor repurposed as Skur,
  plus Lille Gang). The mock/fixture use a synthetic `skur` area and 7 rooms.
  They intentionally differ; don't sync them blindly.
- UI tests use Testing Library. `tests/ui/home-test-utils.tsx`
  (`renderWithArcus`) wires the provider for home organisms and
  `tests/ui/layer-test-utils.tsx` (`renderLayer`) does the same for sheet
  bodies. Prefer role/text queries over asserting rendered HTML strings.
- Class assertions must be token-based (`toHaveClass("sheet", "open")`), not
  exact `className`. In Playwright use whitespace-bounded regexes
  (`/(^|\s)open(\s|$)/`); Panda utility names contain state words such as
  `[&.open]` and will false-positive a plain `/open/`.
- Visual baselines in `tests/visual/__screenshots__` are CI-native for
  `ubuntu-26.04`. Local WSL runs can differ by font metrics (typically the
  home/energy baselines); do not run `--update-snapshots` locally. The Visual
  workflow is the source of truth.
- To refresh baselines, dispatch the Visual workflow with
  `update_snapshots=true` (`gh workflow run Visual -f update_snapshots=true`),
  download the `playwright-baselines` artifact, copy it over
  `tests/visual/__screenshots__`, and commit the PNGs.

## Release and live install

- `hacs.json` requires the release asset to be named `arcus.js`;
  `.github/workflows/release.yml` runs on `v*` and attaches `dist/arcus.js`.
- To release: update `README.md`, `AGENTS.md`, `CHANGELOG.md`, `package.json`,
  and `src/version.ts` together, commit, tag `vX.Y.Z`, push the tag. A plain
  push is not a release.
- `main` is protected. This single-maintainer repo merges with
  `gh pr merge --squash --admin`.
- CI: typecheck -> test:coverage -> fallow:dead -> fallow:arch -> fallow:dupes
  -> fallow:health -> build -> size -> HACS validation, plus a Storybook build
  job. Pull requests also run `fallow:audit` (changed files only). Visual is
  pinned to `ubuntu-26.04`.
- The live HA dashboard `hjem-dognet` uses `custom:arcus` and the
  Marketplace-installed `/local/community/ha-arcus/arcus.js`; it does not load
  this repo's `dist/`. Changes need a release + Marketplace update. The old
  inline `hjem-dognet` resources are gone; `legacy/` is reference only.
- `docs/marketplace.md` is a historical initial-publish checklist; the repo is
  already public. Trust README, `hacs.json`, and the workflows.
