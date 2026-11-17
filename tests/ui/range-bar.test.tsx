import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { defaultRange, resolveRange, startOfDay } from "../../src/range";
import { HistoryRange } from "../../src/ui/organisms/HistoryRange";
import { renderWithArcus } from "./home-test-utils";

const NOW = new Date("2026-11-17T14:00:00+01:00");
const now = () => NOW;

const renderBar = (range = resolveRange(defaultRange(NOW), NOW)) => {
  return renderWithArcus(<HistoryRange />, { now, range });
};

describe("RangeBar", () => {
  test("starts on today with the next arrow disabled", () => {
    const { props } = renderBar();
    expect(screen.getByText("I dag")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Næste dag" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1 dag" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Forrige dag" }));
    expect(props.actions.setHistoryRange).toHaveBeenCalledWith({
      anchor: startOfDay(new Date(2026, 10, 16)),
      days: 1,
      live: false,
    });
  });

  test("labels yesterday and older days", () => {
    const yesterday = resolveRange(
      { anchor: startOfDay(new Date(2026, 10, 16)), days: 1 },
      NOW,
    );
    const older = resolveRange(
      { anchor: startOfDay(new Date(2026, 10, 10)), days: 1 },
      NOW,
    );

    const { unmount } = renderBar(yesterday);
    expect(screen.getByText("I går")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Næste dag" }),
    ).not.toBeDisabled();
    unmount();

    renderBar(older);
    expect(screen.getByText(/10\. nov/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I dag" })).toBeInTheDocument();
  });

  test("changes the period without moving the anchor", () => {
    const { props } = renderBar();
    fireEvent.click(screen.getByRole("button", { name: "7 dage" }));
    expect(props.actions.setHistoryRange).toHaveBeenCalledWith({
      anchor: startOfDay(NOW),
      days: 7,
      live: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "30 dage" }));
    expect(props.actions.setHistoryRange).toHaveBeenLastCalledWith({
      anchor: startOfDay(NOW),
      days: 30,
      live: true,
    });
  });

  test("picks a day from the native date input", () => {
    const { props } = renderBar();
    fireEvent.click(screen.getByRole("button", { name: /I dag · Vælg dag/ }));

    const input = screen.getByLabelText("Vælg dag");
    expect(input).toHaveAttribute("max", "2026-11-17");
    fireEvent.change(input, { target: { value: "2026-11-10" } });

    expect(props.actions.setHistoryRange).toHaveBeenCalledWith({
      anchor: startOfDay(new Date(2026, 10, 10)),
      days: 1,
      live: false,
    });
  });

  test("returns to today while keeping the selected period", () => {
    const past = resolveRange(
      { anchor: startOfDay(new Date(2026, 9, 20)), days: 30 },
      NOW,
    );
    const { props } = renderBar(past);

    fireEvent.click(screen.getByRole("button", { name: "I dag" }));
    expect(props.actions.setHistoryRange).toHaveBeenCalledWith({
      anchor: startOfDay(NOW),
      days: 30,
      live: true,
    });
  });
});
