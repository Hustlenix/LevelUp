export type Entitlement =
  | "core_missions"
  | "core_progress"
  | "manual"
  | "basic_coach"
  | "advanced_coach"
  | "custom_programs"
  | "deep_analytics"
  | "cloud_sync"
  | "premium_cosmetics";

export type Plan = "free" | "premium";

const FREE_ENTITLEMENTS = new Set<Entitlement>(["core_missions", "core_progress", "manual", "basic_coach"]);

export function hasEntitlement(plan: Plan, entitlement: Entitlement): boolean {
  return plan === "premium" || FREE_ENTITLEMENTS.has(entitlement);
}

export const PREMIUM_FEATURES: ReadonlyArray<{ entitlement: Entitlement; label: string }> = [
  { entitlement: "advanced_coach", label: "Adaptive coaching plans" },
  { entitlement: "custom_programs", label: "Custom 30-day programs" },
  { entitlement: "deep_analytics", label: "Long-term pattern analysis" },
  { entitlement: "cloud_sync", label: "Private cross-device sync" },
  { entitlement: "premium_cosmetics", label: "Extra companion rooms and styles" },
];
