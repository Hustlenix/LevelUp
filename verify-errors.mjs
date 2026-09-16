import { chromium } from "playwright";

const url = "http://localhost:3111";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const reqFail = [];
const resp4xx = [];
page.on("requestfailed", (r) =>
  reqFail.push(`${r.failure()?.errorText} :: ${r.method()} ${r.url()} :: headers=${JSON.stringify(r.headers())}`)
);
page.on("response", (r) => {
  if (r.status() >= 400) resp4xx.push(`${r.status()} :: ${r.request().method()} ${r.url()} :: headers=${JSON.stringify(r.request().headers())}`);
});

await page.goto(url + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

console.log("=== REQUESTFAILED ===");
console.log(reqFail.length ? reqFail.join("\n") : "(none)");
console.log("=== 4xx RESPONSES ===");
console.log(resp4xx.length ? resp4xx.join("\n") : "(none)");
await page.close();
await browser.close();