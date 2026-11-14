import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HistoryCache } from "../../src/data/history";
import { ArcusProvider } from "../../src/ui/providers/ArcusProvider";
import { Vitals } from "../../src/ui/organisms/Vitals";
import { makeArcusProps } from "./home-test-utils";

/** A tiny observable history store with the same surface as HistoryCache. */
class MutableHistory {
  private listeners = new Set<() => void>();
  private values = new Map<string, Array<number | null>>();
  private version = 0;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getVersion = (): number => this.version;

  readonly ensure = async (): Promise<void> => undefined;

  readonly series = (entityId: string): Array<number | null> =>
    this.values.get(entityId) ?? [];

  readonly window = (entityId: string): Array<number | null> =>
    this.series(entityId);

  readonly raw = () => [];

  set(entityId: string, values: Array<number | null>): void {
    this.values.set(entityId, values);
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }
}

describe("history-driven charts", () => {
  it("updates a vital sparkline when the history cache ingests a series", () => {
    const history = new MutableHistory();
    const series = vi.spyOn(history, "series");
    const props = makeArcusProps();
    const entityId = props.config.ventilation?.temperature ?? "";
    expect(entityId).not.toBe("");

    render(
      <ArcusProvider {...props} history={history as unknown as HistoryCache}>
        <Vitals />
      </ArcusProvider>,
    );

    const spark = screen.getByText(props.bindings.indoor)
      .closest(".vital")
      ?.querySelector(".vital-spark path");
    expect(spark?.getAttribute("d")).toBe("");

    act(() => history.set(entityId, [18.2, 18.6, 19.1, 19.4]));

    const updated = screen
      .getByText(props.bindings.indoor)
      .closest(".vital")
      ?.querySelector(".vital-spark path");
    expect(updated?.getAttribute("d")).not.toBe("");
    expect(
      screen
        .getByText(props.bindings.indoor)
        .closest(".vital")
        ?.querySelector(".vital-spark"),
    ).toHaveAttribute("data-graph", "line");
    expect(series).toHaveBeenCalledWith(props.config.solar?.power, {
      buckets: 96,
      fill: 0,
    });
  });
});
