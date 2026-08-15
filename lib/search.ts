import MiniSearch from "minisearch";

export interface SearchHit {
  id: string;
  type: string;
  title: string;
  sub: string;
  teaser: string;
  url: string;
}

type Doc = { id: string; type: string; title: string; sub: string; teaser: string; url: string; text: string };

let engine: MiniSearch<Doc> | null = null;

export async function getSearchEngine() {
  if (engine) return engine;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const res = await fetch(`${window.location.origin}${base}/data/search-index.json`);
  const docs = (await res.json()) as { id: string; type: string; title: string; sub: string; teaser: string; url: string; text: string }[];
  engine = new MiniSearch({
    fields: ["title", "sub", "teaser", "text"],
    storeFields: ["id", "type", "title", "sub", "teaser", "url"],
    searchOptions: {
      boost: { title: 4, sub: 2, teaser: 1.5 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  engine.addAll(docs);
  return engine;
}

export function serializeHit(hit: unknown): SearchHit {
  const h = hit as Record<string, unknown>;
  return {
    id: String(h.id ?? ""),
    type: String(h.type ?? ""),
    title: String(h.title ?? ""),
    sub: String(h.sub ?? ""),
    teaser: String(h.teaser ?? ""),
    url: String(h.url ?? ""),
  };
}