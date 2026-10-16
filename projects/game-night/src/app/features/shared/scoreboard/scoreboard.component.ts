import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PlayerView } from '../../../models/session.models';

@Component({
  selector: 'app-scoreboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, TranslateModule],
  templateUrl: './scoreboard.component.html',
  styleUrl: './scoreboard.component.scss',
})
export class ScoreboardComponent {
  @Input({ required: true }) players: PlayerView[] = [];
  @Input() currentPlayerId: string | null = null;
  @Input() myPlayerId: string | null = null;
  /** WOF only: money won this round that hasn't been banked into `score` yet - a Bankrupt zeroes
   *  this out without touching `score`. Left null for games (e.g. Jeopardy) with no such concept. */
  @Input() roundScores: Record<string, number> | null = null;
  /** WOF only: whoever holds the Wild Card shows it beside their score. */
  @Input() wildCardHolderId: string | null = null;
  /** WOF only: whoever holds the Million Dollar Wedge shows it beside their score... */
  @Input() millionWedgeHolderId: string | null = null;
  /** ...dimmed until they've banked it by solving the round they picked it up in. */
  @Input() millionWedgeSecured = false;

  roundScoreFor(playerId: string): number {
    return this.roundScores?.[playerId] ?? 0;
  }
}
