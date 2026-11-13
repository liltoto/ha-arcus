import { afterEach, describe, expect, test } from "vitest";
import { ArcusConfigEditor } from "../src/editor";
import { ArcusStrategyEditor } from "../src/strategy-editor";
import { makeHass } from "./fixtures/home";

/** Collect the config from every `config-changed` event on an element. */
function trackConfigChanges(element: HTMLElement): Array<Record<string, any>> {
  const changes: Array<Record<string, any>> = [];
  element.addEventListener("config-changed", (event) => {
    changes.push(
      (event as CustomEvent<{ config: Record<string, any> }>).detail.config,
    );
  });
  return changes;
}

function field<T extends HTMLElement>(root: ShadowRoot, name: string): T {
  const element = root.querySelector<T>(`[name="${name}"]`);
  if (!element) throw new Error(`Expected a field named ${name}`);
  return element;
}

function change(element: HTMLElement): void {
  element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}

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
