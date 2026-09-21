import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Run against a static preview or the deployed Pages URL. All writes are to an
// isolated browser context, never the operator's existing browser data.
const base = (process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const site = JSON.parse(readFileSync(new URL("./public/data/site.json", import.meta.url), "utf8"));
const routes = ["/", "/chapters/", "/protocols/", "/today/", "/dashboard/", "/goals/", "/focus/", "/review/", "/progress/", "/portfolio/", "/roadmap/", "/action/", "/audit/", "/research/", "/glossary/", "/quotes/", "/search/", "/settings/", "/backup/", "/privacy/", "/experiments/", "/playbook/", "/devlog/", "/study/", "/study/onboarding/", "/study/settings/", ...site.chapters.map((chapter) => `/chapters/${chapter.slug}/`)];
const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 375, height: 900 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.url().startsWith(base) && response.status() >= 400 && !/__next\..*\.txt\?.*_rsc/.test(response.url())) errors.push(`${response.status()} ${response.url()}`);
});
page.on("dialog", (dialog) => dialog.accept());

try {
  for (const route of routes) {
    const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200, route);
    if (await page.locator("h1").count() === 0) errors.push(`missing heading: ${route}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errors.push(`mobile overflow: ${route}`);
    if (route.startsWith("/chapters/") && route !== "/chapters/") assert.equal(await page.locator("#chapter-guide").count(), 1, route);
  }
  console.log(`${routes.length} public routes: loaded, mobile layout checked, chapter guides present.`);

  await page.goto(`${base}/search/`, { waitUntil: "networkidle" });
  await page.getByRole("textbox").fill("hyperfocus");
  await page.locator(`main a[href$="/chapters/hyperfocus/"]`).first().waitFor();
  console.log("Search index and chapter result verified.");

  await page.goto(`${base}/chapters/hyperfocus/`, { waitUntil: "networkidle" });
  const quiz = page.getByRole("region", { name: "Test yourself" });
  for (let question = 0; question < 3; question++) {
    await quiz.locator('button[aria-pressed="false"]').first().click();
    if (question < 2) await quiz.getByRole("button", { name: "Next question", exact: true }).click();
  }
  await quiz.getByText(/of 3 correct/).waitFor();
  const score = await page.evaluate(() => JSON.parse(localStorage.getItem("levelup-quiz-v1") || "{}").hyperfocus);
  assert.equal(score?.total, 3, "final answer persists the quiz score");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(/Best saved score:/).waitFor();
  console.log("Quiz final-answer save and reload verified.");

  await page.locator("#chapter-practice textarea").fill("Release check: prepare three headings.");
  await page.getByRole("button", { name: "Save practice record", exact: true }).click();
  await page.getByRole("button", { name: "Saved on this device", exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(/Last record ·/).click();
  await page.getByText("Release check: prepare three headings.", { exact: true }).waitFor();
  console.log("Practice record persists on the deployed origin.");

  await page.goto(`${base}/goals/`, { waitUntil: "networkidle" });
  await page.getByLabel("Goal", { exact: true }).fill("Release verification goal");
  await page.getByLabel("Why does it matter?").fill("Check the complete operating loop.");
  await page.getByRole("button", { name: "Create goal and first session" }).click();
  await page.goto(`${base}/today/`, { waitUntil: "networkidle" });
  await page.getByText("Release verification goal", { exact: false }).first().waitFor();
  await page.goto(`${base}/focus/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Start block/ }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).waitFor();
  await page.getByRole("button", { name: "Complete block", exact: true }).click();
  await page.getByText(/recorded/i).first().waitFor();
  console.log("Goal → Today → Focus → recorded completion verified.");

  await page.goto(`${base}/backup/`, { waitUntil: "networkidle" });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export full backup", exact: true }).click();
  const download = await downloaded;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  const backup = JSON.parse(buffer.toString("utf8"));
  assert.equal(backup.actionState.protocolLogs.length, 1);
  assert.equal(backup.quiz.hyperfocus.total, 3);
  await page.locator('input[type="file"]').setInputFiles({ name: "release-backup.json", mimeType: "application/json", buffer });
  await page.getByText(/Backup imported safely/).waitFor();
  console.log("Backup download and validated restore verified.");

  await page.goto(`${base}/protocols/`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#practice-plan-picker option").count(), 13);
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `practice library width ${width}`);
  }
  assert.deepEqual(errors, [], "no runtime or required-resource HTTP errors");
  console.log("PASS: 13-plan library, responsive widths, runtime and required resources.");
} finally {
  await browser.close();
}
