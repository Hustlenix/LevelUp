import { test } from "node:test";
import assert from "node:assert/strict";
import { withPublicBasePath } from "../lib/sitePaths.ts";

test("public asset paths include the static export base path exactly once", () => {
  assert.equal(withPublicBasePath("/devlog/before-home.png", "/LevelUp"), "/LevelUp/devlog/before-home.png");
  assert.equal(withPublicBasePath("/LevelUp/devlog/before-home.png", "/LevelUp"), "/LevelUp/devlog/before-home.png");
  assert.equal(withPublicBasePath("https://example.com/a.png", "/LevelUp"), "https://example.com/a.png");
});
