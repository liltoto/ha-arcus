import { formatTime } from "../../format";
import { arcPoint, priceColor } from "../../render/charts";
import type { ArcusConfig, HomeModel, Language, Translator } from "../../types";
import type { HistoryCache } from "../../data/history";
import {
  useConfig,
  useHistory,
  useHistoryVersion,
  useModel,
  useNow,
  useTranslator,
} from "../hooks";
import { c } from "../styles/classes";

const WIDTH = 1000;
const FULL_ARC = "M40,210 Q500,-90 960,210";
const DAY_MS = 86_400_000;
const BUCKETS = 96;
/** Height in SVG units that a full-scale solar reading rises above the arc. */
const PEAK_HEIGHT = 72;

interface Point {
  x: number;
  y: number;
}

interface ArcLabel {
  id: string;
  name: string;
  time: string;
  position: Point;
  next: boolean;
  sun: boolean;
  offset: number;
}

const dayFraction = (date: Date): number => {
  return (
    (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60) / 1440
  );
};

const positionStyle = (x: number, y: number): { left: string; top: string } => {
  return { left: `${x / 10}%`, top: `${y / 3}%` };
};

const pathFrom = (points: Point[]): string => {
  if (!points.length) return "";
  return `M${points
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join("L")}`;
};

const lift = (point: Point, value: number, max: number): Point => {
  return { x: point.x, y: point.y - (value / max) * PEAK_HEIGHT };
};

interface DaySeries {
  solarLine: string;
  solarArea: string;
  actualLine: string;
}

const buildSeries = (
  history: HistoryCache,
  config: ArcusConfig,
  model: HomeModel,
  current: Date,
): DaySeries => {
  const solar = model.solar?.forecastSeries ?? [];
  const dayStart = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
  ).getTime();
  const actualRaw = config.solar?.power
    ? history.series(config.solar.power, {
        start: dayStart,
        end: dayStart + DAY_MS,
        buckets: BUCKETS,
        fill: 0,
      })
    : [];
  const cutoff = Math.floor(
    ((current.getTime() - dayStart) / DAY_MS) * BUCKETS,
  );
  const actual = actualRaw.map((value, index) =>
    index <= cutoff ? value : null,
  );
  const max = Math.max(
    3000,
    ...solar.map((item) => item.v),
    ...actual.map((value) => value ?? 0),
    1,
  );
  const fraction = dayFraction(current);

  const solarLine = pathFrom(
    solar.map((item) => lift(arcPoint(dayFraction(item.t)), item.v, max)),
  );
  const actualPoints = actual
    .map((value, index) => {
      const progress = (index + 1) / actual.length;
      if (progress > fraction) return null;
      return lift(arcPoint(progress), value ?? 0, max);
    })
    .filter((value): value is Point => value !== null);

  return {
    solarLine,
    solarArea: solarLine ? `${solarLine}L960,210L40,210Z` : "",
    actualLine: pathFrom(actualPoints),
  };
};

const sunLabel = (
  id: string,
  name: string,
  date: Date,
  offset: number,
  language: Language,
): ArcLabel => {
  return {
    id,
    name,
    time: formatTime(date, language),
    position: arcPoint(dayFraction(date)),
    next: false,
    sun: true,
    offset,
  };
};

/**
 * Prayer labels win when prayers are configured. Otherwise the arc still
 * shows the sun's rising and setting, so homes without prayer times keep a
 * meaningful day rhythm.
 */
const buildLabels = (
  model: HomeModel,
  t: Translator,
  language: Language,
): ArcLabel[] => {
  const prayerTimes = model.prayers?.times ?? [];
  const next = model.prayers?.next ?? null;
  const sunrise = model.prayers?.sunrise ?? null;
  const labels: ArcLabel[] = [];

  if (sunrise) {
    labels.push(
      sunLabel("sunrise", t("prayers.sunrise"), sunrise, 5, language),
    );
  }

  prayerTimes.forEach((prayer, index) => {
    labels.push({
      id: prayer.id,
      name: prayer.name,
      time: formatTime(prayer.time, language),
      position: arcPoint(prayer.minutes / 1440),
      next: next?.id === prayer.id,
      sun: false,
      offset: index % 2 ? 9 : 5,
    });
  });

  if (prayerTimes.length === 0) {
    const rising = model.sun?.nextRising;
    const setting = model.sun?.nextSetting;
    if (rising && !sunrise) {
      labels.push(
        sunLabel("sunrise", t("prayers.sunrise"), rising, 5, language),
      );
    }
    if (setting) {
      labels.push(
        sunLabel("sunset", t("prayers.sunset"), setting, 9, language),
      );
    }
  }

  return labels;
};

/**
 * The prayer/sun/price day arc.
 *
 * React owns every path and label now. It subscribes to the history cache so
 * the actual solar line appears or refreshes without the card re-patching the
 * SVG after a timer.
 */
export const DayArc = () => {
  const model = useModel();
  const config = useConfig();
  const history = useHistory();
  const now = useNow();
  const t = useTranslator();
  useHistoryVersion();

  const current = now();
  const language = model.language;
  const point = arcPoint(dayFraction(current));
  const series = buildSeries(history, config, model, current);
  const price = model.price;
  const hour = current.getHours();
  const prayerTimes = model.prayers?.times ?? [];
  const next = model.prayers?.next ?? null;
  const labels = buildLabels(model, t, language);

  return (
    <div className={c("arc-wrap")} data-arc>
      <div
        className={c("arc-glow")}
        data-arc-glow
        style={positionStyle(point.x, point.y)}
      />
      <div
        className={c("orb")}
        data-orb
        style={positionStyle(point.x, point.y)}
      />
      <div className={c("arc-readout")} data-arc-readout />
      <svg
        className={c("arc-svg")}
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
          className={c("solar-area")}
          data-solar-area
          d={series.solarArea}
          fill="url(#solarFill)"
          stroke="none"
        />
        <path
          className={c("solar-line")}
          data-solar-line
          d={series.solarLine}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
          opacity=".9"
        />
        <path
          data-solar-actual
          d={series.actualLine}
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
                    next?.id === prayer.id ? "var(--accent)" : "var(--text-2)"
                  }
                />
              </g>
            );
          })}
        </g>
      </svg>
      <div
        className={c("now-needle")}
        data-now-needle
        style={{ left: `${point.x / 10}%` }}
      />
      <div
        className={c("now-bead")}
        data-now-bead
        style={positionStyle(point.x, point.y)}
      />
      <div className={c("arc-labels")} data-arc-labels>
        {labels.map((label) => (
          <span
            key={label.id}
            className={`${c("arc-label", label.next && "next")}${
              label.sun ? " sun" : ""
            }`}
            style={{
              left: `${label.position.x / 10}%`,
              top: `${(label.position.y / 300) * 100 + label.offset}%`,
            }}
          >
            {label.name}
            <span className={c("t")}>{label.time}</span>
          </span>
        ))}
      </div>
      <div className={c("arc-hours")}>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
};
