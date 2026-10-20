import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// node verify-design.mjs [static-preview-url] [optional-screenshot-directory]
// Isolated browser data only. No writes to the user's actual workspace records.
const base = (process.argv[2] ?? "http://localhost:3113").replace(/\/$/, "");
const screenshots = process.argv[3];
if (screenshots) await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: "reduce", colorScheme: "light" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("response", response => {
  if (response.url().startsWith(base) && response.status() >= 400 && !/__next\..*\.txt\?.*_rsc/.test(response.url())) errors.push(response.status() + " " + response.url());
});
const routes = ["/", "/today/", "/chapters/", "/chapters/hyperfocus/", "/protocols/", "/journey/", "/coach/", "/profile/", "/progress/", "/onboarding/"];
try {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of routes) {
      const response = await page.goto(base + route, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, route);
      assert.equal(await page.locator("main h1").count(), 1, route + " has one page heading");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, route + " overflows " + width);
      if (route === "/") {
        assert.equal(await page.locator(".workspace-sidebar").count(), 0);
        assert.equal(await page.getByRole("navigation", { name: "Primary mobile navigation" }).count(), 0);
        assert.equal(await page.getByRole("button", { name: /Open Milo companion/ }).count(), 0);
        await page.getByText("Example day", { exact: true }).waitFor();
      }
      if (screenshots && [390, 1440].includes(width) && ["/", "/today/", "/chapters/"].includes(route)) {
        const name = route === "/" ? "home" : route.replaceAll("/", "");
        await page.screenshot({ path: resolve(screenshots, "levelup-" + name + "-" + width + ".png"), fullPage: true });
      }
    }
  }
  console.log("40 responsive route checks passed: 320, 390, 768 and 1440px.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: "Open navigation", exact: true });
  await trigger.click();
  const menu = page.getByRole("navigation", { name: "All navigation" });
  assert.equal(await menu.getByRole("link").count(), 22);
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Today");
  await page.keyboard.press("Escape");
  assert.equal(await menu.count(), 0);
  assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
  await trigger.click();
  await menu.getByRole("link", { name: "Learn", exact: true }).click();
  await page.waitForURL("**/chapters/");
  assert.equal(await menu.count(), 0);
  await page.getByRole("navigation", { name: "Primary mobile navigation" }).getByRole("link", { name: "Learn", exact: true }).getAttribute("aria-current").then(value => assert.equal(value, "page"));
  await page.getByRole("searchbox", { name: "Filter chapters" }).fill("hyperfocus");
  assert.equal(await page.locator("main h3").count(), 1);
  await page.getByRole("button", { name: "Bookmark Hyperfocus", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByRole("button", { name: "Bookmark Hyperfocus", exact: true }).getAttribute("aria-pressed"), "true");
  console.log("Mobile menu, keyboard dismissal, active navigation, lesson filtering and bookmark persistence passed.");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/today/", { waitUntil: "networkidle" });
  await page.locator("summary").filter({ hasText: "Planning & reflection" }).click();
  await page.getByRole("navigation", { name: "Sidebar navigation" }).getByRole("link", { name: "Goals", exact: true }).click();
  await page.waitForURL("**/goals/");
  assert.equal(await page.getByRole("navigation", { name: "Sidebar navigation" }).getByRole("link", { name: "Goals", exact: true }).getAttribute("aria-current"), "page");
  await page.getByRole("button", { name: "Change theme", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.goto(base + "/", { waitUntil: "networkidle" });
  if (screenshots) await page.screenshot({ path: resolve(screenshots, "levelup-home-dark.png"), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  console.log("Desktop resource navigation and persisted dark theme passed.");
  assert.deepEqual(errors, [], "No runtime or resource errors");
  console.log("PASS: design regression checks.");
} finally { await browser.close(); }
