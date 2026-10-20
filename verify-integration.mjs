import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3116";
const browser = await chromium.launch();
const errors = [];
const overflow = [];
let layouts = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/today/");
  await page.getByRole("button", { name: "Try a 30-minute starter day", exact: true }).click();
  await page.getByRole("button", { name: "Start mission", exact: true }).waitFor();
  await page.getByRole("button", { name: "Start with the starter set", exact: true }).click();
  await page.goto(base + "/chapters/hyperfocus/");
  await page.locator("#chapter-guide").getByRole("button", { name: "Save as a next action", exact: true }).click();
  await page.goto(base + "/today/");
  assert.equal(await page.getByRole("region", { name: "Next actions", exact: true }).getByRole("listitem").count(), 1);
  assert.equal(await page.locator("#daily-ritual").count(), 1);
  await page.goto(base + "/backup/");
  assert.equal(await page.getByRole("button", { name: "Export full backup", exact: true }).count(), 1);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export full backup", exact: true }).click()]);
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  assert.ok(backup.lifeState.profile);
  assert.ok(backup.nexusReplica.operations.length);
  assert.equal(backup.habits.habits.length, 5);
  assert.equal(backup.smallSteps.queue.length, 1);
  await page.locator('input[type="file"]').setInputFiles({ name: "combined.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByText(/Backup imported safely/).waitFor();
  await page.reload();
  const persisted = await page.evaluate(() => ({ nexus: JSON.parse(localStorage.getItem("levelup-nexus-replica-v1")), steps: JSON.parse(localStorage.getItem("levelup-small-steps-v1")), habits: JSON.parse(localStorage.getItem("levelup-habits-v1")) }));
  assert.equal(persisted.nexus.workspaceId, backup.nexusReplica.workspaceId);
  assert.equal(persisted.steps.queue.length, 1);
  assert.equal(persisted.habits.habits.length, 5);
  console.log("Combined Today, saved lesson, habits, Nexus, and backup/restore verified.");
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/today/", "/journey/", "/coach/", "/profile/", "/progress/", "/sync-lab/", "/settings/", "/small-steps/", "/protocols/"]) {
      await page.goto(base + route);
      for (const theme of ["light", "dark", "deepwork", "cyberpunk"]) {
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; document.documentElement.dataset.readerScale = "1.5"; }, theme);
        await page.waitForTimeout(250);
        const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, font: getComputedStyle(document.documentElement).fontSize }));
        if (size.scroll > size.width + 1) overflow.push(`${route} ${width} ${theme} at 150% overflow: ${size.scroll}`);
        assert.equal(size.font, "24px");
        layouts++;
      }
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(overflow, []);
  console.log(`PASS: ${layouts} integrated layouts at 150% text; no page errors.`);
} finally { await browser.close(); }
