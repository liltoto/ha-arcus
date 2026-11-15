import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { QuickActionConfig } from "../../src/types";
import { QuickActions } from "../../src/ui/organisms/QuickActions";
import { makeConfig, makeHass } from "../fixtures/home";
import { renderWithArcus } from "./home-test-utils";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

function quickButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>(".quick-row .quick"),
  );
}

describe("QuickActions", () => {
  it("renders only the generic shortcuts when none are configured", () => {
    const { container } = renderWithArcus(<QuickActions />, {
      config: makeConfig({ quick_actions: [] }),
    });

    const buttons = quickButtons(container);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      "Lys",
      "Kort",
    ]);

    expect(buttons[0]).toHaveAttribute("data-nav", "lys");
    expect(buttons[0]).not.toHaveAttribute("data-act");
    expect(buttons[1]).toHaveAttribute("data-act", "map");

    // Home-specific helper entities must never be hardcoded.
    expect(
      container.querySelector('[data-entity="input_boolean.vacation_mode"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-entity="input_button.bedtime"]'),
    ).toBeNull();
  });

  it("navigates from the generic shortcuts", async () => {
    const user = userEvent.setup();
    const { props } = renderWithArcus(<QuickActions />, {
      config: makeConfig({ quick_actions: [] }),
    });

    await user.click(screen.getByRole("button", { name: "Lys" }));
    expect(props.actions.navigate).toHaveBeenCalledWith("lys");

    await user.click(screen.getByRole("button", { name: "Kort" }));
    expect(window.location.pathname).toBe("/map");
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

  it("marks a configured toggle with the on class", () => {
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
      config: makeConfig({
        quick_actions: [
          {
            label: "Ferie",
            icon: "car",
            entity: "input_boolean.vacation_mode",
            action: {
              action: "toggle",
              entity_id: "input_boolean.vacation_mode",
            },
          },
        ],
      }),
    });

    expect(screen.getByRole("button", { name: "Ferie" })).toHaveClass(
      "quick",
      "on",
    );
  });

  it("follows toggle state pushes through the store selector", () => {
    const base = makeHass();
    const config = makeConfig({
      quick_actions: [
        {
          label: "Ferie",
          icon: "car",
          entity: "input_boolean.vacation_mode",
          action: {
            action: "toggle",
            entity_id: "input_boolean.vacation_mode",
          },
        },
      ],
    });

    const { store } = renderWithArcus(<QuickActions />, { config, hass: base });
    const ferie = screen.getByRole("button", { name: "Ferie" });
    expect(ferie).not.toHaveClass("on");

    const next = makeHass({
      states: {
        ...base.states,
        "input_boolean.vacation_mode": {
          ...base.states["input_boolean.vacation_mode"],
          state: "on",
        },
      },
    });
    act(() => store.setState({ hass: next }));

    expect(screen.getByRole("button", { name: "Ferie" })).toHaveClass(
      "quick",
      "on",
    );
  });
});
