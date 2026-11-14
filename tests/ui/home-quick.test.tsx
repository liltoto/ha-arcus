import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { QuickActionConfig } from "../../src/types";
import { QuickActions } from "../../src/ui/organisms/QuickActions";
import { makeConfig, makeHass } from "../fixtures/home";
import { renderWithArcus } from "./home-test-utils";

const DEFAULTS = [
  "input_button.bedtime",
  "input_boolean.vacation_mode",
  "input_boolean.window_alert_notification",
] as const;

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

function quickButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>(".quick-row .quick"),
  );
}

describe("QuickActions", () => {
  it("renders the legacy default actions in order with their hooks", () => {
    const { container } = renderWithArcus(<QuickActions />, {
      config: makeConfig({ quick_actions: [] }),
    });

    const buttons = quickButtons(container);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      "Sengetid",
      "Ferietilstand",
      "Vindue-alarm",
      "Lys",
      "Kort",
    ]);

    expect(buttons[0]).toHaveAttribute("data-act", "press");
    expect(buttons[0]).toHaveAttribute("data-entity", DEFAULTS[0]);
    expect(buttons[0]).not.toHaveAttribute("data-on");

    for (const index of [1, 2]) {
      expect(buttons[index]).toHaveAttribute("data-act", "toggle-bool");
      expect(buttons[index]).toHaveAttribute("data-entity", DEFAULTS[index]);
      expect(buttons[index]).toHaveAttribute("data-on", DEFAULTS[index]);
    }

    expect(buttons[3]).toHaveAttribute("data-nav", "lys");
    expect(buttons[3]).not.toHaveAttribute("data-act");
    expect(buttons[4]).toHaveAttribute("data-act", "map");
  });

  it("presses, toggles, and navigates through the action bridge", async () => {
    const user = userEvent.setup();
    const { props } = renderWithArcus(<QuickActions />, {
      config: makeConfig({ quick_actions: [] }),
    });

    await user.click(screen.getByRole("button", { name: "Sengetid" }));
    expect(props.actions.callService).toHaveBeenCalledWith(
      "input_button",
      "press",
      {},
      { entity_id: "input_button.bedtime" },
    );

    await user.click(screen.getByRole("button", { name: "Ferietilstand" }));
    expect(props.actions.callService).toHaveBeenCalledWith(
      "input_boolean",
      "toggle",
      {},
      { entity_id: "input_boolean.vacation_mode" },
    );

    await user.click(screen.getByRole("button", { name: "Vindue-alarm" }));
    expect(props.actions.callService).toHaveBeenCalledWith(
      "input_boolean",
      "toggle",
      {},
      { entity_id: "input_boolean.window_alert_notification" },
    );

    await user.click(screen.getByRole("button", { name: "Lys" }));
    expect(props.actions.navigate).toHaveBeenCalledWith("lys");
  });

  it("marks an active default toggle with the on class", () => {
    const base = makeHass();
    const hass = makeHass({
      states: {
        ...base.states,
        "input_boolean.vacation_mode": {
          ...base.states["input_boolean.vacation_mode"],
          state: "on",
        },
      },
    });

    renderWithArcus(<QuickActions />, {
      hass,
      config: makeConfig({ quick_actions: [] }),
    });

    expect(screen.getByRole("button", { name: "Ferietilstand" })).toHaveClass(
      "quick",
      "on",
    );
    expect(
      screen.getByRole("button", { name: "Vindue-alarm" }),
    ).not.toHaveClass("on");
  });

  it("renders configured actions and performs their action config", async () => {
    const user = userEvent.setup();
    const quickActions: QuickActionConfig[] = [
      {
        label: "Godnat",
        icon: "moon",
        entity: "input_button.bedtime",
        action: {
          action: "perform-action",
          perform_action: "input_button.press",
          target: { entity_id: "input_button.bedtime" },
        },
      },
      {
        label: "Ferie",
        icon: "car",
        entity: "input_boolean.vacation_mode",
        action: {
          action: "toggle",
          entity_id: "input_boolean.vacation_mode",
        },
      },
    ];

    const { container, props } = renderWithArcus(<QuickActions />, {
      config: makeConfig({ quick_actions: quickActions }),
    });

    const buttons = quickButtons(container);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      "Godnat",
      "Ferie",
    ]);
    expect(buttons[0]).toHaveAttribute("data-act", "quick");
    expect(buttons[0]).toHaveAttribute("data-quick", "0");
    expect(buttons[1]).toHaveAttribute("data-act", "quick");
    expect(buttons[1]).toHaveAttribute("data-quick", "1");
    expect(buttons[1]).toHaveAttribute(
      "data-on",
      "input_boolean.vacation_mode",
    );

    await user.click(screen.getByRole("button", { name: "Godnat" }));
    expect(props.actions.performAction).toHaveBeenCalledWith(
      quickActions[0].action,
    );
  });

  it("keeps the lights and map shortcuts when the helper entities are missing", () => {
    const base = makeHass();
    const states = { ...base.states };
    for (const id of DEFAULTS) delete states[id];

    const { container } = renderWithArcus(<QuickActions />, {
      hass: makeHass({ states }),
      config: makeConfig({ quick_actions: [] }),
    });

    expect(container.querySelector(".section")).not.toBeNull();
    expect(container.querySelector(".quick-row")).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll(".quick")).map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(["Lys", "Kort"]);
  });
});
