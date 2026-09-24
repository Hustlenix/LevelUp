"use client";

import { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ArrowRight
} from "lucide-react";
import type { Protocol } from "@/lib/types";
import { emitCompanionEvent } from "@/lib/companion";
import { 
  playBellChime, 
  logProtocolExecution, 
  saveCalibration, 
  logFocusSession, 
  logUrgePause 
} from "@/lib/actionTools";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

interface ProtocolRunnerModalProps {
  protocol: Protocol | null;
  onClose: () => void;
  onCompleted?: () => void;
}

export default function ProtocolRunnerModal({ protocol, onClose, onCompleted }: ProtocolRunnerModalProps) {
  useEffect(() => {
    if (!protocol) return;
    trackEvent(ANALYTICS_EVENTS.protocolStarted, { protocol_id: protocol.num });
    emitCompanionEvent("protocol_started", { note: protocol.num });
  }, [protocol]);

  if (!protocol) return null;
  const handleCompleted = () => {
    trackEvent(ANALYTICS_EVENTS.protocolCompleted, { protocol_id: protocol.num });
    emitCompanionEvent("protocol_completed", { note: protocol.num });
    onCompleted?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-paper px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 font-display text-xs font-bold text-gold">
              Protocol {protocol.num}
            </span>
            <h2 className="font-display text-lg font-bold text-ink">
              {protocol.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {protocol.num === "2.3" ? (
            <MorningCalibrationRunner protocol={protocol} onClose={onClose} onCompleted={handleCompleted} />
          ) : protocol.num === "2.6" || protocol.num === "2.9" ? (
            <FocusSprintRunner protocol={protocol} onClose={onClose} onCompleted={handleCompleted} />
          ) : protocol.num === "2.8" ? (
            <BoredomToleranceRunner protocol={protocol} onClose={onClose} onCompleted={handleCompleted} />
          ) : protocol.num === "2.4" ? (
            <IdentityStackRunner protocol={protocol} onClose={onClose} onCompleted={handleCompleted} />
          ) : protocol.num === "2.1" || protocol.num === "2.2" ? (
            <AuditDiagnosticRunner protocol={protocol} onClose={onClose} onCompleted={handleCompleted} />
          ) : (
            <GenericProtocolRunner protocol={protocol} onClose={onClose} onCompleted={handleCompleted} />
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 1. MORNING CALIBRATION RUNNER (Protocol 2.3)
// -------------------------------------------------------------
function MorningCalibrationRunner({ protocol, onClose, onCompleted }: { protocol: Protocol; onClose: () => void; onCompleted?: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [primaryOutcome, setPrimaryOutcome] = useState("");
  const [physicalAction, setPhysicalAction] = useState("");
  const [actionTime, setActionTime] = useState("");
  const [obstacleReframe, setObstacleReframe] = useState("Obstacles are information, not personal verdicts.");
  
  // Box breathing pacer state
  const [breathPhase, setBreathPhase] = useState<"Inhale" | "Hold" | "Exhale" | "Hold ">("Inhale");
  const [breathSeconds, setBreathSeconds] = useState(120); // 2 minutes
  const [breathActive, setBreathActive] = useState(false);
  const [cycleTick, setCycleTick] = useState(0);

  useEffect(() => {
    if (!breathActive) return;
    const interval = setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev <= 1) {
          setBreathActive(false);
          playBellChime("finish");
          return 0;
        }
        return prev - 1;
      });

      setCycleTick((prev) => {
        const next = (prev + 1) % 16; // 4s inhale, 4s hold, 4s exhale, 4s hold
        if (next === 0) {
          setBreathPhase("Inhale");
          playBellChime("breath");
        } else if (next === 4) {
          setBreathPhase("Hold");
        } else if (next === 8) {
          setBreathPhase("Exhale");
          playBellChime("breath");
        } else if (next === 12) {
          setBreathPhase("Hold ");
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [breathActive]);

  const handleFinish = () => {
    saveCalibration({
      primaryOutcome,
      physicalAction,
      actionTime,
      obstacleReframe,
      breathingCompleted: breathSeconds < 110,
      completed: true,
    });
    logProtocolExecution(
      protocol.num,
      protocol.title,
      { primaryOutcome, physicalAction, actionTime, obstacleReframe },
      120 - breathSeconds
    );
    playBellChime("finish");
    if (onCompleted) onCompleted();
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* Stepper indicator */}
      <div className="flex items-center justify-between border-b border-line pb-3 text-xs">
        <span className="font-display font-medium text-gold uppercase tracking-wider">
          Step {step} of 4: {
            step === 1 ? "Name Primary Outcome" :
            step === 2 ? "Specify Implementation Plan" :
            step === 3 ? "Reframe Obstacles" :
            "2-Minute Box Breathing Pacer"
          }
        </span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                s <= step ? "bg-gold" : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            Before checking notifications or incoming requests, define the single physical outcome that would make today count.
          </p>
          <div className="rounded-xl border border-line bg-paper-deep/40 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
              The One Critical Outcome for Today
            </label>
            <input
              type="text"
              value={primaryOutcome}
              onChange={(e) => setPrimaryOutcome(e.target.value)}
              placeholder="e.g. Finish client proposal draft; complete workout block"
              className="mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!primaryOutcome.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-paper transition-colors cta-hover disabled:opacity-40"
            >
              Next Step <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            Plan-making discharges goal intrusion. Research demonstrates that specifying the exact physical action and time trigger dramatically increases execution.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-paper-deep/40 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Next Physical Action
              </label>
              <input
                type="text"
                value={physicalAction}
                onChange={(e) => setPhysicalAction(e.target.value)}
                placeholder="e.g. Open Figma & draft 3 screens"
                className="mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none"
              />
            </div>
            <div className="rounded-xl border border-line bg-paper-deep/40 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                When Exactly Will You Do It?
              </label>
              <input
                type="text"
                value={actionTime}
                onChange={(e) => setActionTime(e.target.value)}
                placeholder="e.g. 9:30 AM after coffee"
                className="mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft hover:border-gold"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!physicalAction.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-paper transition-colors cta-hover disabled:opacity-40"
            >
              Next Step <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            Pre-commit your mental interpretation before difficulties arrive. When friction occurs today, you treat it as calibration data, not failure.
          </p>
          <div className="rounded-xl border border-line bg-paper-deep/40 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Chosen Interpretation Mantra
            </label>
            <textarea
              rows={2}
              value={obstacleReframe}
              onChange={(e) => setObstacleReframe(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-paper p-3 text-sm text-ink focus:border-gold focus:outline-none"
            />
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft hover:border-gold"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-paper transition-colors cta-hover"
            >
              Go to Breathing Pacer <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col items-center space-y-6 py-2 text-center">
          <p className="max-w-md text-sm text-ink-soft">
            Optional physiological calm: 2 minutes of deliberate 4-4-4-4 box breathing to settle heart-rate variability before your first decision.
          </p>

          {/* Animated breath ring */}
          <div className="relative flex h-44 w-44 items-center justify-center">
            <div 
              className={`absolute inset-0 rounded-full border-4 border-gold/30 transition-transform duration-1000 ease-in-out ${
                breathActive && (breathPhase === "Inhale" || breathPhase === "Hold") 
                  ? "scale-110 border-gold" 
                  : "scale-90 border-gold/20"
              }`} 
            />
            <div className="flex flex-col items-center">
              <span className="font-display text-2xl font-bold tracking-tight text-ink">
                {breathPhase}
              </span>
              {breathActive && (
                <span className="font-mono text-sm font-semibold text-gold mt-0.5">
                  {(cycleTick % 4) + 1} / 4
                </span>
              )}
              <span className="font-mono text-xs text-ink-faint mt-1">
                {Math.floor(breathSeconds / 60)}:{(breathSeconds % 60).toString().padStart(2, "0")} left
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setBreathActive(!breathActive);
                if (!breathActive) playBellChime("start");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-paper transition-colors cta-hover"
            >
              {breathActive ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Start Pacer</>}
            </button>
            <button
              onClick={handleFinish}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2 text-sm font-semibold text-paper transition-colors cta-hover"
            >
              <CheckCircle2 className="h-4 w-4" /> Complete Calibration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. FOCUS SPRINT RUNNER (Protocol 2.6 & 2.9)
// -------------------------------------------------------------
function FocusSprintRunner({ protocol, onClose, onCompleted }: { protocol: Protocol; onClose: () => void; onCompleted?: () => void }) {
  const [taskName, setTaskName] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [distractions, setDistractions] = useState<string[]>([]);
  const [distractionInput, setDistractionInput] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [oneLineWin, setOneLineWin] = useState("");

  const handleSelectMinutes = (m: number) => {
    setSelectedMinutes(m);
    setSecondsRemaining(m * 60);
  };

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          setIsFinished(true);
          playBellChime("finish");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  const handleAddDistraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distractionInput.trim()) return;
    setDistractions([...distractions, distractionInput.trim()]);
    setDistractionInput("");
  };

  const handleCompleteSession = () => {
    const completedSeconds = selectedMinutes * 60 - secondsRemaining;
    logFocusSession({
      taskName: taskName || "Deep Work Block",
      durationMinutes: selectedMinutes,
      completedSeconds,
      distractions,
      oneLineWin: oneLineWin || "Finished focus session",
    });
    logProtocolExecution(
      protocol.num,
      protocol.title,
      { task: taskName, win: oneLineWin, distractionsCount: String(distractions.length) },
      completedSeconds
    );
    playBellChime("finish");
    if (onCompleted) onCompleted();
    onClose();
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const progressPercent = ((selectedMinutes * 60 - secondsRemaining) / (selectedMinutes * 60)) * 100;

  if (isFinished) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Sparkles className="h-8 w-8" />
        </div>
        <div>
          <h3 className="font-display text-2xl font-bold text-ink">Winner&apos;s Loop Completed!</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Say the outcome aloud and log your one-line win to bank the progress.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper-deep/40 p-4 text-left">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Log Your 1-Line Win
          </label>
          <input
            type="text"
            value={oneLineWin}
            onChange={(e) => setOneLineWin(e.target.value)}
            placeholder="e.g. Finished draft of section 2; organized 15 client leads"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
            autoFocus
          />
        </div>
        <button
          onClick={handleCompleteSession}
          className="rounded-full bg-gold px-8 py-2.5 font-display text-sm font-semibold text-paper cta-hover transition-colors"
        >
          Bank Win & Close (+35 XP)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup phase if not started */}
      {!isActive && secondsRemaining === selectedMinutes * 60 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
              What Specific Deliverable Will You Produce?
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Draft 500 words, write the login test, fix bug #42"
              className="mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint mb-2">
              Block Length
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { m: 25, label: "25m Sprint" },
                { m: 50, label: "50m Flow" },
                { m: 90, label: "90m God-Mode" },
              ].map(({ m, label }) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMinutes(m)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedMinutes === m
                      ? "border-gold bg-gold/15 text-gold font-bold"
                      : "border-line bg-paper hover:border-gold/50 text-ink-soft"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Timer Display */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-paper-deep/30 py-8">
        <div className="font-mono text-5xl font-bold tracking-tight text-ink sm:text-6xl">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <p className="mt-2 text-sm font-medium text-ink-soft">
          {taskName ? `Target: ${taskName}` : "Single-Task Focus Block"}
        </p>

        {/* Progress bar */}
        <div className="mt-4 h-2 w-64 rounded-full bg-line overflow-hidden">
          <div 
            className="h-full bg-gold transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Timer controls */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => {
              setIsActive(!isActive);
              playBellChime(isActive ? "tick" : "start");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-paper transition-colors cta-hover"
          >
            {isActive ? <><Pause className="h-4 w-4" /> Pause Sprint</> : <><Play className="h-4 w-4" /> {secondsRemaining < selectedMinutes * 60 ? "Resume" : "Start Sprint"}</>}
          </button>
          <button
            onClick={() => {
              setIsActive(false);
              setSecondsRemaining(selectedMinutes * 60);
            }}
            className="rounded-full border border-line p-2.5 text-ink-faint hover:border-gold hover:text-ink transition-colors"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {secondsRemaining < selectedMinutes * 60 && (
            <button
              onClick={() => setIsFinished(true)}
              className="rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-gold hover:border-gold"
            >
              Finish Early
            </button>
          )}
        </div>
      </div>

      {/* Distraction Dump / Park Pad */}
      <div className="rounded-xl border border-line bg-paper p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Distraction Dump (Park thoughts here, do not switch tabs)
          </label>
          <span className="text-[11px] text-ink-faint">{distractions.length} parked</span>
        </div>
        <form onSubmit={handleAddDistraction} className="mt-2 flex gap-2">
          <input
            type="text"
            value={distractionInput}
            onChange={(e) => setDistractionInput(e.target.value)}
            placeholder="Intrusive thought, urge to check something..."
            className="flex-1 rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint/60 focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-paper-deep px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-gold hover:text-paper transition-colors"
          >
            Park
          </button>
        </form>
        {distractions.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-ink-soft">
            {distractions.map((d, i) => (
              <li key={i} className="flex items-center gap-2 rounded bg-paper-deep/60 px-2.5 py-1">
                <span className="text-gold">✦</span>
                <span className="line-through opacity-80">{d}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. BOREDOM TOLERANCE & URGE DELAYER (Protocol 2.8)
// -------------------------------------------------------------
function BoredomToleranceRunner({ protocol, onClose, onCompleted }: { protocol: Protocol; onClose: () => void; onCompleted?: () => void }) {
  const [mode, setMode] = useState<"10s-delay" | "30m-fast">("10s-delay");

  // 10s delay state
  const [delayRemaining, setDelayRemaining] = useState(10);
  const [delayActive, setDelayActive] = useState(false);
  const [urgeTrigger, setUrgeTrigger] = useState("Phone check");
  const [delayCompleted, setDelayCompleted] = useState(false);

  // 30m fast state
  const [fastRemaining, setFastRemaining] = useState(30 * 60);
  const [fastActive, setFastActive] = useState(false);

  useEffect(() => {
    if (!delayActive) return;
    const t = setInterval(() => {
      setDelayRemaining((p) => {
        if (p <= 1) {
          setDelayActive(false);
          setDelayCompleted(true);
          playBellChime("finish");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [delayActive]);

  useEffect(() => {
    if (!fastActive) return;
    const t = setInterval(() => {
      setFastRemaining((p) => {
        if (p <= 1) {
          setFastActive(false);
          playBellChime("finish");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [fastActive]);

  const handleLogUrge = (resisted: boolean) => {
    logUrgePause(urgeTrigger, 10 - delayRemaining, resisted);
    logProtocolExecution(
      protocol.num,
      protocol.title,
      { mode: "10s-urge-delay", trigger: urgeTrigger, resisted: String(resisted) },
      10
    );
    if (onCompleted) onCompleted();
    onClose();
  };

  return (
    <div className="space-y-6">
      <div className="flex rounded-lg border border-line bg-paper p-1 text-sm font-medium">
        <button
          onClick={() => setMode("10s-delay")}
          className={`flex-1 rounded-md py-1.5 transition-colors ${
            mode === "10s-delay" ? "bg-gold text-paper font-bold" : "text-ink-soft hover:text-ink"
          }`}
        >
          10-Second Urge Delay
        </button>
        <button
          onClick={() => setMode("30m-fast")}
          className={`flex-1 rounded-md py-1.5 transition-colors ${
            mode === "30m-fast" ? "bg-gold text-paper font-bold" : "text-ink-soft hover:text-ink"
          }`}
        >
          30-Min Stimulation Fast
        </button>
      </div>

      {mode === "10s-delay" ? (
        <div className="space-y-5 text-center">
          <p className="text-sm text-ink-soft">
            Before giving in to a compulsive urge (checking your phone, social media, snacking), insert a conscious 10-second delay. State what you are about to do.
          </p>

          <div className="rounded-xl border border-line bg-paper-deep/30 p-4 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
              What is the urge right now?
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Phone check", "Social media", "Snack craving", "Email refreshing", "YouTube loop"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setUrgeTrigger(opt)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    urgeTrigger === opt ? "bg-gold text-paper font-bold" : "border border-line bg-paper text-ink-soft"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center py-4">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-gold/40 font-mono text-4xl font-bold text-ink">
              {delayRemaining}s
            </div>
            {!delayActive && !delayCompleted && (
              <button
                onClick={() => {
                  setDelayActive(true);
                  playBellChime("start");
                }}
                className="mt-4 rounded-full bg-gold px-6 py-2 text-sm font-semibold text-paper cta-hover transition-colors"
              >
                Start 10-Second Pause
              </button>
            )}
            {delayActive && (
              <p className="mt-3 animate-pulse text-xs text-ink-soft">
                Breathe slowly. Notice the physical sensation of the urge.
              </p>
            )}
          </div>

          {delayCompleted && (
            <div className="space-y-3 rounded-xl border border-line bg-card p-4">
              <p className="font-display font-bold text-ink">The 10 seconds are up.</p>
              <p className="text-xs text-ink-soft">
                You broke the automatic reflex. Do you still choose to execute this action, or return to what you were doing?
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => handleLogUrge(true)}
                  className="rounded-full bg-health px-5 py-2 text-xs font-bold text-paper transition-colors hover:opacity-90"
                >
                  I Resisted The Urge (+15 XP)
                </button>
                <button
                  onClick={() => handleLogUrge(false)}
                  className="rounded-full border border-line px-4 py-2 text-xs text-ink-soft hover:bg-paper-deep"
                >
                  Executed Consciously
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-ink-soft">
            30 minutes of zero digital stimulation: walk, sit, or tidy without audio, screens, or snacks.
          </p>
          <div className="font-mono text-4xl font-bold text-ink">
            {Math.floor(fastRemaining / 60)}:{(fastRemaining % 60).toString().padStart(2, "0")}
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setFastActive(!fastActive);
                playBellChime(fastActive ? "tick" : "start");
              }}
              className="rounded-full bg-gold px-6 py-2 text-sm font-semibold text-paper cta-hover transition-colors"
            >
              {fastActive ? "Pause Block" : "Start 30-Min Fast"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 4. IDENTITY STACK & 70% FLOOR (Protocol 2.4)
// -------------------------------------------------------------
function IdentityStackRunner({ protocol, onClose, onCompleted }: { protocol: Protocol; onClose: () => void; onCompleted?: () => void }) {
  const [nounIdentity, setNounIdentity] = useState("");
  const [verbBehavior, setVerbBehavior] = useState("");
  const [scaled70, setScaled70] = useState("");
  const [zeroFloor, setZeroFloor] = useState("");

  const handleSave = () => {
    logProtocolExecution(
      protocol.num,
      protocol.title,
      { nounIdentity, verbBehavior, scaled70, zeroFloor },
      60
    );
    playBellChime("finish");
    if (onCompleted) onCompleted();
    onClose();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Identity follows behavior, not the reverse. Convert vague self-labels into scaled, non-negotiable floor behaviors.
      </p>

      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-paper-deep/30 p-3.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            1. Target Identity (Noun)
          </label>
          <input
            type="text"
            value={nounIdentity}
            onChange={(e) => setNounIdentity(e.target.value)}
            placeholder="e.g. A disciplined writer, a healthy athlete"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-gold focus:outline-none"
          />
        </div>

        <div className="rounded-xl border border-line bg-paper-deep/30 p-3.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            2. Translated Into Verbs (What action does this identity take weekly?)
          </label>
          <input
            type="text"
            value={verbBehavior}
            onChange={(e) => setVerbBehavior(e.target.value)}
            placeholder="e.g. Write 500 words before 9am, lift weights 3x a week"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-gold focus:outline-none"
          />
        </div>

        <div className="rounded-xl border border-line bg-paper-deep/30 p-3.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            3. The 70% Scale Check (Can you start this TODAY without friction?)
          </label>
          <input
            type="text"
            value={scaled70}
            onChange={(e) => setScaled70(e.target.value)}
            placeholder="e.g. Write 200 words instead of 500; 15-min workout"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-gold focus:outline-none"
          />
        </div>

        <div className="rounded-xl border border-line bg-paper-deep/30 p-3.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            4. The Zero-Day Floor (The absolute minimum that still counts on bad days)
          </label>
          <input
            type="text"
            value={zeroFloor}
            onChange={(e) => setZeroFloor(e.target.value)}
            placeholder="e.g. Write 1 sentence; do 5 pushups; read 1 paragraph"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={!verbBehavior.trim() || !zeroFloor.trim()}
          className="rounded-full bg-gold px-6 py-2 text-sm font-semibold text-paper cta-hover transition-colors disabled:opacity-40"
        >
          Save Identity Stack (+25 XP)
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. AUDIT / EQUATION CHECK RUNNER (Protocol 2.1 & 2.2)
// -------------------------------------------------------------
function AuditDiagnosticRunner({ protocol, onClose, onCompleted }: { protocol: Protocol; onClose: () => void; onCompleted?: () => void }) {
  const [claim, setClaim] = useState("");
  const [evidenceGrade, setEvidenceGrade] = useState("B");
  const [behavioralTest, setBehavioralTest] = useState("");

  const handleSave = () => {
    logProtocolExecution(
      protocol.num,
      protocol.title,
      { claim, evidenceGrade, behavioralTest },
      45
    );
    playBellChime("finish");
    if (onCompleted) onCompleted();
    onClose();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Deconstruct a famous rule or limiting self-belief into an equation: Does X really cause Y, at magnitude M, in your context?
      </p>
      <div className="rounded-xl border border-line bg-paper-deep/30 p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            The Claim or Belief Being Audited
          </label>
          <input
            type="text"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="e.g. 'I need 8 hours or my day is ruined' or 'I am bad at sales'"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Initial Evidence Grade
          </label>
          <div className="mt-1.5 flex gap-2">
            {["A", "B", "C", "D"].map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setEvidenceGrade(grade)}
                className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-colors ${
                  evidenceGrade === grade
                    ? "bg-gold text-paper font-bold"
                    : "border border-line bg-paper text-ink-soft hover:border-gold"
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            30-Day Behavioral Test (What would you do if the opposite were true?)
          </label>
          <textarea
            rows={2}
            value={behavioralTest}
            onChange={(e) => setBehavioralTest(e.target.value)}
            placeholder="e.g. Send 2 cold emails every morning before checking analytics, measure replies after 30 days."
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!claim.trim()}
          className="rounded-full bg-gold px-6 py-2 text-sm font-semibold text-paper cta-hover transition-colors disabled:opacity-40"
        >
          Save Audit Test (+20 XP)
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 6. GENERIC PROTOCOL RUNNER (For remaining protocols)
// -------------------------------------------------------------
function GenericProtocolRunner({ protocol, onClose, onCompleted }: { protocol: Protocol; onClose: () => void; onCompleted?: () => void }) {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState("");

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleFinish = () => {
    logProtocolExecution(
      protocol.num,
      protocol.title,
      {
        notes,
        completedCount: `${Object.values(completedSteps).filter(Boolean).length}/${protocol.steps.length}`,
      },
      60
    );
    playBellChime("finish");
    if (onCompleted) onCompleted();
    onClose();
  };

  return (
    <div className="space-y-4">
      {protocol.purpose && (
        <p className="font-display italic text-sm text-ink-soft border-l-2 border-gold pl-3">
          {protocol.purpose}
        </p>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Interactive Step-by-Step Execution
        </label>
        {protocol.steps.map((step, idx) => (
          <div
            key={idx}
            onClick={() => toggleStep(idx)}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
              completedSteps[idx]
                ? "border-health/40 bg-health/10"
                : "border-line bg-paper hover:border-gold/50"
            }`}
          >
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
              completedSteps[idx]
                ? "border-health bg-health text-paper"
                : "border-line text-ink-faint"
            }`}>
              {completedSteps[idx] ? "✓" : idx + 1}
            </div>
            <p className={`text-sm leading-relaxed ${completedSteps[idx] ? "line-through text-ink-faint" : "text-ink"}`}>
              {step}
            </p>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Session Reflection & Input Log
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Log what you observed, friction encountered, or outcomes..."
          className="mt-1.5 w-full rounded-lg border border-line bg-paper p-3 text-sm text-ink focus:border-gold focus:outline-none"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleFinish}
          className="rounded-full bg-gold px-6 py-2 text-sm font-semibold text-paper cta-hover transition-colors"
        >
          Complete & Log Protocol (+20 XP)
        </button>
      </div>
    </div>
  );
}
