import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultNotificationState,
  getNotificationServerSnapshot,
  normalizeNotificationState,
  readNotificationState,
} from "../lib/notifications.ts";

test("notification preferences have a stable server snapshot without browser storage", () => {
  const first = getNotificationServerSnapshot();
  const second = getNotificationServerSnapshot();

  assert.strictEqual(first, second);
  assert.deepEqual(first, defaultNotificationState());
  assert.deepEqual(readNotificationState(null), defaultNotificationState());
});

test("notification preferences still load from local storage", () => {
  const storage = {
    getItem() {
      return JSON.stringify({ enabled: false, quietStart: "20:00" });
    },
  };

  assert.deepEqual(readNotificationState(storage), {
    ...defaultNotificationState(),
    enabled: false,
    quietStart: "20:00",
  });
});

test("notification normalization rejects malformed times and bounds ids", () => {
  const state = normalizeNotificationState({ enabled: "yes", quietStart: "25:90", quietEnd: "06:30", dismissedIds: ["one", 2], readIds: ["two"] });
  assert.deepEqual(state, { ...defaultNotificationState(), quietEnd: "06:30", dismissedIds: ["one"], readIds: ["two"] });
});
