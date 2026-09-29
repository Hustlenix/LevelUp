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
        lede="Progress, notes, and highlights live in browser storage. This site is a static export — no accounts, no login, no hidden sync server. By default it sends nothing to anyone."
      />

      <div className="space-y-8">
        <section>
          <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
            The short version
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
            <li>Reading progress, missions, quiz results, reflections, protocol runs, highlights, and points are stored in browser storage — on this device, in this browser.</li>
            <li>Nothing is uploaded automatically. There is no account, hosted sync relay, or server-side personal database.</li>
            <li>Open tabs can reconcile locally. Cross-device transfer happens only when you explicitly export and import an encrypted Nexus packet or a backup.</li>
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
            Everything you create here — missions, skill progress, chapters marked complete, scroll progress, quiz
            answers, reflections, protocol runs, highlights, and points — is stored in browser storage on the device
            and browser you are using. Core LifeOS progress uses a synchronous local copy plus an IndexedDB mirror.
            It is not sent to a LevelUp server. A different browser starts fresh unless you explicitly move an
            encrypted Nexus packet or export a backup and import it there.
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
            Nexus local sync
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Mission progress is represented as an append-only local operation log. Open LevelUp tabs on the same
            origin exchange those operations through the browser&apos;s BroadcastChannel and storage events. This traffic
            stays inside your browser profile and is not an internet sync service.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The <Link className="text-gold underline-offset-2 hover:underline" href="/sync-lab/">Nexus Sync Lab</Link> can
            create a cross-device transfer file. Its contents are encrypted in your browser with AES-GCM using a key
            derived from the phrase you enter. The phrase is never stored or sent. LevelUp cannot recover a forgotten
            phrase. The packet still exposes non-secret format metadata such as its version, encryption settings, and
            creation time.
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
            Optional local AI
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Study Mode can optionally call Ollama running on the same computer as your browser. The app is locked to the
            local <code className="rounded border border-line bg-paper-deep px-1.5 py-0.5 text-xs">llama3.1:latest</code> model and accepts only a loopback Ollama address. Prompts, selected LevelUp context, responses, and saved study state are not sent to LevelUp, a cloud AI provider, or analytics, and raw prompts and full responses are not saved by the app.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The public site cannot use the site owner&apos;s computer. Every visitor who wants model-powered help must
            install and run Ollama on their own device. If Ollama is not available, Study Mode clearly uses its
            deterministic local Coach, Planner, and Tutor instead. More setup detail is included in the project&apos;s
            <code className="ml-1 rounded border border-line bg-paper-deep px-1.5 py-0.5 text-xs">docs/AI-LOCAL-OLLAMA.md</code> note.
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
            network. Full JSON backups are not encrypted; they can include mission proof and other private text. Store
            them accordingly, or use the encrypted Nexus packet when you only need to move LifeOS progress.
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
