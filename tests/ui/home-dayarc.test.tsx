import { describe, expect, it } from "vitest";
import { DayArc } from "../../src/ui/organisms/DayArc";
import { renderWithArcus } from "./home-test-utils";

function query(container: ParentNode, selector: string): Element {
  const element = container.querySelector(selector);
  expect(element, selector).not.toBeNull();
  return element as Element;
}

describe("DayArc", () => {
  it("renders the arc skeleton with the gradient and past-clip defs", () => {
    const { container } = renderWithArcus(<DayArc />);

    const arc = query(container, ".arc-wrap");
    expect(arc).toHaveAttribute("data-arc");
    expect(query(container, ".arc-glow")).toHaveAttribute("data-arc-glow");
    expect(query(container, ".orb")).toHaveAttribute("data-orb");
    expect(query(container, ".arc-readout")).toHaveAttribute(
      "data-arc-readout",
    );

    const svg = query(container, "svg.arc-svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 1000 300");
    expect(svg).toHaveAttribute("preserveAspectRatio", "none");
    expect(svg).toHaveAttribute("aria-hidden", "true");

    const gradient = query(container, "svg.arc-svg defs linearGradient#solarFill");
    expect(gradient.querySelectorAll("stop")).toHaveLength(2);

    const clip = query(container, "svg.arc-svg defs clipPath#pastClip");
    const rect = query(clip, "rect[data-past-clip]");
    expect(rect).toHaveAttribute("x", "40");
    expect(rect).toHaveAttribute("y", "0");
    expect(rect).toHaveAttribute("width", "0");
    expect(rect).toHaveAttribute("height", "300");
  });

  it("leaves every path empty for the card to patch", () => {
    const { container } = renderWithArcus(<DayArc />);

    for (const hook of [
      "data-arc-line",
      "data-arc-past",
      "data-solar-area",
      "data-solar-line",
      "data-solar-actual",
    ]) {
      const path = query(container, `svg.arc-svg path[${hook}]`);
      expect(path.getAttribute("d"), hook).toBe("");
    }

    expect(
      query(container, "svg.arc-svg path[data-arc-past]"),
    ).toHaveAttribute("clip-path", "url(#pastClip)");
    expect(query(container, "svg.arc-svg path[data-solar-area]")).toHaveAttribute(
      "fill",
      "url(#solarFill)",
    );
  });

  it("leaves the price and prayer groups for the card to fill", () => {
    const { container } = renderWithArcus(<DayArc />);

    for (const hook of ["data-prices", "data-prayer-marks"]) {
      const group = query(container, `svg.arc-svg g[${hook}]`);
      expect(group.childElementCount, hook).toBe(0);
      expect(group.textContent, hook).toBe("");
    }
  });

  it("renders the needle, bead, labels, and hour ticks", () => {
    const { container } = renderWithArcus(<DayArc />);

    expect(query(container, ".now-needle")).toHaveAttribute("data-now-needle");
    expect(query(container, ".now-bead")).toHaveAttribute("data-now-bead");
    expect(query(container, ".arc-labels")).toHaveAttribute("data-arc-labels");

    const hours = Array.from(
      query(container, ".arc-hours").querySelectorAll("span"),
      (span) => span.textContent,
    );
    expect(hours).toEqual(["00", "06", "12", "18", "24"]);
  });
});
