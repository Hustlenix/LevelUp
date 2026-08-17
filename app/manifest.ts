import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Level Up Manual",
    short_name: "Level Up",
    description:
      "A book-like distillation of twenty-eight self-development trainings, every notable claim graded against the research it cites.",
    start_url: `${BASE}/`,
    display: "standalone",
    background_color: "#f7f2e7",
    theme_color: "#96772c",
    lang: "en",
    icons: [
      { src: `${BASE}/icon.svg`, sizes: "any", type: "image/svg+xml" },
      { src: `${BASE}/apple-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  };
}