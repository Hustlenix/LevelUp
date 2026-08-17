import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { normalize, findTextMatch, prefixCandidates } from "../lib/highlights.ts";
import { buildBackup, validateBackup, BACKUP_SCHEMA } from "../lib/backup.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function readChapters() {
  const dir = join(root, "content", "chapters");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = readFileSync(join(dir, f), "utf8");
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      return parse(m[1]);
    })
    .sort((a, b) => a.number - b.number);
}

function primaryGrade(grade) {
  return grade.toUpperCase().trim().split(" ")[0].split("/")[0][0] || "U";
}

test("quizzes.json covers every chapter with answers from real data", () => {
  const quizzes = readJson("public/data/quizzes.json");
  const chapters = readChapters();
  assert.equal(quizzes.length, 28, "one quiz per chapter");
  const bySlug = new Map(chapters.map((c) => [c.slug, c]));

  for (const quiz of quizzes) {
    const chapter = bySlug.get(quiz.slug);
    assert.ok(chapter, `quiz for real chapter ${quiz.slug}`);
    assert.ok(quiz.title, `${quiz.slug}: title`);
    assert.ok(quiz.questions.length >= 2, `${quiz.slug}: at least 2 questions`);
    assert.ok(quiz.reflection && quiz.reflection.length > 20, `${quiz.slug}: reflection prompt`);

    for (const q of quiz.questions) {
      assert.equal(q.options.length, 4, `${quiz.slug}: 4 options for "${q.q}"`);
      assert.equal(
        q.options.filter((o) => o.correct).length,
        1,
        `${quiz.slug}: exactly one correct option`
      );
      const correct = q.options.find((o) => o.correct).t;
      if (q.q.includes("key concept")) {
        assert.ok(chapter.keyConcepts.includes(correct), `${quiz.slug}: concept answer is real`);
        assert.ok(chapter.keyConcepts.length >= 4, `${quiz.slug}: enough concepts to draw from`);
      } else if (q.q.includes("evidence grade")) {
        const study = chapter.studies[0];
        assert.ok(study, `${quiz.slug}: grade question needs a study`);
        assert.equal(correct, primaryGrade(study.grade), `${quiz.slug}: grade answer matches study`);
      } else if (q.q.includes("protocol")) {
        assert.ok(chapter.protocols.includes(correct), `${quiz.slug}: protocol answer is real`);
      } else {
        assert.fail(`${quiz.slug}: unrecognized question "${q.q}"`);
      }
      assert.ok(q.options.every((o) => typeof o.t === "string" && o.t.length > 0), `${quiz.slug}: non-empty options`);
    }
  }
});

test("highlight helpers normalize and locate text", () => {
  assert.equal(normalize("The  quick   brown\nfox"), "The quick brown fox");
  assert.equal(normalize(""), "");
  const html = "<p>The  quick\nbrown fox jumps.</p>";
  const m = findTextMatch(html, "quick brown");
  assert.ok(m, "match found");
  assert.equal(normalize(html).slice(m.start, m.end), "quick brown", "match spans normalized text");
  assert.equal(findTextMatch(html, "zebra"), null, "no match returns null");
  assert.equal(findTextMatch(html, ""), null, "empty needle returns null");
});

test("highlight prefix candidates produce shorter fallbacks", () => {
  const c = prefixCandidates("The quick brown fox jumps over the lazy dog", [10, 6, 3]);
  assert.deepEqual(c, ["The quick brown fox jumps over", "The quick brown"], "shorter prefixes returned in order");
  assert.equal(prefixCandidates("Short text", [10]).length, 0, "no candidates when nothing is shorter");
  const norm = prefixCandidates("A  B  C  D", [2, 1]);
  assert.ok(norm.includes("A B"), "candidates are normalized");
});

test("backup round-trips through validate", () => {
  const fixture = {
    theme: "dark",
    readerScale: "1.15",
    progress: { "power-of-delusion": { complete: true, maxScroll: 95, updatedAt: 1750000000000 } },
    bookmarks: ["god-mode"],
    highlights: [{ id: "h1", slug: "god-mode", text: "Deep work wins", color: "gold", ts: 1750000000000 }],
    quiz: { "god-mode": { score: 3, total: 3, ts: 1750000000000 } },
    reflections: { "god-mode": "Try the one-hour rule today." },
    streak: { current: 2, best: 5, last: "2026-08-15" },
  };
  const backup = buildBackup(fixture);
  assert.equal(backup.schema, BACKUP_SCHEMA);
  assert.ok(typeof backup.exportedAt === "string");
  const res = validateBackup(JSON.parse(JSON.stringify(backup)));
  assert.equal(res.ok, true, JSON.stringify(res.errors));
  assert.deepEqual(res.data, fixture);
});

test("backup rejects malformed input", () => {
  assert.equal(validateBackup("nope").ok, false, "non-object rejected");
  assert.equal(validateBackup({ schema: 99 }).ok, false, "wrong schema rejected");
  const base = {
    schema: 1,
    theme: null,
    readerScale: null,
    progress: {},
    bookmarks: [],
    highlights: [],
    quiz: {},
    reflections: {},
    streak: null,
  };
  const cases = [
    { ...base, theme: "blue" },
    { ...base, progress: { s: { complete: "yes", maxScroll: 1, updatedAt: 1 } } },
    { ...base, bookmarks: [1] },
    { ...base, highlights: [{ slug: "x" }] },
    { ...base, quiz: { s: { score: "3", total: 3, ts: 1 } } },
    { ...base, reflections: { s: 7 } },
    { ...base, streak: { current: "2", best: 2, last: "x" } },
    { ...base, readerScale: "2" },
  ];
  for (const c of cases) {
    const res = validateBackup(c);
    assert.equal(res.ok, false, `rejected: ${JSON.stringify(c)}`);
    assert.ok(res.errors.length > 0, `has error message`);
  }
  const good = validateBackup({ ...base, readerScale: "0.85", theme: "deepwork" });
  assert.equal(good.ok, true, "valid scales accepted");
});
