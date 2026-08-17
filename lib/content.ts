import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SiteData } from "@/lib/types";

let cache: SiteData | null = null;
let devlogCache: { slug: string; date: string; title: string; body: string }[] | null = null;

export function getSiteData(): SiteData {
  if (cache) return cache;
  const path = join(process.cwd(), "public", "data", "site.json");
  cache = JSON.parse(readFileSync(path, "utf8")) as SiteData;
  return cache;
}

export function getDevlogData(): { slug: string; date: string; title: string; body: string }[] {
  if (devlogCache) return devlogCache;
  const path = join(process.cwd(), "public", "data", "devlog.json");
  devlogCache = JSON.parse(readFileSync(path, "utf8")) as {
    slug: string;
    date: string;
    title: string;
    body: string;
  }[];
  return devlogCache;
}