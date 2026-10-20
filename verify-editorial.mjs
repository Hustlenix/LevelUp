import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3113";
const output = process.argv[3];
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const routes = ["/manual/", "/progress/", "/today/", "/chapters/", "/habits/", "/settings/"];
let checks = 0;
function luminance(hex) {
  const channels = hex.replace("#", "").match(/../g).map(value => {
    const c = parseInt(value, 16) / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
try {
  for (const theme of ["light", "dark", "deepwork", "cyberpunk"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript(theme => localStorage.setItem("levelup-theme", theme), theme);
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of routes) {
        const response = await page.goto(base + path, { waitUntil: "networkidle" });
        assert.equal(response.status(), 200);
        assert.equal(await page.locator("main h1").count(), 1);
        const style = await page.evaluate(() => {
          const root = getComputedStyle(document.documentElement);
          return { theme: document.documentElement.dataset.theme, saved: localStorage.getItem("levelup-theme"), width: document.documentElement.scrollWidth, paper: root.getPropertyValue("--color-paper").trim(), ink: root.getPropertyValue("--color-ink").trim(), faint: root.getPropertyValue("--color-ink-faint").trim(), accent: root.getPropertyValue("--color-gold").trim(), font: getComputedStyle(document.querySelector("main h1")).fontFamily };
        });
        assert.equal(style.theme, theme);
        assert.equal(style.saved, theme, "saved theme choice is preserved");
        assert.ok(style.width <= width + 1, `${path} ${theme} ${width} overflow`);
        assert.match(style.font, /source|serif|Georgia/i);
        for (const token of ["ink", "faint", "accent"]) assert.ok(contrast(style[token], style.paper) >= 4.5, `${theme} ${token} contrast`);
        if (theme === "light") assert.equal(style.accent, "#795b1e");
        if (theme === "dark") assert.equal(style.paper, "#181818");
        if (path === "/progress/") {
          await page.locator("summary").filter({ hasText: "Reading, focus, and workspace record" }).click();
          const milestones = page.locator("details").filter({ has: page.locator(":scope > summary").filter({ hasText: /^Milestones$/ }) });
          assert.equal(await milestones.getAttribute("open"), null);
          await milestones.locator("summary").click();
          const ledger = page.locator("details").filter({ has: page.locator(":scope > summary").filter({ hasText: "Chapter record" }) });
          await ledger.locator("summary").click();
          assert.equal(await ledger.getByRole("button", { name: "Mark read", exact: true }).count(), 28);
          await ledger.getByRole("button", { name: "Mark read", exact: true }).first().click();
          assert.equal(await ledger.getByRole("button", { name: "✓ Read", exact: true }).count(), 1);
          await ledger.getByRole("button", { name: "✓ Read", exact: true }).click();
          await ledger.locator("summary").click();
          assert.equal(await milestones.locator("div.grid").isVisible(), true);
          assert.notEqual(await milestones.getAttribute("open"), null);
          await milestones.locator("summary").click();
        }
        if (output && ["light", "dark"].includes(theme) && [375, 1440].includes(width) && ["/", "/progress/", "/today/"].includes(path)) {
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
          await page.screenshot({ path: join(output, `editorial-${path === "/" ? "home" : path.replaceAll("/", "")}-${theme}-${width}.png`), fullPage: true });
        }
        checks++;
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: ${checks} editorial route/theme/width checks; serif headings, saved theme choices, readable text-token contrast, and expandable milestones.`);
} finally { await browser.close(); }
