import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import manifest from "../app/manifest.ts";

const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const registration = readFileSync(new URL("../components/ServiceWorkerRegister.tsx", import.meta.url), "utf8");

test("PWA manifest opens the daily action loop in standalone mode", () => {
  const value = manifest();
  assert.equal(value.display, "standalone");
  assert.match(String(value.start_url), /\/today\/$/);
  assert.equal(value.theme_color, "#17201d");
  assert.ok(value.icons?.some((icon) => icon.sizes === "any"));
  assert.ok(value.shortcuts?.some((shortcut) => String(shortcut.url).endsWith("/focus/")));
});

test("service worker precaches every core LifeOS route including Nexus", () => {
  for (const route of ["today", "journey", "coach", "progress", "profile", "sync-lab"]) {
    assert.match(serviceWorker, new RegExp(`\\$\\{BASE\\}/${route}/`));
  }
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /caches\.match\(`\$\{BASE\}\/today\/`\)/);
});

test("service-worker registration and cache generation advance together", () => {
  const cacheVersion = serviceWorker.match(/CACHE_NAME = "levelup-v(\d+)"/)?.[1];
  const registrationVersion = registration.match(/sw\.js\?v=(\d+)/)?.[1];
  assert.ok(cacheVersion);
  assert.equal(registrationVersion, cacheVersion);
});

