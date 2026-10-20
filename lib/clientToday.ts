"use client";

import { useSyncExternalStore } from "react";
import { localToday } from "./dates";

const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | undefined;
const notify = () => { for (const listener of listeners) listener(); };
function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    // Re-evaluate the local date after midnight and when returning to a suspended tab.
    interval = setInterval(notify, 60_000);
    window.addEventListener("focus", notify);
    document.addEventListener("visibilitychange", notify);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(interval);
      window.removeEventListener("focus", notify);
      document.removeEventListener("visibilitychange", notify);
    }
  };
}
const getServerSnapshot = () => "";

export function useClientToday(): string {
  return useSyncExternalStore(subscribe, localToday, getServerSnapshot);
}
