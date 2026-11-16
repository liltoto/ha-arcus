import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { makeConfig, makeHass } from "./fixtures/home";

/**
 * `buildModel` is replaced so the card's crash containment can be exercised
 * with a throw, which the real builder (correctly) never does. The mock is
 * restored per test and delegates to the real implementation by default.
 */
const { buildModelMock } = vi.hoisted(() => ({ buildModelMock: vi.fn() }));

vi.mock("../src/model/build", () => ({ buildModel: buildModelMock }));

import { ArcusCard } from "../src/card";

let realBuildModel: (typeof import("../src/model/build"))["buildModel"];

const mount = async (): Promise<ArcusCard> => {
  const card = new ArcusCard();
  card.setConfig(makeConfig());
  card.hass = makeHass();
  document.body.appendChild(card);
  await card.updateComplete;
  return card;
};

beforeEach(async () => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
  window.__HJEM_NOW = new Date("2026-11-13T01:19:00+01:00");
  realBuildModel = (
    await vi.importActual<typeof import("../src/model/build")>(
      "../src/model/build",
    )
  ).buildModel;
  buildModelMock.mockReset();
  buildModelMock.mockImplementation(realBuildModel);
});

afterEach(() => {
  document.body.innerHTML = "";
  delete window.__HJEM_NOW;
  vi.restoreAllMocks();
});

test("renders the failure panel when the first model build throws", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  buildModelMock.mockImplementation(() => {
    throw new Error("bad state shape");
  });

  const card = await mount();

  expect(card.shadowRoot!.textContent).toContain("Kunne ikke vise dashboardet");
  expect(card.shadowRoot!.querySelector(".failure")).not.toBeNull();
  expect(card.shadowRoot!.querySelector(".room-card")).toBeNull();
  expect(error).toHaveBeenCalledWith(
    "[arcus] could not build the home model",
    expect.any(Error),
  );

  // The panel is not a dead end: its retry re-attempts the build.
  card.shadowRoot!.querySelector<HTMLElement>("[data-retry]")!.click();
  expect(buildModelMock).toHaveBeenCalledTimes(2);
});

test("recovers from the failure panel on a later state push", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  buildModelMock.mockImplementation(() => {
    throw new Error("bad state shape");
  });
  const card = await mount();
  expect(card.shadowRoot!.querySelector(".failure")).not.toBeNull();

  buildModelMock.mockImplementation(realBuildModel);
  card.hass = makeHass();

  expect(card.shadowRoot!.textContent).toContain("Stue");
  expect(card.shadowRoot!.querySelector(".failure")).toBeNull();
});

test("keeps the previous model when a later build throws", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const card = await mount();
  expect(card.shadowRoot!.textContent).toContain("Stue");

  buildModelMock.mockImplementation(() => {
    throw new Error("transient bad state");
  });
  card.hass = makeHass();

  expect(card.shadowRoot!.textContent).toContain("Stue");
  expect(card.shadowRoot!.querySelector(".failure")).toBeNull();
});

test("history failures do not reject the card's initial load", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const card = await mount();
  card._history.ensure = vi.fn(async () => {
    throw new Error("history down");
  });

  await expect(card._loadInitial()).resolves.toBeUndefined();

  expect(warn).toHaveBeenCalledTimes(1);
});
