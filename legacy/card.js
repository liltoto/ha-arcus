import CSS from "./styles.css";
import { normalizeConfig } from "./config.js";
import {
  VERSION,
  FONT_URL,
  PRAYERS,
  SUNRISE_ID,
  LIGHTS,
  ALL_LIGHT_AREAS,
  HEATING,
  HEATING_RESERVE,
  ROOMS,
  SYSTEM_CARDS,
  CHAPTERS,
  NAV_ITEMS,
  icon,
  nowDate,
  clamp,
  fmtNum,
  fmtPrice,
  fmtTime,
  greeting,
  parseTs,
  histTs,
  minutesOfDay,
  dayFrac,
  arcPoint,
  priceColor,
  solarPhase,
  shortRoomName,
  sparkPath,
  areaPath,
  downsample,
  seriesFromHistory,
} from "./data.js";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const WEATHER_ICON = (s) => {
  const x = String(s || "").toLowerCase();
  if (x.includes("rain") || x.includes("pour")) return "rain";
  if (x.includes("snow") || x.includes("hail")) return "snow";
  if (x.includes("lightning")) return "bolt";
  if (x.includes("wind")) return "wind";
  if (x.includes("cloud")) return "cloud";
  if (x.includes("clear") || x.includes("sun")) return "sun";
  if (x.includes("fog")) return "cloud";
  return "cloud";
};

const WEATHER_TEXT = {
  "clear-night": "klart",
  cloudy: "skyet",
  fog: "tåge",
  hail: "hagl",
  lightning: "torden",
  "lightning-rainy": "tordenregn",
  partlycloudy: "delvist skyet",
  pouring: "styrtregn",
  rainy: "regn",
  snowy: "sne",
  "snowy-rainy": "slud",
  sunny: "solrigt",
  windy: "blæsende",
  "windy-variant": "blæsende",
  exceptional: "usædvanligt",
};

const LIGHT_GROUP_IDS = ["light.kokken", "light.bryggers", "light.entre", "light.lille_gang"];
const CURVE_W = 1000;
const CURVE_H = 300;

export export class ArcusCard extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._built = false;
    this._route = { base: "hjem", sub: null };
    this._hist = new Map();
    this._histLoading = new Set();
    this._weather = null;
    this._scrub = null;
    this._scrubTimer = null;
    this._refreshTimer = null;
    this._clockTimer = null;
    this._lastFocus = null;
    this._confirm = null;
    this._toastTimer = null;
    this._pending = new Set();
    this._lastRefresh = 0;
    this._sheetBuiltFor = "";
    this._atmoMode = "auto";
    this._reduced = false;
  }

  setConfig(config) {
    this._config = normalizeConfig(config);
    if (this._built) this._build();
  }

  getCardSize() {
    return 50;
  }

  getGridOptions() {
    return { columns: "full", rows: "full", min_rows: 8 };
  }

  static getConfigElement() {
    return document.createElement("arcus-config-editor");
  }

  static getStubConfig() {
    return { type: "custom:arcus-card" };
  }

  set hass(h) {
    const first = !this._hass;
    this._hass = h;
    if (first) this._firstHass();
    if (this._built) this._schedule();
  }

  connectedCallback() {
    this._reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
    this._injectFonts();
    if (this._hass && !this._built) this._build();
    this._addListeners();
    if (this._built) this._startClock();
  }

  disconnectedCallback() {
    this._removeListeners();
    clearInterval(this._clockTimer);
    clearTimeout(this._refreshTimer);
    clearTimeout(this._scrubTimer);
  }

  _firstHass() {
    if (this._built) return;
    try {
      const saved = localStorage.getItem("arcus-atmo");
      if (saved === "auto" || saved === "night" || saved === "day" || saved === "dawn" || saved === "dusk") {
        this._atmoMode = saved;
      }
    } catch (e) {
      /* ignore */
    }
    if (this.isConnected) this._build();
  }

  _injectFonts() {
    if (typeof document === "undefined" || document.getElementById("arcus-fonts")) return;
    const l = document.createElement("link");
    l.id = "arcus-fonts";
    l.rel = "stylesheet";
    l.href = FONT_URL;
    document.head.appendChild(l);
  }

  _userName() {
    const u = this._hass?.user?.name;
    if (u && u.length < 22) return u.split(" ")[0];
    const p = this._hass?.states?.["person.liltoto"]?.attributes?.friendly_name;
    return p || "hjem";
  }

  _themeDark() {
    const forced = this._config?.appearance;
    if (forced === "dark") return true;
    if (forced === "light") return false;
    const d = this._hass?.themes?.darkMode;
    return d === undefined ? true : Boolean(d);
  }

  _now() {
    return nowDate();
  }

  _atmo() {
    const forced = this._config?.atmosphere;
    if (forced && forced !== "auto") return forced;
    if (this._atmoMode !== "auto") return this._atmoMode;
    return solarPhase(this._hass?.states?.["sun.sun"], this._now());
  }

  _cycleAtmo() {
    const order = ["auto", "night", "day"];
    const i = order.indexOf(this._atmoMode);
    this._atmoMode = order[(i + 1) % order.length];
    try {
      localStorage.setItem("arcus-atmo", this._atmoMode);
    } catch (e) {
      /* ignore */
    }
    this._applyAtmo();
  }

  _applyAtmo() {
    const app = this._root?.querySelector(".app");
    if (!app) return;
    app.dataset.atmo = this._atmo();
    app.dataset.density = this._config?.density || "comfortable";
    app.classList.toggle("light", !this._themeDark());
    const el = this._root.querySelector("[data-atmo-btn]");
    if (el) {
      el.title = this._atmoMode === "auto" ? "Atmosfære: auto" : `Atmosfære: ${this._atmoMode}`;
      el.innerHTML = icon(this._atmoMode === "auto" ? "spark" : this._atmoMode === "night" ? "moon" : "sun");
    }
  }

  /* ---------- data ---------- */
  _get(id) {
    return this._hass?.states?.[id];
  }

  _state(id) {
    return this._get(id)?.state;
  }

  _attr(id, key, fb = null) {
    const v = this._get(id)?.attributes;
    return v && key in v ? v[key] : fb;
  }

  _n(id, fb = null) {
    const v = parseFloat(this._state(id));
    return Number.isFinite(v) ? v : fb;
  }

  _on(id) {
    const s = this._state(id);
    return s === "on" || s === "open" || s === "home" || s === "playing" || s === "heating" || s === "heat";
  }

  _unavail(id) {
    const s = this._state(id);
    return !s || s === "unavailable" || s === "unknown";
  }

  _onText(id, on = "Til", off = "Fra") {
    return this._on(id) ? on : off;
  }

  _tempFor(room) {
    if (room.temp && !this._unavail(room.temp)) {
      const v = this._n(room.temp);
      if (v !== null) return { v, source: room.temp, fallback: false };
    }
    if (room.tempFallback) {
      const t = this._attr(room.tempFallback, "current_temperature");
      if (Number.isFinite(Number(t))) return { v: Number(t), source: room.tempFallback, fallback: true };
    }
    return { v: null, source: null, fallback: false };
  }

  _indoor() {
    const vals = ROOMS.map((r) => this._tempFor(r).v).filter((v) => v !== null);
    if (vals.length) return vals.reduce((a, b) => a + b, 0) / vals.length;
    return this._n("sensor.nilan602_actual_room_temperature");
  }

  _lightStats(room) {
    if (!room.lights?.length) return null;
    const members = room.lights.filter((id) => !LIGHT_GROUP_IDS.includes(id));
    const ids = members.length ? members : room.lights;
    let on = 0;
    ids.forEach((id) => {
      if (this._on(id)) on++;
    });
    return { on, total: ids.length };
  }

  _openingStats(room) {
    if (!room.openings?.length) return null;
    let open = 0;
    let leak = false;
    room.openings.forEach((o) => {
      if (this._on(o.id)) {
        open++;
        if (o.kind === "Lækage") leak = true;
      }
    });
    return { open, total: room.openings.length, leak };
  }

  _airFor(room) {
    const co2 = room.co2 && !this._unavail(room.co2) ? this._n(room.co2) : null;
    if (co2 !== null) {
      return { label: "luft", value: `${Math.round(co2)} ppm`, level: co2 > 1000 ? "warn" : co2 > 850 ? "mid" : "ok" };
    }
    const hum = room.humidity && !this._unavail(room.humidity) ? this._n(room.humidity) : null;
    if (hum !== null) {
      return { label: "fugt", value: `${Math.round(hum)} %`, level: hum > 65 ? "warn" : "ok" };
    }
    return { label: "luft", value: "–", level: "off" };
  }

  _priceToday() {
    const raw = this._attr("sensor.energi_data_service", "raw_today");
    const flat = this._attr("sensor.energi_data_service", "today");
    const nowPrice = this._n("sensor.electricity_total_price") ?? this._n("sensor.energi_data_service");
    let rows = [];
    if (Array.isArray(raw) && raw.length) {
      rows = raw
        .map((r) => ({ h: new Date(r.hour).getHours(), p: Number(r.price) }))
        .filter((r) => Number.isFinite(r.p))
        .sort((a, b) => a.h - b.h);
    }
    if (!rows.length && Array.isArray(flat) && flat.length) {
      rows = flat.map((p, i) => ({ h: i, p: Number(p) })).filter((r) => Number.isFinite(r.p));
    }
    if (!rows.length) {
      const p = nowPrice ?? 0;
      rows = Array.from({ length: 24 }, (_, i) => ({ h: i, p }));
    }
    const cur = rows.find((r) => r.h === this._now().getHours())?.p ?? rows[0].p;
    const offset = Number.isFinite(nowPrice) ? nowPrice - cur : 0;
    const values = Array.from({ length: 24 }, (_, i) => {
      const r = rows.find((x) => x.h === i);
      return (r ? r.p : rows[0].p) + offset;
    });
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { values, min, max, now: values[this._now().getHours()] ?? values[0] };
  }

  _cheapest(n = 3) {
    const { values } = this._priceToday();
    const h = this._now().getHours();
    let best = null;
    for (let i = h; i <= 24 - n; i++) {
      const slice = values.slice(i, i + n);
      const sum = slice.reduce((a, b) => a + b, 0);
      if (!best || sum < best.sum) best = { start: i, end: i + n, sum, avg: sum / n };
    }
    if (!best) {
      const slice = values.slice(0, n);
      best = { start: 0, end: n, sum: slice.reduce((a, b) => a + b, 0), avg: slice.reduce((a, b) => a + b, 0) / n };
    }
    return best;
  }

  _solarForecast() {
    const w = this._attr("sensor.hjem_energy_production_today", "watts");
    if (!w || typeof w !== "object") return [];
    return Object.entries(w)
      .map(([k, v]) => ({ t: new Date(k), v: Number(v) }))
      .filter((x) => !Number.isNaN(x.t.getTime()) && Number.isFinite(x.v))
      .filter((x) => x.t.toDateString() === this._now().toDateString())
      .sort((a, b) => a.t - b.t);
  }

  _solarTomorrow() {
    const w = this._attr("sensor.hjem_energy_production_tomorrow", "watts");
    if (!w || typeof w !== "object") return [];
    return Object.entries(w)
      .map(([k, v]) => ({ t: new Date(k), v: Number(v) }))
      .filter((x) => !Number.isNaN(x.t.getTime()) && Number.isFinite(x.v))
      .sort((a, b) => a.t - b.t);
  }

  _prayerTimes() {
    return PRAYERS.map((p) => {
      const d = parseTs(this._state(p.id));
      return { ...p, d, min: d ? minutesOfDay(d) : null };
    }).filter((p) => p.d);
  }

  _nextPrayer() {
    const now = minutesOfDay(this._now());
    const list = this._prayerTimes();
    const next = list.find((p) => p.min > now);
    if (next) return next;
    return list[0] ? { ...list[0], tomorrow: true } : null;
  }

  _countdown(d) {
    if (!d) return "";
    const now = this._now().getTime();
    let diff = d.getTime() - now;
    if (diff < 0) diff += 86400000;
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `om ${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `om ${h} t ${m} min` : `om ${h} t`;
  }

  _alerts() {
    const out = [];
    const leak1 = this._on("binary_sensor.klippbok_water_leak_sensor_water_leak");
    const leak2 = this._on("binary_sensor.klippbok_water_leak_sensor_water_leak_2");
    if (leak1) out.push({ sev: 3, key: "leak1", title: "Vandlækage i køkkenet", text: "KLIPPBOK har registreret vand. Tjek under vasken.", route: "rum/kokken" });
    if (leak2) out.push({ sev: 3, key: "leak2", title: "Vandlækage i bryggers", text: "KLIPPBOK i bryggers har registreret vand.", route: "rum/bryggers" });
    const win = this._n("sensor.windows");
    if (win > 0) out.push({ sev: 2, key: "windows", title: `${win} vindue${win === 1 ? "" : "r"} står åbent`, text: "Luk dem, hvis varmen skal holdes inde.", route: "sikkerhed" });
    const filter = this._state("sensor.nilan602_air_filter_alarm_status");
    if (filter && filter !== "OK" && filter !== "Nej" && filter !== "Neutral") {
      out.push({ sev: 2, key: "nilanfilter", title: "Nilan vil have nyt filter", text: `Status: ${filter}. Filterskift anbefales.`, route: "ventilation" });
    }
    if (this._on("binary_sensor.192_168_110_242_kraever_filterrensning")) {
      out.push({ sev: 2, key: "hoodfilter", title: "Emhætten trænger til filterrens", text: "Filteralarmen er slået til i køkkenet.", route: "rum/kokken" });
    }
    const bwt = this._state("sensor.bwt_perla_state");
    if (bwt && bwt !== "OK") out.push({ sev: 3, key: "bwt", title: `BWT melder ${bwt.toLowerCase()}`, text: "Tjek vandbehandleren i bryggers.", route: "vand" });
    const salt = this._n("sensor.bwt_perla_regenerativ_level");
    if (salt !== null && salt < 15) out.push({ sev: 2, key: "salt", title: "Salt er ved at være lavt", text: `Kun ${Math.round(salt)} % tilbage i BWT.`, route: "vand" });
    const soc = this._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc");
    if (soc !== null && soc < 15) out.push({ sev: 1, key: "battery", title: "Batteriet er lavt", text: `Batteriet står på ${Math.round(soc)} %.`, route: "sol" });
    const router = this._state("binary_sensor.192_168_110_1");
    if (router === "off" || router === "unavailable") out.push({ sev: 2, key: "router", title: "Routeren svarer ikke", text: "Netværket kan være nede.", route: "teknik" });
    const cf = this._n("sensor.1_1_1_1_packet_loss");
    if (cf !== null && cf >= 100) out.push({ sev: 1, key: "cf", title: "Cloudflare svarer ikke", text: "1.1.1.1 er utilgængelig lige nu.", route: "teknik" });
    return out.sort((a, b) => b.sev - a.sev);
  }

  _weatherNow() {
    const w = this._get("weather.forecast_hjem");
    return {
      state: w?.state || "cloudy",
      temp: w?.attributes?.temperature ?? this._n("sensor.outdoor_temperature"),
      humidity: w?.attributes?.humidity ?? this._n("sensor.outdoor_humidity"),
      wind: w?.attributes?.wind_speed,
      pressure: w?.attributes?.pressure,
      icon: WEATHER_ICON(w?.state),
      text: WEATHER_TEXT[w?.state] || w?.state || "vejr",
    };
  }

  _weatherStripHTML() {
    if (!Array.isArray(this._weather) || !this._weather.length) return "";
    const days = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
    return this._weather.slice(0, 4).map((d, i) => {
      const dt = parseTs(d.datetime);
      const name = i === 0 ? "I dag" : i === 1 ? "I morgen" : dt ? days[dt.getDay()] : "–";
      const hi = Number(d.temperature);
      const lo = Number(d.templow);
      return `<span class="wday"><span class="wname">${name}</span><span class="wico">${icon(WEATHER_ICON(d.condition))}</span><span class="wtemps"><b>${Number.isFinite(hi) ? Math.round(hi) + "°" : "–"}</b>${Number.isFinite(lo) ? Math.round(lo) + "°" : ""}</span></span>`;
    }).join("");
  }

  _greeting() {
    return greeting(this._now());
  }

  /* ---------- historik ---------- */
  async _ensureHistory(ids, hours = 24, force = false) {
    if (!this._hass?.callWS) return;
    const need = [...new Set(ids)].filter((id) => {
      if (!id || this._histLoading.has(id)) return false;
      const h = this._hist.get(id);
      if (!h) return true;
      if (force || Date.now() - h.t > 5 * 60 * 1000) return true;
      return hours > (h.hours || 0) + 1;
    });
    if (!need.length) return;
    need.forEach((id) => this._histLoading.add(id));
    const end = this._now();
    const start = new Date(end.getTime() - hours * 3600 * 1000);
    try {
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: need,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      this._ingestHistory(res, need, hours);
    } catch (e) {
      try {
        const path = `history/period/${encodeURIComponent(start.toISOString())}?filter_entity_id=${need.join(",")}&minimal_response&no_attributes`;
        const res = await this._hass.callApi("GET", path);
        this._ingestHistory(res, need, hours);
      } catch (e2) {
        /* keep old data */
      }
    } finally {
      need.forEach((id) => this._histLoading.delete(id));
      this._schedule();
    }
  }

  _ingestHistory(res, ids, hours = 24) {
    if (!res) return;
    const put = (id, rows) => {
      if (!id || !Array.isArray(rows)) return;
      const prev = this._hist.get(id);
      if (!prev || hours >= (prev.hours || 0) || Date.now() - prev.t > 5 * 60 * 1000) {
        this._hist.set(id, { t: Date.now(), rows, hours });
      }
    };
    if (Array.isArray(res)) {
      res.forEach((rows, i) => put(ids[i], rows));
    } else if (typeof res === "object") {
      Object.entries(res).forEach(([id, rows]) => put(id, rows));
    }
  }

  _series(id) {
    const h = this._hist.get(id);
    if (!h) return [];
    return downsample(seriesFromHistory(h.rows), 90);
  }

  _seriesFor(key) {
    if (key.startsWith("24:")) return this._seriesWindow(key.slice(3), 1);
    if (key === "price") return this._priceToday().values;
    if (key === "solarForecast") return this._solarForecast().map((x) => x.v);
    if (key === "solarTomorrow") return this._solarTomorrow().map((x) => x.v);
    if (key === "solar48") return [...this._solarForecast(), ...this._solarTomorrow()].map((x) => x.v);
    if (key === "solarActual") return this._seriesWindow("sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower", 1);
    if (key === "indoor") return this._series("sensor.nilan602_actual_room_temperature");
    if (key === "savings") return this._series("sensor.sparet_total");
    if (key === "savings30") return this._seriesWindow("sensor.sparet_total", 30);
    if (key === "savings365") return this._series("sensor.sparet_total");
    if (key === "savingsSolar") return this._series("sensor.sparet_solceller");
    if (key === "savingsBattery") return this._series("sensor.sparet_batteri");
    if (key === "bond") return this._series("sensor.40ndasdro56_kurs");
    if (key === "techRouter") return this._series("sensor.192_168_110_1_round_trip_time_average");
    if (key === "techGoogle") return this._series("sensor.8_8_8_8_round_trip_time_average");
    if (key === "techCf") return this._series("sensor.1_1_1_1_round_trip_time_average");
    if (key === "waterFlow") return this._series("sensor.bwt_perla_current_flow");
    if (key.startsWith("roomTemp:")) {
      const room = ROOMS.find((r) => r.id === key.split(":")[1]);
      if (!room?.temp) return [];
      return this._series(room.temp);
    }
    return this._series(key);
  }

  _seriesWindow(id, days) {
    const h = this._hist.get(id);
    if (!h) return [];
    const cut = Date.now() - days * 86400000;
    const rows = h.rows.filter((r) => histTs(r) >= cut);
    return downsample(seriesFromHistory(rows), 90);
  }

  /* ---------- byg ---------- */
  _build() {
    this._built = true;
    this._root.innerHTML = `<style>${CSS}</style>${this._appHTML()}`;
    this._applyAtmo();
    this._applyRoute(true);
    this._startClock();
    this._refresh();
    this._loadInitial();
  }

  _appHTML() {
    const stars = Array.from({ length: 18 }, (_, i) => {
      const x = [8, 18, 27, 36, 45, 54, 63, 71, 79, 86, 92, 14, 31, 58, 68, 76, 88, 4][i];
      const y = [8, 18, 12, 22, 7, 16, 9, 20, 13, 6, 18, 26, 5, 24, 11, 3, 22, 15][i];
      const d = (i * 0.37).toFixed(2);
      return `<i class="star" style="left:${x}%;top:${y}%;animation-delay:${d}s;opacity:${0.2 + (i % 5) * 0.12}"></i>`;
    }).join("");

    return `
      <div class="app" data-atmo="night">
        <div class="sky"></div>
        <div class="stars">${stars}</div>
        <div class="scroll">
          <header class="topbar">
            <div class="topbar-inner">
              <button class="brand" data-nav="hjem" aria-label="Gå til hjem">
                <span class="brand-mark">${icon("sun")}</span>
                <span><span class="brand-word">${esc((this._config.title || "HJEM").toUpperCase())}</span><span class="brand-sub">${esc((this._config.subtitle || "ARCUS").toUpperCase())}</span></span>
              </button>
              <div class="topbar-date" data-bind="date"></div>
              <div class="topbar-right">
                <span class="pill name"><span class="dot" data-person-dot></span><span data-bind="person">hjemme</span></span>
                <button class="pill warn" data-nav="alarmer" data-alert-pill hidden><span class="dot"></span><span data-bind="alertPill">0</span></button>
                <button class="icon-btn" data-act="atmo" data-atmo-btn title="Atmosfære">${icon("spark")}</button>
                <button class="icon-btn" data-nav="alle" aria-label="Alle lag">${icon("menu")}</button>
              </div>
            </div>
          </header>

          <main class="wrap">
            <section class="hero">
              <div class="hero-top">
                <div>
                  <button class="eyebrow" data-nav="bon" aria-label="Se alle bedetider"><span data-bind="eyebrow">DØGNET LIGE NU</span><span class="eyebrow-arrow">${icon("chevron")}</span></button>
                  <h1 class="greeting" data-bind-html="greet">Godnat, <em>hjem</em></h1>
                  <div class="hero-date" data-bind="heroDate"></div>
                </div>
                <div class="weather">
                  <span class="weather-icon" data-weather-icon>${icon("cloud")}</span>
                  <div>
                    <div class="weather-temp" data-bind="weatherTemp">–</div>
                    <div class="weather-sub" data-bind="weatherSub">–</div>
                  </div>
                </div>
              </div>

              <div class="arc-wrap" data-arc>
                <div class="arc-glow" data-arc-glow></div>
                <div class="orb" data-orb></div>
                <div class="arc-readout" data-arc-readout></div>
                <svg class="arc-svg" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="var(--brass)" stop-opacity=".42"/>
                      <stop offset="1" stop-color="var(--brass)" stop-opacity="0"/>
                    </linearGradient>
                    <clipPath id="pastClip"><rect data-past-clip x="40" y="0" width="0" height="300"/></clipPath>
                  </defs>
                  <path data-arc-line d="" fill="none" stroke="var(--line-strong)" stroke-width="1"/>
                  <path data-arc-past d="" fill="none" stroke="var(--text-2)" stroke-width="1.2" opacity=".7" clip-path="url(#pastClip)"/>
                  <path data-solar-area d="" fill="url(#solarFill)" stroke="none"/>
                  <path data-solar-line d="" fill="none" stroke="var(--amber)" stroke-width="1.4" vector-effect="non-scaling-stroke" opacity=".9"/>
                  <path data-solar-actual d="" fill="none" stroke="var(--text)" stroke-width="1.2" vector-effect="non-scaling-stroke" opacity=".75"/>
                  <g data-prices></g>
                  <g data-prayer-marks></g>
                </svg>
                <div class="now-needle" data-now-needle></div>
                <div class="now-bead" data-now-bead></div>
                <div class="arc-labels" data-arc-labels></div>
                <div class="arc-hours"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
              </div>

              <div class="vitals">
                <button class="vital" data-nav="rum/stue">
                  <div class="vital-label">Inde</div>
                  <div class="vital-value"><span data-bind="indoor">–</span><small>°C</small></div>
                  <div class="vital-sub" data-bind="indoorSub">gennemsnit</div>
                  <svg class="vital-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><path data-spark="indoor" d="" fill="none" stroke="var(--sky)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
                </button>
                <button class="vital" data-nav="energi">
                  <div class="vital-label">Elpris nu</div>
                  <div class="vital-value"><span data-bind="price">–</span><small>kr</small></div>
                  <div class="vital-sub" data-bind="priceSub">pr. kWh</div>
                  <svg class="vital-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><path data-spark="price" d="" fill="none" stroke="var(--brass)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
                </button>
                <button class="vital" data-nav="sol">
                  <div class="vital-label">Batteri</div>
                  <div class="vital-value"><span data-bind="battery">–</span><small>%</small></div>
                  <div class="vital-sub" data-bind="batterySub">ladning</div>
                  <div class="vital-ring">
                    <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--line)" stroke-width="2.5"/><circle data-battery-ring cx="20" cy="20" r="16" fill="none" stroke="var(--sage)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="100.5" stroke-dashoffset="100.5" transform="rotate(-90 20 20)"/></svg>
                  </div>
                </button>
                <button class="vital" data-nav="sol">
                  <div class="vital-label">Sol lige nu</div>
                  <div class="vital-value"><span data-bind="solarNow">–</span><small>W</small></div>
                  <div class="vital-sub" data-bind="solarSub">0 W i dag</div>
                  <svg class="vital-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><path data-spark="solarActual" d="" fill="none" stroke="var(--amber)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
                </button>
              </div>

              <div class="weather-strip" data-bind-html="weatherStrip"></div>
              <div data-alert-slot></div>
            </section>

            <section class="section">
              <div class="section-head">
                <div><div class="kicker">HJEMMET</div><h2>Rum for rum</h2></div>
                <div class="meta" data-bind-html="roomsMeta"></div>
              </div>
              <div class="room-grid">${ROOMS.map((r) => this._roomCard(r)).join("")}${SYSTEM_CARDS.map((s) => this._systemCard(s)).join("")}</div>
            </section>

            <section class="section">
              <div class="section-head">
                <div><div class="kicker">LAGENE</div><h2>Husets kapitler</h2></div>
                <div class="meta">Tryk for detaljer<br><b>alt kan betjenes</b></div>
              </div>
              <div class="chapter-grid">${CHAPTERS.map((c) => this._chapterCard(c)).join("")}</div>
            </section>

            <section class="section">
              <div class="section-head">
                <div><div class="kicker">HURTIGT</div><h2>Et tryk</h2></div>
                <div class="meta">Handlinger<br><b>uden at lede</b></div>
              </div>
              <div class="quick-row">
                <button class="quick" data-act="press" data-entity="input_button.bedtime">${icon("moon")} Sengetid</button>
                <button class="quick" data-act="toggle-bool" data-entity="input_boolean.vacation_mode" data-on="input_boolean.vacation_mode">${icon("car")} Ferietilstand</button>
                <button class="quick" data-act="toggle-bool" data-entity="input_boolean.window_alert_notification" data-on="input_boolean.window_alert_notification">${icon("wind")} Vindue-alarm</button>
                <button class="quick" data-nav="lys">${icon("light")} Lys</button>
                <button class="quick" data-act="map">${icon("map")} Kort</button>
              </div>
            </section>

            <footer class="footer">
              <span class="mark">${icon("sun")} Arcus · <span data-bind="clock"></span></span>
              <span>Home Assistant · <span data-bind="version"></span></span>
            </footer>
          </main>
        </div>
        <div class="scrim" data-scrim></div>
        <section class="sheet" data-sheet role="dialog" aria-modal="true" aria-label="Detaljer"></section>
        <div class="toast" data-toast></div>
      </div>`;
  }

  _roomCard(r) {
    const t = this._tempFor(r);
    const air = this._airFor(r);
    const lights = this._lightStats(r);
    const open = this._openingStats(r);
    return `<button class="room-card${r.wide ? " wide" : ""}" style="--room:${r.tint}" data-nav="rum/${r.id}" data-room="${r.id}">
      <div class="room-top">
        <div><div class="room-name">${esc(r.name)}</div><div class="room-kind">${r.wide ? "Ophold · luft" : "Rum"}</div></div>
        <span class="room-icon">${icon(r.icon)}</span>
      </div>
      <div class="room-main">
        <div class="room-temp${t.v === null ? " off" : ""}" data-bind="r_${r.id}_temp">${t.v === null ? "–" : fmtNum(t.v, 1)}<sup>°</sup></div>
        <div class="room-status">
          <span><i class="sdot ${air.level === "warn" ? "warn" : air.level === "off" ? "off" : ""}"></i><span data-bind="r_${r.id}_air">${esc(air.label)} ${esc(air.value)}</span></span>
          ${lights ? `<span><i class="sdot ${lights.on ? "" : "off"}" data-room-lights="${r.lights.join(",")}"></i><span data-bind="r_${r.id}_lights">${lights.on} / ${lights.total} lys</span></span>` : ""}
          ${open ? `<span><i class="sdot ${open.open || open.leak ? "warn" : "off"}" data-room-open="${r.openings.map((o) => o.id).join(",")}"></i><span data-bind="r_${r.id}_open">${open.leak ? "lækage" : open.open ? `${open.open} åben` : "lukket"}</span></span>` : ""}
        </div>
      </div>
      <svg class="room-spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path data-spark="roomTemp:${r.id}" d="" fill="none" stroke="var(--room)" stroke-width="1.1" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="room-open">åbn rum →</span>
    </button>`;
  }

  _systemCard(s) {
    return `<button class="room-card" style="--room:${s.tint}" data-nav="${s.id === "ventilation" ? "ventilation" : "skur"}" data-system="${s.id}">
      <div class="room-top">
        <div><div class="room-name">${esc(s.name)}</div><div class="room-kind">${s.id === "ventilation" ? "Nilan · luftskifte" : "Ude · klima"}</div></div>
        <span class="room-icon">${icon(s.icon)}</span>
      </div>
      <div class="room-main">
        <div class="room-temp" data-bind="s_${s.id}_temp">–<sup>°</sup></div>
        <div class="room-status">
          <span><i class="sdot" data-sys-dot="${s.id}"></i><span data-bind="s_${s.id}_sub">–</span></span>
        </div>
      </div>
      <svg class="room-spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path data-spark="${s.temp}" d="" fill="none" stroke="var(--room)" stroke-width="1.1" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="room-open">åbn →</span>
    </button>`;
  }

  _chapterCard(c) {
    const art = this._chapterArt(c);
    return `<button class="chapter${c.large ? " large" : ""}" data-nav="${c.route}" data-chapter="${c.key}">
      <div class="ch-top"><span class="num">${c.key === "alarmer" ? "AL" : String(CHAPTERS.indexOf(c) + 1).padStart(2, "0")}</span><span class="ch-icon">${icon(c.icon)}</span></div>
      <h3>${esc(c.title)}</h3>
      <div class="sum" data-bind-html="ch_${c.key}_sum">–</div>
      <div class="ch-art" data-art="${c.key}">${art}</div>
    </button>`;
  }

  _chapterArt(c) {
    if (c.key === "energi") {
      const p = this._priceToday();
      return `<div class="price-bars">${p.values.map((v, i) => `<i style="--bar:${priceColor(v, p.min, p.max)};height:${Math.max(6, ((v - p.min) / (p.max - p.min || 1)) * 100)}%" title="${fmtPrice(v)}"></i>`).join("")}</div>`;
    }
    if (c.key === "sol") {
      const s = this._solarForecast();
      const max = Math.max(3000, ...s.map((x) => x.v), 1);
      const pts = s.map((x) => {
        const t = dayFrac(x.t);
        const { x: px, y } = arcPoint(t, 220, 0, 100, 80);
        return `${px.toFixed(1)},${(y - (x.v / max) * 70).toFixed(1)}`;
      });
      const line = pts.length ? `M${pts.join("L")}` : "";
      const soc = this._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc", 0);
      return `<svg viewBox="0 0 220 110" preserveAspectRatio="none"><path d="${line}L220,100L0,100Z" fill="url(#solarFill)" opacity=".55" stroke="none"/><path d="${line}" fill="none" stroke="var(--amber)" stroke-width="1.2" vector-effect="non-scaling-stroke"/><text x="4" y="96" fill="var(--muted)" font-size="7">BATTERI ${Math.round(soc)} %</text></svg>`;
    }
    if (c.key === "vand") {
      const salt = this._n("sensor.bwt_perla_regenerativ_level", 0);
      return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><rect x="0" y="38" width="220" height="2" fill="var(--line)"/><rect x="0" y="36" width="${(salt / 100) * 220}" height="6" rx="3" fill="var(--sky)" opacity=".8"/><text x="4" y="24" fill="var(--muted)" font-size="8">SALT ${Math.round(salt)} %</text></svg>`;
    }
    if (c.key === "sikkerhed") {
      const all = ROOMS.flatMap((r) => r.openings || []);
      return `<div class="sec-dots">${all.map((o) => `<i class="${this._on(o.id) ? "open" : ""}" title="${esc(o.name)}"></i>`).join("")}</div>`;
    }
    if (c.key === "ventilation") {
      const step = this._n("sensor.nilan602_actual_fan_step", 0);
      return `<div class="zone-strip">${[0, 1, 2, 3, 4].map((i) => `<i style="height:${20 + i * 16}%;opacity:${i <= step ? 0.85 : 0.25}"></i>`).join("")}</div>`;
    }
    if (c.key === "teknik") {
      const v = this._series("sensor.192_168_110_1_round_trip_time_average");
      return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><path d="${sparkPath(v, 220, 52, 2)}" fill="none" stroke="var(--sky)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;
    }
    if (c.key === "oekonomi") {
      const v = this._series("sensor.40ndasdro56_kurs");
      return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><path d="${sparkPath(v, 220, 52, 2)}" fill="none" stroke="var(--brass)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;
    }
    if (c.key === "lys") {
      const ids = LIGHTS.flatMap((g) => g.members || []).concat(["light.192_168_110_242_enhaettelys"]);
      return `<div class="light-dots">${Array.from({ length: 21 }, (_, i) => `<i class="${this._on(ids[i]) ? "on" : ""}"></i>`).join("")}</div>`;
    }
    if (c.key === "varme") {
      return `<div class="zone-strip">${HEATING.map((h) => {
        const cur = this._attr(h.entity, "current_temperature", 0);
        const tar = this._attr(h.entity, "temperature", 20);
        return `<i class="${cur < tar - 0.5 ? "warn" : ""}" style="height:${40 + (cur - 19) * 14}%" title="${esc(h.name)}"></i>`;
      }).join("")}</div>`;
    }
    if (c.key === "alarmer") {
      const a = this._alerts();
      return `<svg viewBox="0 0 220 52" preserveAspectRatio="none"><path d="M0 30 C 20 30, 24 30, 30 30 S 36 12, 44 30 S 52 42, 60 30 S 68 8, 76 30 S 86 36, 94 30 S 104 18, 112 30 S 122 30, 130 30 S 140 10, 148 30 S 158 40, 166 30 S 176 20, 184 30 S 200 30, 220 30" fill="none" stroke="${a.length ? "var(--coral)" : "var(--sage)"}" stroke-width="1.1" opacity=".7"/></svg>`;
    }
    return "";
  }

  /* ---------- bue ---------- */
  _refreshArc() {
    const arc = this._root.querySelector("[data-arc]");
    if (!arc) return;
    const t = dayFrac(this._now());
    const pt = arcPoint(t);
    const full = `M40,210 Q500,-90 960,210`;
    this._root.querySelectorAll("[data-arc-line],[data-arc-past]").forEach((el) => el.setAttribute("d", full));
    const clip = this._root.querySelector("[data-past-clip]");
    if (clip) clip.setAttribute("width", String(Math.max(0, pt.x - 40)));
    const needle = this._root.querySelector("[data-now-needle]");
    if (needle) needle.style.left = `${pt.x / 10}%`;
    const bead = this._root.querySelector("[data-now-bead]");
    if (bead) {
      bead.style.left = `${pt.x / 10}%`;
      bead.style.top = `${pt.y / 3}%`;
    }
    const glow = this._root.querySelector("[data-arc-glow]");
    if (glow) {
      glow.style.left = `${pt.x / 10}%`;
      glow.style.top = `${pt.y / 3}%`;
    }
    const orb = this._root.querySelector("[data-orb]");
    if (orb) {
      orb.style.left = `${pt.x / 10}%`;
      orb.style.top = `${pt.y / 3}%`;
    }

    // solprognose
    const solar = this._solarForecast();
    const actual = this._series("sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower");
    const max = Math.max(3000, ...solar.map((x) => x.v), ...actual.map((v) => v || 0), 1);
    if (solar.length) {
      const pts = solar.map((x) => {
        const tt = dayFrac(x.t);
        const p = arcPoint(tt);
        return `${p.x.toFixed(1)},${(p.y - (x.v / max) * 72).toFixed(1)}`;
      });
      const d = `M40,210L${pts.join("L")}L960,210Z`;
      const line = `M${pts.join("L")}`;
      this._root.querySelector("[data-solar-area]")?.setAttribute("d", d);
      this._root.querySelector("[data-solar-line]")?.setAttribute("d", line);
    } else {
      this._root.querySelector("[data-solar-area]")?.setAttribute("d", "");
      this._root.querySelector("[data-solar-line]")?.setAttribute("d", "");
    }
    if (actual.length) {
      const pts = actual.map((v, i) => {
        const tt = (i + 1) / actual.length;
        if (tt > t) return null;
        const p = arcPoint(tt);
        return `${p.x.toFixed(1)},${(p.y - ((v || 0) / max) * 72).toFixed(1)}`;
      }).filter(Boolean);
      this._root.querySelector("[data-solar-actual]")?.setAttribute("d", pts.length ? `M${pts.join("L")}` : "");
    } else {
      this._root.querySelector("[data-solar-actual]")?.setAttribute("d", "");
    }

    // prisbånd
    const price = this._priceToday();
    const segs = this._root.querySelector("[data-prices]");
    if (segs) {
      let html = "";
      for (let i = 0; i < 24; i++) {
        const a = arcPoint(i / 24);
        const b = arcPoint((i + 1) / 24);
        const c = priceColor(price.values[i], price.min, price.max);
        html += `<line x1="${a.x}" y1="${a.y + 9}" x2="${b.x}" y2="${b.y + 9}" stroke="${c}" stroke-width="${i === this._now().getHours() ? 7 : 4.5}" opacity="${i === this._now().getHours() ? 1 : 0.72}" stroke-linecap="butt"/>`;
      }
      segs.innerHTML = html;
    }

    // bøn & sol
    const times = this._prayerTimes();
    const next = this._nextPrayer();
    const sun = parseTs(this._state(SUNRISE_ID));
    const marks = this._root.querySelector("[data-prayer-marks]");
    if (marks) {
      marks.innerHTML = times.map((p) => {
        const x = arcPoint(p.min / 1440).x;
        const y = arcPoint(p.min / 1440).y;
        return `<line x1="${x}" y1="${y - 6}" x2="${x}" y2="${y + 6}" stroke="var(--muted)" stroke-width="1" opacity=".6"/><circle cx="${x}" cy="${y}" r="2.2" fill="${next && next.id === p.id ? "var(--accent)" : "var(--text-2)"}"/>`;
      }).join("");
    }
    const labels = this._root.querySelector("[data-arc-labels]");
    if (labels) {
      let html = "";
      if (sun) {
        const tt = dayFrac(sun);
        const p = arcPoint(tt);
        html += `<span class="arc-label sun" style="left:${p.x / 10}%;top:${(p.y / 300) * 100 + 5}%">Sol op<span class="t">${fmtTime(sun)}</span></span>`;
      }
      times.forEach((p, i) => {
        const pos = arcPoint(p.min / 1440);
        const isNext = next && next.id === p.id;
        html += `<span class="arc-label${isNext ? " next" : ""}" style="left:${pos.x / 10}%;top:${(pos.y / 300) * 100 + (i % 2 ? 9 : 5)}%">${p.name}<span class="t">${fmtTime(p.d)}</span></span>`;
      });
      labels.innerHTML = html;
    }
  }

  _scrubAt(clientX) {
    const arc = this._root.querySelector("[data-arc]");
    if (!arc) return;
    const rect = arc.getBoundingClientRect();
    const t = clamp((clientX - rect.left) / rect.width, 0, 1);
    this._scrub = t;
    const p = this._priceToday();
    const h = Math.floor(t * 24);
    const price = p.values[Math.min(23, h)];
    const solar = this._solarForecast().find((x) => Math.floor(dayFrac(x.t) * 24) === h)?.v ?? 0;
    const readout = this._root.querySelector("[data-arc-readout]");
    if (readout) {
      readout.innerHTML = `kl. ${String(h).padStart(2, "0")}:00 <span class="sep"></span> <b>${fmtPrice(price)} kr</b> <span class="sep"></span> sol ${fmtNum(solar, 0)} W`;
      readout.classList.add("show");
    }
    clearTimeout(this._scrubTimer);
    this._scrubTimer = setTimeout(() => this._clearScrub(), 2600);
  }

  _clearScrub() {
    this._scrub = null;
    this._root.querySelector("[data-arc-readout]")?.classList.remove("show");
  }

  /* ---------- bånd ---------- */
  _binds() {
    const now = this._now();
    const w = this._weatherNow();
    const price = this._priceToday();
    const next = this._nextPrayer();
    const alerts = this._alerts();
    const indoor = this._indoor();
    const soc = this._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc");
    const pv = this._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower", 0);
    const dayProd = this._n("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production");
    const person = this._state("person.liltoto");
    const b = {
      clock: fmtTime(now),
      date: now.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }),
      heroDate: `${now.toLocaleDateString("da-DK", { weekday: "long" })} · kl. ${fmtTime(now)}`,
      eyebrow: next ? `NÆSTE BØN · ${next.name.toUpperCase()} ${fmtTime(next.d)}` : "DØGNET LIGE NU",
      greet: `${this._greeting()}, <em>${esc(this._userName())}</em>`,
      person: person === "home" ? "hjemme" : person === "not_home" ? "ude" : person || "–",
      weatherTemp: w.temp !== null && w.temp !== undefined ? `${fmtNum(w.temp, 1)}°` : "–",
      weatherSub: w.text,
      weatherStrip: this._weatherStripHTML(),
      indoor: indoor !== null ? fmtNum(indoor, 1) : "–",
      indoorSub: "gennemsnit · inde",
      price: fmtPrice(price.now),
      priceSub: "kr/kWh · nu",
      battery: soc !== null ? fmtNum(soc, 0) : "–",
      batterySub: soc !== null ? (soc < 20 ? "lavt" : soc > 80 ? "fuldt" : "ladning") : "–",
      solarNow: fmtNum(pv, 0),
      solarSub: dayProd !== null ? `${fmtNum(dayProd, 1)} kWh i dag` : "i dag",
      alertPill: String(alerts.length),
      version: VERSION,
      roomsMeta: `<b>${ROOMS.length} rum</b> · ${this._n("sensor.windows", 0)} åbne · <b>${this._n("sensor.count_all_lights", 0)}</b> lys tændt`,
    };
    ROOMS.forEach((r) => {
      const t = this._tempFor(r);
      const air = this._airFor(r);
      const lights = this._lightStats(r);
      const open = this._openingStats(r);
      b[`r_${r.id}_temp`] = t.v === null ? "–" : fmtNum(t.v, 1);
      b[`r_${r.id}_air`] = `${air.label} ${air.value}`;
      if (lights) b[`r_${r.id}_lights`] = `${lights.on} / ${lights.total} lys`;
      if (open) b[`r_${r.id}_open`] = open.leak ? "lækage" : open.open ? `${open.open} åben` : "lukket";
    });
    SYSTEM_CARDS.forEach((s) => {
      const t = this._n(s.temp);
      b[`s_${s.id}_temp`] = t !== null ? fmtNum(t, 1) : "–";
      if (s.id === "ventilation") {
        const step = this._n(s.step);
        const hum = this._n(s.humidity);
        b[`s_${s.id}_sub`] = `trin ${step ?? "–"} · ${hum !== null ? Math.round(hum) + " %" : "–"}`;
      } else {
        const hum = this._n(s.humidity);
        b[`s_${s.id}_sub`] = hum !== null ? `${Math.round(hum)} % fugt` : "–";
      }
    });
    const ch = this._chapterBinds();
    Object.assign(b, ch);
    const sheetEl = this._root.querySelector("arcus-sheets");
    if (sheetEl && typeof sheetEl.binds === "function") Object.assign(b, sheetEl.binds());
    return b;
  }

  _chapterBinds() {
    const b = {};
    const price = this._priceToday();
    const pv = this._n("sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower", 0);
    const load = this._n("sensor.sunmate_io_pulse_ee40a0_pulse_load_w_totalpower", 0);
    const soc = this._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc", 0);
    const day = this._n("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production", 0);
    const water = this._n("sensor.bwt_perla_day_output", 0);
    const salt = this._n("sensor.bwt_perla_regenerativ_level", 0);
    const bwt = this._state("sensor.bwt_perla_state") || "–";
    const win = this._n("sensor.windows", 0);
    const leak = this._on("binary_sensor.klippbok_water_leak_sensor_water_leak") || this._on("binary_sensor.klippbok_water_leak_sensor_water_leak_2");
    const step = this._n("sensor.nilan602_actual_fan_step", 0);
    const roomT = this._n("sensor.nilan602_actual_room_temperature", 0);
    const filter = this._state("sensor.nilan602_air_filter_alarm_status");
    const rtt = this._n("sensor.192_168_110_1_round_trip_time_average");
    const google = this._n("sensor.8_8_8_8_round_trip_time_average");
    const kurs = this._n("sensor.40ndasdro56_kurs");
    const change = this._n("sensor.40ndasdro56_aendring");
    const lights = this._n("sensor.count_all_lights", 0);
    const heatAvg = HEATING.map((h) => this._attr(h.entity, "current_temperature")).filter((v) => Number.isFinite(Number(v)));
    const heatTarget = HEATING.map((h) => this._attr(h.entity, "temperature")).filter((v) => Number.isFinite(Number(v)));
    const alerts = this._alerts();
    b.ch_energi_sum = `<b>${fmtPrice(price.now)} kr/kWh</b> · huset bruger ${fmtNum(load, 0)} W`;
    b.ch_sol_sum = `<b>${fmtNum(soc, 0)} % batteri</b> · ${fmtNum(day, 1)} kWh i dag`;
    b.ch_vand_sum = `<b>${fmtNum(water, 1)} L i dag</b> · BWT ${bwt} · salt ${Math.round(salt)} %`;
    b.ch_sikkerhed_sum = leak ? `<b>Vandlækage registreret</b>` : `<b>${win ? win + " åbne" : "Alt lukket"}</b> · ${leak ? "tjek med det samme" : "ingen lækage"}`;
    b.ch_ventilation_sum = `<b>${fmtNum(roomT, 1)}°</b> · trin ${step ?? "–"} · ${filter && filter !== "OK" ? filter.toLowerCase() : "filter OK"}`;
    b.ch_teknik_sum = `<b>${rtt !== null ? fmtNum(rtt, 1) + " ms" : "–"}</b> router · ${google !== null ? fmtNum(google, 1) + " ms" : "–"} google`;
    b.ch_oekonomi_sum = `<b>${fmtNum(kurs, 2)}</b> · ${change >= 0 ? "+" : ""}${fmtNum(change, 2)} i dag`;
    b.ch_lys_sum = `<b>${lights} af 21</b> lys tændt`;
    b.ch_varme_sum = `<b>${heatAvg.length ? fmtNum(heatAvg.reduce((a, b) => a + b, 0) / heatAvg.length, 1) + "°" : "–"}</b> · ${heatTarget.length ? fmtNum(heatTarget.reduce((a, b) => a + b, 0) / heatTarget.length, 1) + "°" : "–"} setpunkt`;
    b.ch_alarmer_sum = alerts.length ? `<b>${alerts.length} ting</b> · ${alerts[0].title.toLowerCase()}` : `Alt er roligt`;
    b.ch_alarmer_num = String(alerts.length);
    return b;
  }

  _refresh() {
    if (!this._built || !this._hass) return;
    this._lastRefresh = Date.now();
    this._applyAtmo();
    const b = this._binds();
    this._root.querySelectorAll("[data-bind]").forEach((el) => {
      const k = el.dataset.bind;
      if (k in b) {
        const v = String(b[k]);
        if (el.textContent !== v) el.textContent = v;
      }
    });
    this._root.querySelectorAll("[data-bind-html]").forEach((el) => {
      const k = el.dataset.bindHtml;
      if (k in b && el.innerHTML !== String(b[k])) el.innerHTML = String(b[k]);
    });
    this._root.querySelectorAll("[data-person-dot]").forEach((el) => {
      const p = this._state("person.liltoto");
      el.style.background = p === "home" ? "var(--sage)" : "var(--muted)";
    });
    this._root.querySelectorAll("[data-weather-icon]").forEach((el) => {
      el.innerHTML = icon(this._weatherNow().icon);
    });
    this._root.querySelectorAll("[data-on]").forEach((el) => {
      el.classList.toggle("on", this._on(el.dataset.on));
    });
    this._root.querySelectorAll("[data-not-off]").forEach((el) => {
      el.classList.toggle("on", this._state(el.dataset.notOff) !== "off");
    });
    this._root.querySelectorAll("[data-open]").forEach((el) => {
      el.classList.toggle("open", this._on(el.dataset.open));
    });
    this._root.querySelectorAll("[data-batt]").forEach((el) => {
      const v = clamp(this._n(el.dataset.batt, 0), 0, 100);
      const bar = el.querySelector("i");
      if (bar) {
        bar.style.width = `${v}%`;
        bar.className = v < 20 ? "warn" : v < 40 ? "mid" : "";
      }
    });
    this._root.querySelectorAll("[data-warn]").forEach((el) => {
      el.classList.toggle("warn", this._on(el.dataset.warn));
    });
    this._root.querySelectorAll("[data-room-open]").forEach((el) => {
      const ids = String(el.dataset.roomOpen || "").split(",").filter(Boolean);
      el.classList.toggle("warn", ids.some((id) => this._on(id)));
    });
    this._root.querySelectorAll("[data-room-lights]").forEach((el) => {
      const ids = String(el.dataset.roomLights || "").split(",").filter(Boolean);
      el.classList.toggle("off", !ids.some((id) => this._on(id)));
    });
    this._root.querySelectorAll('.seg button[data-act="hvac"]').forEach((el) => {
      el.classList.toggle("active", this._state(el.dataset.entity) === el.dataset.mode);
    });
    this._root.querySelectorAll('.seg button[data-act="fan"]').forEach((el) => {
      const fan = String(this._attr(el.dataset.entity, "fan_mode", ""));
      el.classList.toggle("active", fan === String(el.dataset.mode));
    });
    this._root.querySelectorAll("[data-battery-ring]").forEach((el) => {
      const soc = clamp(this._n("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc", 0), 0, 100);
      el.setAttribute("stroke-dashoffset", String(100.5 - (soc / 100) * 100.5));
      el.setAttribute("stroke", soc < 20 ? "var(--coral)" : soc > 80 ? "var(--sage)" : "var(--brass)");
    });
    this._root.querySelectorAll("[data-range-entity]").forEach((el) => {
      const st = this._get(el.dataset.rangeEntity);
      const on = st?.state === "on";
      const pct = on ? Math.round(((st.attributes?.brightness ?? 0) / 255) * 100) : 0;
      if (this._root.activeElement !== el) el.value = String(pct);
      el.style.setProperty("--p", `${pct}%`);
      const lab = el.closest(".slider-wrap")?.querySelector(".pct");
      if (lab) lab.textContent = on ? `${pct} %` : "slukket";
    });
    this._root.querySelectorAll("[data-spark]").forEach((el) => {
      const vals = this._seriesFor(el.dataset.spark);
      const w = 100;
      const h = el.closest("svg")?.viewBox?.baseVal?.height || 28;
      el.setAttribute("d", sparkPath(vals, w, h, 1));
    });
    this._refreshArc();
    this._refreshCharts();
    this._refreshBars();
    this._refreshAlerts();
    this._refreshArt();
    this._refreshClockState();
  }

  _refreshBars() {
    this._root.querySelectorAll("[data-bars]").forEach((el) => {
      const key = el.dataset.bars;
      if (key !== "solarWeek") return;
      const h = this._hist.get("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production");
      if (!h || !h.rows?.length) {
        el.innerHTML = `<span class="day-empty">Ingen data endnu</span>`;
        return;
      }
      const byDay = new Map();
      h.rows.forEach((r) => {
        const t = Number(r.lu ?? r.last_updated ?? 0) * 1000;
        const v = Number(r.s ?? r.state);
        if (!Number.isFinite(t) || !Number.isFinite(v)) return;
        const d = new Date(t);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        byDay.set(k, Math.max(byDay.get(k) ?? 0, v));
      });
      const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
      if (!days.length) {
        el.innerHTML = `<span class="day-empty">Ingen data endnu</span>`;
        return;
      }
      const max = Math.max(...days.map((d) => d[1]), 1);
      const labels = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      el.innerHTML = days
        .map(([k, v]) => {
          const d = new Date(k);
          return `<div class="day${k === todayKey ? " today" : ""}"><span class="val">${fmtNum(v, 1)}</span><i class="bar" style="height:${Math.max(7, (v / max) * 74)}%"></i><span class="day-label">${labels[d.getDay()]}</span></div>`;
        })
        .join("");
    });
  }

  _refreshAlerts() {
    const slot = this._root.querySelector("[data-alert-slot]");
    if (!slot) return;
    const alerts = this._alerts();
    const pill = this._root.querySelector("[data-alert-pill]");
    if (pill) pill.hidden = !alerts.length;
    if (!alerts.length) {
      if (slot.innerHTML) slot.innerHTML = "";
      return;
    }
    const a = alerts[0];
    const html = `<button class="alert-band" data-nav="${a.route}">
      <span>${icon("alert")}</span>
      <span class="alert-text"><b>${esc(a.title)}.</b> ${esc(a.text)}</span>
      ${alerts.length > 1 ? `<span class="alert-count">+${alerts.length - 1}</span>` : ""}
      <span>${icon("arrow")}</span>
    </button>`;
    if (slot.innerHTML !== html) slot.innerHTML = html;
  }

  _refreshArt() {
    const map = {
      energi: () => this._chapterArt({ key: "energi" }),
      sol: () => this._chapterArt({ key: "sol" }),
      vand: () => this._chapterArt({ key: "vand" }),
      sikkerhed: () => this._chapterArt({ key: "sikkerhed" }),
      ventilation: () => this._chapterArt({ key: "ventilation" }),
      teknik: () => this._chapterArt({ key: "teknik" }),
      oekonomi: () => this._chapterArt({ key: "oekonomi" }),
      lys: () => this._chapterArt({ key: "lys" }),
      varme: () => this._chapterArt({ key: "varme" }),
      alarmer: () => this._chapterArt({ key: "alarmer" }),
    };
    this._root.querySelectorAll("[data-art]").forEach((el) => {
      const k = el.dataset.art;
      if (map[k]) {
        const html = map[k]();
        if (el.innerHTML !== html) el.innerHTML = html;
      }
    });
    const a = this._root.querySelector('[data-chapter="alarmer"] .big-num');
    if (a) a.textContent = String(this._alerts().length);
  }

  _refreshClockState() {
    const d = this._now();
    const el = this._root.querySelector("[data-bind='clock']");
    if (el) el.textContent = fmtTime(d);
  }

  _refreshCharts() {
    const svgs = new Set();
    this._root.querySelectorAll("[data-chart-line]").forEach((el) => {
      const svg = el.closest("svg");
      if (svg) svgs.add(svg);
    });
    svgs.forEach((svg) => {
      const paths = [...svg.querySelectorAll("[data-chart-line]")];
      const h = svg?.viewBox?.baseVal?.height || 130;
      const w = svg?.viewBox?.baseVal?.width || 560;
      const list = paths.map((p) => this._seriesFor(p.dataset.chartLine));
      let range = null;
      if (svg.dataset.chartShared === "1") {
        const all = list.flat().filter((v) => v !== null && v !== undefined && Number.isFinite(Number(v)));
        if (all.length) range = { min: Math.min(...all), max: Math.max(...all) };
      }
      paths.forEach((p, i) => {
        p.setAttribute("d", sparkPath(list[i], w, h, 6, range));
        const area = svg.querySelector(`[data-chart-area="${p.dataset.chartLine}"]`);
        if (area) area.setAttribute("d", areaPath(list[i], w, h, 6, range));
      });
      const box = svg.closest(".chart-box");
      if (box) box.classList.toggle("no-data", !list.some((x) => x.length));
    });
  }

  _startClock() {
    clearInterval(this._clockTimer);
    this._clockTimer = setInterval(() => this._refresh(), 20000);
  }

  _schedule() {
    if (this._refreshTimer) return;
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = null;
      this._refresh();
    }, 240);
  }

  /* ---------- ruter ---------- */
  _parseHash() {
    const h = (location.hash || "").replace(/^#\/?/, "");
    if (!h) return { base: "hjem", sub: null };
    const [base, sub] = h.split("/");
    return { base: base || "hjem", sub: sub || null };
  }

  _applyRoute(first = false) {
    const route = this._parseHash();
    const changed = route.base !== this._route.base || route.sub !== this._route.sub;
    this._route = route;
    if (route.base === "hjem") {
      this._closeSheet(true);
      return;
    }
    if (changed || first || this._sheetBuiltFor !== this._routeKey()) this._openSheet(route);
  }

  _routeKey() {
    return `${this._route.base}/${this._route.sub || ""}`;
  }

  _navigate(path) {
    const hash = `#/${path}`;
    if (location.hash === hash) {
      this._applyRoute(true);
      return;
    }
    location.hash = hash;
  }

  _openSheet(route) {
    const sheet = this._root.querySelector("[data-sheet]");
    const scrim = this._root.querySelector("[data-scrim]");
    if (!sheet || !scrim) return;
    this._lastFocus = document.activeElement;
    const key = this._routeKey();
    const mount = () => {
      if (!sheet.querySelector("[data-sheet-grab]")) {
        sheet.innerHTML = `<div class="sheet-grab" data-sheet-grab></div>`;
      }
      let inner = sheet.querySelector("arcus-sheets");
      if (!inner) {
        inner = document.createElement("arcus-sheets");
        sheet.appendChild(inner);
      }
      inner.app = this;
      inner.route = route;
      sheet.querySelector(".sheet-scroll")?.scrollTo(0, 0);
      this._sheetBuiltFor = key;
      this._refresh();
      requestAnimationFrame(() => {
        const focus = sheet.querySelector("[data-act='close']");
        if (focus && !this._reduced) focus.focus({ preventScroll: true });
      });
    };
    if (customElements.get("arcus-sheets")) mount();
    else if (customElements.whenDefined) customElements.whenDefined("arcus-sheets").then(() => {
      if (this._routeKey() === key) mount();
    });
    requestAnimationFrame(() => {
      scrim.classList.add("open");
      sheet.classList.add("open");
    });
  }

  _closeSheet(instant = false) {
    const sheet = this._root.querySelector("[data-sheet]");
    const scrim = this._root.querySelector("[data-scrim]");
    if (!sheet || !scrim || !sheet.classList.contains("open")) {
      if (instant) {
        sheet?.classList.remove("open");
        scrim?.classList.remove("open");
      }
      return;
    }
    sheet.classList.remove("open");
    scrim.classList.remove("open");
    this._sheetBuiltFor = "";
    if (this._lastFocus?.focus) {
      try {
        this._lastFocus.focus({ preventScroll: true });
      } catch (e) {
        /* ignore */
      }
    }
  }

  _closeRoute() {
    if (location.hash && location.hash !== "#/") {
      location.replace("#/");
    } else {
      this._closeSheet();
      this._route = { base: "hjem", sub: null };
    }
  }

  _sheetHeader(kicker, title, sum) {
    return `<div class="sheet-head">
      <div class="sheet-kicker">${esc(kicker)}</div>
      <h2 class="sheet-title">${esc(title)}</h2>
      <div class="sheet-sum" data-bind="sheet_sum">${sum}</div>
      <button class="sheet-close" data-act="close" aria-label="Luk">${icon("close")}</button>
    </div>`;
  }

  _sheetTabs(tabs, active) {
    return `<div class="sheet-tabs">${tabs.map((t) => `<button class="tab${t.key === active ? " active" : ""}" data-nav="${t.route}">${esc(t.label)}</button>`).join("")}</div>`;
  }

  /* ---------- data-load ---------- */
  async _loadInitial() {
    this._loadWeather();
    const ids = [
      "sensor.nilan602_actual_room_temperature",
      "sensor.outdoor_temperature",
      "sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower",
      "sensor.sunmate_io_pulse_ee40a0_pulse_load_w_totalpower",
      "sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc",
      "sensor.bwt_perla_current_flow",
      "sensor.192_168_110_1_round_trip_time_average",
      "sensor.8_8_8_8_round_trip_time_average",
      "sensor.1_1_1_1_round_trip_time_average",
      "sensor.40ndasdro56_kurs",
      "sensor.sparet_total",
      ...ROOMS.map((r) => r.temp).filter(Boolean),
      ...ROOMS.map((r) => r.humidity).filter(Boolean),
      ...ROOMS.map((r) => r.co2).filter(Boolean),
    ];
    await this._ensureHistory(ids, 24);
  }

  async _loadWeather() {
    try {
      const res = await this._hass.callApi("POST", "services/weather/get_forecasts?return_response", {
        entity_id: "weather.forecast_hjem",
        type: "daily",
      });
      const f = res?.service_response?.["weather.forecast_hjem"]?.forecast || res?.forecast;
      if (Array.isArray(f)) this._weather = f;
    } catch (e) {
      const f = this._get("weather.forecast_hjem")?.attributes?.forecast;
      if (Array.isArray(f)) this._weather = f;
    }
    this._schedule();
  }

  /* ---------- events ---------- */
  _addListeners() {
    if (this._listeners) return;
    this._listeners = true;
    this._onHash = () => this._applyRoute();
    window.addEventListener("hashchange", this._onHash);
    this._onKey = (e) => {
      if (e.key === "Escape") {
        this._closeRoute();
      }
      if (e.key === "Tab") this._trapFocus(e);
    };
    this._root.addEventListener("keydown", this._onKey);
    this._onClick = (e) => this._click(e);
    this._root.addEventListener("click", this._onClick);
    this._onInput = (e) => this._input(e);
    this._root.addEventListener("input", this._onInput);
    this._onChange = (e) => this._change(e);
    this._root.addEventListener("change", this._onChange);
    this._onPointerMove = (e) => {
      const arc = e.target.closest?.("[data-arc]");
      if (arc && (e.pointerType === "mouse" || e.buttons)) this._scrubAt(e.clientX);
    };
    this._root.addEventListener("pointermove", this._onPointerMove);
    this._onPointerDown = (e) => {
      const arc = e.target.closest?.("[data-arc]");
      if (arc) this._scrubAt(e.clientX);
      const grab = e.target.closest?.("[data-sheet-grab]");
      if (grab) this._dragStart(e);
    };
    this._root.addEventListener("pointerdown", this._onPointerDown);
    this._onPointerUp = (e) => {
      if (this._drag) this._dragEnd(e);
    };
    window.addEventListener("pointerup", this._onPointerUp);
  }

  _removeListeners() {
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
  }

  _trapFocus(e) {
    const sheet = this._root.querySelector("[data-sheet].open");
    if (!sheet) return;
    const focusables = [...sheet.querySelectorAll("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && this._root.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && this._root.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  _click(e) {
    const nav = e.target.closest?.("[data-nav]");
    if (nav && this._root.contains(nav)) {
      e.preventDefault();
      this._navigate(nav.dataset.nav);
      return;
    }
    const act = e.target.closest?.("[data-act]");
    if (act) {
      e.preventDefault();
      this._action(act.dataset.act, act.dataset, act);
    }
  }

  _input(e) {
    const el = e.target.closest?.("input[data-range-entity]");
    if (el) {
      const pct = Number(el.value);
      el.style.setProperty("--p", `${pct}%`);
      const lab = el.closest(".slider-wrap")?.querySelector(".pct");
      if (lab) lab.textContent = `${pct} %`;
      return;
    }
    const temp = e.target.closest?.("input[data-temp-range]");
    if (temp) {
      const lab = temp.closest(".slider-wrap")?.querySelector(".pct");
      if (lab) lab.textContent = `${temp.value}°`;
      temp.style.setProperty("--p", `${((Number(temp.value) - 5) / 30) * 100}%`);
    }
  }

  _change(e) {
    const el = e.target.closest?.("input[data-range-entity]");
    if (el) {
      const id = el.dataset.rangeEntity;
      const pct = Number(el.value);
      if (pct <= 0) this._call("light", "turn_off", {}, { entity_id: id });
      else this._call("light", "turn_on", { brightness_pct: pct }, { entity_id: id });
      return;
    }
    const temp = e.target.closest?.("input[data-temp-range]");
    if (temp) {
      const id = temp.dataset.tempRange;
      this._call("climate", "set_temperature", { temperature: Number(temp.value) }, { entity_id: id });
      return;
    }
    const sel = e.target.closest?.("select[data-select-entity]");
    if (sel) {
      this._call("select", "select_option", { option: sel.value }, { entity_id: sel.dataset.selectEntity });
    }
  }

  _action(act, data, el) {
    if (act === "close") return this._closeRoute();
    if (act === "atmo") return this._cycleAtmo();
    if (act === "toggle-light") return this._call("light", "toggle", {}, { entity_id: data.entity });
    if (act === "toggle-switch") return this._call("switch", "toggle", {}, { entity_id: data.entity });
    if (act === "toggle-bool") return this._call("input_boolean", "toggle", {}, { entity_id: data.entity });
    if (act === "press") return this._call("input_button", "press", {}, { entity_id: data.entity });
    if (act === "press-button") return this._call("button", "press", {}, { entity_id: data.entity });
    if (act === "temp-step" || act === "input-step" || act === "number-step") {
      const id = data.entity;
      const dir = Number(data.dir || 1);
      const step = Number(data.step || 0.5);
      const isClimate = act === "temp-step";
      const cur = isClimate ? Number(this._attr(id, "temperature")) : this._n(id);
      const min = Number(this._attr(id, isClimate ? "min_temp" : "min", 5));
      const max = Number(this._attr(id, isClimate ? "max_temp" : "max", 35));
      if (!Number.isFinite(cur)) return;
      const next = clamp(cur + dir * step, min, max);
      if (isClimate) return this._call("climate", "set_temperature", { temperature: next }, { entity_id: id });
      if (act === "input-step") return this._call("input_number", "set_value", { value: next }, { entity_id: id });
      return this._call("number", "set_value", { value: next }, { entity_id: id });
    }
    if (act === "temp-up" || act === "temp-down") {
      const id = data.entity;
      const cur = Number(this._attr(id, "temperature"));
      const step = Number(data.step || 0.5);
      const min = Number(this._attr(id, "min_temp", 5));
      const max = Number(this._attr(id, "max_temp", 35));
      if (!Number.isFinite(cur)) return;
      const next = clamp(cur + (act === "temp-up" ? step : -step), min, max);
      return this._call("climate", "set_temperature", { temperature: next }, { entity_id: id });
    }
    if (act === "hvac-toggle") {
      const id = data.entity;
      const mode = this._state(id) === "off" ? "heat" : "off";
      return this._call("climate", "set_hvac_mode", { hvac_mode: mode }, { entity_id: id });
    }
    if (act === "hvac") {
      return this._call("climate", "set_hvac_mode", { hvac_mode: data.mode }, { entity_id: data.entity });
    }
    if (act === "fan") {
      return this._call("climate", "set_fan_mode", { fan_mode: data.mode }, { entity_id: data.entity });
    }
    if (act === "sluk-alt") {
      this._confirm = { text: "Sluk alle lys i hjemmet?", act: "sluk-alt-go" };
      this._refreshConfirm();
      return;
    }
    if (act === "sluk-alt-go") {
      this._confirm = null;
      this._call("light", "turn_off", {}, { area_id: ALL_LIGHT_AREAS });
      this._refreshConfirm();
      return;
    }
    if (act === "cancel-confirm") {
      this._confirm = null;
      this._refreshConfirm();
      return;
    }
    if (act === "set-number") {
      const cur = this._n(data.entity, 0);
      const step = Number(data.step || 1);
      const min = Number(this._attr(data.entity, "min", 0));
      const max = Number(this._attr(data.entity, "max", 100));
      const next = clamp(cur + Number(data.dir || 1) * step, min, max);
      return this._call("number", "set_value", { value: next }, { entity_id: data.entity });
    }
    if (act === "set-input-number") {
      const cur = this._n(data.entity, 0);
      const step = Number(data.step || 1);
      const min = Number(this._attr(data.entity, "min", 0));
      const max = Number(this._attr(data.entity, "max", 100));
      const next = clamp(cur + Number(data.dir || 1) * step, min, max);
      return this._call("input_number", "set_value", { value: next }, { entity_id: data.entity });
    }
    if (act === "select") {
      return this._call("select", "select_option", { option: data.option }, { entity_id: data.entity });
    }
    if (act === "media-toggle") {
      return this._call("media_player", "media_play_pause", {}, { entity_id: data.entity });
    }
    if (act === "map") {
      history.pushState(null, "", "/map");
      window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
      return;
    }
    if (act === "helios") {
      history.pushState(null, "", "/nyt-overblik/solceller-helios");
      window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
      return;
    }
    if (act === "scroll-top") {
      this._root.querySelector(".scroll")?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  }

  _call(domain, service, data, target) {
    if (!this._hass?.callService) return;
    this._hass.callService(domain, service, data, target).catch((err) => {
      this._toast(`Kunne ikke: ${err?.message || service}`);
    });
  }

  _toast(msg) {
    const el = this._root.querySelector("[data-toast]");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  _refreshConfirm() {
    const el = this._root.querySelector("[data-confirm]");
    if (!el) return;
    if (!this._confirm) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `<div class="confirm"><span class="txt">${esc(this._confirm.text)}</span><button class="btn small" data-act="cancel-confirm">Annuller</button><button class="btn small danger" data-act="${this._confirm.act}">Ja, sluk</button></div>`;
  }

  /* ---------- drag ---------- */
  _dragStart(e) {
    if (window.matchMedia("(min-width: 900px)").matches) return;
    const sheet = this._root.querySelector("[data-sheet]");
    if (!sheet) return;
    this._drag = { y: e.clientY, sheet };
    sheet.style.transition = "none";
    const move = (ev) => {
      const dy = Math.max(0, ev.clientY - this._drag.y);
      sheet.style.transform = `translateY(${dy}px)`;
      this._drag.dy = dy;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      sheet.style.transition = "";
      sheet.style.transform = "";
      if (this._drag?.dy > 100) this._closeRoute();
      this._drag = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  _dragEnd() {
    /* handled in _dragStart listeners */
  }
}

if (!customElements.get("arcus-card")) {
  customElements.define("arcus-card", ArcusCard);
}
