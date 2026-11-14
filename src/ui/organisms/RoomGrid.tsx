import { Fragment } from "react";
import { resolveTempUnit } from "../../format";
import { resolveLanguage } from "../../localize";
import type { RoomModel, TemperatureUnit } from "../../types";
import { Icon } from "../atoms/Icon";
import {
  useActions,
  useBindings,
  useConfig,
  useHass,
  useHistory,
  useHistoryVersion,
  useModel,
  useNow,
  useTranslator,
} from "../hooks";
import { roomView, systemCardView } from "../home-view";
import { RoomCard } from "../molecules/RoomCard";
import { SystemCard } from "./SystemCard";
import { c } from "../styles/classes";

/** Outdoor rooms come from the room kind discovered for the area. */
function isOutdoorRoom(room: RoomModel): boolean {
  return room.kind === "outdoor";
}

interface FloorGroup {
  id: string;
  name: string;
  level: number;
  rooms: RoomModel[];
}

interface FloorLayout {
  groups: FloorGroup[];
  unfloored: RoomModel[];
}

function buildFloorGroups(rooms: RoomModel[]): FloorLayout {
  const groups = new Map<string, FloorGroup>();
  const unfloored: RoomModel[] = [];
  for (const room of rooms) {
    const id = room.floorId ?? room.floorName;
    if (!id) {
      unfloored.push(room);
      continue;
    }
    const group: FloorGroup = groups.get(id) ?? {
      id,
      name: room.floorName ?? id,
      level: room.floorLevel ?? 0,
      rooms: [],
    };
    group.rooms.push(room);
    groups.set(id, group);
  }
  return {
    groups: [...groups.values()].sort((a, b) => a.level - b.level),
    unfloored,
  };
}

interface RoomTileProps {
  room: RoomModel;
  language: string;
  tempUnit: TemperatureUnit;
  outdoor?: boolean;
}

function RoomTile({ room, language, tempUnit, outdoor }: RoomTileProps) {
  const model = useModel();
  const t = useTranslator();
  const actions = useActions();
  const history = useHistory();
  const now = useNow();
  const spark = history.series(room.temp?.entityId ?? "", {
    buckets: 48,
    fill: "hold",
  });
  const kind = outdoor
    ? `${t("sheet.kickerOutside")} · ${t("room.kind")}`
    : undefined;
  const nowMs = now().getTime();

  return (
    <RoomCard
      room={roomView(room, model, language, t, kind)}
      language={language}
      openLabel={t("room.openRoom")}
      spark={spark}
      sparkGraph={
        spark.length
          ? {
              mode: "line",
              start: nowMs - 86_400_000,
              end: nowMs,
              unit: tempUnit,
              decimals: 1,
              series: [{ values: spark }],
            }
          : null
      }
      onOpen={() => actions.navigate(`rum/${room.id}`)}
    />
  );
}

function SystemTiles({ tempUnit }: { tempUnit: TemperatureUnit }) {
  const model = useModel();
  const config = useConfig();
  const hass = useHass();
  const t = useTranslator();
  const actions = useActions();
  const history = useHistory();
  const now = useNow();
  const language = resolveLanguage(hass.language, config);
  const nowMs = now().getTime();

  return (
    <>
      {model.systemCards.map((card) => {
        const view = systemCardView(card, language, t);
        const spark = history.series(view.tempEntity, {
          buckets: 48,
          fill: "hold",
        });
        return (
          <SystemCard
            key={`system:${card.id}`}
            card={view}
            spark={spark}
            sparkGraph={
              spark.length
                ? {
                    mode: "line",
                    start: nowMs - 86_400_000,
                    end: nowMs,
                    unit: tempUnit,
                    decimals: 1,
                    series: [{ values: spark }],
                  }
                : null
            }
            onOpen={() => actions.navigate(view.route)}
          />
        );
      })}
    </>
  );
}

function EmptyRooms() {
  const t = useTranslator();
  return (
    <div className={c("empty")}>
      <Icon name="home" />
      <div>
        <b>{t("empty.areas")}</b>
        <br />
        {t("empty.areasHint")}
      </div>
    </div>
  );
}

/** Indoor tiles, system cards, then the outdoor rooms. */
function RoomTiles({
  rooms,
  language,
  tempUnit,
}: {
  rooms: RoomModel[];
  language: string;
  tempUnit: TemperatureUnit;
}) {
  const model = useModel();
  const outdoorRooms = model.rooms.filter(isOutdoorRoom);
  return (
    <>
      {rooms.map((room) => (
        <RoomTile
          key={room.id}
          room={room}
          language={language}
          tempUnit={tempUnit}
        />
      ))}
      <SystemTiles tempUnit={tempUnit} />
      {outdoorRooms.map((room) => (
        <RoomTile
          key={room.id}
          room={room}
          language={language}
          tempUnit={tempUnit}
          outdoor
        />
      ))}
    </>
  );
}

function FloorLayoutView({
  rooms,
  language,
  tempUnit,
}: {
  rooms: RoomModel[];
  language: string;
  tempUnit: TemperatureUnit;
}) {
  const layout = buildFloorGroups(rooms);
  return (
    <>
      {layout.groups.map((group) => (
        <Fragment key={`floor:${group.id}`}>
          <div className={c("block-label")} data-floor={group.id}>
            {group.name}
          </div>
          <div className={c("room-grid")}>
            {group.rooms.map((room) => (
              <RoomTile
                key={room.id}
                room={room}
                language={language}
                tempUnit={tempUnit}
              />
            ))}
          </div>
        </Fragment>
      ))}
      {layout.unfloored.length ? (
        <div className={c("room-grid")}>
          {layout.unfloored.map((room) => (
            <RoomTile
              key={room.id}
              room={room}
              language={language}
              tempUnit={tempUnit}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

function OutdoorTiles({
  rooms,
  language,
  tempUnit,
}: {
  rooms: RoomModel[];
  language: string;
  tempUnit: TemperatureUnit;
}) {
  return (
    <>
      {rooms.map((room) => (
        <RoomTile
          key={room.id}
          room={room}
          language={language}
          tempUnit={tempUnit}
          outdoor
        />
      ))}
    </>
  );
}

function RoomGridBody() {
  const model = useModel();
  const config = useConfig();
  const hass = useHass();
  const tempUnit = resolveTempUnit(hass, config);
  const language = resolveLanguage(hass.language, config);
  const displayRooms = model.rooms.filter((room) => !isOutdoorRoom(room));
  const outdoorRooms = model.rooms.filter(isOutdoorRoom);
  const hasFloors = displayRooms.some((room) =>
    Boolean(room.floorId ?? room.floorName),
  );

  if (!model.rooms.length) return <EmptyRooms />;

  if (config.group_by_floor !== true || !hasFloors) {
    return (
      <div className={c("room-grid")}>
        <RoomTiles
          rooms={displayRooms}
          language={language}
          tempUnit={tempUnit}
        />
      </div>
    );
  }

  return (
    <>
      <FloorLayoutView
        rooms={displayRooms}
        language={language}
        tempUnit={tempUnit}
      />
      <div className={c("room-grid")}>
        <SystemTiles tempUnit={tempUnit} />
        <OutdoorTiles
          rooms={outdoorRooms}
          language={language}
          tempUnit={tempUnit}
        />
      </div>
    </>
  );
}

/**
 * The discovered room grid. Rooms come first in discovery order, then the
 * ventilation system card, and the outdoor/skur rooms last.
 *
 * With `group_by_floor` the indoor rooms are split into one `.room-grid` per
 * floor (sorted by registry level). The flag is ignored when no room carries
 * floor metadata, which keeps the default single-grid markup.
 */
export function RoomGrid() {
  const t = useTranslator();
  const bindings = useBindings();
  useHistoryVersion();

  return (
    <>
      <div className={c("section-head")}>
        <div>
          <div className={c("kicker")}>{t("section.homeKicker")}</div>
          <h2>{t("section.roomsTitle")}</h2>
        </div>
        <div
          className={c("meta")}
          dangerouslySetInnerHTML={{ __html: bindings.roomsMeta }}
        />
      </div>
      <RoomGridBody />
    </>
  );
}
