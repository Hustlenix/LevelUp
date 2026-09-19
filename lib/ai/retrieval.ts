import type { SiteData, SearchDoc } from "../types.ts";
import { AI_LIMITS, type ContentReference } from "./contracts.ts";

function tokens(value: string): string[] {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [])];
}

function excerpt(text: string, queryTokens: string[]): string {
  const compact = text.replace(/\s+/g, " ").trim();
  const lower = compact.toLowerCase();
  const index = queryTokens.map((token) => lower.indexOf(token)).filter((value) => value >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, index - 180);
  return compact.slice(start, start + AI_LIMITS.referenceChars);
}

export function buildContentDocuments(siteData: Pick<SiteData, "chapters" | "audit" | "protocols" | "glossary" | "quotes">): SearchDoc[] {
  const documents: SearchDoc[] = [];
  for (const chapter of siteData.chapters) {
    documents.push({
      id: `ch:${chapter.slug}`,
      type: "Chapter",
      title: chapter.title,
      sub: `Chapter ${chapter.number} · ${chapter.pillar}`,
      teaser: chapter.teaser,
      url: `/chapters/${chapter.slug}/`,
      text: `${chapter.title}. ${chapter.teaser}. ${chapter.keyConcepts.join(". ")}. ${chapter.body}`,
    });
  }
  for (const protocol of siteData.protocols) {
    documents.push({
      id: `pr:${protocol.num}`,
      type: "Protocol",
      title: `${protocol.num} — ${protocol.title}`,
      sub: protocol.purpose,
      teaser: protocol.purpose,
      url: `/protocols/#protocol-${protocol.num.replace(".", "-")}`,
      text: `${protocol.title}. ${protocol.purpose}. ${protocol.steps.join(" ")}`,
    });
  }
  for (const term of siteData.glossary) {
    documents.push({ id: `gl:${term.term}`, type: "Glossary", title: term.term, sub: "Glossary term", teaser: term.definition, url: "/glossary/", text: `${term.term}. ${term.definition}` });
  }
  return documents;
}

export function retrieveLevelUpContent(docs: SearchDoc[], query: string, limit: number = AI_LIMITS.maxReferences): ContentReference[] {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return [];
  const safeLimit = Math.max(1, Math.min(limit, AI_LIMITS.maxReferences));
  return docs
    .map((doc) => {
      const title = doc.title.toLowerCase();
      const sub = doc.sub.toLowerCase();
      const teaser = doc.teaser.toLowerCase();
      const text = doc.text.toLowerCase();
      const score = queryTokens.reduce((total, token) => total + (title.includes(token) ? 5 : 0) + (sub.includes(token) ? 2 : 0) + (teaser.includes(token) ? 2 : 0) + (text.includes(token) ? 1 : 0), 0);
      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id))
    .slice(0, safeLimit)
    .map(({ doc }) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      sub: doc.sub,
      teaser: doc.teaser,
      url: doc.url,
      excerpt: excerpt(doc.text, queryTokens),
      untrustedReference: true as const,
    }));
}
