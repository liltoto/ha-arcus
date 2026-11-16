import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { AppBoundary } from "../../src/ui/pages/AppBoundary";
import { renderWithArcus } from "./home-test-utils";

let shouldThrow = true;

const Flaky = () => {
  if (shouldThrow) throw new Error("render exploded");
  return <p>recovered content</p>;
};

afterEach(() => {
  vi.restoreAllMocks();
  shouldThrow = true;
});

test("contains a render error in a themed panel", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});

  const { container } = renderWithArcus(
    <AppBoundary>
      <Flaky />
    </AppBoundary>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Kunne ikke vise dashboardet",
  );
  expect(container.querySelector(".failure")).not.toBeNull();
  // The fallback keeps the app shell so the card does not collapse or lose
  // its theme while the rest of the dashboard is still alive.
  expect(container.querySelector(".app")).not.toBeNull();
});

test("retries the render without remounting the card", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const user = userEvent.setup();

  renderWithArcus(
    <AppBoundary>
      <Flaky />
    </AppBoundary>,
  );

  shouldThrow = false;
  await user.click(screen.getByRole("button", { name: "Prøv igen" }));

  expect(screen.getByText("recovered content")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).toBeNull();
});
