import type { GraphInput } from "../../render/graph";
import { Icon } from "../atoms/Icon";
import {
  useActions,
  useBindings,
  useConfig,
  useHistory,
  useHistoryVersion,
  useModel,
  useNow,
  useTranslator,
} from "../hooks";
import { VitalStat } from "../molecules/VitalStat";

const RING_CIRCUMFERENCE = 100.5;

/** The legacy battery gauge changes colour at the two comfort thresholds. */
function ringStroke(soc: number): string {
  if (soc < 20) return "var(--coral)";
  if (soc > 80) return "var(--sage)";
  return "var(--brass)";
}

function sparkGraph(
  values: Array<number | null>,
  nowMs: number,
  unit: string,
  decimals: number,
): GraphInput | null {
  if (!values.length) return null;
  return {
    mode: "line",
    start: nowMs - 86_400_000,
    end: nowMs,
    unit,
    decimals,
    series: [{ values }],
  };
}

/**
 * The four hero statistics, the weather strip, and the first alert.
 *
 * Every sparkline reads the shared history cache and re-renders through the
 * cache subscription. There is no card-side `data-spark` patcher anymore.
 */
export function Vitals() {
  const bindings = useBindings();
  const t = useTranslator();
  const model = useModel();
  const config = useConfig();
  const history = useHistory();
  const now = useNow();
  const actions = useActions();
  useHistoryVersion();

  const nowMs = now().getTime();
  const displayRoom = model.rooms.find((room) => room.id !== "skur");
  const indoorRoute = displayRoom ? `rum/${displayRoom.id}` : "alle";
  const soc = model.solar?.batterySoc ?? 0;
  const batteryOffset = RING_CIRCUMFERENCE - (soc / 100) * RING_CIRCUMFERENCE;

  const indoor = history.series(config.ventilation?.temperature ?? "", {
    buckets: 96,
  });
  const price = model.price?.values ?? [];
  const solarActual = history.series(config.solar?.power ?? "", {
    buckets: 96,
    fill: 0,
  });
  const alert = model.alerts[0];

  return (
    <>
      <div className="vitals">
        <VitalStat
          label={t("hero.indoor")}
          value={bindings.indoor}
          unit="°C"
          sub={bindings.indoorSub}
          spark={indoor}
          sparkGraph={sparkGraph(indoor, nowMs, "°C", 1)}
          sparkColor="var(--sky)"
          onClick={() => actions.navigate(indoorRoute)}
        />
        <VitalStat
          label={t("hero.priceNow")}
          value={bindings.price}
          unit="kr"
          sub={bindings.priceSub}
          spark={price}
          sparkGraph={sparkGraph(price, nowMs, "kr", 2)}
          sparkColor="var(--brass)"
          onClick={() => actions.navigate("energi")}
        />
        <VitalStat
          label={t("hero.battery")}
          value={bindings.battery}
          unit="%"
          sub={bindings.batterySub}
          onClick={() => actions.navigate("sol")}
          ring={
            <svg viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="var(--line)"
                strokeWidth="2.5"
              />
              <circle
                data-battery-ring
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke={ringStroke(soc)}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={batteryOffset}
                transform="rotate(-90 20 20)"
              />
            </svg>
          }
        />
        <VitalStat
          label={t("hero.solarNow")}
          value={bindings.solarNow}
          unit="W"
          sub={bindings.solarSub}
          spark={solarActual}
          sparkGraph={sparkGraph(solarActual, nowMs, "W", 0)}
          sparkColor="var(--amber)"
          onClick={() => actions.navigate("sol")}
        />
      </div>
      <div
        className="weather-strip"
        dangerouslySetInnerHTML={{ __html: bindings.weatherStrip ?? "" }}
      />
      <div data-alert-slot>
        {alert ? (
          <button
            type="button"
            className="alert-band"
            data-nav={alert.route}
            onClick={() => actions.navigate(alert.route)}
          >
            <Icon name="alert" />
            <span className="alert-text">
              <b>{alert.title}.</b> {alert.text}
            </span>
            {model.alerts.length > 1 ? (
              <span className="alert-count">+{model.alerts.length - 1}</span>
            ) : null}
            <Icon name="arrow" />
          </button>
        ) : null}
      </div>
    </>
  );
}
