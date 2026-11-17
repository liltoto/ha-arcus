import type { HistoryCache } from "../../../../data/history";
import type { ResolvedHistoryRange } from "../../../../range";
import type { Translator } from "../../../../types";
import { ListRow } from "../../../molecules/ListRow";
import { Readout } from "../../../molecules/Readout";
import { c } from "../../../styles/classes";
import { EnergyDayPrices } from "./EnergyDayPrices";
import type { EnergyView } from "./energy-view";

interface EnergyPriceProps {
  view: EnergyView;
  t: Translator;
  history: HistoryCache;
  range: ResolvedHistoryRange;
  priceEntity: string | undefined;
}

/**
 * The always-rendered price section: the current buy price, the cheapest
 * window, the day curve, and the today readings.
 */
export const EnergyPrice = ({
  view,
  t,
  history,
  range,
  priceEntity,
}: EnergyPriceProps) => {
  return (
    <>
      <div className={c("block")}>
        <div className={c("big-read")}>
          {view.buyText}
          <small>{view.priceUnit}</small>
        </div>
        <div className={c("block-note")}>{view.nowNote}</div>
        <EnergyDayPrices
          price={view.price}
          history={history}
          range={range}
          priceEntity={priceEntity}
          now={view.nowDate}
          t={t}
          currency={view.currency}
        />
        <div className={c("mini-grid")} style={{ marginTop: 12 }}>
          <div className={c("mini-stat")}>
            <div className={c("k")}>{t("energy.cheapest", { count: 3 })}</div>
            <div className={c("v")}>
              {view.cheapText}
              <small>{view.currency}</small>
            </div>
            <div className={c("row-sub")}>
              {view.cheap
                ? t("energy.hourRange", {
                    start: view.cheapStart,
                    end: view.cheapEnd,
                  })
                : "–"}
            </div>
          </div>
          <div className={c("mini-stat")}>
            <div className={c("k")}>{t("energy.tomorrow")}</div>
            <div className={c("v")} style={{ fontSize: 18 }}>
              {view.tomorrow
                ? t("energy.tomorrowPublished")
                : t("energy.tomorrowNotYet")}
            </div>
            <div className={c("row-sub")}>
              {view.tomorrow
                ? t("energy.tomorrowSee")
                : t("energy.tomorrowTypical")}
            </div>
          </div>
        </div>
      </div>
      <div className={c("block")}>
        <div className={c("block-label")}>{t("energy.pricesNow")}</div>
        <div className={c("readings")}>
          <Readout
            label={t("energy.buy")}
            value={view.buyText}
            unit={view.currency}
          />
          <Readout
            label={t("energy.sell")}
            value={view.sellText}
            unit={view.currency}
          />
          <Readout
            label={t("energy.spot")}
            value={view.spotText}
            unit={view.currency}
          />
          <Readout
            label={t("energy.nextHour")}
            value={view.nextText}
            unit={view.currency}
          />
        </div>
      </div>
      <div className={c("block")}>
        <div className={c("block-head")}>
          <div className={c("block-label")}>{t("energy.todayPrices")}</div>
        </div>
        <div className={c("list")}>
          <ListRow
            icon="drop"
            name={t("energy.lowest")}
            sub={t("common.today")}
            value={view.lowestText}
            unit={view.currency}
          />
          <ListRow
            icon="flame"
            name={t("energy.highest")}
            sub={t("common.today")}
            value={view.highestText}
            unit={view.currency}
          />
          <ListRow
            icon="clock"
            name={t("energy.previousHour")}
            value={view.previousText}
            unit={view.currency}
          />
        </div>
      </div>
    </>
  );
};
