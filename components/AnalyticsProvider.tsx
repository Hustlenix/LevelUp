"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isAnalyticsEnabled, getMeasurementId, trackPageView } from "@/lib/analytics";

export default function AnalyticsProvider() {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      dataLayer: unknown[];
    };
    if (!w.gtag) {
      const s = document.createElement("script");
      s.id = "gtag-script";
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${getMeasurementId()}`;
      document.head.appendChild(s);

      w.dataLayer = w.dataLayer || [];
      w.gtag = function (...args: unknown[]) {
        w.dataLayer.push(args);
      };
      w.gtag("js", new Date());
      w.gtag("config", getMeasurementId(), { page_path: window.location.pathname });
    }
  }, []);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
