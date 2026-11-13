import { describe, expect, test } from "vitest";
import {
  DICTIONARIES,
  createTranslator,
  resolveLanguage,
} from "../src/localize";

describe("resolveLanguage", () => {
  test("auto follows a Danish Home Assistant language", () => {
    expect(resolveLanguage("da", { language: "auto" })).toBe("da");
    expect(resolveLanguage("da-DK", { language: "auto" })).toBe("da");
  });

  test("auto falls back to English for other languages", () => {
    expect(resolveLanguage("en-US", { language: "auto" })).toBe("en");
    expect(resolveLanguage("de", { language: "auto" })).toBe("en");
    expect(resolveLanguage(undefined, { language: "auto" })).toBe("en");
    expect(resolveLanguage(undefined, {})).toBe("en");
  });

  test("an explicit language always wins", () => {
    expect(resolveLanguage("en-GB", { language: "da" })).toBe("da");
    expect(resolveLanguage("da-DK", { language: "en" })).toBe("en");
  });
});

describe("Danish copy", () => {
  const t = createTranslator("da");

  test("covers the visible prototype strings", () => {
    expect(t("room.temperature")).toBe("Temperatur");
    expect(t("room.humidity")).toBe("Luftfugtighed");
    expect(t("room.openRoom")).toBe("åbn rum →");
    expect(t("empty.areas")).toBe("Ingen områder");
    expect(t("empty.solar")).toBe("Ingen solcelledata");
    expect(t("confirm.allLights")).toBe("Sluk alle lys i hjemmet?");
    expect(t("confirm.yesLightOff")).toBe("Ja, sluk");
    expect(t("quick.bedtime")).toBe("Sengetid");
    expect(t("quick.vacation")).toBe("Ferietilstand");
    expect(t("sheet.titleSolar")).toBe("Solceller");
    expect(t("alerts.emptyTitle")).toBe("Alt er, som det skal være.");
    expect(t("ventilation.nilanPath")).toBe("NILAN · LUFTVEJ");
    expect(t("heating.windowOpen")).toBe("vindue åbent");
  });

  test("interpolates placeholders", () => {
    expect(t("room.lightsCount", { on: 2, total: 5 })).toBe("2 / 5 lys");
    expect(t("room.openCount", { count: 3 })).toBe("3 åben");
    expect(t("solar.summary", { soc: 27, today: "15,3", power: 0 })).toBe(
      "27 % batteri · 15,3 kWh i dag · 0 W nu",
    );
    expect(t("confirm.allLights")).toBe("Sluk alle lys i hjemmet?");
  });

  test("leaves unknown placeholders untouched", () => {
    expect(t("room.lightOn", { pct: 40 })).toBe("Tændt · 40 %");
    expect(t("room.lightOn")).toBe("Tændt · {pct} %");
  });
});

describe("English copy", () => {
  const t = createTranslator("en");

  test("translates the same keys", () => {
    expect(t("room.temperature")).toBe("Temperature");
    expect(t("empty.areas")).toBe("No areas");
    expect(t("empty.solar")).toBe("No solar data");
    expect(t("confirm.allLights")).toBe("Turn off all lights in the home?");
    expect(t("quick.bedtime")).toBe("Bedtime");
    expect(t("room.lightsCount", { on: 2, total: 5 })).toBe("2 / 5 lights");
    expect(t("weather.partlycloudy")).toBe("partly cloudy");
  });
});

describe("dictionaries and fallback", () => {
  test("Danish and English cover the same keys", () => {
    expect(Object.keys(DICTIONARIES.en).sort()).toEqual(
      Object.keys(DICTIONARIES.da).sort(),
    );
  });

  test("falls back to the key when the key is missing", () => {
    expect(createTranslator("da")("does.not.exist")).toBe("does.not.exist");
    expect(createTranslator("en")("does.not.exist")).toBe("does.not.exist");
  });

  test("keeps weather condition keys aligned with Home Assistant", () => {
    expect(createTranslator("da")("weather.clear-night")).toBe("klart");
    expect(createTranslator("da")("weather.lightning-rainy")).toBe(
      "tordenregn",
    );
    expect(createTranslator("en")("weather.windy-variant")).toBe("windy");
  });
});
