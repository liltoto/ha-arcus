import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ArcusCard } from "../src/card";
import { HOME_AREA_IDS, makeConfig, makeHass } from "./fixtures/home";

const mount = async (
  config = makeConfig(),
  hass = makeHass(),
): Promise<ArcusCard> => {
  const card = new ArcusCard();
  card.setConfig(config);
  card.hass = hass;
  document.body.appendChild(card);
  await card.updateComplete;
  return card;
};

beforeEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
  window.__HJEM_NOW = new Date("2026-11-13T01:19:00+01:00");
});

afterEach(() => {
  document.body.innerHTML = "";
  delete window.__HJEM_NOW;
});

describe("ArcusCard", () => {
  test("renders the greeting and a discovered room", async () => {
    const card = await mount();
    const text = card.shadowRoot!.textContent ?? "";

    expect(text).toContain("Godnat");
    expect(text).toContain("Stue");
    expect(text).toContain("Rum for rum");
    expect(card.shadowRoot!.querySelector('[data-room="stue"]')).not.toBeNull();
  });

  test("publishes the configured text scale on the app shell", async () => {
    const card = await mount(makeConfig({ text_scale: "large" }));
    expect(
      card.shadowRoot!.querySelector<HTMLElement>(".app")?.dataset.text,
    ).toBe("large");
  });

  test("renders a calm empty state with no areas", async () => {
    const card = await mount(
      makeConfig(),
      makeHass({
        areas: {},
        devices: {},
        entities: {},
        states: {},
      } as never),
    );

    expect(card.shadowRoot!.textContent).toContain("Ingen områder");
  });

  test("opens the sheet frame when a room card is clicked", async () => {
    const card = await mount();
    const room = card.shadowRoot!.querySelector<HTMLElement>(
      '[data-room="stue"] .card-link',
    );
    expect(room).not.toBeNull();

    room!.click();
    await waitFor(() =>
      expect(card.shadowRoot!.querySelector(".sheet.open")).not.toBeNull(),
    );

    expect(location.hash).toBe("#/rum/stue");
    expect(card.shadowRoot!.querySelector("arcus-sheets")).toBeNull();
    expect(card.shadowRoot!.querySelector(".sheet-title")).toHaveTextContent(
      "Stue",
    );
    expect(
      card.shadowRoot!.querySelector(".sheet-close[data-act='close']"),
    ).not.toBeNull();
  });

  test("falls back to generic quick actions when none are configured", async () => {
    const card = await mount(makeConfig({ quick_actions: [] }), makeHass());
    const root = card.shadowRoot!;

    expect(
      root.querySelector('[data-entity="input_boolean.vacation_mode"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-entity="input_button.bedtime"]'),
    ).toBeNull();
    expect(root.querySelector('[data-nav="lys"]')).not.toBeNull();
    expect(root.querySelector('[data-act="map"]')).not.toBeNull();
  });

  test("honours config.quick_actions and runs perform-action", async () => {
    const hass = makeHass();
    const callService = vi.spyOn(hass, "callService");
    const card = await mount(
      makeConfig({
        quick_actions: [
          {
            label: "Test",
            icon: "spark",
            action: {
              action: "perform-action",
              perform_action: "input_button.press",
              target: { entity_id: "input_button.bedtime" },
            },
          },
        ],
      }),
      hass,
    );

    const quick = card.shadowRoot!.querySelector<HTMLElement>(
      '[data-act="quick"][data-quick="0"]',
    );
    expect(quick).not.toBeNull();

    quick!.click();
    await Promise.resolve();

    expect(callService).toHaveBeenCalledWith(
      "input_button",
      "press",
      {},
      { entity_id: "input_button.bedtime" },
    );
  });

  test("closes the sheet from the close button and returns home", async () => {
    const card = await mount();
    card
      .shadowRoot!.querySelector<HTMLElement>('[data-room="stue"] .card-link')!
      .click();
    await waitFor(() =>
      expect(card.shadowRoot!.querySelector(".sheet.open")).not.toBeNull(),
    );

    card
      .shadowRoot!.querySelector<HTMLElement>(".sheet-close[data-act='close']")!
      .click();
    await waitFor(() => {
      expect(location.hash).toBe("#/");
      expect(card.shadowRoot!.querySelector(".sheet.open")).toBeNull();
    });
  });

  test("hides a chapter disabled in config", async () => {
    const card = await mount(makeConfig({ chapters: { sol: false } }));

    expect(
      card.shadowRoot!.querySelector('[data-chapter="energi"]'),
    ).not.toBeNull();
    expect(card.shadowRoot!.querySelector('[data-chapter="sol"]')).toBeNull();
  });

  test("rebuilds the home view on a registry change without losing the route", async () => {
    const config = makeConfig({
      areas: {
        include: [...HOME_AREA_IDS, "garage"],
        order: [...HOME_AREA_IDS, "garage"],
      },
    });
    const card = await mount(config);

    const room = card.shadowRoot!.querySelector<HTMLElement>(
      '[data-room="stue"] .card-link',
    );
    room!.click();
    await waitFor(() => expect(location.hash).toBe("#/rum/stue"));

    const next = makeHass();
    next.areas = {
      ...next.areas,
      garage: { area_id: "garage", name: "Garage", icon: "mdi:garage" },
    };
    next.devices = { ...next.devices };
    next.entities = {
      ...next.entities,
      "sensor.garage_temperature": {
        entity_id: "sensor.garage_temperature",
        area_id: "garage",
        device_id: null,
        name: null,
        original_name: "Garage temp",
        platform: "mock",
        unique_id: "sensor.garage_temperature",
        disabled_by: null,
        hidden_by: null,
        entity_category: null,
        icon: null,
        original_icon: null,
      },
    };
    next.states = {
      ...next.states,
      "sensor.garage_temperature": {
        entity_id: "sensor.garage_temperature",
        state: "12.5",
        attributes: {
          friendly_name: "Garage temp",
          device_class: "temperature",
          unit_of_measurement: "°C",
        },
        last_changed: "2026-11-13T00:00:00+01:00",
        last_updated: "2026-11-13T00:00:00+01:00",
      },
    };

    card.hass = next;

    await waitFor(() => {
      expect(
        card.shadowRoot!.querySelector('[data-room="garage"]'),
      ).not.toBeNull();
      expect(location.hash).toBe("#/rum/stue");
      expect(card.shadowRoot!.querySelector(".sheet.open")).not.toBeNull();
    });
  });

  test("falls back to the person name when the HA user name is long", async () => {
    const hass = makeHass();
    hass.user = { name: "A very long administrator display name" };
    const card = await mount(makeConfig(), hass);

    expect(card.shadowRoot!.querySelector(".greeting")).toHaveTextContent(
      "liltoto",
    );
  });

  test("prefers config.person over a different person who is home", async () => {
    const hass = makeHass();
    hass.states["person.liltoto"] = {
      ...hass.states["person.liltoto"],
      state: "not_home",
    };
    hass.states["person.guest"] = {
      ...hass.states["person.liltoto"],
      entity_id: "person.guest",
      attributes: { friendly_name: "Guest" },
      state: "home",
    };

    const card = await mount(makeConfig({ person: "person.liltoto" }), hass);
    const pill = card.shadowRoot!.querySelector<HTMLElement>(".pill.name")!;

    expect(pill).toHaveTextContent("ude");
    expect(pill.querySelector<HTMLElement>(".dot")?.style.background).toBe(
      "var(--muted)",
    );
  });

  test("cycles the atmosphere through the card store", async () => {
    const card = await mount();
    const app = card.shadowRoot!.querySelector<HTMLElement>(".app")!;
    const atmoButton = () =>
      card.shadowRoot!.querySelector<HTMLElement>('[data-act="atmo"]')!;

    atmoButton().click();
    await waitFor(() => expect(app).toHaveAttribute("data-atmo", "night"));

    atmoButton().click();
    await waitFor(() => expect(app).toHaveAttribute("data-atmo", "day"));
  });

  test("scrubs the day arc readout on pointer move", async () => {
    const card = await mount();
    const arc = card.shadowRoot!.querySelector<HTMLElement>("[data-arc]")!;
    const readout =
      card.shadowRoot!.querySelector<HTMLElement>("[data-arc-readout]")!;
    arc.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 240,
        height: 40,
        right: 240,
        bottom: 40,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    arc.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        composed: true,
        pointerType: "mouse",
        clientX: 120,
      }),
    );

    expect(readout).toHaveClass("show");
    expect(readout.textContent).toContain("12:00");
  });

  test("renders the sheet header/tabs and exposes the stub config", async () => {
    window.history.replaceState(null, "", "/#/sol");
    const card = await mount();
    const header = card.shadowRoot!.querySelector(".sheet-head");
    const tabs = card.shadowRoot!.querySelector(".sheet-tabs");

    expect(header).not.toBeNull();
    expect(header!.querySelector(".sheet-title")).toHaveTextContent("Sol");
    expect(header!.querySelector(".sheet-close")).not.toBeNull();
    expect(tabs).not.toBeNull();
    expect(tabs!.querySelector(".tab.active")).not.toBeNull();
    expect(ArcusCard.getStubConfig()).toEqual({
      type: "custom:arcus-card",
    });
    expect(ArcusCard.getConfigElement().tagName.toLowerCase()).toBe(
      "arcus-config-editor",
    );
    expect(card.getCardSize()).toBe(50);
    expect(card.getGridOptions()).toEqual({
      columns: "full",
      rows: "full",
      min_rows: 8,
    });
  });
});
