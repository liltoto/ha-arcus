# Changelog

All notable changes to Arcus are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
