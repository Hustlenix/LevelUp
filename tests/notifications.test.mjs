import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultNotificationState,
  getNotificationServerSnapshot,
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
