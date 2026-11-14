import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { performAction } from "./actions";
import { configSignature, normalizeConfig } from "./config";
import { HistoryCache } from "./data/history";
import type { HistoryRow } from "./data/history";
import {
  countdown,
  formatNumber,
  formatPrice,
  formatTime,
  greeting,
} from "./format";
import { createTranslator, resolveLanguage } from "./localize";
import { buildModel } from "./model/build";
import { buildBindings } from "./model/bindings";
import { arcPoint, areaPath, priceColor, sparkPath } from "./render/charts";
import { applyGraph, mountGraphTips } from "./render/graph";
import { icon } from "./render/icons";
import { STYLES } from "./render/styles";
import type {
  ActionConfig,
  ArcusConfig,
  ArcusHass,
  AtmosphereSetting,
  ChapterKey,
  HomeModel,
  Language,
  PrayerTimeModel,
  PriceModel,
  SheetRoute,
  SolarPoint,
  Translator,
  WeatherForecastDay,
} from "./types";
import { ArcusApp } from "./ui/ArcusApp";
import type { ArcusActions } from "./ui/types";
import { ARCUS_VERSION } from "./version";
import type { SheetApp } from "./views/layers/types";
import { escapeHtml, renderChapterArt } from "./views/home";

declare global {
  interface Window {
    /** The dev harness and visual tests pin the clock through this. */
    __HJEM_NOW?: Date;
  }
}

interface ArcusSheetsElement extends HTMLElement {
  app: SheetApp;
  route: SheetRoute;
  update?(): void;
  binds?(): Record<string, string>;
}

interface RoomStats {
  temp: number | null;
  humidity: number | null;
  co2: number | null;
  lightsOn: number;
  lightsTotal: number;
  open: number;
  leak: boolean;
}

interface Route {
  base: string;
  sub: string | null;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const WEATHER_ICON = (condition: string | undefined): string => {
  const value = String(condition ?? "").toLowerCase();
  if (value.includes("rain") || value.includes("pour")) return "rain";
  if (value.includes("snow") || value.includes("hail")) return "snow";
  if (value.includes("lightning")) return "bolt";
  if (value.includes("wind")) return "wind";
  if (value.includes("clear-night")) return "moon";
  if (value.includes("cloud")) return "cloud";
  if (value.includes("clear") || value.includes("sun")) return "sun";
  if (value.includes("fog")) return "cloud";
  return "cloud";
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayFraction(date: Date): number {
  return (
    (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60) / 1440
  );
}

function refNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value === "unavailable" || value === "unknown") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstEntityId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = value.find(
      (item): item is string => typeof item === "string" && !!item.trim(),
    );
    if (first) return first.trim();
  }
  return undefined;
}

/**
 * The Arcus custom card. It owns the shadow root, the dynamic home model,
 * routing, the sheet frame, and event delegation for every layer.
 */
export class ArcusCard extends HTMLElement {
  private _root: ShadowRoot;
  private _hass: ArcusHass | null = null;
  _config: ArcusConfig;
  _model!: HomeModel;
  _t: Translator;
  _history: HistoryCache;
  _confirm: { text: string; act: string } | null = null;
  readonly updateComplete: Promise<void>;

  /**
   * Stable bridge for the React tree. Every method reads the current
   * `_hass`/`_config` at call time, so a state push never leaves a stale
   * object behind.
   */
  private readonly _actions: ArcusActions = {
    callService: (domain, service, data, target) =>
      this._call(domain, service, data, target),
    navigate: (path) => this._navigate(path),
    openSheet: (route) => this._navigate(route),
    closeSheet: () => this._closeRoute(),
    performAction: (action) => {
      void performAction(this._hass!, action, this._config).catch(
        (error: Error) => {
          this._toast(
            this._t("common.error", {
              message: error?.message || action.action || "",
            }),
          );
        },
      );
    },
    confirm: (text, act) => {
      this._confirm = { text, act };
      this._refreshConfirm();
    },
    toast: (text) => this._toast(text),
    setAtmo: (mode) => this._setAtmo(mode),
  };

  private _resolveUpdate!: () => void;
  private _language: Language;
  private _built = false;
  private _route: Route = { base: "hjem", sub: null };
  private _scrub: number | null = null;
  private _scrubTimer: ReturnType<typeof setTimeout> | null = null;
  private _clockTimer: ReturnType<typeof setInterval> | null = null;
  private _toastTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastFocus: HTMLElement | null = null;
  private _sheetBuiltFor = "";
  private _sheetEl: ArcusSheetsElement | null = null;
  private _graphTips: { destroy(): void } | null = null;
  private _atmoMode: AtmosphereSetting = "auto";
  private _reduced = false;
  private _listeners = false;
  private _weather: WeatherForecastDay[] | null = null;
  private _drag: { y: number; sheet: HTMLElement; dy?: number } | null = null;
  private _configSignature: string;
  private _reactRoot: Root | null = null;
  private _reactContainer: HTMLElement | null = null;
  private _renderFrame: number | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._config = normalizeConfig({});
    this._configSignature = configSignature(this._config);
    this._language = resolveLanguage(undefined, this._config);
    this._t = createTranslator(this._language);
    this._history = new HistoryCache(
      {
        callWS: (message) =>
          this._hass
            ? this._hass.callWS(message)
            : Promise.reject(new Error("Arcus: hass is not set")),
        callApi: (method, path, data) =>
          this._hass
            ? this._hass.callApi(method, path, data)
            : Promise.reject(new Error("Arcus: hass is not set")),
      },
      () => this._now(),
    );
    this.updateComplete = new Promise<void>((resolve) => {
      this._resolveUpdate = resolve;
    });
  }

  setConfig(config: unknown): void {
    const next = normalizeConfig(config);
    const signature = configSignature(next);
    const changed = signature !== this._configSignature;

    if (next.weather !== this._config.weather) this._weather = null;
    this._config = next;
    this._configSignature = signature;
    this._language = resolveLanguage(this._hass?.language, next);
    this._t = createTranslator(this._language);
    if (this._hass) {
      this._model = buildModel(this._hass, next, this._now());
    }

    if (this._built) {
      if (changed) this._build();
      else this._schedule();
    }
  }

  get hass(): ArcusHass | null {
    return this._hass;
  }

  set hass(hass: ArcusHass) {
    if (!hass) return;

    const previous = this._hass;
    const first = !previous;
    const registryChanged =
      !!previous &&
      (hass.areas !== previous.areas ||
        hass.devices !== previous.devices ||
        hass.entities !== previous.entities);

    this._hass = hass;
    this._language = resolveLanguage(hass.language, this._config);
    this._t = createTranslator(this._language);
    this._model = buildModel(hass, this._config, this._now());

    if (first) {
      this._firstHass();
      return;
    }

    if (this._built) {
      if (registryChanged) this._build();
      else this._schedule();
    }
  }

  /** The imperative action bridge consumed by the React provider. */
  get actions(): ArcusActions {
    return this._actions;
  }

  connectedCallback(): void {
    this._reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
    if (this._hass && (!this._built || !this._reactRoot)) this._build();
    this._addListeners();
    if (this._built) this._startClock();
  }

  disconnectedCallback(): void {
    this._removeListeners();
    if (this._clockTimer) clearInterval(this._clockTimer);
    if (this._scrubTimer) clearTimeout(this._scrubTimer);
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._unmountReact();
  }

  getCardSize(): number {
    return 50;
  }

  getGridOptions(): {
    columns: string;
    rows: string;
    min_rows: number;
  } {
    return { columns: "full", rows: "full", min_rows: 8 };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("arcus-config-editor");
  }

  static getStubConfig(): { type: string } {
    return { type: "custom:arcus-card" };
  }

  private _markReady(): void {
    this._resolveUpdate();
  }

  _now(): Date {
    const pinned =
      typeof window !== "undefined" ? window.__HJEM_NOW : undefined;
    return pinned instanceof Date ? new Date(pinned.getTime()) : new Date();
  }

  private _locale(): string {
    return this._language === "da" ? "da-DK" : "en-GB";
  }

  private _firstHass(): void {
    try {
      const saved = localStorage.getItem("arcus-atmo");
      if (
        saved === "auto" ||
        saved === "night" ||
        saved === "dawn" ||
        saved === "day" ||
        saved === "dusk"
      ) {
        this._atmoMode = saved;
      }
    } catch {
      /* localStorage can be unavailable in private modes. */
    }
    if (this.isConnected && !this._built) this._build();
  }

  private _themeDark(): boolean {
    const forced = this._config.appearance;
    if (forced === "dark") return true;
    if (forced === "light") return false;
    const dark = this._hass?.themes?.darkMode;
    return dark === undefined ? true : Boolean(dark);
  }

  private _solarPhase(): AtmosphereSetting {
    const sun = this._hass?.states?.["sun.sun"];
    const elevation = sun?.attributes?.elevation;
    if (typeof elevation === "number") {
      if (elevation > 6) return "day";
      if (elevation > -6) return sun?.attributes?.rising ? "dawn" : "dusk";
      return "night";
    }
    const now = this._now();
    const hour = now.getHours() + now.getMinutes() / 60;
    if (hour < 5 || hour >= 22) return "night";
    if (hour < 9) return "dawn";
    if (hour < 17) return "day";
    return "dusk";
  }

  private _atmo(): AtmosphereSetting {
    const forced = this._config.atmosphere;
    if (forced && forced !== "auto") return forced;
    if (this._atmoMode !== "auto") return this._atmoMode;
    return this._solarPhase();
  }

  private _cycleAtmo(): void {
    const order: AtmosphereSetting[] = ["auto", "night", "day"];
    const index = order.indexOf(this._atmoMode);
    this._atmoMode = order[(index + 1) % order.length];
    try {
      localStorage.setItem("arcus-atmo", this._atmoMode);
    } catch {
      /* ignore */
    }
    this._applyAtmo();
  }

  private _setAtmo(mode: AtmosphereSetting): void {
    this._atmoMode = mode;
    try {
      localStorage.setItem("arcus-atmo", mode);
    } catch {
      /* ignore */
    }
    this._applyAtmo();
  }

  private _applyAtmo(): void {
    const app = this._root.querySelector<HTMLElement>(".app");
    if (!app) return;
    const dark = this._themeDark();
    app.dataset.atmo = this._atmo();
    app.dataset.density = this._config.density;
    app.classList.toggle("light", !dark);

    this.dataset.density = this._config.density;
    this.dataset.theme = dark ? "dark" : "light";

    const button = this._root.querySelector<HTMLElement>("[data-atmo-btn]");
    if (button) {
      button.title =
        this._atmoMode === "auto"
          ? this._t("brand.atmosphereAuto")
          : this._t("brand.atmosphereMode", { mode: this._atmoMode });
      button.innerHTML = icon(
        this._atmoMode === "auto"
          ? "spark"
          : this._atmoMode === "night"
            ? "moon"
            : "sun",
      );
    }
  }

  private _personId(): string | undefined {
    const states = this._hass?.states ?? {};
    const ids = Object.keys(states).filter((id) => id.startsWith("person."));
    return ids.find((id) => states[id]?.state === "home") ?? ids[0];
  }

  private _personState(): string | undefined {
    const id = this._personId();
    return id ? this._hass?.states?.[id]?.state : undefined;
  }

  private _personName(): string | undefined {
    const id = this._personId();
    const name = id ? this._hass?.states?.[id]?.attributes?.friendly_name : "";
    return typeof name === "string" && name.trim() ? name.trim() : undefined;
  }

  private _userName(): string {
    const user = this._hass?.user?.name;
    if (user && user.length < 22) return user.split(" ")[0];
    return this._personName() ?? (this._language === "da" ? "hjem" : "home");
  }

  _get(entityId: string | undefined | null) {
    return entityId ? this._hass?.states?.[entityId] : undefined;
  }

  _state(entityId: string | undefined | null): string | undefined {
    return this._get(entityId)?.state;
  }

  _attr(
    entityId: string | undefined | null,
    key: string,
    fallback: unknown = null,
  ): any {
    const attributes = this._get(entityId)?.attributes;
    return attributes && key in attributes ? attributes[key] : fallback;
  }

  _n(
    entityId: string | undefined | null,
    fallback: number | null = null,
  ): number | null {
    const value = Number.parseFloat(String(this._state(entityId) ?? ""));
    return Number.isFinite(value) ? value : fallback;
  }

  _on(entityId: string | undefined | null): boolean {
    const state = this._state(entityId);
    return (
      state === "on" ||
      state === "open" ||
      state === "home" ||
      state === "playing" ||
      state === "heating" ||
      state === "heat"
    );
  }

  _unavail(entityId: string | undefined | null): boolean {
    const state = this._state(entityId);
    return !state || state === "unavailable" || state === "unknown";
  }

  _onText(
    entityId: string | undefined | null,
    on = "Til",
    off = "Fra",
  ): string {
    return this._on(entityId) ? on : off;
  }

  _tempFor(room: HomeModel["rooms"][number]): {
    v: number | null;
    source: string | null;
    fallback: boolean;
  } {
    if (room.temp && !this._unavail(room.temp.entityId)) {
      const value = this._n(room.temp.entityId);
      if (value !== null) {
        return { v: value, source: room.temp.entityId, fallback: false };
      }
    }
    if (room.tempFallback) {
      const value = refNumber(
        room.tempFallback.attributes?.current_temperature,
      );
      if (value !== null) {
        return {
          v: value,
          source: room.tempFallback.entityId,
          fallback: true,
        };
      }
    }
    return { v: null, source: null, fallback: false };
  }

  _indoor(): number | null {
    const values = this._model.rooms
      .filter((room) => room.id !== "skur")
      .map((room) => this._tempFor(room).v)
      .filter((value): value is number => value !== null);
    if (values.length) {
      return values.reduce((total, value) => total + value, 0) / values.length;
    }
    return this._model.ventilation?.temperature ?? null;
  }

  _lightStats(room: HomeModel["rooms"][number]): {
    on: number;
    total: number;
  } | null {
    if (!room.lights.length) return null;
    const stored = (this._model.roomStats ?? {}) as Record<string, RoomStats>;
    if (stored[room.id]) {
      return {
        on: stored[room.id].lightsOn,
        total: stored[room.id].lightsTotal,
      };
    }
    const ids = new Set<string>();
    for (const group of room.lights) {
      if (group.members.length) {
        group.members.forEach((id) => ids.add(id));
      } else {
        ids.add(group.entityId);
      }
      group.extra.forEach((id) => ids.add(id));
    }
    const list = [...ids];
    return { on: list.filter((id) => this._on(id)).length, total: list.length };
  }

  _openingStats(room: HomeModel["rooms"][number]): {
    open: number;
    total: number;
    leak: boolean;
  } | null {
    if (!room.openings.length) return null;
    return {
      open: room.openings.filter((opening) => this._on(opening.id)).length,
      total: room.openings.length,
      leak: this._on(room.leak?.entityId),
    };
  }

  _airFor(room: HomeModel["rooms"][number]): {
    label: string;
    value: string;
    level: "ok" | "mid" | "warn" | "off";
  } {
    const co2 = room.co2 ? this._n(room.co2.entityId) : null;
    if (co2 !== null) {
      return {
        label: this._t("room.air"),
        value: `${Math.round(co2)} ppm`,
        level: co2 > 1000 ? "warn" : co2 > 850 ? "mid" : "ok",
      };
    }
    const humidity = room.humidity ? this._n(room.humidity.entityId) : null;
    if (humidity !== null) {
      return {
        label: this._t("room.humidityShort"),
        value: `${Math.round(humidity)} %`,
        level: humidity > 65 ? "warn" : "ok",
      };
    }
    return { label: this._t("room.air"), value: "–", level: "off" };
  }

  _priceToday(): PriceModel {
    return (
      this._model.price ?? {
        values: [],
        min: 0,
        max: 0,
        now: 0,
      }
    );
  }

  _cheapest(count = 3): {
    start: number;
    end: number;
    avg: number;
    sum?: number;
  } | null {
    const price = this._model.price;
    if (price?.cheapest && count === 3) return price.cheapest;
    const values = price?.values ?? [];
    if (values.length < count) return null;
    const from = Math.max(0, this._now().getHours());
    let best: {
      start: number;
      end: number;
      avg: number;
      sum: number;
    } | null = null;
    for (let start = from; start <= values.length - count; start++) {
      const slice = values.slice(start, start + count);
      const sum = slice.reduce((total, value) => total + value, 0);
      if (!best || sum < best.sum) {
        best = { start, end: start + count, sum, avg: sum / count };
      }
    }
    if (!best) {
      const slice = values.slice(0, count);
      const sum = slice.reduce((total, value) => total + value, 0);
      best = { start: 0, end: count, sum, avg: sum / count };
    }
    return best;
  }

  _solarForecast(): SolarPoint[] {
    return this._model.solar?.forecastSeries ?? [];
  }

  _solarTomorrow(): SolarPoint[] {
    return this._model.solar?.tomorrowSeries ?? [];
  }

  _prayerTimes(): PrayerTimeModel[] {
    return this._model.prayers?.times ?? [];
  }

  _nextPrayer(): PrayerTimeModel | null {
    return this._model.prayers?.next ?? null;
  }

  _alerts() {
    return this._model.alerts;
  }

  _countdown(date: Date | null | undefined): string {
    return countdown(date, this._now(), this._language);
  }

  private _weatherNow(): {
    state: string;
    temp: number | null;
    humidity: number | null;
    wind: number | null;
    pressure: number | null;
    icon: string;
    text: string;
  } {
    const weather = this._model.weather;
    const rawState = weather?.state;
    const state =
      rawState && rawState !== "unavailable" && rawState !== "unknown"
        ? rawState
        : "cloudy";
    const key = `weather.${state}`;
    const localized = this._t(key);
    return {
      state,
      temp: weather?.temp ?? null,
      humidity: weather?.humidity ?? null,
      wind: weather?.wind ?? null,
      pressure: weather?.pressure ?? null,
      icon: weather?.icon || WEATHER_ICON(state),
      text: localized === key ? state : localized,
    };
  }

  private _weatherStripHTML(): string {
    if (!this._config.show_weather_forecast) return "";
    const forecast = this._weather ?? this._model.weather?.forecast ?? [];
    if (!Array.isArray(forecast) || !forecast.length) return "";

    return forecast
      .slice(0, 4)
      .map((day, index) => {
        const date = parseDate(day.datetime);
        const name =
          index === 0
            ? this._t("weather.today")
            : index === 1
              ? this._t("weather.tomorrow")
              : date
                ? new Intl.DateTimeFormat(this._locale(), {
                    weekday: "short",
                  })
                    .format(date)
                    .replace(/\.$/, "")
                : "–";
        const high = Number(day.temperature);
        const low = Number(day.templow);
        return `<span class="wday"><span class="wname">${escapeHtml(
          name,
        )}</span><span class="wico">${icon(
          WEATHER_ICON(day.condition),
        )}</span><span class="wtemps"><b>${
          Number.isFinite(high) ? `${Math.round(high)}°` : "–"
        }</b>${
          Number.isFinite(low) ? `${Math.round(low)}°` : ""
        }</span></span>`;
      })
      .join("");
  }

  private _greeting(): string {
    return greeting(this._now(), this._language);
  }

  private _binds(): Record<string, string> {
    const bindings = buildBindings(this._model, this._config, this._t);
    const now = this._now();
    const weather = this._weatherNow();
    const next = this._nextPrayer();
    const person = this._personState();
    const language = this._language;
    const displayRooms = this._model.rooms.filter((room) => room.id !== "skur");
    const stats = (this._model.roomStats ?? {}) as Record<string, RoomStats>;
    const open = displayRooms.reduce(
      (total, room) => total + (stats[room.id]?.open ?? 0),
      0,
    );
    const lights = (this._model.lightStats ?? { on: 0, total: 0 }) as {
      on: number;
      total: number;
    };
    const roomsMeta = this._t("hero.roomsMeta")
      .replace("{rooms}", String(displayRooms.length))
      .replace("{open}", String(open))
      .replace("{lights}", `<b>${lights.on}</b>`);
    const divider = roomsMeta.indexOf(" · ");

    bindings.roomsMeta =
      divider > 0
        ? `<b>${roomsMeta.slice(0, divider)}</b>${roomsMeta.slice(divider)}`
        : roomsMeta;
    bindings.indoor = formatNumber(this._indoor(), 1, language);
    bindings.clock = formatTime(now, language);
    bindings.date = now.toLocaleDateString(this._locale(), {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const weekday = new Intl.DateTimeFormat(this._locale(), {
      weekday: "long",
    }).format(now);
    bindings.heroDate = `${weekday
      .charAt(0)
      .toLocaleUpperCase()}${weekday.slice(1)} · ${
      language === "da" ? "kl." : "at"
    } ${formatTime(now, language)}`;
    bindings.eyebrow = next
      ? this._t("hero.nextPrayer", {
          name: next.name.toLocaleUpperCase(),
          time: formatTime(next.time, language),
        })
      : this._t("hero.eyebrow");
    bindings.greet = `${this._greeting()}, <em>${escapeHtml(
      this._userName(),
    )}</em>`;
    bindings.person =
      person === "home"
        ? language === "da"
          ? "hjemme"
          : "home"
        : person === "not_home"
          ? language === "da"
            ? "ude"
            : "away"
          : person || "–";
    bindings.weatherTemp =
      weather.temp === null
        ? "–"
        : `${formatNumber(weather.temp, 1, language)}°`;
    bindings.weatherSub = weather.text;
    bindings.weatherStrip = this._weatherStripHTML();
    bindings.version = ARCUS_VERSION;

    if (this._sheetEl?.binds) {
      Object.assign(bindings, this._sheetEl.binds());
    }
    return bindings;
  }

  _build(): void {
    if (!this._hass) return;
    this._unmountReact();
    this._built = true;
    this._sheetEl = null;
    this._root.innerHTML = `<style>${STYLES}</style><div class="arcus-react"></div>`;

    const container = this._root.querySelector<HTMLElement>(".arcus-react");
    if (!container) return;
    container.style.display = "contents";
    this._reactContainer = container;
    this._reactRoot = createRoot(container);
    flushSync(() => this._renderIntoReact());

    this._applyAtmo();
    this._applyRoute(true);
    this._startClock();
    this._refresh();
    void this._loadInitial();
    this._markReady();
  }

  /** Render the current card state into the mounted React root. */
  private _renderIntoReact(): void {
    if (!this._reactRoot || !this._hass) return;
    this._reactRoot.render(
      createElement(ArcusApp, {
        hass: this._hass,
        model: this._model,
        config: this._config,
        t: this._t,
        bindings: this._binds(),
        route: this._route as SheetRoute,
        actions: this.actions,
        history: this._history,
        now: () => this._now(),
        app: this as unknown as SheetApp,
        atmo: this._atmo(),
        dark: this._themeDark(),
        sheetOpen: this._route.base !== "hjem",
      }),
    );
  }

  /** Unmount the React root and cancel any pending batched render. */
  private _unmountReact(): void {
    if (this._renderFrame !== null) {
      cancelAnimationFrame(this._renderFrame);
      this._renderFrame = null;
    }
    const root = this._reactRoot;
    this._reactRoot = null;
    this._reactContainer = null;
    if (root) root.unmount();
  }

  private _applyBindings(bindings: Record<string, string>): void {
    this._root
      .querySelectorAll<HTMLElement>("[data-bind]")
      .forEach((element) => {
        const key = element.dataset.bind;
        if (key && key in bindings) {
          const value = String(bindings[key]);
          if (element.textContent !== value) element.textContent = value;
        }
      });
    this._root
      .querySelectorAll<HTMLElement>("[data-bind-html]")
      .forEach((element) => {
        const key = element.dataset.bindHtml;
        if (key && key in bindings) {
          const value = String(bindings[key]);
          if (element.innerHTML !== value) element.innerHTML = value;
        }
      });
  }

  private _applyState(): void {
    this._root
      .querySelectorAll<HTMLElement>("[data-person-dot]")
      .forEach((element) => {
        element.style.background =
          this._personState() === "home" ? "var(--sage)" : "var(--muted)";
      });

    const weather = this._weatherNow();
    this._root
      .querySelectorAll<HTMLElement>("[data-weather-icon]")
      .forEach((element) => {
        element.innerHTML = icon(weather.icon);
      });

    this._root.querySelectorAll<HTMLElement>("[data-on]").forEach((element) => {
      element.classList.toggle("on", this._on(element.dataset.on));
    });
    this._root
      .querySelectorAll<HTMLElement>("[data-not-off]")
      .forEach((element) => {
        element.classList.toggle(
          "on",
          this._state(element.dataset.notOff) !== "off",
        );
      });
    this._root
      .querySelectorAll<HTMLElement>("[data-open]")
      .forEach((element) => {
        element.classList.toggle("open", this._on(element.dataset.open));
      });
    this._root
      .querySelectorAll<HTMLElement>("[data-warn]")
      .forEach((element) => {
        element.classList.toggle("warn", this._on(element.dataset.warn));
      });
    this._root
      .querySelectorAll<HTMLElement>("[data-batt]")
      .forEach((element) => {
        const value = clamp(this._n(element.dataset.batt, 0) ?? 0, 0, 100);
        const bar = element.querySelector("i");
        if (bar) {
          bar.style.width = `${value}%`;
          bar.className = value < 20 ? "warn" : value < 40 ? "mid" : "";
        }
      });
    this._root
      .querySelectorAll<HTMLElement>("[data-room-open]")
      .forEach((element) => {
        const ids = String(element.dataset.roomOpen || "")
          .split(",")
          .filter(Boolean);
        element.classList.toggle(
          "warn",
          ids.some((id) => this._on(id)),
        );
      });
    this._root
      .querySelectorAll<HTMLElement>("[data-room-lights]")
      .forEach((element) => {
        const ids = String(element.dataset.roomLights || "")
          .split(",")
          .filter(Boolean);
        element.classList.toggle("off", !ids.some((id) => this._on(id)));
      });

    this._root
      .querySelectorAll<HTMLElement>('.seg button[data-act="hvac"]')
      .forEach((element) => {
        element.classList.toggle(
          "active",
          this._state(element.dataset.entity) === element.dataset.mode,
        );
      });
    this._root
      .querySelectorAll<HTMLElement>('.seg button[data-act="fan"]')
      .forEach((element) => {
        const fan = String(this._attr(element.dataset.entity, "fan_mode", ""));
        element.classList.toggle(
          "active",
          fan === String(element.dataset.mode),
        );
      });

    const soc = clamp(this._model.solar?.batterySoc ?? 0, 0, 100);
    this._root
      .querySelectorAll<SVGCircleElement>("[data-battery-ring]")
      .forEach((element) => {
        element.setAttribute(
          "stroke-dashoffset",
          String(100.5 - (soc / 100) * 100.5),
        );
        element.setAttribute(
          "stroke",
          soc < 20 ? "var(--coral)" : soc > 80 ? "var(--sage)" : "var(--brass)",
        );
      });

    this._root
      .querySelectorAll<HTMLInputElement>("[data-range-entity]")
      .forEach((element) => {
        const state = this._get(element.dataset.rangeEntity);
        const on = state?.state === "on";
        const pct = on
          ? Math.round(((state?.attributes?.brightness ?? 0) / 255) * 100)
          : 0;
        if (this._root.activeElement !== element) element.value = String(pct);
        element.style.setProperty("--p", `${pct}%`);
        const label = element
          .closest(".slider-wrap")
          ?.querySelector<HTMLElement>(".pct");
        if (label) {
          label.textContent = on ? `${pct} %` : this._t("lights.sliderOff");
        }
      });
  }

  _refresh(): void {
    if (!this._built || !this._hass) return;
    this._applyAtmo();

    const bindings = this._binds();
    this._applyBindings(bindings);
    this._applyState();

    this._sheetEl?.update?.();
    // The sheet may have rendered new nodes; apply the same flat bindings once
    // more before drawing charts and sparks.
    this._applyBindings(bindings);
    this._applyState();

    this._refreshSparks();
    this._refreshArc();
    this._refreshCharts();
    this._refreshBars();
    this._refreshAlerts();
    this._refreshArt();
    this._refreshClockState();
    this._refreshConfirm();
  }

  private _refreshSparks(): void {
    const now = this._now().getTime();
    this._root
      .querySelectorAll<SVGPathElement>("[data-spark]")
      .forEach((element) => {
        const key = element.dataset.spark;
        if (!key) {
          element.setAttribute("d", "");
          return;
        }
        const values = this._seriesFor(key);
        const svg = element.closest("svg");
        const { h } = this._viewBox(svg, 100, 28);
        element.setAttribute("d", sparkPath(values, 100, h, 1));

        const hasData = values.filter(
          (value): value is number => value !== null && Number.isFinite(value),
        ).length;
        if (hasData < 2) {
          applyGraph(svg ?? element, null);
          return;
        }
        applyGraph(svg ?? element, {
          start: now - 86_400_000,
          end: now,
          unit: key === "price" ? "kr" : key === "solarActual" ? "W" : "°C",
          decimals: key === "price" ? 2 : key === "solarActual" ? 0 : 1,
          series: [{ values }],
        });
      });
  }

  private _viewBox(
    svg: Element | null,
    fallbackWidth: number,
    fallbackHeight: number,
  ): { w: number; h: number } {
    const element = svg as SVGSVGElement | null;
    const box = element?.viewBox?.baseVal;
    if (box && box.width && box.height) {
      return { w: box.width, h: box.height };
    }
    const raw = element?.getAttribute?.("viewBox")?.split(/\s+/).map(Number);
    if (raw && raw.length === 4 && raw[2] && raw[3]) {
      return { w: raw[2], h: raw[3] };
    }
    return { w: fallbackWidth, h: fallbackHeight };
  }

  _series(entityId: string | null | undefined): Array<number | null> {
    if (!entityId) return [];
    return this._history.series(entityId);
  }

  _seriesWindow(
    entityId: string | null | undefined,
    days: number,
  ): Array<number | null> {
    if (!entityId) return [];
    return this._history.window(entityId, days);
  }

  _seriesFor(key: string): Array<number | null> {
    if (key.startsWith("24:")) return this._seriesWindow(key.slice(3), 1);
    if (key === "price") return this._model.price?.values ?? [];
    if (key === "solarForecast")
      return this._solarForecast().map((point) => point.v);
    if (key === "solarTomorrow")
      return this._solarTomorrow().map((point) => point.v);
    if (key === "solar48") {
      return [...this._solarForecast(), ...this._solarTomorrow()].map(
        (point) => point.v,
      );
    }
    if (key === "solarActual") return this._series(this._config.solar?.power);
    if (key === "indoor") {
      return this._series(this._config.ventilation?.temperature);
    }
    if (key === "savings")
      return this._series(this._config.solar?.savingsTotal);
    if (key === "savings30") {
      return this._seriesWindow(this._config.solar?.savingsTotal, 30);
    }
    if (key === "savings365") {
      return this._series(this._config.solar?.savingsTotal);
    }
    if (key === "savingsSolar") {
      return this._series(this._config.solar?.savingsSolar);
    }
    if (key === "savingsBattery") {
      return this._series(this._config.solar?.savingsBattery);
    }
    if (key === "bond") return this._series(this._config.economy?.bond);
    if (key === "techRouter") return this._series(this._config.network?.router);
    if (key === "techGoogle") return this._series(this._config.network?.google);
    if (key === "techCf") {
      return this._series(this._config.network?.cloudflare);
    }
    if (key === "waterFlow") return this._series(this._config.water?.flow);
    if (key.startsWith("roomTemp:")) {
      const room = this._model.rooms.find(
        (item) => item.id === key.split(":")[1],
      );
      return this._series(room?.temp?.entityId);
    }
    return this._series(key);
  }

  private _refreshArc(): void {
    const arc = this._root.querySelector<HTMLElement>("[data-arc]");
    if (!arc) return;

    const fraction = dayFraction(this._now());
    const point = arcPoint(fraction);
    const full = "M40,210 Q500,-90 960,210";
    this._root
      .querySelectorAll<SVGPathElement>("[data-arc-line],[data-arc-past]")
      .forEach((element) => element.setAttribute("d", full));

    const clip = this._root.querySelector<SVGRectElement>("[data-past-clip]");
    if (clip) clip.setAttribute("width", String(Math.max(0, point.x - 40)));

    const needle = this._root.querySelector<HTMLElement>("[data-now-needle]");
    if (needle) needle.style.left = `${point.x / 10}%`;
    for (const selector of [
      "[data-now-bead]",
      "[data-arc-glow]",
      "[data-orb]",
    ]) {
      const element = this._root.querySelector<HTMLElement>(selector);
      if (!element) continue;
      element.style.left = `${point.x / 10}%`;
      element.style.top = `${point.y / 3}%`;
    }

    const solar = this._solarForecast();
    const actual = this._series(this._config.solar?.power);
    const max = Math.max(
      3000,
      ...solar.map((item) => item.v),
      ...actual.map((value) => value ?? 0),
      1,
    );

    if (solar.length) {
      const points = solar.map((item) => {
        const position = arcPoint(dayFraction(item.t));
        return `${position.x.toFixed(1)},${(
          position.y -
          (item.v / max) * 72
        ).toFixed(1)}`;
      });
      this._root
        .querySelector<SVGPathElement>("[data-solar-area]")
        ?.setAttribute("d", `M40,210L${points.join("L")}L960,210Z`);
      this._root
        .querySelector<SVGPathElement>("[data-solar-line]")
        ?.setAttribute("d", `M${points.join("L")}`);
    } else {
      this._root
        .querySelector<SVGPathElement>("[data-solar-area]")
        ?.setAttribute("d", "");
      this._root
        .querySelector<SVGPathElement>("[data-solar-line]")
        ?.setAttribute("d", "");
    }

    if (actual.length) {
      const points = actual
        .map((value, index) => {
          const progress = (index + 1) / actual.length;
          if (progress > fraction) return null;
          const position = arcPoint(progress);
          return `${position.x.toFixed(1)},${(
            position.y -
            ((value ?? 0) / max) * 72
          ).toFixed(1)}`;
        })
        .filter((value): value is string => value !== null);
      this._root
        .querySelector<SVGPathElement>("[data-solar-actual]")
        ?.setAttribute("d", points.length ? `M${points.join("L")}` : "");
    } else {
      this._root
        .querySelector<SVGPathElement>("[data-solar-actual]")
        ?.setAttribute("d", "");
    }

    const price = this._priceToday();
    const segments = this._root.querySelector<SVGGElement>("[data-prices]");
    if (segments) {
      if (!price.values.length) {
        segments.innerHTML = "";
      } else {
        let html = "";
        const hour = this._now().getHours();
        for (let index = 0; index < 24; index++) {
          const start = arcPoint(index / 24);
          const end = arcPoint((index + 1) / 24);
          const color = priceColor(price.values[index], price.min, price.max);
          html += `<line x1="${start.x}" y1="${start.y + 9}" x2="${
            end.x
          }" y2="${end.y + 9}" stroke="${color}" stroke-width="${
            index === hour ? 7 : 4.5
          }" opacity="${index === hour ? 1 : 0.72}" stroke-linecap="butt"/>`;
        }
        segments.innerHTML = html;
      }
    }

    const times = this._prayerTimes();
    const next = this._nextPrayer();
    const sunrise = this._model.prayers?.sunrise ?? null;
    const marks = this._root.querySelector<SVGGElement>("[data-prayer-marks]");
    if (marks) {
      marks.innerHTML = times
        .map((prayer) => {
          const position = arcPoint(prayer.minutes / 1440);
          return `<line x1="${position.x}" y1="${position.y - 6}" x2="${
            position.x
          }" y2="${position.y + 6}" stroke="var(--muted)" stroke-width="1" opacity=".6"/><circle cx="${
            position.x
          }" cy="${position.y}" r="2.2" fill="${
            next && next.id === prayer.id ? "var(--accent)" : "var(--text-2)"
          }"/>`;
        })
        .join("");
    }

    const labels = this._root.querySelector<HTMLElement>("[data-arc-labels]");
    if (labels) {
      let html = "";
      if (sunrise) {
        const position = arcPoint(dayFraction(sunrise));
        html += `<span class="arc-label sun" style="left:${
          position.x / 10
        }%;top:${(position.y / 300) * 100 + 5}%">${escapeHtml(
          this._t("prayers.sunrise"),
        )}<span class="t">${formatTime(sunrise, this._language)}</span></span>`;
      }
      times.forEach((prayer, index) => {
        const position = arcPoint(prayer.minutes / 1440);
        const isNext = next && next.id === prayer.id;
        html += `<span class="arc-label${isNext ? " next" : ""}" style="left:${
          position.x / 10
        }%;top:${(position.y / 300) * 100 + (index % 2 ? 9 : 5)}%">${escapeHtml(
          prayer.name,
        )}<span class="t">${formatTime(
          prayer.time,
          this._language,
        )}</span></span>`;
      });
      labels.innerHTML = html;
    }
  }

  private _scrubAt(clientX: number): void {
    const arc = this._root.querySelector<HTMLElement>("[data-arc]");
    if (!arc) return;
    const rect = arc.getBoundingClientRect();
    if (!rect.width) return;
    const fraction = clamp((clientX - rect.left) / rect.width, 0, 1);
    this._scrub = fraction;

    const price = this._priceToday();
    if (!price.values.length) return;
    const hour = Math.floor(fraction * 24);
    const value = price.values[Math.min(23, hour)];
    const solar =
      this._solarForecast().find(
        (point) => Math.floor(dayFraction(point.t) * 24) === hour,
      )?.v ?? 0;
    const readout = this._root.querySelector<HTMLElement>("[data-arc-readout]");
    if (readout) {
      readout.innerHTML = `${
        this._language === "da" ? "kl." : "at"
      } ${String(hour).padStart(2, "0")}:00 <span class="sep"></span> <b>${formatPrice(
        value,
        this._language,
      )} kr</b> <span class="sep"></span> ${escapeHtml(
        this._t("solar.legendSolar").toLocaleLowerCase(),
      )} ${formatNumber(solar, 0, this._language)} W`;
      readout.classList.add("show");
    }

    if (this._scrubTimer) clearTimeout(this._scrubTimer);
    this._scrubTimer = setTimeout(() => this._clearScrub(), 2600);
  }

  private _clearScrub(): void {
    this._scrub = null;
    this._root
      .querySelector<HTMLElement>("[data-arc-readout]")
      ?.classList.remove("show");
  }

  private _refreshCharts(): void {
    const svgs = new Set<SVGSVGElement>();
    this._root
      .querySelectorAll<SVGPathElement>("[data-chart-line]")
      .forEach((element) => {
        const svg = element.closest("svg");
        if (svg) svgs.add(svg);
      });

    svgs.forEach((svg) => {
      const paths = [
        ...svg.querySelectorAll<SVGPathElement>("[data-chart-line]"),
      ];
      const { w, h } = this._viewBox(svg, 560, 130);
      const list = paths.map((path) =>
        this._seriesFor(path.dataset.chartLine ?? ""),
      );
      let range: { min: number; max: number } | null = null;
      if (svg.dataset.chartShared === "1") {
        const all = list
          .flat()
          .filter((value): value is number => value !== null);
        if (all.length)
          range = { min: Math.min(...all), max: Math.max(...all) };
      }
      paths.forEach((path, index) => {
        path.setAttribute("d", sparkPath(list[index], w, h, 6, range));
        const area = svg.querySelector<SVGPathElement>(
          `[data-chart-area="${path.dataset.chartLine}"]`,
        );
        if (area) area.setAttribute("d", areaPath(list[index], w, h, 6, range));
      });
      const box = svg.closest(".chart-box");
      if (box)
        box.classList.toggle("no-data", !list.some((item) => item.length));
    });
  }

  private _histTs(row: HistoryRow): number {
    const raw = row.lu ?? row.last_updated ?? row.last_changed ?? row.lc;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw * 1000 : 0;
    if (typeof raw === "string") {
      if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw) * 1000;
      const parsed = Date.parse(raw);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private _refreshBars(): void {
    this._root
      .querySelectorAll<HTMLElement>("[data-bars]")
      .forEach((element) => {
        if (element.dataset.bars !== "solarWeek") return;
        const rows = this._history.raw(this._config.solar?.today ?? "");
        if (!rows.length) {
          element.innerHTML = `<span class="day-empty">${escapeHtml(
            this._t("common.noDataYet"),
          )}</span>`;
          return;
        }

        const byDay = new Map<string, number>();
        rows.forEach((row) => {
          const timestamp = this._histTs(row);
          const value = Number(row.s ?? row.state);
          if (!Number.isFinite(timestamp) || !Number.isFinite(value)) return;
          const date = new Date(timestamp);
          const key = `${date.getFullYear()}-${String(
            date.getMonth() + 1,
          ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          byDay.set(key, Math.max(byDay.get(key) ?? 0, value));
        });

        const days = [...byDay.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-7);
        if (!days.length) {
          element.innerHTML = `<span class="day-empty">${escapeHtml(
            this._t("common.noDataYet"),
          )}</span>`;
          return;
        }

        const max = Math.max(...days.map((day) => day[1]), 1);
        const today = this._now();
        const todayKey = `${today.getFullYear()}-${String(
          today.getMonth() + 1,
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const formatter = new Intl.DateTimeFormat(this._locale(), {
          weekday: "short",
        });
        element.innerHTML = days
          .map(([key, value]) => {
            const date = new Date(`${key}T12:00:00`);
            return `<div class="day${
              key === todayKey ? " today" : ""
            }"><span class="val">${formatNumber(
              value,
              1,
              this._language,
            )}</span><i class="bar" style="height:${Math.max(
              7,
              (value / max) * 74,
            )}%"></i><span class="day-label">${escapeHtml(
              formatter.format(date).replace(/\.$/, ""),
            )}</span></div>`;
          })
          .join("");
      });
  }

  private _refreshAlerts(): void {
    const slot = this._root.querySelector<HTMLElement>("[data-alert-slot]");
    if (!slot) return;
    const alerts = this._model.alerts;
    const pill = this._root.querySelector<HTMLElement>("[data-alert-pill]");
    if (pill) pill.hidden = !alerts.length;

    if (!alerts.length) {
      if (slot.innerHTML) slot.innerHTML = "";
      return;
    }

    const alert = alerts[0];
    const html = `<button class="alert-band" data-nav="${escapeHtml(
      alert.route,
    )}">
      <span>${icon("alert")}</span>
      <span class="alert-text"><b>${escapeHtml(
        alert.title,
      )}.</b> ${escapeHtml(alert.text)}</span>
      ${
        alerts.length > 1
          ? `<span class="alert-count">+${alerts.length - 1}</span>`
          : ""
      }
      <span>${icon("arrow")}</span>
    </button>`;
    if (slot.innerHTML !== html) slot.innerHTML = html;
  }

  _chapterArt(chapter: { key: string }): string {
    return renderChapterArt(chapter.key as ChapterKey, {
      model: this._model,
      config: this._config,
      t: this._t,
      language: this._language,
      history: this._history,
      now: this._now(),
      isOn: (entityId) => this._on(entityId),
    });
  }

  private _refreshArt(): void {
    const keys: ChapterKey[] = [
      "energi",
      "sol",
      "vand",
      "sikkerhed",
      "ventilation",
      "teknik",
      "oekonomi",
      "lys",
      "varme",
      "alarmer",
    ];
    this._root
      .querySelectorAll<HTMLElement>("[data-art]")
      .forEach((element) => {
        const key = element.dataset.art;
        if (!key || !keys.includes(key as ChapterKey)) return;
        const html = this._chapterArt({ key });
        if (element.innerHTML !== html) element.innerHTML = html;
      });

    const count = this._root.querySelector<HTMLElement>(
      '[data-chapter="alarmer"] .big-num',
    );
    if (count) count.textContent = String(this._model.alerts.length);
  }

  private _refreshClockState(): void {
    const element = this._root.querySelector<HTMLElement>(
      "[data-bind='clock']",
    );
    if (element) element.textContent = formatTime(this._now(), this._language);
  }

  private _startClock(): void {
    if (this._clockTimer) clearInterval(this._clockTimer);
    this._clockTimer = setInterval(() => this._refresh(), 20_000);
  }

  private _schedule(): void {
    if (this._renderFrame !== null || !this._built || !this._hass) return;
    const commit = () => {
      this._renderFrame = null;
      if (!this._built || !this._hass) return;
      flushSync(() => this._renderIntoReact());
      // The legacy sheet is still populated imperatively by the card.
      this._refresh();
    };
    this._renderFrame =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame(commit)
        : (setTimeout(commit, 0) as unknown as number);
  }

  private _parseHash(): Route {
    const raw =
      typeof location !== "undefined"
        ? (location.hash || "").replace(/^#\/?/, "")
        : "";
    if (!raw) return { base: "hjem", sub: null };
    const [base, sub] = raw.split("/");
    return { base: base || "hjem", sub: sub || null };
  }

  private _routeKey(): string {
    return `${this._route.base}/${this._route.sub || ""}`;
  }

  _applyRoute(first = false): void {
    const route = this._parseHash();
    const changed =
      route.base !== this._route.base || route.sub !== this._route.sub;
    this._route = route;

    if (route.base === "hjem") {
      this._closeSheet(true);
      return;
    }

    if (changed || first || this._sheetBuiltFor !== this._routeKey()) {
      this._openSheet(route as SheetRoute);
    }
  }

  private _navigate(path: string): void {
    const hash = `#/${path}`;
    if (typeof location === "undefined") return;
    if (location.hash === hash) {
      this._applyRoute(true);
      return;
    }
    location.hash = hash;
  }

  private _raf(callback: () => void): void {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(callback);
    } else {
      setTimeout(callback, 0);
    }
  }

  _openSheet(route: SheetRoute): void {
    const sheet = this._root.querySelector<HTMLElement>("[data-sheet]");
    const scrim = this._root.querySelector<HTMLElement>("[data-scrim]");
    if (!sheet || !scrim) return;

    this._lastFocus =
      (this._root.activeElement as HTMLElement | null) ??
      (document.activeElement as HTMLElement | null);
    const key = this._routeKey();

    const mount = () => {
      if (!sheet.querySelector("[data-sheet-grab]")) {
        sheet.innerHTML = `<div class="sheet-grab" data-sheet-grab></div>`;
      }
      let inner = sheet.querySelector<ArcusSheetsElement>("arcus-sheets");
      if (!inner) {
        inner = document.createElement("arcus-sheets") as ArcusSheetsElement;
        sheet.appendChild(inner);
      }
      inner.app = this;
      inner.route = route;
      this._sheetEl = inner;
      sheet.querySelector<HTMLElement>(".sheet-scroll")?.scrollTo(0, 0);
      this._sheetBuiltFor = key;
      this._refresh();
      this._raf(() => {
        const focus = sheet.querySelector<HTMLElement>("[data-act='close']");
        if (focus && !this._reduced) focus.focus({ preventScroll: true });
      });
    };

    if (customElements.get("arcus-sheets")) {
      mount();
    } else if (typeof customElements.whenDefined === "function") {
      customElements
        .whenDefined("arcus-sheets")
        .then(() => {
          if (this._routeKey() === key) mount();
        })
        .catch(() => {
          /* The sheet element is optional until the sheets bundle lands. */
        });
    }

    this._raf(() => {
      scrim.classList.add("open");
      sheet.classList.add("open");
    });
  }

  _closeSheet(instant = false): void {
    const sheet = this._root.querySelector<HTMLElement>("[data-sheet]");
    const scrim = this._root.querySelector<HTMLElement>("[data-scrim]");
    if (!sheet || !scrim) return;

    if (!sheet.classList.contains("open")) {
      if (instant) {
        sheet.classList.remove("open");
        scrim.classList.remove("open");
        this._sheetBuiltFor = "";
        this._sheetEl = null;
      }
      return;
    }

    sheet.classList.remove("open");
    scrim.classList.remove("open");
    this._sheetBuiltFor = "";
    this._sheetEl = null;
    if (this._lastFocus?.focus) {
      try {
        this._lastFocus.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }
  }

  _closeRoute(): void {
    if (
      typeof location !== "undefined" &&
      location.hash &&
      location.hash !== "#/"
    ) {
      location.replace("#/");
    } else {
      this._closeSheet();
      this._route = { base: "hjem", sub: null };
    }
  }

  _sheetHeader(kicker: string, title: string, sum: string): string {
    return `<div class="sheet-head">
      <div class="sheet-kicker">${escapeHtml(kicker)}</div>
      <h2 class="sheet-title">${escapeHtml(title)}</h2>
      <div class="sheet-sum" data-bind="sheet_sum">${sum}</div>
      <button class="sheet-close" data-act="close" aria-label="${escapeHtml(
        this._t("sheet.close"),
      )}">${icon("close")}</button>
    </div>`;
  }

  _sheetTabs(
    tabs: Array<{ key: string; label: string; route: string }>,
    active: string,
  ): string {
    return `<div class="sheet-tabs">${tabs
      .map(
        (tab) =>
          `<button class="tab${
            tab.key === active ? " active" : ""
          }" data-nav="${escapeHtml(tab.route)}">${escapeHtml(
            tab.label,
          )}</button>`,
      )
      .join("")}</div>`;
  }

  private _historyIds(): string[] {
    const ids = new Set<string>();
    const add = (id: string | null | undefined) => {
      if (typeof id === "string" && id) ids.add(id);
    };

    for (const room of this._model.rooms) {
      add(room.temp?.entityId);
      add(room.tempFallback?.entityId);
      add(room.humidity?.entityId);
      add(room.co2?.entityId);
      add(room.pm25?.entityId);
    }

    const solar = this._config.solar;
    add(solar?.power);
    add(solar?.today);
    add(solar?.batterySoc);
    add(solar?.load);
    add(solar?.grid);
    add(solar?.batteryPower);
    add(solar?.savingsTotal);
    add(solar?.savingsSolar);
    add(solar?.savingsBattery);

    add(this._config.ventilation?.temperature);
    add(this._config.ventilation?.humidity);
    add(this._config.ventilation?.step);
    add(this._config.water?.flow);
    add(this._config.network?.router);
    add(this._config.network?.google);
    add(this._config.network?.cloudflare);
    add(this._config.economy?.bond);

    return [...ids];
  }

  async _ensureHistory(
    ids: Array<string | null | undefined>,
    hours = 24,
  ): Promise<void> {
    const clean = [
      ...new Set(
        ids.filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        ),
      ),
    ];
    if (!clean.length) return;
    await this._history.ensure(clean, hours);
    this._schedule();
  }

  async _loadInitial(): Promise<void> {
    void this._loadWeather();
    await this._ensureHistory(this._historyIds(), 24);
    this._schedule();
  }

  async _loadWeather(): Promise<void> {
    if (!this._config.weather || !this._hass) return;
    this._weather = null;
    const entityId = this._config.weather;
    try {
      const response = await this._hass.callApi(
        "POST",
        "services/weather/get_forecasts?return_response",
        { entity_id: entityId, type: "daily" },
      );
      const forecast =
        response?.service_response?.[entityId]?.forecast ?? response?.forecast;
      if (Array.isArray(forecast)) this._weather = forecast;
    } catch {
      const fallback =
        this._model.weather?.forecast ??
        this._hass.states?.[entityId]?.attributes?.forecast;
      if (Array.isArray(fallback)) this._weather = fallback;
    }
    this._schedule();
  }

  private _addListeners(): void {
    if (this._listeners) return;
    this._listeners = true;

    this._onHash = () => this._applyRoute();
    window.addEventListener("hashchange", this._onHash);

    this._onKey = (event: Event) => {
      const key = (event as KeyboardEvent).key;
      if (key === "Escape") this._closeRoute();
      if (key === "Tab") this._trapFocus(event as KeyboardEvent);
    };
    this._root.addEventListener("keydown", this._onKey);

    this._onClick = (event: Event) => this._click(event);
    this._root.addEventListener("click", this._onClick);

    this._onInput = (event: Event) => this._input(event);
    this._root.addEventListener("input", this._onInput);

    this._onChange = (event: Event) => this._change(event);
    this._root.addEventListener("change", this._onChange);

    this._onPointerMove = (event: Event) => {
      const pointer = event as PointerEvent;
      const target = event.target as Element | null;
      const arc = target?.closest?.("[data-arc]");
      if (arc && (pointer.pointerType === "mouse" || pointer.buttons)) {
        this._scrubAt(pointer.clientX);
      }
    };
    this._root.addEventListener("pointermove", this._onPointerMove);

    this._onPointerDown = (event: Event) => {
      const pointer = event as PointerEvent;
      const target = event.target as Element | null;
      if (target?.closest?.("[data-arc]")) this._scrubAt(pointer.clientX);
      if (target?.closest?.("[data-sheet-grab]")) this._dragStart(pointer);
    };
    this._root.addEventListener("pointerdown", this._onPointerDown);

    this._onPointerUp = () => {
      if (this._drag) this._dragEnd();
    };
    window.addEventListener("pointerup", this._onPointerUp);

    this._graphTips = mountGraphTips(this._root, () => this._language);
  }

  private _removeListeners(): void {
    if (!this._listeners) return;
    this._listeners = false;
    window.removeEventListener("hashchange", this._onHash);
    this._root.removeEventListener("keydown", this._onKey);
    this._root.removeEventListener("click", this._onClick);
    this._root.removeEventListener("input", this._onInput);
    this._root.removeEventListener("change", this._onChange);
    this._root.removeEventListener("pointermove", this._onPointerMove);
    this._root.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointerup", this._onPointerUp);
    this._graphTips?.destroy();
    this._graphTips = null;
  }

  private _onHash!: () => void;
  private _onKey!: (event: Event) => void;
  private _onClick!: (event: Event) => void;
  private _onInput!: (event: Event) => void;
  private _onChange!: (event: Event) => void;
  private _onPointerMove!: (event: Event) => void;
  private _onPointerDown!: (event: Event) => void;
  private _onPointerUp!: () => void;

  private _trapFocus(event: KeyboardEvent): void {
    const sheet = this._root.querySelector<HTMLElement>("[data-sheet].open");
    if (!sheet) return;
    const focusables = [
      ...sheet.querySelectorAll<HTMLElement>(
        "button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])",
      ),
    ].filter(
      (element) =>
        !element.hasAttribute("disabled") && element.offsetParent !== null,
    );
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && this._root.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this._root.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private _click(event: Event): void {
    const target = event.target as Element | null;

    if (target?.closest?.("[data-scrim]")) {
      event.preventDefault();
      this._closeRoute();
      return;
    }

    const nav = target?.closest?.("[data-nav]") as HTMLElement | null;
    if (nav && this._root.contains(nav)) {
      event.preventDefault();
      this._navigate(nav.dataset.nav ?? "hjem");
      return;
    }

    const action = target?.closest?.("[data-act]") as HTMLElement | null;
    if (action && this._root.contains(action)) {
      event.preventDefault();
      this._action(action.dataset.act ?? "", action.dataset, action);
    }
  }

  private _input(event: Event): void {
    const target = event.target as Element | null;

    const range = target?.closest?.(
      "input[data-range-entity]",
    ) as HTMLInputElement | null;
    if (range) {
      const pct = Number(range.value);
      range.style.setProperty("--p", `${pct}%`);
      const label = range
        .closest(".slider-wrap")
        ?.querySelector<HTMLElement>(".pct");
      if (label) label.textContent = `${pct} %`;
      return;
    }

    const temperature = target?.closest?.(
      "input[data-temp-range]",
    ) as HTMLInputElement | null;
    if (temperature) {
      const label = temperature
        .closest(".slider-wrap")
        ?.querySelector<HTMLElement>(".pct");
      if (label) label.textContent = `${temperature.value}°`;
      temperature.style.setProperty(
        "--p",
        `${((Number(temperature.value) - 5) / 30) * 100}%`,
      );
    }
  }

  private _change(event: Event): void {
    const target = event.target as Element | null;

    const range = target?.closest?.(
      "input[data-range-entity]",
    ) as HTMLInputElement | null;
    if (range) {
      const entityId = range.dataset.rangeEntity;
      const pct = Number(range.value);
      if (pct <= 0) {
        this._call("light", "turn_off", {}, { entity_id: entityId });
      } else {
        this._call(
          "light",
          "turn_on",
          { brightness_pct: pct },
          { entity_id: entityId },
        );
      }
      return;
    }

    const temperature = target?.closest?.(
      "input[data-temp-range]",
    ) as HTMLInputElement | null;
    if (temperature) {
      this._call(
        "climate",
        "set_temperature",
        { temperature: Number(temperature.value) },
        { entity_id: temperature.dataset.tempRange },
      );
      return;
    }

    const select = target?.closest?.(
      "select[data-select-entity]",
    ) as HTMLSelectElement | null;
    if (select) {
      this._call(
        "select",
        "select_option",
        { option: select.value },
        { entity_id: select.dataset.selectEntity },
      );
    }
  }

  private _action(
    act: string,
    data: DOMStringMap,
    _element?: HTMLElement,
  ): void {
    if (act === "close") return this._closeRoute();
    if (act === "atmo") return this._cycleAtmo();

    if (act === "toggle-light") {
      return this._call("light", "toggle", {}, { entity_id: data.entity });
    }
    if (act === "toggle-switch") {
      return this._call("switch", "toggle", {}, { entity_id: data.entity });
    }
    if (act === "toggle-bool") {
      return this._call(
        "input_boolean",
        "toggle",
        {},
        {
          entity_id: data.entity,
        },
      );
    }
    if (act === "press") {
      return this._call(
        "input_button",
        "press",
        {},
        {
          entity_id: data.entity,
        },
      );
    }
    if (act === "press-button") {
      return this._call("button", "press", {}, { entity_id: data.entity });
    }

    if (act === "temp-step" || act === "input-step" || act === "number-step") {
      const entityId = data.entity;
      const direction = Number(data.dir || 1);
      const step = Number(data.step || 0.5);
      const isClimate = act === "temp-step";
      const current = isClimate
        ? refNumber(this._attr(entityId, "temperature"))
        : this._n(entityId);
      const min = Number(
        this._attr(entityId, isClimate ? "min_temp" : "min", 5),
      );
      const max = Number(
        this._attr(entityId, isClimate ? "max_temp" : "max", 35),
      );
      if (current === null || !Number.isFinite(current)) return;
      const next = clamp(current + direction * step, min, max);
      if (isClimate) {
        return this._call(
          "climate",
          "set_temperature",
          { temperature: next },
          { entity_id: entityId },
        );
      }
      if (act === "input-step") {
        return this._call(
          "input_number",
          "set_value",
          { value: next },
          { entity_id: entityId },
        );
      }
      return this._call(
        "number",
        "set_value",
        { value: next },
        { entity_id: entityId },
      );
    }

    if (act === "temp-up" || act === "temp-down") {
      const entityId = data.entity;
      const current = refNumber(this._attr(entityId, "temperature"));
      const step = Number(data.step || 0.5);
      const min = Number(this._attr(entityId, "min_temp", 5));
      const max = Number(this._attr(entityId, "max_temp", 35));
      if (current === null || !Number.isFinite(current)) return;
      const next = clamp(
        current + (act === "temp-up" ? step : -step),
        min,
        max,
      );
      return this._call(
        "climate",
        "set_temperature",
        { temperature: next },
        { entity_id: entityId },
      );
    }

    if (act === "hvac-toggle") {
      const entityId = data.entity;
      const mode = this._state(entityId) === "off" ? "heat" : "off";
      return this._call(
        "climate",
        "set_hvac_mode",
        { hvac_mode: mode },
        { entity_id: entityId },
      );
    }
    if (act === "hvac") {
      return this._call(
        "climate",
        "set_hvac_mode",
        { hvac_mode: data.mode },
        { entity_id: data.entity },
      );
    }
    if (act === "fan") {
      return this._call(
        "climate",
        "set_fan_mode",
        { fan_mode: data.mode },
        { entity_id: data.entity },
      );
    }

    if (act === "sluk-alt") {
      this._confirm = {
        text: this._t("confirm.allLights"),
        act: "sluk-alt-go",
      };
      this._refreshConfirm();
      return;
    }
    if (act === "sluk-alt-go") {
      this._confirm = null;
      const areas = this._allLightAreas();
      const ids = this._allLightIds();
      if (areas.length) {
        this._call("light", "turn_off", {}, { area_id: areas });
      } else if (ids.length) {
        this._call("light", "turn_off", {}, { entity_id: ids });
      }
      this._refreshConfirm();
      return;
    }
    if (act === "cancel-confirm") {
      this._confirm = null;
      this._refreshConfirm();
      return;
    }

    if (act === "set-number" || act === "set-input-number") {
      const entityId = data.entity;
      const current = this._n(entityId, 0) ?? 0;
      const step = Number(data.step || 1);
      const min = Number(this._attr(entityId, "min", 0));
      const max = Number(this._attr(entityId, "max", 100));
      const next = clamp(current + Number(data.dir || 1) * step, min, max);
      return this._call(
        act === "set-number" ? "number" : "input_number",
        "set_value",
        { value: next },
        { entity_id: entityId },
      );
    }

    if (act === "select") {
      return this._call(
        "select",
        "select_option",
        { option: data.option },
        { entity_id: data.entity },
      );
    }
    if (act === "media-toggle") {
      return this._call(
        "media_player",
        "media_play_pause",
        {},
        { entity_id: data.entity },
      );
    }

    if (act === "map") {
      try {
        window.history.pushState(null, "", "/map");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(
        new CustomEvent("location-changed", {
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }
    if (act === "helios") {
      const path =
        this._config.solar?.heliosPath ?? "/nyt-overblik/solceller-helios";
      try {
        window.history.pushState(null, "", path);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(
        new CustomEvent("location-changed", {
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }
    if (act === "scroll-top") {
      this._root
        .querySelector<HTMLElement>(".scroll")
        ?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (act === "quick") {
      this._quick(Number(data.quick));
    }
  }

  private _quick(index: number): void {
    const quick = this._config.quick_actions[index];
    if (!quick || !this._hass) return;

    let action: ActionConfig = { ...quick.action };
    const entityId = firstEntityId(quick.entity) ?? firstEntityId(action);
    if (entityId) {
      if (action.action === "toggle" && !action.target && !action.entity_id) {
        action = { ...action, entity_id: entityId };
      } else if (
        (action.action === "perform-action" ||
          action.action === "call-service") &&
        !action.target &&
        !action.entity_id
      ) {
        action = { ...action, target: { entity_id: entityId } };
      }
    }

    try {
      void performAction(this._hass, action, this._config).catch(
        (error: Error) => {
          this._toast(
            this._t("common.error", {
              message: error?.message || quick.label,
            }),
          );
        },
      );
    } catch (error) {
      this._toast(
        this._t("common.error", {
          message: error instanceof Error ? error.message : quick.label,
        }),
      );
    }
  }

  private _allLightAreas(): string[] {
    const areas = this._model.rooms
      .filter((room) => room.lights.length > 0)
      .map((room) => room.areaId);
    return [...new Set(areas)];
  }

  private _allLightIds(): string[] {
    const ids = new Set<string>();
    for (const group of this._model.lights) {
      if (group.members.length) {
        group.members.forEach((id) => ids.add(id));
      } else {
        ids.add(group.entityId);
      }
      group.extra.forEach((id) => ids.add(id));
    }
    return [...ids];
  }

  _call(
    domain: string,
    service: string,
    data: Record<string, unknown> = {},
    target: Record<string, unknown> = {},
  ): void {
    if (!this._hass?.callService) return;
    this._hass
      .callService(domain, service, data, target)
      .catch((error: Error) => {
        this._toast(
          this._t("common.error", {
            message: error?.message || service,
          }),
        );
      });
  }

  _toast(message: string): void {
    const element = this._root.querySelector<HTMLElement>("[data-toast]");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => element.classList.remove("show"), 3200);
  }

  _refreshConfirm(): void {
    const element = this._root.querySelector<HTMLElement>("[data-confirm]");
    if (!element) return;
    if (!this._confirm) {
      element.innerHTML = "";
      return;
    }
    element.innerHTML = `<div class="confirm"><span class="txt">${escapeHtml(
      this._confirm.text,
    )}</span><button class="btn small" data-act="cancel-confirm">${escapeHtml(
      this._t("confirm.cancel"),
    )}</button><button class="btn small danger" data-act="${escapeHtml(
      this._confirm.act,
    )}">${escapeHtml(this._t("confirm.yesLightOff"))}</button></div>`;
  }

  private _dragStart(event: PointerEvent): void {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(min-width: 900px)")?.matches
    ) {
      return;
    }
    const sheet = this._root.querySelector<HTMLElement>("[data-sheet]");
    if (!sheet) return;

    this._drag = { y: event.clientY, sheet };
    sheet.style.transition = "none";

    const move = (moveEvent: PointerEvent) => {
      if (!this._drag) return;
      const dy = Math.max(0, moveEvent.clientY - this._drag.y);
      sheet.style.transform = `translateY(${dy}px)`;
      this._drag.dy = dy;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      sheet.style.transition = "";
      sheet.style.transform = "";
      if (this._drag?.dy !== undefined && this._drag.dy > 100) {
        this._closeRoute();
      }
      this._drag = null;
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  private _dragEnd(): void {
    /* The drag lifecycle is owned by the listeners in _dragStart. */
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("arcus-card")
) {
  customElements.define("arcus-card", ArcusCard);
}
