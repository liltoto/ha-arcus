# Changelog

All notable changes to Arcus are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
