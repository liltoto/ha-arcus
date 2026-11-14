import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { performAction } from "./actions";
import { configSignature, normalizeConfig } from "./config";
import { HistoryCache } from "./data/history";
import {
  escapeHtml,
  formatNumber,
  formatPrice,
  formatTime,
  greeting,
} from "./format";
import { createTranslator, resolveLanguage } from "./localize";
import { buildModel } from "./model/build";
import { buildBindings } from "./model/bindings";
import { mountGraphTips } from "./render/graph";
import { icon } from "./render/icons";
import { STYLES } from "./ui/styles";
import { c } from "./ui/styles/classes";
import type {
  ArcusConfig,
  ArcusHass,
  AtmosphereSetting,
  HomeModel,
  Language,
  PrayerTimeModel,
  PriceModel,
  SolarPoint,
  Translator,
  WeatherForecastDay,
} from "./types";
import { ArcusApp } from "./ui/ArcusApp";
import type { ArcusActions } from "./ui/types";
import { ARCUS_VERSION } from "./version";

declare global {
  interface Window {
    /** The dev harness and visual tests pin the clock through this. */
    __HJEM_NOW?: Date;
  }
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
    toast: (text) => this._toast(text),
    setAtmo: (mode) => this._setAtmo(mode),
  };

  private _resolveUpdate!: () => void;
  private _language: Language;
  private _built = false;
  private _route: Route = { base: "hjem", sub: null };
  private _scrubTimer: ReturnType<typeof setTimeout> | null = null;
  private _clockTimer: ReturnType<typeof setInterval> | null = null;
  private _toastTimer: ReturnType<typeof setTimeout> | null = null;
  private _graphTips: { destroy(): void } | null = null;
  private _atmoMode: AtmosphereSetting = "auto";
  private _listeners = false;
  private _weather: WeatherForecastDay[] | null = null;
  private _configSignature: string;
  private _reactRoot: Root | null = null;
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

  _solarForecast(): SolarPoint[] {
    return this._model.solar?.forecastSeries ?? [];
  }

  _nextPrayer(): PrayerTimeModel | null {
    return this._model.prayers?.next ?? null;
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
        return `<span class="${c("wday")}"><span class="wname">${escapeHtml(
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

    return bindings;
  }

  _build(): void {
    if (!this._hass) return;
    this._unmountReact();
    this._built = true;
    this._root.innerHTML = `<style>${STYLES}</style><div class="arcus-react"></div>`;

    const container = this._root.querySelector<HTMLElement>(".arcus-react");
    if (!container) return;
    container.style.display = "contents";
    this._reactRoot = createRoot(container);
    this._route = this._parseHash();
    flushSync(() => this._renderIntoReact());

    this._applyAtmo();
    this._startClock();
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
        route: this._route,
        actions: this.actions,
        history: this._history,
        now: () => this._now(),
        atmo: this._atmo(),
        dark: this._themeDark(),
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
    if (root) root.unmount();
  }

  private _scrubAt(clientX: number): void {
    const arc = this._root.querySelector<HTMLElement>("[data-arc]");
    if (!arc) return;
    const rect = arc.getBoundingClientRect();
    if (!rect.width) return;
    const fraction = clamp((clientX - rect.left) / rect.width, 0, 1);

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
    this._root
      .querySelector<HTMLElement>("[data-arc-readout]")
      ?.classList.remove("show");
  }

  private _startClock(): void {
    if (this._clockTimer) clearInterval(this._clockTimer);
    this._clockTimer = setInterval(() => {
      this._schedule();
      // `ensure` is a TTL check; it only refetches when the cache is stale.
      void this._ensureHistory(this._historyIds(), 24);
    }, 20_000);
  }

  private _schedule(): void {
    if (this._renderFrame !== null || !this._built || !this._hass) return;
    const commit = () => {
      this._renderFrame = null;
      if (!this._built || !this._hass) return;
      flushSync(() => this._renderIntoReact());
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

  _applyRoute(): void {
    this._route = this._parseHash();
    this._schedule();
  }

  private _navigate(path: string): void {
    const hash = `#/${path}`;
    if (typeof location === "undefined") return;
    if (location.hash === hash) {
      this._applyRoute();
      return;
    }
    location.hash = hash;
  }

  _closeRoute(): void {
    if (
      typeof location !== "undefined" &&
      location.hash &&
      location.hash !== "#/"
    ) {
      location.replace("#/");
    }
    this._route = { base: "hjem", sub: null };
    this._schedule();
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
    add(solar?.pv3);
    add(solar?.pv4);
    add(solar?.gridL1);
    add(solar?.gridL2);
    add(solar?.gridL3);
    add(solar?.batteryCharge);
    add(solar?.batteryDischarge);

    for (const zone of this._model.heating) add(zone.entity.entityId);
    for (const zone of this._model.heatingReserve) add(zone.entity.entityId);

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
    };
    this._root.addEventListener("pointerdown", this._onPointerDown);

    this._graphTips = mountGraphTips(this._root, () => this._language);
  }

  private _removeListeners(): void {
    if (!this._listeners) return;
    this._listeners = false;
    window.removeEventListener("hashchange", this._onHash);
    this._root.removeEventListener("pointermove", this._onPointerMove);
    this._root.removeEventListener("pointerdown", this._onPointerDown);
    this._graphTips?.destroy();
    this._graphTips = null;
  }

  private _onHash!: () => void;
  private _onPointerMove!: (event: Event) => void;
  private _onPointerDown!: (event: Event) => void;

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
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("arcus-card")
) {
  customElements.define("arcus-card", ArcusCard);
}
