# AGENTS.md

Arcus is a Home Assistant Marketplace Dashboard plugin: one self-contained
frontend bundle, a dashboard strategy, and visual editors. Single package,
no monorepo. Published at `liltoto/ha-arcus`; current release `v0.1.0`.

## Commands

- `npm run dev` — esbuild watch on `:5173`; builds `dist/arcus.js` and
  `dev/fixture.js`. Harness: `/dev/index.html` (`?full=1`, `?light=1`).
- `npm test` — Vitest + happy-dom. One file:
  `npx vitest run tests/<name>.test.ts`.
- `npm run typecheck` — `tsc --noEmit`, strict.
- `npm run build` — minified `dist/arcus.js` without sourcemap. `dist/` is
  gitignored; `npm run dev` overwrites it with a sourcemap build, so run
  `npm run build` before release/asset checks.
- `npm run visual` — Playwright; starts `npm run dev` via `webServer`.
- `npm run lint` is broken (no `eslint.config.*`); don't use it as a gate.
- Verify before pushing: `npm run typecheck && npm test && npm run build`.

## Architecture

- `src/main.ts` is the bundle entrypoint and must import every element module
  (`card`, `views/sheet`, `editor`, `strategy`, `strategy-editor`). Tests import
  modules directly, so add new elements to `main.ts` and `tests/smoke.test.ts`.
- `src/card.ts` owns `arcus-card`, the home view, routing, and the sheet frame.
  `src/views/sheet.ts` dispatches to `src/views/layers/*`; layers render only
  the body through `SheetApp`/`LayerContext` in `src/views/layers/types.ts`.
- `src/model/discover.ts` discovers rooms from HA's area/device/entity
  registries; `src/model/build.ts` builds `HomeModel`. `RoomModel` sensor fields
  are `EntityRef | null`, not raw IDs; `roomStats`/`lightStats` carry computed
  counts because light/opening models have no live state.
- `src/strategy.ts` generates one panel view and declares
  `registryDependencies = ["areas", "devices", "entities", "floors"]`. Keep it,
  or the card receives empty registries.
- `src/config.ts` `normalizeConfig` is the single config normalizer; `areas`
  normalizes to `{ include, exclude, order }`. `src/render/styles.ts` is the
  ported visual source of truth; `legacy/` is reference only.
- The bundle embeds Fraunces/Inter Tight as data URLs. Do not add Google Fonts,
  CDNs, or runtime imports; the release workflow rejects
  `fonts.googleapis|unpkg|cdn.jsdelivr`.

## Fixtures, tests, and screenshots

- `dev/mock.js` is shared by the dev harness and `tests/fixtures/home.ts`;
  changing it changes both.
- `examples/hjem.yaml` is the real-home config (Outdoor repurposed as Skur,
  plus Lille Gang). The mock/fixture use a synthetic `skur` area and 7 rooms.
  They intentionally differ; don't sync them blindly.
- Visual baselines in `tests/visual/__screenshots__` are CI-native for
  `ubuntu-26.04`. Local WSL runs can differ by font metrics; do not run
  `--update-snapshots` locally. The Visual workflow is the source of truth.

## Release and live install

- `hacs.json` requires the release asset to be named `arcus.js`;
  `.github/workflows/release.yml` runs on `v*` and attaches `dist/arcus.js`.
- To release: bump `package.json` and `src/version.ts` together, commit, tag
  `vX.Y.Z`, push the tag. A plain push is not a release.
- CI: typecheck -> test -> build -> HACS validation. Visual is pinned to
  `ubuntu-26.04`.
- The live HA dashboard `hjem-dognet` uses `custom:arcus` and the
  Marketplace-installed `/local/community/ha-arcus/arcus.js`; it does not load
  this repo's `dist/`. Changes need a release + Marketplace update. The old
  inline `hjem-dognet` resources are gone; `legacy/` is reference only.
- `docs/marketplace.md` is a historical initial-publish checklist; the repo is
  already public and `v0.1.0` is released. Trust README, `hacs.json`, and the
  workflows.
