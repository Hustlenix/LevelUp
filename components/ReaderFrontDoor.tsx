import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Check, Circle, Fingerprint, Heart, Lightbulb, MoveUpRight, ShieldCheck, Timer, TrendingUp, Users } from "lucide-react";
import type { Chapter } from "@/lib/types";
import { PRACTICE_PLANS } from "@/lib/practicePlans";

export const BOOK_ONE_LINER = "Evidence-informed lessons and practical tools for a more intentional life.";
const areas = [
  { pillar: "self", label: "Understand yourself", description: "Beliefs, identity & a clearer mind.", icon: Lightbulb, className: "area-self" },
  { pillar: "wealth", label: "Make meaningful progress", description: "Focus, ambition & work that matters.", icon: TrendingUp, className: "area-wealth" },
  { pillar: "health", label: "Protect your energy", description: "Sustainable habits & everyday capacity.", icon: Heart, className: "area-health" },
  { pillar: "love", label: "Show up for your people", description: "Connection, care & a more balanced life.", icon: Users, className: "area-love" },
];
export default function ReaderFrontDoor({ chapters }: { chapters: Chapter[] }) {
  return <div className="landing">
    <section className="landing-hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold" />A little intention. Every day.</p>
        <h1 id="home-title">Good intentions.<br />Meet <span>real progress.</span></h1>
        <p className="hero-description">A calmer place to work on yourself. Learn something useful, turn it into a small action, and build a life that feels more like you.</p>
        <div className="mt-8 flex flex-wrap items-center gap-3"><Link href="/today/" className="button-solid">Start with today <ArrowRight size={17} /></Link><Link href="/chapters/" className="button-outline">Explore the lessons</Link></div>
        <p className="mt-5 flex items-center gap-2 text-xs text-ink-faint"><Fingerprint size={15} className="shrink-0" />No account needed. Your progress stays on this device.</p>
      </div>
      <div className="hero-product">
        <div className="flex items-center justify-between text-xs text-[#d0ddd5]"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#d7eab0]" />A CLEARER PLAN. A CALMER DAY.</span><MoveUpRight size={17} /></div>
        <div className="day-preview">
          <div className="flex items-center justify-between border-b border-[#e5e9e4] pb-5"><span className="text-sm font-semibold text-[#253b31]">Your daily space</span><span className="rounded-full bg-[#eff3ee] px-2.5 py-1 text-[10px] font-medium text-[#5d6b62]">Example day</span></div>
          <p className="mt-6 text-xs text-[#647168]">One thing at a time</p><h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#20382c]">Make room for<br />what matters.</h2>
          <div className="preview-task mt-6"><span className="preview-check"><Check size={13} /></span><div><p className="text-sm font-medium text-[#344d3e]">Choose one meaningful outcome</p><p className="mt-1 text-xs text-[#69766e]">Less on the list. More intention.</p></div></div>
          <div className="preview-focus"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#dbe9d1]"><Timer size={18} /></span><div className="flex-1"><p className="text-sm font-semibold">A little uninterrupted time</p><p className="mt-1 text-xs text-[#53634e]">Focus on the next small step</p></div><span className="text-xl font-semibold tracking-tight">25<span className="ml-1 text-xs font-normal">min</span></span></div>
          <div className="preview-task"><Circle size={17} className="shrink-0 text-[#a4afa5]" /><div><p className="text-sm font-medium text-[#344d3e]">Notice what worked</p><p className="mt-1 text-xs text-[#69766e]">Keep a little evidence for tomorrow.</p></div></div>
          <Link href="/protocols/#ready-plans" className="mt-6 flex min-h-11 items-center justify-between border-t border-[#e5e9e4] pt-4 text-xs font-semibold text-[#215640]">Try a guided practice <ArrowRight size={15} /></Link>
        </div>
        <div className="mt-6 flex items-center gap-3 text-sm text-[#e3eddd]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20"><Check size={15} /></span>Small is a perfectly good place to start.</div>
      </div>
    </section>
    <div className="landing-proof" aria-label="What's inside"><span><BookOpen size={17} /><strong>{chapters.length}</strong> thoughtful lessons</span><span><Timer size={17} /><strong>{PRACTICE_PLANS.length}</strong> ready-to-use plans</span><span><ShieldCheck size={17} />Evidence you can inspect</span><span><Fingerprint size={17} />Local-first by design</span></div>
    <section id="how-it-works" className="landing-section scroll-mt-28">
      <div className="section-intro"><div><p className="eyebrow">FROM KNOWING TO DOING</p><h2>A simple rhythm.<br />A useful way forward.</h2></div><p>You don’t need another overhaul. Just a good idea, a manageable next step, and a moment to see what changed.</p></div>
      <div className="rhythm-grid">{[
        { number: "01", title: "Find an idea that clicks.", description: "Plain-language guides, real examples and research notes make the lessons easier to understand.", href: "/chapters/", cta: "Find your next lesson", icon: BookOpen },
        { number: "02", title: "Make it a small action.", description: "Start a Pomodoro, plan your morning, or try a two-minute reset. The first steps are already laid out.", href: "/protocols/#ready-plans", cta: "Choose a practice", icon: Timer },
        { number: "03", title: "Learn from your own life.", description: "Record what happened. Keep what helps, adjust what doesn’t, and take that clarity into tomorrow.", href: "/review/", cta: "Make time to reflect", icon: TrendingUp }
      ].map(step => <article key={step.number} className="rhythm-item"><div className="flex items-center justify-between"><step.icon size={22} strokeWidth={1.5} /><span className="text-xs tabular-nums text-ink-faint">{step.number}</span></div><h3>{step.title}</h3><p>{step.description}</p><Link href={step.href}>{step.cta}<ArrowUpRight size={15} /></Link></article>)}</div>
    </section>
    <section className="landing-section" aria-labelledby="areas-title">
      <div className="section-intro"><div><p className="eyebrow">START WHERE YOU ARE</p><h2 id="areas-title">What could use<br />a little more attention?</h2></div><Link href="/chapters/" className="text-link">Browse all lessons <ArrowRight size={16} /></Link></div>
      <div className="area-grid">{areas.map(area => <Link key={area.pillar} href={`/chapters/?pillar=${area.pillar}`} className={`area-card ${area.className}`}><span className="area-icon"><area.icon size={27} strokeWidth={1.4} /></span><span className="area-content"><span className="mb-2 block text-[11px] font-medium uppercase tracking-widest opacity-65">{area.pillar}</span><h3>{area.label}</h3><p>{area.description}</p></span><ArrowUpRight size={19} className="shrink-0 self-end" /></Link>)}</div>
    </section>
    <section className="evidence-panel"><div className="evidence-grades" aria-label="Evidence grades A through D">{["A", "B", "C", "D"].map((grade, index) => <span key={grade} style={{ opacity: 1 - index * .16 }}>{grade}</span>)}<span className="mt-4 block text-xs text-ink-faint">Confidence, not certainty.</span></div><div><p className="eyebrow">CURIOUS, NOT CREDULOUS</p><h2>Good ideas should<br />stand up to questions.</h2><p>Self-development has plenty of big claims. Here, the research and its limitations stay visible. Evidence grades describe the claims—not a promise that an exercise will work for everyone.</p><Link href="/audit/" className="text-link">See how we check the evidence <ArrowRight size={16} /></Link></div></section>
    <section className="landing-close"><div><p className="eyebrow">NO PERFECT ROUTINE REQUIRED</p><h2>Your next chapter<br />starts with one small step.</h2></div><div><Link href="/today/" className="button-solid">Make today a little better <ArrowRight size={17} /></Link><p className="mt-4 text-xs text-ink-faint">Read a lesson. Try a practice. Begin again.</p></div></section>
  </div>;
}
