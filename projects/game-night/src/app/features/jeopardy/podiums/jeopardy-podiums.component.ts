import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PlayerView } from '../../../models/session.models';
import { MoneyPipe } from '../money.pipe';

/** How long a score change stays highlighted. Long enough to notice, short enough to never lag play. */
const FLASH_MS = 1400;

export interface ScoreFlash {
  delta: number;
  /** Bumped on every change so a second change mid-flash re-creates the element and restarts it. */
  seq: number;
}

/** Contestant podiums: score panel over a name plate, lit gold for whoever controls the board. */
@Component({
  selector: 'app-jeopardy-podiums',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyPipe, TranslateModule],
  templateUrl: './jeopardy-podiums.component.html',
  styleUrl: './jeopardy-podiums.component.scss',
})
export class JeopardyPodiumsComponent implements OnChanges {
  @Input({ required: true }) players: PlayerView[] = [];
  @Input() inControlId: string | null = null;
  @Input() answeringId: string | null = null;
  @Input() myPlayerId: string | null = null;
  /** Smaller podiums for the phone controller. */
  @Input() compact = false;

  readonly flashes = signal<ReadonlyMap<string, ScoreFlash>>(new Map());

  private readonly previousScores = new Map<string, number>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private seq = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach((timer) => clearTimeout(timer)));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['players']) {
      return;
    }
    // The first snapshot only seeds the baseline, so joining mid-game doesn't flash every score.
    for (const player of this.players) {
      const previous = this.previousScores.get(player.playerId);
      this.previousScores.set(player.playerId, player.score);
      if (previous !== undefined && previous !== player.score) {
        this.flash(player.playerId, player.score - previous);
      }
    }
  }

  /** Zero or one flash, as a list so the template can re-key it by `seq`. */
  flashesFor(playerId: string): ScoreFlash[] {
    const flash = this.flashes().get(playerId);
    return flash ? [flash] : [];
  }

  private flash(playerId: string, delta: number): void {
    clearTimeout(this.timers.get(playerId));
    this.seq++;
    const flash: ScoreFlash = { delta, seq: this.seq };
    this.flashes.update((current) => new Map(current).set(playerId, flash));
    this.timers.set(
      playerId,
      setTimeout(() => {
        this.timers.delete(playerId);
        this.flashes.update((current) => {
          const next = new Map(current);
          next.delete(playerId);
          return next;
        });
      }, FLASH_MS),
    );
  }
}
