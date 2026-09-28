import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import JsonLd from "@/components/JsonLd";
import ReaderFrontDoor, { BOOK_ONE_LINER } from "@/components/ReaderFrontDoor";
import { SITE_NAME, SITE_DESCRIPTION, SITE_AUTHOR, PUBLISHED_DATE, canonical } from "@/lib/site";

export const metadata: Metadata = { title: "The Level Up Manual", description: SITE_DESCRIPTION, alternates: { canonical: canonical("/manual/") } };

export default function ManualPage() {
  const data = getSiteData();
  return <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-12"><JsonLd data={{ "@context": "https://schema.org", "@type": "Book", name: SITE_NAME, abstract: BOOK_ONE_LINER, description: SITE_DESCRIPTION, inLanguage: "en", author: { "@type": "Organization", name: SITE_AUTHOR }, datePublished: PUBLISHED_DATE }} /><ReaderFrontDoor chapters={data.chapters} /></div>;
}
