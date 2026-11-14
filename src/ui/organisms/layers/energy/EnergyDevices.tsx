import type { HistoryCache } from "../../../../data/history";
import { formatNumber } from "../../../../format";
import type {
  ArcusHass,
  EnergyApplianceConfig,
  EnergyEvConfig,
  Language,
  Translator,
} from "../../../../types";
import { ListRow } from "../../../molecules/ListRow";
import { Readout } from "../../../molecules/Readout";
import { c } from "../../../styles/classes";
import { liveNumber, liveOn } from "./energy-view";

interface EnergyReadingProps {
  hass: ArcusHass;
  history: HistoryCache;
  t: Translator;
  language: Language;
}

/** One optional EV block driven by `config.energy.ev`. */
function EvBlock({
  ev,
  hass,
  history,
  t,
  language,
}: EnergyReadingProps & { ev: EnergyEvConfig }) {
  const plugged = liveOn(hass, ev.plugged, undefined);
  const value = (entityId: string, digits: number): string =>
    formatNumber(liveNumber(hass, history, entityId, null), digits, language);

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{ev.name || t("energy.tesla")}</div>
        <div className={c("block-label")}>
          <b>{plugged ? t("energy.plugged") : t("energy.unplugged")}</b>
        </div>
      </div>
      <div className={c("readings")}>
        {ev.power ? (
          <Readout
            label={t("energy.power")}
            value={value(ev.power, 0)}
            unit={t("energy.w")}
          />
        ) : null}
        {ev.session ? (
          <Readout
            label={t("energy.session")}
            value={value(ev.session, 1)}
            unit={t("energy.kwh")}
          />
        ) : null}
        {ev.total ? (
          <Readout
            label={t("energy.total")}
            value={value(ev.total, 0)}
            unit={t("energy.kwh")}
          />
        ) : null}
        {ev.soc ? (
          <Readout label={t("solar.soc")} value={value(ev.soc, 0)} unit="%" />
        ) : null}
      </div>
    </div>
  );
}

/** The optional standby and appliance list driven by `config.energy`. */
function AppliancesBlock({
  standby,
  appliances,
  hass,
  history,
  t,
  language,
}: EnergyReadingProps & {
  standby: string | undefined;
  appliances: EnergyApplianceConfig[];
}) {
  const standbyValue = liveNumber(hass, history, standby, null);
  const value = (entityId: string): string =>
    formatNumber(liveNumber(hass, history, entityId, null), 0, language);

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("energy.appliances")}</div>
        {standby ? (
          <div className={c("block-label")}>
            <b>
              {t("energy.standbyKwh", {
                value: formatNumber(standbyValue, 1, language),
              })}
            </b>
          </div>
        ) : null}
      </div>
      <div className={c("list")}>
        {appliances.map((appliance, index) => (
          <ListRow
            key={`${appliance.entity}:${index}`}
            icon={appliance.icon || "bolt"}
            name={appliance.name}
            value={value(appliance.entity)}
            unit={t("energy.w")}
          />
        ))}
      </div>
    </div>
  );
}

interface EnergyDevicesProps extends EnergyReadingProps {
  ev: EnergyEvConfig | undefined;
  standby: string | undefined;
  appliances: EnergyApplianceConfig[];
}

/** The optional EV and appliance blocks below the price section. */
export function EnergyDevices({
  ev,
  standby,
  appliances,
  hass,
  history,
  t,
  language,
}: EnergyDevicesProps) {
  return (
    <>
      {ev ? (
        <EvBlock
          ev={ev}
          hass={hass}
          history={history}
          t={t}
          language={language}
        />
      ) : null}
      {standby || appliances.length ? (
        <AppliancesBlock
          standby={standby}
          appliances={appliances}
          hass={hass}
          history={history}
          t={t}
          language={language}
        />
      ) : null}
    </>
  );
}
