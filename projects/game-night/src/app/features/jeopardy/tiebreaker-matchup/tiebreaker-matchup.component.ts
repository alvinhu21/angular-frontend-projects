import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PlayerView } from '../../../models/session.models';
import { MoneyPipe } from '../money.pipe';

/**
 * Who's playing the tiebreaker - "ALICE vs. BOB", tied at $12,000 - put up while its category is
 * showing, before the clue itself. Names are set side by side rather than joined into a sentence,
 * so it reads the same in every language.
 */
@Component({
  selector: 'app-tiebreaker-matchup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyPipe, TranslateModule],
  templateUrl: './tiebreaker-matchup.component.html',
  styleUrl: './tiebreaker-matchup.component.scss',
})
export class TiebreakerMatchupComponent {
  /** The tied contestants - all on the same score, by definition. */
  readonly contestants = input.required<readonly PlayerView[]>();

  protected readonly tiedScore = computed(() => this.contestants()[0]?.score ?? null);
}
