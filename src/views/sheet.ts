import type { SheetRoute } from "../types";
import { renderHeatingSheet } from "./layers/heating";
import { renderLightsSheet } from "./layers/lights";
import { renderRoomSheet } from "./layers/room";
import type { LayerContext, SheetApp } from "./layers/types";
import { renderVentSheet } from "./layers/ventilation";

/**
 * Render the body of one sheet route.
 *
 * The card owns the sheet frame (scrim, grab handle, close button) and passes
 * its own app object so the layers can read live entity values and issue
 * service calls through the card's delegation. The layers that are not ported
 * yet return a calm placeholder; the integration owner replaces the branches
 * in a later task without changing this signature.
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
