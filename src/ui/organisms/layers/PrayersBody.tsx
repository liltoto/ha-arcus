import { countdown, formatTime } from "../../../format";
import type { ArcusConfig, HomeModel } from "../../../types";
import {
  useActions,
  useConfig,
  useModel,
  useNow,
  useTranslator,
} from "../../hooks";
import { EmptyState } from "../../atoms/EmptyState";
import { PrayerMarker } from "../../molecules/PrayerMarker";
import { Readout } from "../../molecules/Readout";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { LayerShell } from "./misc/LayerShell";

function languageOf(model: HomeModel, config: ArcusConfig): "da" | "en" {
  return model.language === "en" || config.language === "en" ? "en" : "da";
}

/**
 * Prayers: today's five times, the next-prayer highlight and sunrise/sunset,
 * ported from `views/layers/prayers.ts`. The countdown helper wraps to the
 * next day, so the sheet stays correct around midnight.
 */
export function PrayersBody(_props: LayerBodyProps) {
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const actions = useActions();
  const now = useNow();
  const language = languageOf(model, config);

  const prayers = model.prayers;
  const times = Array.isArray(prayers?.times) ? prayers.times : [];
  const next = prayers?.next ?? null;

  const header = (summary: string) => (
    <SheetHeader
      kicker={t("sheet.kickerRhythm")}
      title={t("sheet.titlePrayers")}
      sum={summary}
      closeLabel={t("sheet.close")}
      onClose={actions.closeSheet}
    />
  );

  const empty = (summary: string) => (
    <LayerShell>
      {header(summary)}
      <div className="sheet-scroll">
        <EmptyState icon="moon" title={t("prayers.none")} />
      </div>
    </LayerShell>
  );

  if (!prayers) return empty(t("prayers.dayTimes"));
  if (!times.length && !next) return empty(t("prayers.dayTimes"));

  const current = now();
  const summary = next
    ? t("prayers.summary", {
        name: next.name,
        time: formatTime(next.time, language),
        countdown: countdown(next.time, current, language),
      })
    : t("prayers.dayTimes");

  const countdownText = next
    ? countdown(next.time, current, language).replace(/^(om|in)\s+/i, "")
    : "";

  const rows = times.map((prayer) => {
    const isNext = next !== null && next.id === prayer.id;
    return (
      <PrayerMarker
        key={prayer.id}
        name={prayer.name}
        time={formatTime(prayer.time, language)}
        next={isNext}
        nextLabel={t("prayers.badge")}
      />
    );
  });

  const sunset =
    times.find((prayer) => prayer.id === "maghrib") ??
    times.find((prayer) => prayer.name === t("prayers.maghrib"));

  return (
    <LayerShell>
      {header(summary)}
      <div className="sheet-scroll">
        <div className="block">
          <div className="eyebrow">{t("prayers.next")}</div>
          <div className="big-read">
            {next ? formatTime(next.time, language) : "–"}
            <small>{next ? next.name : ""}</small>
          </div>
          <div className="block-note">
            {next
              ? t("prayers.inCountdown", {
                  name: next.name,
                  countdown: countdownText,
                })
              : t("prayers.none")}
          </div>
        </div>
        <div className="block">
          <div className="block-label">{t("prayers.five")}</div>
          <div className="list prayer-list">
            {rows.length ? (
              rows
            ) : (
              <div className="block-note">{t("prayers.none")}</div>
            )}
          </div>
        </div>
        <div className="block">
          <div className="block-label">{t("prayers.sun")}</div>
          <div className="readings">
            <Readout
              label={t("prayers.sunrise")}
              value={
                prayers.sunrise ? formatTime(prayers.sunrise, language) : "–"
              }
            />
            <Readout
              label={t("prayers.sunset")}
              value={sunset ? formatTime(sunset.time, language) : "–"}
            />
          </div>
        </div>
        <div className="note">{t("prayers.footer")}</div>
      </div>
    </LayerShell>
  );
}
