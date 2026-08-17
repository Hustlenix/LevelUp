"use client";

import { useState } from "react";
import type { ChapterQuiz } from "@/lib/types";
import { useQuizStore, saveQuizResult, useReflectionsStore, saveReflection } from "@/lib/activity";

export default function ChapterQuiz({ quiz }: { quiz: ChapterQuiz }) {
  const scores = useQuizStore();
  const reflections = useReflectionsStore();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [draft, setDraft] = useState(reflections[quiz.slug] ?? "");

  const done = results.length === quiz.questions.length;
  const score = results.filter(Boolean).length;
  const past = scores[quiz.slug];

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = quiz.questions[idx].options[i].correct;
    setResults((r) => [...r, correct]);
  };

  const next = () => {
    setPicked(null);
    setIdx((i) => i + 1);
  };

  const restart = () => {
    setPicked(null);
    setResults([]);
    setIdx(0);
  };

  const finish = () => {
    saveQuizResult(quiz.slug, score, quiz.questions.length);
  };

  return (
    <section className="mt-10 rounded-xl border border-gold/40 bg-card p-6 no-print" aria-label="Test yourself">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
        Test yourself
      </p>
      <h2 className="mt-2 font-display text-xl font-bold text-ink">
        Three quick checks on this chapter
      </h2>

      {!done && quiz.questions.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-ink-soft">
            Question {idx + 1} of {quiz.questions.length}
          </p>
          <p className="mt-2 font-display text-lg font-semibold text-ink">
            {quiz.questions[idx].q}
          </p>
          <div className="mt-4 grid gap-2">
            {quiz.questions[idx].options.map((o, i) => {
              let cls = "border-line bg-paper text-ink-soft hover:border-gold hover:text-ink";
              if (picked !== null) {
                if (o.correct) cls = "border-emerald-600 bg-emerald-600/10 text-ink";
                else if (i === picked) cls = "border-rose-600 bg-rose-600/10 text-ink";
                else cls = "border-line bg-paper text-ink-faint";
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={picked !== null}
                  aria-pressed={picked === i}
                  className={`rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors ${cls}`}
                >
                  {o.t}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="mt-4" role="status" aria-live="polite">
              <p
                className={`font-display text-sm font-semibold ${
                  results[results.length - 1] ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {results[results.length - 1] ? "Correct." : "Not quite."}
              </p>
              {quiz.questions[idx].explanation && (
                <p className="mt-1 text-sm text-ink-soft">{quiz.questions[idx].explanation}</p>
              )}
              {idx + 1 < quiz.questions.length ? (
                <button
                  type="button"
                  onClick={next}
                  className="mt-3 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper transition-colors hover:bg-gold"
                >
                  Next question
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finish}
                  className="mt-3 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper transition-colors hover:bg-gold"
                >
                  See my score
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="mt-5" role="status" aria-live="polite">
          <p className="font-display text-3xl font-bold text-ink">
            {score} of {quiz.questions.length} correct
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {score === quiz.questions.length
              ? "Perfect — the ideas are sticking."
              : score >= quiz.questions.length / 2
                ? "Solid — reread the parts you missed if you like."
                : "Worth another pass over this chapter."}
          </p>
          <button
            type="button"
            onClick={restart}
            className="mt-4 rounded-full border border-line bg-paper px-5 py-2 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold"
          >
            Try again
          </button>
        </div>
      )}

      <div className="mt-8 border-t border-line pt-5">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Reflection
        </p>
        <p className="mt-2 text-sm text-ink-soft">{quiz.reflection}</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => saveReflection(quiz.slug, draft)}
          rows={3}
          aria-label="Your reflection"
          placeholder="Write your answer here. It stays on this device."
          className="mt-3 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
        />
        {past && (
          <p className="mt-2 text-xs text-ink-faint">
            Best saved score: {past.score} of {past.total}
          </p>
        )}
      </div>
    </section>
  );
}