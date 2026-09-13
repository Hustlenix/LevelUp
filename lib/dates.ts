/**
 * Local-calendar date helpers.
 *
 * Date keys in localStorage are YYYY-MM-DD strings recorded from the user's
 * LOCAL calendar. Sprinting "today" through Date.toISOString() bakes in UTC,
 * so a user east of UTC (or near midnight west of it) can read and write the
 * wrong day. These helpers always derive the string from local date
 * components, so key generation and key lookup always agree.
 */

/** Today's date as YYYY-MM-DD in the user's local calendar. */
export function localToday(): string {
  return formatLocalDate(new Date());
}

/** Format a Date using its LOCAL calendar components as YYYY-MM-DD. */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar date offset by delta days from today (e.g. +1 = tomorrow). */
export function localDateOffset(deltaDays: number): string {
  const now = new Date();
  return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + deltaDays));
}