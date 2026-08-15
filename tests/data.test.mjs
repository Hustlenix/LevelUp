import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function gradeParts(grade) {
  return grade.split("/").map((p) => p.trim().split(" ")[0].toUpperCase());
}

test("28 chapters exist with valid frontmatter", () => {
  const dir = join(root, "content", "chapters");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  assert.equal(files.length, 28, "exactly 28 chapter files");

  const slugs = new Set();
  const numbers = new Set();
  const pillars = ["health", "wealth", "love", "self"];

  for (const f of files) {
    const raw = readFileSync(join(dir, f), "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    assert.ok(m, `${f} has frontmatter + body`);
    const meta = parse(m[1]);
    const body = m[2].trim();

    assert.ok(meta.slug, `${f}: slug`);
    assert.ok(!slugs.has(meta.slug), `${f}: unique slug`);
    slugs.add(meta.slug);
    assert.ok(Number.isInteger(meta.number) && meta.number >= 1 && meta.number <= 28, `${f}: number 1..28`);
    assert.ok(!numbers.has(meta.number), `${f}: unique number`);
    numbers.add(meta.number);
    assert.ok(pillars.includes(meta.pillar), `${f}: valid pillar`);
    assert.ok(meta.title && meta.title.length > 3, `${f}: title`);
    assert.ok(Array.isArray(meta.keyConcepts) && meta.keyConcepts.length > 0, `${f}: keyConcepts`);
    assert.ok(Array.isArray(meta.studies), `${f}: studies array`);
    for (const s of meta.studies) {
      assert.ok(s.name && s.grade, `${f}: study has name+grade`);
      for (const g of gradeParts(s.grade)) {
        assert.ok(["A", "B", "C", "D", "U"].includes(g), `${f}: grade part ${g}`);
      }
    }
    assert.ok(Array.isArray(meta.protocols), `${f}: protocols array`);
    assert.ok(Array.isArray(meta.quotes), `${f}: quotes array`);

    const words = body.split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 400, `${f}: at least 400 words (got ${words})`);
    assert.ok(body.includes("## Key Ideas"), `${f}: Key Ideas section`);
    assert.ok(body.includes("## Apply Today"), `${f}: Apply Today section`);
    assert.ok(body.includes("## The Science"), `${f}: The Science section`);
  }
});

test("audit.json has 30 claims with valid grades", () => {
  const audit = readJson("content/audit.json");
  assert.equal(audit.length, 30);
  for (const a of audit) {
    assert.ok(a.id.match(/^3\.\d+$/), `id ${a.id}`);
    assert.ok(a.claim.length > 10, `claim text ${a.id}`);
    for (const g of gradeParts(a.grade)) {
      assert.ok(["A", "B", "C", "D", "U"].includes(g), `grade part ${g} (${a.id})`);
    }
    assert.ok(a.verdict && a.detail, `verdict+detail ${a.id}`);
  }
});

test("glossary.json is well-formed with unique terms", () => {
  const g = readJson("content/glossary.json");
  assert.ok(g.length >= 50, `at least 50 terms (got ${g.length})`);
  const terms = new Set();
  for (const t of g) {
    assert.ok(t.term && t.definition, `term+definition for ${t.term}`);
    assert.ok(!("description" in t), `no stray description key for ${t.term}`);
    assert.ok(!terms.has(t.term), `unique term ${t.term}`);
    terms.add(t.term);
  }
});

test("quotes.json has 40+ quotes with sources", () => {
  const q = readJson("content/quotes.json");
  assert.ok(q.length >= 40, `at least 40 quotes (got ${q.length})`);
  for (const item of q) {
    assert.ok(item.text && item.source, `text+source for ${item.source}`);
  }
});

test("protocols.json has 13 protocols with steps", () => {
  const p = readJson("content/protocols.json");
  assert.equal(p.length, 13);
  const nums = new Set();
  for (const proto of p) {
    assert.ok(proto.num.match(/^2\.\d+$/), `num ${proto.num}`);
    assert.ok(!nums.has(proto.num), `unique num ${proto.num}`);
    nums.add(proto.num);
    assert.ok(proto.title && proto.purpose, `title+purpose ${proto.num}`);
    assert.ok(Array.isArray(proto.steps) && proto.steps.length > 0, `steps ${proto.num}`);
    assert.ok(Array.isArray(proto.evidence) && proto.evidence.length > 0, `evidence ${proto.num}`);
  }
});

test("roadmap.json has 3 phases and rules", () => {
  const r = readJson("content/roadmap.json");
  assert.equal(r.phases.length, 3);
  for (const phase of r.phases) {
    assert.ok(phase.title && phase.days && phase.focus, `phase ${phase.phase}`);
    assert.ok(Array.isArray(phase.items) && phase.items.length >= 3, `phase items ${phase.phase}`);
    assert.ok(phase.milestone, `milestone ${phase.phase}`);
  }
  assert.ok(Array.isArray(r.rules) && r.rules.length > 0);
});

test("emitted site.json matches content sources", () => {
  const site = readJson("public/data/site.json");
  assert.equal(site.chapters.length, 28);
  assert.equal(site.audit.length, 30);
  assert.equal(site.protocols.length, 13);
  assert.equal(site.glossary.length, readJson("content/glossary.json").length);
  assert.equal(site.quotes.length, readJson("content/quotes.json").length);
  for (const c of site.chapters) {
    assert.ok(c.body && c.body.length > 1000, `${c.slug}: body`);
    assert.ok(Array.isArray(c.keyConcepts) && c.keyConcepts.length > 0, `${c.slug}: keyConcepts emitted`);
    assert.ok(c.stats && c.stats.words > 0, `${c.slug}: stats emitted`);
  }
});

test("search index covers chapters, audit, protocols, glossary, quotes", () => {
  const idx = readJson("public/data/search-index.json");
  assert.ok(idx.length > 150, `index has ${idx.length} docs`);
  const types = new Set(idx.map((d) => d.type));
  for (const t of ["Chapter", "Verification claim", "Protocol", "Glossary", "Quote"]) {
    assert.ok(types.has(t), `index contains ${t}`);
  }
});