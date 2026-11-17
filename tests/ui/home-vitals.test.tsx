import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HistoryCache } from "../../src/data/history";
import { ChapterGrid } from "../../src/ui/organisms/ChapterGrid";
import { DayArc } from "../../src/ui/organisms/DayArc";
import { Hero } from "../../src/ui/organisms/Hero";
import { RoomGrid } from "../../src/ui/organisms/RoomGrid";
import { TopBar } from "../../src/ui/organisms/TopBar";
import { Vitals } from "../../src/ui/organisms/Vitals";
import { makeConfig, makeHass } from "../fixtures/home";
import { makeArcusProps, renderWithArcus } from "./home-test-utils";

const WEATHER_STRIP =
  '<span class="wday"><span class="wname">I dag</span><span class="wico"></span><span class="wtemps"><b>4°</b>1°</span></span>';

const vitalFor = (label: string): HTMLElement => {
  const button = screen.getByText(label).closest("button");
  if (!button) throw new Error(`Missing vital button for ${label}`);
  return button;
};

describe("Vitals", () => {
  it("renders the four statistics from the bindings", () => {
    const { container, props } = renderWithArcus(<Vitals />);

    const indoor = vitalFor("Inde");
    expect(within(indoor).getByText(props.bindings.indoor)).toBeInTheDocument();
    expect(within(indoor).getByText("°C")).toBeInTheDocument();
    expect(
      within(indoor).getByText(props.bindings.indoorSub),
    ).toBeInTheDocument();

    const price = vitalFor("Elpris nu");
    expect(within(price).getByText(props.bindings.price)).toBeInTheDocument();
    expect(within(price).getByText("kr")).toBeInTheDocument();
    expect(
      within(price).getByText(props.bindings.priceSub),
    ).toBeInTheDocument();

    const battery = vitalFor("Batteri");
    expect(
      within(battery).getByText(props.bindings.battery),
    ).toBeInTheDocument();
    expect(within(battery).getByText("%")).toBeInTheDocument();
    expect(
      within(battery).getByText(props.bindings.batterySub),
    ).toBeInTheDocument();

    const solar = vitalFor("Sol lige nu");
    expect(
      within(solar).getByText(props.bindings.solarNow),
    ).toBeInTheDocument();
    expect(within(solar).getByText("W")).toBeInTheDocument();
    expect(
      within(solar).getByText(props.bindings.solarSub),
    ).toBeInTheDocument();

    expect(container.querySelectorAll(".vital-spark")).toHaveLength(3);
    expect(
      container.querySelector("svg.vital-spark[data-graph]"),
    ).not.toBeNull();
    expect(container.querySelector("[data-spark]")).toBeNull();

    const soc = props.model.solar?.batterySoc ?? 0;
    const ring = container.querySelector("[data-battery-ring]");
    expect(ring).not.toBeNull();
    expect(ring).toHaveAttribute(
      "stroke-dashoffset",
      String(100.5 - (soc / 100) * 100.5),
    );
    expect(ring).toHaveAttribute(
      "stroke",
      soc < 20 ? "var(--coral)" : soc > 80 ? "var(--sage)" : "var(--brass)",
    );

    const strip = container.querySelector(".weather-strip");
    expect(strip).not.toBeNull();
    expect(strip?.innerHTML).toBe("");
    expect(container.querySelector("[data-alert-slot]")).not.toBeNull();
  });

  it("renders the weather strip markup supplied by the card binding", () => {
    const result = renderWithArcus(<Vitals />);

    // `buildBindings` does not know about the async forecast; the card adds
    // `weatherStrip` in `_binds()`. Mirror that here and re-render.
    result.props.bindings.weatherStrip = WEATHER_STRIP;
    result.rerender(<Vitals />);

    const strip = result.container.querySelector(".weather-strip");
    expect(strip).not.toBeNull();
    expect(strip?.innerHTML).toContain('class="wday"');
    expect(screen.getByText("I dag")).toBeInTheDocument();
    expect(strip?.textContent).toContain("4°");
  });

  it("navigates to the first room, energy, and solar from the vitals", async () => {
    const user = userEvent.setup();
    const { props } = renderWithArcus(<Vitals />);

    await user.click(vitalFor("Inde"));
    expect(props.actions.navigate).toHaveBeenNthCalledWith(1, "rum/stue");

    await user.click(vitalFor("Elpris nu"));
    expect(props.actions.navigate).toHaveBeenNthCalledWith(2, "energi");

    await user.click(vitalFor("Batteri"));
    expect(props.actions.navigate).toHaveBeenNthCalledWith(3, "sol");

    await user.click(vitalFor("Sol lige nu"));
    expect(props.actions.navigate).toHaveBeenNthCalledWith(4, "sol");
  });
});

describe("Vitals configuration", () => {
  it("keeps the legacy four tiles when vitals is unset", () => {
    const { container } = renderWithArcus(<Vitals />);

    const tiles = [...container.querySelectorAll<HTMLElement>(".vital")];
    expect(tiles).toHaveLength(4);
    expect(
      tiles.map((tile) => tile.querySelector(".vital-label")?.textContent),
    ).toEqual(["Inde", "Elpris nu", "Batteri", "Sol lige nu"]);
    expect(within(tiles[0]).getByText("°C")).toBeInTheDocument();
    expect(within(tiles[1]).getByText("kr")).toBeInTheDocument();
    expect(within(tiles[2]).getByText("%")).toBeInTheDocument();
    expect(within(tiles[3]).getByText("W")).toBeInTheDocument();
  });

  it("renders the presets listed in config.vitals", () => {
    const config = makeConfig({
      vitals: ["indoor", "outdoor", "humidity", "power"],
    });
    const { container } = renderWithArcus(<Vitals />, { config });

    const tiles = [...container.querySelectorAll<HTMLElement>(".vital")];
    expect(tiles).toHaveLength(4);
    expect(
      tiles.map((tile) => tile.querySelector(".vital-label")?.textContent),
    ).toEqual(["Inde", "Ude", "Luftfugtighed", "Effekt nu"]);

    const outdoor = vitalFor("Ude");
    expect(within(outdoor).getByText("2,2")).toBeInTheDocument();
    expect(within(outdoor).getByText("°C")).toBeInTheDocument();

    const humidity = vitalFor("Luftfugtighed");
    expect(within(humidity).getByText("44")).toBeInTheDocument();
    expect(within(humidity).getByText("%")).toBeInTheDocument();

    const power = vitalFor("Effekt nu");
    expect(within(power).getByText("665")).toBeInTheDocument();
    expect(within(power).getByText("W")).toBeInTheDocument();

    // The battery gauge is opt-in, not part of this selection.
    expect(container.querySelector("[data-battery-ring]")).toBeNull();
  });

  it("renders the security and lights presets", () => {
    const config = makeConfig({ vitals: ["security", "lights"] });
    const { container } = renderWithArcus(<Vitals />, { config });

    const tiles = [...container.querySelectorAll<HTMLElement>(".vital")];
    expect(
      tiles.map((tile) => tile.querySelector(".vital-label")?.textContent),
    ).toEqual(["Sikkerhed", "Lys tændt"]);

    const security = vitalFor("Sikkerhed");
    expect(within(security).getByText("0")).toBeInTheDocument();
    expect(within(security).getByText("lukket")).toBeInTheDocument();

    const lights = vitalFor("Lys tændt");
    expect(within(lights).getByText("0")).toBeInTheDocument();
    expect(within(lights).getByText("/ 15")).toBeInTheDocument();
  });

  it("renders a custom entity vital and plots its history", async () => {
    const user = userEvent.setup();
    const hass = makeHass();
    hass.states["sensor.garage_temp"] = {
      entity_id: "sensor.garage_temp",
      state: "12.6",
      attributes: {},
      last_changed: "2026-11-13T00:00:00+01:00",
      last_updated: "2026-11-13T00:00:00+01:00",
    };
    const config = makeConfig({
      vitals: [
        {
          label: "Garage",
          entity: "sensor.garage_temp",
          unit: "°C",
          route: "rum/skur",
          decimals: 0,
          color: "var(--amber)",
        },
      ],
    });
    const history = {
      ensure: async () => undefined,
      subscribe: () => () => {},
      getVersion: () => 0,
      series: vi.fn((entityId: string) =>
        entityId === "sensor.garage_temp" ? [10, 11, 12, 13] : [],
      ),
      window: () => [],
      raw: () => [],
    } as unknown as HistoryCache;

    const { container, props } = renderWithArcus(<Vitals />, {
      hass,
      config,
      history,
    });

    const tiles = [...container.querySelectorAll(".vital")];
    expect(tiles).toHaveLength(1);

    const garage = vitalFor("Garage");
    expect(within(garage).getByText("13")).toBeInTheDocument();
    expect(within(garage).getByText("°C")).toBeInTheDocument();
    expect(
      garage.querySelector(".vital-spark path")?.getAttribute("d"),
    ).not.toBe("");

    expect(history.series).toHaveBeenCalledWith(
      "sensor.garage_temp",
      expect.objectContaining({ buckets: 96, fill: "hold" }),
    );

    await user.click(garage);
    expect(props.actions.navigate).toHaveBeenCalledWith("rum/skur");
  });

  it("uses units.temperature and units.currency in the default tiles", () => {
    const config = makeConfig({
      units: { temperature: "°F", currency: "EUR" },
    });
    renderWithArcus(<Vitals />, { config });

    const indoor = vitalFor("Inde");
    expect(within(indoor).getByText("°F")).toBeInTheDocument();
    expect(within(indoor).queryByText("°C")).toBeNull();

    const price = vitalFor("Elpris nu");
    expect(within(price).getByText("EUR")).toBeInTheDocument();
    expect(within(price).queryByText("kr")).toBeNull();
  });
});

describe("ChapterGrid chapter_order", () => {
  it("orders chapters by chapter_order and numbers the result", () => {
    const config = makeConfig({ chapter_order: ["lys", "varme"] });
    const { container } = renderWithArcus(<ChapterGrid />, { config });

    const cards = [
      ...container.querySelectorAll<HTMLElement>("[data-chapter]"),
    ];
    expect(cards.map((card) => card.dataset.chapter)).toEqual([
      "lys",
      "varme",
      "energi",
      "sol",
      "vand",
      "sikkerhed",
      "ventilation",
      "teknik",
      "oekonomi",
      "alarmer",
    ]);
    expect(
      cards.map((card) => card.querySelector(".num")?.textContent),
    ).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "AL"]);
  });

  it("keeps numbering tied to the ordered list when a chapter is disabled", () => {
    const config = makeConfig({
      chapter_order: ["lys"],
      chapters: { sol: false },
    });
    const { container } = renderWithArcus(<ChapterGrid />, { config });

    const cards = [
      ...container.querySelectorAll<HTMLElement>("[data-chapter]"),
    ];
    expect(cards.map((card) => card.dataset.chapter)).toEqual([
      "lys",
      "energi",
      "vand",
      "sikkerhed",
      "ventilation",
      "teknik",
      "oekonomi",
      "varme",
      "alarmer",
    ]);
    expect(
      cards.map((card) => card.querySelector(".num")?.textContent),
    ).toEqual(["01", "02", "04", "05", "06", "07", "08", "09", "AL"]);
  });

  it("keeps the legacy order when chapter_order is unset", () => {
    const { container } = renderWithArcus(<ChapterGrid />);

    const cards = [
      ...container.querySelectorAll<HTMLElement>("[data-chapter]"),
    ];
    expect(cards.map((card) => card.dataset.chapter)).toEqual([
      "energi",
      "sol",
      "vand",
      "sikkerhed",
      "ventilation",
      "teknik",
      "oekonomi",
      "lys",
      "varme",
      "alarmer",
    ]);
  });
});

describe("Hero without prayers", () => {
  it("turns the eyebrow into the all-layers shortcut", async () => {
    const user = userEvent.setup();
    const config = makeConfig({ auto_discover: false, prayers: undefined });
    const { props } = renderWithArcus(<Hero />, { config });

    const eyebrow = screen.getByRole("button", { name: "Se alle lag" });
    expect(eyebrow).toHaveAttribute("data-nav", "alle");
    await user.click(eyebrow);
    expect(props.actions.navigate).toHaveBeenCalledWith("alle");
  });
});

describe("DayArc without prayers", () => {
  it("labels the sun times from the sun model", () => {
    const config = makeConfig({ auto_discover: false, prayers: undefined });
    const { container, props } = renderWithArcus(<DayArc />, { config });

    expect(props.model.prayers).toBeUndefined();
    const labels = container.querySelector("[data-arc-labels]");
    expect(labels).toHaveTextContent("Sol op");
    expect(labels).toHaveTextContent("Sol ned");
  });
});

describe("RoomGrid group_by_floor", () => {
  it("splits rooms into one grid per floor sorted by level", () => {
    const base = makeArcusProps();
    const rooms = base.model.rooms.map((room, index) =>
      index < 3
        ? {
            ...room,
            floorId: "ground",
            floorName: "Stueetagen",
            floorLevel: 0,
          }
        : {
            ...room,
            floorId: "first",
            floorName: "Første sal",
            floorLevel: 1,
          },
    );
    const config = makeConfig({ group_by_floor: true });
    const { container } = renderWithArcus(<RoomGrid />, {
      config,
      model: { ...base.model, rooms },
    });

    const headings = [
      ...container.querySelectorAll<HTMLElement>(".block-label"),
    ];
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Stueetagen",
      "Første sal",
    ]);
    expect(headings.map((heading) => heading.dataset.floor)).toEqual([
      "ground",
      "first",
    ]);

    const grids = [...container.querySelectorAll(".room-grid")];
    expect(grids).toHaveLength(3);
    expect(
      [...grids[0].querySelectorAll("[data-room]")].map((card) =>
        card.getAttribute("data-room"),
      ),
    ).toEqual(["stue", "kokken", "sovevaerelse"]);
    expect(
      [...grids[2].querySelectorAll("[data-room]")].map((card) =>
        card.getAttribute("data-room"),
      ),
    ).toEqual(["skur"]);
  });
});

describe("TopBar configured person", () => {
  it("mutes the dot when the configured person is away", () => {
    const hass = makeHass();
    hass.states["person.liltoto"] = {
      ...hass.states["person.liltoto"],
      state: "not_home",
    };
    hass.states["person.guest"] = {
      ...hass.states["person.liltoto"],
      entity_id: "person.guest",
      state: "home",
    };
    const config = makeConfig({ person: "person.liltoto" });

    const { container } = renderWithArcus(<TopBar />, {
      hass,
      config,
      bindings: { person: "liltoto" },
    });

    expect(
      container.querySelector<HTMLElement>(".pill.name .dot")?.style.background,
    ).toBe("var(--muted)");
  });
});
