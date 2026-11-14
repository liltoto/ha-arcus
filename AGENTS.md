# AGENTS.md

Arcus is a Home Assistant Marketplace Dashboard plugin: one self-contained
frontend bundle (`dist/arcus.js`), a dashboard strategy, and two visual editors.
Single package, no monorepo. Published at `liltoto/ha-arcus`; current release
`v0.4.3`. CI runs on Node 22 with pnpm 12; `tsc` is strict.

## Commands

- Use pnpm (pinned in `packageManager`); the lockfile is `pnpm-lock.yaml`.
  Do not reintroduce `package-lock.json` or npm commands.
- `pnpm run dev` — esbuild watch + Panda `cssgen --watch` on `:5173`, serving
  `/dev/index.html` (`?full=1`, `?light=1`) and writing `dist/arcus.js` plus
  `dev/fixture.js`.
- `pnpm test` — Vitest + happy-dom. One file:
  `pnpm exec vitest run tests/<name>.test.tsx`. Watch: `pnpm run test:watch`.
- `pnpm run test:coverage` — Istanbul; writes `coverage/coverage-final.json`,
  required by `fallow:health` and `fallow:audit`.
- `pnpm run typecheck` — `tsc --noEmit`, strict.
- `pnpm run lint` — Oxlint (`.oxlintrc.json`); fails on warnings.
- `pnpm run format` / `pnpm run format:check` — Oxfmt (`.oxfmtrc.json`);
  print width 80.
- `pnpm run build` — production Panda CSS + minified `dist/arcus.js` (no
  sourcemap). Stop `pnpm run dev` first: the watcher can overwrite the build.
- `pnpm run size` — fails above 400 KB gzip. Current bundle is ~391 KB.
- `pnpm run storybook` / `pnpm run build-storybook` — Storybook on `:6006`; CI
  gates the static build.
- `pnpm run visual` — Playwright against `pnpm run dev`.
- `styled-system/` is generated and gitignored; `pnpm install` runs `prepare`
  (`panda codegen`). If missing: `pnpm exec panda codegen`.
- Pre-push gate:
  `pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm run test:coverage && pnpm run fallow:dead && pnpm run fallow:arch && pnpm run fallow:dupes && pnpm run fallow:health && pnpm run build && pnpm run size && pnpm run build-storybook`.

### Lint and format

- `vitest/require-mock-type-parameters` is off (noisy for `vi.fn()`
  inference); `vitest/valid-expect` is off because Oxlint rejects Vitest's
  supported `expect(value, message)` form.
- `tests/**` disables `react/immutability`; tests intentionally mutate fixture
  props and action stubs.

### Fallow gate

- `.fallowrc.jsonc` allowlists the reflective `getStubConfig`/`getConfig`,
  defines atomic-design boundaries, and caps
  duplication at 2%. Before deleting an export:
  `pnpm exec fallow dead-code --trace <file>:<export>`.
- `pnpm run fallow:audit` locally compares against the branch upstream and can
  audit **0 files**. Reproduce CI with:
  `pnpm exec fallow audit --coverage coverage/coverage-final.json --base origin/main`.
- Audit fails on findings introduced by the changeset, not only worsened ones.
  New/changed functions must stay under the complexity tiers and CRAP < 30;
  CRAP needs coverage, so add tests for new helpers. Suppression exists but is
  a last resort: `// fallow-ignore-next-line complexity`.
- A new top-level `src/*.ts` file must be added to the `root` zone in
  `.fallowrc.jsonc` or `fallow:arch` fails boundary coverage.

## Architecture

- `src/main.ts` is the bundle entrypoint and must import every element module
  (`card`, `editor`, `strategy`, `strategy-editor`). Add new elements there and
  to `tests/smoke.test.ts`; tests import modules directly.
- `src/card.ts` owns `arcus-card`: `hass`, config, `HomeModel`, routing,
  history, theme, clock, and the action bridge. It mounts exactly one React
  root inside the card shadow DOM and renders `src/ui/ArcusApp.tsx`.
- `src/ui/` follows atomic design: `atoms/` (pure primitives), `molecules/`
  (domain-shaped, props-only), `organisms/` (sections and sheet bodies),
  `templates/` (layout shells), `pages/` (data-wired composition). Put a
  component in the smallest layer that fits.
- `src/ui/providers/ArcusProvider.tsx` exposes `hass`, `model`, `config`, `t`,
  `bindings`, `route`, `actions`, `history`, and `now` through
  `src/ui/hooks.ts`. Organisms/pages use the hooks; atoms/molecules do not.
- `src/ui/pages/SheetFrame.tsx` owns the scrim, focus trap, Escape,
  drag-to-dismiss, and scroll reset. `HomePage` passes it to `HomeTemplate` as
  the `sheet` slot. `src/ui/pages/SheetPage.tsx` resolves routes through
  `src/ui/pages/layerRegistry.ts`; add a sheet body under
  `src/ui/organisms/layers/` and a registry entry.
- `src/model/discover.ts` discovers rooms from HA's area/device/entity
  registries. `src/model/discover-systems.ts` auto-fills unconfigured system
  sections (weather, price, solar, water, ventilation, prayers, security) from
  live states. `src/model/build.ts` builds `HomeModel`; it runs
  `discoverSystems` first, so every builder sees the same resolved config.
  Explicit config always wins; `auto_discover: false` disables the pass.
- `RoomModel` sensor fields are `EntityRef | null`, not raw IDs. Rooms also
  carry `kind` (`indoor`/`outdoor`/`utility`), `wide`, floor metadata, `covers`,
  and `lock`. `roomStats`/`lightStats` hold computed counts because
  light/opening models have no live state. `src/model/lights.ts` is the single
  light-ID flattener; do not re-add local group loops.
- `src/format.ts` owns `resolveCurrency`, `resolvePriceUnit`, and
  `resolveTempUnit`. Read units from those helpers instead of hardcoding `kr`,
  `DKK`, or `°C`; they fall back to `hass.config` and preserve Danish defaults.
  `ArcusConfig.units` overrides them.
- Never special-case an area ID or brand in the model. Room behavior comes from
  `rooms.<id>.kind`/`wide`/`icon`; sheets read optional
  `water.softenerName`, `ventilation.name`, `solar.pv1`–`pv4`, and
  `security.alarm`/`locks`. User-visible labels belong in `src/localize.ts`
  (Danish + English), not in components.
- `src/config.ts` `normalizeConfig` is the only config normalizer; `areas`
  normalizes to `{ include, exclude, order }`. Top-level options include
  `auto_discover`, `group_by_floor`, `person`, `units`, `vitals`,
  `chapter_order`, `energy`, and `heating`; room overrides also accept `kind`,
  `wide`, `icon`, `covers`, and `lock`.
- `src/strategy.ts` generates one panel view and declares
  `registryDependencies = ["areas", "devices", "entities", "floors"]`. Keep it,
  or the card receives empty registries.
- `src/ui/molecules/HistoryChart.tsx` is the shared economy/tech history chart;
  Storybook sheet frames come from `src/ui/storybook/with-sheet.tsx`.
- The bundle embeds Fraunces/Inter Tight as data URLs. Do not add Google Fonts,
  CDNs, or runtime imports; the release workflow rejects
  `fonts.googleapis|unpkg|cdn.jsdelivr`.

## Editors

- `src/editor.ts` and `src/strategy-editor.ts` are framework-free custom
  elements with their own shadow roots and the shared `EDITOR_STYLES` string.
  Use plain HTML controls, not `ha-*` components, and do not inject the
  dashboard stylesheet there.
- Home Assistant echoes every `config-changed` back into `setConfig`. That echo
  must **not** re-render: rebuilding drops focus/caret, collapses open
  `<details>`, and scrolls the dialog to the top. Re-render only on a real
  external change; `captureViewState`/`restoreViewState` preserve open sections
  and the focused field, and Backspace/Delete is stopped at the shadow
  boundary so dashboard shortcuts cannot remove the card.
- Entity autocomplete is field-specific. `src/editor-entities.ts`
  (`suggestEntities`, `datalistId`) builds one filtered `<datalist>` per
  `EntityField.suggest` spec. When adding an entity field, add a `suggest`
  spec; when adding a name/unit field, set `entity: false` (and no `suggest`)
  so it gets no datalist. Device-class specs rank name matches first; name-only
  specs are strict and return an empty list when the integration is absent.
- `textMarkup` takes a concrete datalist `listId`, not a boolean.

## Styling

- `panda.config.ts` owns the reset, palette variables, conditions, and static
  tokens. Define component styles in `src/ui/styles/*.ts` with Panda `css()`
  imported from `styled-system/css` (the extractor must see it).
- `src/ui/styles/classes.ts` exports `c()`, which keeps the semantic class name
  (tests/Playwright hook) and appends the generated Panda class. Keep semantic
  tokens: `c("room-card")` must not become only the generated class.
- In `css()` conditions use underscore keys (`_phone`, `_compact`, `_light`).
  `globalCss` is the base layer and loses to utilities, so keep component
  responsive/density overrides in `css()`.
- When generating HTML strings, put `c()` on the element that owns a standalone
  style (`wday`, `price-bars`, …); child classes can rely on nested selectors.
- A chart that sets `pointer-events: none` must restore `pointer-events: auto`
  on its `[data-graph]` SVG, or the hover/touch readout stops receiving events.
- `src/ui/styles/panda.css` is only the layer declaration.
  `src/ui/styles/index.ts` injects `FONT_FACE_CSS + panda.css?inline` into the
  card shadow root; do not add a second global stylesheet or edit
  `dist/arcus.js` by hand.

## Fixtures and tests

- `dev/mock.js` is shared by the dev harness and `tests/fixtures/home.ts`;
  changing it changes both. `tests/fixtures/archetypes.ts` adds three divergent
  homes (urban apartment, multi-floor US home, minimal auto-discovery) used by
  `tests/archetypes.test.tsx` to prove configurability.
- `examples/hjem.yaml` is the real-home config (Outdoor repurposed as Skur,
  plus Lille Gang). The mock/fixture use a synthetic `skur` area and 7 rooms.
  They intentionally differ; do not sync them blindly.
- UI tests use Testing Library. `tests/ui/home-test-utils.tsx`
  (`renderWithArcus`) wires the provider for home organisms;
  `tests/ui/layer-test-utils.tsx` (`renderLayer`) does the same for sheet
  bodies. Prefer role/text queries over asserting rendered HTML strings.
- `tests/editor.test.ts` covers echo/focus/keyboard behaviour;
  `tests/editor-entities.test.ts` covers the pure suggestion filters.
- Class assertions must be token-based (`toHaveClass("sheet", "open")`), not
  exact `className`. In Playwright use whitespace-bounded regexes
  (`/(^|\s)open(\s|$)/`); Panda utility names contain state words such as
  `[&.open]` and will false-positive a plain `/open/`.
- Visual baselines in `tests/visual/__screenshots__` are CI-native for
  `ubuntu-26.04` (Playwright pins `Europe/Copenhagen`). Local WSL runs can
  differ by font metrics; never run `--update-snapshots` locally. The Visual
  workflow is the source of truth.
- Refresh baselines with
  `gh workflow run Visual -f update_snapshots=true`, download the
  `playwright-baselines` artifact, copy it over
  `tests/visual/__screenshots__`, and commit the PNGs.
- Storybook (`.storybook/main.ts`, `.storybook/preview.tsx`) uses a real
  shadow-root decorator and a global fixture provider; `typescript.check` is
  disabled because `pnpm run typecheck` is the single type gate.

## Release and live install

- `hacs.json` requires the asset to be named `arcus.js`;
  `.github/workflows/release.yml` runs on `v*` and attaches `dist/arcus.js`
  after typecheck, tests, build, size, and a forbidden-URL scan.
- To release, bump `package.json`, `src/version.ts`, `tests/smoke.test.ts`,
  README's console version, and `AGENTS.md`, add a `CHANGELOG.md` entry, commit,
  tag `vX.Y.Z`, and push the tag. A plain push is not a release.
- `main` is protected. This single-maintainer repo merges with
  `gh pr merge --squash --admin`.
- CI order: format:check → lint → typecheck → test:coverage → fallow:dead →
  fallow:arch → fallow:dupes → fallow:health → build → size → HACS validation,
  plus a Storybook job. Pull requests also run `fallow:audit`. Visual is pinned
  to `ubuntu-26.04`.
- The live HA dashboard `hjem-dognet` uses `custom:arcus` and the
  Marketplace-installed `/local/community/ha-arcus/arcus.js`; it does not load
  this repo's `dist/`. Changes need a release + Marketplace update.
