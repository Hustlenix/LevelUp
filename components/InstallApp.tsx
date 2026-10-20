"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let pending: InstallEvent | null = null;
const listeners = new Set<() => void>();
function publish(value: InstallEvent | null) { pending = value; listeners.forEach(listener => listener()); }
function subscribePrompt(callback: () => void) { listeners.add(callback); return () => { listeners.delete(callback); }; }
export function InstallPromptCapture() {
  useEffect(() => {
    const ready = (event: Event) => { event.preventDefault(); publish(event as InstallEvent); };
    const done = () => publish(null);
    window.addEventListener("beforeinstallprompt", ready); window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", ready); window.removeEventListener("appinstalled", done); };
  }, []);
  return null;
}
function subscribeDisplay(callback: () => void) { const query = matchMedia("(display-mode: standalone)"); query.addEventListener("change", callback); return () => query.removeEventListener("change", callback); }
export default function InstallApp() {
  const prompt = useSyncExternalStore(subscribePrompt, () => pending, () => null);
  const setPrompt = publish;
  const [accepted, setInstalled] = useState(false);
  const standalone = useSyncExternalStore(subscribeDisplay, () => matchMedia("(display-mode: standalone)").matches, () => false);
  const installed = standalone || accepted;
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const done = () => { setInstalled(true); publish(null); };
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("appinstalled", done); };
  }, []);
  return <section className="my-8 rounded-xl border border-line bg-card p-5"><h2 className="font-display text-2xl">Keep LevelUp close</h2><p className="mt-3 text-sm text-ink-soft">Install it for a separate window and a home screen shortcut. Visit the pages you need while online before using them offline.</p>{installed ? <p className="mt-3 text-sm">LevelUp is running as an installed app.</p> : prompt ? <button type="button" className="mt-4 min-h-11 rounded-lg bg-ink px-4 text-paper" onClick={async () => { try { await prompt.prompt(); const choice = await prompt.userChoice; setNotice(choice.outcome === "accepted" ? "Installation requested." : "You can install later from your browser menu."); setPrompt(null); } catch { setNotice("Use your browser menu to install LevelUp."); } }}>Install LevelUp</button> : <p className="mt-3 text-sm">On iPhone or iPad: Safari → Share → Add to Home Screen. On Chrome or Edge: open the browser menu and choose Install app or Add to Home screen when available.</p>}<p role="status" className="mt-2 text-sm">{notice}</p></section>;
}
