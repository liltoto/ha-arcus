import { expect, test } from "vitest";
import "../src/main";
import { ARCUS_VERSION } from "../src/version";

test("version is the Marketplace version", () => {
  expect(ARCUS_VERSION).toBe("0.2.5");
});

test("the bundle registers every Arcus custom element", () => {
  for (const tag of [
    "arcus-card",
    "arcus-config-editor",
    "arcus-strategy-editor",
    "ll-strategy-dashboard-arcus",
  ]) {
    expect(customElements.get(tag), tag).toBeDefined();
  }

  expect(window.customCards?.some((card) => card.type === "arcus-card")).toBe(
    true,
  );
  expect(
    window.customStrategies?.some((strategy) => strategy.type === "arcus"),
  ).toBe(true);
});
