import { PRACTICE_PLANS } from "./practicePlans.ts";
export type PracticeNeed = "all" | "start" | "focus" | "plan" | "reflect";
export const PRACTICE_NEEDS: { id: PracticeNeed; label: string }[] = [{ id: "all", label: "All plans" }, { id: "start", label: "Get started" }, { id: "focus", label: "Focus & learn" }, { id: "plan", label: "Make a plan" }, { id: "reflect", label: "Reflect & adjust" }];
// Setup time, not a claim about the length or efficacy of the entire practice.
export const PRACTICE_FIT: Record<string, { need: PracticeNeed; setup: number }> = {
  pomodoro: { need: "focus", setup: 5 }, "tiny-start": { need: "start", setup: 2 }, "morning-plan": { need: "plan", setup: 5 },
  "belief-test": { need: "reflect", setup: 10 }, "reverse-plan": { need: "plan", setup: 10 }, rehearse: { need: "start", setup: 3 },
  "two-lines": { need: "reflect", setup: 5 }, "energy-check": { need: "plan", setup: 5 }, decision: { need: "plan", setup: 5 },
  pause: { need: "focus", setup: 2 }, "learn-practise": { need: "focus", setup: 5 }, "seven-day-trial": { need: "plan", setup: 10 }, "weekly-review": { need: "reflect", setup: 10 },
};
export function discoverPractices(query: string, need: PracticeNeed, maxSetup: number) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return PRACTICE_PLANS.filter(plan => {
    const fit = PRACTICE_FIT[plan.id];
    const content = `${plan.title} ${plan.purpose} ${plan.smaller}`.toLowerCase();
    return fit && (need === "all" || fit.need === need) && fit.setup <= maxSetup && words.every(word => content.includes(word));
  });
}
