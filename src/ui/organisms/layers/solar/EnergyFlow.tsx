import type { Language, SolarModel, Translator } from "../../../../types";
import { fmt } from "./helpers";
import { c } from "../../../styles/classes";

export interface EnergyFlowProps {
  solar: SolarModel;
  language: Language;
  t: Translator;
}

/** The four-node solar flow diagram from the legacy overview. */
export function EnergyFlow({ solar, language, t }: EnergyFlowProps) {
  const grid = solar.grid;
  const gridValue = grid === null ? "–" : fmt(Math.abs(grid), 0, language);
  const gridUnit =
    grid !== null && grid < 0 ? t("solar.flowBuy") : t("solar.flowSell");

  return (
    <div className={c("flow-wrap solar-flow")}>
      <svg viewBox="0 0 560 132" aria-hidden="true">
        <defs>
          <marker
            id="ar-solar"
            markerWidth="7"
            markerHeight="7"
            refX="5.5"
            refY="3.5"
            orient="auto"
          >
            <path
              d="M0,0 L7,3.5 L0,7"
              fill="none"
              stroke="var(--line-strong)"
            />
          </marker>
        </defs>
        <path
          d="M102 66 H168"
          stroke="var(--amber)"
          strokeWidth="1.2"
          markerEnd="url(#ar-solar)"
          strokeDasharray="4 5"
        />
        <path
          d="M252 66 H310"
          stroke="var(--line-strong)"
          strokeWidth="1.2"
          markerEnd="url(#ar-solar)"
          strokeDasharray="4 5"
        />
        <path
          d="M390 66 H452"
          stroke="var(--sky)"
          strokeWidth="1.2"
          markerEnd="url(#ar-solar)"
          strokeDasharray="4 5"
        />
        <circle
          cx="70"
          cy="66"
          r="30"
          fill="none"
          stroke="var(--amber)"
          strokeWidth="1"
        />
        <circle
          cx="210"
          cy="66"
          r="40"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="1"
        />
        <circle
          cx="350"
          cy="66"
          r="30"
          fill="none"
          stroke="var(--sky)"
          strokeWidth="1"
        />
        <circle
          cx="490"
          cy="66"
          r="30"
          fill="none"
          stroke="var(--sage)"
          strokeWidth="1"
        />
        <text x="70" y="28" className={c("flow-label")} textAnchor="middle">
          {t("solar.flowSolar")}
        </text>
        <text
          x="70"
          y="64"
          className={c("flow-val")}
          textAnchor="middle"
          data-flow="pv"
        >
          {fmt(solar.power, 0, language)}
        </text>
        <text x="70" y="78" className={c("flow-unit")} textAnchor="middle">
          {t("solar.flowWatt")}
        </text>
        <text x="210" y="20" className={c("flow-label")} textAnchor="middle">
          {t("solar.flowBattery")}
        </text>
        <text
          x="210"
          y="66"
          className={c("flow-val")}
          textAnchor="middle"
          data-flow="soc"
        >
          {fmt(solar.batterySoc, 0, language)}
        </text>
        <text x="210" y="80" className={c("flow-unit")} textAnchor="middle">
          {t("solar.flowPercent")}
        </text>
        <text x="350" y="28" className={c("flow-label")} textAnchor="middle">
          {t("solar.flowHouse")}
        </text>
        <text
          x="350"
          y="64"
          className={c("flow-val")}
          textAnchor="middle"
          data-flow="load"
        >
          {fmt(solar.load, 0, language)}
        </text>
        <text x="350" y="78" className={c("flow-unit")} textAnchor="middle">
          {t("solar.flowWatt")}
        </text>
        <text x="490" y="28" className={c("flow-label")} textAnchor="middle">
          {t("solar.flowGrid")}
        </text>
        <text
          x="490"
          y="64"
          className={c("flow-val")}
          textAnchor="middle"
          data-flow="grid"
        >
          {gridValue}
        </text>
        <text x="490" y="78" className={c("flow-unit")} textAnchor="middle">
          {gridUnit}
        </text>
      </svg>
    </div>
  );
}
