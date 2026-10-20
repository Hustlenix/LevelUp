import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3113";
const screenshots = process.argv[3];
if (screenshots) await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ timezoneId: "Asia/Kolkata", reducedMotion: "reduce" });
const page = await context.newPage();
await page.clock.install({ time: new Date("2026-10-01T06:30:00Z") });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const key = "levelup-habits-v1";
const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const go = path => page.goto(base + path, { waitUntil: "networkidle" });
const ritual = () => page.locator("#daily-ritual");
const row = name => ritual().locator("li").filter({ has: page.getByRole("heading", { name, exact: true }) });
try {
  await go("/today/");
  await ritual().getByRole("button", { name: "Start with the starter set" }).click();
  assert.equal((await read()).habits.length, 5);
  const names = (await read()).habits.map(h => h.name);
  const focus = row(names[0]);
  await focus.getByRole("spinbutton").fill("10");
  await focus.getByRole("button", { name: "Confirm", exact: true }).click();
  await focus.getByText(/Partly done/).waitFor();
  assert.equal((await read()).log[(await read()).habits[0].id]["2026-10-01"].value, 10);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await focus.getByRole("spinbutton").inputValue(), "10");
  await focus.getByRole("spinbutton").fill("-1");
  await focus.getByRole("button", { name: "Confirm", exact: true }).click();
  await focus.getByRole("alert").waitFor();
  assert.equal((await read()).log[(await read()).habits[0].id]["2026-10-01"].value, 10);
  await focus.getByRole("spinbutton").fill("25");
  await focus.getByRole("button", { name: "Confirm", exact: true }).click();
  await focus.getByText(/Done ·/).waitFor();
  await focus.getByRole("spinbutton").fill("0");
  await focus.getByRole("button", { name: "Confirm", exact: true }).click();
  await focus.getByText(/Not logged/).waitFor();
  await row(names[1]).getByRole("button", { name: `Complete ${names[1]}`, exact: true }).click();
  await row(names[1]).getByRole("button", { name: `Undo ${names[1]}`, exact: true }).click();
  await row(names[1]).getByRole("button", { name: `Skip ${names[1]}`, exact: true }).click();
  await row(names[1]).getByRole("button", { name: `Undo skip for ${names[1]}`, exact: true }).click();

  // Real activity can suggest a value, but must not create a habit log.
  await page.evaluate(() => localStorage.setItem("levelup-focus-sessions-v1", JSON.stringify([{ id: "evidence", date: "2026-10-01", taskName: "Read", durationMinutes: 25, completedSeconds: 900, distractions: [], oneLineWin: "Read", completedAt: Date.now() }])));
  await page.reload({ waitUntil: "networkidle" });
  await focus.getByRole("button", { name: "Use 15 min", exact: true }).click();
  assert.equal(await focus.getByRole("spinbutton").inputValue(), "15");
  assert.equal((await read()).log[(await read()).habits[0].id]?.["2026-10-01"], undefined);
  await focus.getByRole("button", { name: "Confirm", exact: true }).click();

  await ritual().getByRole("link", { name: "Edit ritual" }).click();
  await page.getByRole("heading", { name: "Your habits", exact: true }).waitFor();
  const originalLog = (await read()).log;
  const focusCard = page.locator("section.rounded-xl").filter({ has: page.getByRole("heading", { name: names[0], exact: true }) });
  await focusCard.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  assert.deepEqual((await read()).log, originalLog, "editing preserves existing logs");
  await page.getByRole("cell", { name: /15 of 25 min, partly done/ }).waitFor();
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  const form = page.locator("form");
  await form.getByRole("button", { name: "Add habit", exact: true }).click();
  await page.getByText(/Give the habit a name/).waitFor();
  await form.getByRole("textbox", { name: "Name", exact: true }).fill("Evening walk");
  await form.getByRole("button", { name: "Add habit", exact: true }).click();
  const cards = () => page.locator("section.rounded-xl").filter({ has: page.getByRole("heading", { name: "Evening walk", exact: true }) });
  await cards().getByRole("button", { name: "Edit", exact: true }).click();
  await page.locator("form").getByRole("textbox", { name: "Name", exact: true }).fill("Evening stretch");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  const stretch = page.locator("section.rounded-xl").filter({ has: page.getByRole("heading", { name: "Evening stretch", exact: true }) });
  await stretch.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await stretch.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: "Delete forever", exact: true }).click();
  await page.getByRole("button", { name: "Keep it", exact: true }).click();
  assert.equal((await read()).habits.length, 6);
  await page.getByRole("button", { name: "Delete forever", exact: true }).click();
  await page.getByRole("button", { name: "Yes, delete forever", exact: true }).click();
  assert.equal((await read()).habits.length, 5);

  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => { localStorage.setItem("levelup-theme", theme); document.documentElement.setAttribute("data-theme", theme); }, theme);
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/habits/", "/today/"]) {
        await go(path);
        await page.getByRole("heading", { name: path === "/habits/" ? "Your habits" : "Daily ritual", exact: true }).waitFor();
        const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, elements: [...document.querySelectorAll("main *")].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })) }));
        assert.ok(overflow.width <= width + 1, `${path} ${theme} ${width} overflow: ${JSON.stringify(overflow)}`);
        if (screenshots && [375, 1440].includes(width)) await page.screenshot({ path: join(screenshots, `habits-${path.includes("today") ? "ritual" : "manager"}-${theme}-${width}.png`), fullPage: true });
      }
    }
  }
  const peer = await context.newPage();
  await peer.clock.setFixedTime(new Date("2026-10-01T06:30:00Z"));
  await peer.goto(base + "/today/", { waitUntil: "networkidle" });
  const peerFocus = peer.locator("#daily-ritual li").filter({ has: peer.getByRole("heading", { name: names[0], exact: true }) });
  await peerFocus.getByRole("spinbutton").fill("20");
  await peerFocus.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#daily-ritual input")?.value === "20");
  await peer.close();
  const expected = await read();
  await go("/backup/");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export full backup", exact: true }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.deepEqual(backup.habits, expected);
  const upload = value => page.locator('input[type="file"]').setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) });
  await upload(backup);
  await page.getByText(/Backup imported safely/).waitFor();
  assert.deepEqual(await read(), expected);
  await upload({ ...backup, habits: { ...expected, habits: expected.habits.map(h => ({ ...h, archived: true })) } });
  await go("/today/");
  await ritual().getByText(/Nothing scheduled today/).waitFor();
  await go("/backup/");
  const legacy = { ...backup };
  delete legacy.habits;
  await upload(legacy);
  await go("/habits/");
  await page.getByRole("heading", { name: "Build your first habit", exact: true }).waitFor();
  assert.equal((await read()).habits.length, 0);
  await go("/today/");
  await ritual().getByRole("button", { name: "Start with the starter set" }).click();
  await page.clock.setSystemTime(new Date("2026-10-03T06:30:00Z"));
  await page.clock.fastForward(60_001);
  await ritual().getByText("0 / 4 done", { exact: true }).waitFor();

  // Quota failure is visible and the unsaved in-memory habits remain exportable.
  const quotaContext = await browser.newContext({ timezoneId: "Asia/Kolkata" });
  await quotaContext.addInitScript(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "levelup-habits-v1") throw new DOMException("Storage is full", "QuotaExceededError");
      return write.call(this, key, value);
    };
  });
  const quotaPage = await quotaContext.newPage();
  quotaPage.on("pageerror", error => errors.push(error.message));
  await quotaPage.goto(base + "/today/", { waitUntil: "networkidle" });
  await quotaPage.locator("#daily-ritual").getByRole("button", { name: "Start with the starter set" }).click();
  await quotaPage.getByText(/could not be saved to this browser/).waitFor();
  await quotaPage.getByRole("link", { name: "Export a backup", exact: false }).click();
  const quotaDownloadPromise = quotaPage.waitForEvent("download");
  await quotaPage.getByRole("button", { name: "Export full backup", exact: true }).click();
  const quotaDownload = await quotaDownloadPromise;
  assert.equal(JSON.parse(await readFile(await quotaDownload.path(), "utf8")).habits.habits.length, 5);
  await quotaContext.close();
  assert.deepEqual(errors, []);
  console.log("PASS: ritual logging/reload, validation, optional evidence, manager CRUD, backup round-trip/legacy reset, cross-tab sync, date rollover, quota warning/recovery export, and 16 responsive/theme checks.");
} finally { await browser.close(); }
