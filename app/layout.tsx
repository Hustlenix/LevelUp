import type { Metadata } from "next";
import { Fraunces, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SearchProvider from "@/components/SearchProvider";
import BackToTop from "@/components/BackToTop";
import JsonLd from "@/components/JsonLd";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import CompanionLayer from "@/components/CompanionLayer";
import AppFrame from "@/components/app/AppFrame";
import { getSiteData } from "@/lib/content";
import { SITE_URL, SITE_AUTHOR } from "@/lib/site";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const source = Source_Serif_4({
  variable: "--font-source",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LevelUp LifeOS — Real-life progress, one mission at a time",
    template: "%s — LevelUp",
  },
  description: "A private, local-first self-improvement app for daily missions, skills, focus, progress, and a companion that grows from real work.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "LevelUp LifeOS",
    title: "LevelUp LifeOS — Real-life progress, one mission at a time",
    description: "A private self-improvement app for daily missions, skills, focus, and meaningful progress.",
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "LevelUp LifeOS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LevelUp LifeOS — Real-life progress, one mission at a time",
    description: "A private self-improvement app for daily missions, skills, focus, and meaningful progress.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const siteData = getSiteData();
  const companionChapters = siteData.chapters.map(({ slug, title, pillar }) => ({ slug, title, pillar }));
  return (
    <html lang="en" className={`${fraunces.variable} ${source.variable}`} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=window.localStorage.getItem("levelup-theme");if(t==="dark"||t==="light"||t==="deepwork"||t==="cyberpunk"){document.documentElement.setAttribute("data-theme",t);}else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme","dark");}else{document.documentElement.setAttribute("data-theme","light");}var s=window.localStorage.getItem("levelup-reader-scale");if(s==="0.85"||s==="1"||s==="1.15"||s==="1.3"){document.documentElement.setAttribute("data-reader-scale",s);}else{document.documentElement.setAttribute("data-reader-scale","1");}}catch(e){document.documentElement.setAttribute("data-theme","light");document.documentElement.setAttribute("data-reader-scale","1");}})();`}
        </Script>
      </head>
      <body className="min-h-dvh flex flex-col">
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "LevelUp LifeOS",
              url: SITE_URL,
              description: "A private, local-first self-improvement app for meaningful daily progress.",
              inLanguage: "en",
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_AUTHOR,
              url: SITE_URL,
            },
          ]}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:border focus:border-gold focus:bg-paper-deep focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
        >
          Skip to content
        </a>
        <SearchProvider>
          <AppFrame chapters={siteData.chapters}>{children}</AppFrame>
        </SearchProvider>
        <BackToTop />
        <ServiceWorkerRegister />
        <AnalyticsProvider />
        <CompanionLayer chapters={companionChapters} />
      </body>
    </html>
  );
}
