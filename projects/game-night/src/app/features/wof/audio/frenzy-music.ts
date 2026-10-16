import { GameSynth, SynthBus, SynthNote } from '../../shared/audio/game-synth';

/** 160 bpm in eighth notes. */
const STEP_SECONDS = 60 / 160 / 2;
/** Two bars of eighths: Am, F, G, E - half a bar each. */
const STEPS = 16;
/** Notes are handed to the audio clock this far ahead, so timer jitter never shows in the rhythm. */
const LOOKAHEAD_SECONDS = 0.3;
const SCHEDULE_EVERY_MS = 100;

const BASS_ROOTS = [110, 87.31, 98, 82.41]; // A2 F2 G2 E2
const ARPEGGIOS = [
  [440, 523.25, 659.25, 523.25], // Am
  [349.23, 440, 523.25, 440], // F
  [392, 493.88, 587.33, 493.88], // G
  [329.63, 415.3, 493.88, 415.3], // E
];

/** One eighth of the loop: a bass pulse jumping root/octave, under a rising arpeggio. */
function stepNotes(step: number): SynthNote[] {
  const chord = Math.floor(step / 4);
  const beat = step % 4;
  const root = BASS_ROOTS[chord];
  return [
    { freq: beat % 2 === 0 ? root : root * 2, at: 0, duration: STEP_SECONDS * 0.9, type: 'square', gain: 0.022 },
    { freq: ARPEGGIOS[chord][beat], at: 0, duration: STEP_SECONDS * 0.8, type: 'triangle', gain: 0.03 },
  ];
}

/**
 * Fortune Frenzy's music bed: an original, synthesized loop that plays while letters are being
 * revealed. It runs on a bus of its own (see {@link SynthBus}) so it cuts out the instant a
 * contestant rings in or the puzzle ends, rather than trailing off over the next beat.
 */
export class FrenzyMusic {
  private bus: SynthBus | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepAt = 0;
  private step = 0;

  constructor(private readonly synth: GameSynth) {}

  /** No-op while already playing, or while sound is off or not yet unlocked. */
  start(): void {
    if (this.timer !== null) {
      return;
    }
    const now = this.synth.now();
    const bus = this.synth.createBus();
    if (now === null || !bus) {
      return;
    }
    this.bus = bus;
    this.step = 0;
    this.nextStepAt = now + 0.05;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), SCHEDULE_EVERY_MS);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.bus?.stop();
    this.bus = null;
  }

  private schedule(): void {
    const now = this.synth.now();
    if (now === null || !this.bus) {
      // Sound was switched off mid-loop.
      this.stop();
      return;
    }
    if (this.nextStepAt < now) {
      // The timer was held up (a hidden tab): skip what was missed rather than play it in a burst.
      const missed = Math.ceil((now - this.nextStepAt) / STEP_SECONDS);
      this.step = (this.step + missed) % STEPS;
      this.nextStepAt += missed * STEP_SECONDS;
    }
    while (this.nextStepAt < now + LOOKAHEAD_SECONDS) {
      this.bus.play(stepNotes(this.step), this.nextStepAt);
      this.nextStepAt += STEP_SECONDS;
      this.step = (this.step + 1) % STEPS;
    }
  }
}
