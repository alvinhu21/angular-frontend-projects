import { ChangeDetectionStrategy, Component, booleanAttribute, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/**
 * A grid of letter keys styled like revealed board cards. Letters already used stay in place (the
 * alphabet never shifts) but are disabled and struck through.
 */
@Component({
  selector: 'app-letter-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './letter-picker.component.html',
  styleUrl: './letter-picker.component.scss',
})
export class LetterPickerComponent {
  readonly letters = input.required<readonly string[]>();
  readonly used = input.required<readonly string[]>();
  /** Gold vowel keys in a single row of five, rather than the consonant grid. */
  readonly vowels = input(false, { transform: booleanAttribute });
  readonly pick = output<string>();
}
