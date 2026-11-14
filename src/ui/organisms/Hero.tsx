import { Icon } from "../atoms/Icon";
import { useActions, useBindings, useModel, useTranslator } from "../hooks";
import { DayArc } from "./DayArc";
import { c } from "../styles/classes";

/**
 * The greeting, prayer shortcut, date, and current weather. The card owns the
 * derived copy in the bindings map; this organism only lays it out. The day arc
 * follows the text block and reads the same provider.
 */
export function Hero() {
  const actions = useActions();
  const bindings = useBindings();
  const model = useModel();
  const t = useTranslator();

  return (
    <>
      <div className={c("hero-top")}>
        <div>
          <button
            className={c("eyebrow")}
            data-nav="bon"
            aria-label={t("hero.seePrayers")}
            onClick={() => actions.navigate("bon")}
          >
            <span>{bindings.eyebrow}</span>
            <span className={c("eyebrow-arrow")}>
              <Icon name="chevron" />
            </span>
          </button>
          <h1
            className={c("greeting")}
            dangerouslySetInnerHTML={{ __html: bindings.greet }}
          />
          <div className={c("hero-date")}>{bindings.heroDate}</div>
        </div>
        <div className={c("weather")}>
          <span className={c("weather-icon")}>
            <Icon name={model.weather?.icon ?? "cloud"} />
          </span>
          <div>
            <div className={c("weather-temp")}>{bindings.weatherTemp}</div>
            <div className={c("weather-sub")}>{bindings.weatherSub}</div>
          </div>
        </div>
      </div>
      <DayArc />
    </>
  );
}
