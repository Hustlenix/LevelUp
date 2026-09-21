"use client";

import { useEffect, useState } from "react";
import { createPracticeTimer, nextTimerPhase, pauseTimer, remainingTime, startTimer } from "@/lib/practiceTimer";

const button = "min-h-11 rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-gold disabled:opacity-50";

export default function PracticeTimer({ onTime }: { onTime: (seconds: number) => void }) {
  const [timer, setTimer] = useState(() => createPracticeTimer());
  const [now, setNow] = useState(0);
  const [bankedMs, setBankedMs] = useState(0);
  const left = remainingTime(timer, now);
  const elapsed = bankedMs + (timer.phase === "focus" ? timer.focusMinutes * 60_000 - left : 0);
  const running = timer.deadline !== null;

  useEffect(() => {
    if (timer.deadline === null) return;
    const deadline = timer.deadline;
    const update = () => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) setTimer((value) => pauseTimer(value, time));
    };
    const interval = window.setInterval(update, 500);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [timer.deadline]);

  useEffect(() => { onTime(Math.floor(elapsed / 1000)); }, [elapsed, onTime]);

  function advance() {
    const paused = pauseTimer(timer, Date.now());
    if (paused.phase === "focus") setBankedMs((value) => value + paused.focusMinutes * 60_000 - paused.remainingMs);
    setTimer(nextTimerPhase(paused));
  }

  function reset(minutes: 10 | 25 = timer.focusMinutes) {
    if ((timer.started || bankedMs > 0) && !window.confirm("Reset this timer and its elapsed focus time? Your written notes will stay.")) return;
    setTimer(createPracticeTimer(minutes));
    setBankedMs(0);
  }

  const seconds = Math.ceil(left / 1000);
  return (
    <div className="rounded-xl border border-line bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">{timer.phase === "focus" ? "Focus" : "Break"} · round {timer.round}</p>
        <label className="flex items-center gap-2 text-sm">
          Rhythm
          <select className="min-h-11 rounded-lg border border-line bg-card px-2" value={timer.focusMinutes} onChange={(event) => reset(Number(event.target.value) as 10 | 25)}>
            <option value={25}>25 / 5 min</option>
            <option value={10}>10 / 2 min · gentle</option>
          </select>
        </label>
      </div>
      <p role="timer" aria-label={`${timer.phase} time remaining`} aria-live="off" className="my-4 font-display text-5xl tabular-nums tracking-tight">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </p>
      <p role="status" className="mb-3 text-sm text-ink-soft">{left === 0 ? "Time is up. Choose the next phase when you are ready." : running ? "Timer running. You can pause at any time." : timer.started ? "Paused. Resume when ready." : "Ready when you are. Each phase starts only when you choose."}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${button} bg-ink text-paper`} disabled={left === 0} onClick={() => {
          const time = Date.now();
          setNow(time);
          setTimer(running ? pauseTimer(timer, time) : startTimer(timer, time));
        }}>{running ? "Pause" : timer.started ? "Resume" : "Start timer"}</button>
        <button type="button" className={button} onClick={advance}>{timer.phase === "focus" ? left > 0 ? "Finish focus early" : "Prepare break" : left > 0 ? "End break" : "Prepare next focus"}</button>
        <button type="button" className={button} onClick={() => reset()}>Reset timer</button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">A 15-minute break is offered after every fourth focus round. Keep this page open: the timer catches up after backgrounding, but resets on reload or navigation. Elapsed time is not proof of focused work.</p>
      <a className="mt-2 inline-block text-xs underline underline-offset-4" href="https://www.pomodorotechnique.com/" target="_blank" rel="noopener noreferrer">About Francesco Cirillo’s Pomodoro Technique</a>
      <p className="mt-1 text-xs text-ink-soft">An independent, simplified starter; the 10/2 option is our adaptation, not the full method.</p>
    </div>
  );
}
