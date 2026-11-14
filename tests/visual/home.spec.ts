import { expect, test, type Page } from "@playwright/test";

/**
 * The mock home is dated 2026-11-13 and the prototype was audited at a fixed
 * local time. Freezing both `Date` and `Date.now` keeps the greeting, arc
 * needle, prayer countdown, and history windows identical on every run.
 */
const FROZEN_TIME = "2026-11-13T01:19:00+01:00";

async function freezeClock(page: Page): Promise<void> {
  await page.addInitScript((iso: string) => {
    const RealDate = Date;
    const fixed = new RealDate(iso).getTime();

    class FrozenDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(fixed);
        } else {
          // The cast only narrows Date's overloads for TypeScript; the runtime
          // spread still forwards every argument.
          super(...(args as [number]));
        }
      }

      static now(): number {
        return fixed;
      }
    }

    Object.defineProperty(window, "Date", {
      configurable: true,
      writable: true,
      value: FrozenDate,
    });
    // The card reads this pinned clock for its model and history cache.
    (window as Window & { __HJEM_NOW?: Date }).__HJEM_NOW = new FrozenDate(
      fixed,
    );
  }, FROZEN_TIME);
}

async function waitForHome(page: Page): Promise<void> {
  await page.waitForSelector("arcus-card");
  await page.waitForSelector(".room-card");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // Let the ?full=1 harness style land, history resolve, and charts draw.
  await page.waitForTimeout(800);
}

async function openHome(
  page: Page,
  options: { width: number; height: number; query?: string },
): Promise<void> {
  const query = options.query ?? "full=1";
  await page.setViewportSize({ width: options.width, height: options.height });
  await freezeClock(page);
  await page.goto(`/dev/index.html?${query}`);
  await waitForHome(page);

  if (query.includes("full=1")) {
    // ?full=1 makes .app overflow visible so the page can grow to its full
    // height. The closed sheet is parked off-canvas at that point; on desktop
    // it widens the document and on mobile its 93% height adds thousands of
    // empty pixels below the footer. The normal card clips it with
    // overflow: hidden, so hide only the closed sheet/scrim here. The visible
    // page is unchanged.
    await page.evaluate(() => {
      const root = document.querySelector("arcus-card")?.shadowRoot;
      if (!root) throw new Error("arcus-card shadow root is missing");
      const style = document.createElement("style");
      style.textContent =
        ".sheet:not(.open), .scrim:not(.open) { display: none !important; }";
      root.appendChild(style);
    });
    await page.waitForTimeout(100);
  }
}

async function openSheet(
  page: Page,
  options: { width: number; height: number; hash: string },
): Promise<void> {
  await page.setViewportSize({ width: options.width, height: options.height });
  await freezeClock(page);
  await page.goto(`/dev/index.html${options.hash}`);
  await page.waitForSelector("arcus-card");
  await page.waitForSelector(".sheet.open");
  await page.waitForSelector(".sheet-title");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // The sheet re-renders once history and the weather forecast resolve.
  await page.waitForTimeout(800);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }));

  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
}

test("home at 1440 (dark) matches the baseline without horizontal overflow", async ({
  page,
}) => {
  await openHome(page, { width: 1440, height: 1200 });

  await expect(page.locator(".app")).not.toHaveClass(/light/);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("home-1440-dark.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});

test("home at 390 (dark) matches the baseline without horizontal overflow", async ({
  page,
}) => {
  await openHome(page, { width: 390, height: 844 });

  await expect(page.locator(".app")).not.toHaveClass(/light/);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot("home-390-dark.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});

test("home at 1440 (light) matches the baseline", async ({ page }) => {
  await openHome(page, {
    width: 1440,
    height: 1200,
    query: "full=1&light=1",
  });

  await expect(page.locator(".app")).toHaveClass(/light/);
  await expect(page).toHaveScreenshot("home-1440-light.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});

test("home at 360 has no horizontal overflow", async ({ page }) => {
  await openHome(page, { width: 360, height: 844 });

  await expectNoHorizontalOverflow(page);
});

test("room sheet at 1440 matches the viewport baseline", async ({ page }) => {
  await openSheet(page, {
    width: 1440,
    height: 1200,
    hash: "#/rum/stue",
  });

  await expect(page.locator(".sheet-title")).toHaveText("Stue");
  await expect(page).toHaveScreenshot("sheet-room-1440.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("energy sheet at 1440 matches the viewport baseline", async ({ page }) => {
  await openSheet(page, {
    width: 1440,
    height: 1200,
    hash: "#/energi",
  });

  await expect(page.locator(".sheet-title")).toHaveText("Energi");
  await expect(page).toHaveScreenshot("sheet-energy-1440.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("energy sheet at 390 matches the viewport baseline", async ({ page }) => {
  await openSheet(page, {
    width: 390,
    height: 844,
    hash: "#/energi",
  });

  await expect(page.locator(".sheet-title")).toHaveText("Energi");
  await expect(page).toHaveScreenshot("sheet-energy-390.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("the room sheet holds focus and Escape closes it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await freezeClock(page);
  await page.goto("/dev/index.html");
  await waitForHome(page);

  // Opening from the home view (rather than a cold hash load) is the path a
  // keyboard user takes; the close button receives focus in the sheet.
  await page.locator(".room-card").first().click();
  await page.waitForSelector(".sheet.open");
  await expect(page.locator(".sheet-title")).toHaveText("Stue");

  const focusInsideSheet = () =>
    page.evaluate(() => {
      const card = document.querySelector("arcus-card");
      const root = card?.shadowRoot;
      const sheet = root?.querySelector(".sheet");
      const active = root?.activeElement;
      return !!sheet && !!active && sheet.contains(active);
    });

  await expect.poll(focusInsideSheet).toBe(true);

  // Tab stays inside the sheet; the card's focus trap wraps at the edges.
  await page.keyboard.press("Tab");
  await expect.poll(focusInsideSheet).toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.locator(".sheet")).not.toHaveClass(/(^|\s)open(\s|$)/);
  await expect(page).toHaveURL(/#\/$/);
});
