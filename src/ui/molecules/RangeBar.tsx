import { useState } from "react";
import {
  addDays,
  dateInputValue,
  dayLabel,
  parseDateInput,
  startOfDay,
  windowLabel,
  type RangeDays,
  type ResolvedHistoryRange,
} from "../../range";
import type { Language, Translator } from "../../types";
import { IconButton } from "../atoms/IconButton";
import { c } from "../styles/classes";

const DAYS: RangeDays[] = [1, 7, 30];

const dayKey = (days: RangeDays): string => {
  if (days === 1) return "range.days1";
  if (days === 7) return "range.days7";
  return "range.days30";
};

const labelFor = (
  range: ResolvedHistoryRange,
  t: Translator,
  language: Language,
  now: Date,
): string => {
  if (range.days > 1) return windowLabel(range, language, now);
  if (range.live) return t("range.today");
  if (range.anchor === startOfDay(addDays(now, -1))) {
    return t("range.yesterday");
  }
  return dayLabel(range.anchor, language, now);
};

interface RangeNavProps {
  label: string;
  live: boolean;
  picking: boolean;
  t: Translator;
  onStep(delta: number): void;
  onToggle(): void;
}

const RangeNav = ({
  label,
  live,
  picking,
  t,
  onStep,
  onToggle,
}: RangeNavProps) => {
  return (
    <div className={c("range-nav")}>
      <IconButton
        icon="chevron"
        label={t("range.prev")}
        className={c("range-prev")}
        onClick={() => onStep(-1)}
      />
      <button
        type="button"
        className={c("range-label")}
        aria-expanded={picking}
        aria-label={`${label} · ${t("range.pick")}`}
        onClick={onToggle}
      >
        {label}
      </button>
      <IconButton
        icon="chevron"
        label={t("range.next")}
        disabled={live}
        onClick={() => onStep(1)}
      />
    </div>
  );
};

interface RangePresetsProps {
  days: RangeDays;
  t: Translator;
  onDays(days: RangeDays): void;
}

const RangePresets = ({ days, t, onDays }: RangePresetsProps) => {
  return (
    <div
      className={c("range-presets")}
      role="group"
      aria-label={t("range.period")}
    >
      {DAYS.map((value) => (
        <button
          key={value}
          type="button"
          className={c("range-preset", days === value && "active")}
          aria-pressed={days === value}
          onClick={() => onDays(value)}
        >
          {t(dayKey(value))}
        </button>
      ))}
    </div>
  );
};

interface RangePickerProps {
  range: ResolvedHistoryRange;
  today: number;
  t: Translator;
  onAnchor(anchor: number): void;
  onToday(): void;
  onClose(): void;
}

const RangePicker = ({
  range,
  today,
  t,
  onAnchor,
  onToday,
  onClose,
}: RangePickerProps) => {
  const pick = (value: string): void => {
    const anchor = parseDateInput(value);
    if (anchor !== null) onAnchor(anchor);
  };

  return (
    <div className={c("range-picker")}>
      <label className={c("range-pick-label")}>
        <span>{t("range.pick")}</span>
        <input
          type="date"
          value={dateInputValue(range.anchor)}
          max={dateInputValue(today)}
          onChange={(event) => pick(event.currentTarget.value)}
        />
      </label>
      <button
        type="button"
        className={c("range-preset")}
        onClick={() => {
          onToday();
          onClose();
        }}
      >
        {t("range.today")}
      </button>
    </div>
  );
};

export interface RangeBarProps {
  variant?: "home" | "sheet";
  range: ResolvedHistoryRange;
  t: Translator;
  language: Language;
  now: Date;
  onStep(delta: number): void;
  onDays(days: RangeDays): void;
  onAnchor(anchor: number): void;
  onToday(): void;
}

/**
 * The presentational history-window control. Everything it needs comes from
 * props so it stays a molecule; `HistoryRange` owns the store wiring.
 */
export const RangeBar = ({
  variant = "home",
  range,
  t,
  language,
  now,
  onStep,
  onDays,
  onAnchor,
  onToday,
}: RangeBarProps) => {
  const [picking, setPicking] = useState(false);
  const today = startOfDay(now);
  const label = labelFor(range, t, language, now);

  return (
    <div
      className={c(
        "range-bar",
        // Not `sheet`: that is the sheet panel's own semantic class.
        variant === "sheet" && "in-sheet",
        !range.live && "history",
      )}
      data-range
      data-days={range.days}
      data-live={range.live ? "1" : "0"}
      role="group"
      aria-label={t("range.aria")}
    >
      <RangeNav
        label={label}
        live={range.live}
        picking={picking}
        t={t}
        onStep={onStep}
        onToggle={() => setPicking((open) => !open)}
      />
      <RangePresets days={range.days} t={t} onDays={onDays} />
      {!range.live ? (
        <button type="button" className={c("range-today")} onClick={onToday}>
          {t("range.today")}
        </button>
      ) : null}
      {picking ? (
        <RangePicker
          range={range}
          today={today}
          t={t}
          onAnchor={onAnchor}
          onToday={onToday}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
};
