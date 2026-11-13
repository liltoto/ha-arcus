/**
 * Visual editor for the `custom:arcus` dashboard strategy.
 *
 * The strategy config contains the dashboard/view titles and a full card
 * config. The card config is edited by embedding the native card editor, so
 * both entry points share exactly one implementation.
 */
import { ArcusConfigEditor, EDITOR_STYLES } from "./editor";
import type { ArcusHass } from "./types";

type ConfigRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ConfigRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Editor for the strategy config:
 * `{ type, dashboard_title, view_title, card }`.
 */
export class ArcusStrategyEditor extends HTMLElement {
  static getStubConfig(): ConfigRecord {
    return {
      type: "custom:arcus",
      dashboard_title: "Arcus",
      view_title: "Hjem",
      card: { type: "custom:arcus-card" },
    };
  }

  private _config: ConfigRecord = {};
  private _hass?: ArcusHass;
  private _cardEditor?: ArcusConfigEditor;
  private _lastEmitted = "";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.render();
  }

  /** Home Assistant frontend object, forwarded to the embedded card editor. */
  set hass(value: ArcusHass | undefined) {
    this._hass = value;
    if (this._cardEditor) this._cardEditor.hass = value;
  }

  get hass(): ArcusHass | undefined {
    return this._hass;
  }

  /** Set the strategy configuration. The object is copied, never mutated. */
  setConfig(config: unknown): void {
    this._config = isRecord(config) ? clone(config) : {};
    if (!isRecord(this._config.card)) {
      this._config.card = { type: "custom:arcus-card" };
    }
    this._lastEmitted = "";
    this.render();
  }

  /** The current (uncommitted) strategy configuration. */
  getConfig(): ConfigRecord {
    return clone(this._config);
  }

  private render(): void {
    const root = this.shadowRoot;
    if (!root) return;

    const dashboardTitle =
      typeof this._config.dashboard_title === "string"
        ? this._config.dashboard_title
        : "";
    const viewTitle =
      typeof this._config.view_title === "string"
        ? this._config.view_title
        : "";

    root.innerHTML = `<style>${EDITOR_STYLES}</style>
      <div class="wrap">
        <div>
          <h2>Arcus dashboard</h2>
          <p class="hint">Name the dashboard and the generated view, then configure the Arcus card that fills it.</p>
        </div>
        <div class="grid">
          <label class="field">
            <span>Dashboard title</span>
            <input type="text" name="dashboard_title" value="${escapeHtml(dashboardTitle)}" placeholder="Arcus" autocomplete="off">
          </label>
          <label class="field">
            <span>View title</span>
            <input type="text" name="view_title" value="${escapeHtml(viewTitle)}" placeholder="Hjem" autocomplete="off">
          </label>
        </div>
        <section class="section">
          <h3>Card</h3>
          <p class="hint">The Arcus card is the only card in the generated dashboard.</p>
          <div class="card-editor-slot"></div>
        </section>
      </div>`;

    const slot = root.querySelector<HTMLElement>(".card-editor-slot");
    if (!slot) return;

    const cardEditor = new ArcusConfigEditor();
    cardEditor.addEventListener("config-changed", this.onCardChanged);
    cardEditor.setConfig(
      isRecord(this._config.card)
        ? this._config.card
        : { type: "custom:arcus-card" },
    );
    slot.appendChild(cardEditor);
    if (this._hass) cardEditor.hass = this._hass;
    this._cardEditor = cardEditor;

    root
      .querySelectorAll<HTMLInputElement>(
        'input[name="dashboard_title"], input[name="view_title"]',
      )
      .forEach((input) => {
        input.addEventListener("input", this.onTitleChanged);
        input.addEventListener("change", this.onTitleChanged);
      });
  }

  /**
   * The embedded card editor emits the same `config-changed` event as this
   * editor. Stop it before it leaves the strategy shadow root and re-emit one
   * strategy-level event instead; otherwise Home Assistant would receive the
   * card config as if it were the strategy config.
   */
  private onCardChanged = (event: Event): void => {
    event.stopPropagation();
    const detail = (event as CustomEvent<{ config?: unknown }>).detail;
    this._config.card = isRecord(detail?.config)
      ? clone(detail.config)
      : { type: "custom:arcus-card" };
    this.commit();
  };

  private onTitleChanged = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const name = target.getAttribute("name");
    if (name !== "dashboard_title" && name !== "view_title") return;

    if (target.value.trim()) this._config[name] = target.value;
    else delete this._config[name];
    this.commit();
  };

  private commit(): void {
    const signature = JSON.stringify(this._config);
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
}

export default ArcusStrategyEditor;

/** The tag Home Assistant uses for the dashboard strategy editor. */
export const ARCUS_STRATEGY_EDITOR_TAG = "arcus-strategy-editor";

if (
  typeof customElements !== "undefined" &&
  !customElements.get(ARCUS_STRATEGY_EDITOR_TAG)
) {
  customElements.define(ARCUS_STRATEGY_EDITOR_TAG, ArcusStrategyEditor);
}
