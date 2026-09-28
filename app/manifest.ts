import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LevelUp LifeOS",
    short_name: "Level Up",
    description:
      "A private real-life progression system for daily missions, skills, focus, and meaningful self-improvement.",
    start_url: `${BASE}/today/`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: "#f7f2e7",
    theme_color: "#17201d",
    lang: "en",
    icons: [
      { src: `${BASE}/icon.svg`, sizes: "any", type: "image/svg+xml" },
      { src: `${BASE}/apple-icon.png`, sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Today", short_name: "Today", url: `${BASE}/today/`, icons: [{ src: `${BASE}/icon.svg`, sizes: "any", type: "image/svg+xml" }] },
      { name: "Journey", short_name: "Journey", url: `${BASE}/journey/`, icons: [{ src: `${BASE}/icon.svg`, sizes: "any", type: "image/svg+xml" }] },
      { name: "Focus room", short_name: "Focus", url: `${BASE}/focus/`, icons: [{ src: `${BASE}/icon.svg`, sizes: "any", type: "image/svg+xml" }] },
    ],
  };
}
