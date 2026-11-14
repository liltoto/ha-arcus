import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";

export interface MiscTileProps {
  route: string;
  icon: string;
  title: string;
  sub: string;
  onOpen: () => void;
}

/**
 * The two-column `mini-stat` tile used by the All sheet for both rooms and
 * chapter links. It keeps the legacy inline sizing and `data-nav` hook.
 */
export function MiscTile({ route, icon, title, sub, onOpen }: MiscTileProps) {
  return (
    <button
      type="button"
      className={c("mini-stat")}
      data-nav={route}
      style={{ textAlign: "left", minHeight: 82 }}
      onClick={onOpen}
    >
      <div className={c("k")}>
        <Icon name={icon} />
      </div>
      <div className={c("v")} style={{ fontSize: 17, marginTop: 8 }}>
        {title}
      </div>
      <div className={c("row-sub")}>{sub}</div>
    </button>
  );
}
