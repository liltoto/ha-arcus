import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartBox } from "../../src/ui/molecules/ChartBox";

function renderChartBox(props: Parameters<typeof ChartBox>[0]) {
  const result = render(<ChartBox {...props} />);
  const box = result.container.querySelector(".chart-box");
  expect(box).not.toBeNull();
  return { ...result, box: box as HTMLElement };
}

describe("ChartBox", () => {
  it("defaults to the ready state without an overlay label", () => {
    const { box, container } = renderChartBox({
      title: "Solar",
      caption: <span>24 h</span>,
      children: <svg data-testid="chart" />,
    });

    expect(box).toHaveAttribute("data-state", "ready");
    expect(box).not.toHaveAttribute("aria-busy");
    expect(container.querySelector(".chart-empty")).toBeNull();
    expect(container.querySelector(".chart-cap")).toHaveTextContent(
      "Solar24 h",
    );
  });

  it("shows the empty label and state", () => {
    const { box, container } = renderChartBox({
      state: "empty",
      emptyLabel: "No history",
      children: <svg />,
    });

    expect(box).toHaveAttribute("data-state", "empty");
    expect(box).not.toHaveAttribute("aria-busy");
    expect(container.querySelector(".chart-empty")).toHaveTextContent(
      "No history",
    );
  });

  it("marks loading as busy and shows the loading label", () => {
    const { box, container } = renderChartBox({
      state: "loading",
      loadingLabel: "Loading history",
      children: <svg />,
    });

    expect(box).toHaveAttribute("data-state", "loading");
    expect(box).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".chart-empty")).toHaveTextContent(
      "Loading history",
    );
  });

  it("shows the unavailable label and falls back to English", () => {
    const { box, container } = renderChartBox({
      state: "unavailable",
      children: <svg />,
    });

    expect(box).toHaveAttribute("data-state", "unavailable");
    expect(container.querySelector(".chart-empty")).toHaveTextContent(
      "Unavailable",
    );
  });
});
