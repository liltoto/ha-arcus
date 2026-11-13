/* Døgnbuen — data, ikoner og små hjælpere */

export const VERSION = "0.1.0";
export const CARD_TAG = "arcus-card";

export const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600&display=swap";

export const PRAYERS = [
  { id: "sensor.islamic_prayer_times_fajr_prayer", name: "Fajr" },
  { id: "sensor.islamic_prayer_times_dhuhr_prayer", name: "Dhuhr" },
  { id: "sensor.islamic_prayer_times_asr_prayer", name: "Asr" },
  { id: "sensor.islamic_prayer_times_maghrib_prayer", name: "Maghrib" },
  { id: "sensor.islamic_prayer_times_isha_prayer", name: "Isha" },
];

export const SUNRISE_ID = "sensor.islamic_prayer_times_sunrise_time";

export const LIGHT_WORDS = ["slukket", "tændt"];

export const LIGHTS = [
  {
    key: "kokken",
    name: "Køkken",
    icon: "counter",
    entity: "light.kokken",
    members: [
      "light.kajplats_gu10_cws_470lm_7",
      "light.kajplats_gu10_cws_470lm_8",
      "light.kajplats_gu10_cws_470lm",
      "light.kajplats_gu10_cws_470lm_2",
      "light.kajplats_gu10_cws_470lm_3",
      "light.kajplats_gu10_cws_470lm_5",
      "light.kajplats_gu10_cws_470lm_4",
      "light.kajplats_gu10_cws_470lm_6",
      "light.kajplats_gu10_cws_470lm_9",
    ],
    extra: ["light.192_168_110_242_enhaettelys"],
  },
  {
    key: "bryggers",
    name: "Bryggers",
    icon: "washer",
    entity: "light.bryggers",
    members: [
      "light.kajplats_gu10_cws_470lm_14",
      "light.kajplats_gu10_cws_470lm_16",
      "light.kajplats_gu10_cws_470lm_15",
    ],
  },
  {
    key: "entre",
    name: "Entre",
    icon: "door",
    entity: "light.entre",
    members: [
      "light.kajplats_gu10_cws_470lm_12",
      "light.kajplats_gu10_cws_470lm_13",
    ],
  },
  {
    key: "gang",
    name: "Lille Gang",
    icon: "stairs",
    entity: "light.lille_gang",
    members: [
      "light.kajplats_gu10_cws_470lm_10",
      "light.kajplats_gu10_cws_470lm_11",
    ],
  },
];

export const ALL_LIGHT_AREAS = [
  "kontor",
  "sovevaerelse",
  "kokken",
  "bryggers",
  "lille_gang",
  "entre",
];

export const HEATING = [
  {
    name: "Stue",
    entity: "climate.wavin_stue",
    opening: "binary_sensor.gulvvarme_stue_abninger",
  },
  {
    name: "Køkken",
    entity: "climate.wavin_kokken",
    opening: "binary_sensor.gulvvarme_kokken_abninger",
  },
  {
    name: "Soveværelse",
    entity: "climate.wavin_sovevaerelse",
    opening: "binary_sensor.gulvvarme_sovevaerelse_abninger",
  },
  {
    name: "Kontor",
    entity: "climate.wavin_kontor",
    opening: "binary_sensor.gulvvarme_kontor_abninger",
  },
  {
    name: "Bryggers",
    entity: "climate.wavin_bryggers",
    opening: "binary_sensor.gulvvarme_bryggers_abninger",
  },
  {
    name: "Lille Badeværelse",
    entity: "climate.wavin_lille_badevaerelse",
    opening: "binary_sensor.gulvvarme_lille_badevaerelse_abninger",
  },
  {
    name: "Stor Badeværelse",
    entity: "climate.wavin_stor_badevaerelse",
    opening: "binary_sensor.gulvvarme_stor_badevaerelse_abninger",
  },
  {
    name: "Entre",
    entity: "climate.wavin_entre",
    opening: null,
  },
];

export const HEATING_RESERVE = [
  { name: "Kanal 6", entity: "climate.wavin_kanal_6" },
  { name: "Kanal 10", entity: "climate.wavin_kanal_10" },
  { name: "Kanal 11", entity: "climate.wavin_kanal_11" },
];

export const ROOMS = [
  {
    id: "stue",
    name: "Stue",
    icon: "sofa",
    wide: true,
    tint: "#7FAFC4",
    temp: "sensor.alpstuga_air_quality_monitor_temperatur_2",
    tempFallback: "climate.wavin_stue",
    humidity: "sensor.alpstuga_air_quality_monitor_luftfugtighed_2",
    co2: "sensor.alpstuga_air_quality_monitor_carbon_dioxide_2",
    pm25: "sensor.alpstuga_air_quality_monitor_pm25_2",
    lights: [],
    openings: [
      { id: "binary_sensor.myggbett_door_window_sensor_dor_7", name: "Stue dør", kind: "Dør" },
      { id: "binary_sensor.myggbett_door_window_sensor_dor_8", name: "Stue vindue", kind: "Vindue" },
    ],
    climate: "climate.wavin_stue",
    media: "media_player.lg_speaker_sp8ya_2",
  },
  {
    id: "kokken",
    name: "Køkken",
    icon: "counter",
    tint: "#D8A657",
    temp: null,
    tempFallback: "climate.wavin_kokken",
    humidity: null,
    co2: null,
    pm25: null,
    lights: [
      "light.kokken",
      "light.192_168_110_242_enhaettelys",
      ...LIGHTS[0].members,
    ],
    openings: [
      { id: "binary_sensor.myggbett_door_window_sensor_dor_3", name: "Køkken dør", kind: "Dør" },
    ],
    climate: "climate.wavin_kokken",
    leak: "binary_sensor.klippbok_water_leak_sensor_water_leak",
    fan: "fan.192_168_110_242_emhaette",
    filter: "sensor.192_168_110_242_filter_driftstimer_siden_sidste_nulstilling",
    filterAlarm: "binary_sensor.192_168_110_242_kraever_filterrensning",
  },
  {
    id: "sovevaerelse",
    name: "Soveværelse",
    icon: "bed",
    tint: "#9A86C8",
    temp: "sensor.timmerflotte_temp_hmd_sensor_temperatur_2",
    tempFallback: "climate.wavin_sovevaerelse",
    humidity: "sensor.timmerflotte_temp_hmd_sensor_luftfugtighed_2",
    co2: null,
    pm25: null,
    lights: [],
    openings: [
      { id: "binary_sensor.myggbett_door_window_sensor_dor_6", name: "Soveværelse dør", kind: "Dør" },
      { id: "binary_sensor.myggbett_door_window_sensor_dor_5", name: "Badeværelse dør", kind: "Dør" },
    ],
    climate: "climate.wavin_sovevaerelse",
    battery: "sensor.bilresa_dual_button_batteri",
  },
  {
    id: "kontor",
    name: "Kontor",
    icon: "desk",
    tint: "#8FB08B",
    temp: "sensor.alpstuga_air_quality_monitor_temperatur",
    tempFallback: "climate.wavin_kontor",
    humidity: "sensor.alpstuga_air_quality_monitor_luftfugtighed",
    co2: "sensor.alpstuga_air_quality_monitor_carbon_dioxide",
    pm25: "sensor.alpstuga_air_quality_monitor_pm25",
    lights: [],
    openings: [
      { id: "binary_sensor.myggbett_door_window_sensor_dor", name: "Kontor dør", kind: "Dør" },
    ],
    climate: "climate.wavin_kontor",
  },
  {
    id: "bryggers",
    name: "Bryggers",
    icon: "washer",
    tint: "#8FB08B",
    temp: "sensor.alpstuga_air_quality_monitor_temperatur_3",
    tempFallback: "climate.wavin_bryggers",
    humidity: "sensor.alpstuga_air_quality_monitor_luftfugtighed_3",
    co2: "sensor.alpstuga_air_quality_monitor_carbon_dioxide_3",
    pm25: "sensor.alpstuga_air_quality_monitor_pm25_3",
    lights: ["light.bryggers", ...LIGHTS[1].members],
    openings: [
      { id: "binary_sensor.klippbok_water_leak_sensor_water_leak_2", name: "Vandlækage", kind: "Lækage" },
    ],
    climate: "climate.wavin_bryggers",
    plug: "sensor.grillplats_plug_effekt_2",
  },
  {
    id: "entre",
    name: "Entre",
    icon: "door",
    tint: "#E0785E",
    temp: null,
    tempFallback: "climate.wavin_entre",
    humidity: null,
    co2: null,
    pm25: null,
    lights: ["light.entre", ...LIGHTS[2].members],
    openings: [],
    climate: "climate.wavin_entre",
    motion: "binary_sensor.myggspray_wrlss_mtn_sensor_tilstedevaerelse",
    illuminance: "sensor.myggspray_wrlss_mtn_sensor_belysningsstyrke",
  },
];

export const SYSTEM_CARDS = [
  {
    id: "ventilation",
    name: "Ventilation",
    icon: "fan",
    tint: "#7FAFC4",
    temp: "sensor.nilan602_actual_room_temperature",
    humidity: "sensor.nilan602_humidity",
    step: "sensor.nilan602_actual_fan_step",
    filter: "sensor.nilan602_air_filter_alarm_status",
    climate: "climate.nilan602_nilan",
  },
  {
    id: "skur",
    name: "Skur",
    icon: "shed",
    tint: "#8A929E",
    temp: "sensor.timmerflotte_temp_hmd_sensor_temperatur",
    humidity: "sensor.timmerflotte_temp_hmd_sensor_luftfugtighed",
  },
];

export const CHAPTERS = [
  { key: "energi", title: "Energi", icon: "bolt", large: true, route: "energi" },
  { key: "sol", title: "Solceller", icon: "solar", large: true, route: "sol" },
  { key: "vand", title: "Vand", icon: "drop", route: "vand" },
  { key: "sikkerhed", title: "Sikkerhed", icon: "shield", route: "sikkerhed" },
  { key: "ventilation", title: "Ventilation", icon: "fan", route: "ventilation" },
  { key: "teknik", title: "Teknik", icon: "network", route: "teknik" },
  { key: "oekonomi", title: "Økonomi", icon: "chart", route: "oekonomi" },
  { key: "lys", title: "Lys", icon: "light", route: "lys" },
  { key: "varme", title: "Gulvvarme", icon: "heat", route: "varme" },
  { key: "alarmer", title: "Alarmer", icon: "bell", route: "alarmer" },
];

export const NAV_ITEMS = [
  { route: "hjem", title: "Hjem", icon: "sun", hint: "Døgnbuen og hele hjemmet" },
  { route: "bon", title: "Bedetider", icon: "moon", hint: "Fajr, Dhuhr, Asr, Maghrib, Isha" },
  { route: "rum/stue", title: "Stue", icon: "sofa", hint: "Klima, luft og medie" },
  { route: "rum/kokken", title: "Køkken", icon: "counter", hint: "Lys, emhætte og vand" },
  { route: "rum/sovevaerelse", title: "Soveværelse", icon: "bed", hint: "Klima og åbninger" },
  { route: "rum/kontor", title: "Kontor", icon: "desk", hint: "Luftkvalitet og varme" },
  { route: "rum/bryggers", title: "Bryggers", icon: "washer", hint: "Luft, server og vand" },
  { route: "rum/entre", title: "Entre", icon: "door", hint: "Bevægelse og lys" },
  { route: "skur", title: "Skur", icon: "shed", hint: "Temperatur og fugt ude" },
  { route: "lys", title: "Lys", icon: "light", hint: "Alle 21 lys" },
  { route: "varme", title: "Gulvvarme", icon: "heat", hint: "8 zoner og 3 reserver" },
  { route: "ventilation", title: "Ventilation", icon: "fan", hint: "Nilan og luftskifte" },
  { route: "energi", title: "Energi", icon: "bolt", hint: "Priser, forbrug og Tesla" },
  { route: "sol", title: "Solceller", icon: "solar", hint: "Produktion, batteri og afkast" },
  { route: "vand", title: "Vand", icon: "drop", hint: "BWT, forbrug og lækage" },
  { route: "sikkerhed", title: "Sikkerhed", icon: "shield", hint: "Døre, vinduer og batterier" },
  { route: "teknik", title: "Teknik", icon: "network", hint: "Netværk og inverter" },
  { route: "oekonomi", title: "Økonomi", icon: "chart", hint: "Kurs og nøgletal" },
  { route: "alarmer", title: "Alarmer", icon: "bell", hint: "Alt der kræver opmærksomhed" },
];

/* ---------- ikoner (tynde linjer, 24×24) ---------- */
const I = (body, extra = "") =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const ICONS = {
  sun: I(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`),
  moon: I(`<path d="M20 14.5A8 8 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5Z"/>`),
  cloud: I(`<path d="M7 18h9a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.2A3.4 3.4 0 0 0 7 18Z"/>`),
  rain: I(`<path d="M7 15h9a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.2A3.4 3.4 0 0 0 7 15Z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>`),
  snow: I(`<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>`),
  home: I(`<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>`),
  sofa: I(`<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M3 11a2 2 0 0 1 2 2v2h14v-2a2 2 0 0 1 4 0v5H1v-5a2 2 0 0 1 2-2Z"/><path d="M4 18v2M20 18v2"/>`),
  counter: I(`<path d="M3 8h18"/><path d="M4.5 8V21M19.5 8v13"/><path d="M7.5 8V4h4v4"/><circle cx="16" cy="12" r="1.6"/>`),
  bed: I(`<path d="M3 19V7"/><path d="M3 16h18v3"/><path d="M6 16v-4h6a2 2 0 0 1 2 2v2"/><path d="M14 12h4a3 3 0 0 1 3 3v1"/>`),
  desk: I(`<path d="M3 8h18"/><path d="M4.5 8v12M19.5 8v12"/><rect x="8" y="4" width="8" height="4" rx="1"/><path d="M8 12h4"/>`),
  washer: I(`<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><path d="M8 6.5h.01M11 6.5h.01"/>`),
  door: I(`<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><circle cx="14.5" cy="12" r=".8" fill="currentColor" stroke="none"/>`),
  shed: I(`<path d="M3 10 12 3l9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-6h6v6"/><path d="M9 15h6"/>`),
  stairs: I(`<path d="M3 20h4v-4h4v-4h4V8h4V4"/>`),
  fan: I(`<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-6 3.5-6 2 0 3 1.6 2.2 3.4C16.9 9.4 14.6 10 12 10Z"/><path d="M14 12c4 0 6 1 6 3.5 0 2-1.6 3-3.4 2.2C14.6 16.9 14 14.6 14 12Z"/><path d="M10 12c0 2-.6 4.3-2.4 5.1C5.8 17.9 4 17 4 15c0-2.5 2-3.5 6-3Z"/><path d="M10 14c-4 0-6-1-6-3.5C4 8.5 5.6 7.5 7.4 8.3 9.4 9.1 10 11.4 10 14Z"/>`),
  drop: I(`<path d="M12 3c3.5 4.5 6 7.5 6 10.5A6 6 0 0 1 6 13.5C6 10.5 8.5 7.5 12 3Z"/>`),
  shield: I(`<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9.5 12 1.8 1.8 3.4-3.6"/>`),
  bolt: I(`<path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z"/>`),
  solar: I(`<path d="M4 18h16"/><path d="m6 18 1.5-7h9L18 18"/><path d="M9 18v3M15 18v3"/><circle cx="12" cy="4.5" r="2"/><path d="M12 1v1M12 7v1M8.8 4.5H7.5M16.5 4.5h-1.3"/>`),
  battery: I(`<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10v4"/><path d="M6 10v4M9.5 10v4M13 10v4"/>`),
  light: I(`<path d="M9 18h6"/><path d="M10 21h4"/><path d="M8 14a5 5 0 1 1 8 0c-.8.8-1 1.5-1 2H9c0-.5-.2-1.2-1-2Z"/>`),
  heat: I(`<path d="M7 21c-2-3 2-4 0-7M12 21c-2-3 2-4 0-7M17 21c-2-3 2-4 0-7"/><path d="M6 10a6 6 0 0 1 12 0"/>`),
  network: I(`<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M6 9v3h12V9M12 12v3"/>`),
  chart: I(`<path d="M3 20h18"/><path d="M5 17V9M10 17V5M15 17v-6M20 17V7"/>`),
  bell: I(`<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/>`),
  alert: I(`<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none"/>`),
  check: I(`<path d="m4 12.5 5 5L20 6.5"/>`),
  close: I(`<path d="M6 6l12 12M18 6 6 18"/>`),
  menu: I(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
  arrow: I(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  chevron: I(`<path d="m9 5 7 7-7 7"/>`),
  plus: I(`<path d="M12 5v14M5 12h14"/>`),
  minus: I(`<path d="M5 12h14"/>`),
  play: I(`<path d="M8 5v14l11-7L8 5Z"/>`),
  pause: I(`<path d="M8 5v14M16 5v14"/>`),
  car: I(`<path d="M5 16h14l-1.5-5.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5L5 16Z"/><path d="M4 16v3h3v-3M17 16v3h3v-3"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/>`),
  plug: I(`<path d="M9 3v5M15 3v5"/><path d="M6 8h12v4a6 6 0 0 1-12 0V8Z"/><path d="M12 18v3"/>`),
  filter: I(`<path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>`),
  spark: I(`<path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8"/>`),
  thermometer: I(`<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0Z"/><path d="M12 8v7"/>`),
  water: I(`<path d="M3 8c3-2 5 2 9 0s6 2 9 0M3 13c3-2 5 2 9 0s6 2 9 0M3 18c3-2 5 2 9 0s6 2 9 0"/>`),
  wind: I(`<path d="M3 8h10a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M3 16h7a2.5 2.5 0 1 1-2.5 2.5"/>`),
  info: I(`<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none"/>`),
  flame: I(`<path d="M12 3c1 4-3 5-3 9a3 3 0 0 0 6 0c0-2-1-2.5-1-4 2 1 4 3 4 6a6 6 0 0 1-12 0c0-5 5-6 6-11Z"/>`),
  clock: I(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`),
  map: I(`<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>`),
  percent: I(`<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>`),
};

export function icon(name, cls = "") {
  const s = ICONS[name] || ICONS.info;
  return cls ? s.replace('class="ico"', `class="ico ${cls}"`) : s;
}

/* ---------- formattering ---------- */
const DA_DAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
const DA_MONTHS = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

export function nowDate() {
  if (typeof window !== "undefined" && window.__HJEM_NOW instanceof Date) {
    return new Date(window.__HJEM_NOW.getTime());
  }
  return new Date();
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function fmtNum(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "–";
  return new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(v));
}

export function fmtPrice(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "–";
  return Number(v).toFixed(2).replace(".", ",");
}

export function fmtTime(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "–";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtDateLong(d = nowDate()) {
  return `${DA_DAYS[d.getDay()]} ${d.getDate()}. ${DA_MONTHS[d.getMonth()]}`;
}

export function greeting(d = nowDate()) {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "Godmorgen";
  if (h >= 11 && h < 17) return "Godmiddag";
  if (h >= 17 && h < 23) return "Godaften";
  return "Godnat";
}

export function histTs(row) {
  const raw = row?.lu ?? row?.last_updated ?? row?.last_changed;
  if (typeof raw === "number") return raw * 1000;
  if (typeof raw === "string") {
    if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw) * 1000;
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

export function parseTs(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function minutesOfDay(d) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export function dayFrac(d) {
  return minutesOfDay(d) / 1440;
}

export function arcPoint(t, w = 920, x0 = 40, base = 210, rise = 150) {
  const x = x0 + w * clamp(t, 0, 1);
  const y = base - rise * 4 * clamp(t, 0, 1) * (1 - clamp(t, 0, 1));
  return { x, y };
}

export function priceColor(p, min, max) {
  if (p === null || p === undefined) return "#6b7280";
  const r = max > min ? (p - min) / (max - min) : 0;
  if (r < 0.34) return "#8FB08B";
  if (r < 0.67) return "#D8A657";
  return "#E0785E";
}

export function solarPhase(sun, d = nowDate()) {
  const elev = sun?.attributes?.elevation;
  if (typeof elev === "number") {
    if (elev > 6) return "day";
    if (elev > -6) return sun.attributes.rising ? "dawn" : "dusk";
    return "night";
  }
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 5 || h >= 22) return "night";
  if (h < 9) return "dawn";
  if (h < 17) return "day";
  return "dusk";
}

export function shortRoomName(name) {
  return name
    .replace("Lille Badeværelse", "Lille bad")
    .replace("Stor Badeværelse", "Stor bad")
    .replace("Soveværelse", "Sovev.");
}

/* ---------- SVG-grafer ---------- */
export function sparkPath(values, w = 100, h = 28, pad = 2, range = null) {
  const nums = (values || []).map((v) => (v === null || v === undefined || Number.isNaN(v) ? null : Number(v)));
  const valid = nums.filter((v) => v !== null);
  if (!valid.length) return "";
  let min = range?.min ?? Math.min(...valid);
  let max = range?.max ?? Math.max(...valid);
  if (max === min) {
    max += 1;
    min -= 1;
  }
  const span = max - min;
  const step = nums.length > 1 ? (w - pad * 2) / (nums.length - 1) : 0;
  let d = "";
  let pen = false;
  nums.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    const x = pad + i * step;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    d += `${pen ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    pen = true;
  });
  return d;
}

export function areaPath(values, w = 100, h = 28, pad = 2, range = null) {
  const line = sparkPath(values, w, h, pad, range);
  if (!line) return "";
  return `${line}L${w - pad},${h - pad}L${pad},${h - pad}Z`;
}

export function downsample(values, target = 48) {
  if (!values || values.length <= target) return values;
  const out = [];
  const step = values.length / target;
  for (let i = 0; i < target; i++) {
    const a = Math.floor(i * step);
    const b = Math.max(a + 1, Math.floor((i + 1) * step));
    let sum = 0;
    let n = 0;
    for (let j = a; j < b && j < values.length; j++) {
      const v = values[j];
      if (v !== null && v !== undefined && !Number.isNaN(Number(v))) {
        sum += Number(v);
        n++;
      }
    }
    out.push(n ? sum / n : null);
  }
  return out;
}

export function seriesFromHistory(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const v = r?.s ?? r?.state;
    const n = Number(v);
    return v === "unavailable" || v === "unknown" || Number.isNaN(n) ? null : n;
  });
}

export function uid(prefix = "g") {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}
