import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultProfile } from "../lib/studentProfile.ts";
import {
  buildAiContext,
  contextToPromptData,
} from "../lib/ai/context.ts";
import {
  validateCoachRequest,
  validatePlannerRequest,
  validatePlannerResult,
  validateTutorRequest,
} from "../lib/ai/schemas.ts";
import {
  buildContentDocuments,
  retrieveLevelUpContent,
} from "../lib/ai/retrieval.ts";
import { createLocalProvider } from "../lib/ai/local-provider.ts";
import { createAiServices } from "../lib/ai/services.ts";

const profile = {
  ...defaultProfile(),
  onboarded: true,
  identity: { name: "Aarav", age: 16, grade: "10", board: "CBSE" },
  subjects: [
    { id: "math", name: "Math", isWeak: true },
    { id: "science", name: "Science", isWeak: false },
  ],
  exams: [{ id: "math-exam", subjectId: "math", date: "2026-09-20" }],
  schedule: { ...defaultProfile().schedule, preferredMinutesPerDay: 60 },
};

const siteData = {
  chapters: [
    {
      slug: "the-one-hour-law",
      number: 1,
      title: "The One-Hour Law",
      pillar: "self",
      duration: "12 min",
      teaser: "A bounded focus block turns intention into output.",
      keyConcepts: ["focus block", "minimum viable action"],
      studies: [{ name: "Focus study", grade: "B" }],
      protocols: ["2.6"],
      quotes: [],
      body: "## Key Ideas\nA focus block is a deliberately bounded period for one physical output.\n\n## Apply Today\nChoose one small deliverable and protect the first ten minutes.\n\n## The Science\nThe evidence is mixed, so treat this as a practical experiment.",
      stats: { words: 50, sections: [{ num: 1, title: "Core" }], keyIdeas: true, applyToday: true, theScience: true },
    },
    {
      slug: "consistency-and-procrastination",
      number: 2,
      title: "Consistency and Procrastination",
      pillar: "self",
      duration: "10 min",
      teaser: "Shrink the task until starting is easier than avoiding it.",
      keyConcepts: ["friction", "minimum action"],
      studies: [],
      protocols: ["2.4"],
      quotes: [],
      body: "## Key Ideas\nReduce the first action to a visible step.\n\n## Apply Today\nWrite the smallest next action.\n\n## The Science\nUse this as a LevelUp framework, not a universal law.",
      stats: { words: 45, sections: [{ num: 1, title: "Core" }], keyIdeas: true, applyToday: true, theScience: true },
    },
  ],
  audit: [],
  protocols: [{ num: "2.6", title: "Focus Sprint", duration: "25m", purpose: "Single-task focus", steps: ["Choose one output"], evidence: ["LevelUp protocol"] }],
  glossary: [],
  quotes: [],
  quizzes: [
    {
      slug: "the-one-hour-law",
      title: "The One-Hour Law",
      questions: [
        { q: "Which is a focus block?", options: [{ t: "A bounded period", correct: true }, { t: "Everything at once", correct: false }] },
      ],
      reflection: "What will you do today?",
    },
  ],
  roadmap: {
    phases: [{ phase: 1, title: "Foundation", days: "1–7", focus: "Start small", items: ["One block"], milestone: "First week" }],
    rules: ["Never miss twice"],
  },
};

function makeContext() {
  return buildAiContext({
    date: "2026-09-16",
    profile,
    progress: {
      "the-one-hour-law": { complete: true, maxScroll: 100, updatedAt: 1 },
    },
    quiz: { "the-one-hour-law": { score: 0, total: 1, ts: 1 } },
    highlights: [{ id: "h1", slug: "the-one-hour-law", text: "Bounded output", color: "gold", ts: 1 }],
    reflections: { "the-one-hour-law": "I need to start earlier." },
    streak: { current: 3, best: 5, last: "2026-09-16" },
    focusSessions: [{ id: "f1", date: "2026-09-16", taskName: "Math", durationMinutes: 25, completedSeconds: 1200, distractions: [], oneLineWin: "Started", completedAt: 1 }],
    pillars: {
      "2026-09-16": {
        date: "2026-09-16",
        health: { floor: "Walk", done: true },
        wealth: { floor: "Deep work", done: false },
        love: { floor: "Check in", done: false },
        self: { floor: "Read", done: true },
      },
    },
    siteData,
  });
}

test("AI request validators bound input and reject malformed values", () => {
  assert.equal(validatePlannerRequest({ date: "2026-09-16", availableMinutes: 0 }), null);
  assert.equal(validateCoachRequest({ question: " " }), null);
  assert.equal(validateTutorRequest({ chapterSlug: "javascript:alert(1)", mode: "explain", level: "normal" }), null);

  const planner = validatePlannerRequest({
    date: "2026-09-16",
    availableMinutes: 45,
    objective: "Review the weak area",
  });
  assert.deepEqual(planner, {
    date: "2026-09-16",
    availableMinutes: 45,
    objective: "Review the weak area",
  });
});

test("AI context is compact and reflects real local state", () => {
  const context = makeContext();
  assert.equal(context.progress.completedCount, 1);
  assert.equal(context.progress.totalChapters, 2);
  assert.equal(context.progress.completionPct, 50);
  assert.deepEqual(context.profile.weakSubjects, ["Math"]);
  assert.equal(context.behavior.streakCurrent, 3);
  assert.deepEqual(context.behavior.highlightedChapterSlugs, ["the-one-hour-law"]);
  assert.deepEqual(context.behavior.reflectedChapterSlugs, ["the-one-hour-law"]);
  assert.equal(context.behavior.todayFocusMinutes, 20);
  assert.equal(context.exams[0].subjectName, "Math");
  assert.ok(JSON.stringify(contextToPromptData(context)).length < 12000);
});

test("retrieval ranks matching LevelUp content and caps references", () => {
  const docs = buildContentDocuments(siteData);
  const refs = retrieveLevelUpContent(docs, "focus block bounded output", 1);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].id, "ch:the-one-hour-law");
  assert.ok(refs[0].excerpt.includes("focus block"));
});

test("invalid planner results are rejected when sessions exceed the budget", () => {
  const invalid = validatePlannerResult({
    date: "2026-09-16",
    availableMinutes: 30,
    objective: "Too much",
    priority: "review",
    sessions: [
      { id: "one", title: "One", durationMinutes: 20, type: "learn", reason: "One" },
      { id: "two", title: "Two", durationMinutes: 20, type: "practice", reason: "Two" },
    ],
  });
  assert.equal(invalid, null);
});

test("local planner produces a deterministic plan grounded in weak subjects and exam timing", async () => {
  const context = makeContext();
  const refs = retrieveLevelUpContent(buildContentDocuments(siteData), "Math review focus", 3);
  const provider = createLocalProvider();
  const first = await provider.planner({ date: "2026-09-16", availableMinutes: 45 }, context, refs);
  const second = await provider.planner({ date: "2026-09-16", availableMinutes: 45 }, context, refs);
  assert.equal(first.ok, true);
  assert.deepEqual(first, second);
  assert.equal(first.value.source, "local");
  assert.ok(first.value.sessions.reduce((total, session) => total + session.durationMinutes, 0) <= 45);
  assert.match(`${first.value.priority} ${first.value.objective}`, /revision|Math/i);
});

test("local coach and tutor responses cite actual LevelUp context", async () => {
  const context = makeContext();
  const refs = retrieveLevelUpContent(buildContentDocuments(siteData), "focus block", 2);
  const provider = createLocalProvider();
  const coach = await provider.coach({ question: "What should I focus on today?" }, context, refs);
  const tutor = await provider.tutor(
    { chapterSlug: "the-one-hour-law", mode: "explain", level: "beginner" },
    context,
    refs
  );
  assert.equal(coach.ok, true);
  assert.match(coach.value.answer, /Math|revision|exam/i);
  assert.ok(coach.value.basis.length > 0);
  assert.equal(tutor.ok, true);
  assert.match(tutor.value.answer, /focus block|bounded/i);
  assert.equal(tutor.value.chapterSlug, "the-one-hour-law");
});

test("service layer falls back locally when the remote endpoint fails", async () => {
  const context = makeContext();
  const refs = retrieveLevelUpContent(buildContentDocuments(siteData), "focus", 2);
  const services = createAiServices({
    endpoint: "https://ai.example.test/v1/levelup",
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });
  const result = await services.coach({ question: "What should I learn next?" }, context, refs);
  assert.equal(result.ok, true);
  assert.equal(result.source, "local");
  assert.equal(result.fallbackReason, "remote-unavailable");
});

test("service layer rejects invalid remote structure and falls back locally", async () => {
  const context = makeContext();
  const refs = retrieveLevelUpContent(buildContentDocuments(siteData), "focus", 2);
  const services = createAiServices({
    endpoint: "https://ai.example.test/v1/levelup",
    fetchImpl: async () => new Response(JSON.stringify({ ok: true, result: { answer: "not enough" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  });
  const result = await services.coach({ question: "What should I focus on today?" }, context, refs);
  assert.equal(result.ok, true);
  assert.equal(result.source, "local");
  assert.equal(result.fallbackReason, "remote-unavailable");
});
