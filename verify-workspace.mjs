import { chromium } from "playwright";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3111";
const routes = ["/today/", "/goals/", "/focus/", "/review/", "/progress/", "/portfolio/", "/roadmap/", "/dashboard/", "/action/"];
const browser = await chromium.launch();
const results = [];

function isPrefetch(url) {
  return /__next\..*\.txt\?.*_rsc/.test(url);
}

async function audit(route, viewport, name) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("response", (response) => { if (response.status() >= 400 && !isPrefetch(response.url())) errors.push(`http ${response.status()}: ${response.url()}`); });
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  const details = await page.evaluate(() => {
    const doc = document.documentElement;
    const h1s = [...document.querySelectorAll("h1")].map((item) => item.textContent?.trim()).filter(Boolean);
    const focusable = [...document.querySelectorAll("a,button,input,select,textarea")].find((item) => item instanceof HTMLElement && item.offsetParent !== null);
    return {
      h1s,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1 ? `${doc.scrollWidth}/${doc.clientWidth}` : null,
      focusableTag: focusable?.tagName ?? null,
      bottomNav: Boolean(document.querySelector('nav[aria-label="Primary mobile navigation"]')),
    };
  });
  results.push({ name, route, viewport: `${viewport.width}x${viewport.height}`, errors, ...details });
  await page.close();
}

for (const route of routes) {
  await audit(route, { width: 1440, height: 900 }, `${route}-desktop`);
  await audit(route, { width: 375, height: 812 }, `${route}-mobile`);
}

const menu = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await menu.goto(`${base}/today/`, { waitUntil: "networkidle" });
await menu.getByRole("button", { name: /More/ }).nth(0).click();
const menuOpened = await menu.locator("#more-menu").isVisible();
await menu.keyboard.press("Escape");
const menuClosed = !(await menu.locator("#more-menu").count());
results.push({ test: "desktop More keyboard close", menuOpened, menuClosed });
await menu.close();

const flow = await browser.newPage({ viewport: { width: 390, height: 844 } });
await flow.goto(`${base}/`, { waitUntil: "domcontentloaded" });
await flow.evaluate(() => localStorage.clear());
await flow.goto(`${base}/goals/`, { waitUntil: "networkidle" });
await flow.getByLabel("Goal").fill("Finish a local focus loop");
await flow.getByLabel("Why does it matter?").fill("Make the next action visible.");
await flow.getByRole("button", { name: "Create goal and first session" }).click();
await flow.goto(`${base}/today/`, { waitUntil: "networkidle" });
const goalCreated = await flow.getByText("Finish a local focus loop").count() > 0;
await flow.goto(`${base}/focus/`, { waitUntil: "networkidle" });
await flow.getByRole("button", { name: /Start block/ }).click();
const focusStarted = await flow.getByRole("button", { name: "Pause" }).count() > 0;
await flow.getByRole("button", { name: "Complete block" }).click();
const evidenceVisible = await flow.getByText("Recorded").count() > 0 || await flow.getByText(/recorded/i).count() > 0;
results.push({ test: "goal -> today -> focus -> completion", goalCreated, focusStarted, evidenceVisible });
await flow.close();

console.log(JSON.stringify(results, null, 2));
await browser.close();

if (results.some((result) => result.errors?.length || result.h1s?.length !== 1 || result.horizontalOverflow || result.menuOpened === false || result.menuClosed === false || result.goalCreated === false || result.focusStarted === false || result.evidenceVisible === false)) process.exitCode = 1;
