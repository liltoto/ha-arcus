import { afterEach, describe, expect, test } from "vitest";
import { ArcusConfigEditor } from "../src/editor";
import { ArcusStrategyEditor } from "../src/strategy-editor";
import { makeHass } from "./fixtures/home";

/** Collect the config from every `config-changed` event on an element. */
const trackConfigChanges = (
  element: HTMLElement,
): Array<Record<string, any>> => {
  const changes: Array<Record<string, any>> = [];
  element.addEventListener("config-changed", (event) => {
    changes.push(
      (event as CustomEvent<{ config: Record<string, any> }>).detail.config,
    );
  });
  return changes;
};

const field = <T extends HTMLElement>(root: ShadowRoot, name: string): T => {
  const element = root.querySelector<T>(`[name="${name}"]`);
  if (!element) throw new Error(`Expected a field named ${name}`);
  return element;
};

const change = (element: HTMLElement): void => {
  element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ArcusConfigEditor", () => {
  test("editing the title fires config-changed", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const input = field<HTMLInputElement>(editor.shadowRoot!, "title");
    input.value = "Mit hjem";
    change(input);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ title: "Mit hjem" });
  });

  test("editing the text size emits the new scale", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const select = field<HTMLSelectElement>(editor.shadowRoot!, "text_scale");
    select.value = "large";
    change(select);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ text_scale: "large" });
  });

  test("invalid advanced JSON shows an error and emits nothing", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card", title: "Hjem" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const textarea = field<HTMLTextAreaElement>(
      editor.shadowRoot!,
      "advanced_json",
    );
    textarea.value = "{ this is not json";
    change(textarea);

    const error = editor.shadowRoot!.querySelector<HTMLElement>(".error")!;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toMatch(/invalid json/i);
    expect(changes).toHaveLength(0);
  });

  test("valid advanced JSON replaces the config and emits once", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const textarea = field<HTMLTextAreaElement>(
      editor.shadowRoot!,
      "advanced_json",
    );
    textarea.value = JSON.stringify({
      type: "custom:arcus-card",
      title: "Fra JSON",
      density: "compact",
    });
    textarea.dispatchEvent(
      new Event("input", { bubbles: true, composed: true }),
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      title: "Fra JSON",
      density: "compact",
    });
    // Typing keeps the textarea alive; blurring it must not emit a duplicate.
    textarea.dispatchEvent(
      new Event("change", { bubbles: true, composed: true }),
    );
    expect(changes).toHaveLength(1);
    expect(
      editor.shadowRoot!.querySelector<HTMLElement>(".error")!.hidden,
    ).toBe(true);
  });

  test("area checkboxes come from hass.areas and update the config", () => {
    const hass = makeHass();
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = hass;
    document.body.appendChild(editor);

    const include = Array.from(
      editor.shadowRoot!.querySelectorAll<HTMLInputElement>(
        'input[name="areas.include"]',
      ),
    );
    expect(include).toHaveLength(Object.keys(hass.areas).length);
    expect(include.map((input) => input.value)).toEqual(
      expect.arrayContaining(["stue", "kokken", "kontor"]),
    );
    expect(include[0].closest("label")!.textContent).toContain(
      hass.areas[include[0].value].name,
    );

    const changes = trackConfigChanges(editor);
    const stue = include.find((input) => input.value === "stue")!;
    stue.click();

    expect(changes).toHaveLength(1);
    expect(changes[0].areas.include).toContain("stue");
  });

  test("excluding an area removes it from the include list", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({
      type: "custom:arcus-card",
      areas: { include: ["stue"], exclude: [], order: [] },
    });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const exclude = Array.from(
      editor.shadowRoot!.querySelectorAll<HTMLInputElement>(
        'input[name="areas.exclude"]',
      ),
    ).find((input) => input.value === "stue")!;
    exclude.checked = true;
    change(exclude);

    expect(changes).toHaveLength(1);
    expect(changes[0].areas.include).not.toContain("stue");
    expect(changes[0].areas.exclude).toContain("stue");
  });

  test("areas.order is edited as a comma-separated list", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const order = field<HTMLInputElement>(editor.shadowRoot!, "areas.order");
    order.value = "stue, kokken ,kontor";
    change(order);

    expect(changes).toHaveLength(1);
    expect(changes[0].areas.order).toEqual(["stue", "kokken", "kontor"]);
  });

  test("accepts entity IDs that are not currently in hass.states", () => {
    const hass = makeHass();
    expect(hass.states["sensor.future_solar"]).toBeUndefined();

    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = hass;
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const input = field<HTMLInputElement>(editor.shadowRoot!, "solar.power");
    input.value = "sensor.future_solar";
    change(input);

    expect(changes).toHaveLength(1);
    expect(changes[0].solar.power).toBe("sensor.future_solar");
  });

  test("auto_discover is on by default and only stores the opt-out", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const toggle = field<HTMLInputElement>(editor.shadowRoot!, "auto_discover");
    expect(toggle.checked).toBe(true);

    toggle.checked = false;
    change(toggle);
    expect(changes).toHaveLength(1);
    expect(changes[0].auto_discover).toBe(false);

    // Turning discovery back on removes the key again.
    toggle.checked = true;
    change(toggle);
    expect(changes).toHaveLength(2);
    expect(changes[1]).not.toHaveProperty("auto_discover");
  });

  test("group_by_floor stores true and is removed when unchecked", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const toggle = field<HTMLInputElement>(
      editor.shadowRoot!,
      "group_by_floor",
    );
    expect(toggle.checked).toBe(false);

    toggle.checked = true;
    change(toggle);
    expect(changes).toHaveLength(1);
    expect(changes[0].group_by_floor).toBe(true);

    toggle.checked = false;
    change(toggle);
    expect(changes).toHaveLength(2);
    expect(changes[1]).not.toHaveProperty("group_by_floor");
  });

  test("units.currency, units.price_unit, and units.temperature are editable", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);

    const currency = field<HTMLInputElement>(
      editor.shadowRoot!,
      "units.currency",
    );
    currency.value = "EUR";
    change(currency);
    expect(changes[0].units).toEqual({ currency: "EUR" });

    const priceUnit = field<HTMLInputElement>(
      editor.shadowRoot!,
      "units.price_unit",
    );
    priceUnit.value = "EUR/kWh";
    change(priceUnit);
    expect(changes[1].units).toEqual({
      currency: "EUR",
      price_unit: "EUR/kWh",
    });

    const temperature = field<HTMLSelectElement>(
      editor.shadowRoot!,
      "units.temperature",
    );
    temperature.value = "°F";
    change(temperature);
    expect(changes[2].units).toEqual({
      currency: "EUR",
      price_unit: "EUR/kWh",
      temperature: "°F",
    });

    // The empty option is Auto and removes the key.
    temperature.value = "";
    change(temperature);
    expect(changes[3].units).toEqual({
      currency: "EUR",
      price_unit: "EUR/kWh",
    });
  });

  test("chapter checkboxes toggle chapters.<key>", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const chapter = field<HTMLInputElement>(editor.shadowRoot!, "chapters.sol");
    expect(chapter.checked).toBe(true);

    chapter.checked = false;
    change(chapter);
    expect(changes).toHaveLength(1);
    expect(changes[0].chapters).toEqual({ sol: false });

    chapter.checked = true;
    change(chapter);
    expect(changes).toHaveLength(2);
    expect(changes[1].chapters).toEqual({ sol: true });
  });

  test("entity inputs are backed by filtered per-field datalists", () => {
    const hass = makeHass();
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = hass;
    document.body.appendChild(editor);

    const weatherInput = field<HTMLInputElement>(editor.shadowRoot!, "weather");
    const weatherListId = weatherInput.getAttribute("list")!;
    expect(weatherListId).toBe("arcus-entities-weather");
    const weatherOptions = Array.from(
      editor.shadowRoot!.querySelectorAll<HTMLOptionElement>(
        `datalist#${weatherListId} option`,
      ),
    ).map((option) => option.value);
    expect(weatherOptions.length).toBeGreaterThan(0);
    expect(weatherOptions.every((id) => id.startsWith("weather."))).toBe(true);

    const alarmOptions = Array.from(
      editor.shadowRoot!.querySelectorAll<HTMLOptionElement>(
        "datalist#arcus-entities-security-alarm option",
      ),
    ).map((option) => option.value);
    expect(alarmOptions).toEqual([]);

    const powerOptions = Array.from(
      editor.shadowRoot!.querySelectorAll<HTMLOptionElement>(
        "datalist#arcus-entities-solar-power option",
      ),
    ).map((option) => option.value);
    expect(powerOptions).toContain(
      "sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower",
    );
    expect(powerOptions).not.toContain("light.stue");
  });

  test("only entity fields point at a datalist", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    expect(
      field<HTMLInputElement>(editor.shadowRoot!, "solar.power")
        .getAttribute("list")
        ?.startsWith("arcus-entities-"),
    ).toBe(true);
    expect(
      field<HTMLInputElement>(editor.shadowRoot!, "title").hasAttribute("list"),
    ).toBe(false);
    expect(
      field<HTMLInputElement>(
        editor.shadowRoot!,
        "water.softenerName",
      ).hasAttribute("list"),
    ).toBe(false);
    expect(
      field<HTMLInputElement>(
        editor.shadowRoot!,
        "ventilation.name",
      ).hasAttribute("list"),
    ).toBe(false);
  });

  test("entity suggestions appear when states arrive after the editor", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = { ...makeHass(), states: {} };
    document.body.appendChild(editor);
    expect(editor.shadowRoot!.querySelector("datalist")).toBeNull();

    editor.hass = makeHass();
    expect(editor.shadowRoot!.querySelector("datalist")).not.toBeNull();
  });
});

describe("ArcusStrategyEditor", () => {
  test("editing the dashboard title emits the strategy config", () => {
    const editor = new ArcusStrategyEditor();
    editor.setConfig({
      type: "custom:arcus",
      dashboard_title: "Hjem",
      view_title: "Hjem",
      card: { type: "custom:arcus-card", title: "Hjem" },
    });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const input = field<HTMLInputElement>(
      editor.shadowRoot!,
      "dashboard_title",
    );
    input.value = "Mit hjem";
    change(input);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      dashboard_title: "Mit hjem",
      view_title: "Hjem",
      card: { type: "custom:arcus-card", title: "Hjem" },
    });
  });

  test("editing the embedded card emits one strategy-level change", () => {
    const editor = new ArcusStrategyEditor();
    editor.setConfig({
      type: "custom:arcus",
      dashboard_title: "Hjem",
      view_title: "Hjem",
      card: { type: "custom:arcus-card", title: "Hjem" },
    });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const slot =
      editor.shadowRoot!.querySelector<HTMLElement>(".card-editor-slot")!;
    const cardEditor = slot.firstElementChild as ArcusConfigEditor;
    expect(cardEditor).toBeInstanceOf(ArcusConfigEditor);

    const changes = trackConfigChanges(editor);
    const title = field<HTMLInputElement>(cardEditor.shadowRoot!, "title");
    title.value = "Stue";
    change(title);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      dashboard_title: "Hjem",
      view_title: "Hjem",
      card: { type: "custom:arcus-card", title: "Stue" },
    });
  });

  test("view title is included in the emitted strategy config", () => {
    const editor = new ArcusStrategyEditor();
    editor.setConfig({ type: "custom:arcus" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const changes = trackConfigChanges(editor);
    const input = field<HTMLInputElement>(editor.shadowRoot!, "view_title");
    input.value = "Overblik";
    change(input);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      view_title: "Overblik",
      card: { type: "custom:arcus-card" },
    });
  });
});

describe("editor focus and key handling", () => {
  test("an echoed config does not rebuild the form or collapse open sections", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const advanced =
      editor.shadowRoot!.querySelector<HTMLDetailsElement>("details.advanced")!;
    advanced.open = true;
    const input = field<HTMLInputElement>(editor.shadowRoot!, "title");
    input.focus();
    input.value = "Mit hjem";
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));

    // Home Assistant echoes the emitted config back into setConfig.
    editor.setConfig(editor.getConfig());

    expect(editor.shadowRoot!.querySelector("details.advanced")).toBe(advanced);
    expect(advanced.open).toBe(true);
    expect(field(editor.shadowRoot!, "title")).toBe(input);
  });

  test("a real external change preserves open sections and focus", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card", title: "Mit hjem" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const advanced =
      editor.shadowRoot!.querySelector<HTMLDetailsElement>("details.advanced")!;
    advanced.open = true;
    const input = field<HTMLInputElement>(editor.shadowRoot!, "title");
    input.focus();
    input.setSelectionRange(2, 2);

    editor.setConfig({
      type: "custom:arcus-card",
      title: "Mit hjem",
      subtitle: "Neu",
    });

    const nextAdvanced =
      editor.shadowRoot!.querySelector<HTMLDetailsElement>("details.advanced")!;
    expect(nextAdvanced.open).toBe(true);
    const nextInput = field<HTMLInputElement>(editor.shadowRoot!, "title");
    expect(nextInput.value).toBe("Mit hjem");
    expect(nextInput).toBe(editor.shadowRoot!.activeElement);
    expect(nextInput.selectionStart).toBe(2);
  });

  test("stops Backspace and Delete from reaching the page", () => {
    const editor = new ArcusConfigEditor();
    editor.setConfig({ type: "custom:arcus-card" });
    editor.hass = makeHass();
    document.body.appendChild(editor);

    const input = field<HTMLInputElement>(editor.shadowRoot!, "title");
    const observed: string[] = [];
    const onKey = (event: Event): void => {
      observed.push((event as KeyboardEvent).key);
    };
    document.addEventListener("keydown", onKey);
    try {
      for (const key of ["Backspace", "Delete"]) {
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            composed: true,
          }),
        );
      }
    } finally {
      document.removeEventListener("keydown", onKey);
    }

    expect(observed).toEqual([]);
  });

  test("the strategy editor stops Backspace and Delete from reaching the page", () => {
    const editor = new ArcusStrategyEditor();
    editor.setConfig({ type: "custom:arcus" });
    document.body.appendChild(editor);

    const input = field<HTMLInputElement>(
      editor.shadowRoot!,
      "dashboard_title",
    );
    const observed: string[] = [];
    const onKey = (event: Event): void => {
      observed.push((event as KeyboardEvent).key);
    };
    document.addEventListener("keydown", onKey);
    try {
      for (const key of ["Backspace", "Delete", "a"]) {
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            composed: true,
          }),
        );
      }
    } finally {
      document.removeEventListener("keydown", onKey);
    }

    // The editor stops Backspace/Delete; ordinary keys still bubble.
    expect(observed).toEqual(["a"]);
  });

  test("the strategy editor keeps its card editor across an echo", () => {
    const editor = new ArcusStrategyEditor();
    editor.setConfig({
      type: "custom:arcus",
      dashboard_title: "Hjem",
      card: { type: "custom:arcus-card" },
    });
    document.body.appendChild(editor);

    const cardEditor = editor.shadowRoot!.querySelector("arcus-config-editor");
    const title = field<HTMLInputElement>(
      editor.shadowRoot!,
      "dashboard_title",
    );
    title.focus();
    title.value = "Hjemme";
    title.dispatchEvent(new Event("input", { bubbles: true, composed: true }));

    editor.setConfig(editor.getConfig());

    expect(editor.shadowRoot!.querySelector("arcus-config-editor")).toBe(
      cardEditor,
    );
    expect(field<HTMLInputElement>(editor.shadowRoot!, "dashboard_title")).toBe(
      title,
    );
  });
});
