import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { HistoryCache } from "../../../src/data/history";
import { HeatingBody } from "../../../src/ui/organisms/layers/HeatingBody";
import { SecurityBody } from "../../../src/ui/organisms/layers/SecurityBody";
import { ArcusProvider } from "../../../src/ui/providers/ArcusProvider";
import type { ArcusHass } from "../../../src/types";
import type { ArcusRoute } from "../../../src/ui/types";
import { makeArcusProps } from "../home-test-utils";
import { renderLayer } from "../layer-test-utils";

const SECURITY_ROUTE: ArcusRoute = { base: "sikkerhed", sub: null };
const HEATING_ROUTE: ArcusRoute = { base: "varme", sub: null };

function hassWithStates(
  base: ReturnType<typeof makeArcusProps>["hass"],
  overrides: Record<string, string>,
): ArcusHass {
  const states = { ...base.states };
  for (const [entityId, state] of Object.entries(overrides)) {
    states[entityId] = { ...states[entityId], state };
  }
  return { ...base, states };
}

function defaultHass() {
  return makeArcusProps().hass;
}

describe("security sheet", () => {
  test("renders the header and summary and closes the sheet", async () => {
    const user = userEvent.setup();
    const { container, props } = renderLayer(SecurityBody, {
      route: SECURITY_ROUTE,
    });

    expect(screen.getByText("SIKKERHED")).toBeInTheDocument();
    expect(container.querySelector(".sheet-title")).toHaveTextContent(
      "Sikkerhed",
    );
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "alt lukket · ingen lækage",
    );

    await user.click(screen.getByRole("button", { name: "Luk" }));
    expect(props.actions.closeSheet).toHaveBeenCalledTimes(1);
  });

  test("marks an open door in the house and in the opening list", () => {
    const doorId = "binary_sensor.myggbett_door_window_sensor_dor_7";
    const hass = hassWithStates(defaultHass(), { [doorId]: "on" });
    const { container } = renderLayer(SecurityBody, {
      hass,
      route: SECURITY_ROUTE,
    });

    const row = screen
      .getByText("Stue Dør", { selector: ".list .row-name" })
      .closest(".row");
    expect(row).toHaveTextContent("ÅBEN");
    expect(row).toHaveClass("on", "open");
    expect(
      container.querySelector(`.house-dot[data-open="${doorId}"]`),
    ).toHaveClass("open");
    expect(container.querySelector('[data-nav="rum/stue"]')).not.toBeNull();
  });

  test("shows the leak severity and the lowest battery first", () => {
    const leakId = "binary_sensor.klippbok_water_leak_sensor_water_leak";
    const lowBatteryId = "sensor.myggbett_door_window_sensor_batteri_2";
    const hass = hassWithStates(defaultHass(), { [leakId]: "on" });
    const { container } = renderLayer(SecurityBody, {
      hass,
      route: SECURITY_ROUTE,
    });

    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "vandlækage!",
    );
    expect(container.querySelector('[data-chip="leak"]')).toHaveAttribute(
      "data-sev",
      "crit",
    );
    expect(screen.getAllByText("ALARM").length).toBeGreaterThan(0);

    const batteryBar = container.querySelector(`[data-batt="${lowBatteryId}"]`);
    expect(batteryBar?.querySelector("i")).toHaveStyle({ width: "17%" });
    expect(batteryBar?.closest(".row")).toHaveTextContent("skift snart");
    expect(batteryBar?.closest(".row")).toHaveTextContent("17%");
  });

  test("toggles the window alert without confirmation when it is off", async () => {
    const user = userEvent.setup();
    const alertId = "input_boolean.window_alert_notification";
    const { props } = renderLayer(SecurityBody, { route: SECURITY_ROUTE });

    await user.click(screen.getByRole("button", { name: "Vindue-alarm" }));

    expect(props.actions.callService).toHaveBeenCalledWith(
      "input_boolean",
      "toggle",
      {},
      { entity_id: alertId },
    );
  });

  test("asks for confirmation before turning the window alert off", async () => {
    const user = userEvent.setup();
    const alertId = "input_boolean.window_alert_notification";
    const hass = hassWithStates(defaultHass(), { [alertId]: "on" });
    const { container, props } = renderLayer(SecurityBody, {
      hass,
      route: SECURITY_ROUTE,
    });

    await user.click(screen.getByRole("button", { name: "Vindue-alarm" }));
    expect(props.actions.callService).not.toHaveBeenCalled();
    expect(container.querySelector("[data-confirm]")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Bekræft" }));
    expect(props.actions.callService).toHaveBeenCalledWith(
      "input_boolean",
      "toggle",
      {},
      { entity_id: alertId },
    );
  });

  test("navigates to the alerts layer from the alarm action", async () => {
    const user = userEvent.setup();
    const { container, props } = renderLayer(SecurityBody, {
      route: SECURITY_ROUTE,
    });

    const action = container.querySelector<HTMLButtonElement>(
      '[data-act="alarm-action"]',
    );
    expect(action).not.toBeNull();
    await user.click(action!);

    expect(props.actions.navigate).toHaveBeenCalledWith("alarmer");
  });
});

describe("heating sheet", () => {
  test("renders the zones, reserve channels and zone strip", () => {
    const { container } = renderLayer(HeatingBody, { route: HEATING_ROUTE });

    expect(container.querySelector(".sheet-title")).toHaveTextContent(
      "Gulvvarme",
    );
    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "8 zoner · 0 med åbne vinduer",
    );

    const zoneRow = screen
      .getByText("Stue", { selector: ".list .row-name" })
      .closest(".row");
    expect(zoneRow?.querySelector(".row-sub")).toHaveTextContent(
      "22,9° nu · varmer",
    );
    expect(zoneRow?.querySelector(".stepper .val")).toHaveTextContent("23,0°");
    expect(zoneRow?.querySelector('[data-act="temp-step"]')).not.toBeNull();

    expect(screen.getByText("Kanal 6")).toBeInTheDocument();
    expect(container.querySelectorAll(".zone-strip i")).toHaveLength(11);
  });

  test("steps a zone and a reserve channel setpoint", async () => {
    const user = userEvent.setup();
    const { props } = renderLayer(HeatingBody, { route: HEATING_ROUTE });

    const zoneRow = screen
      .getByText("Stue", { selector: ".list .row-name" })
      .closest(".row") as HTMLElement;
    await user.click(
      within(zoneRow).getByRole("button", { name: "Increase Stue" }),
    );
    expect(props.actions.callService).toHaveBeenCalledWith(
      "climate",
      "set_temperature",
      { temperature: 23.5 },
      { entity_id: "climate.wavin_stue" },
    );

    const reserveRow = screen
      .getByText("Kanal 6", { selector: ".list .row-name" })
      .closest(".row") as HTMLElement;
    await user.click(
      within(reserveRow).getByRole("button", { name: "Increase Kanal 6" }),
    );
    expect(props.actions.callService).toHaveBeenCalledWith(
      "climate",
      "set_temperature",
      { temperature: 23.5 },
      { entity_id: "climate.wavin_kanal_6" },
    );
  });

  test("draws the history chart from the history cache", () => {
    const values = [21.1, 21.3, 21.6, 21.4];
    const props = makeArcusProps({ route: HEATING_ROUTE });
    const history = {
      ...props.history,
      ensure: vi.fn(async () => undefined),
      series: vi.fn(() => values),
    } as unknown as HistoryCache;

    const { container } = render(
      <ArcusProvider {...props} history={history}>
        <HeatingBody route={HEATING_ROUTE} />
      </ArcusProvider>,
    );

    expect(history.series).toHaveBeenCalledWith(
      "sensor.alpstuga_air_quality_monitor_temperatur_2",
    );
    const graph = container.querySelector("svg[data-graph]");
    expect(graph).toHaveAttribute("data-graph", "line");
    expect(graph).toHaveAttribute("data-gv", "21.1;21.3;21.6;21.4");

    expect(container.querySelector("[data-spark]")).toBeNull();
    expect(graph?.querySelector("path")?.getAttribute("d")).not.toBe("");
    expect(container.querySelector(".chart-box")).not.toHaveClass("no-data");
  });
});
