import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChapterGrid } from "../../src/ui/organisms/ChapterGrid";
import { makeConfig } from "../fixtures/home";
import { renderWithArcus } from "./home-test-utils";

const CHAPTER_ORDER = [
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
];

const CHAPTER_TITLES = [
  "Energi",
  "Solceller",
  "Vand",
  "Sikkerhed",
  "Ventilation",
  "Teknik",
  "Økonomi",
  "Lys",
  "Gulvvarme",
  "Alarmer",
];

describe("ChapterGrid", () => {
  it("renders the section head and every enabled chapter in legacy order", () => {
    const { container } = renderWithArcus(<ChapterGrid />);

    expect(screen.getByText("LAGENE")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Husets kapitler" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tryk for detaljer")).toBeInTheDocument();
    expect(screen.getByText("alt kan betjenes")).toBeInTheDocument();

    const cards = [
      ...container.querySelectorAll<HTMLElement>("[data-chapter]"),
    ];
    expect(cards).toHaveLength(CHAPTER_ORDER.length);
    expect(cards.map((card) => card.dataset.chapter)).toEqual(CHAPTER_ORDER);
    expect(
      cards.map((card) => card.querySelector("h3")?.textContent),
    ).toEqual(CHAPTER_TITLES);
    expect(
      cards.map((card) => card.querySelector(".num")?.textContent),
    ).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "AL",
    ]);

    expect(screen.getAllByRole("button")).toHaveLength(CHAPTER_ORDER.length);
  });

  it("filters disabled chapters without renumbering the survivors", () => {
    const config = makeConfig({
      chapters: { sol: false, varme: false },
    });
    const { container } = renderWithArcus(<ChapterGrid />, { config });

    const cards = [
      ...container.querySelectorAll<HTMLElement>("[data-chapter]"),
    ];
    expect(cards.map((card) => card.dataset.chapter)).toEqual([
      "energi",
      "vand",
      "sikkerhed",
      "ventilation",
      "teknik",
      "oekonomi",
      "lys",
      "alarmer",
    ]);
    expect(
      cards.map((card) => card.querySelector(".num")?.textContent),
    ).toEqual(["01", "03", "04", "05", "06", "07", "08", "AL"]);
  });

  it("labels the alert tile with the short alert number", () => {
    const { container } = renderWithArcus(<ChapterGrid />);

    const alerts = container.querySelector<HTMLElement>(
      '[data-chapter="alarmer"]',
    );
    expect(alerts).not.toBeNull();
    expect(alerts?.querySelector(".num")).toHaveTextContent("AL");
    expect(alerts?.querySelector("h3")).toHaveTextContent("Alarmer");
    expect(alerts?.querySelector(".sum")?.innerHTML).toContain("<b>2 ting</b>");
  });

  it("opens the energy sheet and draws the price bars", async () => {
    const user = userEvent.setup();
    const { container, props } = renderWithArcus(<ChapterGrid />);

    expect(
      container.querySelector(
        '[data-chapter="energi"] .ch-art .price-bars',
      ),
    ).not.toBeNull();

    const energy = container.querySelector<HTMLButtonElement>(
      '[data-chapter="energi"]',
    );
    expect(energy).not.toBeNull();
    await user.click(energy!);

    expect(props.actions.navigate).toHaveBeenCalledWith("energi");
  });
});
