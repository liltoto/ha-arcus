import { Icon } from "../atoms/Icon";

export interface ForecastDayProps {
  name: string;
  icon: string;
  high: string;
  low: string;
}

/** One day in the compact weather strip. */
export function ForecastDay({ name, icon, high, low }: ForecastDayProps) {
  return (
    <span className="wday">
      <span className="wname">{name}</span>
      <span className="wico">
        <Icon name={icon} />
      </span>
      <span className="wtemps">
        <b>{high}</b>
        {low}
      </span>
    </span>
  );
}
