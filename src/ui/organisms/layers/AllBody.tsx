import { formatNumber } from "../../../format";
import type { ArcusConfig, HomeModel } from "../../../types";
import { useActions, useConfig, useModel, useTranslator } from "../../hooks";
import { EmptyState } from "../../atoms/EmptyState";
import { SheetHeader } from "../../molecules/SheetHeader";
import type { LayerBodyProps } from "../../pages/layerRegistry";
import { LayerShell } from "./misc/LayerShell";
import { MiscTile } from "./misc/MiscTile";

interface RoomStatsView {
  temp?: number | null;
  open?: number;
  leak?: boolean;
}

interface ChapterLink {
  route: string;
  icon: string;
  title: string;
}

function languageOf(model: HomeModel, config: ArcusConfig): "da" | "en" {
  return model.language === "en" || config.language === "en" ? "en" : "da";
}

/**
 * All layers: every room as a tile followed by the fixed chapter links. The
 * chapter list is static on purpose; the routes are the card's public
 * navigation surface, while the rooms come from the live model.
 */
export function AllBody(_props: LayerBodyProps) {
  const model = useModel();
  const config = useConfig();
  const t = useTranslator();
  const actions = useActions();
  const language = languageOf(model, config);
  const fmt = (value: number | null | undefined, digits = 1) =>
    formatNumber(value, digits, language);
  const stats = (model.roomStats ?? {}) as Record<string, RoomStatsView>;

  const roomTiles = model.rooms.map((room) => {
    const stat = stats[room.id];
    const parts: string[] = [];
    if (typeof stat?.temp === "number") {
      parts.push(`${fmt(stat.temp, 1)}°`);
    }
    if (stat?.leak) {
      parts.push(t("room.leak"));
    } else if (stat?.open) {
      parts.push(t("room.openCount", { count: stat.open }));
    } else if (room.openings.length) {
      parts.push(t("room.closed"));
    }

    return (
      <MiscTile
        key={room.id}
        route={`rum/${room.id}`}
        icon={room.icon}
        title={room.name}
        sub={parts.join(" · ") || t("room.openShort")}
        onOpen={() => actions.navigate(`rum/${room.id}`)}
      />
    );
  });

  const chapters: ChapterLink[] = [
    { route: "hjem", icon: "sun", title: t("sheet.titleHome") },
    { route: "bon", icon: "moon", title: t("sheet.titlePrayers") },
    { route: "lys", icon: "light", title: t("sheet.titleLights") },
    { route: "varme", icon: "heat", title: t("sheet.titleHeating") },
    {
      route: "ventilation",
      icon: "fan",
      title: t("sheet.titleVentilation"),
    },
    { route: "energi", icon: "bolt", title: t("sheet.titleEnergy") },
    { route: "sol", icon: "solar", title: t("sheet.titleSolar") },
    { route: "vand", icon: "drop", title: t("sheet.titleWater") },
    {
      route: "sikkerhed",
      icon: "shield",
      title: t("sheet.titleSecurity"),
    },
    { route: "teknik", icon: "network", title: t("sheet.titleTech") },
    { route: "oekonomi", icon: "chart", title: t("sheet.titleEconomy") },
    { route: "alarmer", icon: "bell", title: t("sheet.titleAlerts") },
  ];
  const homeChapters = chapters.slice(0, 8);
  const operationsChapters = chapters.slice(8);

  const chapterGrid = (items: ChapterLink[]) => (
    <div className="mini-grid">
      {items.map((chapter) => (
        <MiscTile
          key={chapter.route}
          route={chapter.route}
          icon={chapter.icon}
          title={chapter.title}
          sub={t("sheet.details")}
          onOpen={() => actions.navigate(chapter.route)}
        />
      ))}
    </div>
  );

  return (
    <LayerShell>
      <SheetHeader
        kicker={t("sheet.kickerOverview")}
        title={t("sheet.titleAll")}
        sum={t("sheet.allSummary")}
        closeLabel={t("sheet.close")}
        onClose={actions.closeSheet}
      />
      <div className="sheet-scroll">
        <div className="block">
          <div className="block-label">{t("section.roomsTitle")}</div>
          {roomTiles.length ? (
            <div className="mini-grid">{roomTiles}</div>
          ) : (
            <EmptyState icon="home" title={t("empty.rooms")} />
          )}
        </div>
        <div className="block">
          <div className="block-label">{t("sheet.navHome")}</div>
          {chapterGrid(homeChapters)}
        </div>
        <div className="block">
          <div className="block-label">{t("sheet.navOperations")}</div>
          {chapterGrid(operationsChapters)}
        </div>
      </div>
    </LayerShell>
  );
}
