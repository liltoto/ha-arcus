import { expect, test } from "@playwright/test";

/**
 * Touch has no hover. A tap on a chart should show the same readout the mouse
 * gets, without triggering the parent card's navigation.
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

async function open(page: import("@playwright/test").Page, hash = "") {
  await page.goto(`/dev/index.html${hash}`);
  await page.waitForSelector("arcus-card");
  await page.waitForTimeout(900);
}

test("tapping a vital spark shows the readout without navigating", async ({
  page,
}) => {
  await open(page);

  const spark = page.locator(".vital-spark").first();
  await spark.tap();

  const tip = page.locator("[data-graph-tip]");
  await expect(tip).toHaveClass(/(^|\s)show(\s|$)/);
  await expect(tip).toContainText("°C");
  await expect(tip).toContainText(/\d{2}:\d{2}/);
  await expect(page).toHaveURL(/\/dev\/index\.html$/);

  await page.locator(".greeting").tap();
  await expect(tip).not.toHaveClass(/(^|\s)show(\s|$)/);
});

test("tapping a sheet chart shows the price readout", async ({ page }) => {
  await open(page, "#/energi");
  await page.waitForSelector(".bar-chart");

  await page.locator(".bar-chart").tap();

  const tip = page.locator("[data-graph-tip]");
  await expect(tip).toHaveClass(/(^|\s)show(\s|$)/);
  await expect(tip).toContainText("kr");
  await expect(tip).toContainText(/\d{2}:\d{2}/);
});
