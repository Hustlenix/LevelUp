import { chromium } from "playwright";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3111";
const browser = await chromium.launch();
const results = [];

function destinationUrl(path) {
  return new URL(path, base).href.replace(/\/+$/, "");
}

async function recordNavigation({ name, path, viewport, openMenu = false, mobile = false }) {
  const page = await browser.newPage({ viewport });
  try {
    await page.goto(`${base}/`, { waitUntil: "networkidle" });

    if (openMenu) {
      await page.locator("header").getByRole("button", { name: /^More/ }).click();
    }

    const scope = mobile
      ? page.getByRole("navigation", { name: "Primary mobile navigation" })
      : openMenu
        ? page.getByRole("menu")
        : page.getByRole("navigation", { name: "Primary navigation" });
    await scope.locator(`a[href="${path}"]`).click();
    await page.waitForURL((url) => url.href.replace(/\/+$/, "") === destinationUrl(path));

    results.push({
      test: name,
      finalUrl: page.url(),
      h1: (await page.locator("h1").first().textContent().catch(() => "(no h1)"))?.trim().slice(0, 60),
      ok: true,
    });
  } catch (error) {
    results.push({ test: name, finalUrl: page.url(), ok: false, error: error.message });
  } finally {
    await page.close();
  }
}

for (const path of ["/today/", "/chapters/", "/goals/", "/progress/"]) {
  await recordNavigation({ name: `desktop primary nav -> ${path}`, path, viewport: { width: 1440, height: 900 } });
}

for (const path of ["/focus/", "/review/", "/protocols/"]) {
  await recordNavigation({ name: `desktop More menu -> ${path}`, path, viewport: { width: 1440, height: 900 }, openMenu: true });
}

for (const path of ["/today/", "/chapters/", "/goals/", "/progress/"]) {
  await recordNavigation({ name: `mobile bottom nav -> ${path}`, path, viewport: { width: 375, height: 812 }, mobile: true });
}

console.log(JSON.stringify(results, null, 2));
await browser.close();

if (results.some((result) => !result.ok)) process.exitCode = 1;
