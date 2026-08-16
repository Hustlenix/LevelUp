import type { Metadata } from "next";
import { Fraunces, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SearchProvider from "@/components/SearchProvider";
import BackToTop from "@/components/BackToTop";
import JsonLd from "@/components/JsonLd";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_AUTHOR } from "@/lib/site";

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
    default: `${SITE_NAME} — Belief, Identity & the Science of Getting Better`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Belief, Identity & the Science of Getting Better`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — 28 verified chapters`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Belief, Identity & the Science of Getting Better`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${source.variable}`}>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=window.localStorage.getItem("levelup-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme","dark");}else{document.documentElement.setAttribute("data-theme","light");}var s=window.localStorage.getItem("levelup-reader-scale");if(s==="0.85"||s==="1"||s==="1.15"||s==="1.3"){document.documentElement.setAttribute("data-reader-scale",s);}else{document.documentElement.setAttribute("data-reader-scale","1");}}catch(e){document.documentElement.setAttribute("data-theme","light");document.documentElement.setAttribute("data-reader-scale","1");}})();`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESCRIPTION,
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
          <Nav />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </SearchProvider>
        <BackToTop />
      </body>
    </html>
  );
}