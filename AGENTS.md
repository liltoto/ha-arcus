# AGENTS.md

Arcus is a Home Assistant Marketplace Dashboard plugin: one self-contained
frontend bundle, a dashboard strategy, and visual editors. Single package,
no monorepo. Published at `liltoto/ha-arcus`; current release `v0.2.1`.

## Commands

- `npm run dev` — esbuild watch on `:5173`; builds `dist/arcus.js` and
  `dev/fixture.js`. Harness: `/dev/index.html` (`?full=1`, `?light=1`).
- `npm test` — Vitest + happy-dom. One file:
  `npx vitest run tests/<name>.test.tsx`.
- `npm run typecheck` — `tsc --noEmit`, strict.
- `npm run build` — minified `dist/arcus.js` without sourcemap. `dist/` is
  gitignored; `npm run dev` overwrites it with a sourcemap build, so run
  `npm run build` before release/asset checks.
- `npm run size` — asserts `dist/arcus.js` is within the 400 KB gzip budget.
- `npm run storybook` — Storybook on `:6006`.
- `npm run build-storybook` — static Storybook build; CI runs this as a gate.
- `npm run visual` — Playwright; starts `npm run dev` via `webServer`.
- `npm run lint` is broken (no `eslint.config.*`); don't use it as a gate.
- Verify before pushing:
  `npm run typecheck && npm test && npm run build && npm run size && npm run build-storybook`.

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
- `src/ui/organisms/SheetFrame.tsx` owns the scrim, focus trap, Escape,
  drag-to-dismiss, and scroll reset. `src/ui/pages/SheetPage.tsx` resolves a
  route through `src/ui/pages/layerRegistry.ts`. Every sheet body lives in
  `src/ui/organisms/layers/`; add a route by adding a body and a registry entry.
- `src/model/discover.ts` discovers rooms from HA's area/device/entity
  registries; `src/model/build.ts` builds `HomeModel`. `RoomModel` sensor fields
  are `EntityRef | null`, not raw IDs; `roomStats`/`lightStats` carry computed
  counts because light/opening models have no live state.
- `src/strategy.ts` generates one panel view and declares
  `registryDependencies = ["areas", "devices", "entities", "floors"]`. Keep it,
  or the card receives empty registries.
- `src/config.ts` `normalizeConfig` is the single config normalizer; `areas`
  normalizes to `{ include, exclude, order }`.
- `src/ui/styles/*.css` is the visual source of truth. Import CSS with
  `?inline` through `src/ui/styles/index.ts`; esbuild and Vite/Storybook both
  handle the suffix. Do not add a second global stylesheet or edit
  `dist/arcus.js` by hand.
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
- Visual baselines in `tests/visual/__screenshots__` are CI-native for
  `ubuntu-26.04`. Local WSL runs can differ by font metrics; do not run
  `--update-snapshots` locally. The Visual workflow is the source of truth.
- To refresh baselines, dispatch the Visual workflow with
  `update_snapshots=true` (`gh workflow run Visual -f update_snapshots=true`),
  download the `playwright-baselines` artifact, copy it over
  `tests/visual/__screenshots__`, and commit the PNGs.

## Release and live install

- `hacs.json` requires the release asset to be named `arcus.js`;
  `.github/workflows/release.yml` runs on `v*` and attaches `dist/arcus.js`.
- To release: bump `package.json` and `src/version.ts` together, commit, tag
  `vX.Y.Z`, push the tag. A plain push is not a release.
- CI: typecheck -> test -> build -> size -> HACS validation, plus a Storybook
  build job. Visual is pinned to `ubuntu-26.04`.
- The live HA dashboard `hjem-dognet` uses `custom:arcus` and the
  Marketplace-installed `/local/community/ha-arcus/arcus.js`; it does not load
  this repo's `dist/`. Changes need a release + Marketplace update. The old
  inline `hjem-dognet` resources are gone; `legacy/` is reference only.
- `docs/marketplace.md` is a historical initial-publish checklist; the repo is
  already public. Trust README, `hacs.json`, and the workflows.
