import { resolveLanguage } from "../../localize";
import {
  useActions,
  useBindings,
  useConfig,
  useHass,
  useModel,
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
  const language = resolveLanguage(hass.language, config);

  const displayRooms = model.rooms.filter((room) => room.id !== "skur");
  const skurRoom = model.rooms.find((room) => room.id === "skur");

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
      <div className="room-grid">
        {displayRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={roomView(room, model, language, t)}
            language={language}
            openLabel={t("room.openRoom")}
            sparkKey={`roomTemp:${room.id}`}
            onOpen={() => actions.navigate(`rum/${room.id}`)}
          />
        ))}
        {model.systemCards.map((card) => {
          const view = systemCardView(card, language, t);
          return (
            <SystemCard
              key={`system:${card.id}`}
              card={view}
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
            sparkKey={`roomTemp:${skurRoom.id}`}
            onOpen={() => actions.navigate(`rum/${skurRoom.id}`)}
          />
        ) : null}
      </div>
    </>
  );
}
