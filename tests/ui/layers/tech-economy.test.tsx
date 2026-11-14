import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import type { HistoryCache } from "../../../src/data/history";
import { formatNumber } from "../../../src/format";
import { EconomyBody } from "../../../src/ui/organisms/layers/EconomyBody";
import { TechBody } from "../../../src/ui/organisms/layers/TechBody";
import type { LayerBodyProps } from "../../../src/ui/pages/layerRegistry";
import { ArcusProvider } from "../../../src/ui/providers/ArcusProvider";
import type { ArcusRoute } from "../../../src/ui/types";
import { makeArcusProps } from "../home-test-utils";
import { renderLayer } from "../layer-test-utils";

const TECH_ROUTE: ArcusRoute = { base: "teknik", sub: null };
const ECONOMY_ROUTE: ArcusRoute = { base: "oekonomi", sub: null };

/**
 * `renderLayer` always installs the empty history stub. The chart tests need
 * plotted values, so they mount the same fixture provider with a local cache
 * double instead of editing the shared test utility.
 */
function renderWithHistory(
  Body: ComponentType<LayerBodyProps>,
  history: HistoryCache,
  route: ArcusRoute,
) {
  const props = makeArcusProps({ route });
  const result = render(
    <ArcusProvider {...props} history={history}>
      <Body route={route} />
    </ArcusProvider>,
  );
  return { ...result, props };
}

function signed(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "–"
    : `${value >= 0 ? "+" : ""}${formatNumber(value, 2, "da")}`;
}

describe("TechBody", () => {
  it("renders the header summary and closes the sheet", async () => {
    const user = userEvent.setup();
    const { props } = renderLayer(TechBody, { route: TECH_ROUTE });
    const tech = props.model.tech;
    expect(tech).toBeDefined();

    expect(
      screen.getByRole("heading", { name: props.t("sheet.titleTech") }),
    ).toBeInTheDocument();
    expect(screen.getByText(props.t("sheet.kickerTech"))).toHaveClass(
      "sheet-kicker",
    );

    const summary = props.t("tech.summary", {
      router: formatNumber(tech?.router, 1, "da"),
      google: formatNumber(tech?.google, 1, "da"),
      loss: formatNumber(tech?.packetLoss7d, 2, "da"),
    });
    expect(screen.getByText(summary)).toHaveClass("sheet-sum");

    await user.click(
      screen.getByRole("button", { name: props.t("sheet.close") }),
    );
    expect(props.actions.closeSheet).toHaveBeenCalledTimes(1);
  });

  it("renders the router readings and the network quality rows", () => {
    const { props } = renderLayer(TechBody, { route: TECH_ROUTE });
    const tech = props.model.tech;

    const readings = document.querySelector<HTMLElement>(".readings");
    expect(readings).not.toBeNull();
    expect(readings!.children).toHaveLength(4);
    expect(readings).toHaveTextContent(formatNumber(tech?.router, 1, "da"));
    expect(readings).toHaveTextContent(formatNumber(tech?.google, 1, "da"));
    expect(readings).toHaveTextContent(formatNumber(tech?.cloudflare, 1, "da"));
    expect(readings).toHaveTextContent(formatNumber(tech?.packetLoss, 1, "da"));

    expect(screen.getByText("8.8.8.8")).toBeInTheDocument();
    expect(screen.getByText("1.1.1.1")).toBeInTheDocument();
    expect(screen.getByText(props.t("tech.responds"))).toBeInTheDocument();
    expect(screen.getByText(props.t("common.ok"))).toBeInTheDocument();
    expect(screen.getByText(props.t("tech.inverter"))).toBeInTheDocument();

    const dot = document.querySelector(".status-line .dot");
    expect(dot).not.toBeNull();
    expect(dot).not.toHaveClass("warn");
  });

  it("draws the six-hour pulse from the history cache", () => {
    const historyMock = {
      ensure: vi.fn(async () => undefined),
      series: vi.fn((): Array<number | null> => [10, 12, 9, 11]),
      window: vi.fn((): Array<number | null> => []),
      raw: vi.fn(() => []),
    };
    const { props } = renderWithHistory(
      TechBody,
      historyMock as unknown as HistoryCache,
      TECH_ROUTE,
    );

    expect(historyMock.series).toHaveBeenCalledWith(
      props.config.network?.router,
    );
    expect(historyMock.series).toHaveBeenCalledWith(
      props.config.network?.google,
    );
    expect(historyMock.series).toHaveBeenCalledWith(
      props.config.network?.cloudflare,
    );

    const box = document.querySelector<HTMLElement>(".chart-box");
    expect(box).not.toBeNull();
    expect(box).toHaveAttribute("data-graph", "line");
    expect(box?.getAttribute("data-gs")).toContain(props.t("tech.router"));
    expect(box).toHaveAttribute("data-gt0");
    expect(box).toHaveAttribute("data-gt1");

    const routerLine = box?.querySelector<SVGPathElement>(
      'path[stroke="var(--sky)"]',
    );
    expect(routerLine?.getAttribute("d")).toMatch(/^M/);
    expect(box?.querySelectorAll('path[fill="none"]')).toHaveLength(3);

    const pulse = screen.getByText(props.t("tech.pulse")).closest(".block");
    expect(pulse).not.toBeNull();
    expect(
      within(pulse as HTMLElement).getByText(props.t("tech.router")),
    ).toBeInTheDocument();
  });

  it("shows the empty state when the tech model is missing", () => {
    const props = makeArcusProps();
    renderLayer(TechBody, {
      route: TECH_ROUTE,
      model: { ...props.model, tech: undefined },
    });

    expect(
      screen.getByRole("heading", { name: props.t("sheet.titleTech") }),
    ).toBeInTheDocument();
    expect(screen.getByText("–")).toHaveClass("sheet-sum");
    expect(screen.getByText(props.t("empty.data"))).toBeInTheDocument();
    expect(document.querySelector(".empty")).not.toBeNull();
    expect(document.querySelector(".readings")).toBeNull();
  });
});

describe("EconomyBody", () => {
  it("renders the price readings and closes the sheet", async () => {
    const user = userEvent.setup();
    const { props } = renderLayer(EconomyBody, { route: ECONOMY_ROUTE });
    const economy = props.model.economy;
    expect(economy).toBeDefined();

    expect(
      screen.getByRole("heading", { name: props.t("sheet.titleEconomy") }),
    ).toBeInTheDocument();
    expect(screen.getByText(props.t("sheet.kickerEconomy"))).toHaveClass(
      "sheet-kicker",
    );

    const summary = props.t("economy.summary", {
      price: formatNumber(economy?.value, 2, "da"),
      change: signed(economy?.change),
    });
    expect(screen.getByText(summary)).toHaveClass("sheet-sum");

    const readings = document.querySelector<HTMLElement>(".readings");
    expect(readings).not.toBeNull();
    expect(readings!.children).toHaveLength(4);
    expect(readings).toHaveTextContent(signed(economy?.change));
    expect(readings).toHaveTextContent(formatNumber(economy?.yield, 3, "da"));
    expect(readings).toHaveTextContent(
      formatNumber(economy?.duration, 2, "da"),
    );

    const bigRead = document.querySelector<HTMLElement>(".big-read");
    expect(bigRead).toHaveTextContent(formatNumber(economy?.value, 2, "da"));
    expect(screen.getByText(props.t("economy.latest"))).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: props.t("sheet.close") }),
    );
    expect(props.actions.closeSheet).toHaveBeenCalledTimes(1);
  });

  it("draws the thirty-day bond chart from the history window", () => {
    const historyMock = {
      ensure: vi.fn(async () => undefined),
      series: vi.fn((): Array<number | null> => []),
      window: vi.fn((): Array<number | null> => [96.8, 97.1, 97.4, 97.2]),
      raw: vi.fn(() => []),
    };
    const { props } = renderWithHistory(
      EconomyBody,
      historyMock as unknown as HistoryCache,
      ECONOMY_ROUTE,
    );

    expect(historyMock.window).toHaveBeenCalledWith(
      props.config.economy?.bond,
      30,
    );

    const box = document.querySelector<HTMLElement>(".chart-box");
    expect(box).not.toBeNull();
    expect(box).toHaveAttribute("data-graph", "line");
    expect(box).toHaveAttribute("data-gv");
    expect(box).toHaveAttribute("data-gt0");
    expect(box).toHaveAttribute("data-gt1");

    const bondLine = box?.querySelector<SVGPathElement>(
      'path[stroke="var(--brass)"]',
    );
    expect(bondLine?.getAttribute("d")).toMatch(/^M/);
    expect(
      screen.getByText(props.t("economy.chart30")).closest(".block"),
    ).not.toBeNull();
  });

  it("shows the empty state when the economy model is missing", () => {
    const props = makeArcusProps();
    renderLayer(EconomyBody, {
      route: ECONOMY_ROUTE,
      model: { ...props.model, economy: undefined },
    });

    expect(
      screen.getByRole("heading", { name: props.t("sheet.titleEconomy") }),
    ).toBeInTheDocument();
    expect(screen.getByText("–")).toHaveClass("sheet-sum");
    expect(screen.getByText(props.t("empty.data"))).toBeInTheDocument();
    expect(document.querySelector(".empty")).not.toBeNull();
    expect(document.querySelector(".chart-box")).toBeNull();
  });
});
