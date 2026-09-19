"use client";

import { useSyncExternalStore } from "react";
import { localToday } from "./dates";

const subscribe = () => () => {};
const getServerSnapshot = () => "";

export function useClientToday(): string {
  return useSyncExternalStore(subscribe, localToday, getServerSnapshot);
}
