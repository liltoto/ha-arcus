import { useActions, useBindings, useModel, useTranslator } from "../hooks";
import { VitalStat } from "../molecules/VitalStat";

const RING_CIRCUMFERENCE = 100.5;

/** The legacy battery gauge changes colour at the two comfort thresholds. */
function ringStroke(soc: number): string {
  if (soc < 20) return "var(--coral)";
  if (soc > 80) return "var(--sage)";
  return "var(--brass)";
}

/**
 * The four hero statistics and the weather strip below them.
 *
 * The indoor stat opens the first room that is actually shown on the home
 * view; the battery and solar stats both lead to the solar sheet. Sparkline
 * paths are left empty: the card patches them from the history cache through
 * the `data-spark` hooks.
 */
export function Vitals() {
  const bindings = useBindings();
  const t = useTranslator();
  const model = useModel();
  const actions = useActions();

  const displayRoom = model.rooms.find((room) => room.id !== "skur");
  const indoorRoute = displayRoom ? `rum/${displayRoom.id}` : "alle";
  const soc = model.solar?.batterySoc ?? 0;
  const batteryOffset = RING_CIRCUMFERENCE - (soc / 100) * RING_CIRCUMFERENCE;

  return (
    <>
      <div className="vitals">
        <VitalStat
          label={t("hero.indoor")}
          value={bindings.indoor}
          unit="°C"
          sub={bindings.indoorSub}
          sparkKey="indoor"
          sparkColor="var(--sky)"
          onClick={() => actions.navigate(indoorRoute)}
        />
        <VitalStat
          label={t("hero.priceNow")}
          value={bindings.price}
          unit="kr"
          sub={bindings.priceSub}
          sparkKey="price"
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
          sparkKey="solarActual"
          sparkColor="var(--amber)"
          onClick={() => actions.navigate("sol")}
        />
      </div>
      <div
        className="weather-strip"
        dangerouslySetInnerHTML={{ __html: bindings.weatherStrip ?? "" }}
      />
      <div data-alert-slot />
    </>
  );
}
