# Changelog

All notable changes to Arcus are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.6.0 - 2026-11-17

History navigation across the card.

### Added

- A card-wide history control on the home view and in charts-bearing sheets: previous/next day, a native date picker, and 1-, 7-, and 30-day windows. The selection is shared by every sheet and resets to today on reload.
- `HistoryCache.ensureRange()` fetches the exact selected window, so a day a year ago does not download a year of history. Coverage is tracked per entity, a refresh merges into the cached rows instead of replacing a longer window, and `rangeStatus()` distinguishes "not loaded" from "the recorder purged this day".
- Room, home sparklines, solar, energy, water, heating, tech, economy, and chapter-art charts follow the selected window. Fixed-purpose charts (solar 7-day/365-day, economy 30-day) keep their length and end on the selected day.

### Changed

- Room and home charts now use the selected calendar day instead of a rolling 24-hour window, so "today" and a past day share the same axis.
- The history fetch is bounded to the visible window and the card's live tick only refreshes while viewing today.

### Verified

- 556 tests, coverage, typecheck, lint, Fallow gates, build, size budget (402.9 KB gzip), Storybook, and the CI visual baselines.

## 0.5.2 - 2026-11-16

Crash containment and bounded history requests.

### Fixed

- A failed `buildModel` no longer throws inside Home Assistant's `hass` setter. The card keeps the last good model and, when no model has built yet, renders a retryable failure panel instead of mounting React.
- An uncaught render error no longer removes the whole card root. An error boundary inside the provider shows a themed fallback with a retry action.
- A hung history request no longer pins an entity at "loading" and blocks later refreshes. Both transports are bounded by a 10 s timeout, the WebSocket request is retried once before the REST fallback, and an outage reports `failed` ("Unavailable") instead of `empty` ("No data").
- A rejected history refresh is caught, so it cannot surface as an unhandled rejection.

### Verified

- 511 tests, coverage 90.5% statements / 75.3% branches / 92.3% functions, typecheck, lint, Fallow gates, build, size budget (398.2 KB gzip), and Storybook.

## 0.5.1 - 2026-11-15

Nilan filter alerts clear when the filter is reset.

### Fixed

- A Nilan unit that reports `Filter OK` no longer keeps the “needs a new filter” alert, the warning dot in the ventilation sheet, or the alarm-styled chapter summary. Filter status matching is now one shared helper that is case- and whitespace-insensitive and understands the localized `Filter OK` state.
- Alerts for auto-discovered systems now use the same resolved config as the rest of the model, so a discovered Nilan filter is watched without an explicit `ventilation` block.

### Verified

- 500 tests, coverage 89.3% statements / 75.3% branches / 92.2% functions, typecheck, lint, Fallow gates, build, size budget (396.9 KB gzip), and Storybook.

## 0.5.0 - 2026-11-15

Wall-display text scale and named type roles.

### Added

- `text_scale: normal | large | xlarge`. The option scales labels, metadata, body copy, and values for a wall display without changing the layout or the editorial display sizes.
- Six recurring type roles as CSS variables on `.app`: `micro`, `label`, `body`, `body-lg`, `value-sm`, and `value`.

### Changed

- The 86 raw 10/11/12 px declarations and the 15/18 px value declarations now resolve through those roles. The option is available in the card editor and the README.

### Verified

- 494 tests, coverage 89.0% statements / 74.7% branches / 92.2% functions, typecheck, lint, Fallow gates, build, size budget (396.9 KB gzip), Storybook, and the new large-text visual baseline.

## 0.4.8 - 2026-11-15

Accessibility and sensor-state follow-up.

### Changed

- Room and chapter cards are now articles with real `h3` headings and one stretched card-link button. The whole card stays clickable, heading navigation works, and the accessible name no longer reads every status line and SVG label.
- Light rows in the room and lights sheets use a full-row toggle button; the brightness slider stays outside it. The atmosphere control names its current mode.
- Chips and the danger button use text-role palette tokens instead of fill tokens. The last 7.5 px flow-diagram label is 10 px.
- Charts distinguish loading, empty, and unavailable sensors. Non-ready charts collapse to a compact note, and room readouts only render tiles for sensors the room actually has.
- `HistoryCache.status()` reports `idle`, `loading`, `ready`, or `empty`, including entities the recorder omits and empty results after a refresh.

### Verified

- 491 tests, coverage 89.0% statements / 74.7% branches / 92.2% functions, typecheck, lint, Fallow gates, build, size budget (396.6 KB gzip), Storybook, functional Playwright checks, and refreshed visual baselines.

## 0.4.7 - 2026-11-15

Layout, legibility, and light-theme hardening for a public card on every screen.

### Changed

- Layout now follows the card's own width with container queries instead of the browser window. A card in a 380 px sidebar, a 600 px dashboard column, and a full-width panel get the right room, vital, chapter, and sheet layout independently of the viewport.
- Room, vital, and chapter grids adapt by card width; the four fixed vital columns now follow the configured number of vitals, and sparse chapter sets drop the oversized “large” span.
- The room sheet becomes a bottom sheet below a 900 px card width, so embedded cards no longer get a clipped side panel.
- Typography has a higher floor: protocol labels are 11 px, secondary text is 11–12 px, and the smallest phone overrides were raised. Most tiny 7–9 px labels were raised; the compact flow-diagram room names remain the only exception.
- Phone controls are 44 px (top bar, sheet close, primary buttons); desktop buttons and steppers grew to 40 px.
- Light theme has its own surfaces and text roles: darker muted/accent text, a warm scrim, ink-tinted panels, and stronger hairlines. The palette's text roles now meet AA contrast in all four atmospheres.
- The day arc drops overlapping prayer labels at tablet widths and keeps only the next prayer/sunrise on the narrowest cards.
- The weather strip becomes a 2×2 grid on phones, and the top-bar controls stay right-aligned when the date is hidden.
- Long `title`/`subtitle` config values truncate instead of pushing the top bar apart.
- Room cards never clip long names or status text; the open affordance is visible on touch and narrow cards instead of hover-only.
- Empty sensor charts collapse to a compact 68 px note instead of three tall boxes.
- Graph tooltips and the cursor line position relative to the card, so they work in embedded cards.

### Verified

- 459 tests, typecheck, lint, Fallow gates, build, size budget (395.2 KB gzip), and Storybook.
- Visual baselines were refreshed through the Visual workflow.

## 0.4.6 - 2026-11-15

Performance and correctness pass over the React surface.

### Changed

- History batches are fetched through a bounded pool (four in flight) instead of one 4-entity request after another, so charts fill without a startup waterfall.
- `applyGraph` diffs the `data-g*` attributes before writing; re-applying identical chart data performs no DOM writes. `parseGraph` caches the parsed dataset per element, and `DayBars` skips unchanged `innerHTML` rebuilds.
- `QuickActions` subscribes only to the configured toggle entities instead of the whole `hass` object. `TopBar` reads the card's `personHome` binding, `DayArc` reads `model.language`, and `RoomBody` depends on chart entity IDs rather than the `hass` object.
- `SegmentedTabs` depends on a stable tab signature, `SolarBody` memoizes its tab array, and the sheet drag pointer listener is passive.
- `HistoryChart` writes its hover dataset in `useEffect` instead of blocking paint.

### Fixed

- `config.person` now takes precedence in `_personId`, so the top-bar label and presence dot agree when another person is home.
- Indoor averages and the rooms meta filter `room.kind !== "outdoor"` instead of the `skur` area id, so arbitrary outdoor rooms no longer skew the indoor figures.

### Verified

- 454 tests, coverage 88.8% / 74.2% / 92.0%, typecheck, lint, Fallow audit, build, size budget (394.2 KB gzip), Storybook, and the functional graph-tooltip visual tests.

## 0.4.5 - 2026-11-15

Web Interface Guidelines pass: keyboard, screen-reader, and mobile-interaction fixes across the React tree.

### Fixed

- Keyboard focus is visible on `<select>`, `<summary>`, and focusable rows. The global ring previously covered only buttons, links, and inputs.
- A closed sheet is `inert` and hidden from assistive tech; `aria-modal` applies only while it is open. Background content is reachable again after closing.
- Toasts announce through `role="status"` and `aria-live="polite"`.
- Toggle rows are one button, so the label text is part of the hit target instead of a dead zone.
- The ventilation function select has an accessible name, and the mode/fan segments expose `aria-pressed`.
- The route chip strip no longer claims `role="tablist"` without tab semantics; the active chip uses `aria-current`.
- Stepper values announce on change, and the +/− labels are localized.
- The atmosphere button reads the persisted mode. Previously a reload kept `auto` in local state, so the first press could be a no-op.
- Quick actions no longer hardcode bedtime, vacation, and window-alert entities. Homes without `quick_actions` get the generic Lights and Map shortcuts.
- Outdoor rooms are derived from the discovered `kind` instead of the `skur` area id.

### Changed

- Sheet bodies contain overscroll and respect the bottom safe area; the inline confirm bar compensates for the extra padding.
- Native controls follow the card theme through `color-scheme`.
- Disabled buttons, toggles, and steppers have a visible disabled state.
- Replaced the remaining `transition: all` declarations with explicit properties.
- Headings balance their lines; long room names and sheet titles wrap instead of overflowing.

### Verified

- 446 tests, typecheck, lint, Fallow audit, build, size budget (393.8 KB gzip), Storybook, and the visual suite.

## 0.4.4 - 2026-11-14

Maintenance release: the Fallow-driven cleanup, new regression tests, and four user-visible fixes.

### Added

- Regression coverage for action dispatch, graph tooltips, sheet drag, solar watts parsing, and area icon inference. Tests grew from 366 to 444.
- Shared `useHistoryFrame` / `useLightActions` hooks, `RoomStats` / `LightStats` types, `ChartScaffold`, and heating/room view helpers.

### Changed

- Split `RoomBody`, `SecurityBody`, `HeatingBody`, `EnergyBody`, `WaterBody`, `TechBody`, and `discoverRooms` into section components and pure view modules. The rendered dashboard is unchanged.
- Duplication dropped from 1.5% to 0.5%; high-complexity functions from 38 to 19.
- Bundle is 393.0 KB gzip.

### Fixed

- A cancelled sheet drag (`pointercancel`) no longer dismisses the sheet.
- Multi-series bar tooltips use the cursor bucket, so values, cursor, and timestamp agree.
- `toggle` actions support area/device-only targets through `homeassistant.toggle`.
- Service names with whitespace around the dot are trimmed.
- `Hallway` maps to the stairs area icon; bare `Hall` remains a door.

### Verified

- 444 tests, typecheck, lint, Fallow audit, build, size budget, Storybook, and the visual suite.

## 0.4.3 - 2026-11-14

Removed the external Helios 3D shortcut from the solar sheet.

### Removed

- `solar.heliosPath` and the "Open Helios 3D" button. The solar overview now only exposes the in-dashboard tabs (production, battery, forecast, payback).
- `solar.helios` translation keys from both dictionaries.

Existing dashboards that still contain `solar.heliosPath` keep working: unknown solar keys are ignored by `normalizeConfig`, so the stale line is simply dropped on the next save. No migration is required.

### Verified

- 366 tests, typecheck, Fallow audit, build, size budget, Storybook, and the visual suite.

## 0.4.2 - 2026-11-14

Editor polish: entity autocomplete now suggests the entities each field can actually use.

### Added

- Type-aware entity suggestions in the visual editor. Every entity field gets its own filtered `<datalist>` instead of one global list of every entity:
  - weather fields list `weather.*`
  - price fields list price/spot sensors, and the forecast field prefers sensors with `raw_today`/`prices`/`forecast` attributes
  - solar power/load/grid/string fields list power sensors with solar name hints; production fields list energy sensors
  - battery SoC/power fields list home-battery sensors, not door/window batteries
  - prayer fields list the matching Islamic Prayer Times sensors
  - water fields list water/softener sensors, with per-field flow/day/month/total/salt markers
  - security lists `alarm_control_panel.*` and window-alert switches
  - network lists RTT/latency sensors and router state entities
  - economy lists bond/change/yield/duration sensors
  - ventilation lists the HRV climate entity and its sensors
  - EV fields combine EV/charger name markers with plug/power/SoC markers
- `src/editor-entities.ts`: pure, ranked suggestion helper (`suggestEntities`). exact device class first, then name matches, then the rest of the domain; unavailable entities last; hidden/disabled skipped; capped at 60.
- Fields without a sensible entity list (names, units) no longer show entity autocomplete at all.

### Changed

- Removed the single `datalist#arcus-entities` in favour of `datalist#arcus-entities-<field>`.

### Verified

- 366 tests, typecheck, Fallow audit, build, size budget, Storybook, and the visual suite.

## 0.4.1 - 2026-11-14

Editor fix: typing in the visual configuration no longer makes the dialog jump to the top.

### Fixed

- `ArcusConfigEditor.setConfig` ignores Home Assistant's `config-changed` echo instead of rebuilding the form. Rebuilding collapsed every open `<details>` section, dropped input focus and caret, and scrolled the dialog to the top.
- `ArcusStrategyEditor.setConfig` keeps its embedded card editor instance alive and refreshes only the title inputs that are not focused.
- Legitimate external config updates now preserve open sections, focused control, caret position, and the page scroll position.
- `Backspace` and `Delete` inside either editor are stopped at the shadow-root boundary, so Home Assistant's dashboard edit shortcuts cannot treat them as "remove the selected card".

## 0.4.0 - 2026-11-14

Configurability release: Arcus can now fit homes that look nothing like the development home, without hand-writing a 100-line YAML block.

### Added

- `src/model/discover-systems.ts`: opt-out auto-discovery (`auto_discover`) for weather, electricity price, solar (including PV strings and home batteries), water meters and softeners, ventilation units, prayer times, moisture leaks, locks, alarm panels, and sensor batteries. Explicit config always wins.
- Units: `units.currency`, `units.price_unit`, `units.temperature`, and `units.water`, with fallbacks to `hass.config.currency`/`unit_system`. `resolveCurrency`, `resolvePriceUnit`, and `resolveTempUnit` are the single helpers.
- Adaptive hero: `vitals` presets (`indoor`, `outdoor`, `price`, `battery`, `solar`, `power`, `humidity`, `co2`, `water`, `security`, `lights`) plus custom `{ label, entity, unit, route }` tiles, and a sun-based day arc when prayer times are not configured.
- Room model: `kind` (`indoor`/`outdoor`/`utility`), `wide`, `icon`, floor metadata (`floorId`/`floorName`/`floorLevel`), `covers`, and `lock`; outdoor rooms are excluded from indoor averages and rendered last.
- Layout: `group_by_floor` groups the room grid by Home Assistant floors; `chapter_order` reorders the chapter grid; `person` pins the presence pill.
- Systems: `solar.pv1`/`pv2` (plus voltages/currents) and 1-phase grids; solar-without-battery summary and hidden battery tab; water meter without a softener; `water.softenerName` and `ventilation.name` renames; `heating.include`/`exclude`/`reserve`; multi-mode climate (`heat`, `cool`, `heat_cool`).
- Security: `security.alarm` (arm home/away/disarm) and `security.locks`, shown in the Security sheet and per-room.
- Energy: optional `energy.ev` (plug, power, session, total, SoC) and `energy.standby`/`energy.appliances` blocks.
- Visual editor: auto-discovery and floor toggles, units section, chapter toggles, `<datalist>` entity autocomplete, and entity placeholders.
- Tests: `tests/discover-systems.test.ts` and three archetype homes (urban apartment, multi-floor US home, minimal auto-discovery home) in `tests/archetypes.test.tsx`.

### Changed

- Opening kinds, system-card labels, leak alerts, and brand names are localized instead of Danish or vendor-specific.
- `buildModel` resolves `discoverSystems` once, so every builder and binding sees the same effective config.

### Verified

- Typecheck, full Vitest suite, build, size budget, and Storybook build.

## 0.3.1 - 2026-11-14

Internal cleanup and guardrail release. The dashboard, sheets, and Home Assistant contract are unchanged.

### Security

- `url` actions now open only absolute `http:`/`https:` URLs; `javascript:`, `data:`, `blob:`, protocol-relative, relative, and malformed targets are ignored.

### Changed

- Shared the economy/tech history chart, light rows, light-ID flattening, story frame, row activation, and vital text across the UI.
- Split `renderChapterArt`, `WaterBody`, `VentilationBody`, `chapterSummaries`, and `buildAlerts`/`parseWatts` into smaller functions without changing output.
- Moved `SheetFrame` to the page layer and documented the atomic-design import boundaries.

### Added

- Fallow dead-code, architecture-boundary, duplication, health-score, and changed-file audit gates.
- Istanbul coverage (`npm run test:coverage`) feeding the Fallow health score.
- `fallow:arch`, `fallow:audit`, and `fallow:health` scripts.

### Verified

- 279 tests, typecheck, build, size, Storybook, and CI Visual pass.
- The dashboard and every sheet remain pixel-identical to 0.3.0.

## 0.3.0 - 2026-11-14

Panda CSS migration. The visual design, class hooks, and Home Assistant contract are unchanged.

### Changed

- All dashboard styles now live in Panda `css()` objects under `src/ui/styles/`; the old `atoms.css`, `home.css`, `sheet.css`, `responsive.css`, and `tokens.css` files were removed.
- `panda.config.ts` owns the reset, palette, atmosphere/density/light conditions, responsive conditions, and static design tokens.
- Components keep their semantic class names (used by tests and Playwright) and append the generated Panda class through `src/ui/styles/classes.ts` `c()`.
- `src/ui/styles/panda.css` is only the layer declaration. Storybook and Vitest process it with `@pandacss/vite`; esbuild inlines the generated `styled-system/styles.css`.
- `npm run build` generates production Panda CSS (minified and hashed); `npm run dev` runs `panda cssgen --watch` alongside esbuild.
- The dashboard, room sheet, and every layer sheet were verified pixel-identical to 0.2.6 at 1440 px and 390 px before release.

## 0.2.6 - 2026-11-14

### Added

- Chart readouts now work on touch screens. Tap or press a graph to show the same values and timestamp the desktop hover readout shows, drag along the graph to move the readout, and it stays visible for 2.5 seconds after release.
- A touch on a graph no longer triggers the card or sheet action underneath it, so tapping “Sol lige nu” shows its numbers instead of opening the solar sheet. Tapping elsewhere hides the readout.
- Added a mobile Playwright test for the vital spark and energy bar readouts.

## 0.2.5 - 2026-11-14

### Fixed

- Room temperature, humidity, CO2, and PM2.5 charts carry the last known value forward between recorder rows. Wavin sensors update every 10–30 minutes, so the new time buckets were leaving empty gaps and the Køkken, Entre, and Bryggers lines looked fragmented or wrong.
- A temperature sensor that belongs to the same device as the thermostat but has no area is now used as the room's temperature source instead of charting the climate entity's non-numeric `heat`/`off` state. This fixes Bryggers and any similarly unassigned Wavin sensor.
- Heating, tech, economy, water, and savings charts also forward-fill persistent measurements between state changes.
- Solar string (PV3/PV4) charts fill their night buckets with 0 like the main solar power line.

## 0.2.4 - 2026-11-14

### Fixed

- Solar production, forecast, grid, and strings charts now share one local **calendar-day** x-axis. Previously today's forecast was aligned to midnight while the actual history used a rolling 24-hour window, so the two curves were shifted by the current time.
- The actual solar line stops at the current time instead of dropping to zero across the rest of the day.
- The home "Sol lige nu" sparkline explicitly uses 24 hours. Opening the solar sheet caches seven days for the same sensor, which used to stretch the home sparkline to a week while its hover labels still said 24 hours.
- The day arc's actual solar line now uses the local calendar day and stops at the current time.
- The 48-hour forecast chart starts at local midnight so its forecast points line up with the axis.

## 0.2.3 - 2026-11-14

### Fixed

- History series are now mapped into equal **time** buckets instead of equal row counts. Home Assistant only records state changes, so a solar sensor that reports 0 at sunset and then nothing until sunrise used to become two adjacent points and drew a diagonal ramp across the night.
- Solar actual/power series fill empty buckets with 0, so "Sol lige nu" and the solar charts sit at zero overnight. Other sensors keep null gaps instead of inventing values.
- Sparkline padding is back to 1 px, so the minimum value reaches the chart baseline as it did before the React migration.
- The same time alignment applies to room, heating, water, tech, economy, solar and day-arc charts; sparse sensors no longer jump across multi-hour gaps.

## 0.2.2 - 2026-11-14

### Fixed

- Restored the legacy sparkline rendering: `non-scaling-stroke`, 1/1.1 px strokes, and round caps/joins, so stretched card sparklines stay crisp instead of looking thick or jagged.
- History requests are batched in groups of four entities. A home-sized dashboard asks for dozens of entities, and a single request can exceed the recorder/WebSocket budget when busy sensors return thousands of rows; a failed request left charts on forecast/model fallbacks.
- Added opt-in history diagnostics. Set `localStorage.setItem("arcus-debug", "1")` and reload to log each history batch, duration, and failure in the browser console.

## 0.2.1 - 2026-11-14

### Fixed

- Home and sheet charts are owned solely by React. The card's legacy 20-second chart patchers were removed, so a timer or state push can no longer overwrite live Home Assistant history with forecast, flat, or empty fallback data.
- The history cache now notifies subscribers, so charts re-render when a history fetch completes or refreshes. The card refreshes the shared history on its 20-second clock tick through the cache TTL check.
- The day arc, room/system sparklines, chapter art, and solar/room/tech/economy charts now read their series directly from React instead of empty DOM hooks.
- A current electricity price without an intraday forecast no longer produces a fabricated flat 24-hour curve; the energy chart shows its empty state instead.

## 0.2.0 - 2026-11-14

React and Storybook migration. The visual design and the Home Assistant contract are unchanged.

### Changed

- The dashboard is rendered by a React 19 tree mounted inside the card's shadow DOM; `custom:arcus-card`, `custom:arcus`, `setConfig`, `set hass`, `getCardSize`, and the visual editors keep their existing contracts.
- The UI is organized by atomic design under `src/ui/` (`atoms`, `molecules`, `organisms`, `templates`, `pages`), with a provider for `hass`, model, config, language, routing, history, and actions.
- The sheet frame is React-owned: scrim, focus trap, Escape, drag-to-dismiss, scroll reset, and tab edge fades no longer depend on imperative DOM patching.
- Every sheet body is a React component (`src/ui/organisms/layers/`); the legacy string renderers and the `<arcus-sheets>` element are gone.
- CSS moved from one generated string to `src/ui/styles/*.css`, imported with `?inline` by both esbuild and Vite.
- Storybook 10 documents the component library; CI builds it as a gate.
- Tests moved to Testing Library for UI behavior while the model, discovery, config, localization, and chart logic tests stay unchanged.
- Bundle budget is enforced at 400 KB gzip (`npm run size`); `dist/arcus.js` is 356.6 KB gzip at this release.

### Removed

- `src/views/**` and the `arcus-sheets` custom element.
- The card's legacy `data-act` / `data-bind` event delegation and its confirm-bar DOM patching.

## 0.1.1 - 2026-11-14

Chart readouts, larger labels, and sheet polish.

### Added

- Hover value readouts on every chart: a value, unit and timestamp with a snapped cursor, covering the vital and room sparklines, the chapter charts, all detail-sheet line charts and the hourly/daily bar charts. Multi-series solar charts list every series with its colour.
- Clicking or tapping the dimmed backdrop closes a detail sheet, alongside the existing close button and Escape.

### Changed

- Raised the micro-label type scale: 7-9 px labels now use a 10 px floor (8 px on mobile home labels) with tighter tracking.
- Vital and room sparklines now sit in their own footer band instead of running behind the sub-label or status row.
- The Visual workflow accepts a manual `update_snapshots` dispatch so CI-native baselines can be regenerated and downloaded.

### Fixed

- Solar sheet tabs align with the sheet content instead of hugging the border.
- The mobile sheet tab strip no longer shrinks vertically; the active tab is scrolled into view and hidden edges fade.
- Standalone sheet block labels have 12 px of space below them.
- Charts that follow a readings grid keep 16 px of separation.

## 0.1.0 - 2026-11-13

The first Marketplace release. Arcus is a Dashboard plugin for Home Assistant 2026.11 and newer.

### Added

- `custom:arcus-card`, a dynamic home dashboard card with the day arc, greeting, weather, vitals, forecast strip, alert band, room grid, chapter grid, quick actions, and footer.
- `custom:arcus`, a dashboard strategy that generates one panel view containing the card and regenerates when the area, device, entity, or floor registries change.
- Native visual editors for the card and the strategy, including area selection, global entity fields, and an advanced JSON block for quick actions, room overrides, and the full configuration.
- Area, device, and entity discovery: device-area fallback, hidden/disabled/diagnostic filtering, light-group masters, and `rooms` overrides.
- Room, lights, heating, ventilation, energy, solar, water, security, tech, economy, prayers, alerts, and "all layers" sheets.
- Energy and solar detail views with 24-hour price curves, solar production, battery, forecast, and payback tabs.
- Danish and English localization. `language: auto` follows the Home Assistant profile language and falls back to English for other locales.
- Automatic dark/light appearance, four atmospheres (night, dawn, day, dusk), and comfortable/compact density.
- Quick actions for service calls, toggles, navigation, and URLs, with sensible defaults when the matching entities exist.
- A resilient history cache with WebSocket and REST fallbacks.
- Embedded Fraunces and Inter Tight fonts. The bundle makes no Google Fonts or CDN requests at runtime.
- An example home configuration at `examples/hjem.yaml` and desktop/mobile screenshots.

### Packaging

- `hacs.json` with `name: "Arcus"`, `filename: "arcus.js"`, and `homeassistant: "2026.11.0"`.
- One self-contained ES module at `dist/arcus.js`.
- A release workflow that runs `npm ci`, typecheck, tests, and the build on `v*` tags, verifies the self-contained bundle, then attaches `dist/arcus.js` to the GitHub release.
- CI validation with the HACS action, `category: plugin`.

### Documentation

- README with Marketplace installation, configuration reference, auto-discovery, quick actions, troubleshooting, and development commands.
- `docs/marketplace.md` with the maintainer release and Marketplace checklist.

### Known limitations

- Arcus is installed as a custom Marketplace repository until it is accepted into the catalog.
- Visual baselines live under `tests/visual/`; run `npm run visual` before a release. The README screenshots are captured manually from the development harness.
- The existing `hjem-dognet` dashboard is not removed by this release. Migration is verified separately before the old dashboard is retired.
