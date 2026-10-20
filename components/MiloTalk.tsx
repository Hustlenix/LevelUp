"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SaveAction } from "@/components/SavedActions";
import { useSmallSteps } from "@/lib/smallStepsStore";

type Action = { kind: "save"; label: string; task: string } | { kind: "open"; label: string; path: string };
type Reply = { text: string; actions: Action[] };
type Message = { role: "user" | "assistant"; content: string };
const endpoint = process.env.NEXT_PUBLIC_MILO_API_URL || "";
const routes = ["/small-steps/", "/protocols/", "/today/"];
const prompts = ["Help me start", "I got interrupted", "Make this smaller", "What should I try next?"];
function validReply(value: unknown): value is Reply {
  if (!value || typeof value !== "object") return false;
  const reply = value as Reply;
  return typeof reply.text === "string" && !!reply.text.trim() && reply.text.length <= 1200 && Array.isArray(reply.actions) && reply.actions.length <= 2 && reply.actions.every(a => a && typeof a.label === "string" && a.label.length <= 80 && ((a.kind === "open" && routes.includes(a.path)) || (a.kind === "save" && typeof a.task === "string" && !!a.task.trim() && a.task.length <= 240)));
}
function offline(message: string): Reply {
  const interrupted = /interrupt|stuck|overwhelm/i.test(message);
  return { text: interrupted ? "Leave one sentence about where you stopped. When you return, open Small Steps and try just the next visible move for two minutes." : "Choose one thing you can touch or open. Give it one action: open the notes, write the heading, or put the shoes by the door. Try two minutes, then decide whether to continue.", actions: [{ kind: "open", label: "Open Small Steps", path: "/small-steps/" }] };
}
export default function MiloTalk({ onPose }: { onPose?: (pose: "think" | "wave") => void }) {
  const { state } = useSmallSteps();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [reply, setReply] = useState<Reply | null>(null);
  const [cloud, setCloud] = useState(false);
  const [attachTask, setAttachTask] = useState(false);
  const [attachSummary, setAttachSummary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const session = useRef("");
  const inFlight = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  const selectedContext = [attachTask && state.task ? `Current task: ${state.task}` : "", attachSummary ? `Recorded Small Steps attempts: ${state.history.length}. Saved next actions: ${state.queue?.length ?? 0}.` : ""].filter(Boolean).join("\n");
  async function send() {
    const text = message.trim();
    if (!text || text.length > 500 || inFlight.current) return;
    inFlight.current = true; setBusy(true); setNotice(""); onPose?.("think");
    let result = offline(text);
    let source = "Offline suggestion · authored guidance";
    if (cloud && endpoint.startsWith("https://")) {
      const abort = new AbortController(); controller.current = abort;
      const timeout = window.setTimeout(() => abort.abort(), 18000);
      try {
        if (!session.current) {
          try { session.current = sessionStorage.getItem("levelup-milo-session") || crypto.randomUUID(); sessionStorage.setItem("levelup-milo-session", session.current); }
          catch { session.current = crypto.randomUUID(); }
        }
        const response = await fetch(endpoint, { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: history.slice(-6), context: selectedContext, session: session.current }), signal: abort.signal });
        if (!response.ok) throw new Error(response.status === 429 ? "Daily or minute limit reached." : "Cloud Milo is unavailable.");
        const data: unknown = await response.json();
        if (!validReply(data)) throw new Error("Cloud Milo returned an unreadable reply.");
        result = data; source = "Hack Club AI reply";
      } catch (error) {
        source = `${error instanceof Error && error.name !== "AbortError" ? error.message : "Cloud request timed out."} Showing an authored offline suggestion.`;
      } finally { window.clearTimeout(timeout); }
    }
    setHistory(previous => [...previous, { role: "user" as const, content: text }, { role: "assistant" as const, content: result.text }].slice(-6));
    setReply(result); setNotice(source); setMessage(""); setBusy(false); inFlight.current = false; onPose?.("wave");
  }
  return <div className="space-y-4 text-sm">
    <p className="text-ink-soft">One manageable next move. You choose what to save or start.</p>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={cloud} disabled={!endpoint.startsWith("https://") || busy} onChange={e => { setCloud(e.target.checked); setHistory([]); setReply(null); }} />Use Hack Club AI for this conversation</label>
    <p className="text-xs text-ink-soft">{endpoint ? "When enabled, sending shares your message, the last three exchanges, and selected context with Hack Club and its model providers. This app does not save chat history." : "Cloud Milo is not connected in this build. Authored offline guidance is available below."}</p>
    {cloud && <fieldset className="space-y-2 rounded-lg border border-line p-3"><legend>Include context</legend><label className="flex gap-2"><input type="checkbox" checked={attachTask} onChange={e => setAttachTask(e.target.checked)} disabled={!state.task || busy} />Current task</label><label className="flex gap-2"><input type="checkbox" checked={attachSummary} onChange={e => setAttachSummary(e.target.checked)} disabled={busy} />Small Steps counts</label><pre className="whitespace-pre-wrap break-words font-sans text-xs">{selectedContext || "No task or progress context will be sent."}</pre><p className="text-xs text-ink-faint">Private notes and reflections are never attached automatically.</p></fieldset>}
    <div className="grid gap-2">{prompts.map(prompt => <button key={prompt} disabled={busy} type="button" className="min-h-11 rounded-lg border border-line px-3 py-2 text-left hover:border-gold" onClick={() => setMessage(prompt)}>{prompt}</button>)}</div>
    {history.length > 0 && <details><summary className="cursor-pointer py-2">Recent conversation</summary><ol className="space-y-3">{history.map((item, i) => <li key={i} className="break-words"><strong>{item.role === "user" ? "You" : "Milo"}: </strong>{item.content}</li>)}</ol></details>}
    <form onSubmit={e => { e.preventDefault(); void send(); }} className="space-y-2"><label htmlFor="milo-message">Message Milo</label><textarea id="milo-message" value={message} onChange={e => setMessage(e.target.value)} maxLength={500} disabled={busy} rows={3} className="w-full rounded-lg border border-line bg-paper p-3 text-ink" placeholder="What would you like help starting?" /><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-ink-faint">{message.length}/500</span><button type="submit" disabled={busy || !message.trim()} className="min-h-11 rounded-lg bg-ink px-4 py-2 text-paper disabled:opacity-50">{busy ? "Waiting for Milo…" : cloud ? "Send to Hack Club" : "Get offline guidance"}</button></div></form>
    <p role="status" className="text-xs text-ink-soft">{notice}</p>
    {reply && <div className="space-y-3 rounded-xl border border-line bg-paper p-3"><p className="whitespace-pre-wrap break-words leading-relaxed">{reply.text}</p>{reply.actions.map((action, index) => action.kind === "save" ? <SaveAction key={index} task={action.task} action={action.task} source="" minutes={2} /> : <Link key={index} href={action.path} className="inline-flex min-h-11 items-center text-gold underline">{action.label}</Link>)}</div>}
    <button type="button" disabled={busy} onClick={() => { setHistory([]); setReply(null); setMessage(""); setNotice("Conversation cleared."); setCloud(false); setAttachTask(false); setAttachSummary(false); }} className="min-h-11 text-xs underline">Clear conversation and choices</button>
  </div>;
}
