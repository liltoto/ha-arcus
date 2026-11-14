import { expect, test, type Page } from "@playwright/test";

/** Open the solar sheet and wait for its slide-in transition to settle. */
async function openSolarSheet(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/dev/index.html#/sol");
  await page.waitForSelector(".sheet.open .sheet-tabs");
  await expect(page.locator(".sheet")).toHaveCSS("transform", "none");
}

/**
 * The solar sheet renders its tab strip as a sibling of the padded header and
 * body. It must line up with that content instead of hugging the sheet border.
 */
test("solar sheet tabs align with the sheet content", async ({ page }) => {
  await openSolarSheet(page);

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

test("a chart after a readings grid keeps its distance", async ({ page }) => {
  await openSolarSheet(page);
  await page.waitForSelector(".sheet.open .readings + .chart-box");

  const gap = await page.evaluate(() => {
    const card = document.querySelector("arcus-card") as
      | (HTMLElement & { shadowRoot: ShadowRoot | null })
      | null;
    const root = card?.shadowRoot;
    if (!root) return null;
    const readings = Array.from(root.querySelectorAll(".readings")).find(
      (element) => element.nextElementSibling?.classList.contains("chart-box"),
    );
    const chart = readings?.nextElementSibling;
    if (!readings || !chart) return null;
    return (
      chart.getBoundingClientRect().top -
      readings.getBoundingClientRect().bottom
    );
  });

  expect(gap).not.toBeNull();
  expect(gap as number).toBeGreaterThanOrEqual(12);
});
