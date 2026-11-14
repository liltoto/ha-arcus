import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ArcusCard } from "../src/card";
import { HOME_AREA_IDS, makeConfig, makeHass } from "./fixtures/home";

/**
 * Minimal sheet surface for the card tests. The real `arcus-sheets` element
 * lives in Task 7; this stub proves the card's frame contract (app, route,
 * update, close button) without depending on the sheet renderer.
 */
class ArcusSheetsStub extends HTMLElement {
  app: any = null;
  route: any = null;

  update(): void {
    this.render();
  }

  render(): void {
    if (!this.app || !this.route) return;
    this.innerHTML = `${this.app._sheetHeader(
      "RUM",
      this.route.base === "rum" ? "Stue" : "Detaljer",
      "<b>test</b>",
    )}<div class="sheet-scroll"><div data-confirm></div><button data-act="close">Luk</button></div>`;
  }
}

if (!customElements.get("arcus-sheets")) {
  customElements.define("arcus-sheets", ArcusSheetsStub);
}

async function mount(
  config = makeConfig(),
  hass = makeHass(),
): Promise<ArcusCard> {
  const card = new ArcusCard();
  card.setConfig(config);
  card.hass = hass;
  document.body.appendChild(card);
  await card.updateComplete;
  return card;
}

function tick(milliseconds = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

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
    const room =
      card.shadowRoot!.querySelector<HTMLElement>('[data-room="stue"]');
    expect(room).not.toBeNull();

    room!.click();
    await tick(120);

    expect(location.hash).toBe("#/rum/stue");
    expect(card.shadowRoot!.querySelector(".sheet.open")).not.toBeNull();
    expect(card.shadowRoot!.querySelector("arcus-sheets")).not.toBeNull();
    expect(
      card.shadowRoot!.querySelector("arcus-sheets [data-act='close']"),
    ).not.toBeNull();
  });

  test("delegates the default quick actions to hass.callService", async () => {
    const hass = makeHass();
    const callService = vi.spyOn(hass, "callService");
    const card = await mount(makeConfig({ quick_actions: [] }), hass);

    const vacation = card.shadowRoot!.querySelector<HTMLElement>(
      '[data-act="toggle-bool"][data-entity="input_boolean.vacation_mode"]',
    );
    expect(vacation).not.toBeNull();

    vacation!.click();
    await Promise.resolve();

    expect(callService).toHaveBeenCalledWith(
      "input_boolean",
      "toggle",
      {},
      { entity_id: "input_boolean.vacation_mode" },
    );
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
    card.shadowRoot!.querySelector<HTMLElement>('[data-room="stue"]')!.click();
    await tick();
    expect(card.shadowRoot!.querySelector(".sheet.open")).not.toBeNull();

    card
      .shadowRoot!.querySelector<HTMLElement>(
        "arcus-sheets [data-act='close']",
      )!
      .click();
    await tick();

    expect(location.hash).toBe("#/");
    expect(card.shadowRoot!.querySelector(".sheet.open")).toBeNull();
  });

  test("delegates a light toggle to light.toggle", async () => {
    const hass = makeHass();
    const callService = vi.spyOn(hass, "callService");
    const card = await mount(makeConfig(), hass);

    // Delegation now belongs to the legacy sheet only; React owns the home.
    const sheet = document.createElement("arcus-sheets");
    const button = document.createElement("button");
    button.dataset.act = "toggle-light";
    button.dataset.entity = "light.kokken";
    sheet.appendChild(button);
    card.shadowRoot!.appendChild(sheet);

    button.click();
    await Promise.resolve();

    expect(callService).toHaveBeenCalledWith(
      "light",
      "toggle",
      {},
      { entity_id: "light.kokken" },
    );
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

    const room =
      card.shadowRoot!.querySelector<HTMLElement>('[data-room="stue"]');
    room!.click();
    await tick();
    expect(location.hash).toBe("#/rum/stue");

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
    await tick();

    expect(
      card.shadowRoot!.querySelector('[data-room="garage"]'),
    ).not.toBeNull();
    expect(location.hash).toBe("#/rum/stue");
    expect(card.shadowRoot!.querySelector(".sheet.open")).not.toBeNull();
  });

  test("exposes the sheet header/tabs markup and the stub config", async () => {
    const card = await mount();
    const header = card._sheetHeader("RUM", "Stue", "<b>22,9°</b>");
    const tabs = card._sheetTabs([{ key: "a", label: "A", route: "a" }], "a");

    expect(header).toContain('class="sheet-head"');
    expect(header).toContain('data-act="close"');
    expect(header).toContain("<b>22,9°</b>");
    expect(tabs).toContain('class="tab active"');
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
