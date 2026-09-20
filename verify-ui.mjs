import { chromium } from "playwright";

const url = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3111";
const browser = await chromium.launch();
const all = [];

async function check(name, path, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  // Prefetch probes: a static export has no RSC payload files, so Next.js <Link>
  // prefetch requests abort (net::ERR_ABORTED) and their __next.*.txt?_rsc= probes
  // 404. Browsers abort these invisibly; real navigations never trigger them.
  // Filter them so only genuine failures are reported.
  const isPrefetchProbe = (u) => /__next\..*\.txt\?.*_rsc/.test(u);
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (m.text().startsWith("Failed to load resource")) return; // network noise tracked via response/requestfailed
    errors.push(`CONSOLE: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e}`));
  page.on("requestfailed", (r) => {
    const reason = r.failure()?.errorText ?? "unknown";
    if (reason === "net::ERR_ABORTED") return; // browser-aborted prefetch probe, not a real failure
    errors.push(`REQ FAIL: ${r.url()} (${reason})`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !isPrefetchProbe(r.url())) errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  await page.goto(url + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `shot-${name}.png`, fullPage: true });
  all.push({ check: name, title: await page.title(), errors, shot: `shot-${name}.png` });
  await page.close();
}

await check("home-desktop", "/", { width: 1440, height: 900 });
await check("home-mobile", "/", { width: 375, height: 812 });
await check("dashboard-desktop", "/dashboard/", { width: 1440, height: 900 });
await check("dashboard-mobile", "/dashboard/", { width: 375, height: 812 });

// Desktop More menu: open, read links, Escape closes
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const derr = [];
page.on("pageerror", (e) => derr.push(String(e)));
await page.goto(url + "/", { waitUntil: "networkidle" });
await page.click('nav button:has-text("More")');
await page.waitForTimeout(400);
const moreLinks = await page.$$eval("#more-menu a", (as) => as.map((a) => `${a.textContent.trim()} -> ${a.getAttribute("href")}`));
const expanded = await page.getAttribute('nav button[aria-haspopup="menu"]', "aria-expanded");
await page.screenshot({ path: "shot-more-open.png" });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
const closedByEscape = await page.evaluate(() => !document.getElementById("more-menu"));
all.push({ check: "more-desktop", moreLinks, expanded, closedByEscape, errors: derr });
await page.close();

// Mobile More menu: scroll into view first (overflow row)
const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
const merr = [];
mobile.on("pageerror", (e) => merr.push(String(e)));
await mobile.goto(url + "/", { waitUntil: "networkidle" });
const moreBtn = mobile.getByRole("button", { name: /^More/ });
await moreBtn.evaluate((el) => el.scrollIntoView({ block: "nearest", inline: "center" }));
await mobile.waitForTimeout(200);
await moreBtn.click({ force: true });
await mobile.waitForTimeout(400);
const moreLinksMobile = await mobile.$$eval("#more-menu-mobile a", (as) => as.map((a) => `${a.textContent.trim()} -> ${a.getAttribute("href")}`));
await mobile.screenshot({ path: "shot-more-mobile.png", fullPage: true });
all.push({ check: "more-mobile", moreLinksMobile, errors: merr });
await mobile.close();

console.log(JSON.stringify(all, null, 2));
await browser.close();
