import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "../../src/ui/atoms/Badge";
import { Button } from "../../src/ui/atoms/Button";
import { Dot } from "../../src/ui/atoms/Dot";
import { EmptyState } from "../../src/ui/atoms/EmptyState";
import { GaugeArc } from "../../src/ui/atoms/GaugeArc";
import { Icon } from "../../src/ui/atoms/Icon";
import { IconButton } from "../../src/ui/atoms/IconButton";
import { SheetGrab } from "../../src/ui/atoms/SheetGrab";
import { Sparkline } from "../../src/ui/atoms/Sparkline";
import { Stat } from "../../src/ui/atoms/Stat";
import { Tab } from "../../src/ui/atoms/Tab";

describe("Button", () => {
  it("applies tone and size classes and calls onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button tone="primary" size="sm" onClick={onClick}>
        Turn on
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Turn on" });
    expect(button.className).toBe("btn primary small");

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Icon", () => {
  it("renders the static svg for a known name", () => {
    const { container } = render(<Icon name="sun" />);

    const svg = container.querySelector("svg.ico");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg?.querySelector("circle")?.getAttribute("r")).toBe("4");
  });

  it("falls back to the info icon for an unknown name", () => {
    const { container } = render(<Icon name="not-a-real-icon" />);

    const circle = container.querySelector("svg.ico circle");
    expect(circle?.getAttribute("r")).toBe("9");
  });

  it("hides decorative icons and exposes a title when given", () => {
    const { container, rerender } = render(<Icon name="info" />);
    expect(container.querySelector("span")?.getAttribute("aria-hidden")).toBe(
      "true",
    );

    rerender(<Icon name="info" title="Information" />);
    const wrapper = container.querySelector("span");
    expect(wrapper?.getAttribute("aria-hidden")).toBeNull();
    expect(wrapper?.getAttribute("title")).toBe("Information");
  });
});

describe("IconButton", () => {
  it("exposes an accessible name, data-act and click handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <IconButton
        icon="close"
        label="Close sheet"
        dataAct="close"
        onClick={onClick}
      />,
    );

    const button = screen.getByRole("button", { name: "Close sheet" });
    expect(button.getAttribute("data-act")).toBe("close");
    expect(button.getAttribute("title")).toBe("Close sheet");
    expect(button.querySelector("svg.ico")).not.toBeNull();

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Badge", () => {
  it("renders the pill classes for each tone", () => {
    const { container, rerender } = render(<Badge>Stue</Badge>);
    expect(screen.getByText("Stue").className).toBe("pill");

    rerender(<Badge tone="warn">Alarm</Badge>);
    expect(screen.getByText("Alarm").className).toBe("pill warn");

    rerender(
      <Badge tone="danger" className="wide">
        Utæthed
      </Badge>,
    );
    expect(screen.getByText("Utæthed").className).toBe("pill danger wide");
    expect(container.querySelector(".pill")).not.toBeNull();
  });
});

describe("Dot", () => {
  it("renders the status dot with a tone class", () => {
    const { container, rerender } = render(<Dot />);
    expect(container.querySelector("i")?.className).toBe("sdot");

    rerender(<Dot tone="warn" />);
    expect(container.querySelector("i")?.className).toBe("sdot warn");

    rerender(<Dot tone="off" className="inline" />);
    expect(container.querySelector("i")?.className).toBe("sdot off inline");
  });
});

describe("Stat", () => {
  it("renders label, value, unit, sub and tone", () => {
    const { container } = render(
      <Stat
        label="Indoor"
        value="21.4"
        unit="°C"
        sub="Comfortable"
        tone="warn"
      />,
    );

    const root = container.querySelector(".vital");
    expect(root?.className).toBe("vital warn");
    expect(screen.getByText("Indoor").className).toBe("vital-label");
    expect(screen.getByText("21.4").textContent).toBe("21.4");

    const value = container.querySelector(".vital-value");
    expect(value?.textContent).toBe("21.4°C");
    expect(container.querySelector(".vital-sub")?.textContent).toBe(
      "Comfortable",
    );
  });
});

describe("Sparkline", () => {
  it("emits a non-empty path for numeric values", () => {
    const { container } = render(<Sparkline values={[3, 5, 4, 8, 7]} />);

    const path = container.querySelector("svg path");
    const d = path?.getAttribute("d") ?? "";
    expect(d.length).toBeGreaterThan(0);
    expect(d.startsWith("M")).toBe(true);
    expect(path?.getAttribute("fill")).toBe("none");
  });

  it("fills the area variant", () => {
    const { container } = render(<Sparkline values={[3, 5, 4, 8, 7]} area />);

    const path = container.querySelector("svg path");
    expect(path?.getAttribute("fill")).toBe("currentColor");
    expect(path?.getAttribute("fill-opacity")).toBe("0.12");
    expect(path?.getAttribute("d")?.endsWith("Z")).toBe(true);
  });

  it("emits an empty path when there are no values", () => {
    const { container } = render(<Sparkline values={[]} />);

    const d = container.querySelector("svg path")?.getAttribute("d") ?? "";
    expect(d).toBe("");
  });
});

describe("GaugeArc", () => {
  it("draws a finite arc whose offset decreases as the value rises", () => {
    const { container, rerender } = render(<GaugeArc value={20} />);

    const arc = () => container.querySelector("[stroke-dasharray]");
    expect(arc()?.getAttribute("transform")).toBe("rotate(-90 20 20)");

    const low = Number(arc()?.getAttribute("stroke-dashoffset"));
    expect(Number.isFinite(low)).toBe(true);

    rerender(<GaugeArc value={85} />);
    const high = Number(arc()?.getAttribute("stroke-dashoffset"));
    expect(Number.isFinite(high)).toBe(true);
    expect(high).toBeLessThan(low);
  });
});

describe("SheetGrab", () => {
  it("renders the grab handle marker", () => {
    const { container } = render(<SheetGrab className="in-sheet" />);

    const grab = container.querySelector("[data-sheet-grab]");
    expect(grab?.className).toBe("sheet-grab in-sheet");
  });
});

describe("Tab", () => {
  it("fires onClick and reflects the active state", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const { rerender } = render(
      <Tab active={false} onClick={onClick}>
        Lights
      </Tab>,
    );

    const tab = screen.getByRole("button", { name: "Lights" });
    expect(tab.getAttribute("aria-pressed")).toBe("false");
    expect(tab.className).toBe("tab");

    await user.click(tab);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Tab active onClick={onClick}>
        Lights
      </Tab>,
    );

    const activeTab = screen.getByRole("button", { name: "Lights" });
    expect(activeTab.getAttribute("aria-pressed")).toBe("true");
    expect(activeTab.className).toBe("tab active");
  });
});

describe("EmptyState", () => {
  it("renders the icon, title and hint", () => {
    const { container } = render(
      <EmptyState
        icon="home"
        title="No areas yet"
        hint="Add an area in Home Assistant."
      />,
    );

    expect(container.querySelector(".empty svg.ico")).not.toBeNull();
    expect(screen.getByText("No areas yet")).toBeTruthy();
    expect(screen.getByText("Add an area in Home Assistant.")).toBeTruthy();
  });

  it("omits the icon when none is given", () => {
    const { container } = render(<EmptyState title="Nothing to show" />);

    expect(container.querySelector(".empty svg")).toBeNull();
    expect(screen.getByText("Nothing to show")).toBeTruthy();
  });
});
