"use client";

import { useState } from "react";
import { useOSStore } from "@/lib/os/store";
import { addPortfolioArtifact, deletePortfolioArtifact, updatePortfolioArtifact, usePortfolioStore, type PortfolioArtifactKind } from "@/lib/portfolio";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40";
const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
const secondaryClass = "inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export default function PortfolioPanel() {
  const artifacts = usePortfolioStore();
  const state = useOSStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<PortfolioArtifactKind>("evidence");
  const [goalId, setGoalId] = useState("");
  const [chapterSlug, setChapterSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    const goal = goalId ? state.goals[goalId] : undefined;
    addPortfolioArtifact({ title: title.trim(), description: description.trim(), kind, ...(goal ? { goalId: goal.id } : {}), ...(chapterSlug.trim() ? { chapterSlug: chapterSlug.trim() } : {}) });
    setTitle(""); setDescription(""); setChapterSlug("");
  }

  return <div className="space-y-5"><form className="rounded-2xl border border-line bg-card p-5 shadow-xs sm:p-6" onSubmit={add}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">New portfolio record</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">Keep the proof, not just the plan</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="text-xs font-semibold text-ink-soft">Title</span><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="First uninterrupted focus block" /></label><label className="block sm:col-span-2"><span className="text-xs font-semibold text-ink-soft">Description</span><textarea className={inputClass} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What did you make, learn, or prove?" /></label><label className="block"><span className="text-xs font-semibold text-ink-soft">Kind</span><select className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as PortfolioArtifactKind)}><option value="artifact">Artifact</option><option value="evidence">Evidence</option><option value="reflection">Reflection</option><option value="result">Result</option></select></label><label className="block"><span className="text-xs font-semibold text-ink-soft">Goal (optional)</span><select className={inputClass} value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">Unlinked</option>{Object.values(state.goals).map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label><label className="block sm:col-span-2"><span className="text-xs font-semibold text-ink-soft">Chapter slug (optional)</span><input className={inputClass} value={chapterSlug} onChange={(event) => setChapterSlug(event.target.value)} placeholder="the-one-hour-law" /></label></div><button type="submit" className={`mt-5 ${buttonClass}`}>Save to portfolio</button></form>{artifacts.length ? <div className="grid gap-4 lg:grid-cols-2">{artifacts.map((artifact) => <article key={artifact.id} className="rounded-2xl border border-line bg-card p-5 shadow-xs">{editingId === artifact.id ? <div><label className="block text-xs font-semibold text-ink-soft">Title<input className={inputClass} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></label><label className="mt-3 block text-xs font-semibold text-ink-soft">Description<textarea className={inputClass} rows={3} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} /></label><div className="mt-3 flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={() => { updatePortfolioArtifact(artifact.id, { title: editTitle.trim(), description: editDescription.trim() }); setEditingId(null); }}>Save changes</button><button type="button" className={secondaryClass} onClick={() => setEditingId(null)}>Cancel</button></div></div> : <><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-gold">{artifact.kind}</p><h2 className="mt-1 font-display text-lg font-semibold text-ink">{artifact.title}</h2></div><span className="text-xs text-ink-faint">{artifact.createdAt.slice(0, 10)}</span></div><p className="mt-3 text-sm leading-relaxed text-ink-soft">{artifact.description}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={secondaryClass} onClick={() => { setEditingId(artifact.id); setEditTitle(artifact.title); setEditDescription(artifact.description); }}>Edit</button><button type="button" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500" onClick={() => { if (window.confirm("Delete this portfolio record?")) deletePortfolioArtifact(artifact.id); }}>Delete</button></div></>}</article>)}</div> : <div className="rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft">Your portfolio is empty. Add a concrete artifact, result, reflection, or piece of evidence tied to the work you are doing.</div>}</div>;
}
