import type { Translator } from "../../../../types";
import { OpeningRow } from "../../../molecules/OpeningRow";
import { c } from "../../../styles/classes";
import type { SecurityOpeningRow } from "./security-view";

export interface SecurityOpeningsProps {
  rows: SecurityOpeningRow[];
  openCount: number;
  t: Translator;
  onNavigate: (nav: string) => void;
}

/** Every door, window and leak, each row routing to its room sheet. */
export function SecurityOpenings({
  rows,
  openCount,
  t,
  onNavigate,
}: SecurityOpeningsProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("security.doorsWindows")}</div>
        <div className={c("block-label")}>
          <b>
            {openCount
              ? t("security.summaryOpen", { count: openCount })
              : t("security.summaryClosed")}
          </b>
        </div>
      </div>
      <div className={c("list")}>
        {rows.length ? (
          rows.map((row) => (
            <div key={row.id} data-nav={row.nav}>
              <OpeningRow
                name={row.name}
                kind={row.kind}
                room={row.room}
                isOpen={row.isOpen}
                icon={row.icon}
                status={row.status}
                openLabel={t("opening.open")}
                closedLabel={t("opening.closed")}
                onClick={() => onNavigate(row.nav)}
              />
            </div>
          ))
        ) : (
          <div className={c("block-note")}>{t("empty.data")}</div>
        )}
      </div>
    </div>
  );
}
