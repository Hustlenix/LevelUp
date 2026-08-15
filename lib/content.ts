import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SiteData } from "@/lib/types";

let cache: SiteData | null = null;

export function getSiteData(): SiteData {
  if (cache) return cache;
  const path = join(process.cwd(), "public", "data", "site.json");
  cache = JSON.parse(readFileSync(path, "utf8")) as SiteData;
  return cache;
}