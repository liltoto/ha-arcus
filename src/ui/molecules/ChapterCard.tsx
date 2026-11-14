import { Icon } from "../atoms/Icon";
import type { ChapterView } from "../view-types";
import { c } from "../styles/classes";

export interface ChapterCardProps {
  chapter: ChapterView;
  onOpen: () => void;
}

/**
 * One chapter tile. `art` is intentionally a ReactNode slot so pages can pass
 * the SVG/zone-strip illustration without the molecule knowing the model.
 */
export function ChapterCard({ chapter, onOpen }: ChapterCardProps) {
  return (
    <button
      type="button"
      className={c("chapter", chapter.large && "large")}
      data-nav={chapter.key}
      data-chapter={chapter.key}
      onClick={onOpen}
    >
      <div className={c("ch-top")}>
        <span className={c("num")}>{chapter.num ?? ""}</span>
        <span className={c("ch-icon")}>
          <Icon name={chapter.icon} />
        </span>
      </div>
      <h3>{chapter.title}</h3>
      <div className={c("sum")}>{chapter.sum}</div>
      <div className={c("ch-art")} data-art={chapter.key}>
        {chapter.art}
      </div>
      <div className={c("ch-foot")}>
        {chapter.meta ? <span>{chapter.meta}</span> : null}
      </div>
    </button>
  );
}
