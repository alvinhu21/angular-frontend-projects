import { DOCUMENT, DestroyRef, Injectable, effect, inject, untracked } from '@angular/core';
import { LiveSessionService } from '../../../core/live-session.service';
import { JeopardyStateSnapshot } from '../../../models/jeopardy.models';
import { GameSoundControl, GameSynth, SynthNote } from '../../shared/audio/game-synth';
import { JeopardyCue, cuesBetween } from './jeopardy-cues';

export type JeopardyAudioRole = 'host' | 'player';

const STORAGE_PREFIX = 'gameNight.jeopardy.sound.';

// Original, synthesized cues (no recorded assets): short, restrained, and distinct from each other.
const CUE_NOTES: Record<JeopardyCue, SynthNote[]> = {
  clueSelect: [
    { freq: 784, at: 0, duration: 0.09 },
    { freq: 1175, at: 0.07, duration: 0.18 },
  ],
  dailyDouble: [
    { freq: 220, toFreq: 880, at: 0, duration: 0.45, type: 'sawtooth', gain: 0.06 },
    { freq: 1319, at: 0.42, duration: 0.35, type: 'triangle' },
    { freq: 1760, at: 0.5, duration: 0.45, type: 'triangle' },
  ],
  buzzIn: [{ freq: 988, at: 0, duration: 0.09, type: 'square', gain: 0.05 }],
  wagerLocked: [
    { freq: 660, at: 0, duration: 0.07 },
    { freq: 880, at: 0.07, duration: 0.1 },
  ],
  correct: [
    { freq: 523, at: 0, duration: 0.12, type: 'triangle' },
    { freq: 659, at: 0.09, duration: 0.12, type: 'triangle' },
    { freq: 784, at: 0.18, duration: 0.26, type: 'triangle' },
  ],
  incorrect: [
    { freq: 155, at: 0, duration: 0.38, type: 'square', gain: 0.045 },
    { freq: 147, at: 0, duration: 0.38, type: 'square', gain: 0.045 },
  ],
  timeUp: [
    { freq: 698, at: 0, duration: 0.14, type: 'triangle' },
    { freq: 523, at: 0.13, duration: 0.14, type: 'triangle' },
    { freq: 392, at: 0.26, duration: 0.42, type: 'triangle' },
  ],
  roundStart: [
    { freq: 392, at: 0, duration: 0.14, type: 'triangle' },
    { freq: 523, at: 0.12, duration: 0.14, type: 'triangle' },
    { freq: 659, at: 0.24, duration: 0.14, type: 'triangle' },
    { freq: 784, at: 0.36, duration: 0.45, type: 'triangle' },
  ],
  gameOver: [
    { freq: 523, at: 0, duration: 0.16, type: 'triangle' },
    { freq: 659, at: 0.14, duration: 0.16, type: 'triangle' },
    { freq: 784, at: 0.28, duration: 0.16, type: 'triangle' },
    { freq: 1047, at: 0.42, duration: 0.7, type: 'triangle' },
    { freq: 784, at: 0.42, duration: 0.7, type: 'sine', gain: 0.08 },
  ],
};

/**
 * Game-show sound feedback for one Jeopardy screen. Provide it on the screen component and call
 * `configure()` once; it then watches the live state and plays cues while enabled.
 */
@Injectable()
export class JeopardyAudioService extends GameSoundControl {
  private readonly liveSession = inject(LiveSessionService);
  private readonly synth = new GameSynth(inject(DOCUMENT));

  readonly enabled = this.synth.enabled;

  private previous: JeopardyStateSnapshot | null = null;

  constructor() {
    super();
    effect(() => {
      const next = this.liveSession.jeopardyState();
      if (!next) {
        return;
      }
      const cues = cuesBetween(this.previous, next);
      this.previous = next;
      if (untracked(this.enabled)) {
        cues.forEach((cue) => this.synth.playNotes(CUE_NOTES[cue]));
      }
    });

    inject(DestroyRef).onDestroy(() => this.synth.dispose());
  }

  /**
   * Each role remembers its own preference. Sound defaults on for the shared TV board and off on
   * phones, so a room full of controllers doesn't echo the TV.
   */
  configure(role: JeopardyAudioRole): void {
    this.synth.configure(STORAGE_PREFIX + role, role === 'host');
  }

  toggle(): void {
    if (this.synth.toggle()) {
      this.synth.playNotes(CUE_NOTES.wagerLocked);
    }
  }
}
