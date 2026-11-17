import type { ChapterKey } from "../../types";
import { renderChapterArt } from "../../render/chapter-art";
import {
  useConfig,
  useHass,
  useHistory,
  useHistoryVersion,
  useModel,
  useNow,
  useRange,
  useTranslator,
} from "../hooks";

export interface ChapterArtProps {
  chKey: ChapterKey;
}

/** The history-aware illustration below a chapter title. */
export const ChapterArt = ({ chKey }: ChapterArtProps) => {
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const hass = useHass();
  const history = useHistory();
  const now = useNow();
  const range = useRange();
  useHistoryVersion();

  const html = renderChapterArt(chKey, {
    model,
    config,
    t,
    language: model.language,
    history,
    now: now(),
    range,
    isOn: (entityId) => hass.states[entityId]?.state === "on",
  });

  return (
    <div
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
