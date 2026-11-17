import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import type { HistoryCache } from "../../../src/data/history";
import { formatNumber } from "../../../src/format";
import { addDays, resolveRange, startOfDay } from "../../../src/range";
import type { ResolvedHistoryRange } from "../../../src/range";
import { parseGraph } from "../../../src/render/graph";
import { EconomyBody } from "../../../src/ui/organisms/layers/EconomyBody";
import { TechBody } from "../../../src/ui/organisms/layers/TechBody";
import type { LayerBodyProps } from "../../../src/ui/pages/layerRegistry";
import { ArcusProvider } from "../../../src/ui/providers/ArcusProvider";
import { createArcusStore } from "../../../src/ui/providers/store";
import type { ArcusRoute } from "../../../src/ui/types";
import { makeArcusProps } from "../home-test-utils";
import { renderLayer } from "../layer-test-utils";

const TECH_ROUTE: ArcusRoute = { base: "teknik", sub: null };
const ECONOMY_ROUTE: ArcusRoute = { base: "oekonomi", sub: null };

/** The fixture clock; past-range tests resolve their window against it. */
const FIXTURE_NOW = new Date("2026-11-13T01:19:00+01:00");
const DAY_MS = 86_400_000;

/**
 * `renderLayer` always installs the empty history stub. The chart tests need
 * plotted values, so they mount the same fixture provider with a local cache
 * double instead of editing the shared test utility.
 */
const renderWithHistory = (
  Body: ComponentType<LayerBodyProps>,
  history: HistoryCache,
  route: ArcusRoute,
  range?: ResolvedHistoryRange,
) => {
  const props = makeArcusProps({ route, range });
  const result = render(
    <ArcusProvider store={createArcusStore({ ...props, history })}>
      <Body route={route} />
    </ArcusProvider>,
  );
  return { ...result, props };
};

const makeHistoryMock = (
  series: Array<number | null> = [10, 12, 9, 11],
  window: Array<number | null> = [96.8, 97.1, 97.4, 97.2],
) => ({
  ensure: vi.fn(async () => undefined),
  ensureRange: vi.fn(async () => undefined),
  series: vi.fn((): Array<number | null> => series),
  window: vi.fn((): Array<number | null> => window),
  raw: vi.fn(() => []),
});

/** The sheet titles append the selected window to the base label. */
const periodTitle = (
  t: (key: string, vars?: Record<string, string | number>) => string,
  labelKey: string,
  period: string,
): string =>
  t("chart.period", {
    // `tech.pulse`/`economy.chart30` still embed their old fixed period.
    label: t(labelKey).split(" · ")[0],
    period,
  });

const signed = (value: number | null | undefined): string => {
  return value === null || value === undefined
    ? "–"
    : `${value >= 0 ? "+" : ""}${formatNumber(value, 2, "da")}`;
};

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

  it("draws the pulse across the selected window", () => {
    const historyMock = makeHistoryMock();
    const { props } = renderWithHistory(
      TechBody,
      historyMock as unknown as HistoryCache,
      TECH_ROUTE,
    );

    for (const id of [
      props.config.network?.router,
      props.config.network?.google,
      props.config.network?.cloudflare,
    ]) {
      expect(historyMock.series).toHaveBeenCalledWith(id, {
        start: props.range.start,
        end: props.range.end,
        buckets: 96,
        fill: "hold",
      });
    }

    const box = document.querySelector<HTMLElement>(".chart-box");
    expect(box).not.toBeNull();
    expect(box).toHaveAttribute("data-graph", "line");
    expect(box?.getAttribute("data-gs")).toContain(props.t("tech.router"));
    expect(box).toHaveAttribute("data-gt0");
    expect(box).toHaveAttribute("data-gt1");

    const graph = parseGraph(box as HTMLElement);
    expect(graph?.start).toBe(props.range.start);
    expect(graph?.end).toBe(props.range.end);

    const routerLine = box?.querySelector<SVGPathElement>(
      'path[stroke="var(--sky)"]',
    );
    expect(routerLine?.getAttribute("d")).toMatch(/^M/);
    expect(box?.querySelectorAll('path[fill="none"]')).toHaveLength(3);

    const pulse = screen
      .getByText(periodTitle(props.t, "tech.pulse", props.t("range.today")))
      .closest(".block");
    expect(pulse).not.toBeNull();
    expect(
      within(pulse as HTMLElement).getByText(props.t("tech.router")),
    ).toBeInTheDocument();
  });

  it("rewinds the pulse to a past window and loads it for the probes", async () => {
    const range = resolveRange(
      { anchor: startOfDay(addDays(FIXTURE_NOW, -3)), days: 7 },
      FIXTURE_NOW,
    );
    const historyMock = makeHistoryMock();
    const { props } = renderWithHistory(
      TechBody,
      historyMock as unknown as HistoryCache,
      TECH_ROUTE,
      range,
    );

    const ids = [
      props.config.network?.router,
      props.config.network?.google,
      props.config.network?.cloudflare,
    ];
    for (const id of ids) {
      expect(historyMock.series).toHaveBeenCalledWith(id, {
        start: range.start,
        end: range.end,
        buckets: 96,
        fill: "hold",
      });
    }

    // The hover readout is driven by the same bounds as the plotted series.
    const box = document.querySelector<HTMLElement>(".chart-box");
    const graph = parseGraph(box as HTMLElement);
    expect(graph?.start).toBe(range.start);
    expect(graph?.end).toBe(range.end);

    expect(
      screen.getByText(
        periodTitle(props.t, "tech.pulse", props.t("range.days7")),
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(historyMock.ensureRange).toHaveBeenCalledWith(
        ids,
        range.start - DAY_MS,
        range.end,
      );
    });
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
    const historyMock = makeHistoryMock([], [96.8, 97.1, 97.4, 97.2]);
    const { props } = renderWithHistory(
      EconomyBody,
      historyMock as unknown as HistoryCache,
      ECONOMY_ROUTE,
    );

    expect(historyMock.window).toHaveBeenCalledWith(
      props.config.economy?.bond,
      30,
      { end: props.now().getTime(), fill: "hold" },
    );

    const box = document.querySelector<HTMLElement>(".chart-box");
    expect(box).not.toBeNull();
    expect(box).toHaveAttribute("data-graph", "line");
    expect(box).toHaveAttribute("data-gv");
    expect(box).toHaveAttribute("data-gt0");
    expect(box).toHaveAttribute("data-gt1");

    const graph = parseGraph(box as HTMLElement);
    expect(graph?.end).toBe(props.now().getTime());
    expect(graph?.start).toBe(props.now().getTime() - 30 * DAY_MS);

    const bondLine = box?.querySelector<SVGPathElement>(
      'path[stroke="var(--brass)"]',
    );
    expect(bondLine?.getAttribute("d")).toMatch(/^M/);
    expect(
      screen
        .getByText(
          periodTitle(props.t, "economy.chart30", props.t("range.days30")),
        )
        .closest(".block"),
    ).not.toBeNull();
  });

  it("ends the bond chart at a past anchor and loads that window", async () => {
    const range = resolveRange(
      { anchor: startOfDay(addDays(FIXTURE_NOW, -2)), days: 7 },
      FIXTURE_NOW,
    );
    const historyMock = makeHistoryMock([], [96.8, 97.1, 97.4, 97.2]);
    const { props } = renderWithHistory(
      EconomyBody,
      historyMock as unknown as HistoryCache,
      ECONOMY_ROUTE,
      range,
    );

    expect(historyMock.window).toHaveBeenCalledWith(
      props.config.economy?.bond,
      30,
      { end: range.end, fill: "hold" },
    );

    // The chart keeps its thirty-day length and ends at the chosen day.
    const box = document.querySelector<HTMLElement>(".chart-box");
    const graph = parseGraph(box as HTMLElement);
    expect(graph?.start).toBe(range.end - 30 * DAY_MS);
    expect(graph?.end).toBe(range.end);

    expect(
      screen.getByText(
        periodTitle(props.t, "economy.chart30", props.t("range.days30")),
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(historyMock.ensureRange).toHaveBeenCalledWith(
        [props.config.economy?.bond],
        range.start - Math.max(1, 30 - range.days) * DAY_MS,
        range.end,
      );
    });
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
