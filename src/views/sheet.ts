import type { SheetRoute } from "../types";
import { renderAlertsSheet } from "./layers/alerts";
import { renderAllSheet } from "./layers/all";
import { renderEconomySheet } from "./layers/economy";
import { renderEnergySheet } from "./layers/energy";
import { renderHeatingSheet } from "./layers/heating";
import { renderLightsSheet } from "./layers/lights";
import { renderPrayersSheet } from "./layers/prayers";
import { renderRoomSheet } from "./layers/room";
import { renderSecuritySheet } from "./layers/security";
import { renderSolarSheet } from "./layers/solar";
import { renderTechSheet } from "./layers/tech";
import type { LayerContext, SheetApp } from "./layers/types";
import { renderVentSheet } from "./layers/ventilation";
import { renderWaterSheet } from "./layers/water";

/**
 * Render the body of one sheet route.
 *
 * The card owns the sheet frame (scrim, grab handle, close button) and passes
 * its own app object so the layers can read live entity values and issue
 * service calls through the card's delegation.
 */
export function renderSheet(route: SheetRoute, ctx: LayerContext): string {
  switch (route.base) {
    case "rum":
      return renderRoomSheet(ctx, route.sub);
    case "lys":
      return renderLightsSheet(ctx);
    case "varme":
      return renderHeatingSheet(ctx);
    case "ventilation":
      return renderVentSheet(ctx);
    case "energi":
      return renderEnergySheet(ctx);
    case "sol":
      return renderSolarSheet(ctx, route.sub);
    case "vand":
      return renderWaterSheet(ctx);
    case "sikkerhed":
      return renderSecuritySheet(ctx);
    case "teknik":
      return renderTechSheet(ctx);
    case "oekonomi":
      return renderEconomySheet(ctx);
    case "bon":
      return renderPrayersSheet(ctx);
    case "alarmer":
      return renderAlertsSheet(ctx);
    case "alle":
      return renderAllSheet(ctx);
    case "skur":
      return renderRoomSheet(ctx, "skur");
    default:
      return `<div class="sheet-scroll"><div class="empty">${ctx.t(
        "empty.dataYet",
      )}</div></div>`;
  }
}

/**
 * The sheet surface rendered in the card's light DOM.
 *
 * The card sets `app` and `route`; `update()` is called from the card's hass
 * refresh. Scroll position is preserved across the re-render, and a focused
 * form control suppresses the refresh so a slider drag is not interrupted.
 */
export class ArcusSheets extends HTMLElement {
  private _app: SheetApp | null = null;
  private _route: SheetRoute | null = null;

  set app(value: SheetApp | null) {
    this._app = value;
    if (this.isConnected && this._route) this.render();
  }

  get app(): SheetApp | null {
    return this._app;
  }

  set route(value: SheetRoute | null) {
    this._route = value;
    if (this.isConnected && this._app) this.render();
  }

  get route(): SheetRoute | null {
    return this._route;
  }

  connectedCallback(): void {
    if (this._app && this._route) this.render();
  }

  render(): void {
    if (!this._app || !this._route) return;
    const app = this._app;
    const ctx: LayerContext = {
      model: app._model,
      config: app._config,
      t: app._t,
      history: app._history,
      app,
    };
    this.innerHTML = renderSheet(this._route, ctx);
  }

  update(): void {
    if (!this._app || !this._route) return;

    const root = this.getRootNode() as Document | ShadowRoot;
    const active = root.activeElement ?? this.ownerDocument?.activeElement;
    if (
      active &&
      this.contains(active) &&
      /^(INPUT|SELECT|TEXTAREA)$/i.test(active.tagName)
    ) {
      return;
    }

    const scroll = this.querySelector<HTMLElement>(".sheet-scroll");
    const scrollTop = scroll?.scrollTop ?? 0;

    this.render();

    const next = this.querySelector<HTMLElement>(".sheet-scroll");
    if (next) next.scrollTop = scrollTop;

    this._app._refreshConfirm();
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("arcus-sheets")
) {
  customElements.define("arcus-sheets", ArcusSheets);
}
