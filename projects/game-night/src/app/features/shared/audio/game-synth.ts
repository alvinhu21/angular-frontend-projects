import { Signal, signal } from '@angular/core';

export interface SynthNote {
  freq: number;
  /** Glide target, for sweeps. */
  toFreq?: number;
  /** Seconds after the cue starts. */
  at: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

/** Mute switch surface shared by every game's audio service, so one toggle component serves all. */
export abstract class GameSoundControl {
  abstract readonly enabled: Signal<boolean>;
  abstract toggle(): void;
}

/** A gain stage of its own in front of the master volume, so everything scheduled on it can be
 *  silenced at once - for music that has to stop the moment play does. */
export interface SynthBus {
  /** Schedules notes on this bus, `startAt` seconds on the audio clock. Ignored once stopped. */
  play(notes: readonly SynthNote[], startAt: number): void;
  /** Fades the bus out in a few tens of milliseconds - notes already scheduled on it included. */
  stop(): void;
}

const MASTER_VOLUME = 0.5;
const NOISE_SECONDS = 0.05;
const BUS_FADE_SECONDS = 0.04;

/**
 * The Web Audio plumbing behind every game's synthesized sound effects (no recorded assets): one
 * lazily created context, a master gain, the browser's "no audio before a user gesture" unlock,
 * and an on/off preference remembered per screen role. Game-specific services own the cues.
 */
export class GameSynth {
  private readonly enabledState = signal(false);
  readonly enabled = this.enabledState.asReadonly();

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private storageKey: string | null = null;
  private readonly unlock = () => this.resume();

  constructor(private readonly document: Document) {}

  /**
   * Loads this role's remembered preference (falling back to `defaultEnabled`) and, if sound is
   * on, arms the unlock so the context starts on the first tap or key press.
   */
  configure(storageKey: string, defaultEnabled: boolean): void {
    this.storageKey = storageKey;
    this.enabledState.set(this.readPreference() ?? defaultEnabled);
    if (this.enabledState()) {
      this.document.addEventListener('pointerdown', this.unlock, { once: true });
      this.document.addEventListener('keydown', this.unlock, { once: true });
    }
  }

  /** Flips and persists the preference; returns the new state. */
  toggle(): boolean {
    const next = !this.enabledState();
    this.enabledState.set(next);
    this.writePreference(next);
    if (next) {
      this.resume();
    }
    return next;
  }

  /** The audio clock (seconds) when sound is on and running, else null - schedule against this. */
  now(): number | null {
    if (!this.enabledState()) {
      return null;
    }
    const context = this.ensureContext();
    return context && context.state === 'running' ? context.currentTime : null;
  }

  playNotes(notes: readonly SynthNote[], startAt?: number): void {
    const start = startAt ?? this.now();
    if (start === null || !this.context || !this.master) {
      return;
    }
    for (const note of notes) {
      this.tone(this.context, this.master, note, start + 0.01);
    }
  }

  /** A fresh {@link SynthBus}, or null while sound is off or not yet unlocked. */
  createBus(): SynthBus | null {
    const context = this.now() === null ? null : this.context;
    const master = this.master;
    if (!context || !master) {
      return null;
    }
    const gain = context.createGain();
    gain.connect(master);
    let stopped = false;
    return {
      play: (notes, startAt) => {
        if (stopped) {
          return;
        }
        for (const note of notes) {
          this.tone(context, gain, note, startAt);
        }
      },
      stop: () => {
        if (stopped) {
          return;
        }
        stopped = true;
        const now = context.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + BUS_FADE_SECONDS);
        // Anything still scheduled plays on into silence and ends by itself; the stage goes once
        // the fade is done.
        setTimeout(() => gain.disconnect(), BUS_FADE_SECONDS * 1000 + 60);
      },
    };
  }

  /**
   * A short, hard percussive tick - a burst of band-passed noise, the sound of a stiff flapper
   * slapping a peg. `intensity` (0-1) sets both loudness and brightness.
   */
  playClick(at: number, intensity: number): void {
    const context = this.context;
    const noise = this.ensureNoise();
    if (!context || !this.master || !noise) {
      return;
    }
    const level = Math.min(1, Math.max(0, intensity));
    const source = context.createBufferSource();
    source.buffer = noise;
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(1800 + 1600 * level, at);
    band.Q.setValueAtTime(3.5, at);
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(0.18 + 0.32 * level, at + 0.002);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    source.connect(band).connect(amp).connect(this.master);
    source.start(at);
    source.stop(at + NOISE_SECONDS);
  }

  dispose(): void {
    this.removeUnlockListeners();
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.noise = null;
  }

  private tone(context: AudioContext, destination: AudioNode, note: SynthNote, start: number): void {
    const t0 = start + note.at;
    const t1 = t0 + note.duration;
    const oscillator = context.createOscillator();
    const amp = context.createGain();
    oscillator.type = note.type ?? 'sine';
    oscillator.frequency.setValueAtTime(note.freq, t0);
    if (note.toFreq) {
      oscillator.frequency.exponentialRampToValueAtTime(note.toFreq, t1);
    }
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(note.gain ?? 0.14, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t1);
    oscillator.connect(amp).connect(destination);
    oscillator.start(t0);
    oscillator.stop(t1 + 0.02);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }
    const AudioContextCtor = this.document.defaultView?.AudioContext;
    if (!AudioContextCtor) {
      return null;
    }
    this.context = new AudioContextCtor();
    this.master = this.context.createGain();
    this.master.gain.value = MASTER_VOLUME;
    this.master.connect(this.context.destination);
    return this.context;
  }

  private ensureNoise(): AudioBuffer | null {
    const context = this.context;
    if (!context) {
      return null;
    }
    if (!this.noise) {
      const length = Math.ceil(context.sampleRate * NOISE_SECONDS);
      this.noise = context.createBuffer(1, length, context.sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) {
        samples[i] = Math.random() * 2 - 1;
      }
    }
    return this.noise;
  }

  private resume(): void {
    this.removeUnlockListeners();
    const context = this.ensureContext();
    if (context && context.state === 'suspended') {
      void context.resume();
    }
  }

  private removeUnlockListeners(): void {
    this.document.removeEventListener('pointerdown', this.unlock);
    this.document.removeEventListener('keydown', this.unlock);
  }

  // Storage can be missing or throw (private mode, blocked site data); sound then just uses the default.
  private readPreference(): boolean | null {
    try {
      const value = this.storageKey ? this.document.defaultView?.localStorage.getItem(this.storageKey) : null;
      return value === null || value === undefined ? null : value === 'on';
    } catch {
      return null;
    }
  }

  private writePreference(enabled: boolean): void {
    try {
      if (this.storageKey) {
        this.document.defaultView?.localStorage.setItem(this.storageKey, enabled ? 'on' : 'off');
      }
    } catch {
      // Preference just won't persist.
    }
  }
}
