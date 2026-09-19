// lib/analytics.ts
//
// Centralized, privacy-safe analytics module — the ONLY place analytics is
// implemented, per spec §68 ("Analytics + SEO engineering rule": one module,
// one API, no scattered gtag calls).
//
// Hard rules enforced here (spec §66):
//   - No-op fallback: when NEXT_PUBLIC_GA_ID is unset, every export is a
//     no-op. The site ships fully functional with zero tracking.
//   - Never send user content: reflections, notes, highlight text, search
//     queries, bookmark contents, or any localStorage payload. Only the
//     event name plus the whitelisted params below are ever sent.
//   - No accounts, no sync, no third-party cookies: we fire standard GA4
//     events only; the browser's own consent/privacy settings apply.
//
// This module is isomorphic-safe: every function guards `typeof window`,
// so it can be imported from server components without side effects.

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/** True when a measurement ID was supplied at build time. */
export function isAnalyticsEnabled(): boolean {
  return GA_ID.length > 0;
}

/** The build-time measurement ID ("" when analytics is off). */
export function getMeasurementId(): string {
  return GA_ID;
}

/**
 * Whitelisted event parameters (spec §66). Anything else — especially text
 * the user typed or highlighted — must NOT be passed here.
 */
export interface AnalyticsParams {
  chapter_slug?: string;
  chapter_number?: number;
  pillar?: string;
  protocol_id?: string;
  duration?: number; // seconds
  quiz_score?: number;
  goal_type?: string;
}

/** Event names from spec §66, exported so callers cannot typo them. */
export const ANALYTICS_EVENTS = {
  pageView: "page_view",
  chapterOpened: "chapter_opened",
  chapterCompleted: "chapter_completed",
  quizStarted: "quiz_started",
  quizCompleted: "quiz_completed",
  protocolStarted: "protocol_started",
  protocolCompleted: "protocol_completed",
  goalCreated: "goal_created",
  commitmentCreated: "commitment_created",
  commitmentCompleted: "commitment_completed",
  focusSessionStarted: "focus_session_started",
  focusSessionCompleted: "focus_session_completed",
  dailyReviewCompleted: "daily_review_completed",
  weeklyReviewCompleted: "weekly_review_completed",
  experimentStarted: "experiment_started",
  experimentCompleted: "experiment_completed",
  searchPerformed: "search_performed",
  highlightCreated: "highlight_created",
  bookmarkCreated: "bookmark_created",
  backupExported: "backup_exported",
  backupImported: "backup_imported",
} as const;

/** Push a command onto the GA4 dataLayer (creates it if needed). */
function gtag(...args: unknown[]): void {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push(args);
}

/** Fire a named event with whitelisted params. No-op when disabled. */
export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined") return;
  gtag("event", name, params ?? {});
}

/** Track a page view (config call with page_path). No-op when disabled. */
export function trackPageView(path: string): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined") return;
  gtag("config", GA_ID, { page_path: path });
}
