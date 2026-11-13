import { expect, test } from "vitest";
import { ARCUS_VERSION } from "../src/version";

test("version is the Marketplace version", () => {
  expect(ARCUS_VERSION).toBe("0.1.0");
});
