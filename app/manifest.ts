import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LevelUp — The Manual & Workspace",
    short_name: "LevelUp",
    description:
      "Evidence-audited lessons, practical tools, and a local record of your work.",
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    id: `${BASE}/`,
    display: "standalone",
    background_color: "#f6f3eb",
    // Match the viewport theme-color and the surface the app opens on,
    // so installed PWAs don't flash a mismatched chrome color.
    theme_color: "#f6f3eb",
    lang: "en",
    icons: [
      { src: `${BASE}/pwa-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE}/pwa-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BASE}/pwa-maskable.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: `${BASE}/icon.svg`, sizes: "any", type: "image/svg+xml" },
      { src: `${BASE}/apple-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  };
}
