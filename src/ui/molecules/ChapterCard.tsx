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
    <article
      className={c("chapter", chapter.large && "large")}
      data-chapter={chapter.key}
    >
      <div className={c("ch-top")}>
        <span className={c("num")}>{chapter.num ?? ""}</span>
        <span className={c("ch-icon")}>
          <Icon name={chapter.icon} />
        </span>
      </div>
      <h3>
        <button
          type="button"
          className={c("card-link")}
          data-nav={chapter.key}
          aria-label={chapter.title}
          onClick={onOpen}
        >
          {chapter.title}
        </button>
      </h3>
      <div className={c("sum")}>{chapter.sum}</div>
      <div className={c("ch-art")} data-art={chapter.key} aria-hidden="true">
        {chapter.art}
      </div>
      <div className={c("ch-foot")}>
        {chapter.meta ? <span>{chapter.meta}</span> : null}
      </div>
    </article>
  );
}
