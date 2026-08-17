import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");
const publicDataDir = join(root, "public", "data");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseChapter(file) {
  const raw = readFileSync(file, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`Bad frontmatter in ${file}`);
  const meta = parse(m[1]);
  const body = m[2].trim();
  if (!meta.slug || !meta.number || !meta.title || !meta.pillar) {
    throw new Error(`Incomplete frontmatter in ${file}`);
  }
  if (!["health", "wealth", "love", "self"].includes(meta.pillar)) {
    throw new Error(`Bad pillar '${meta.pillar}' in ${file}`);
  }
  const words = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6} .*$/gm, "")
    .split(/\s+/)
    .filter(Boolean).length;
  const sections = [...body.matchAll(/^## (\d+) — (.+)$/gm)].map((x) => ({
    num: parseInt(x[1], 10),
    title: x[2],
  }));
  const keyIdeas = body.includes("## Key Ideas");
  const applyToday = body.includes("## Apply Today");
  const theScience = body.includes("## The Science");
  const quotes = Array.isArray(meta.quotes) ? meta.quotes : [];
  const studies = Array.isArray(meta.studies) ? meta.studies.map((s) => ({ name: s.name, grade: s.grade })) : [];
  const protocols = Array.isArray(meta.protocols) ? meta.protocols : [];
  return {
    slug: meta.slug,
    number: meta.number,
    title: meta.title,
    pillar: meta.pillar,
    duration: String(meta.duration || ""),
    teaser: String(meta.teaser || ""),
    keyConcepts: Array.isArray(meta.keyConcepts) ? meta.keyConcepts : [],
    studies,
    protocols,
    quotes,
    body,
    stats: { words, sections, keyIdeas, applyToday, theScience },
  };
}

function seedDatabase(db, chapters, audit, protocols, glossary, quotes, roadmap) {
  db.exec(`DROP TABLE IF EXISTS chapters`);
  db.exec(`DROP TABLE IF EXISTS audit`);
  db.exec(`DROP TABLE IF EXISTS protocols`);
  db.exec(`DROP TABLE IF EXISTS glossary`);
  db.exec(`DROP TABLE IF EXISTS quotes`);
  db.exec(`DROP TABLE IF EXISTS roadmap`);
  db.exec(`CREATE TABLE chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE, number INTEGER, title TEXT, pillar TEXT, duration TEXT,
    teaser TEXT, body TEXT
  )`);
  db.exec(`CREATE TABLE audit (id TEXT PRIMARY KEY, category TEXT, claim TEXT, grade TEXT, verdict TEXT, detail TEXT, citation TEXT)`);
  db.exec(`CREATE TABLE protocols (num TEXT PRIMARY KEY, title TEXT, duration TEXT, purpose TEXT, steps TEXT, evidence TEXT)`);
  db.exec(`CREATE TABLE glossary (term TEXT PRIMARY KEY, definition TEXT)`);
  db.exec(`CREATE TABLE quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, source TEXT, chapter TEXT)`);
  db.exec(`CREATE TABLE roadmap (id INTEGER PRIMARY KEY AUTOINCREMENT, phase INTEGER, data TEXT)`);
  const ins = db.prepare(`INSERT INTO chapters (slug, number, title, pillar, duration, teaser, body) VALUES (?,?,?,?,?,?,?)`);
  for (const c of chapters) ins.run(c.slug, c.number, c.title, c.pillar, c.duration, c.teaser, c.body);
  const ia = db.prepare(`INSERT INTO audit (id, category, claim, grade, verdict, detail, citation) VALUES (?,?,?,?,?,?,?)`);
  for (const a of audit) ia.run(a.id, a.category, a.claim, a.grade, a.verdict, a.detail, a.citation);
  const ip = db.prepare(`INSERT INTO protocols (num, title, duration, purpose, steps, evidence) VALUES (?,?,?,?,?,?)`);
  for (const p of protocols) ip.run(p.num, p.title, p.duration || "", p.purpose, JSON.stringify(p.steps), JSON.stringify(p.evidence));
  const ig = db.prepare(`INSERT INTO glossary (term, definition) VALUES (?,?)`);
  for (const g of glossary) ig.run(g.term, g.definition);
  const iq = db.prepare(`INSERT INTO quotes (text, source, chapter) VALUES (?,?,?)`);
  for (const q of quotes) iq.run(q.text, q.source, q.chapter || "");
  const ir = db.prepare(`INSERT INTO roadmap (phase, data) VALUES (?,?)`);
  roadmap.phases.forEach((p, i) => ir.run(i + 1, JSON.stringify(p)));
  return {
    chapterCount: db.prepare(`SELECT COUNT(*) n FROM chapters`).get().n,
    auditCount: db.prepare(`SELECT COUNT(*) n FROM audit`).get().n,
    protocolCount: db.prepare(`SELECT COUNT(*) n FROM protocols`).get().n,
    glossaryCount: db.prepare(`SELECT COUNT(*) n FROM glossary`).get().n,
    quoteCount: db.prepare(`SELECT COUNT(*) n FROM quotes`).get().n,
  };
}

function emitJson(db, parsedChapters, quizzes) {
  mkdirSync(publicDataDir, { recursive: true });
  const chapters = parsedChapters.map((c) => ({ ...c })).sort((a, b) => a.number - b.number);
  const audit = db.prepare(`SELECT id, category, claim, grade, verdict, detail, citation FROM audit ORDER BY id`).all();
  const protocols = db.prepare(`SELECT num, title, duration, purpose, steps, evidence FROM protocols ORDER BY num`).all().map((p) => ({ ...p, steps: JSON.parse(p.steps), evidence: JSON.parse(p.evidence) }));
  const glossary = db.prepare(`SELECT term, definition FROM glossary ORDER BY term`).all();
  const quotes = db.prepare(`SELECT text, source, chapter FROM quotes`).all();
  const roadmap = { phases: db.prepare(`SELECT data FROM roadmap ORDER BY phase`).all().map((r) => JSON.parse(r.data)), rules: roadmapJson.rules };
  writeFileSync(join(publicDataDir, "site.json"), JSON.stringify({ chapters, audit, protocols, glossary, quotes, quizzes, roadmap }));
  writeFileSync(join(publicDataDir, "quizzes.json"), JSON.stringify(quizzes));
  for (const c of chapters) {
    writeFileSync(join(publicDataDir, `chapter-${c.slug}.json`), JSON.stringify(c));
  }
  return { chapters: chapters.length, audit: audit.length, protocols: protocols.length, glossary: glossary.length, quotes: quotes.length, quizzes: quizzes.length };
}

function buildSearchIndex(chapters, audit, protocols, glossary, quotes) {
  const docs = [];
  for (const c of chapters) {
    docs.push({ id: `ch:${c.slug}`, type: "Chapter", title: c.title, sub: `Chapter ${c.number} · ${c.pillar}`, teaser: c.teaser, url: `/chapters/${c.slug}/`, text: `${c.title}. ${c.body}` });
  }
  for (const a of audit) {
    docs.push({ id: `au:${a.id}`, type: "Verification claim", title: `Claim ${a.id} — ${a.claim.slice(0, 80)}`, sub: a.grade, teaser: a.verdict, url: `/audit/#claim-${a.id.replace(".", "-")}`, text: `${a.claim}. ${a.detail}. ${a.verdict}. ${a.citation}` });
  }
  for (const p of protocols) {
    docs.push({ id: `pr:${p.num}`, type: "Protocol", title: `${p.num} — ${p.title}`, sub: p.purpose, teaser: p.purpose, url: `/protocols/#protocol-${p.num.replace(".", "-")}`, text: `${p.title}. ${p.purpose}. ${p.steps.join(" ")}` });
  }
  for (const g of glossary) {
    docs.push({ id: `gl:${g.term}`, type: "Glossary", title: g.term, sub: "Glossary term", teaser: g.definition, url: `/glossary/#term-${encodeURIComponent(g.term.toLowerCase().replace(/\W+/g, "-"))}`, text: `${g.term}. ${g.definition}` });
  }
  for (const q of quotes) {
    docs.push({ id: `qt:${docs.length}`, type: "Quote", title: q.text.slice(0, 90), sub: q.source, teaser: q.text, url: q.chapter && q.chapter !== "" ? `/quotes/` : `/quotes/`, text: `${q.text}. ${q.source}. ${q.chapter || ""}` });
  }
  mkdirSync(publicDataDir, { recursive: true });
  writeFileSync(join(publicDataDir, "search-index.json"), JSON.stringify(docs));
  return docs.length;
}

function pickDistractors(pool, correct, count) {
  const uniq = [...new Set(pool.filter((x) => x !== correct))];
  const out = [];
  for (let i = 0; i < uniq.length && out.length < count; i++) {
    if (uniq[i] && !out.includes(uniq[i])) out.push(uniq[i]);
  }
  return out;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuizzes(chapters) {
  const allConcepts = chapters.flatMap((c) => c.keyConcepts);
  const allProtocols = [...new Set(chapters.flatMap((c) => c.protocols))];
  const grades = ["A", "B", "C", "D", "U"];
  return chapters
    .sort((a, b) => a.number - b.number)
    .map((c) => {
      const questions = [];
      const concept = c.keyConcepts[0];
      if (concept) {
        const distractors = pickDistractors(allConcepts, concept, 3);
        if (distractors.length >= 3) {
          questions.push({
            q: "Which of these is a key concept of this chapter?",
            options: shuffle([
              { t: concept, correct: true },
              ...distractors.map((d) => ({ t: d, correct: false })),
            ]),
            explanation: `"${concept}" is listed in this chapter's key concepts.`,
          });
        }
      }
      const study = c.studies[0];
      if (study) {
        const primary = study.grade.toUpperCase().trim().split(" ")[0].split("/")[0][0] || "U";
        const distractors = pickDistractors(grades, primary, 3);
        if (distractors.length >= 3) {
          questions.push({
            q: `What evidence grade does "${study.name}" receive in this chapter?`,
            options: shuffle([
              { t: primary, correct: true },
              ...distractors.map((d) => ({ t: d, correct: false })),
            ]),
            explanation: `The evidence review grades ${study.name} ${study.grade}.`,
          });
        }
      }
      const protocol = c.protocols[0];
      if (protocol) {
        const distractors = pickDistractors(allProtocols, protocol, 3);
        if (distractors.length >= 3) {
          questions.push({
            q: "Which protocol belongs to this chapter?",
            options: shuffle([
              { t: protocol, correct: true },
              ...distractors.map((d) => ({ t: d, correct: false })),
            ]),
            explanation: `This chapter references the protocol "${protocol}".`,
          });
        }
      }
      return {
        slug: c.slug,
        title: c.title,
        questions,
        reflection: "Choose one idea from this chapter and try it today. What will you do, and what input will you log?",
      };
    });
}

const chaptersDir = join(contentDir, "chapters");
const chapters = readdirSync(chaptersDir)
  .filter((f) => f.endsWith(".md"))
  .sort()
  .map((f) => parseChapter(join(chaptersDir, f)));

const missing = [];
const slugs = new Set();
for (const c of chapters) {
  if (slugs.has(c.slug)) missing.push(`duplicate slug: ${c.slug}`);
  slugs.add(c.slug);
  if (!c.stats.keyIdeas || !c.stats.applyToday || !c.stats.theScience) missing.push(`${c.slug}: missing required section`);
  if (c.stats.words < 400) missing.push(`${c.slug}: suspiciously short (${c.stats.words} words)`);
  if (c.stats.sections.length === 0) missing.push(`${c.slug}: no numbered sections`);
}
if (missing.length) {
  console.error("Content problems:\n" + missing.join("\n"));
  process.exit(1);
}

const audit = readJson(join(contentDir, "audit.json"));
const protocolsJson = readJson(join(contentDir, "protocols.json"));
const glossary = readJson(join(contentDir, "glossary.json"));
const quotesJson = readJson(join(contentDir, "quotes.json"));
const roadmapJson = readJson(join(contentDir, "roadmap.json"));

const uniqueNumbers = chapters.map((c) => c.number);
if (new Set(uniqueNumbers).size !== chapters.length) {
  console.error("Duplicate chapter numbers");
  process.exit(1);
}

const dbPath = join(root, "data", "levelup.db");
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
const counts = seedDatabase(db, chapters, audit, protocolsJson, glossary, quotesJson, roadmapJson);
console.log("Seeded SQLite:", counts);
const emitted = emitJson(db, chapters, buildQuizzes(chapters));
console.log("Emitted JSON:", emitted);
const idx = buildSearchIndex(chapters, audit, protocolsJson, glossary, quotesJson);
console.log("Search index docs:", idx);
if (existsSync(dbPath)) console.log("DB file:", dbPath);