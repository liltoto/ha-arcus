import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BatteryRow } from "../../src/ui/molecules/BatteryRow";
import { ChapterCard } from "../../src/ui/molecules/ChapterCard";
import { ChartBox } from "../../src/ui/molecules/ChartBox";
import { ConfirmBar } from "../../src/ui/molecules/ConfirmBar";
import { EntityRow } from "../../src/ui/molecules/EntityRow";
import { ForecastDay } from "../../src/ui/molecules/ForecastDay";
import { LightRow } from "../../src/ui/molecules/LightRow";
import { ListRow } from "../../src/ui/molecules/ListRow";
import { MediaRow } from "../../src/ui/molecules/MediaRow";
import { OpeningRow } from "../../src/ui/molecules/OpeningRow";
import { PrayerMarker } from "../../src/ui/molecules/PrayerMarker";
import { QuickAction } from "../../src/ui/molecules/QuickAction";
import { Readout } from "../../src/ui/molecules/Readout";
import { RoomCard } from "../../src/ui/molecules/RoomCard";
import { SegmentedTabs } from "../../src/ui/molecules/SegmentedTabs";
import { SheetHeader } from "../../src/ui/molecules/SheetHeader";
import { Stepper } from "../../src/ui/molecules/Stepper";
import { ToggleRow } from "../../src/ui/molecules/ToggleRow";
import { VitalStat } from "../../src/ui/molecules/VitalStat";
import { ZoneStrip } from "../../src/ui/molecules/ZoneStrip";
import type { ChapterView, RoomView } from "../../src/ui/view-types";

const room: RoomView = {
  id: "stue",
  name: "Stue",
  kind: "Ophold",
  icon: "sofa",
  tint: "var(--sage)",
  wide: true,
  temp: 21.4,
  air: "ok",
  airLabel: "CO₂ 620 ppm",
  lightsOn: 2,
  lightsTotal: 5,
  lightsLabel: "2/5 tændt",
  open: 1,
  openLabel: "1 åben",
  spark: [20.1, 20.8, 21.4],
};

const chapter: ChapterView = {
  key: "energi",
  title: "Energi",
  icon: "bolt",
  sum: "2,4 kWh i dag",
  large: true,
  num: "01",
  meta: "Live",
  art: (
    <div className="price-bars">
      <i />
      <i />
    </div>
  ),
};

describe("RoomCard", () => {
  it("renders the room markup and opens the room", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { container } = render(
      <RoomCard room={room} onOpen={onOpen} language="en" />,
    );

    const card =
      container.querySelector<HTMLButtonElement>('[data-room="stue"]');
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute("data-nav", "rum/stue");
    expect(card).toHaveClass("room-card", "wide");
    expect(card?.style.getPropertyValue("--room")).toBe("var(--sage)");
    expect(card).toHaveTextContent("Stue");
    expect(card).toHaveTextContent("21.4");
    expect(card).toHaveTextContent("CO₂ 620 ppm");
    expect(card).toHaveTextContent("2/5 tændt");
    expect(card).toHaveTextContent("1 åben");
    expect(card?.querySelector("svg.room-spark")).not.toBeNull();

    await user.click(card!);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("marks a missing temperature as off", () => {
    const { container } = render(
      <RoomCard
        room={{ ...room, temp: null, wide: false }}
        onOpen={() => {}}
      />,
    );

    const card = container.querySelector('[data-room="stue"]');
    expect(card).not.toHaveClass("wide");
    expect(card?.querySelector(".room-temp")).toHaveTextContent("–°");
    expect(card?.querySelector(".room-temp")).toHaveClass("off");
  });
});

describe("ChapterCard", () => {
  it("renders the chapter number, art, and navigates on click", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { container } = render(
      <ChapterCard chapter={chapter} onOpen={onOpen} />,
    );

    const card = container.querySelector<HTMLButtonElement>(
      '[data-chapter="energi"]',
    );
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute("data-nav", "energi");
    expect(card).toHaveClass("chapter", "large");
    expect(card?.querySelector(".num")).toHaveTextContent("01");
    expect(screen.getByRole("heading", { name: "Energi" })).toBeInTheDocument();
    expect(card?.querySelector(".ch-art .price-bars")).not.toBeNull();
    expect(card?.querySelector(".ch-foot")).toHaveTextContent("Live");

    await user.click(card!);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("QuickAction", () => {
  it("toggles the on class and calls the click handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<QuickAction icon="moon" label="Good night" on onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Good night" });
    expect(button).toHaveClass("quick", "on");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.querySelector("svg.ico")).not.toBeNull();

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("VitalStat", () => {
  it("renders value, sparkline and ring, and invokes onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(
      <VitalStat
        label="Indoor"
        value="21.4"
        unit="°C"
        sub="Comfortable"
        spark={[20, 20.6, 21.4]}
        ring={<span data-testid="ring" />}
        onClick={onClick}
      />,
    );

    const vital = screen.getByRole("button", { name: /Indoor/ });
    expect(vital).toHaveTextContent("21.4");
    expect(vital).toHaveTextContent("Comfortable");
    expect(container.querySelector(".vital-spark")).not.toBeNull();
    expect(screen.getByTestId("ring")).toBeInTheDocument();

    await user.click(vital);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a div when it is not interactive", () => {
    render(<VitalStat label="Price" value="1.84" unit="kr" />);

    const vital = screen.getByText("Price").closest(".vital");
    expect(vital?.tagName).toBe("DIV");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ForecastDay", () => {
  it("renders the day name, icon and temperatures", () => {
    const { container } = render(
      <ForecastDay name="Tomorrow" icon="rain" high="12°" low="6°" />,
    );

    const day = container.querySelector(".wday");
    expect(day?.querySelector(".wname")).toHaveTextContent("Tomorrow");
    expect(day?.querySelector(".wico svg.ico")).not.toBeNull();
    expect(day?.querySelector(".wtemps")).toHaveTextContent("12°6°");
  });
});

describe("EntityRow", () => {
  it("renders a value and supports click and keyboard activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(
      <EntityRow
        name="Kitchen light"
        sub="Ceiling"
        icon="light"
        value="40"
        unit="%"
        onClick={onClick}
      />,
    );

    const row = screen.getByRole("button", { name: /Kitchen light/ });
    expect(row).toHaveTextContent("Ceiling");
    expect(container.querySelector(".row-val")).toHaveTextContent("40%");
    expect(container.querySelector("svg.ico")).not.toBeNull();

    await user.click(row);
    row.focus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe("ToggleRow", () => {
  it("exposes aria-pressed and toggles on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ToggleRow
        label="Window alert"
        sub="Notify when a window opens"
        isOn={false}
        onChange={onChange}
        dataAct="toggle-bool"
        dataEntity="input_boolean.window"
      />,
    );

    const toggle = screen.getByRole("button", { name: "Window alert" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("data-act", "toggle-bool");
    expect(toggle).toHaveAttribute("data-entity", "input_boolean.window");
    expect(toggle).not.toHaveClass("on");

    await user.click(toggle);
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(<ToggleRow label="Window alert" isOn onChange={onChange} />);
    expect(
      screen.getByRole("button", { name: "Window alert" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Stepper", () => {
  it("clamps at the bounds and reports the next value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <Stepper
        label="Temperature"
        value={16}
        min={16}
        max={18}
        step={1}
        unit="°C"
        onChange={onChange}
      />,
    );

    const decrease = screen.getByRole("button", {
      name: "Decrease Temperature",
    });
    const increase = screen.getByRole("button", {
      name: "Increase Temperature",
    });

    expect(decrease).toBeDisabled();
    expect(screen.getByText("16")).toBeInTheDocument();

    await user.click(increase);
    expect(onChange).toHaveBeenLastCalledWith(17);

    rerender(
      <Stepper
        label="Temperature"
        value={18}
        min={16}
        max={18}
        step={1}
        unit="°C"
        onChange={onChange}
      />,
    );

    expect(increase).toBeDisabled();
    await user.click(decrease);
    expect(onChange).toHaveBeenLastCalledWith(17);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe("LightRow", () => {
  it("toggles the light and reports slider brightness", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onBrightness = vi.fn();
    const { container } = render(
      <LightRow
        name="Stue"
        isOn
        brightness={40}
        onToggle={onToggle}
        onBrightness={onBrightness}
        entity="light.stue"
      />,
    );

    const toggle = screen.getByRole("button", { name: "Toggle Stue" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("data-entity", "light.stue");
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    const slider = screen.getByRole("slider", { name: "Brightness Stue" });
    fireEvent.change(slider, { target: { value: "65" } });
    expect(onBrightness).toHaveBeenCalledWith(65);
    expect(container.querySelector(".pct")).toHaveTextContent("40 %");
  });
});

describe("PrayerMarker", () => {
  it("marks the next prayer with data-next and the next classes", () => {
    const { container, rerender } = render(
      <PrayerMarker name="Maghrib" time="16:42" next />,
    );

    const row = container.querySelector(".row");
    expect(row).toHaveAttribute("data-next", "true");
    expect(row).toHaveClass("on", "next");
    expect(row).toHaveTextContent("Maghrib");
    expect(row).toHaveTextContent("16:42");
    expect(screen.getByText("Next")).toBeInTheDocument();

    rerender(<PrayerMarker name="Isha" time="18:10" />);
    expect(container.querySelector(".row")).toHaveAttribute(
      "data-next",
      "false",
    );
    expect(screen.queryByText("Next")).toBeNull();
  });
});

describe("SheetHeader", () => {
  it("renders the kicker, title, summary and close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <SheetHeader
        kicker="Forbrug"
        title="Energy"
        sum={<b>2,4 kWh</b>}
        onClose={onClose}
      />,
    );

    expect(
      container.querySelector(".sheet-head .sheet-kicker"),
    ).toHaveTextContent("Forbrug");
    expect(screen.getByRole("heading", { name: "Energy" })).toBeInTheDocument();
    expect(container.querySelector(".sheet-sum")).toHaveTextContent("2,4 kWh");

    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toHaveClass("sheet-close");
    expect(close).toHaveAttribute("data-act", "close");
    await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("SegmentedTabs", () => {
  it("marks the active tab and reports selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <SegmentedTabs
        active="overview"
        onChange={onChange}
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "lights", label: "Lights" },
          { key: "energy", label: "Energy" },
        ]}
      />,
    );

    expect(container.querySelector(".sheet-tabs")).not.toBeNull();
    const overview = screen.getByRole("button", { name: "Overview" });
    expect(overview).toHaveAttribute("aria-pressed", "true");
    expect(overview).toHaveAttribute("data-tab", "overview");
    expect(screen.getByRole("button", { name: "Lights" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "Lights" }));
    expect(onChange).toHaveBeenCalledWith("lights");
  });
});

describe("ConfirmBar", () => {
  it("renders the legacy confirm markup and both callbacks", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmBar
        text="Turn off all lights?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(container.querySelector(".confirm[data-confirm]")).not.toBeNull();
    expect(screen.getByText("Turn off all lights?")).toBeInTheDocument();

    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveAttribute("data-act", "cancel-confirm");
    await user.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("OpeningRow", () => {
  it("renders an open state and supports opening the room", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container, rerender } = render(
      <OpeningRow
        name="Kitchen window"
        kind="Window"
        room="Kitchen"
        icon="wind"
        isOpen
        onClick={onClick}
      />,
    );

    const row = container.querySelector(".row");
    expect(row).toHaveClass("open", "on");
    expect(row).toHaveAttribute("data-open", "true");
    expect(row).toHaveTextContent("Kitchen window");
    expect(row).toHaveTextContent("Window · Kitchen");
    expect(row).toHaveTextContent("Open");
    expect(container.querySelector("svg.ico")).not.toBeNull();

    await user.click(row!);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<OpeningRow name="Kitchen window" kind="Window" isOpen={false} />);
    expect(container.querySelector(".row")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(container.querySelector(".row")).toHaveTextContent("Closed");
  });
});

describe("BatteryRow", () => {
  it("renders the bar tone thresholds and percentage", () => {
    const { container, rerender } = render(
      <BatteryRow name="Front door" value={15} />,
    );

    expect(container.querySelector(".bar i")).toHaveClass("warn");
    expect(container.querySelector(".bar i")).toHaveStyle({ width: "15%" });
    expect(container.querySelector(".row-val")).toHaveTextContent("15%");

    rerender(<BatteryRow name="Front door" value={30} />);
    expect(container.querySelector(".bar i")).toHaveClass("mid");

    rerender(<BatteryRow name="Front door" value={75} />);
    expect(container.querySelector(".bar i")).not.toHaveClass("warn", "mid");
    expect(container.querySelector(".bar i")).toHaveStyle({ width: "75%" });
  });
});

describe("MediaRow", () => {
  it("renders state and exposes a play/pause button", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { container, rerender } = render(
      <MediaRow
        name="Soundbar"
        state="Playing"
        isPlaying
        onToggle={onToggle}
      />,
    );

    expect(container.querySelector(".row-sub")).toHaveTextContent("Playing");
    const pause = screen.getByRole("button", { name: "Pause Soundbar" });
    await user.click(pause);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <MediaRow
        name="Soundbar"
        state="Paused"
        isPlaying={false}
        onToggle={onToggle}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Play Soundbar" }),
    ).toBeInTheDocument();
  });
});

describe("ChartBox", () => {
  it("renders the no-data overlay and the caption row", () => {
    const { container } = render(
      <ChartBox
        title="Solar"
        caption={<span>24 h</span>}
        noData
        emptyLabel="No history"
      >
        <svg data-testid="chart" />
      </ChartBox>,
    );

    const box = container.querySelector(".chart-box");
    expect(box).toHaveClass("no-data");
    expect(screen.getByTestId("chart")).toBeInTheDocument();
    expect(container.querySelector(".chart-empty")).toHaveTextContent(
      "No history",
    );
    expect(container.querySelector(".chart-cap")).toHaveTextContent(
      "Solar24 h",
    );
  });
});

describe("ZoneStrip", () => {
  it("renders one bar per value with warning classes", () => {
    const { container } = render(
      <ZoneStrip values={[20, 50, 80]} warns={[false, true, false]} />,
    );

    const bars = container.querySelectorAll(".zone-strip i");
    expect(bars).toHaveLength(3);
    expect(bars[0]).toHaveStyle({ height: "20%" });
    expect(bars[1]).toHaveClass("warn");
    expect(bars[2]).toHaveStyle({ height: "80%" });
  });
});

describe("Readout", () => {
  it("renders the value, unit and label", () => {
    const { container } = render(
      <Readout label="Indoor" value="21,4" unit="°C" />,
    );

    expect(container.querySelector(".reading .v")).toHaveTextContent("21,4°C");
    expect(container.querySelector(".reading .l")).toHaveTextContent("Indoor");
  });
});

describe("ListRow", () => {
  it("passes the row props through to EntityRow", () => {
    const { container } = render(
      <ListRow name="Router" value="12" unit="ms" icon="network" />,
    );

    expect(container.querySelector(".row-name")).toHaveTextContent("Router");
    expect(container.querySelector(".row-val")).toHaveTextContent("12ms");
    expect(container.querySelector("svg.ico")).not.toBeNull();
  });
});
