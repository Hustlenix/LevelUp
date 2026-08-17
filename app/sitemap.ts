import type { MetadataRoute } from "next";
import { getSiteData } from "@/lib/content";
import { SITE_URL, PUBLISHED_DATE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const { chapters } = getSiteData();
  const lastModified = new Date(PUBLISHED_DATE);
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified },
    { url: `${SITE_URL}/chapters/`, lastModified },
    { url: `${SITE_URL}/audit/`, lastModified },
    { url: `${SITE_URL}/protocols/`, lastModified },
    { url: `${SITE_URL}/glossary/`, lastModified },
    { url: `${SITE_URL}/quotes/`, lastModified },
    { url: `${SITE_URL}/research/`, lastModified },
    { url: `${SITE_URL}/roadmap/`, lastModified },
    { url: `${SITE_URL}/devlog/`, lastModified },
    { url: `${SITE_URL}/progress/`, lastModified },
  ];
  const chapterPages: MetadataRoute.Sitemap = chapters.map((c) => ({
    url: `${SITE_URL}/chapters/${c.slug}/`,
    lastModified,
  }));
  return [...pages, ...chapterPages];
}