import type { ArcusHass, EntityRef, Translator } from "../../../../types";
import { Icon } from "../../../atoms/Icon";
import type { ArcusActions } from "../../../types";
import { c } from "../../../styles/classes";
import { entityName, refEntity } from "./room-state";
import { coverName } from "./room-view";

interface CoverRowProps {
  cover: EntityRef;
  hass: ArcusHass;
  t: Translator;
  actions: ArcusActions;
}

const CoverRow = ({ cover, hass, t, actions }: CoverRowProps) => {
  const entity = refEntity(hass, cover);
  const isOpen = entity?.state === "open" || entity?.state === "opening";
  const name = coverName(cover, hass);
  return (
    <div className={c("row", isOpen && "on")}>
      <Icon name="wind" />
      <div className={c("row-main")}>
        <div className={c("row-name")}>{name}</div>
        <div className={c("row-sub")}>
          {isOpen ? t("room.coverOpen") : t("room.coverClosed")}
        </div>
      </div>
      <button
        type="button"
        className={c("toggle", isOpen && "on")}
        data-act="toggle-cover"
        data-entity={cover.entityId}
        aria-label={name}
        aria-pressed={isOpen}
        onClick={() =>
          actions.callService(
            "cover",
            isOpen ? "close_cover" : "open_cover",
            {},
            { entity_id: cover.entityId },
          )
        }
      />
    </div>
  );
};

export interface RoomCoversProps {
  covers: EntityRef[] | undefined;
  hass: ArcusHass;
  t: Translator;
  actions: ArcusActions;
}

/** The room's covers, each with an open/close toggle. */
export const RoomCovers = ({ covers, hass, t, actions }: RoomCoversProps) => {
  if (!covers?.length) return null;

  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("room.covers")}</div>
      </div>
      <div className={c("list")}>
        {covers.map((cover) => (
          <CoverRow
            key={cover.entityId}
            cover={cover}
            hass={hass}
            t={t}
            actions={actions}
          />
        ))}
      </div>
    </div>
  );
};

export interface RoomLockProps {
  lock: EntityRef | null | undefined;
  hass: ArcusHass;
  t: Translator;
  actions: ArcusActions;
}

/** The optional room lock, with a lock/unlock toggle. */
export const RoomLock = ({ lock, hass, t, actions }: RoomLockProps) => {
  if (!lock) return null;

  const entity = refEntity(hass, lock);
  const isLocked = entity?.state === "locked";
  const name = entityName(entity, lock.name ?? t("room.lock"));
  return (
    <div className={c("block")}>
      <div className={c("block-head")}>
        <div className={c("block-label")}>{t("room.lock")}</div>
      </div>
      <div className={c("row", isLocked && "on")}>
        <Icon name="shield" />
        <div className={c("row-main")}>
          <div className={c("row-name")}>{name}</div>
          <div className={c("row-sub")}>
            {isLocked ? t("room.locked") : t("room.unlocked")}
          </div>
        </div>
        <button
          type="button"
          className={c("toggle", isLocked && "on")}
          data-act="toggle-lock"
          data-entity={lock.entityId}
          aria-label={name}
          aria-pressed={isLocked}
          onClick={() =>
            actions.callService(
              "lock",
              isLocked ? "unlock" : "lock",
              {},
              { entity_id: lock.entityId },
            )
          }
        />
      </div>
    </div>
  );
};
