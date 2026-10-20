// Compatibility API: LevelUp does not collect analytics.
export function isAnalyticsEnabled(): boolean { return false; }
export function getMeasurementId(): string { return ""; }

export interface AnalyticsParams {
  chapter_slug?: string;
  chapter_number?: number;
  pillar?: string;
  protocol_id?: string;
  duration?: number; // seconds
  quiz_score?: number;
  goal_type?: string;
  os_entity?: "goal" | "roadmap" | "milestone" | "task" | "session" | "review" | "experiment";
  review_kind?: "daily" | "weekly";
  recovery?: "session" | "goal";
  skill?: string;
  xp?: number;
  quick_start?: boolean;
  coach_action?: string;
  nexus_result?: "accepted" | "duplicate" | "rejected";
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
  goalProgressed: "goal_progressed",
  roadmapCreated: "roadmap_created",
  roadmapUpdated: "roadmap_updated",
  milestoneCreated: "milestone_created",
  milestoneUpdated: "milestone_updated",
  taskCreated: "task_created",
  taskUpdated: "task_updated",
  sessionScheduled: "session_scheduled",
  commitmentCreated: "commitment_created",
  commitmentCompleted: "commitment_completed",
  focusSessionStarted: "focus_session_started",
  focusSessionCompleted: "focus_session_completed",
  focusSessionInterrupted: "focus_session_interrupted",
  dailyReviewCompleted: "daily_review_completed",
  weeklyReviewCompleted: "weekly_review_completed",
  reviewCompleted: "review_completed",
  recoveryStarted: "recovery_started",
  experimentStarted: "experiment_started",
  experimentCompleted: "experiment_completed",
  searchPerformed: "search_performed",
  highlightCreated: "highlight_created",
  bookmarkCreated: "bookmark_created",
  backupExported: "backup_exported",
  backupImported: "backup_imported",
  onboardingStarted: "onboarding_started",
  onboardingCompleted: "onboarding_completed",
  goalSelected: "goal_selected",
  missionViewed: "mission_viewed",
  missionStarted: "mission_started",
  missionCompleted: "mission_completed",
  missionSkipped: "mission_skipped",
  streakUpdated: "streak_updated",
  levelUp: "level_up",
  skillLevelUp: "skill_level_up",
  journeyNodeCompleted: "journey_node_completed",
  companionEvolved: "companion_evolved",
  coachUsed: "coach_used",
  weeklyReviewViewed: "weekly_review_viewed",
  paywallViewed: "paywall_viewed",
  trialStarted: "trial_started",
  subscriptionStarted: "subscription_started",
  nexusPacketExported: "nexus_packet_exported",
  nexusPacketImported: "nexus_packet_imported",
  nexusCompacted: "nexus_compacted",
} as const;

export function trackEvent(_name: string, _params?: AnalyticsParams): void { void _name; void _params; }
export function trackPageView(_path: string): void { void _path; }
