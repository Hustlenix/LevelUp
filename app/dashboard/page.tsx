import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import JsonLd from "@/components/JsonLd";
import HomepageDashboard from "@/components/HomepageDashboard";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_AUTHOR, PUBLISHED_DATE, canonical } from "@/lib/site";
import LevelUpOSWorkspace from "@/components/LevelUpOSWorkspace";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your daily operating system — streak, daily floors, consistency matrix, and protocols — stored locally.",
  alternates: { canonical: canonical("/today/") },
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  const data = getSiteData();

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
          inLanguage: "en",
          author: { "@type": "Organization", name: SITE_AUTHOR },
          datePublished: PUBLISHED_DATE,
          applicationCategory: "ProductivityApplication",
          operatingSystem: "All",
        }}
      />

      <LevelUpOSWorkspace mode="today" />
      <div className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        <details className="group rounded-2xl border border-line bg-card">
          <summary className="interface-font flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 p-5 sm:px-7 [&::-webkit-details-marker]:hidden">
            <span><span className="block text-sm font-semibold text-ink">Daily practice &amp; reading tools</span><span className="mt-1 block text-xs leading-relaxed text-ink-soft">Your four pillars, focus sounds, consistency, and manual library.</span></span>
            <span aria-hidden="true" className="text-xl text-gold transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="border-t border-line p-4 sm:p-6"><HomepageDashboard protocols={data.protocols} chapters={data.chapters} /></div>
        </details>
      </div>
    </div>
  );
}
