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
import { escapeHtml } from "./format";
import type { ArcusConfigInput, ArcusHass, AreaRegistryEntry } from "./types";

interface EntityField {
  path: string;
  label: string;
  placeholder?: string;
}

interface EntityGroup {
  title: string;
  fields: EntityField[];
}

const ENTITY_GROUPS: EntityGroup[] = [
  {
    title: "Weather",
    fields: [
      { path: "weather", label: "Weather entity", placeholder: "weather.home" },
    ],
  },
  {
    title: "Energy price",
    fields: [
      { path: "price.current", label: "Current price" },
      { path: "price.sell", label: "Sell price" },
      { path: "price.forecast", label: "Price forecast" },
    ],
  },
  {
    title: "Solar",
    fields: [
      { path: "solar.power", label: "Power now" },
      { path: "solar.today", label: "Production today" },
      { path: "solar.forecastToday", label: "Forecast today" },
      { path: "solar.batterySoc", label: "Battery state of charge" },
      { path: "solar.load", label: "Home load" },
      { path: "solar.grid", label: "Grid power" },
      { path: "solar.batteryPower", label: "Battery power" },
    ],
  },
  {
    title: "Prayers",
    fields: [
      { path: "prayers.fajr", label: "Fajr" },
      { path: "prayers.dhuhr", label: "Dhuhr" },
      { path: "prayers.asr", label: "Asr" },
      { path: "prayers.maghrib", label: "Maghrib" },
      { path: "prayers.isha", label: "Isha" },
      { path: "prayers.sunrise", label: "Sunrise" },
    ],
  },
  {
    title: "Water",
    fields: [
      { path: "water.state", label: "State" },
      { path: "water.flow", label: "Flow" },
      { path: "water.day", label: "Today" },
      { path: "water.month", label: "This month" },
      { path: "water.total", label: "Total" },
      { path: "water.salt", label: "Salt level" },
      { path: "water.saltDays", label: "Salt days left" },
      { path: "water.holiday", label: "Holiday mode" },
    ],
  },
  {
    title: "Network",
    fields: [
      { path: "network.router", label: "Router" },
      { path: "network.routerState", label: "Router state" },
      { path: "network.google", label: "Google" },
      { path: "network.cloudflare", label: "Cloudflare" },
    ],
  },
  {
    title: "Economy",
    fields: [
      { path: "economy.bond", label: "Bond price" },
      { path: "economy.change", label: "Change" },
      { path: "economy.yield", label: "Yield" },
      { path: "economy.duration", label: "Duration" },
    ],
  },
  {
    title: "Ventilation",
    fields: [
      { path: "ventilation.climate", label: "Climate entity" },
      { path: "ventilation.temperature", label: "Temperature" },
      { path: "ventilation.humidity", label: "Humidity" },
      { path: "ventilation.step", label: "Fan step" },
      { path: "ventilation.filter", label: "Filter status" },
    ],
  },
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

function getPath(source: unknown, path: string): unknown {
  let node: unknown = source;
  for (const key of path.split(".")) {
    if (!isRecord(node)) return undefined;
    node = node[key];
  }
  return node;
}

function setPath(target: ConfigRecord, path: string, value: unknown): void {
  const keys = path.split(".");
  let node = target;
  for (const key of keys.slice(0, -1)) {
    if (!isRecord(node[key])) node[key] = {};
    node = node[key] as ConfigRecord;
  }
  node[keys[keys.length - 1]] = value;
}

function deletePath(target: ConfigRecord, path: string): void {
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
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function areasSignature(hass?: ArcusHass): string {
  if (!hass?.areas) return "";
  return Object.values(hass.areas)
    .map((area) => `${area.area_id}:${area.name}:${area.icon ?? ""}`)
    .sort()
    .join("|");
}

function sortedAreas(hass?: ArcusHass): AreaRegistryEntry[] {
  return Object.values(hass?.areas ?? {}).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function selectMarkup(
  name: string,
  label: string,
  options: readonly (readonly [string, string])[],
  selected: string,
): string {
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
}

function textMarkup(
  name: string,
  label: string,
  value: string,
  placeholder = "",
  hint = "",
): string {
  return `<label class="field">
    <span>${escapeHtml(label)}</span>
    <input type="text" name="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" spellcheck="false" autocomplete="off">
    ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
  </label>`;
}

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
  private _hasRendered = false;
  private _lastEmitted = "";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.render();
  }

  /** Home Assistant frontend object. Used for the area registry only. */
  set hass(value: ArcusHass | undefined) {
    const nextSignature = areasSignature(value);
    const hadHass = this._hass !== undefined;
    const areasChanged = nextSignature !== this._areaSignature;
    this._hass = value;
    if (!this._hasRendered || areasChanged || !hadHass) this.render();
  }

  get hass(): ArcusHass | undefined {
    return this._hass;
  }

  /**
   * Set the card configuration. The object is copied, so the editor never
   * mutates Home Assistant's in-memory dashboard config.
   */
  setConfig(config: unknown): void {
    this._config = isRecord(config) ? clone(config) : {};
    this._lastEmitted = "";
    this.render();
    try {
      normalizeConfig(this._config);
    } catch (error) {
      this.showError(`Invalid configuration: ${errorMessage(error)}`);
    }
  }

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
          <div class="grid">${group.fields.map((field) => textMarkup(field.path, field.label, this.stringAt(field.path), field.placeholder ?? "entity_id")).join("")}</div>
        </div>
      </details>`,
    ).join("");

    const areaOrder = areaConfig.order.join(", ");

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
        </div>
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
          ${entityGroups}
        </section>
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

    if (name === "areas.include" || name === "areas.exclude") {
      if (!(target instanceof HTMLInputElement)) return;
      this.setAreaMembership(
        name === "areas.include" ? "include" : "exclude",
        target.value,
        target.checked,
      );
    } else if (name === "areas.order") {
      const order = target.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      this.setAreas({ order });
    } else if (name === "title" || name === "subtitle") {
      setPath(this._config, name, target.value);
    } else if (
      name === "language" ||
      name === "appearance" ||
      name === "atmosphere" ||
      name === "density"
    ) {
      setPath(this._config, name, target.value);
    } else {
      const value = target.value.trim();
      if (value) setPath(this._config, name, value);
      else deletePath(this._config, name);
    }

    this.syncAdvancedJson();
    this.commit();
  };

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
