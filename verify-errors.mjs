import { chromium } from "playwright";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3111";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const requestFailures = [];
const badResponses = [];
const pageErrors = [];
const isStaticExportPrefetch = (url) => /__next\..*\.txt\?.*_rsc/.test(url);

page.on("requestfailed", (request) => {
  const reason = request.failure()?.errorText ?? "unknown";
  if (reason === "net::ERR_ABORTED" || isStaticExportPrefetch(request.url())) return;
  requestFailures.push(`${reason} :: ${request.method()} ${request.url()}`);
});
page.on("response", (response) => {
  if (response.status() < 400 || isStaticExportPrefetch(response.url())) return;
  badResponses.push(`${response.status()} :: ${response.request().method()} ${response.url()}`);
});
page.on("pageerror", (error) => pageErrors.push(error.message));

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const result = { requestFailures, badResponses, pageErrors };
console.log(JSON.stringify(result, null, 2));
await page.close();
await browser.close();

if (Object.values(result).some((errors) => errors.length > 0)) process.exitCode = 1;
