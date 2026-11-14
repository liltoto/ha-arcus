import { expect, test, type Page } from "@playwright/test";

/** Open the solar sheet and wait for its slide-in transition to settle. */
async function openSolarSheet(
  page: Page,
  options: { hash?: string; width?: number; height?: number } = {},
): Promise<void> {
  await page.setViewportSize({
    width: options.width ?? 1440,
    height: options.height ?? 1200,
  });
  await page.goto(`/dev/index.html${options.hash ?? "#/sol"}`);
  await page.waitForSelector(".sheet.open .sheet-tabs");
  await expect(page.locator(".sheet")).toHaveCSS("transform", "none");
}

interface TabState {
  visible: boolean;
  scrollable: boolean;
  canLeft: boolean;
  canRight: boolean;
  scrollLeft: number;
}

async function tabState(page: Page): Promise<TabState | null> {
  return page.evaluate(() => {
    const card = document.querySelector("arcus-card") as
      | (HTMLElement & { shadowRoot: ShadowRoot | null })
      | null;
    const strip = card?.shadowRoot?.querySelector<HTMLElement>(".sheet-tabs");
    const active = strip?.querySelector<HTMLElement>(".tab.active");
    if (!strip || !active) return null;
    const stripRect = strip.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    return {
      visible:
        activeRect.left >= stripRect.left - 0.5 &&
        activeRect.right <= stripRect.right + 0.5,
      scrollable: strip.classList.contains("scrollable"),
      canLeft: strip.classList.contains("can-left"),
      canRight: strip.classList.contains("can-right"),
      scrollLeft: Math.round(strip.scrollLeft),
    };
  });
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

test("the active tab is scrolled into view on a phone", async ({ page }) => {
  await openSolarSheet(page, {
    hash: "#/sol/afkast",
    width: 390,
    height: 844,
  });

  const state = await tabState(page);
  expect(state).not.toBeNull();
  expect(state?.visible).toBe(true);
  expect(state?.scrollable).toBe(true);
  expect(state?.canLeft).toBe(true);
  expect(state?.canRight).toBe(false);
});

test("the first tab shows the right-edge fade on a phone", async ({ page }) => {
  await openSolarSheet(page, { hash: "#/sol", width: 390, height: 844 });

  const state = await tabState(page);
  expect(state).not.toBeNull();
  expect(state?.visible).toBe(true);
  expect(state?.scrollLeft).toBe(0);
  expect(state?.canLeft).toBe(false);
  expect(state?.canRight).toBe(true);
});

test("switching tabs keeps the active tab visible on a phone", async ({
  page,
}) => {
  await openSolarSheet(page, { hash: "#/sol", width: 390, height: 844 });

  await page.locator(".sheet-tabs .tab", { hasText: "Produktion" }).click();
  await expect(page).toHaveURL(/#\/sol\/produktion/);
  await expect(page.locator(".sheet-tabs .tab.active")).toHaveText(
    "Produktion",
  );
  await expect(page.locator(".sheet")).toHaveCSS("transform", "none");

  const state = await tabState(page);
  expect(state).not.toBeNull();
  expect(state?.visible).toBe(true);
});
