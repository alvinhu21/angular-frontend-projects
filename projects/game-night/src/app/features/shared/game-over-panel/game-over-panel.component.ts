import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PlayerView } from '../../../models/session.models';
import { FinalResultEntry } from '../../../models/jeopardy.models';

@Component({
  selector: 'app-game-over-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, TranslateModule],
  templateUrl: './game-over-panel.component.html',
  styleUrl: './game-over-panel.component.scss',
})
export class GameOverPanelComponent {
  private readonly playersSignal = signal<PlayerView[]>([]);
  private readonly winnerIdsSignal = signal<string[]>([]);

  @Input({ required: true }) set players(value: PlayerView[]) {
    this.playersSignal.set(value);
  }

  @Input({ required: true }) set winnerPlayerIds(value: string[]) {
    this.winnerIdsSignal.set(value ?? []);
  }

  @Input() finalResults: FinalResultEntry[] | null = null;

  readonly winners = computed(() =>
    this.playersSignal().filter((p) => this.winnerIdsSignal().includes(p.playerId)),
  );

  /** Best score first - and on equal scores, a winner first (one who won a tiebreaker for it). */
  readonly ranked = computed(() =>
    [...this.playersSignal()].sort(
      (a, b) => b.score - a.score || Number(this.isWinner(b.playerId)) - Number(this.isWinner(a.playerId)),
    ),
  );

  isWinner(playerId: string): boolean {
    return this.winnerIdsSignal().includes(playerId);
  }
}
