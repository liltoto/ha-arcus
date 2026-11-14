import { Icon } from "../atoms/Icon";
import { c } from "../styles/classes";

export interface ForecastDayProps {
  name: string;
  icon: string;
  high: string;
  low: string;
}

/** One day in the compact weather strip. */
export function ForecastDay({ name, icon, high, low }: ForecastDayProps) {
  return (
    <span className={c("wday")}>
      <span className={c("wname")}>{name}</span>
      <span className={c("wico")}>
        <Icon name={icon} />
      </span>
      <span className={c("wtemps")}>
        <b>{high}</b>
        {low}
      </span>
    </span>
  );
}
