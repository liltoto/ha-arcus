import { Icon } from "../atoms/Icon";
import { useActions, useBindings, useModel, useTranslator } from "../hooks";
import { DayArc } from "./DayArc";

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
      <div className="hero-top">
        <div>
          <button
            className="eyebrow"
            data-nav="bon"
            aria-label={t("hero.seePrayers")}
            onClick={() => actions.navigate("bon")}
          >
            <span>{bindings.eyebrow}</span>
            <span className="eyebrow-arrow">
              <Icon name="chevron" />
            </span>
          </button>
          <h1
            className="greeting"
            dangerouslySetInnerHTML={{ __html: bindings.greet }}
          />
          <div className="hero-date">{bindings.heroDate}</div>
        </div>
        <div className="weather">
          <span className="weather-icon">
            <Icon name={model.weather?.icon ?? "cloud"} />
          </span>
          <div>
            <div className="weather-temp">{bindings.weatherTemp}</div>
            <div className="weather-sub">{bindings.weatherSub}</div>
          </div>
        </div>
      </div>
      <DayArc />
    </>
  );
}
