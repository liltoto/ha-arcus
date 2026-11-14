import { expect, test } from "@playwright/test";

/**
 * The solar sheet renders its tab strip as a sibling of the padded header and
 * body. It must line up with that content instead of hugging the sheet border.
 */
test("solar sheet tabs align with the sheet content", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/dev/index.html#/sol");
  await page.waitForSelector(".sheet.open .sheet-tabs");

  const [titleLeft, tabLeft] = await Promise.all([
    page
      .locator(".sheet-title")
      .evaluate((element) => element.getBoundingClientRect().left),
    page
      .locator(".sheet-tabs .tab")
      .first()
      .evaluate((element) => element.getBoundingClientRect().left),
  ]);

  expect(Math.abs(tabLeft - titleLeft)).toBeLessThan(1);
});
