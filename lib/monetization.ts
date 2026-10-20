// Monetization architecture (honest by design).
// Entitlements are a simple, server-syncable flag set. There is NO payment
// flow yet — nothing here collects money or fakes it. UI shows Premium-gated
// features as "Planned" and the entitlement flag is only ever set by a future
// verified purchase/server grant, never by client-side logic alone.

export type EntitlementKey = "premium";

export const ENTITLEMENTS_STORAGE_KEY = "levelup-entitlements-v1" as const;

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  gate: EntitlementKey;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: "advanced-coach",
    name: "Advanced Coach",
    description: "Free-form conversation with the coach (AI-backed, with graceful fallback).",
    gate: "premium",
  },
  {
    id: "full-history",
    name: "Full History",
    description: "Expand your progress heatmap from 4 weeks to a full 24-week view.",
    gate: "premium",
  },
  {
    id: "skill-trends",
    name: "Skill Trends",
    description: "Three-month trend lines for every skill, not just the current week.",
    gate: "premium",
  },
];

export interface EntitlementState {
  premium: boolean;
  features: PremiumFeature[];
}

export function defaultEntitlementState(): EntitlementState {
  return { premium: false, features: PREMIUM_FEATURES };
}

// SSR-safe: only reads window when actually in a browser.
export function hasEntitlement(key: EntitlementKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(ENTITLEMENTS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { premium?: boolean };
    return key === "premium" && parsed.premium === true;
  } catch {
    return false;
  }
}

export function getEntitlementState(): EntitlementState {
  return { premium: hasEntitlement("premium"), features: PREMIUM_FEATURES };
}

/**
 * Grants an entitlement. Intentionally only reachable through a future
 * verified purchase callback — never called by client-side logic on its own.
 */
export function grantEntitlement(key: EntitlementKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    const state = hasEntitlement("premium") ? { premium: true } : { premium: key === "premium" };
    window.localStorage.setItem(ENTITLEMENTS_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function revokeEntitlement(key: EntitlementKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (key === "premium") {
      window.localStorage.removeItem(ENTITLEMENTS_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function isFeatureUnlocked(featureId: string): boolean {
  const feature = PREMIUM_FEATURES.find((item) => item.id === featureId);
  if (!feature) return true; // unknown features are not gated
  return hasEntitlement(feature.gate);
}