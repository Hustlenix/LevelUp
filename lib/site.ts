export const SITE_URL = "https://hustlenix.github.io/LevelUp";
export const SITE_NAME = "LevelUp";
export const SITE_DESCRIPTION =
  "A calmer place to work on yourself. Explore 28 evidence-audited lessons, guided practice plans, and a local-first daily workspace.";
export const SITE_AUTHOR = "Hustlenix";
export const PUBLISHED_DATE = "2026-08-15";

export function canonical(path: string): string {
  return `${SITE_URL}${path}`;
}
