import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, SectionHeading } from "@/components/ui";
import { canonical } from "@/lib/site";
import { isAnalyticsEnabled, getMeasurementId } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What LevelUp stores, what it sends, and how to clear it. Your progress lives in your browser, and the site sends nothing unless analytics is enabled.",
  alternates: { canonical: canonical("/privacy/") },
};

export default function PrivacyPage() {
  const analyticsOn = isAnalyticsEnabled();
  const measurementId = getMeasurementId();

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Privacy"
        title="Your data stays on your device"
        lede="Progress, notes, and highlights live in your browser's local storage. This site is a static export — no accounts, no login, no server of ours. By default it sends nothing to anyone."
      />

      <div className="space-y-8">
        <section>
          <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
            The short version
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
            <li>Reading progress, quiz results, reflections, protocol runs, highlights, and points are stored only in your browser&apos;s local storage — on this device, in this browser.</li>
            <li>Nothing is uploaded. There is no account, no sync, no server-side database.</li>
            <li>Backups are files you download and re-import yourself; they never leave your machine unless you move them.</li>
            <li>Analytics is {analyticsOn ? (
              <span className="font-semibold text-ink">enabled in this build</span>
            ) : (
              <span className="font-semibold text-ink">disabled in this build</span>
            )} — {analyticsOn ? "details below" : "no tracking script loads and no analytics requests are made"}.</li>
          </ul>
        </section>

        <section>
          <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
            Where your data lives
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Everything you create here — chapters marked complete, scroll progress, quiz answers, reflections,
            protocol runs, highlights, and gamification points — is stored in your browser&apos;s local storage on the
            device and browser you are using. It is not sent to any server and is not shared between devices or
            browsers. If you use the site in a different browser or on a different machine, you start fresh (unless
            you export a backup and import it there).
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Deleting your browser&apos;s data for this site permanently removes everything — there is no way to recover
            it afterward. Export a backup first if you might want it later (see the{" "}
            <Link className="text-gold underline-offset-2 hover:underline" href="/progress/">
              progress page
            </Link>
            , which includes backup buttons).
          </p>
        </section>

        <section>
          <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
            Search stays in memory
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The search feature indexes the book&apos;s content in your browser and matches your query against it on the
            spot. Search queries are not stored and not sent anywhere.
          </p>
        </section>

        <section>
          <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
            Backups are your files
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The backup feature downloads a small JSON file containing your progress, quiz results, reflections,
            protocol runs, and highlights, and lets you import such a file again. The download goes to your own
            machine, and an import only happens when you choose a file. Neither action transmits your data over the
            network.
          </p>
        </section>

        <section>
          <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
            Analytics
          </h2>
          {analyticsOn ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                This build has Google Analytics 4 enabled
                {measurementId ? <> (measurement ID <code className="rounded border border-line bg-paper-deep px-1.5 py-0.5 text-xs">{measurementId}</code>)</> : null}. It counts page views and
                specific interaction events: chapters opened and completed, quizzes finished (with the score),
                protocol runs started and completed, searches performed, highlights created, and backups exported
                or imported. Only these events fire — highlight text, search queries, quiz answers, reflections,
                and notes are never included.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Google Analytics may set cookies and collect standard usage data (such as device type, approximate
                location, and referrer) under Google&apos;s{" "}
                <a className="text-gold underline-offset-2 hover:underline" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                  privacy policy
                </a>
                . You can opt out of Google Analytics across the web with the{" "}
                <a className="text-gold underline-offset-2 hover:underline" href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
                  Google Analytics opt-out browser add-on
                </a>
                .
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Analytics is disabled in this build. No analytics script is loaded, no cookies are set by the site,
              and no analytics requests are made. If the site owner later enables analytics, this page will be
              updated to say so.
            </p>
          )}
        </section>

        <section>
          <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
            Hosting logs
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The site is hosted as a static export on GitHub Pages. Like any web host, GitHub retains standard
            server logs (the page requested, your IP address, browser, and time) for operational purposes under
            GitHub&apos;s policies. The site itself sets no cookies and embeds no third-party scripts beyond the
            analytics described above when it is enabled.
          </p>
        </section>

        <section>
          <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
            Clearing your data
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            You can erase this site&apos;s data using your browser&apos;s settings for site data — for example, Chrome&apos;s
            &quot;Site data&quot; (or &quot;Cookies and other site data&quot;), Firefox&apos;s &quot;Manage Data&quot;, or Safari&apos;s &quot;Website Data&quot; —
            and, if your browser offers it, restrict it to just this site. A fresh visit after that behaves like a
            new reader: no progress, no highlights. Export a backup first if you want to keep what you have.
          </p>
        </section>

        <section>
          <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
            Changes
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            This page is part of the site&apos;s source, so it changes only when the source changes — the same review a
            code change gets. If something here becomes inaccurate, it gets corrected here rather than hidden in a
            policy nobody reads.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            LevelUp is open source. Questions about this page can be raised on the public source repository for
            the site.
          </p>
        </section>
      </div>
    </PageShell>
  );
}