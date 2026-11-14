# Arcus React + Storybook Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace Arcus's string-template presentation layer with a React component library organized by atomic design, developed and documented in Storybook, without changing the HA card/strategy contract or the visual design.

**Architecture:** `<arcus-card>` remains the Home Assistant custom element and the only owner of `hass`, config, model building, routing, history, and theme. It mounts one React root inside its shadow DOM. A thin `ArcusProvider` exposes stable contexts (`hass`, `model`, `config`, `t`, `bindings`, `route`, `actions`, `history`, `now`); pure components take props and pages wire context. No second WebSocket and no module-level global store.

**Tech Stack:** React 19.3, ReactDOM 19.3, TypeScript 7, Storybook 10.6, Vite 8.3, esbuild 0.28, Vitest 5, Playwright 1.65, happy-dom 21, `@testing-library/react` 16.

**Status:** complete and shipped in `v0.2.0`.

**Spec:** this conversation (2026-11-14 architecture discussion). No standalone spec file; the Goal, Global Constraints, and Review Focus below are the contract.

## Global Constraints

- Home Assistant 2026.11.0 or newer.
- One self-contained ESM bundle: `dist/arcus.js`. No runtime imports, CDNs, Google Fonts, unpkg, or jsdelivr.
- Keep the public contract: `custom:arcus-card`, `custom:arcus`, `setConfig`, `set hass`, `getCardSize`, and both visual editors.
- Keep the visual design, copy, and behavior. Existing Playwright baselines are the parity gate.
- Keep Danish/English, dark/light, four atmospheres, comfortable/compact, 360 px layout, and `prefers-reduced-motion`.
- TypeScript strict. React and ReactDOM are the only new runtime dependencies.
- Bundle budget: **400 KB gzip** for `dist/arcus.js` (current 284 KB).
- Verify with `npm run typecheck && npm test && npm run build`; Storybook with `npm run build-storybook`.
- Never update visual baselines locally. Refresh through the `Visual` workflow only.
- Storybook is component development/documentation, not the visual-regression source of truth.

## Review Focus

These are the input classes most likely to break; each is pinned to a task test.

1. **Multiple cards on one page** — two `<arcus-card>` elements with different fixtures; toggling one must not affect the other. Test in `tests/ui/provider.test.tsx`.
2. **Card lifecycle** — `hass` before `connectedCallback`, unmount, and re-mount; no leaked React root or stale model. Test in `tests/card.test.ts`.
3. **Sheet interactions** — focus trap, Escape, scroll preservation, and slider drag across `hass` updates. Test in `tests/ui/sheet.test.tsx`.
4. **Responsive/theme/language** — 360/390 px, dark/light, da/en, reduced motion. Stories plus existing Playwright specs.
5. **Registry change/reconnect** — a new `hass` with changed areas/devices rebuilds the model and drops stale rooms. Test in `tests/ui/home.test.tsx`.

## File Structure

```
src/
  card.ts                     HA shell; owns hass/config/model/route/history/theme; mounts React
  editor.ts                   unchanged (vanilla editor)
  strategy-editor.ts          unchanged
  strategy.ts                 unchanged
  config.ts, types.ts, actions.ts, format.ts, localize.ts
  data/history.ts
  model/{discover,build,bindings}.ts
  render/{charts,graph,fonts,icons}.ts
  ui/
    ArcusApp.tsx
    providers/{ArcusProvider.tsx, LegacySheet.tsx, StoryFrame.tsx}
    hooks/{useFocusTrap.ts, useSheetDrag.ts, useGraphTips.ts}
    atoms/{Icon,Button,IconButton,Badge,Dot,Stat,Sparkline,GaugeArc,SheetGrab,Tab,EmptyState}.tsx
    molecules/{RoomCard,ChapterCard,QuickAction,VitalStat,ForecastDay,EntityRow,ToggleRow,Stepper,LightRow,PrayerMarker,SheetHeader,SegmentedTabs,ConfirmBar,OpeningRow,BatteryRow,MediaRow,ChartBox,ZoneStrip,Readout,ListRow}.tsx
    organisms/{TopBar,Hero,Vitals,RoomGrid,ChapterGrid,QuickActions,Footer,SheetFrame}.tsx
    organisms/layers/{RoomBody,LightsBody,EnergyBody,SolarBody,WaterBody,SecurityBody,VentilationBody,TechBody,EconomyBody,PrayersBody,AlertsBody,AllBody}.tsx
    pages/{HomePage,SheetPage}.tsx
    templates/{HomeTemplate,SheetTemplate}.tsx
    styles/{tokens,base,atoms,home,sheet}.css
    styles/layers/*.css
    styles/index.ts
tests/
  ui/{provider,atoms,molecules,home,sheet,room-sheet,energy-solar,layers}.test.tsx
  card.test.ts, smoke.test.ts, ...   existing logic tests unchanged unless listed
.storybook/{main.ts,preview.tsx}
scripts/{build.mjs,dev.mjs,check-size.mjs}
```

---

## Task 1: Tooling and Storybook foundation

**Files:**
- Modify: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.github/workflows/ci.yml`
- Create: `tests/setup.ts`, `.storybook/main.ts`, `.storybook/preview.tsx`, `src/ui/atoms/Button.tsx`, `src/ui/atoms/Button.stories.tsx`, `src/ui/providers/StoryFrame.tsx`

**Interfaces:**
- Produces: `ButtonProps { children: ReactNode; tone?: "default" | "primary" | "danger"; size?: "sm" | "md"; onClick?: () => void; disabled?: boolean; className?: string }`
- Produces: `withStoryFrame: Decorator` (shadow-root decorator that injects `STYLES`)

- [x] Add React 19.3.1, ReactDOM 19.3.1, Storybook 10.6.7 (`storybook`, `@storybook/react`, `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y`), `@vitejs/plugin-react` 6.3, `vite` 8.3.8, `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.10, `@testing-library/jest-dom` 7.0.1, and React types.
- [x] Add scripts `storybook` (`storybook dev -p 6006`) and `build-storybook` (`storybook build`).
- [x] Configure `tsconfig.json` with `"jsx": "react-jsx"`, `"types": ["vitest/globals", "react", "react-dom"]`, and include `.storybook`.
- [x] Configure Vitest with `@vitejs/plugin-react`, `tests/setup.ts`, and `tests/**/*.test.tsx`.
- [x] Add `tests/setup.ts` with `@testing-library/jest-dom/vitest`, RTL cleanup, and `IS_REACT_ACT_ENVIRONMENT = true`.
- [x] Create the shadow-root `StoryFrame` decorator and a `Button` atom with stories.
- [x] Add a `storybook` CI job that runs `npm run build-storybook`.
- [x] Run `npm run typecheck && npm test && npm run build-storybook`.
- [x] Commit: `chore: add react and storybook tooling`.

## Task 2: CSS pipeline, zero visual change

**Files:**
- Modify: `scripts/build.mjs`, `scripts/dev.mjs`, `src/render/styles.ts`
- Create: `src/ui/styles/{tokens,base,atoms,home,sheet}.css`, `src/ui/styles/layers/*.css`, `src/ui/styles/index.ts`, `src/types/assets.d.ts`

**Interfaces:**
- Produces: `STYLES: string` from `src/ui/styles/index.ts`
- `src/render/styles.ts` re-exports `STYLES` for compatibility until Task 12.

- [x] Add an esbuild `?inline` plugin and `jsx: "automatic"` to `scripts/build.mjs` and `scripts/dev.mjs`.
- [x] Define `process.env.NODE_ENV` as `"production"` in the build and `"development"` in dev.
- [x] Move the CSS from `src/render/styles.ts` into the new files verbatim; no selector changes.
- [x] Add `src/types/assets.d.ts` for `*.css?inline`.
- [x] Run `npm run build`, `npm test`, and `npm run visual`; expect no baseline diffs.
- [x] Commit: `refactor: split shadow styles into css modules`.

## Task 3: Provider and action bridge

**Files:**
- Create: `src/ui/providers/ArcusProvider.tsx`, `src/ui/hooks.ts`, `src/ui/types.ts`, `tests/ui/provider.test.tsx`
- Modify: `src/card.ts`

**Interfaces:**
- Produces:
```ts
export interface ArcusActions {
  callService(domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>): void;
  navigate(path: string): void;
  openSheet(route: string): void;
  closeSheet(): void;
  performAction(action: ActionConfig): void;
  confirm(text: string, act: string): void;
  toast(text: string): void;
  setAtmo(mode: AtmosphereSetting): void;
}

export interface ArcusProviderProps {
  hass: ArcusHass;
  model: HomeModel;
  config: ArcusConfig;
  t: Translator;
  bindings: Record<string, string>;
  route: SheetRoute;
  actions: ArcusActions;
  history: HistoryCache;
  now: () => Date;
  children: ReactNode;
}

export function useHass(): ArcusHass;
export function useModel(): HomeModel;
export function useConfig(): ArcusConfig;
export function useTranslator(): Translator;
export function useBindings(): Record<string, string>;
export function useRoute(): SheetRoute;
export function useActions(): ArcusActions;
export function useHistory(): HistoryCache;
export function useNow(): () => Date;
```
- Consumes: `ArcusHass`, `HomeModel`, `ArcusConfig`, `Translator`, `SheetRoute`, `ActionConfig`, `AtmosphereSetting`, `HistoryCache`.

- [x] Write `tests/ui/provider.test.tsx`: two providers render independent probe components; a state-only `hass` update changes `useHass()` but keeps `useConfig()`/`useActions()` identity stable.
- [x] Implement the provider and hooks with small contexts (no global store).
- [x] Add the `ArcusActions` implementation in `card.ts`, reading the latest `_hass` through closures.
- [x] Run `npx vitest run tests/ui/provider.test.tsx` and `npm run typecheck`.
- [x] Commit: `feat: add react provider and action bridge`.

## Task 4: Atoms

**Files:**
- Create: `src/ui/atoms/{Icon,Button,IconButton,Badge,Dot,Stat,Sparkline,GaugeArc,SheetGrab,Tab,EmptyState}.tsx`
- Create: co-located `*.stories.tsx`
- Create: `tests/ui/atoms.test.tsx`

**Interfaces:**
- `IconProps { name: string; className?: string; title?: string }`
- `SparklineProps { values: ChartValues; width?: number; height?: number; pad?: number; range?: ChartRange | null; className?: string; area?: boolean }`
- `GaugeArcProps { value: number; max?: number; size?: number; stroke?: number; tone?: "sage" | "brass" | "coral" }`
- `StatProps { label: string; value: ReactNode; unit?: string; sub?: string; tone?: "default" | "ok" | "warn" }`
- `TabProps { active: boolean; children: ReactNode; onClick: () => void }`
- `EmptyStateProps { icon?: string; title: string; hint?: string }`

- [x] Write failing atom tests: button variants/aria, icon renders SVG, sparkline emits a path, stepper/tab active state, empty state.
- [x] Implement the atoms using the existing `icon()`/`sparkPath()`/`areaPath()` helpers. `Icon` may use `dangerouslySetInnerHTML` with the static internal `ICONS` map only.
- [x] Add stories for every atom with controls and a11y.
- [x] Run `npx vitest run tests/ui/atoms.test.tsx` and `npm run build-storybook`.
- [x] Commit: `feat: add atomic ui primitives and stories`.

## Task 5: Molecules

**Files:**
- Create: `src/ui/molecules/{RoomCard,ChapterCard,QuickAction,VitalStat,ForecastDay,EntityRow,ToggleRow,Stepper,LightRow,PrayerMarker,SheetHeader,SegmentedTabs,ConfirmBar,OpeningRow,BatteryRow,MediaRow,ChartBox,ZoneStrip,Readout,ListRow}.tsx`
- Create: co-located `*.stories.tsx`
- Create: `tests/ui/molecules.test.tsx`

**Interfaces:**
- `RoomCardProps { room: RoomView; onOpen: () => void }`
- `ChapterCardProps { chapter: ChapterView; onOpen: () => void }`
- `LightRowProps { name: string; isOn: boolean; brightness: number; onToggle: () => void; onBrightness: (value: number) => void }`
- `ToggleRowProps { label: string; isOn: boolean; onChange: () => void; disabled?: boolean }`
- `StepperProps { value: number; min?: number; max?: number; step?: number; unit?: string; onChange: (value: number) => void }`
- `SheetHeaderProps { kicker: string; title: string; sum?: ReactNode; onClose: () => void }`
- `SegmentedTabsProps { tabs: Array<{ key: string; label: string }>; active: string; onChange: (key: string) => void }`
- `ConfirmBarProps { text: string; onConfirm: () => void; onCancel: () => void }`
- Components are pure props; no context inside molecules.

- [x] Write failing molecule tests: room/chapter click, light toggle and slider callback, stepper min/max, tab selection, confirm/cancel, opening/battery rows.
- [x] Implement the molecules with the existing class names and `data-*` attributes.
- [x] Add stories for every molecule with realistic fixture args.
- [x] Run `npx vitest run tests/ui/molecules.test.tsx` and `npm run build-storybook`.
- [x] Commit: `feat: add dashboard molecules and stories`.

## Task 6: Home page and card bridge

**Files:**
- Create: `src/ui/ArcusApp.tsx`, `src/ui/templates/HomeTemplate.tsx`, `src/ui/pages/HomePage.tsx`, `src/ui/organisms/{TopBar,Hero,Vitals,RoomGrid,ChapterGrid,QuickActions,Footer}.tsx`, `src/ui/providers/LegacySheet.tsx`
- Modify: `src/card.ts`, `src/main.ts`, `tests/card.test.ts`
- Create: `tests/ui/home.test.tsx`

**Interfaces:**
- `ArcusAppProps { hass, model, config, t, bindings, route, actions, history, now }`
- `HomePageProps` consumes the provider via hooks.
- `LegacySheetProps { route: SheetRoute }` renders `<arcus-sheets>` and sets `app`/`route` on the element.

- [x] Write `tests/ui/home.test.tsx`: renders greeting, room, chapter; clicking a room calls `actions.navigate("rum/stue")`; clicking a chapter calls `actions.navigate("energi")`; a new `hass` with changed areas rebuilds the room list.
- [x] Implement `HomeTemplate`, `HomePage`, and the home organisms with the existing class names and copy. Reuse `buildBindings` for hero/vital copy; render `greet`/`weatherStrip` through `dangerouslySetInnerHTML` (internally escaped).
- [x] Mount React in `card.ts`: create `<div class="arcus-react">` (CSS `display: contents`) in the shadow root, `createRoot`, initial `flushSync`, later renders batched on `requestAnimationFrame`. `updateComplete` resolves after the latest commit.
- [x] Keep the legacy `<arcus-sheets>` element inside the React-rendered sheet frame until Task 7.
- [x] Remove home `data-bind`/`data-act` patching from the card; keep action/history/route/model logic.
- [x] Run `npx vitest run tests/ui/home.test.tsx tests/card.test.ts` and `npm run visual`; baselines must stay unchanged. Fix React whitespace rather than refresh snapshots.
- [x] Commit: `feat: render the home view with react`.

## Task 7: Sheet frame and Lights layer

**Files:**
- Create: `src/ui/templates/SheetTemplate.tsx`, `src/ui/organisms/SheetFrame.tsx`, `src/ui/pages/SheetPage.tsx`, `src/ui/organisms/layers/LightsBody.tsx`, `src/ui/hooks/{useFocusTrap.ts,useSheetDrag.ts}`, `src/ui/pages/layerRegistry.ts`
- Modify: `src/card.ts`
- Create: `tests/ui/sheet.test.tsx`

**Interfaces:**
- `SheetFrameProps { open: boolean; route: SheetRoute; onClose: () => void; children: ReactNode }`
- `LayerBodyProps { route: SheetRoute }` — every layer body receives the active route and reads the provider.
- `layerRegistry: Record<string, ComponentType<LayerBodyProps>>` with every layer key pre-created. Unported layers render `<LegacySheet route={route} />` in their stub.

- [x] Write failing sheet tests: open/close, focus trap, Escape, focus restore, scroll position across a `hass` update, slider not interrupted.
- [x] Implement `SheetFrame`, `SheetTemplate`, `SheetPage`, and the focus/drag hooks.
- [x] Implement `LightsBody` fully.
- [x] Pre-create every other `*Body.tsx` as a legacy-backed stub and register it in `layerRegistry`.
- [x] Run `npx vitest run tests/ui/sheet.test.tsx tests/card.test.ts` and `npm run visual`.
- [x] Commit: `feat: add react sheet frame and lights layer`.

## Task 8: Room sheet

**Files:**
- Modify: `src/ui/organisms/layers/RoomBody.tsx`
- Create: `tests/ui/room-sheet.test.tsx`

- [x] Write failing room-sheet tests: thermostat stepper, light group toggle, opening row, battery, media.
- [x] Port the room layer (774 lines) to `RoomBody` using the molecules and provider.
- [x] Run the tests and the visual suite.
- [x] Commit: `feat: port the room sheet to react`.

## Task 9: Energy and Solar

**Files:**
- Modify: `src/ui/organisms/layers/EnergyBody.tsx`, `src/ui/organisms/layers/SolarBody.tsx`
- Create: `src/ui/hooks/useGraphTips.ts`, `src/ui/molecules/SolarArc.tsx`, `src/ui/molecules/BatteryRing.tsx`, `tests/ui/energy-solar.test.tsx`

- [x] Write failing tests: price bars, history windows, solar readouts, battery ring, graph tip mount/unmount.
- [x] Port Energy and Solar; reuse `priceBars`, `sparkPath`, `arcPoint`, `downsample`.
- [x] Run the tests and the visual suite.
- [x] Commit: `feat: port energy and solar sheets to react`.

## Task 10: Water, Security, Ventilation

**Files:**
- Modify: `src/ui/organisms/layers/WaterBody.tsx`, `SecurityBody.tsx`, `VentilationBody.tsx`
- Create: `tests/ui/layers.test.tsx`

- [x] Write failing tests: water leak/consumption, open doors/windows, fan modes and airflow.
- [x] Port all three layers using shared `ZoneStrip`/`OpeningRow`.
- [x] Run the tests and the visual suite.
- [x] Commit: `feat: port water security and ventilation sheets`.

## Task 11: Tech, Economy, Prayers, Alerts, All

**Files:**
- Modify: `src/ui/organisms/layers/TechBody.tsx`, `EconomyBody.tsx`, `PrayersBody.tsx`, `AlertsBody.tsx`, `AllBody.tsx`
- Create/Modify: `tests/ui/layers.test.tsx`

- [x] Write failing tests: tech/economy chart paths, next prayer highlight, severity order, all-room links.
- [x] Port all five layers using shared `Readout`/`ListRow`/`EmptyState`.
- [x] Run the tests and the visual suite.
- [x] Commit: `feat: port remaining sheets to react`.

## Task 12: Cleanup, size gate, release

**Files:**
- Delete: `src/views/**`, `src/render/styles.ts`
- Modify: `src/main.ts`, `src/card.ts`, `tests/card.test.ts`, `tests/smoke.test.ts`, `tests/sheets.test.ts`, `tests/remaining-sheets.test.ts`, `AGENTS.md`, `README.md`, `CHANGELOG.md`, `package.json`, `src/version.ts`
- Create: `scripts/check-size.mjs`

- [x] Remove `arcus-sheets`, the `LegacySheet` bridge, event delegation, and dead tests.
- [x] Remove the `STYLES` compatibility re-export and update imports.
- [x] Add `npm run size` with a 400 KB gzip cap and run it after build in CI/release.
- [x] Update AGENTS/README/CHANGELOG; bump `0.2.0` in `package.json` and `src/version.ts`.
- [x] Refresh visual baselines through the `Visual` workflow only if the final DOM intentionally changed.
- [x] Run `npm run typecheck && npm test && npm run build && npm run build-storybook && npm run size`.
- [x] Commit: `chore: finish react migration and release 0.2.0`.

---

## Execution Waves

| Wave | Agents | Tasks |
|---|---|---|
| 0 | 1 | Task 1 |
| 1 | 3 | Task 2, Task 3, Task 4 |
| 2 | 2 | Task 5, Task 6a (bridge skeleton) |
| 3 | 4 + integrator | Task 6b organisms |
| 4 | 1 | Task 7 |
| 5 | 7 | Task 8, Energy, Solar, Water+Ventilation, Security, Tech+Economy, Prayers+Alerts+All |
| 6 | 1 + reviewer | Task 12 |

Each implementer works in its own git worktree branched from `feat/react-storybook`, commits on that branch, and reports the commit SHA. The main session is the only integrator: it merges in wave order, resolves conflicts, runs the full gate, and owns visual baselines and release.
