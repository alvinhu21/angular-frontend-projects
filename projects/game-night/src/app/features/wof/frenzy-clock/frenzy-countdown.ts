import { DestroyRef, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { WofStateSnapshot } from '../../../models/wof.models';

/** From here down, the board's inner border lines flash red. */
export const FRENZY_FINAL_SECONDS_MS = 5000;
/** The readout shows tenths, so it's re-measured ten times a second. */
const TICK_MS = 100;

export interface FrenzyCountdown {
  /** Milliseconds left on the Frenzy clock - ticking down while it runs, frozen while it's stopped.
   *  Null outside the Frenzy. */
  readonly remainingMs: Signal<number | null>;
  /** The last five seconds of a running clock. */
  readonly finalSeconds: Signal<boolean>;
}

interface Anchor {
  remainingMs: number;
  /** When the snapshot that said so arrived, by this device's clock. */
  receivedAt: number;
  running: boolean;
}

/**
 * The Fortune Frenzy clock, read off the live snapshot. It counts from what each snapshot says was
 * left - measured from when it arrived on this device - rather than from the server's deadline
 * instant, so a phone whose clock is off still shows the right time. Every snapshot (one per
 * revealed letter) re-anchors it. Purely cosmetic: the server enforces the real deadline.
 *
 * Must be created in an injection context (a component field initializer).
 */
export function createFrenzyCountdown(state: Signal<WofStateSnapshot | null>): FrenzyCountdown {
  const now = signal(Date.now());
  const anchor = signal<Anchor | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;
  const stopTicking = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  effect(() => {
    const snapshot = state();
    const remainingMs = snapshot?.frenzyRemainingMs ?? null;
    const running =
      snapshot?.phase === 'FORTUNE_FRENZY' && !snapshot.frenzyTimeUp && remainingMs !== null && remainingMs > 0;
    untracked(() => {
      const receivedAt = Date.now();
      anchor.set(remainingMs === null ? null : { remainingMs, receivedAt, running });
      now.set(receivedAt);
      if (running && timer === null) {
        timer = setInterval(() => now.set(Date.now()), TICK_MS);
      } else if (!running) {
        stopTicking();
      }
    });
  });
  inject(DestroyRef).onDestroy(stopTicking);

  const remainingMs = computed(() => {
    const current = anchor();
    if (!current) {
      return null;
    }
    return current.running ? Math.max(0, current.remainingMs - (now() - current.receivedAt)) : current.remainingMs;
  });
  const finalSeconds = computed(() => {
    const left = remainingMs();
    return !!anchor()?.running && left !== null && left <= FRENZY_FINAL_SECONDS_MS;
  });
  return { remainingMs, finalSeconds };
}
