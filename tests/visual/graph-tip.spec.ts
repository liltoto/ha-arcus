import { expect, test, type Page } from "@playwright/test";

/**
 * Hover readouts are functional, not visual: the tooltip is hidden until the
 * pointer is over a chart. These tests assert the value/time content and the
 * hide-on-leave behaviour on the three chart shapes (spark, bars, multi-line).
 */
async function open(page: Page, hash = ""): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(`/dev/index.html${hash}`);
  await page.waitForSelector("arcus-card");
  await page.waitForTimeout(900);
}

test("vital spark shows its value and time on hover", async ({ page }) => {
  await open(page, "");

  const spark = page.locator(".vital-spark").first();
  await spark.hover();

  const tip = page.locator("[data-graph-tip]");
  await expect(tip).toHaveClass(/(^|\s)show(\s|$)/);
  await expect(tip).toContainText("°C");
  await expect(tip).toContainText(/\d{2}:\d{2}/);

  await page.locator(".greeting").hover();
  await expect(tip).not.toHaveClass(/(^|\s)show(\s|$)/);

  // The readout must not swallow the card's own click.
  await spark.click();
  await expect(page).toHaveURL(/#\/rum\//);
});

test("energy price bars show the hour and price", async ({ page }) => {
  await open(page, "#/energi");
  await page.waitForSelector(".bar-chart");

  await page.locator(".bar-chart").hover();

  const tip = page.locator("[data-graph-tip]");
  await expect(tip).toHaveClass(/(^|\s)show(\s|$)/);
  await expect(tip).toContainText("kr");
  await expect(tip).toContainText(/\d{2}:\d{2}/);
});

test("shared solar chart lists every series in the tooltip", async ({
  page,
}) => {
  await open(page, "#/sol");
  await page.waitForSelector(".chart-box[data-gs]");

  await page.locator(".chart-box[data-gs]").first().hover();

  const tip = page.locator("[data-graph-tip]");
  await expect(tip).toHaveClass(/(^|\s)show(\s|$)/);
  expect(await tip.locator(".gt-row").count()).toBeGreaterThan(1);
  await expect(tip).toContainText(/\d{2}:\d{2}/);
});
