import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { HistoryCache } from "../../../src/data/history";
import { HeatingBody } from "../../../src/ui/organisms/layers/HeatingBody";
import { SecurityBody } from "../../../src/ui/organisms/layers/SecurityBody";
import { ArcusProvider } from "../../../src/ui/providers/ArcusProvider";
import type { ArcusHass } from "../../../src/types";
import type { ArcusRoute } from "../../../src/ui/types";
import { makeConfig } from "../../fixtures/home";
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

function hassWithEntity(
  base: ArcusHass,
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
): ArcusHass {
  return {
    ...base,
    states: {
      ...base.states,
      [entityId]: {
        entity_id: entityId,
        state,
        attributes,
        last_changed: "2026-11-13T00:00:00.000Z",
        last_updated: "2026-11-13T00:00:00.000Z",
      },
    },
  };
}

function block(container: HTMLElement, label: string): HTMLElement {
  return [...container.querySelectorAll<HTMLElement>(".block")].find(
    (entry) => entry.querySelector(".block-label")?.textContent === label,
  )!;
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

  test("lists locks and unlocks a locked door", () => {
    const lockId = "lock.front_door";
    const base = defaultHass();
    const hass: ArcusHass = {
      ...hassWithEntity(base, lockId, "locked", {
        friendly_name: "Hoveddør",
      }),
      entities: {
        ...base.entities,
        [lockId]: { entity_id: lockId, area_id: "stue" },
      },
    };
    const config = makeConfig({ security: { locks: [lockId] } });
    const { container, props } = renderLayer(SecurityBody, {
      hass,
      config,
      route: SECURITY_ROUTE,
    });

    const lockBlock = block(container, "Låse");
    const row = within(lockBlock)
      .getByText("Hoveddør", { selector: ".row-name" })
      .closest(".row") as HTMLElement;
    expect(row.querySelector(".row-sub")).toHaveTextContent("Stue");
    expect(row.querySelector(".chip")).toHaveTextContent("LÅST");

    fireEvent.click(within(row).getByRole("button", { name: "Hoveddør" }));
    expect(props.actions.callService).toHaveBeenCalledWith(
      "lock",
      "unlock",
      {},
      { entity_id: lockId },
    );
  });

  test("maps the alarm panel state labels", () => {
    const alarmId = "alarm_control_panel.home";
    const config = makeConfig({ security: { alarm: alarmId } });
    const cases = [
      ["armed_home", "Tilkoblet hjemme"],
      ["armed_away", "Tilkoblet ude"],
      ["disarmed", "Frakoblet"],
    ] as const;

    for (const [state, label] of cases) {
      const hass = hassWithEntity(defaultHass(), alarmId, state, {
        friendly_name: "Alarmanlæg",
      });
      const { container, unmount } = renderLayer(SecurityBody, {
        hass,
        config,
        route: SECURITY_ROUTE,
      });

      expect(
        block(container, "Alarmanlæg").querySelector(".block-head b"),
      ).toHaveTextContent(label);
      unmount();
    }
  });

  test("arms and disarms the alarm panel", () => {
    const alarmId = "alarm_control_panel.home";
    const hass = hassWithEntity(defaultHass(), alarmId, "disarmed", {
      friendly_name: "Alarmanlæg",
    });
    const config = makeConfig({ security: { alarm: alarmId } });
    const { container, props } = renderLayer(SecurityBody, {
      hass,
      config,
      route: SECURITY_ROUTE,
    });

    fireEvent.click(
      container.querySelector<HTMLButtonElement>(
        '[data-act="alarm-arm-home"]',
      )!,
    );
    expect(props.actions.callService).toHaveBeenCalledWith(
      "alarm_control_panel",
      "alarm_arm_home",
      {},
      { entity_id: alarmId },
    );

    fireEvent.click(
      container.querySelector<HTMLButtonElement>(
        '[data-act="alarm-arm-away"]',
      )!,
    );
    expect(props.actions.callService).toHaveBeenCalledWith(
      "alarm_control_panel",
      "alarm_arm_away",
      {},
      { entity_id: alarmId },
    );

    fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-act="alarm-disarm"]')!,
    );
    expect(props.actions.callService).toHaveBeenCalledWith(
      "alarm_control_panel",
      "alarm_disarm",
      {},
      { entity_id: alarmId },
    );
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
      { buckets: 96, fill: "hold" },
    );
    const graph = container.querySelector("svg[data-graph]");
    expect(graph).toHaveAttribute("data-graph", "line");
    expect(graph).toHaveAttribute("data-gv", "21.1;21.3;21.6;21.4");

    expect(container.querySelector("[data-spark]")).toBeNull();
    expect(graph?.querySelector("path")?.getAttribute("d")).not.toBe("");
    expect(container.querySelector(".chart-box")).not.toHaveClass("no-data");
  });

  test("treats a cool climate zone as a valid zone", () => {
    const climateId = "climate.loft_aircon";
    const hass = hassWithEntity(defaultHass(), climateId, "cool", {
      friendly_name: "Loft",
      current_temperature: 24.2,
      temperature: 22,
      min_temp: 16,
      max_temp: 30,
      hvac_modes: ["off", "cool", "heat_cool"],
      hvac_action: "cooling",
    });
    const { container } = renderLayer(HeatingBody, {
      route: HEATING_ROUTE,
      hass,
    });

    expect(container.querySelector(".sheet-sum")).toHaveTextContent(
      "9 zoner · 0 med åbne vinduer",
    );
    const row = screen
      .getByText("Loft", { selector: ".list .row-name" })
      .closest(".row") as HTMLElement;
    expect(row.querySelector(".row-sub")).toHaveTextContent("24,2° nu · køler");
  });
});
