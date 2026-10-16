import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TimerBarComponent } from 'shared-lib';

/** An ISO-8601 instant straight from a server snapshot, or epoch milliseconds. */
export type TimerInstant = string | number | null | undefined;

/** A window this client times for itself, for the few the server enforces but doesn't publish. */
export interface LocalTimerWindow {
  startsAt: number;
  endsAt: number;
}

/** Opens a {@link LocalTimerWindow} of the given length, starting now. */
export function startLocalTimerWindow(durationMs: number): LocalTimerWindow {
  const startsAt = Date.now();
  return { startsAt, endsAt: startsAt + durationMs };
}

/** How often the bar re-measures - also the length of the fill's linear CSS transition (see
 *  _timer.scss), so it glides from one tick to the next instead of stepping. */
const BAR_TICK_MS = 100;
/** The seconds readout only changes once a second; a few checks a second keep it on the beat. */
const READOUT_TICK_MS = 250;
/** From here down the readout flashes red. */
const URGENT_SECONDS = 3;

function toEpochMs(value: TimerInstant): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * The on-screen clock for every timed event: a label, the whole seconds left, and shared-lib's
 * timer bar draining from full at `startsAt` to empty at `endsAt`. Purely cosmetic - the server
 * schedules and enforces every real deadline whatever a client shows. Renders nothing until both
 * ends of the window are known.
 */
@Component({
  selector: 'app-game-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, TimerBarComponent],
  templateUrl: './game-timer.component.html',
  styleUrl: './game-timer.component.scss',
})
export class GameTimerComponent {
  /** When the window opened - the bar reads full. */
  readonly startsAt = input<TimerInstant>(null);
  /** When the window closes - the bar reads empty. */
  readonly endsAt = input<TimerInstant>(null);
  /** A translation key. */
  readonly label = input.required<string>();

  readonly barTickMs = BAR_TICK_MS;

  readonly window = computed(() => {
    const start = toEpochMs(this.startsAt());
    const end = toEpochMs(this.endsAt());
    return start !== null && end !== null ? { start: new Date(start), end: new Date(end) } : null;
  });

  private readonly now = signal(Date.now());

  readonly remainingSeconds = computed(() => {
    const window = this.window();
    if (!window) {
      return 0;
    }
    // Capped at the window's length: `now` can lag a fresh window by up to one tick, which would
    // otherwise read a second over for an instant.
    const remainingMs = Math.min(window.end.valueOf() - this.now(), window.end.valueOf() - window.start.valueOf());
    return Math.max(0, Math.ceil(remainingMs / 1000));
  });
  readonly urgent = computed(() => this.remainingSeconds() > 0 && this.remainingSeconds() <= URGENT_SECONDS);
  readonly expired = computed(() => this.window() !== null && this.remainingSeconds() === 0);

  constructor() {
    const handle = setInterval(() => this.now.set(Date.now()), READOUT_TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(handle));
  }
}
