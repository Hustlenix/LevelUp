import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Check, Circle, Fingerprint, Heart, Lightbulb, MoveUpRight, ShieldCheck, Timer, TrendingUp, Users } from "lucide-react";
import type { Chapter } from "@/lib/types";
import { PRACTICE_PLANS } from "@/lib/practicePlans";

export const BOOK_ONE_LINER = "Evidence-informed lessons and practical tools for a more intentional life.";
const areas = [
  { pillar: "self", label: "Belief & identity", description: "Mental models, expectations, and self-awareness.", icon: Lightbulb, className: "area-self" },
  { pillar: "wealth", label: "Focus & achievement", description: "Attention, deliberate work, and career progress.", icon: TrendingUp, className: "area-wealth" },
  { pillar: "health", label: "Energy & discipline", description: "Physical capacity, consistent habits, and recovery.", icon: Heart, className: "area-health" },
  { pillar: "love", label: "Relationships & balance", description: "Connection, communication, and commitments.", icon: Users, className: "area-love" },
];
export default function ReaderFrontDoor({ chapters }: { chapters: Chapter[] }) {
  return <div className="landing">
    <section className="landing-hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <p className="eyebrow">READ. TEST. APPLY.</p>
        <h1 id="home-title">The Level Up<br /><span>Manual.</span></h1>
        <p className="hero-description">{chapters.length} evidence-audited chapters on belief, identity, focus, and the practical work of getting better. Read the ideas. Put them to work.</p>
        <div className="mt-8 flex flex-wrap items-center gap-3"><Link href="/chapters/" className="button-solid">Read the manual <ArrowRight size={17} /></Link><Link href="/today/" className="button-outline">Open Today</Link></div>
        <p className="mt-5 flex items-center gap-2 text-xs text-ink-faint"><Fingerprint size={15} className="shrink-0" />No account needed. Your progress stays on this device.</p>
      </div>
      <div className="hero-product">
        <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-ink-soft"><span>FROM LESSON TO ACTION</span><MoveUpRight size={17} /></div>
        <div className="day-preview">
          <div className="flex items-center justify-between border-b border-line pb-5"><span className="text-sm font-semibold text-ink">Daily workspace</span><span className="border border-line px-2.5 py-1 text-[0.625rem] font-medium text-ink-soft">Example day</span></div>
          <p className="mt-6 text-xs uppercase tracking-wider text-gold">Today’s outcome</p><h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-ink">Finish one chapter.<br />Apply one idea.</h2>
          <div className="preview-task mt-6"><span className="preview-check"><Check size={13} /></span><div><p className="text-sm font-medium text-ink">Choose a specific outcome</p><p className="mt-1 text-xs text-ink-soft">Write down what finished looks like.</p></div></div>
          <div className="preview-focus"><Timer size={20} className="shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Pomodoro focus block</p><p className="mt-1 text-xs text-ink-soft">One task. Distractions out of reach.</p></div><span className="text-xl font-semibold tabular-nums">25<span className="ml-1 text-xs font-normal">min</span></span></div>
          <div className="preview-task"><Circle size={17} className="shrink-0 text-ink-faint" /><div><p className="text-sm font-medium text-ink">Record the result</p><p className="mt-1 text-xs text-ink-soft">What worked? What changes next time?</p></div></div>
          <Link href="/protocols/#ready-plans" className="mt-6 flex min-h-11 items-center justify-between border-t border-line pt-4 text-xs font-semibold text-gold">Open ready-to-use plans <ArrowRight size={15} /></Link>
        </div>
        <p className="mt-5 text-xs text-ink-soft">Goal → Session → Review. Your own record, stored locally.</p>
      </div>
    </section>
    <div className="landing-proof" aria-label="What's inside"><span><BookOpen size={17} /><strong>{chapters.length}</strong> chapters</span><span><Timer size={17} /><strong>{PRACTICE_PLANS.length}</strong> ready-to-use plans</span><span><ShieldCheck size={17} />Claim-by-claim evidence grades</span><span><Fingerprint size={17} />No account or cloud sync</span></div>
    <section id="how-it-works" className="landing-section scroll-mt-28">
      <div className="section-intro"><div><p className="eyebrow">THE WORKFLOW</p><h2>Read. Practice. Review.</h2></div><p>Each chapter has a plain-language guide. Each practice has steps you can follow. Your workspace keeps the results.</p></div>
      <div className="rhythm-grid">{[
        { number: "01", title: "Understand the lesson", description: "Read the guide, examine the examples, and check the research behind its claims.", href: "/chapters/", cta: "Browse chapters", icon: BookOpen },
        { number: "02", title: "Run a practice", description: "Use a Pomodoro, a morning plan, or a two-minute reset. Follow the steps and record what you did.", href: "/protocols/#ready-plans", cta: "Browse practices", icon: Timer },
        { number: "03", title: "Review the result", description: "Compare your intended outcome with the actual result. Decide what to repeat or change.", href: "/review/", cta: "Open Review", icon: TrendingUp }
      ].map(step => <article key={step.number} className="rhythm-item"><div className="flex items-center justify-between"><step.icon size={22} strokeWidth={1.5} /><span className="text-xs tabular-nums text-ink-faint">{step.number}</span></div><h3>{step.title}</h3><p>{step.description}</p><Link href={step.href}>{step.cta}<ArrowUpRight size={15} /></Link></article>)}</div>
    </section>
    <section className="landing-section" aria-labelledby="areas-title">
      <div className="section-intro"><div><p className="eyebrow">FOUR PILLARS</p><h2 id="areas-title">Choose a subject.</h2></div><Link href="/chapters/" className="text-link">Browse all lessons <ArrowRight size={16} /></Link></div>
      <div className="area-grid">{areas.map(area => <Link key={area.pillar} href={`/chapters/?pillar=${area.pillar}`} className={`area-card ${area.className}`}><span className="area-icon"><area.icon size={27} strokeWidth={1.4} /></span><span className="area-content"><span className="mb-2 block text-[0.6875rem] font-medium uppercase tracking-widest opacity-65">{area.pillar}</span><h3>{area.label}</h3><p>{area.description}</p></span><ArrowUpRight size={19} className="shrink-0 self-end" /></Link>)}</div>
    </section>
    <section className="evidence-panel"><div className="evidence-grades" aria-label="Evidence grades A through D">{["A", "B", "C", "D"].map((grade, index) => <span key={grade} style={{ opacity: 1 - index * .16 }}>{grade}</span>)}<span className="mt-4 block text-xs text-ink-faint">Confidence, not certainty.</span></div><div><p className="eyebrow">CURIOUS, NOT CREDULOUS</p><h2>Good ideas should<br />stand up to questions.</h2><p>Self-development has plenty of big claims. Here, the research and its limitations stay visible. Evidence grades describe the claims—not a promise that an exercise will work for everyone.</p><Link href="/audit/" className="text-link">See how we check the evidence <ArrowRight size={16} /></Link></div></section>
    <section className="landing-close"><div><p className="eyebrow">YOUR WORKSPACE</p><h2>Put the manual to work.</h2></div><div><Link href="/today/" className="button-solid">Open Today <ArrowRight size={17} /></Link><p className="mt-4 text-xs text-ink-faint">Goals, focus sessions, habits, and a record of what happened.</p></div></section>
  </div>;
}
