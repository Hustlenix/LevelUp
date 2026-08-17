"use client";

import { useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      location.protocol !== "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1"
    ) {
      return;
    }
    navigator.serviceWorker.register(`${BASE}/sw.js?v=1`).catch(() => {
      /* service worker failure is graceful - the site works without it */
    });
  }, []);
  return null;
}