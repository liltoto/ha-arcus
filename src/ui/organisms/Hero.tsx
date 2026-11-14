import { Icon } from "../atoms/Icon";
import {
  useActions,
  useBindings,
  useConfig,
  useModel,
  useTranslator,
} from "../hooks";
import { DayArc } from "./DayArc";
import { c } from "../styles/classes";

/**
 * The greeting, prayer shortcut, date, and current weather. The card owns the
 * derived copy in the bindings map; this organism only lays it out. The day arc
 * follows the text block and reads the same provider.
 *
 * The eyebrow opens the prayer sheet when the home has prayer times (or a
 * prayer config); otherwise it becomes the "all layers" shortcut.
 */
export function Hero() {
  const actions = useActions();
  const bindings = useBindings();
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const hasPrayers = Boolean(model.prayers?.times?.length || config.prayers);
  const eyebrowRoute = hasPrayers ? "bon" : "alle";

  return (
    <>
      <div className={c("hero-top")}>
        <div>
          <button
            type="button"
            className={c("eyebrow")}
            data-nav={eyebrowRoute}
            aria-label={hasPrayers ? t("hero.seePrayers") : t("hero.seeLayers")}
            onClick={() => actions.navigate(eyebrowRoute)}
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
