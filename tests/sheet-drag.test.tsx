import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSheetDrag } from "../src/ui/hooks/useSheetDrag";

/**
 * The hook reads `matchMedia` on every pointerdown. Keep the default mobile
 * and flip `matches` for the desktop test.
 */
const mediaQuery = { matches: false };

function Harness({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useSheetDrag(ref, onClose);
  return (
    <div ref={ref} data-testid="sheet">
      <div data-sheet-grab>grab</div>
      <div data-testid="content">content</div>
    </div>
  );
}

/** A ref that never attaches exercises the hook's missing-element guard. */
function Detached() {
  const ref = useRef<HTMLDivElement>(null);
  useSheetDrag(ref, () => undefined);
  return null;
}

const grab = (): HTMLElement => screen.getByText("grab");
const sheet = (): HTMLElement => screen.getByTestId("sheet");

function down(clientY: number, init: PointerEventInit = {}): void {
  fireEvent.pointerDown(grab(), {
    button: 0,
    pointerType: "mouse",
    clientY,
    ...init,
  });
}

function move(clientY: number, pointerType = "mouse"): void {
  fireEvent.pointerMove(window, { clientY, pointerType });
}

function up(clientY: number, pointerType = "mouse"): void {
  fireEvent.pointerUp(window, { clientY, pointerType });
}

function cancel(clientY: number, pointerType = "mouse"): void {
  fireEvent.pointerCancel(window, { clientY, pointerType });
}

beforeEach(() => {
  mediaQuery.matches = false;
  vi.spyOn(window, "matchMedia").mockReturnValue(
    mediaQuery as unknown as MediaQueryList,
  );
});

describe("useSheetDrag", () => {
  test("a 120 px drag closes and resets the style", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    down(100);
    move(220);

    expect(sheet().style.transform).toBe("translateY(120px)");
    expect(sheet().style.transition).toBe("none");

    up(220);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sheet().style.transform).toBe("");
    expect(sheet().style.transition).toBe("");
  });

  test("a 40 px pull snaps back without closing", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    down(100);
    move(140);
    expect(sheet().style.transform).toBe("translateY(40px)");

    up(140);

    expect(onClose).not.toHaveBeenCalled();
    expect(sheet().style.transform).toBe("");
  });

  test("pointercancel resets the pull without closing", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    down(100);
    move(160);
    expect(sheet().style.transform).toBe("translateY(60px)");

    cancel(160);

    expect(onClose).not.toHaveBeenCalled();
    expect(sheet().style.transform).toBe("");
    expect(sheet().style.transition).toBe("");
  });

  test("pointercancel resets a long pull without closing", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    down(100);
    move(220);
    expect(sheet().style.transform).toBe("translateY(120px)");

    cancel(220);

    expect(onClose).not.toHaveBeenCalled();
    expect(sheet().style.transform).toBe("");
    expect(sheet().style.transition).toBe("");
  });

  test("a right-button pointerdown is ignored", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    down(100, { button: 2 });
    move(220);
    expect(sheet().style.transform).toBe("");

    up(220);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("desktop widths ignore the drag", () => {
    mediaQuery.matches = true;
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    down(100);
    move(220);
    expect(sheet().style.transform).toBe("");

    up(220);
    expect(onClose).not.toHaveBeenCalled();
    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 900px)");
  });

  test("touch pointers drag the sheet", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    down(100, { pointerType: "touch" });
    move(220, "touch");
    expect(sheet().style.transform).toBe("translateY(120px)");

    up(220, "touch");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("unmounting mid-drag resets and detaches listeners", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Harness onClose={onClose} />);
    const element = sheet();

    down(100);
    move(160);
    expect(element.style.transform).toBe("translateY(60px)");

    unmount();

    expect(element.style.transform).toBe("");
    expect(element.style.transition).toBe("");

    expect(() => move(300)).not.toThrow();
    expect(onClose).not.toHaveBeenCalled();
    expect(element.style.transform).toBe("");
  });

  test("a pointerdown on sheet content is ignored", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    fireEvent.pointerDown(screen.getByTestId("content"), {
      button: 0,
      pointerType: "mouse",
      clientY: 100,
    });
    move(220);
    expect(sheet().style.transform).toBe("");

    up(220);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("an upward move clamps the offset at zero", () => {
    render(<Harness onClose={vi.fn()} />);

    down(200);
    move(150);
    expect(sheet().style.transform).toBe("translateY(0px)");

    up(150);
    expect(sheet().style.transform).toBe("");
  });

  test("a second pointerdown restarts the drag", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    down(100);
    move(160);
    expect(sheet().style.transform).toBe("translateY(60px)");

    down(300);
    move(320);
    expect(sheet().style.transform).toBe("translateY(20px)");

    up(320);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("a new close callback does not interrupt the drag", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Harness onClose={first} />);

    down(100);
    move(220);
    rerender(<Harness onClose={second} />);
    expect(sheet().style.transform).toBe("translateY(120px)");

    up(220);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  test("a missing sheet element is a no-op", () => {
    expect(() => render(<Detached />)).not.toThrow();
  });
});
