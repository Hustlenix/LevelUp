import type { AiPlanState } from "./store-types.ts";
import type { AiSessionStatus, DailyPlan } from "./contracts.ts";
import { validatePlannerResult } from "./schemas.ts";

const MAX_STORED_PLANS = 30;

export type AiPlanAction =
  | { type: "save"; plan: DailyPlan }
  | { type: "set-session-status"; date: string; sessionId: string; status: AiSessionStatus };

function withBoundedPlans(plans: Record<string, DailyPlan>): AiPlanState {
  const dates = Object.keys(plans).sort().reverse().slice(0, MAX_STORED_PLANS);
  return { plans: Object.fromEntries(dates.map((date) => [date, plans[date]])) };
}

export function reduceAiPlanState(state: AiPlanState, action: AiPlanAction): AiPlanState {
  if (action.type === "save") {
    const valid = validatePlannerResult(action.plan, action.plan.source);
    if (!valid) return state;
    return withBoundedPlans({ ...state.plans, [valid.date]: valid });
  }

  const plan = state.plans[action.date];
  if (!plan) return state;

  const session = plan.sessions.find((candidate) => candidate.id === action.sessionId);
  if (!session) return state;
  if (session.status === "completed" || (session.status === "started" && action.status === "pending")) return state;
  if (session.status === "pending" && action.status === "completed") return state;

  const nextPlan: DailyPlan = {
    ...plan,
    sessions: plan.sessions.map((candidate) => candidate.id === action.sessionId ? { ...candidate, status: action.status } : candidate),
  };
  return { plans: { ...state.plans, [action.date]: nextPlan } };
}
