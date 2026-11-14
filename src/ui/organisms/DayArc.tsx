import { formatTime } from "../../format";
import { resolveLanguage } from "../../localize";
import { arcPoint, priceColor } from "../../render/charts";
import {
  useConfig,
  useHass,
  useHistory,
  useHistoryVersion,
  useModel,
  useNow,
  useTranslator,
} from "../hooks";

const WIDTH = 1000;
const FULL_ARC = "M40,210 Q500,-90 960,210";

function dayFraction(date: Date): number {
  return (
    (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60) / 1440
  );
}

function positionStyle(x: number, y: number): { left: string; top: string } {
  return { left: `${x / 10}%`, top: `${y / 3}%` };
}

/**
 * The prayer/sun/price day arc.
 *
 * React owns every path and label now. It subscribes to the history cache so
 * the actual solar line appears or refreshes without the card re-patching the
 * SVG after a timer.
 */
export function DayArc() {
  const model = useModel();
  const config = useConfig();
  const hass = useHass();
  const history = useHistory();
  const now = useNow();
  const t = useTranslator();
  useHistoryVersion();

  const current = now();
  const language = resolveLanguage(hass.language, config);
  const fraction = dayFraction(current);
  const point = arcPoint(fraction);

  const solar = model.solar?.forecastSeries ?? [];
  const actual = config.solar?.power
    ? history.series(config.solar.power)
    : [];
  const max = Math.max(
    3000,
    ...solar.map((item) => item.v),
    ...actual.map((value) => value ?? 0),
    1,
  );

  const solarPoints = solar.map((item) => {
    const position = arcPoint(dayFraction(item.t));
    return {
      x: position.x,
      y: position.y - (item.v / max) * 72,
    };
  });
  const solarLine = solarPoints.length
    ? `M${solarPoints
        .map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`)
        .join("L")}`
    : "";
  const solarArea = solarLine ? `${solarLine}L960,210L40,210Z` : "";

  const actualPoints = actual
    .map((value, index) => {
      const progress = (index + 1) / actual.length;
      if (progress > fraction) return null;
      const position = arcPoint(progress);
      return {
        x: position.x,
        y: position.y - ((value ?? 0) / max) * 72,
      };
    })
    .filter((value): value is { x: number; y: number } => value !== null);
  const actualLine = actualPoints.length
    ? `M${actualPoints
        .map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`)
        .join("L")}`
    : "";

  const price = model.price;
  const hour = current.getHours();
  const prayerTimes = model.prayers?.times ?? [];
  const next = model.prayers?.next ?? null;
  const sunrise = model.prayers?.sunrise ?? null;
  const labels = [
    ...(sunrise
      ? [
          {
            id: "sunrise",
            name: t("prayers.sunrise"),
            time: formatTime(sunrise, language),
            position: arcPoint(dayFraction(sunrise)),
            next: false,
            sun: true,
            offset: 5,
          },
        ]
      : []),
    ...prayerTimes.map((prayer, index) => ({
      id: prayer.id,
      name: prayer.name,
      time: formatTime(prayer.time, language),
      position: arcPoint(prayer.minutes / 1440),
      next: next?.id === prayer.id,
      sun: false,
      offset: index % 2 ? 9 : 5,
    })),
  ];

  return (
    <div className="arc-wrap" data-arc>
      <div className="arc-glow" data-arc-glow style={positionStyle(point.x, point.y)} />
      <div className="orb" data-orb style={positionStyle(point.x, point.y)} />
      <div className="arc-readout" data-arc-readout />
      <svg
        className="arc-svg"
        viewBox={`0 0 ${WIDTH} 300`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--brass)" stopOpacity=".42" />
            <stop offset="1" stopColor="var(--brass)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="pastClip">
            <rect
              data-past-clip
              x="40"
              y="0"
              width={Math.max(0, point.x - 40)}
              height="300"
            />
          </clipPath>
        </defs>
        <path
          data-arc-line
          d={FULL_ARC}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="1"
        />
        <path
          data-arc-past
          d={FULL_ARC}
          fill="none"
          stroke="var(--text-2)"
          strokeWidth="1.2"
          opacity=".7"
          clipPath="url(#pastClip)"
        />
        <path
          data-solar-area
          d={solarArea}
          fill="url(#solarFill)"
          stroke="none"
        />
        <path
          data-solar-line
          d={solarLine}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
          opacity=".9"
        />
        <path
          data-solar-actual
          d={actualLine}
          fill="none"
          stroke="var(--text)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
          opacity=".75"
        />
        <g data-prices>
          {price?.values.length
            ? price.values.map((value, index) => {
                const start = arcPoint(index / 24);
                const end = arcPoint((index + 1) / 24);
                return (
                  <line
                    key={index}
                    x1={start.x}
                    y1={start.y + 9}
                    x2={end.x}
                    y2={end.y + 9}
                    stroke={priceColor(value, price.min, price.max)}
                    strokeWidth={index === hour ? 7 : 4.5}
                    opacity={index === hour ? 1 : 0.72}
                    strokeLinecap="butt"
                  />
                );
              })
            : null}
        </g>
        <g data-prayer-marks>
          {prayerTimes.map((prayer) => {
            const position = arcPoint(prayer.minutes / 1440);
            return (
              <g key={prayer.id}>
                <line
                  x1={position.x}
                  y1={position.y - 6}
                  x2={position.x}
                  y2={position.y + 6}
                  stroke="var(--muted)"
                  strokeWidth="1"
                  opacity=".6"
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="2.2"
                  fill={
                    next?.id === prayer.id
                      ? "var(--accent)"
                      : "var(--text-2)"
                  }
                />
              </g>
            );
          })}
        </g>
      </svg>
      <div className="now-needle" data-now-needle style={{ left: `${point.x / 10}%` }} />
      <div className="now-bead" data-now-bead style={positionStyle(point.x, point.y)} />
      <div className="arc-labels" data-arc-labels>
        {labels.map((label) => (
          <span
            key={label.id}
            className={`arc-label${label.next ? " next" : ""}${
              label.sun ? " sun" : ""
            }`}
            style={{
              left: `${label.position.x / 10}%`,
              top: `${(label.position.y / 300) * 100 + label.offset}%`,
            }}
          >
            {label.name}
            <span className="t">{label.time}</span>
          </span>
        ))}
      </div>
      <div className="arc-hours">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}
