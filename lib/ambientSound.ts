"use client";

// Web Audio API Synthesizer for offline ambient focus soundscapes
// No network requests, zero external bandwidth, 100% offline & privacy-safe.

export type SoundType = "none" | "brown" | "pink" | "binaural40" | "rain";

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private currentType: SoundType = "none";
  private gainNode: GainNode | null = null;
  private sourceNode: AudioNode | null = null;
  private binauralOscLeft: OscillatorNode | null = null;
  private binauralOscRight: OscillatorNode | null = null;
  private isPlaying = false;
  private volume = 0.25;
  private listeners = new Set<() => void>();

  private notify() {
    for (const l of this.listeners) l();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && this.ctx) {
      try {
        this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch {
        /* ignore */
      }
    }
    this.notify();
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentType(): SoundType {
    return this.currentType;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private cleanupPreviousNodes() {
    if (this.sourceNode) {
      try {
        (this.sourceNode as AudioBufferSourceNode).stop();
      } catch {
        /* ignore */
      }
      try {
        this.sourceNode.disconnect();
      } catch {
        /* ignore */
      }
      this.sourceNode = null;
    }
    if (this.binauralOscLeft) {
      try {
        this.binauralOscLeft.stop();
      } catch {
        /* ignore */
      }
      try {
        this.binauralOscLeft.disconnect();
      } catch {
        /* ignore */
      }
      this.binauralOscLeft = null;
    }
    if (this.binauralOscRight) {
      try {
        this.binauralOscRight.stop();
      } catch {
        /* ignore */
      }
      try {
        this.binauralOscRight.disconnect();
      } catch {
        /* ignore */
      }
      this.binauralOscRight = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        /* ignore */
      }
      this.gainNode = null;
    }
  }

  public stop() {
    this.cleanupPreviousNodes();
    this.isPlaying = false;
    this.currentType = "none";
    this.notify();
  }

  public async play(type: SoundType) {
    if (type === "none") {
      this.stop();
      return;
    }

    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }

    // Clean up previous sound nodes synchronously
    this.cleanupPreviousNodes();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, now);
    masterGain.connect(ctx.destination);
    this.gainNode = masterGain;

    if (type === "brown") {
      // Brown noise (1/f^2) - deep rumble, ideal for ADHD focus and mental silencing
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      let peak = 0.001;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut;
        const abs = Math.abs(lastOut);
        if (abs > peak) peak = abs;
      }
      const scale = 0.5 / peak;
      for (let i = 0; i < bufferSize; i++) {
        data[i] *= scale;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Low pass filter to make it gentle and soothing
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);

      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      this.sourceNode = noise;
    } else if (type === "pink") {
      // Pink noise (1/f) - balanced waterfall sound
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      let peak = 0.001;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.153852;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        const val = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        data[i] = val;
        b6 = white * 0.115926;
        const abs = Math.abs(val);
        if (abs > peak) peak = abs;
      }
      const scale = 0.5 / peak;
      for (let i = 0; i < bufferSize; i++) {
        data[i] *= scale;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);

      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      this.sourceNode = noise;
    } else if (type === "binaural40") {
      // 40Hz Gamma frequency binaural beat (Carrier 200Hz + 240Hz)
      const merger = ctx.createChannelMerger(2);

      const oscL = ctx.createOscillator();
      oscL.type = "sine";
      oscL.frequency.setValueAtTime(200, now);

      const oscR = ctx.createOscillator();
      oscR.type = "sine";
      oscR.frequency.setValueAtTime(240, now); // 240 - 200 = 40Hz Gamma beat

      // Left oscillator to Left channel (0)
      const gainL = ctx.createGain();
      gainL.gain.setValueAtTime(0.5, now);
      oscL.connect(gainL);
      gainL.connect(merger, 0, 0);

      // Right oscillator to Right channel (1)
      const gainR = ctx.createGain();
      gainR.gain.setValueAtTime(0.5, now);
      oscR.connect(gainR);
      gainR.connect(merger, 0, 1);

      merger.connect(masterGain);

      oscL.start();
      oscR.start();
      this.binauralOscLeft = oscL;
      this.binauralOscRight = oscR;
    } else if (type === "rain") {
      // Rain simulator combining filtered noise
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      let peak = 0.001;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.05 * white) / 1.05;
        data[i] = last;
        const abs = Math.abs(last);
        if (abs > peak) peak = abs;
      }
      const scale = 0.5 / peak;
      for (let i = 0; i < bufferSize; i++) {
        data[i] *= scale;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(1200, now);
      bandpass.Q.setValueAtTime(0.5, now);

      noise.connect(bandpass);
      bandpass.connect(masterGain);
      noise.start();
      this.sourceNode = noise;
    }

    this.isPlaying = true;
    this.currentType = type;
    this.notify();
  }
}

export const ambientSound = new AmbientAudioEngine();
