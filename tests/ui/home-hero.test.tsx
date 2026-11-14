import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { formatTime } from "../../src/format";
import { createTranslator } from "../../src/localize";
import { Hero } from "../../src/ui/organisms/Hero";
import { makeHass } from "../fixtures/home";
import { renderWithArcus } from "./home-test-utils";

const NOW = new Date("2026-11-13T01:19:00+01:00");

/**
 * The card composes the hero copy in `_binds()`. Mirror just those keys here so
 * the organism can be rendered without mounting the whole card.
 */
function heroBindings(): Record<string, string> {
  const hass = makeHass();
  const t = createTranslator("da");
  const userName = (hass.user?.name ?? "hjem").split(" ")[0];
  const weekday = new Intl.DateTimeFormat("da-DK", {
    weekday: "long",
  }).format(NOW);
  const day = `${weekday.charAt(0).toLocaleUpperCase()}${weekday.slice(1)}`;

  return {
    eyebrow: t("hero.eyebrow"),
    greet: `Godnat, <em>${userName}</em>`,
    heroDate: `${day} · kl. ${formatTime(NOW, "da")}`,
    weatherTemp: "2,2°",
    weatherSub: t("weather.partlycloudy"),
  };
}

describe("Hero", () => {
  it("renders the greeting, prayer shortcut, date, weather, and day arc", () => {
    const bindings = heroBindings();
    const { container } = renderWithArcus(<Hero />, {
      now: () => NOW,
      bindings,
    });

    const greeting = screen.getByRole("heading", { level: 1 });
    expect(greeting).toHaveClass("greeting");
    expect(greeting).toHaveTextContent("Godnat");
    expect(greeting).toHaveTextContent("liltoto");
    expect(greeting.querySelector("em")).not.toBeNull();

    const eyebrow = screen.getByRole("button", {
      name: "Se alle bedetider",
    });
    expect(eyebrow).toHaveAttribute("data-nav", "bon");
    expect(eyebrow).toHaveTextContent(bindings.eyebrow);
    expect(eyebrow.querySelector(".eyebrow-arrow svg")).not.toBeNull();

    expect(container.querySelector(".hero-top")).not.toBeNull();
    expect(container.querySelector(".hero-date")).toHaveTextContent(
      bindings.heroDate,
    );
    expect(container.querySelector(".weather-icon svg")).not.toBeNull();
    expect(container.querySelector(".weather-temp")).toHaveTextContent("2,2°");
    expect(container.querySelector(".weather-sub")).toHaveTextContent(
      "delvist skyet",
    );
    expect(container.querySelector(".arc-wrap[data-arc]")).not.toBeNull();
  });

  it("opens the prayer sheet from the eyebrow", async () => {
    const user = userEvent.setup();
    const { props } = renderWithArcus(<Hero />, {
      now: () => NOW,
      bindings: heroBindings(),
    });

    await user.click(screen.getByRole("button", { name: "Se alle bedetider" }));

    expect(props.actions.navigate).toHaveBeenCalledWith("bon");
  });
});
