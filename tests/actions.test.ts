import { describe, expect, test, vi } from "vitest";
import { performAction } from "../src/actions";
import { makeHass } from "./fixtures/home";

function spyOnOpen() {
  return vi.spyOn(window, "open").mockImplementation(() => null);
}

describe("performAction url", () => {
  test("opens an absolute https URL with the target and noopener,noreferrer", async () => {
    const open = spyOnOpen();

    await performAction(makeHass(), {
      action: "url",
      url_path: "https://example.com",
    });

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer",
    );
  });

  test("accepts an upper-case scheme", async () => {
    const open = spyOnOpen();

    await performAction(makeHass(), {
      action: "url",
      url_path: "HTTPS://EXAMPLE.COM",
    });

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      "HTTPS://EXAMPLE.COM",
      "_blank",
      "noopener,noreferrer",
    );
  });

  test.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//evil.example",
    "example.com",
  ])("does not open %s", async (url) => {
    const open = spyOnOpen();

    await performAction(makeHass(), { action: "url", url_path: url });

    expect(open).not.toHaveBeenCalled();
  });
});
