import { icon } from "../../render/icons";
import type { AlertModel } from "../../types";
import type { LayerContext, SheetApp } from "./types";

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function header(
  ctx: LayerContext,
  kicker: string,
  title: string,
  summary: string,
): string {
  const app = ctx.app as Partial<SheetApp> | undefined;
  if (app && typeof app._sheetHeader === "function") {
    return app._sheetHeader(kicker, title, summary);
  }
  return `<div class="sheet-head"><div class="eyebrow">${esc(
    kicker,
  )}</div><h2>${esc(title)}</h2><p>${esc(summary)}</p></div>`;
}

function severityClass(alert: AlertModel): "crit" | "warn" | "info" {
  if (alert.sev >= 3) return "crit";
  if (alert.sev === 2) return "warn";
  return "info";
}

/**
 * Alerts: every model alert, most severe first, with a chip and a route back
 * to the layer that owns the problem.
 */
export function renderAlertsSheet(ctx: LayerContext): string {
  const { model, t } = ctx;
  const alerts = [...(model.alerts ?? [])].sort((a, b) => b.sev - a.sev);

  const summary = alerts.length
    ? t("alerts.summaryCount", { count: alerts.length })
    : t("alerts.summaryCalm");

  const body = alerts.length
    ? alerts
        .map((alert) => {
          const cls = severityClass(alert);
          const label =
            cls === "crit"
              ? t("alerts.critical")
              : cls === "warn"
                ? t("alerts.warning")
                : t("alerts.info");
          return `<div class="row alert-row" data-nav="${esc(
            alert.route,
          )}"><span class="alert-dot ${cls}"></span><span class="row-main"><div class="row-name">${esc(
            alert.title,
          )}</div><div class="row-sub">${esc(
            alert.text,
          )}</div></span><span class="chip ${cls}">${label}</span><span class="row-link">${t(
            "alerts.see",
          )} ${icon("arrow")}</span></div>`;
        })
        .join("")
    : `<div class="empty">${icon("check")}<span>${esc(
        t("alerts.emptyTitle"),
      )}<br>${esc(t("alerts.emptyText"))}</span></div>`;

  return `${header(
    ctx,
    t("sheet.kickerAlerts"),
    t("sheet.titleAlerts"),
    summary,
  )}<div class="sheet-scroll"><div class="block"><div class="list">${body}</div><div class="note">${t(
    "alerts.footer",
  )}</div></div></div>`;
}
