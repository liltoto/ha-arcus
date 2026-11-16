/**
 * Native, framework-free visual editor for the Arcus card.
 *
 * The editor intentionally uses plain HTML controls instead of `ha-*`
 * components. That keeps it usable in tests, in the dev harness, and in every
 * Home Assistant frontend version without depending on frontend internals.
 *
 * Entity IDs are never checked against `hass.states`: an entity may be
 * temporarily unavailable or provided by an integration that is added later.
 * Only the shape of the configuration is validated.
 */
import { normalizeConfig } from "./config";
import { clone, isRecord } from "./editor-utils";
import type { ConfigRecord } from "./editor-utils";
import {
  datalistId,
  suggestEntities,
  type EntitySuggestionSpec,
} from "./editor-entities";
import { escapeHtml } from "./format";
import type {
  ArcusConfigInput,
  ArcusHass,
  AreaRegistryEntry,
  ChapterKey,
} from "./types";

interface EntityField {
  path: string;
  label: string;
  placeholder?: string;
  /** False for free-text values such as a name; defaults to an entity ID. */
  entity?: boolean;
  /** Field-specific entity filter for the native datalist. */
  suggest?: EntitySuggestionSpec;
}

interface EntityGroup {
  title: string;
  fields: EntityField[];
}

const PRICE_SENSOR: EntitySuggestionSpec = {
  domains: ["sensor"],
  name: /price|pris|elpris|spot|nord_?pool|energi_data|tibber|octopus|amber|electricity/i,
};
const POWER_SENSOR: EntitySuggestionSpec = {
  domains: ["sensor"],
  deviceClasses: ["power"],
};
const ENERGY_SENSOR: EntitySuggestionSpec = {
  domains: ["sensor"],
  deviceClasses: ["energy"],
};
const TEMP_SENSOR: EntitySuggestionSpec = {
  domains: ["sensor"],
  deviceClasses: ["temperature"],
};
const HUMIDITY_SENSOR: EntitySuggestionSpec = {
  domains: ["sensor"],
  deviceClasses: ["humidity"],
};
const BATTERY_SENSOR: EntitySuggestionSpec = {
  domains: ["sensor"],
  deviceClasses: ["battery"],
};
const PRAYER_SENSOR: EntitySuggestionSpec = {
  domains: ["sensor"],
  name: /prayer|fajr|dhuhr|asr|maghrib|isha|sunrise/i,
};
/**
 * EV/charger names, delimiter-aware so `car` no longer matches `carbon`,
 * `ev` no longer matches `level`, and `bil` no longer matches `bilresa`.
 * `charge`/`plug` are deliberately excluded: they also name wall plugs and
 * home-battery counters.
 */
const EV_NAME =
  /(^|[._\s-])(ev|elbil|bil|car)([._\s-]|$)|tesla|wall_connector|charger|charging_station|ladestander/i;

/** EV sensors that also mention the field marker. */
const evName = (marker: RegExp): RegExp => {
  return new RegExp(
    `(?=.*(?:${EV_NAME.source}))(?=.*(?:${marker.source}))`,
    "i",
  );
};

/** Water sensors that also mention the field marker (order-independent). */
const waterName = (field: RegExp): RegExp => {
  return new RegExp(
    `(?=.*(?:water|vand|bwt|softener|salt))(?=.*(?:${field.source}))`,
    "i",
  );
};

const ENTITY_GROUPS: EntityGroup[] = [
  {
    title: "Weather",
    fields: [
      {
        path: "weather",
        label: "Weather entity",
        placeholder: "weather.home",
        suggest: { domains: ["weather"] },
      },
    ],
  },
  {
    title: "Energy price",
    fields: [
      { path: "price.current", label: "Current price", suggest: PRICE_SENSOR },
      { path: "price.sell", label: "Sell price", suggest: PRICE_SENSOR },
      {
        path: "price.forecast",
        label: "Price forecast",
        suggest: {
          domains: ["sensor"],
          requireAttributes: ["raw_today", "today", "prices", "forecast"],
        },
      },
    ],
  },
  {
    title: "Energy & EV",
    fields: [
      {
        path: "energy.standby",
        label: "Standby power",
        suggest: POWER_SENSOR,
      },
      {
        path: "energy.ev.name",
        label: "EV name",
        placeholder: "EV",
        entity: false,
      },
      {
        path: "energy.ev.plugged",
        label: "EV plugged in",
        suggest: {
          domains: ["binary_sensor", "sensor", "input_boolean"],
          name: evName(
            /plug|tilsluttet|connected|charging|status|koretoj|vehicle/,
          ),
          strict: true,
        },
      },
      {
        path: "energy.ev.power",
        label: "EV charge power",
        suggest: {
          ...POWER_SENSOR,
          name: evName(/power|effekt|watt|charging/),
          strict: true,
        },
      },
      {
        path: "energy.ev.soc",
        label: "EV battery SoC",
        suggest: {
          ...BATTERY_SENSOR,
          name: evName(/soc|battery|level|percent|procent|charge/),
          strict: true,
        },
      },
    ],
  },
  {
    title: "Solar",
    fields: [
      {
        path: "solar.power",
        label: "Power now",
        suggest: {
          ...POWER_SENSOR,
          name: /pv.*power|solar.*power|inverter.*power|mppt/i,
          strict: true,
        },
      },
      {
        path: "solar.today",
        label: "Production today",
        suggest: {
          ...ENERGY_SENSOR,
          name: /(?!.*(remaining|tomorrow|next|forecast|_d[23]))(daily_production|production_today|today.*production|energy_today|generation_today|sol.*i_dag)/i,
          strict: true,
        },
      },
      {
        path: "solar.forecastToday",
        label: "Forecast today",
        suggest: {
          domains: ["sensor"],
          name: /energy_production_today(?!_)|solar.*forecast.*today|forecast.*solar.*today|solcast.*today|prognose.*i_dag/i,
          strict: true,
        },
      },
      {
        path: "solar.batterySoc",
        label: "Battery state of charge",
        suggest: {
          ...BATTERY_SENSOR,
          name: /soc|state_of_charge|battery_level|battery_percent|batteri.*(niveau|procent)|battery_soc/i,
          strict: true,
        },
      },
      {
        path: "solar.load",
        label: "Home load",
        suggest: {
          ...POWER_SENSOR,
          name: /load.*power|house.*load.*power|home.*power|hus.*bruger/i,
          strict: true,
        },
      },
      {
        path: "solar.grid",
        label: "Grid power",
        suggest: {
          ...POWER_SENSOR,
          name: /grid.*(power|total)|net.*(power|total)|export|import/i,
          strict: true,
        },
      },
      {
        path: "solar.batteryPower",
        label: "Battery power",
        suggest: {
          ...POWER_SENSOR,
          name: /battery.*power|batteri.*effekt|charge.*power|discharge.*power/i,
          strict: true,
        },
      },
      {
        path: "solar.pv1",
        label: "PV string 1",
        suggest: {
          ...POWER_SENSOR,
          name: /pv1|mppt1|string1/i,
          strict: true,
        },
      },
      {
        path: "solar.pv2",
        label: "PV string 2",
        suggest: {
          ...POWER_SENSOR,
          name: /pv2|mppt2|string2/i,
          strict: true,
        },
      },
    ],
  },
  {
    title: "Prayers",
    fields: [
      {
        path: "prayers.fajr",
        label: "Fajr",
        suggest: { ...PRAYER_SENSOR, name: /fajr/i },
      },
      {
        path: "prayers.dhuhr",
        label: "Dhuhr",
        suggest: { ...PRAYER_SENSOR, name: /dhuhr|zuhr/i },
      },
      {
        path: "prayers.asr",
        label: "Asr",
        suggest: { ...PRAYER_SENSOR, name: /asr/i },
      },
      {
        path: "prayers.maghrib",
        label: "Maghrib",
        suggest: { ...PRAYER_SENSOR, name: /maghrib/i },
      },
      {
        path: "prayers.isha",
        label: "Isha",
        suggest: { ...PRAYER_SENSOR, name: /isha/i },
      },
      {
        path: "prayers.sunrise",
        label: "Sunrise",
        suggest: { ...PRAYER_SENSOR, name: /sunrise|solopgang|sol_op/i },
      },
    ],
  },
  {
    title: "Water",
    fields: [
      {
        path: "water.softenerName",
        label: "Softener name",
        placeholder: "BWT Perla",
        entity: false,
      },
      {
        path: "water.state",
        label: "State",
        suggest: {
          domains: ["sensor"],
          name: waterName(/state|status|softener/),
          strict: true,
        },
      },
      {
        path: "water.flow",
        label: "Flow",
        suggest: {
          domains: ["sensor"],
          name: waterName(/flow|gennemstr|current_flow/),
          strict: true,
        },
      },
      {
        path: "water.day",
        label: "Today",
        suggest: {
          domains: ["sensor"],
          name: waterName(/day_output|today|dag\b/),
          strict: true,
        },
      },
      {
        path: "water.month",
        label: "This month",
        suggest: {
          domains: ["sensor"],
          name: waterName(/month|måned|maned/),
          strict: true,
        },
      },
      {
        path: "water.total",
        label: "Total",
        suggest: {
          domains: ["sensor"],
          name: waterName(/(?!.*(udgift|cost))(total|i_alt)/),
          strict: true,
        },
      },
      {
        path: "water.salt",
        label: "Salt level",
        suggest: {
          domains: ["sensor"],
          name: waterName(
            /salt.*(level|procent|percent|niveau)|regener.*level/,
          ),
          strict: true,
        },
      },
      {
        path: "water.saltDays",
        label: "Salt days left",
        suggest: {
          domains: ["sensor"],
          name: waterName(/salt.*(dag|day)|regener.*day/),
          strict: true,
        },
      },
      {
        path: "water.holiday",
        label: "Holiday mode",
        suggest: {
          domains: ["input_boolean", "switch", "binary_sensor"],
          name: /holiday|ferie|vacation/i,
        },
      },
    ],
  },
  {
    title: "Security",
    fields: [
      {
        path: "security.alarm",
        label: "Alarm panel",
        placeholder: "alarm_control_panel.home",
        suggest: { domains: ["alarm_control_panel"] },
      },
      {
        path: "security.windowAlert",
        label: "Window alert",
        suggest: {
          domains: ["input_boolean", "switch"],
          name: /window|vindue|alert|alarm/i,
        },
      },
    ],
  },
  {
    title: "Network",
    fields: [
      {
        path: "network.router",
        label: "Router",
        suggest: {
          domains: ["sensor"],
          name: /router.*(rtt|round_trip|ping|latency)|192_168_110_1.*(round_trip|rtt)|gateway.*(rtt|latency)/i,
          strict: true,
        },
      },
      {
        path: "network.routerState",
        label: "Router state",
        suggest: {
          domains: ["binary_sensor"],
          name: /router|gateway|192_168_110_1\b/i,
          strict: true,
        },
      },
      {
        path: "network.google",
        label: "Google",
        suggest: {
          domains: ["sensor"],
          name: /8_8_8_8.*(round_trip|rtt|latency)|google.*(rtt|latency|ping)/i,
          strict: true,
        },
      },
      {
        path: "network.cloudflare",
        label: "Cloudflare",
        suggest: {
          domains: ["sensor"],
          name: /1_1_1_1.*(round_trip|rtt|latency)|cloudflare.*(rtt|latency|ping)/i,
          strict: true,
        },
      },
    ],
  },
  {
    title: "Economy",
    fields: [
      {
        path: "economy.bond",
        label: "Bond price",
        suggest: {
          domains: ["sensor"],
          name: /bond|obligation|kurs|rente/i,
          strict: true,
        },
      },
      {
        path: "economy.change",
        label: "Change",
        suggest: {
          domains: ["sensor"],
          name: /aendring|ændring|change_percent|change_today/i,
          strict: true,
        },
      },
      {
        path: "economy.yield",
        label: "Yield",
        suggest: {
          domains: ["sensor"],
          name: /yield|effektiv_rente|rente\b/i,
          strict: true,
        },
      },
      {
        path: "economy.duration",
        label: "Duration",
        suggest: {
          domains: ["sensor"],
          name: /duration|varighed/i,
        },
      },
    ],
  },
  {
    title: "Ventilation",
    fields: [
      {
        path: "ventilation.name",
        label: "System name",
        placeholder: "Dantherm HCV 400",
        entity: false,
      },
      {
        path: "ventilation.climate",
        label: "Climate entity",
        suggest: {
          domains: ["climate", "fan"],
          name: /nilan|vallox|dantherm|flexit|duka|komfovent|vent|hrv|erv|air/i,
          strict: true,
        },
      },
      {
        path: "ventilation.temperature",
        label: "Temperature",
        suggest: TEMP_SENSOR,
      },
      {
        path: "ventilation.humidity",
        label: "Humidity",
        suggest: HUMIDITY_SENSOR,
      },
      {
        path: "ventilation.step",
        label: "Fan step",
        suggest: {
          domains: ["sensor"],
          name: /fan|step|trin|speed|hastighed/i,
        },
      },
      {
        path: "ventilation.filter",
        label: "Filter status",
        suggest: { domains: ["sensor"], name: /filter/i },
      },
    ],
  },
];

const TEMPERATURE_UNIT_OPTIONS = [
  ["", "Auto"],
  ["°C", "°C"],
  ["°F", "°F"],
] as const;

const CHAPTER_OPTIONS: ReadonlyArray<readonly [ChapterKey, string]> = [
  ["energi", "Energy"],
  ["sol", "Solar"],
  ["vand", "Water"],
  ["sikkerhed", "Security"],
  ["ventilation", "Ventilation"],
  ["teknik", "Tech & network"],
  ["oekonomi", "Economy"],
  ["lys", "Lighting"],
  ["varme", "Heating"],
  ["alarmer", "Alerts"],
];

const LANGUAGE_OPTIONS = [
  ["auto", "Auto"],
  ["da", "Dansk"],
  ["en", "English"],
] as const;

const APPEARANCE_OPTIONS = [
  ["auto", "Auto"],
  ["dark", "Dark"],
  ["light", "Light"],
] as const;

const ATMOSPHERE_OPTIONS = [
  ["auto", "Auto"],
  ["night", "Night"],
  ["dawn", "Dawn"],
  ["day", "Day"],
  ["dusk", "Dusk"],
] as const;

const DENSITY_OPTIONS = [
  ["comfortable", "Comfortable"],
  ["compact", "Compact"],
] as const;

const TEXT_SCALE_OPTIONS = [
  ["normal", "Normal"],
  ["large", "Large"],
  ["xlarge", "Extra large"],
] as const;

/** Shared styles for both editors. */
export const EDITOR_STYLES = `
  :host {
    display: block;
    color: var(--primary-text-color, #212121);
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, "Inter Tight", "Inter", sans-serif));
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  .wrap {
    display: grid;
    gap: 18px;
    max-width: 780px;
    padding: 4px 0;
  }
  h2, h3, h4 { margin: 0; font-weight: 600; line-height: 1.25; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
  h4 { font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--secondary-text-color, #727272); }
  p { margin: 0; }
  .hint {
    color: var(--secondary-text-color, #727272);
    font-size: 13px;
    line-height: 1.45;
  }
  .section {
    display: grid;
    gap: 10px;
    padding-top: 4px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 12px;
  }
  .field {
    display: grid;
    gap: 5px;
    min-width: 0;
  }
  .field > span {
    color: var(--secondary-text-color, #727272);
    font-size: 13px;
    font-weight: 500;
  }
  .field > small {
    color: var(--secondary-text-color, #727272);
    font-size: 12px;
    line-height: 1.4;
  }
  input[type="text"],
  select,
  textarea {
    width: 100%;
    min-width: 0;
    padding: 9px 11px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.35));
    border-radius: 8px;
    background: var(--card-background-color, var(--primary-background-color, #ffffff));
    color: var(--primary-text-color, #212121);
    font: inherit;
    font-size: 14px;
    line-height: 1.35;
  }
  input[type="text"]:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
  input::placeholder,
  textarea::placeholder {
    color: var(--secondary-text-color, #727272);
    opacity: 0.8;
  }
  details {
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.28));
    border-radius: 10px;
    padding: 0;
    overflow: hidden;
  }
  details > summary {
    padding: 11px 13px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    user-select: none;
  }
  details > summary:hover {
    background: var(--secondary-background-color, rgba(127, 127, 127, 0.06));
  }
  details > .details-body {
    display: grid;
    gap: 12px;
    padding: 2px 13px 14px;
  }
  .areas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }
  .area-column {
    display: grid;
    align-content: start;
    gap: 4px;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.24));
    border-radius: 10px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 28px;
    font-size: 14px;
    cursor: pointer;
  }
  .check input {
    flex: 0 0 auto;
    width: 17px;
    height: 17px;
    accent-color: var(--primary-color, #03a9f4);
  }
  .check span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .check small {
    color: var(--secondary-text-color, #727272);
    font-size: 11px;
  }
  .empty {
    color: var(--secondary-text-color, #727272);
    font-size: 13px;
    font-style: italic;
  }
  .error {
    padding: 10px 12px;
    border: 1px solid var(--error-color, #db4437);
    border-radius: 8px;
    background: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
    color: var(--error-color, #db4437);
    font-size: 13px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  textarea {
    min-height: 190px;
    resize: vertical;
    font-family: var(--code-font-family, "SFMono-Regular", Consolas, "Liberation Mono", monospace);
    font-size: 12px;
  }
  .card-editor-slot { display: block; }
  .card-editor-slot > arcus-config-editor { display: block; }
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    * { scroll-behavior: auto !important; transition: none !important; }
  }
`;

const getPath = (source: unknown, path: string): unknown => {
  let node: unknown = source;
  for (const key of path.split(".")) {
    if (!isRecord(node)) return undefined;
    node = node[key];
  }
  return node;
};

const setPath = (target: ConfigRecord, path: string, value: unknown): void => {
  const keys = path.split(".");
  let node = target;
  for (const key of keys.slice(0, -1)) {
    if (!isRecord(node[key])) node[key] = {};
    node = node[key] as ConfigRecord;
  }
  node[keys[keys.length - 1]] = value;
};

const deletePath = (target: ConfigRecord, path: string): void => {
  const keys = path.split(".");
  const parents: Array<[ConfigRecord, string]> = [];
  let node = target;
  for (const key of keys.slice(0, -1)) {
    const child = node[key];
    if (!isRecord(child)) return;
    parents.push([node, key]);
    node = child;
  }
  delete node[keys[keys.length - 1]];

  for (let index = parents.length - 1; index >= 0; index -= 1) {
    const [parent, key] = parents[index];
    const child = parent[key];
    if (isRecord(child) && Object.keys(child).length === 0) delete parent[key];
    else break;
  }
};

const errorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

/** Stable signature of a raw config, safe for non-serialisable values. */
const rawSignature = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "";
  }
};

/** Stable signature of a normalized config; falls back to the raw value. */
const normalizedSignature = (value: unknown): string => {
  try {
    return JSON.stringify(normalizeConfig(value));
  } catch {
    return rawSignature(value);
  }
};

interface FieldFocus {
  name: string;
  start: number | null;
  end: number | null;
}

interface EditorViewState {
  openSections: boolean[];
  focus: FieldFocus | null;
}

const captureViewState = (root: ShadowRoot): EditorViewState => {
  const sections = Array.from(root.querySelectorAll("details"));
  const active = root.activeElement;
  let focus: FieldFocus | null = null;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement
  ) {
    const name = active.getAttribute("name");
    if (name) {
      const isText =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement;
      focus = {
        name,
        start: isText ? active.selectionStart : null,
        end: isText ? active.selectionEnd : null,
      };
    }
  }
  return {
    openSections: sections.map((section) => section.open),
    focus,
  };
};

const restoreViewState = (root: ShadowRoot, state: EditorViewState): void => {
  if (state.openSections.length) {
    const sections = Array.from(root.querySelectorAll("details"));
    sections.forEach((section, index) => {
      if (state.openSections[index] !== undefined) {
        section.open = state.openSections[index];
      }
    });
  }
  if (!state.focus) return;
  const target = root.querySelector<HTMLElement>(
    `[name="${state.focus.name}"]`,
  );
  if (!target) return;
  target.focus();
  if (
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement) &&
    state.focus.start !== null
  ) {
    try {
      target.setSelectionRange(
        state.focus.start,
        state.focus.end ?? state.focus.start,
      );
    } catch {
      /* Some input types reject selection ranges. */
    }
  }
};

const areasSignature = (hass?: ArcusHass): string => {
  if (!hass?.areas) return "";
  return Object.values(hass.areas)
    .map((area) => `${area.area_id}:${area.name}:${area.icon ?? ""}`)
    .sort()
    .join("|");
};

const sortedAreas = (hass?: ArcusHass): AreaRegistryEntry[] => {
  return Object.values(hass?.areas ?? {}).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};

const selectMarkup = (
  name: string,
  label: string,
  options: readonly (readonly [string, string])[],
  selected: string,
): string => {
  const items = options
    .map(
      ([value, text]) =>
        `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(text)}</option>`,
    )
    .join("");
  return `<label class="field">
    <span>${escapeHtml(label)}</span>
    <select name="${escapeHtml(name)}">${items}</select>
  </label>`;
};

const textMarkup = (
  name: string,
  label: string,
  value: string,
  placeholder = "",
  hint = "",
  listId?: string,
): string => {
  const list = listId ? ` list="${escapeHtml(listId)}"` : "";
  return `<label class="field">
    <span>${escapeHtml(label)}</span>
    <input type="text" name="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"${list} spellcheck="false" autocomplete="off">
    ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
  </label>`;
};

const checkMarkup = (
  name: string,
  label: string,
  checked: boolean,
  hint = "",
): string => {
  return `<label class="check">
    <input type="checkbox" name="${escapeHtml(name)}"${checked ? " checked" : ""}>
    <span>${escapeHtml(label)}${hint ? ` <small>${escapeHtml(hint)}</small>` : ""}</span>
  </label>`;
};

/**
 * Visual editor for `custom:arcus-card`.
 *
 * The editor works on an unmodified copy of the incoming configuration and
 * only adds the fields the user actually touches. Defaults are shown as
 * placeholders or preselected options, never written into the config unless
 * the user changes them.
 */
export class ArcusConfigEditor extends HTMLElement {
  static getStubConfig(): ArcusConfigInput {
    return { type: "custom:arcus-card" };
  }

  private _config: ConfigRecord = {};
  private _hass?: ArcusHass;
  private _areaSignature = "";
  private _stateCount = 0;
  private _hasRendered = false;
  private _lastEmitted = "";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot?.addEventListener("keydown", this.onKeyDown);
    this.render();
  }

  /** Home Assistant frontend object. Used for the area registry and entity IDs. */
  set hass(value: ArcusHass | undefined) {
    const nextSignature = areasSignature(value);
    const hadHass = this._hass !== undefined;
    const areasChanged = nextSignature !== this._areaSignature;
    const stateCount = Object.keys(value?.states ?? {}).length;
    const statesAppeared = this._stateCount === 0 && stateCount > 0;
    this._hass = value;
    this._stateCount = stateCount;
    if (!this._hasRendered || areasChanged || !hadHass || statesAppeared) {
      this.render();
    }
  }

  get hass(): ArcusHass | undefined {
    return this._hass;
  }

  /**
   * Set the card configuration. The object is copied, so the editor never
   * mutates Home Assistant's in-memory dashboard config.
   *
   * Home Assistant calls this again with the config the editor just emitted.
   * That echo must not rebuild the form: rebuilding drops focus, caret, the
   * open `<details>` sections, and the dialog scroll position. Only a real
   * external change re-renders.
   */
  setConfig(config: unknown): void {
    const incoming = isRecord(config) ? clone(config) : {};
    const nextRaw = rawSignature(incoming);
    if (nextRaw === rawSignature(this._config)) return;

    const echo =
      nextRaw === this._lastEmitted ||
      normalizedSignature(incoming) === this._lastEmitted;
    this._config = incoming;

    if (echo) {
      this.syncAdvancedJson();
      return;
    }

    this._lastEmitted = "";
    this.render();
    try {
      normalizeConfig(this._config);
    } catch (error) {
      this.showError(`Invalid configuration: ${errorMessage(error)}`);
    }
  }

  /**
   * Keep Backspace/Delete inside the editor. Home Assistant's dashboard edit
   * mode listens for those keys at the document level and otherwise treats
   * them as "remove the selected card", which closes the dialog and scrolls
   * the page to the top.
   */
  private onKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      event.stopPropagation();
    }
  };

  /** The current (uncommitted) configuration. */
  getConfig(): ArcusConfigInput {
    return clone(this._config) as ArcusConfigInput;
  }

  connectedCallback(): void {
    if (!this._hasRendered) this.render();
  }

  private render(): void {
    const root = this.shadowRoot;
    if (!root) return;

    const areas = sortedAreas(this._hass);
    const areaConfig = this.displayAreas();
    const include = new Set(areaConfig.include);
    const exclude = new Set(areaConfig.exclude);
    const areaError = this._hass
      ? ""
      : `<p class="hint">The area registry is not available yet. Areas will appear when Home Assistant provides them.</p>`;

    const areaList = (group: "include" | "exclude", selected: Set<string>) => {
      if (!areas.length) return `<p class="empty">No areas found.</p>`;
      const rows: string[] = [];
      for (const area of areas) {
        const checked = selected.has(area.area_id) ? " checked" : "";
        rows.push(`<label class="check" data-area-id="${escapeHtml(area.area_id)}">
            <input type="checkbox" name="areas.${group}" value="${escapeHtml(area.area_id)}" data-area-id="${escapeHtml(area.area_id)}"${checked}>
            <span>${escapeHtml(area.name)} <small>${escapeHtml(area.area_id)}</small></span>
          </label>`);
      }
      return rows.join("");
    };

    const entityGroups = ENTITY_GROUPS.map(
      (group) => `<details class="group">
        <summary>${escapeHtml(group.title)}</summary>
        <div class="details-body">
          <div class="grid">${group.fields
            .map((field) =>
              textMarkup(
                field.path,
                field.label,
                this.stringAt(field.path),
                field.placeholder ?? "entity_id",
                "",
                field.suggest ? datalistId(field.path) : undefined,
              ),
            )
            .join("")}</div>
        </div>
      </details>`,
    ).join("");

    const chapters = CHAPTER_OPTIONS.map(([key, label]) =>
      checkMarkup(`chapters.${key}`, label, this.chapterEnabled(key)),
    ).join("");

    const areaOrder = areaConfig.order.join(", ");
    const view = captureViewState(root);

    root.innerHTML = `<style>${EDITOR_STYLES}</style>
      <div class="wrap">
        <div>
          <h2>Arcus card</h2>
          <p class="hint">Choose the look of the dashboard and connect the entities Arcus should use. Everything is optional; discovery fills the gaps.</p>
        </div>
        <div class="error" role="alert" aria-live="polite" hidden></div>
        <div class="grid">
          ${textMarkup("title", "Title", this.stringAt("title"), "HJEM")}
          ${textMarkup("subtitle", "Subtitle", this.stringAt("subtitle"), "ARCUS")}
        </div>
        <div class="grid">
          ${selectMarkup("language", "Language", LANGUAGE_OPTIONS, this.selectValue("language", "auto"))}
          ${selectMarkup("appearance", "Appearance", APPEARANCE_OPTIONS, this.selectValue("appearance", "auto"))}
          ${selectMarkup("atmosphere", "Atmosphere", ATMOSPHERE_OPTIONS, this.selectValue("atmosphere", "auto"))}
          ${selectMarkup("density", "Density", DENSITY_OPTIONS, this.selectValue("density", "comfortable"))}
          ${selectMarkup("text_scale", "Text size", TEXT_SCALE_OPTIONS, this.selectValue("text_scale", "normal"))}
        </div>
        <section class="section">
          <h3>Discovery</h3>
          <p class="hint">Arc fills the dashboard from the Home Assistant registries. Turn discovery off to use only the areas and entities configured here.</p>
          <div class="grid">
            ${checkMarkup("auto_discover", "Auto-discover rooms and entities", this._config.auto_discover !== false, "Recommended")}
            ${checkMarkup("group_by_floor", "Group rooms by floor", this._config.group_by_floor === true, "Uses the floor registry when available")}
          </div>
        </section>
        <section class="section">
          <h3>Areas</h3>
          <p class="hint">Leave the include list empty to show every area. An area can be included or excluded, not both. The order is a comma-separated list of area IDs.</p>
          ${areaError}
          <div class="areas">
            <div class="area-column">
              <h4>Include</h4>
              ${areaList("include", include)}
            </div>
            <div class="area-column">
              <h4>Exclude</h4>
              ${areaList("exclude", exclude)}
            </div>
          </div>
          ${textMarkup("areas.order", "Order", areaOrder, "stue, kokken, sovevaerelse", "Comma-separated area IDs. Areas not listed keep their registry order.")}
        </section>
        <section class="section">
          <h3>Entities</h3>
          <p class="hint">Optional entity overrides. An entity does not have to exist right now; it may be provided later.</p>
          ${this.entityDatalists()}
          ${entityGroups}
        </section>
        <details class="group">
          <summary>Units &amp; region</summary>
          <div class="details-body">
            <p class="hint">Leave a field empty to use Home Assistant's own units and currency.</p>
            <div class="grid">
              ${textMarkup("units.currency", "Currency", this.stringAt("units.currency"), "kr / EUR / USD")}
              ${textMarkup("units.price_unit", "Price unit", this.stringAt("units.price_unit"), "kr/kWh")}
              ${selectMarkup("units.temperature", "Temperature unit", TEMPERATURE_UNIT_OPTIONS, this.stringAt("units.temperature"))}
            </div>
          </div>
        </details>
        <details class="group">
          <summary>Chapters</summary>
          <div class="details-body">
            <p class="hint">Uncheck a chapter to hide it from the dashboard. Every chapter is shown by default.</p>
            <div class="grid">${chapters}</div>
          </div>
        </details>
        <details class="advanced">
          <summary>Advanced JSON</summary>
          <div class="details-body">
            <p class="hint">The full card configuration. The JSON is validated before it is applied; invalid input stays in the field and no change is emitted.</p>
            <textarea name="advanced_json" aria-label="Full configuration JSON" spellcheck="false">${escapeHtml(this.serializedConfig())}</textarea>
          </div>
        </details>
      </div>`;

    this._areaSignature = areasSignature(this._hass);
    this._hasRendered = true;

    root
      .querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea")
      .forEach((control) => {
        control.addEventListener("input", this.onFieldEvent);
        control.addEventListener("change", this.onFieldEvent);
        control.addEventListener("click", this.onCheckboxClick);
      });

    restoreViewState(root, view);
  }

  private onCheckboxClick = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      this.onFieldEvent(event);
    }
  };

  private onFieldEvent = (event: Event): void => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLSelectElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    const name = target.getAttribute("name");
    if (!name) return;

    if (name === "advanced_json") {
      if (!(target instanceof HTMLTextAreaElement)) return;
      this.applyAdvancedJson(target, event.type === "change");
      return;
    }

    if (name.startsWith("areas.")) {
      this.applyAreaField(name, target);
    } else if (name === "auto_discover" || name === "group_by_floor") {
      this.applyDiscoveryToggle(name, target);
    } else if (name.startsWith("chapters.")) {
      if (!(target instanceof HTMLInputElement)) return;
      setPath(this._config, name, target.checked);
    } else {
      this.applyScalarField(name, target.value);
    }

    this.syncAdvancedJson();
    this.commit();
  };

  private applyAreaField(
    name: string,
    target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  ): void {
    if (name === "areas.order") {
      const order = target.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      this.setAreas({ order });
      return;
    }
    if (!(target instanceof HTMLInputElement)) return;
    if (name !== "areas.include" && name !== "areas.exclude") return;
    this.setAreaMembership(
      name === "areas.include" ? "include" : "exclude",
      target.value,
      target.checked,
    );
  }

  private applyDiscoveryToggle(name: string, target: HTMLElement): void {
    if (!(target instanceof HTMLInputElement)) return;
    const enabledByDefault = name === "auto_discover";
    const on = target.checked;
    if (on === enabledByDefault) deletePath(this._config, name);
    else setPath(this._config, name, on);
  }

  private applyScalarField(name: string, raw: string): void {
    if (
      name === "title" ||
      name === "subtitle" ||
      name === "language" ||
      name === "appearance" ||
      name === "atmosphere" ||
      name === "density" ||
      name === "text_scale"
    ) {
      setPath(this._config, name, raw);
      return;
    }
    const value = raw.trim();
    if (value) setPath(this._config, name, value);
    else deletePath(this._config, name);
  }

  /**
   * Apply the advanced JSON field.
   *
   * While the user is typing (`input`), the config is applied and emitted but
   * the form is not rebuilt, so the textarea keeps focus and its caret. On
   * `change` (blur), the rest of the form is refreshed from the parsed config.
   */
  private applyAdvancedJson(
    textarea: HTMLTextAreaElement,
    rebuild: boolean,
  ): void {
    const parsed = this.readAdvancedJson(textarea);
    if (!parsed) return;

    this._config = parsed;
    if (rebuild) this.render();
    this.commit();
  }

  /**
   * Parse and validate the advanced JSON field. Returns the parsed object only
   * when it is both valid JSON and a valid Arcus configuration. Errors are
   * shown inline and never emitted as a config change.
   */
  private readAdvancedJson(textarea: HTMLTextAreaElement): ConfigRecord | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(textarea.value);
    } catch (error) {
      this.showError(`Invalid JSON: ${errorMessage(error)}`);
      return null;
    }

    if (!isRecord(parsed)) {
      this.showError("Invalid configuration: the JSON must be an object.");
      return null;
    }

    try {
      normalizeConfig(parsed);
    } catch (error) {
      this.showError(`Invalid configuration: ${errorMessage(error)}`);
      return null;
    }

    this.clearError();
    return parsed;
  }

  private commit(): void {
    let signature: string;
    try {
      signature = JSON.stringify(normalizeConfig(this._config));
    } catch (error) {
      this.showError(`Invalid configuration: ${errorMessage(error)}`);
      return;
    }

    this.clearError();
    if (signature === this._lastEmitted) return;
    this._lastEmitted = signature;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: clone(this._config) },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private displayAreas(): {
    include: string[];
    exclude: string[];
    order: string[];
  } {
    try {
      return normalizeConfig(this._config).areas;
    } catch {
      const raw = this._config.areas;
      if (Array.isArray(raw)) {
        return {
          include: raw.filter(
            (item): item is string => typeof item === "string",
          ),
          exclude: [],
          order: [],
        };
      }
      if (isRecord(raw)) {
        const strings = (value: unknown): string[] =>
          Array.isArray(value)
            ? value.filter((item): item is string => typeof item === "string")
            : [];
        return {
          include: strings(raw.include),
          exclude: strings(raw.exclude),
          order: strings(raw.order),
        };
      }
      return { include: [], exclude: [], order: [] };
    }
  }

  private setAreas(next: {
    include?: string[];
    exclude?: string[];
    order?: string[];
  }): void {
    const current = this.displayAreas();
    setPath(this._config, "areas", {
      include: current.include,
      exclude: current.exclude,
      order: current.order,
      ...next,
    });
  }

  private setAreaMembership(
    group: "include" | "exclude",
    areaId: string,
    checked: boolean,
  ): void {
    const current = this.displayAreas();
    const next = {
      include: [...current.include],
      exclude: [...current.exclude],
      order: [...current.order],
    };
    const other = group === "include" ? "exclude" : "include";

    next[group] = checked
      ? next[group].includes(areaId)
        ? next[group]
        : [...next[group], areaId]
      : next[group].filter((id) => id !== areaId);
    if (checked) next[other] = next[other].filter((id) => id !== areaId);

    setPath(this._config, "areas", next);

    // Keep the opposite checkbox in sync without a full re-render.
    if (checked) {
      this.shadowRoot
        ?.querySelectorAll<HTMLInputElement>(`input[name="areas.${other}"]`)
        .forEach((input) => {
          if (input.value === areaId) input.checked = false;
        });
    }
  }

  private stringAt(path: string): string {
    const value = getPath(this._config, path);
    return typeof value === "string" ? value : "";
  }

  private chapterEnabled(key: ChapterKey): boolean {
    const chapters = this._config.chapters;
    if (!isRecord(chapters)) return true;
    return chapters[key] !== false;
  }

  /**
   * One filtered `<datalist>` per entity field. Fields with the same purpose
   * share a spec, so the native suggestion popup only shows the sensors a
   * field can actually use instead of every entity in the home.
   */
  private entityDatalists(): string {
    const hass = this._hass;
    if (!hass?.states) return "";
    const blocks: string[] = [];
    for (const group of ENTITY_GROUPS) {
      for (const field of group.fields) {
        if (!field.suggest) continue;
        const ids = suggestEntities(hass, field.suggest);
        if (!ids.length) continue;
        const options = ids
          .map((id) => `<option value="${escapeHtml(id)}"></option>`)
          .join("");
        blocks.push(
          `<datalist id="${datalistId(field.path)}">${options}</datalist>`,
        );
      }
    }
    return blocks.join("");
  }

  private selectValue(name: string, fallback: string): string {
    const value = this._config[name];
    return typeof value === "string" ? value : fallback;
  }

  private serializedConfig(): string {
    return JSON.stringify(this._config, null, 2);
  }

  private syncAdvancedJson(): void {
    const textarea = this.shadowRoot?.querySelector<HTMLTextAreaElement>(
      'textarea[name="advanced_json"]',
    );
    if (!textarea) return;
    if (this.shadowRoot?.activeElement === textarea) return;
    textarea.value = this.serializedConfig();
  }

  private showError(message: string): void {
    const error = this.shadowRoot?.querySelector<HTMLElement>(".error");
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
    const advanced = this.shadowRoot?.querySelector<HTMLTextAreaElement>(
      'textarea[name="advanced_json"]',
    );
    advanced?.setAttribute("aria-invalid", "true");
  }

  private clearError(): void {
    const error = this.shadowRoot?.querySelector<HTMLElement>(".error");
    if (error) {
      error.textContent = "";
      error.hidden = true;
    }
    this.shadowRoot
      ?.querySelector<HTMLTextAreaElement>('textarea[name="advanced_json"]')
      ?.removeAttribute("aria-invalid");
  }
}

/** The tag Home Assistant uses for the card configuration element. */
const ARCUS_CONFIG_EDITOR_TAG = "arcus-config-editor";

if (
  typeof customElements !== "undefined" &&
  !customElements.get(ARCUS_CONFIG_EDITOR_TAG)
) {
  customElements.define(ARCUS_CONFIG_EDITOR_TAG, ArcusConfigEditor);
}
