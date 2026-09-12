"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX, Headphones, Play, Square, ChevronDown } from "lucide-react";
import { ambientSound, type SoundType } from "@/lib/ambientSound";

interface Props {
  compact?: boolean;
}

export default function AmbientAudioPlayer({ compact = false }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeType, setActiveType] = useState<SoundType>("none");
  const [selectedType, setSelectedType] = useState<SoundType>("brown");
  const [volume, setVolume] = useState(25);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const syncState = () => {
      const playing = ambientSound.getIsPlaying();
      const current = ambientSound.getCurrentType();
      setIsPlaying(playing);
      setActiveType(current);
      if (current !== "none") {
        setSelectedType(current);
      }
      setVolume(Math.round(ambientSound.getVolume() * 100));
    };

    syncState();
    return ambientSound.subscribe(syncState);
  }, []);

  const handlePlaySelected = (typeToPlay?: SoundType) => {
    const target = typeToPlay || (selectedType === "none" ? "brown" : selectedType);
    setSelectedType(target);
    ambientSound.play(target);
  };

  const handleToggleCard = (type: SoundType) => {
    if (isPlaying && activeType === type) {
      ambientSound.stop();
    } else {
      setSelectedType(type);
      ambientSound.play(type);
    }
  };

  const handleStop = () => {
    ambientSound.stop();
  };

  const handleSelectChange = (newType: SoundType) => {
    setSelectedType(newType);
    if (isPlaying) {
      ambientSound.play(newType);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    ambientSound.setVolume(val / 100);
  };

  const soundOptions: { id: SoundType; label: string; tag: string; desc: string }[] = [
    {
      id: "brown",
      label: "Brown Noise",
      tag: "Deep Focus",
      desc: "Sub-bass frequency that quiets mental chatter and ADHD distraction.",
    },
    {
      id: "binaural40",
      label: "40Hz Gamma",
      tag: "Cognitive Flow",
      desc: "Gentle oscillation tuned to cortical gamma rhythms for deep work.",
    },
    {
      id: "pink",
      label: "Pink Noise",
      tag: "Balanced",
      desc: "Waterfall spectral density that masks background conversations.",
    },
    {
      id: "rain",
      label: "Gentle Rain",
      tag: "Calming",
      desc: "Natural rhythmic drops to lower nervous system tension.",
    },
  ];

  const currentOption = soundOptions.find((s) => s.id === (isPlaying ? activeType : selectedType)) || soundOptions[0];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-2.5 text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <Headphones className={`h-4 w-4 ${isPlaying ? "text-gold animate-pulse" : "text-ink-faint"}`} />
          <span className="font-display font-bold text-ink">Focus Audio:</span>
          <select
            value={selectedType}
            onChange={(e) => handleSelectChange(e.target.value as SoundType)}
            className="rounded border border-line bg-card px-2 py-1 text-xs font-medium text-ink focus:outline-none focus:border-gold cursor-pointer"
          >
            {soundOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} ({opt.tag})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-ink-soft">
            {volume === 0 ? <VolumeX className="h-3.5 w-3.5 text-ink-faint" /> : <Volume2 className="h-3.5 w-3.5 text-gold" />}
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="h-1.5 w-16 cursor-pointer accent-gold"
              title={`Volume: ${volume}%`}
            />
          </div>

          {isPlaying ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-1 rounded-full bg-crimson/15 px-3 py-1 font-semibold text-crimson hover:bg-crimson/25 transition-colors cursor-pointer"
            >
              <Square className="h-2.5 w-2.5 fill-current" /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePlaySelected()}
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 font-semibold text-paper hover:bg-gold transition-colors cursor-pointer"
            >
              <Play className="h-2.5 w-2.5 fill-current" /> Play
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-card p-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              isPlaying ? "bg-gold text-paper shadow-xs" : "bg-paper-deep text-ink-soft"
            }`}
          >
            <Headphones className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[11px] font-bold uppercase tracking-wider text-gold">
                Offline Focus Audio
              </span>
              {isPlaying && (
                <span className="inline-flex items-center gap-1 rounded-full bg-health/15 px-2 py-0.5 text-[10px] font-bold text-health">
                  <span className="h-1.5 w-1.5 rounded-full bg-health animate-ping" />
                  Playing {currentOption.label}
                </span>
              )}
            </div>
            <h4 className="font-display text-sm font-bold text-ink">
              Ambient Noise Synthesizer (Zero Bandwidth)
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-1.5 rounded-full bg-crimson/15 px-3.5 py-1.5 text-xs font-semibold text-crimson hover:bg-crimson/25 transition-colors cursor-pointer"
            >
              <Square className="h-3 w-3 fill-current" /> Stop Audio
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePlaySelected()}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-paper hover:bg-gold transition-colors cursor-pointer"
            >
              <Play className="h-3 w-3 fill-current" /> Play {currentOption.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:border-gold hover:text-ink transition-colors cursor-pointer"
          >
            <span>Options</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t border-line pt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {soundOptions.map((opt) => {
              const active = isPlaying && activeType === opt.id;
              const isSelectedOnly = !isPlaying && selectedType === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleToggleCard(opt.id)}
                  type="button"
                  className={`rounded-lg border p-3 text-left transition-all cursor-pointer ${
                    active
                      ? "border-gold bg-gold/15 shadow-xs"
                      : isSelectedOnly
                      ? "border-gold/60 bg-paper"
                      : "border-line bg-paper hover:border-gold/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs font-bold text-ink">
                      {opt.label}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                        active
                          ? "bg-gold text-paper"
                          : "bg-paper-deep text-ink-faint"
                      }`}
                    >
                      {active ? "Active" : opt.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-paper-deep/50 px-4 py-2.5">
            <div className="flex items-center gap-3">
              {volume === 0 ? (
                <VolumeX className="h-4 w-4 text-ink-faint" />
              ) : (
                <Volume2 className="h-4 w-4 text-gold" />
              )}
              <span className="text-xs text-ink-soft">Volume: {volume}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="h-1.5 w-28 cursor-pointer accent-gold"
              />
            </div>
            <p className="text-[11px] text-ink-faint">
              Synthesized purely via Web Audio API — works 100% offline with zero network requests.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
