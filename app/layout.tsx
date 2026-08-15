import type { Metadata } from "next";
import { Fraunces, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SearchProvider from "@/components/SearchProvider";

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
  title: {
    default: "The Level Up Manual — Belief, Identity & the Science of Getting Better",
    template: "%s — The Level Up Manual",
  },
  description:
    "A book-like distillation of twenty-eight self-development trainings: belief engineering, identity, focus, discipline and the one-person business — with every claim verified against the research.",
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
        <SearchProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </SearchProvider>
      </body>
    </html>
  );
}