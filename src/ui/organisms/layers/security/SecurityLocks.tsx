import type { SecurityLockModel, Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import { c } from "../../../styles/classes";

export interface SecurityLocksProps {
  locks: SecurityLockModel[];
  t: Translator;
  onToggle: (lock: SecurityLockModel) => void;
}

/** Every configured lock with its state chip and lock/unlock toggle. */
export function SecurityLocks({ locks, t, onToggle }: SecurityLocksProps) {
  return (
    <div className={c("block")}>
      <div className={c("block-label")}>{t("security.locks")}</div>
      <div className={c("list")}>
        {locks.map((lock) => (
          <div className={c("row")} key={lock.entityId}>
            <Icon name="shield" />
            <div className={c("row-main")}>
              <div className={c("row-name")}>{lock.name}</div>
              {lock.room ? (
                <div className={c("row-sub")}>{lock.room}</div>
              ) : null}
            </div>
            <span className={c("chip", lock.locked ? "on" : "warn")}>
              {lock.locked ? t("security.locked") : t("security.unlocked")}
            </span>
            <button
              type="button"
              className={c("toggle", lock.locked && "on")}
              data-act="toggle-lock"
              data-entity={lock.entityId}
              aria-label={lock.name}
              aria-pressed={lock.locked}
              onClick={() => onToggle(lock)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
