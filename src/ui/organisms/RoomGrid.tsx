import { resolveLanguage } from "../../localize";
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

/**
 * The discovered room grid. Rooms come first in discovery order, then the
 * ventilation system card, and the outdoor/skur room last.
 */
export function RoomGrid() {
  const model = useModel();
  const config = useConfig();
  const hass = useHass();
  const t = useTranslator();
  const bindings = useBindings();
  const actions = useActions();
  const history = useHistory();
  const now = useNow();
  const language = resolveLanguage(hass.language, config);
  useHistoryVersion();
  const nowMs = now().getTime();
  const sparkGraph = (values: Array<number | null>) =>
    values.length
      ? {
          mode: "line" as const,
          start: nowMs - 86_400_000,
          end: nowMs,
          unit: "°C",
          decimals: 1,
          series: [{ values }],
        }
      : null;

  const displayRooms = model.rooms.filter((room) => room.id !== "skur");
  const skurRoom = model.rooms.find((room) => room.id === "skur");
  const hasRooms = model.rooms.length > 0;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="kicker">{t("section.homeKicker")}</div>
          <h2>{t("section.roomsTitle")}</h2>
        </div>
        <div
          className="meta"
          dangerouslySetInnerHTML={{ __html: bindings.roomsMeta }}
        />
      </div>
      {hasRooms ? (
      <div className="room-grid">
        {displayRooms.map((room) => {
          const spark = history.series(room.temp?.entityId ?? "", {
            buckets: 48,
            fill: "hold",
          });
          return (
            <RoomCard
              key={room.id}
              room={roomView(room, model, language, t)}
              language={language}
              openLabel={t("room.openRoom")}
              spark={spark}
              sparkGraph={sparkGraph(spark)}
              onOpen={() => actions.navigate(`rum/${room.id}`)}
            />
          );
        })}
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
              sparkGraph={sparkGraph(spark)}
              onOpen={() => actions.navigate(view.route)}
            />
          );
        })}
        {skurRoom ? (
          <RoomCard
            key={skurRoom.id}
            room={roomView(
              skurRoom,
              model,
              language,
              t,
              `${t("sheet.kickerOutside")} · ${t("room.kind")}`,
            )}
            language={language}
            openLabel={t("room.openRoom")}
            spark={history.series(skurRoom.temp?.entityId ?? "", {
              buckets: 48,
              fill: "hold",
            })}
            sparkGraph={sparkGraph(
              history.series(skurRoom.temp?.entityId ?? "", {
                buckets: 48,
                fill: "hold",
              }),
            )}
            onOpen={() => actions.navigate(`rum/${skurRoom.id}`)}
          />
        ) : null}
      </div>
      ) : (
        <div className="empty">
          <Icon name="home" />
          <div>
            <b>{t("empty.areas")}</b>
            <br />
            {t("empty.areasHint")}
          </div>
        </div>
      )}
    </>
  );
}
