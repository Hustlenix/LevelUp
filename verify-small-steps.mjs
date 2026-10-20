import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const base = process.argv[2] || "http://localhost:3113";
const browser = await chromium.launch();
const errors = [];
let checks = 0;
const key = "levelup-small-steps-v1";
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${base}/small-steps/`);
  await page.getByRole("button", { name: "Start my homework", exact: true }).click();
  await page.getByLabel("When I return…").fill("Read question two");
  await page.getByRole("button", { name: "2 min", exact: true }).click();
  await page.getByRole("button", { name: "Start this step", exact: true }).click();
  const dialog = page.getByRole("dialog");
  assert.ok(await dialog.isVisible());
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).elapsed >= 1, key);
  await dialog.getByRole("button", { name: "I’m stuck", exact: true }).click();
  await dialog.getByLabel("Make this action smaller").fill("Pick up my notebook");
  await page.keyboard.press("Escape");
  assert.equal(await dialog.isVisible(), false);
  await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll("textarea")].some(el => el.value === "Read question two"));
  assert.equal(await page.getByLabel("When I return…").inputValue(), "Read question two");
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).phase, key), "paused");
  await page.getByRole("button", { name: "Return to this step" }).click();
  await dialog.getByRole("button", { name: "Resume", exact: true }).click();
  await dialog.getByRole("button", { name: "Finish early", exact: true }).click();
  await dialog.getByRole("button", { name: "Action done", exact: true }).click();
  assert.equal(await page.getByLabel("One action I can do now").inputValue(), "Read the first question");
  await page.reload();
  const logs = await page.evaluate(() => JSON.parse(localStorage.getItem("levelup-focus-sessions-v1")));
  assert.equal(logs.filter(l => l.id.startsWith("smallsteps_")).length, 1); checks += 8;
  for (const theme of ["light", "dark", "deepwork", "cyberpunk"]) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; localStorage.setItem("levelup-theme", theme); }, theme);
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.getByRole("button", { name: "Start this step", exact: true }).click();
      assert.ok(await dialog.evaluate(el => el.scrollWidth <= innerWidth + 1));
      const controls = await dialog.getByRole("button").evaluateAll(els => els.filter(el => el.getClientRects().length).map(el => el.getBoundingClientRect().height));
      assert.ok(controls.every(h => h >= 44));
      await dialog.getByRole("button", { name: "Finish early", exact: true }).click();
      await dialog.getByRole("button", { name: "Another block", exact: true }).click();
      checks++;
    }
  }
  await page.evaluate(() => document.documentElement.dataset.theme = "light");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await mkdir(".next/small-steps-qa", { recursive: true });
  await page.screenshot({ path: ".next/small-steps-qa/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: ".next/small-steps-qa/mobile.png", fullPage: true });
  // Simulate a write quota failure without touching the user's browser state.
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k === "levelup-small-steps-v1") throw new DOMException("Quota", "QuotaExceededError"); return original.call(this, k, v); }; });
  await page.getByLabel("When I return…").fill("Unsaved recovery note");
  assert.ok(await page.getByRole("alert").filter({ hasText: "Changes are only in this tab" }).isVisible());
  const download = page.waitForEvent("download");
  await page.getByRole("alert").getByRole("button", { name: "Export recovery copy" }).click();
  assert.equal((await download).suggestedFilename(), "levelup-small-steps-recovery.json"); checks += 2;
  await page.reload();
  // Register explicitly: production registration intentionally skips localhost.
  await page.evaluate(async () => { await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: "networkidle" });
  await context.setOffline(true);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByRole("heading", { level: 1 }).innerText(), "Just the next thing.");
  assert.equal(await page.getByLabel("One action I can do now").inputValue(), "Read the first question"); checks += 2;
  await context.setOffline(false);
  // Both export surfaces carry the same optional chunk and reject corrupt imports.
  for (const [route, label] of [["backup", "Export full backup"], ["progress", "Export backup"]]) {
    await page.goto(`${base}/${route}/`);
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: label, exact: true }).click();
    const stream = await (await downloaded).createReadStream();
    const chunks = []; for await (const chunk of stream) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString());
    assert.equal(payload.smallSteps.task, "Start my homework");
    const previous = await page.evaluate(key => localStorage.getItem(key), key);
    await page.locator('input[type="file"]').setInputFiles({ name: "bad-backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ ...payload, smallSteps: { version: 1 } })) });
    await page.getByText("smallSteps has an invalid shape.", { exact: true }).waitFor();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), previous);
    payload.smallSteps.restart = "Restored from backup";
    await page.locator('input[type="file"]').setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(payload)) });
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).restart === "Restored from backup", key);
    checks += 3;
  }
  await context.close();
  assert.deepEqual(errors, []);
  console.log(`Small Steps: ${checks} browser checks passed; no page errors.`);
} finally { await browser.close(); }
