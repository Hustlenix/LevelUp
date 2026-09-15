import { getDevlogData } from "@/lib/content";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_AUTHOR } from "@/lib/site";

export const dynamic = "force-static";

/** Max length of the plain-text <description> excerpt per item. */
const MAX_DESCRIPTION_LENGTH = 480;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Strip lightweight Markdown to plain text so feed readers render a clean
 * summary instead of literal `**bold**`, backticks, and ![image](url) syntax.
 * Order matters: images before links, inline code before emphasis so markers
 * inside code spans survive the strip intact. Deliberately dependency-free.
 */
function stripMarkdown(markdown: string): string {
  return (
    markdown
      // images: ![alt](url) -> alt
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // links: [text](url) -> text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // inline code: `code` -> code
      .replace(/`([^`]*)`/g, "$1")
      // bold **text** -> text, then italic *text* -> text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      // ATX headings and blockquote markers at line starts
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      // list bullets (-, *, +) at line starts
      .replace(/^[-*+]\s+/gm, "")
      // horizontal rules (---, ***, ___ alone on a line)
      .replace(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "")
      // collapse newlines and whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Plain-text excerpt for an item's <description>. Truncates at a word
 * boundary and appends an ellipsis so long entries stay a manageable summary.
 */
function excerpt(markdown: string): string {
  const text = stripMarkdown(markdown);
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;
  const cut = text.slice(0, MAX_DESCRIPTION_LENGTH).replace(/\s+\S*$/, "");
  return `${cut}…`;
}

export async function GET() {
  const entries = getDevlogData();
  const lastBuildDate = entries.length > 0 ? new Date(entries[0].date).toUTCString() : new Date().toUTCString();

  const channel = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    `<channel>`,
    `<title>${escapeXml(SITE_NAME)} — Devlog</title>`,
    `<link>${SITE_URL}/devlog/</link>`,
    `<atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>`,
    `<description>${escapeXml(SITE_DESCRIPTION)}</description>`,
    `<language>en</language>`,
    `<lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `<managingEditor>${escapeXml(SITE_AUTHOR)}</managingEditor>`,
    `<generator>Next.js static export</generator>`,
  ];

  const items = entries.map((e) => {
    const link = `${SITE_URL}/devlog/#${e.slug}`;
    const pubDate = new Date(e.date).toUTCString();
    return [
      `<item>`,
      `<title>${escapeXml(e.title)}</title>`,
      `<link>${escapeXml(link)}</link>`,
      `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `<pubDate>${pubDate}</pubDate>`,
      `<description>${escapeXml(excerpt(e.body))}</description>`,
      `</item>`,
    ].join("");
  });

  const xmlParts = [...channel, ...items, `</channel>`, `</rss>`];
  const xml = xmlParts.join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}