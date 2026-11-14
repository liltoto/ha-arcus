import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildModel } from "../../../src/model/build";
import type { AlertModel, HomeModel } from "../../../src/types";
import { AllBody } from "../../../src/ui/organisms/layers/AllBody";
import { AlertsBody } from "../../../src/ui/organisms/layers/AlertsBody";
import { PrayersBody } from "../../../src/ui/organisms/layers/PrayersBody";
import { makeConfig, makeHass } from "../../fixtures/home";
import { renderLayer } from "../layer-test-utils";

// The fixture times are Europe/Copenhagen. Pin the zone so the formatted
// prayer clock and the next-prayer countdown are stable on CI (which is UTC).
(globalThis as { process?: { env: Record<string, string> } }).process!.env.TZ =
  "Europe/Copenhagen";

const NOW = new Date("2026-11-13T01:19:00+01:00");
const baseModel = buildModel(makeHass(), makeConfig(), NOW);

const PRAYERS_ROUTE = { base: "bon", sub: null };
const ALERTS_ROUTE = { base: "alarmer", sub: null };
const ALL_ROUTE = { base: "alle", sub: null };

const ALERTS: AlertModel[] = [
  {
    sev: 1,
    key: "info",
    title: "Info ting",
    text: "Bare til orientering.",
    route: "teknik",
  },
  {
    sev: 3,
    key: "crit",
    title: "Kritisk ting",
    text: "Kræver handling nu.",
    route: "sikkerhed",
  },
  {
    sev: 2,
    key: "warn",
    title: "Advarsel ting",
    text: "Bør tjekkes.",
    route: "vand",
  },
];

describe("PrayersBody", () => {
  it("renders every prayer and highlights the next one", () => {
    const prayers = baseModel.prayers;
    expect(prayers).toBeTruthy();
    const next = prayers!.next;
    expect(next).toBeTruthy();

    const { container } = renderLayer(PrayersBody, {
      model: baseModel,
      route: PRAYERS_ROUTE,
      now: () => NOW,
    });

    expect(screen.getByRole("heading", { name: "Bedetider" })).toBeVisible();
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(next!.name);

    const list = container.querySelector(".prayer-list");
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll(".row")).toHaveLength(prayers!.times.length);

    const nextRow = container.querySelector<HTMLElement>(
      '.prayer-list .row[data-next="true"]',
    );
    expect(nextRow).not.toBeNull();
    expect(nextRow).toHaveClass("on", "next");
    expect(nextRow).toHaveTextContent(next!.name);
    expect(nextRow).toHaveTextContent("NÆSTE");

    expect(screen.getByText("Sol op")).toBeInTheDocument();
    expect(screen.getByText("Sol ned")).toBeInTheDocument();
    expect(screen.getByText("Dagens fem bønner")).toBeInTheDocument();
  });

  it("shows the empty state when the model has no prayers", () => {
    const model: HomeModel = { ...baseModel, prayers: undefined };
    const result = renderLayer(PrayersBody, {
      model,
      route: PRAYERS_ROUTE,
      now: () => NOW,
    });

    expect(screen.getByText("Ingen tidspunkter fundet.")).toBeInTheDocument();
    expect(result.container.querySelector(".sheet-sum")).toHaveTextContent(
      "Dagens tider",
    );

    fireEvent.click(screen.getByRole("button", { name: "Luk" }));
    expect(result.props.actions.closeSheet).toHaveBeenCalledTimes(1);
  });
});

describe("AlertsBody", () => {
  it("orders alerts critical, warning, info and routes to the owner", () => {
    const model: HomeModel = { ...baseModel, alerts: ALERTS };
    const result = renderLayer(AlertsBody, {
      model,
      route: ALERTS_ROUTE,
      now: () => NOW,
    });

    expect(screen.getByRole("heading", { name: "Alarmer" })).toBeVisible();
    expect(result.container.querySelector(".sheet-sum")).toHaveTextContent(
      "3 ting kræver opmærksomhed",
    );

    const rows = [
      ...result.container.querySelectorAll<HTMLElement>(".alert-row"),
    ];
    expect(
      rows.map((row) => row.querySelector(".row-name")?.textContent),
    ).toEqual(["Kritisk ting", "Advarsel ting", "Info ting"]);

    expect(rows[0].querySelector(".alert-dot.crit")).not.toBeNull();
    expect(rows[0]).toHaveTextContent("KRITISK");
    expect(rows[0]).toHaveAttribute("data-nav", "sikkerhed");
    expect(rows[1].querySelector(".alert-dot.warn")).not.toBeNull();
    expect(rows[1]).toHaveTextContent("ADVARSEL");
    expect(rows[2].querySelector(".alert-dot.info")).not.toBeNull();
    expect(rows[2]).toHaveTextContent("INFO");

    fireEvent.click(rows[0]);
    expect(result.props.actions.navigate).toHaveBeenCalledWith("sikkerhed");
  });

  it("shows the calm empty state when there are no alerts", () => {
    const model: HomeModel = { ...baseModel, alerts: [] };
    const result = renderLayer(AlertsBody, {
      model,
      route: ALERTS_ROUTE,
      now: () => NOW,
    });

    expect(screen.getByText("Alt er, som det skal være.")).toBeInTheDocument();
    expect(screen.getByText("Ingen alarmer lige nu.")).toBeInTheDocument();
    expect(result.container.querySelectorAll(".alert-row")).toHaveLength(0);
    expect(result.container.querySelector(".sheet-sum")).toHaveTextContent(
      "alt er roligt",
    );
  });
});

describe("AllBody", () => {
  it("renders every room as a navigable tile", () => {
    const result = renderLayer(AllBody, {
      model: baseModel,
      route: ALL_ROUTE,
      now: () => NOW,
    });

    expect(screen.getByRole("heading", { name: "Alle lag" })).toBeVisible();
    expect(baseModel.rooms.length).toBeGreaterThan(0);

    for (const room of baseModel.rooms) {
      const tile = result.container.querySelector(
        `[data-nav="rum/${room.id}"]`,
      );
      expect(tile).not.toBeNull();
      expect(tile).toHaveTextContent(room.name);
    }

    fireEvent.click(
      result.container.querySelector('[data-nav="rum/stue"]') as HTMLElement,
    );
    expect(result.props.actions.navigate).toHaveBeenCalledWith("rum/stue");
  });

  it("links both chapter groups to their routes", () => {
    const result = renderLayer(AllBody, {
      model: baseModel,
      route: ALL_ROUTE,
      now: () => NOW,
    });

    expect(screen.getByText("Hjemmet")).toBeInTheDocument();
    expect(screen.getByText("Drift")).toBeInTheDocument();

    for (const route of [
      "hjem",
      "bon",
      "lys",
      "varme",
      "ventilation",
      "energi",
      "sol",
      "vand",
      "sikkerhed",
      "teknik",
      "oekonomi",
      "alarmer",
    ]) {
      expect(
        result.container.querySelector(`[data-nav="${route}"]`),
      ).not.toBeNull();
    }

    fireEvent.click(
      result.container.querySelector('[data-nav="bon"]') as HTMLElement,
    );
    expect(result.props.actions.navigate).toHaveBeenCalledWith("bon");
  });

  it("shows the room empty state but keeps the chapter links", () => {
    const model: HomeModel = { ...baseModel, rooms: [] };
    const result = renderLayer(AllBody, {
      model,
      route: ALL_ROUTE,
      now: () => NOW,
    });

    expect(screen.getByText("Ingen rum fundet")).toBeInTheDocument();
    expect(result.container.querySelector('[data-nav^="rum/"]')).toBeNull();
    expect(result.container.querySelector('[data-nav="hjem"]')).not.toBeNull();
  });
});
