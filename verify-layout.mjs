import { chromium } from "playwright";

const url = "http://localhost:3111";
const browser = await chromium.launch();
const out = [];

async function audit(path, viewport, name, theme) {
  const page = await browser.newPage({ viewport });
  await page.goto(url + path, { waitUntil: "networkidle" });
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const issues = [];
    // 1. horizontal overflow
    if (doc.scrollWidth > doc.clientWidth + 1) {
      issues.push(`H-OVERFLOW: scrollWidth=${doc.scrollWidth} clientWidth=${doc.clientWidth} (right ${doc.scrollWidth - doc.clientWidth}px cut off)`);
    }
    // 2. empty links / broken images
    document.querySelectorAll("a").forEach((a) => {
      if (!a.href || a.href.endsWith("#")) issues.push(`EMPTY-LINK: ${a.textContent.trim().slice(0, 30)}`);
    });
    document.querySelectorAll("img").forEach((i) => {
      if (!i.complete || i.naturalWidth === 0) issues.push(`BROKEN-IMG: ${i.src.slice(-60)}`);
    });
    // 3. duplicate ids
    const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dup.length) issues.push(`DUP-IDS: ${[...new Set(dup)].join(",")}`);
    // 4. heading hierarchy (no skipped levels)
    const hs = [...document.querySelectorAll("h1,h2,h3,h4")];
    let prevLevel = 0;
    hs.forEach((h) => {
      const lvl = +h.tagName[1];
      if (prevLevel > 0 && lvl > prevLevel + 1) {
        issues.push(`heading-skip: h${prevLevel} -> ${h.tagName.toLowerCase()} "${h.textContent.trim().slice(0, 30)}"`);
      }
      prevLevel = lvl;
    });
    // 5. contrast on key text (WCAG: 4.5:1 normal, 3:1 large)
    function lum([r, g, b]) {
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    }
    function contrast(fg, bg) {
      const l1 = lum(fg), l2 = lum(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    function parse(c) {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? [+m[1], +m[2], +m[3]] : null;
    }
    function paperFallback() {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--color-paper").trim();
      const m = v.match(/#([0-9a-fA-F]{6})/);
      if (m) {
        const h = m[1];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }
      return [247, 242, 231];
    }
    // walk up to the nearest opaque background; transparent/translucent bg does not stop the walk
    function effectiveBg(el) {
      let n = el;
      while (n) {
        const bg = getComputedStyle(n).backgroundColor;
        const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m && (!m[4] || +m[4] >= 0.98)) return [+m[1], +m[2], +m[3]];
        n = n.parentElement;
      }
      return paperFallback();
    }
    function isLarge(el, cs) {
      const fs = parseFloat(cs.fontSize);
      const w = +cs.fontWeight;
      return fs >= 24 || (fs >= 18.66 && w >= 700);
    }
    const samples = [];
    ["nav a", "nav button", "main a", "main button", "footer a", "h1", "h2", "body p"].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return;
        const fg = parse(cs.color), bg = effectiveBg(el);
        if (fg && bg) {
          const cr = contrast(fg, bg);
          const min = isLarge(el, cs) ? 3 : 4.5;
          if (cr < min) {
            samples.push(`${sel} "${el.textContent.trim().slice(0, 24)}" contrast=${cr.toFixed(2)} (fg ${cs.color} on rgb(${bg.join(",")}))`);
          }
        }
      });
    });
    issues.push(...samples.map((s) => `LOW-CONTRAST: ${s}`));
    // 6. interactive targets (WCAG 2.5.8: 24x24 min; spacing exception when nearest center >= 24px)
    const targets = [...document.querySelectorAll("nav a, nav button, main a, main button, footer a")].map((el) => {
      const cs = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return { el, cs, b, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    });
    const infos = [];
    targets.forEach((t, i) => {
      if (!t.el.getClientRects().length || t.cs.display === "none" || t.cs.visibility === "hidden") return;
      if (t.b.width === 0 || t.b.height === 0) return;
      if (t.b.width >= 24 && t.b.height >= 24) return;
      let minDist = Infinity;
      targets.forEach((o, j) => {
        if (i === j) return;
        const d = Math.hypot(o.cx - t.cx, o.cy - t.cy);
        if (d < minDist) minDist = d;
      });
      const label = `"${t.el.textContent.trim().slice(0, 20)}" ${t.b.width.toFixed(0)}x${t.b.height.toFixed(0)}`;
      if (minDist < 24) issues.push(`TINY-TARGET: ${label} nearest-center ${minDist.toFixed(0)}px`);
      else infos.push(`target-ok-spacing: ${label} nearest-center ${minDist.toFixed(0)}px (spacing exception)`);
    });
    return {
      issues,
      infos,
      h1: (document.querySelector("h1")?.textContent.trim() || "(no h1)").slice(0, 60),
      hCount: hs.length,
      fonts: [...new Set(document.fonts ? [...document.fonts].map((f) => f.family) : [])],
    };
  });
  out.push({ name, path, theme, viewport: `${viewport.width}x${viewport.height}`, title: await page.title(), h1: r.h1, fontFamilies: r.fonts, issues: r.issues, infos: r.infos });
  await page.close();
}

const themes = ["light", "dark", "deepwork", "cyberpunk"];
for (const theme of themes) {
  await audit("/", { width: 1440, height: 900 }, "home-desktop", theme);
  await audit("/", { width: 375, height: 812 }, "home-mobile", theme);
  await audit("/dashboard/", { width: 1440, height: 900 }, "dashboard-desktop", theme);
  await audit("/dashboard/", { width: 375, height: 812 }, "dashboard-mobile", theme);
}

console.log(JSON.stringify(out, null, 2));
await browser.close();