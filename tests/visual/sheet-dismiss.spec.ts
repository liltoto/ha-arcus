import { expect, test, type Page } from "@playwright/test";

async function openSolar(
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("/dev/index.html#/sol");
  await page.waitForSelector(".sheet.open");
  await expect(page.locator(".sheet")).toHaveCSS("transform", "none");
}

test("clicking outside the sheet closes it on desktop", async ({ page }) => {
  await openSolar(page, 1440, 1200);

  // The scrim covers everything to the left of the panel at this width.
  await page.mouse.click(200, 200);

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator(".sheet")).not.toHaveClass(/open/);
});

test("tapping outside the sheet closes it on a phone", async ({ page }) => {
  await openSolar(page, 390, 844);

  // The backdrop is the 7% strip above the bottom sheet.
  await page.mouse.click(20, 20);

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator(".sheet")).not.toHaveClass(/open/);
});

test("clicking inside the sheet keeps it open", async ({ page }) => {
  await openSolar(page, 1440, 1200);

  await page.locator(".sheet-title").click();

  await expect(page).toHaveURL(/#\/sol/);
  await expect(page.locator(".sheet")).toHaveClass(/open/);
});
