import { defineConfig } from "@playwright/test";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

/**
 * Visual smoke tests for the dev harness.
 *
 * The harness is served by `npm run dev`, which also builds `dist/arcus.js`
 * and `dev/fixture.js`. The browser clock is frozen inside each spec, so the
 * baselines are independent of the machine's wall clock.
 */
export default defineConfig({
  testDir: "tests/visual",
  fullyParallel: true,
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1440, height: 1200 },
    launchOptions: executablePath
      ? {
          executablePath,
          args: ["--no-sandbox", "--disable-gpu"],
        }
      : {},
    // The dev fixture describes a Europe/Copenhagen home; pin the browser so
    // the frozen `+01:00` timestamp renders as 01:19 in CI as well.
    timezoneId: "Europe/Copenhagen",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/dev/index.html",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
