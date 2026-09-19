import type { DailyPlan } from "./contracts.ts";

export interface AiPlanState {
  plans: Record<string, DailyPlan>;
}
