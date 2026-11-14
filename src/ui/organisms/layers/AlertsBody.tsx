import { useActions, useModel, useTranslator } from "../../hooks";
import { EmptyState } from "../../atoms/EmptyState";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { AlertRow, severityClass } from "./misc/AlertRow";
import { LayerShell } from "./misc/LayerShell";

/**
 * Alerts: every model alert, most severe first, with a severity chip and a
 * route back to the layer that owns the problem.
 */
export function AlertsBody(_props: LayerBodyProps) {
  const model = useModel();
  const t = useTranslator();
  const actions = useActions();

  const alerts = [...(model.alerts ?? [])].sort((a, b) => b.sev - a.sev);
  const summary = alerts.length
    ? t("alerts.summaryCount", { count: alerts.length })
    : t("alerts.summaryCalm");

  return (
    <LayerShell>
      <SheetHeader
        kicker={t("sheet.kickerAlerts")}
        title={t("sheet.titleAlerts")}
        sum={summary}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className="sheet-scroll">
        <div className="block">
          <div className="list">
            {alerts.length ? (
              alerts.map((alert) => {
                const cls = severityClass(alert);
                return (
                  <AlertRow
                    key={alert.key}
                    alert={alert}
                    label={
                      cls === "crit"
                        ? t("alerts.critical")
                        : cls === "warn"
                          ? t("alerts.warning")
                          : t("alerts.info")
                    }
                    see={t("alerts.see")}
                    onOpen={() => actions.navigate(alert.route)}
                  />
                );
              })
            ) : (
              <EmptyState
                icon="check"
                title={t("alerts.emptyTitle")}
                hint={t("alerts.emptyText")}
              />
            )}
          </div>
          <div className="note">{t("alerts.footer")}</div>
        </div>
      </div>
    </LayerShell>
  );
}
