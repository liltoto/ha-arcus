import type { ChapterKey, LanguageSetting, Translator } from "../../types";
import { renderChapterArt } from "../../render/chapter-art";
import { useConfig, useHass, useModel, useTranslator } from "../hooks";

export interface ChapterArtProps {
  chKey: ChapterKey;
}

/**
 * Renders the model-only illustration below a chapter title. The card still
 * patches `[data-art]` with the history-aware version, so the legacy helper
 * stays in charge of the markup during the migration.
 */
export function ChapterArt({ chKey }: ChapterArtProps) {
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const hass = useHass();

  const language = resolveLanguage(config.language, t);
  const html = renderChapterArt(chKey, {
    model,
    config,
    t,
    language,
    isOn: (entityId) => hass.states[entityId]?.state === "on",
  });

  return (
    <div
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Mirrors the legacy `languageOf` fallback used by the home view. */
function resolveLanguage(setting: LanguageSetting, t: Translator): string {
  if (setting === "da" || setting === "en") return setting;
  return t("common.today") === "I dag" ? "da" : "en";
}
