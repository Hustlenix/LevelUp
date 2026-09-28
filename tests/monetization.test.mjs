import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultEntitlementState,
  hasEntitlement,
  getEntitlementState,
  grantEntitlement,
  revokeEntitlement,
  isFeatureUnlocked,
  PREMIUM_FEATURES,
} from "../lib/monetization.ts";

function withFakeWindow(fn) {
  const store = {};
  const fakeWindow = {
    localStorage: {
      getItem: (key) => (key in store ? store[key] : null),
      setItem: (key, value) => {
        store[key] = String(value);
      },
      removeItem: (key) => {
        delete store[key];
      },
    },
  };
  Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true, writable: true });
  try {
    return fn(store);
  } finally {
    delete globalThis.window;
  }
}

test("default state is honest: premium off, features listed", () => {
  const state = defaultEntitlementState();
  assert.equal(state.premium, false);
  assert.equal(state.features.length, PREMIUM_FEATURES.length);
  assert.ok(state.features.length >= 3);
});

test("feature catalogue is well-formed and single-gated", () => {
  const ids = new Set();
  for (const feature of PREMIUM_FEATURES) {
    assert.equal(feature.gate, "premium");
    assert.ok(!ids.has(feature.id), `duplicate feature id ${feature.id}`);
    ids.add(feature.id);
    assert.ok(feature.name.length > 0);
    assert.ok(feature.description.length > 0);
  }
  assert.deepEqual([...ids].sort(), ["advanced-coach", "full-history", "skill-trends"]);
});

test("SSR (no window): nothing is entitled and grants are refused", () => {
  assert.equal(hasEntitlement("premium"), false);
  assert.equal(getEntitlementState().premium, false);
  assert.equal(grantEntitlement("premium"), false);
  assert.equal(revokeEntitlement("premium"), false);
});

test("unknown features are not gated; known ones require the entitlement", () => {
  assert.equal(isFeatureUnlocked("advanced-coach"), false);
  assert.equal(isFeatureUnlocked("does-not-exist"), true);
});

test("grant, read back, and revoke round-trips through localStorage", () => {
  withFakeWindow((store) => {
    assert.equal(hasEntitlement("premium"), false);
    assert.equal(grantEntitlement("premium"), true);
    assert.equal(hasEntitlement("premium"), true);
    assert.equal(getEntitlementState().premium, true);
    assert.equal(isFeatureUnlocked("full-history"), true);
    assert.equal(revokeEntitlement("premium"), true);
    assert.equal(hasEntitlement("premium"), false);
    assert.ok(!("levelup-entitlements-v1" in store));
  });
});

test("corrupt stored JSON is treated as not entitled", () => {
  withFakeWindow((store) => {
    store["levelup-entitlements-v1"] = "{not json";
    assert.equal(hasEntitlement("premium"), false);
    assert.equal(isFeatureUnlocked("advanced-coach"), false);
  });
});