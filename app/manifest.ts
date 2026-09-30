import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LevelUp — Learn. Practice. Grow.",
    short_name: "LevelUp",
    description:
      "Evidence-informed lessons, guided practices, and a calmer daily workspace.",
    start_url: `${BASE}/`,
    display: "standalone",
    background_color: "#f7f9f7",
    theme_color: "#26634b",
    lang: "en",
    icons: [
      { src: `${BASE}/icon.svg`, sizes: "any", type: "image/svg+xml" },
      { src: `${BASE}/apple-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  };
}
