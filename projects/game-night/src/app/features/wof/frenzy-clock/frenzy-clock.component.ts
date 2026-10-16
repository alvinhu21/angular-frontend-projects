import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Fortune Frenzy's digital clock, counting down in tenths of a second - the readout only; the
 * ticking lives in {@link createFrenzyCountdown}, which the board also reads for its last-five-
 * seconds alert.
 */
@Component({
  selector: 'app-frenzy-clock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, TranslateModule],
  template: `
    <div class="frenzy-clock" [class.frenzy-clock--urgent]="urgent()" role="timer" aria-live="off">
      <span class="visually-hidden">{{ 'wof.frenzyClockLabel' | translate }}</span>
      <span class="frenzy-clock__digits">{{ seconds() | number: '1.1-1' }}</span>
    </div>
  `,
  styleUrl: './frenzy-clock.component.scss',
})
export class FrenzyClockComponent {
  readonly remainingMs = input<number | null>(null);
  /** The last five seconds - the digits turn red. */
  readonly urgent = input(false);

  /** Rounded up to the tenth, so it reads 30.0 at the start and only shows 0.0 once time's up. */
  readonly seconds = computed(() => Math.ceil(Math.max(0, this.remainingMs() ?? 0) / 100) / 10);
}
