import { DOCUMENT, DestroyRef, Injectable, effect, inject, untracked } from '@angular/core';
import { LiveSessionService } from '../../../core/live-session.service';
import { WofStateSnapshot } from '../../../models/wof.models';
import { GameSoundControl, GameSynth, SynthNote } from '../../shared/audio/game-synth';
import { FrenzyMusic } from './frenzy-music';
import { WofCue, wofCuesBetween } from './wof-cues';

export type WofAudioRole = 'host' | 'player';

const STORAGE_PREFIX = 'gameNight.wof.sound.';
/** Wheel speed (deg/s) at which the flapper hits softest: at speed it barely swings between pegs. */
const FULL_RATTLE_SPEED = 700;

// Original, synthesized cues - no recorded assets.
const CUE_NOTES: Record<WofCue, SynthNote[]> = {
  spinStart: [{ freq: 180, toFreq: 540, at: 0, duration: 0.26, type: 'triangle', gain: 0.05 }],
  landedCash: [
    { freq: 1047, at: 0, duration: 0.16, type: 'triangle' },
    { freq: 1568, at: 0.09, duration: 0.4, type: 'sine', gain: 0.1 },
  ],
  // A shimmering run up for the Wild Card or the Million Dollar Wedge.
  landedSpecial: [
    { freq: 1047, at: 0, duration: 0.18, type: 'sine', gain: 0.09 },
    { freq: 1319, at: 0.07, duration: 0.18, type: 'sine', gain: 0.09 },
    { freq: 1568, at: 0.14, duration: 0.2, type: 'sine', gain: 0.09 },
    { freq: 2093, at: 0.21, duration: 0.6, type: 'sine', gain: 0.1 },
  ],
  specialClaimed: [
    { freq: 784, at: 0, duration: 0.14, type: 'triangle', gain: 0.1 },
    { freq: 1047, at: 0.12, duration: 0.14, type: 'triangle', gain: 0.1 },
    { freq: 1319, at: 0.24, duration: 0.14, type: 'triangle', gain: 0.1 },
    { freq: 1568, at: 0.36, duration: 0.7, type: 'triangle', gain: 0.12 },
  ],
  ringIn: [
    { freq: 988, at: 0, duration: 0.12, type: 'square', gain: 0.05 },
    { freq: 1319, at: 0.1, duration: 0.22, type: 'square', gain: 0.05 },
  ],
  // A struck bell: a fundamental and two inharmonic partials, all ringing down together.
  frenzySolved: [
    { freq: 1318, at: 0, duration: 1.4, type: 'sine', gain: 0.14 },
    { freq: 3200, at: 0, duration: 0.7, type: 'sine', gain: 0.05 },
    { freq: 4380, at: 0, duration: 0.4, type: 'sine', gain: 0.03 },
  ],
  // Two detuned low tones beating against each other - the buzzer.
  frenzyMissed: [
    { freq: 110, at: 0, duration: 0.55, type: 'sawtooth', gain: 0.06 },
    { freq: 116.5, at: 0, duration: 0.55, type: 'square', gain: 0.035 },
  ],
  frenzyUnsolved: [
    { freq: 523, at: 0, duration: 0.18, type: 'triangle', gain: 0.07 },
    { freq: 392, at: 0.18, duration: 0.4, type: 'triangle', gain: 0.07 },
  ],
  // The deflating two-step slide of losing everything.
  bankrupt: [
    { freq: 330, toFreq: 294, at: 0, duration: 0.3, type: 'sawtooth', gain: 0.06 },
    { freq: 294, toFreq: 98, at: 0.32, duration: 0.8, type: 'sawtooth', gain: 0.06 },
    { freq: 147, toFreq: 49, at: 0.32, duration: 0.8, type: 'square', gain: 0.03 },
  ],
  loseATurn: [
    { freq: 196, at: 0, duration: 0.16, type: 'square', gain: 0.045 },
    { freq: 147, at: 0.2, duration: 0.32, type: 'square', gain: 0.045 },
  ],
};

/**
 * Sound for one Wheel of Fortune screen: state-driven cues (spin start, what the wheel landed on,
 * ring-ins, the Frenzy's bell and buzzer), Fortune Frenzy's music bed, plus the flapper clicks,
 * which the wheel schedules itself against {@link now}. Provide it on the screen component and
 * call `configure()` once.
 */
@Injectable()
export class WofAudioService extends GameSoundControl {
  private readonly liveSession = inject(LiveSessionService);
  private readonly synth = new GameSynth(inject(DOCUMENT));
  private readonly frenzyMusic = new FrenzyMusic(this.synth);

  readonly enabled = this.synth.enabled;

  private previous: WofStateSnapshot | null = null;

  constructor() {
    super();
    effect(() => {
      const next = this.liveSession.wofState();
      if (!next) {
        return;
      }
      const cues = wofCuesBetween(this.previous, next);
      this.previous = next;
      if (untracked(this.enabled)) {
        cues.forEach((cue) => this.synth.playNotes(CUE_NOTES[cue]));
      }
    });

    // The Frenzy's music plays while letters are being revealed - it stops the moment someone
    // rings in, the puzzle ends, or the clock runs out.
    effect(() => {
      const state = this.liveSession.wofState();
      const revealing =
        state?.phase === 'FORTUNE_FRENZY' && !state.frenzySolvingPlayerId && !state.frenzyTimeUp && this.enabled();
      untracked(() => (revealing ? this.frenzyMusic.start() : this.frenzyMusic.stop()));
    });

    inject(DestroyRef).onDestroy(() => {
      this.frenzyMusic.stop();
      this.synth.dispose();
    });
  }

  /** Sound defaults on for the shared TV board and off on phones, so controllers don't echo the TV. */
  configure(role: WofAudioRole): void {
    this.synth.configure(STORAGE_PREFIX + role, role === 'host');
  }

  toggle(): void {
    if (this.synth.toggle()) {
      this.synth.playNotes(CUE_NOTES.landedCash);
    }
  }

  /** The audio clock in seconds, or null while sound is off or not yet unlocked. */
  now(): number | null {
    return this.synth.now();
  }

  /** One flapper click at audio-clock time `at`; `speed` is the wheel's speed then (deg/s). */
  pegClick(at: number, speed: number): void {
    // Slow pegs slap hardest - the flapper swings fully between them.
    const intensity = 1 - 0.6 * Math.min(1, Math.abs(speed) / FULL_RATTLE_SPEED);
    this.synth.playClick(at, intensity);
  }
}
