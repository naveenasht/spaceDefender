const MUTE_STORAGE_KEY = "spaceDefender.muted.v1";

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // ignore — mute preference just won't stick this session
  }
}

type Wave = OscillatorType;

interface BeepOptions {
  freq: number;
  duration: number;
  type?: Wave;
  gain?: number;
  sweepTo?: number;
}

/**
 * Every sound here is synthesized at play time (oscillators + noise bursts) —
 * no audio files, consistent with the rest of the game's zero-external-asset
 * approach. Volume is deliberately low per-cue since several can overlap
 * (e.g. a spread-laser volley registering several hits in one frame).
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicNodes: OscillatorNode[] | null = null;
  private muted = loadMuted();

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextCtor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Call on the first real user gesture — browsers block audio before one. */
  resume(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    saveMuted(muted);
    if (muted) this.stopMusic();
    else this.startMusic();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private beep(opts: BeepOptions & { startOffset?: number }): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const startAt = ctx.currentTime + (opts.startOffset ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(opts.freq, startAt);
    if (opts.sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), startAt + opts.duration);
    }
    gain.gain.setValueAtTime(opts.gain ?? 0.25, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + opts.duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startAt);
    osc.stop(startAt + opts.duration + 0.02);
  }

  private noiseBurst(duration: number, gain = 0.25): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.masterGain);
    src.start();
  }

  playerFire(): void {
    this.beep({ freq: 880, sweepTo: 220, duration: 0.07, type: "square", gain: 0.12 });
  }

  enemyHit(): void {
    this.beep({ freq: 320, sweepTo: 90, duration: 0.06, type: "sawtooth", gain: 0.14 });
  }

  explosion(): void {
    this.noiseBurst(0.25, 0.22);
  }

  playerHit(): void {
    this.beep({ freq: 180, sweepTo: 55, duration: 0.3, type: "sawtooth", gain: 0.28 });
  }

  pickup(): void {
    this.beep({ freq: 440, sweepTo: 880, duration: 0.12, type: "triangle", gain: 0.18 });
  }

  powerupUse(): void {
    this.beep({ freq: 660, sweepTo: 990, duration: 0.15, type: "sine", gain: 0.2 });
  }

  gameOver(): void {
    this.beep({ freq: 300, sweepTo: 60, duration: 0.6, type: "sawtooth", gain: 0.22 });
  }

  levelCleared(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.beep({ freq, duration: 0.22, type: "triangle", gain: 0.22, startOffset: i * 0.11 });
    });
  }

  uiMove(): void {
    this.beep({ freq: 520, duration: 0.05, type: "square", gain: 0.09 });
  }

  uiConfirm(): void {
    this.beep({ freq: 700, sweepTo: 1050, duration: 0.1, type: "square", gain: 0.15 });
  }

  startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted || this.musicNodes) return;

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.05;
    this.musicGain.connect(this.masterGain);

    // A slow, quiet two-note drone with a gentle LFO wobble — ambient bed,
    // not a melody, so it never competes with SFX for attention.
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 110;
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 164.81;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(this.musicGain.gain);

    osc1.connect(this.musicGain);
    osc2.connect(this.musicGain);
    osc1.start();
    osc2.start();
    lfo.start();

    this.musicNodes = [osc1, osc2, lfo];
  }

  stopMusic(): void {
    this.musicNodes?.forEach((node) => {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    });
    this.musicNodes = null;
    this.musicGain = null;
  }
}

export const audio = new AudioEngine();
