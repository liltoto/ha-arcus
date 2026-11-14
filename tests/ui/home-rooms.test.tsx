import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { roomView, type RoomStatsLike } from "../../src/ui/home-view";
import { RoomGrid } from "../../src/ui/organisms/RoomGrid";
import type { HomeModel } from "../../src/types";
import { renderWithArcus } from "./home-test-utils";

function statsOf(model: HomeModel, roomId: string): RoomStatsLike {
  const stats = model.roomStats as Record<string, RoomStatsLike>;
  return stats[roomId];
}

describe("RoomGrid", () => {
  it("renders the section head, rooms, system card, and skur last", () => {
    const { container, props } = renderWithArcus(<RoomGrid />);

    expect(screen.getByText("Rum for rum")).toBeInTheDocument();
    expect(container.querySelector(".section-head .kicker")).toHaveTextContent(
      "HJEMMET",
    );
    expect(container.querySelector(".section-head .meta")?.innerHTML).toBe(
      props.bindings.roomsMeta,
    );

    const displayRooms = props.model.rooms.filter((room) => room.id !== "skur");
    const roomCards = Array.from(container.querySelectorAll("[data-room]"));
    expect(roomCards).toHaveLength(displayRooms.length + 1);
    expect(roomCards.map((card) => card.getAttribute("data-room"))).toEqual([
      ...displayRooms.map((room) => room.id),
      "skur",
    ]);

    for (const room of displayRooms) {
      expect(
        container.querySelector(`[data-room="${room.id}"]`),
      ).toHaveTextContent(room.name);
    }

    const skur = container.querySelector('[data-room="skur"]');
    expect(skur).toHaveTextContent("Skur");
    expect(skur).toHaveTextContent("UDE · Rum");
    expect(container.querySelector(".room-grid")?.lastElementChild).toBe(skur);

    const systems = Array.from(container.querySelectorAll("[data-system]"));
    expect(systems).toHaveLength(props.model.systemCards.length);
  });

  it("renders the ventilation card with its legacy hooks", () => {
    const { container } = renderWithArcus(<RoomGrid />);

    const card = container.querySelector('[data-system="ventilation"]');
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute("data-nav", "ventilation");
    expect(card).toHaveTextContent("Ventilation");
    expect(card).toHaveTextContent("Nilan · luftskifte");
    expect(card).toHaveTextContent("23,2");
    expect(card).toHaveTextContent("blæsertrin 2 · 38 %");
    expect(card?.querySelector("svg.room-spark")).not.toBeNull();
    expect(card?.querySelector("[data-spark]")).toBeNull();
    expect(card).toHaveTextContent("åbn →");
  });

  it("navigates to a room and to the ventilation sheet", async () => {
    const user = userEvent.setup();
    const { container, props } = renderWithArcus(<RoomGrid />);

    await user.click(container.querySelector('[data-room="stue"]')!);
    expect(props.actions.navigate).toHaveBeenCalledWith("rum/stue");

    await user.click(container.querySelector('[data-system="ventilation"]')!);
    expect(props.actions.navigate).toHaveBeenCalledWith("ventilation");
  });

  it("builds RoomView labels for lights, openings, and leaks", () => {
    const { props } = renderWithArcus(<RoomGrid />);
    const room = props.model.rooms.find(
      (candidate) => candidate.id === "kokken",
    );
    expect(room).toBeDefined();
    if (!room) return;

    const language = "da";
    const build = (overrides: Partial<RoomStatsLike>) =>
      roomView(
        room,
        {
          ...props.model,
          roomStats: {
            ...props.model.roomStats,
            [room.id]: { ...statsOf(props.model, room.id), ...overrides },
          },
        },
        language,
        props.t,
      );

    const open = build({
      co2: 920,
      lightsOn: 2,
      lightsTotal: 5,
      open: 1,
      leak: false,
    });
    expect(open.air).toBe("mid");
    expect(open.airLabel).toContain("luft");
    expect(open.lightsLabel).toBe("2 / 5 lys");
    expect(open.openLabel).toBe("1 åben");
    expect(open.spark).toEqual([]);

    const leak = build({ open: 0, leak: true });
    expect(leak.openLabel).toBe("lækage");

    const closed = build({ open: 0, leak: false });
    expect(closed.openLabel).toBe("lukket");
  });
});
