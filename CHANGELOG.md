# Changelog

All notable changes to Arcus are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
