import { getSiteData } from "@/lib/content";
import JsonLd from "@/components/JsonLd";
import ReaderFrontDoor, { BOOK_ONE_LINER } from "@/components/ReaderFrontDoor";
import { SITE_NAME, SITE_DESCRIPTION, SITE_AUTHOR, PUBLISHED_DATE } from "@/lib/site";

export default function Home() {
  const data = getSiteData();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Book",
          name: SITE_NAME,
          abstract: BOOK_ONE_LINER,
          description: SITE_DESCRIPTION,
          inLanguage: "en",
          author: { "@type": "Organization", name: SITE_AUTHOR },
          datePublished: PUBLISHED_DATE,
        }}
      />

      <ReaderFrontDoor chapters={data.chapters} />
    </div>
  );
}