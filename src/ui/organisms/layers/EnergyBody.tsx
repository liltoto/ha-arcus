import { useHistoryFrame } from "../../hooks/useLayerFrame";
import { Icon } from "../../atoms/Icon";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { c } from "../../styles/classes";
import { EnergyDevices } from "./energy/EnergyDevices";
import { EnergyPrice } from "./energy/EnergyPrice";
import { resolveEnergyView } from "./energy/energy-view";

/**
 * The energy sheet, ported from `views/layers/energy.ts`.
 *
 * The price section always renders; the optional EV, standby, and appliance
 * blocks come from `config.energy` and read their live values from `hass`.
 */
export const EnergyBody = (_props: LayerBodyProps) => {
  const { hass, model, config, t, history, now, actions } = useHistoryFrame();
  const view = resolveEnergyView(hass, model, config, history, now, t);

  return (
    <div
      data-react-layer
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
      }}
    >
      <SheetHeader
        kicker={t("sheet.kickerEnergy")}
        title={t("sheet.titleEnergy")}
        sum={view ? view.summary : t("empty.data")}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className={c("sheet-scroll")}>
        {view ? (
          <>
            <EnergyPrice view={view} t={t} />
            <EnergyDevices
              ev={view.ev}
              standby={view.standby}
              appliances={view.appliances}
              hass={hass}
              history={history}
              t={t}
              language={view.language}
            />
            <div className={c("btn-row")}>
              <button
                type="button"
                className={c("btn small")}
                data-nav="sol"
                onClick={() => actions.openSheet("sol")}
              >
                {t("sheet.titleSolar")}
              </button>
              <button
                type="button"
                className={c("btn small")}
                data-nav="vand"
                onClick={() => actions.openSheet("vand")}
              >
                {t("sheet.titleWater")}
              </button>
              <button
                type="button"
                className={c("btn small")}
                data-nav="teknik"
                onClick={() => actions.openSheet("teknik")}
              >
                {t("sheet.titleTech")}
              </button>
            </div>
          </>
        ) : (
          <div className={c("empty")}>
            <Icon name="bolt" />
            <span>{t("empty.data")}</span>
          </div>
        )}
      </div>
    </div>
  );
};
