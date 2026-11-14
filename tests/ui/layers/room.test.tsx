import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { HistoryCache } from "../../../src/data/history";
import { RoomBody } from "../../../src/ui/organisms/layers/RoomBody";
import { ArcusProvider } from "../../../src/ui/providers/ArcusProvider";
import { makeArcusProps } from "../home-test-utils";
import { renderLayer } from "../layer-test-utils";

describe("RoomBody", () => {
  test("renders the room header and temperature readings", () => {
    const { container } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "stue" },
    });

    expect(container.querySelector(".sheet-head")).not.toBeNull();
    expect(container.querySelector(".sheet-kicker")).toHaveTextContent("RUM");
    expect(container.querySelector(".sheet-title")).toHaveTextContent("Stue");
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "22,9° · luft – · lukket",
    );
    expect(container.querySelector(".readings .reading .v")).toHaveTextContent(
      "22,9°C",
    );
    expect(container.querySelectorAll(".chart-box")).toHaveLength(4);
    expect(container.querySelector(".sheet-scroll")).not.toBeNull();
  });

  test("renders skur through the skur route", () => {
    const { container } = renderLayer(RoomBody, {
      route: { base: "skur", sub: null },
    });

    expect(container.querySelector(".sheet-title")).toHaveTextContent("Skur");
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "18,4° · fugt 62 %",
    );
    expect(container.querySelectorAll(".chart-box")).toHaveLength(2);
  });

  test("a light group toggle calls light.toggle", () => {
    const { container, props } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "kokken" },
    });
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-act="toggle-light"][data-entity="light.kokken"]',
    );

    expect(toggle).not.toBeNull();
    fireEvent.click(toggle!);

    expect(props.actions.callService).toHaveBeenCalledWith(
      "light",
      "toggle",
      {},
      { entity_id: "light.kokken" },
    );
  });

  test("dragging the brightness slider calls light.turn_on", () => {
    const { container, props } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "kokken" },
    });
    const slider = container.querySelector<HTMLInputElement>(
      'input.range[data-range-entity="light.kokken"]',
    );

    expect(slider).not.toBeNull();
    fireEvent.input(slider!, { target: { value: "42" } });

    expect(slider!.value).toBe("42");
    expect(props.actions.callService).toHaveBeenCalledWith(
      "light",
      "turn_on",
      { brightness_pct: 42 },
      { entity_id: "light.kokken" },
    );
  });

  test("the heating stepper calls climate.set_temperature", () => {
    const { container, props } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "stue" },
    });
    const up = container.querySelector<HTMLButtonElement>(
      '[data-act="temp-step"][data-entity="climate.wavin_stue"][data-dir="1"]',
    );

    expect(up).not.toBeNull();
    fireEvent.click(up!);

    expect(props.actions.callService).toHaveBeenCalledWith(
      "climate",
      "set_temperature",
      { temperature: 23.5 },
      { entity_id: "climate.wavin_stue" },
    );
  });

  test("renders opening, battery, and media rows", () => {
    const { container } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "stue" },
    });

    const opening = container.querySelector(
      '[data-open="binary_sensor.myggbett_door_window_sensor_dor_7"]',
    );
    expect(opening).not.toBeNull();
    expect(opening).toHaveTextContent("Stue Dør");
    expect(opening?.querySelector(".status-line")).toHaveTextContent("LUKKET");
    expect(opening).not.toHaveClass("open");

    const battery = Array.from(
      container.querySelectorAll<HTMLElement>(".block"),
    ).find(
      (block) => block.querySelector(".block-label")?.textContent === "Batteri",
    );
    expect(battery).not.toBeUndefined();
    expect(battery).toHaveTextContent("82%");

    expect(
      container.querySelector(
        '[data-act="media-toggle"][data-entity="media_player.lg_speaker_sp8ya_2"]',
      ),
    ).not.toBeNull();
  });

  test("the media button calls media_play_pause", () => {
    const { container, props } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "stue" },
    });
    const button = container.querySelector<HTMLButtonElement>(
      '[data-act="media-toggle"][data-entity="media_player.lg_speaker_sp8ya_2"]',
    );

    fireEvent.click(button!);

    expect(props.actions.callService).toHaveBeenCalledWith(
      "media_player",
      "media_play_pause",
      {},
      { entity_id: "media_player.lg_speaker_sp8ya_2" },
    );
  });

  test("falls back to the first non-skur room for an unknown sub-route", () => {
    const { container } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "findes-ikke" },
    });

    expect(container.querySelector(".sheet-title")).toHaveTextContent("Stue");
  });

  test("charts expose the graph hover metadata when history has data", () => {
    const props = makeArcusProps();
    const history = {
      ...props.history,
      series: () => [1, 2, 3],
    } as unknown as HistoryCache;

    const { container } = render(
      <ArcusProvider {...props} history={history}>
        <RoomBody route={{ base: "rum", sub: "stue" }} />
      </ArcusProvider>,
    );

    const chart = container.querySelector(".chart-box");
    expect(chart).toHaveAttribute("data-graph", "line");
    expect(chart).not.toHaveClass("no-data");
    expect(chart?.querySelector("path[stroke]")).not.toHaveAttribute("d", "");
  });

  test("an empty model renders the empty state", () => {
    const base = makeArcusProps();
    const model = { ...base.model, rooms: [] };

    const { container } = renderLayer(RoomBody, {
      route: { base: "rum", sub: "stue" },
      model,
    });

    expect(screen.getByText("Ingen data endnu")).toBeInTheDocument();
    expect(container.querySelector(".empty")).not.toBeNull();
  });
});
