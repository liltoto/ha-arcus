import type { ChapterKey } from "../../types";
import { Icon } from "../atoms/Icon";
import { useActions, useBindings, useModel, useTranslator } from "../hooks";
import { ChapterArt } from "./ChapterArt";

interface ChapterDefinition {
  key: ChapterKey;
  titleKey: string;
  icon: string;
  route: string;
  large?: boolean;
}

/** The chapter order and copy from the legacy home view. */
const CHAPTERS: ChapterDefinition[] = [
  {
    key: "energi",
    titleKey: "sheet.titleEnergy",
    icon: "bolt",
    route: "energi",
    large: true,
  },
  {
    key: "sol",
    titleKey: "sheet.titleSolar",
    icon: "solar",
    route: "sol",
    large: true,
  },
  { key: "vand", titleKey: "sheet.titleWater", icon: "drop", route: "vand" },
  {
    key: "sikkerhed",
    titleKey: "sheet.titleSecurity",
    icon: "shield",
    route: "sikkerhed",
  },
  {
    key: "ventilation",
    titleKey: "sheet.titleVentilation",
    icon: "fan",
    route: "ventilation",
  },
  {
    key: "teknik",
    titleKey: "sheet.titleTech",
    icon: "network",
    route: "teknik",
  },
  {
    key: "oekonomi",
    titleKey: "sheet.titleEconomy",
    icon: "chart",
    route: "oekonomi",
  },
  { key: "lys", titleKey: "sheet.titleLights", icon: "light", route: "lys" },
  {
    key: "varme",
    titleKey: "sheet.titleHeating",
    icon: "heat",
    route: "varme",
  },
  {
    key: "alarmer",
    titleKey: "sheet.titleAlerts",
    icon: "bell",
    route: "alarmer",
  },
];

export interface ChapterGridProps {
  className?: string;
}

/**
 * The chapter layer grid. Chapter summaries are the only bindings that carry
 * HTML (`<b>`), so each tile is local markup matching the legacy `chapterCard`
 * rather than the text-only `ChapterCard` molecule.
 */
export function ChapterGrid({ className }: ChapterGridProps = {}) {
  const model = useModel();
  const bindings = useBindings();
  const t = useTranslator();
  const actions = useActions();

  const enabled = CHAPTERS.map((chapter, index) => ({ chapter, index })).filter(
    ({ chapter }) => model.chapters[chapter.key],
  );

  if (!enabled.length) return null;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="kicker">{t("section.chaptersKicker")}</div>
          <h2>{t("section.chaptersTitle")}</h2>
        </div>
        <div className="meta">
          {t("section.chaptersMeta")}
          <br />
          <b>{t("section.chaptersMetaSub")}</b>
        </div>
      </div>
      <div className={className ? `chapter-grid ${className}` : "chapter-grid"}>
        {enabled.map(({ chapter, index }) => {
          const number =
            chapter.key === "alarmer"
              ? t("section.chapterAlertsShort")
              : String(index + 1).padStart(2, "0");
          const sum = bindings[`ch_${chapter.key}_sum`] ?? "";

          return (
            <button
              key={chapter.key}
              type="button"
              className={`chapter${chapter.large ? " large" : ""}`}
              data-nav={chapter.route}
              data-chapter={chapter.key}
              onClick={() => actions.navigate(chapter.route)}
            >
              <div className="ch-top">
                <span className="num">{number}</span>
                <span className="ch-icon">
                  <Icon name={chapter.icon} />
                </span>
              </div>
              <h3>{t(chapter.titleKey)}</h3>
              <div
                className="sum"
                dangerouslySetInnerHTML={{ __html: sum }}
              />
              <div className="ch-art" data-art={chapter.key}>
                <ChapterArt chKey={chapter.key} />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
