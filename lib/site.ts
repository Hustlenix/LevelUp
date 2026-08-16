export const SITE_URL = "https://hustlenix.github.io/LevelUp";
export const SITE_NAME = "The Level Up Manual";
export const SITE_DESCRIPTION =
  "A book-like distillation of twenty-eight self-development trainings, with every notable claim graded A–D against the research it cites.";
export const SITE_AUTHOR = "Hustlenix";
export const PUBLISHED_DATE = "2026-08-15";

export function canonical(path: string): string {
  return `${SITE_URL}${path}`;
}