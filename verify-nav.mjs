import { chromium } from "playwright";

const url = "http://localhost:3111";
const browser = await chromium.launch();
const results = [];
for (const dest of ["/dashboard/", "/action/", "/protocols/"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.click(`nav a[href="${dest}"]`);
  await page.waitForTimeout(1500);
  results.push({
    test: `nav link -> ${dest}`,
    finalUrl: page.url(),
    h1: (await page.locator("h1").first().textContent().catch(() => "(no h1)")).trim().slice(0, 60),
    ok: page.url().replace(/\/+$/, "") === (url + dest).replace(/\/+$/, ""),
  });
  await page.close();
}
console.log(JSON.stringify(results, null, 2));
await browser.close();