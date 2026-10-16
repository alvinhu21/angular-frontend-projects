import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Answer input for a clue whose response comes from a known list (a state, a country, a
 * president...): the options as big answer bars, pick one. Native radios underneath, so arrow keys,
 * focus and screen readers behave like any radio group, and it slots into a reactive form exactly
 * where the text box would be.
 */
@Component({
  selector: 'app-response-choices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './response-choices.component.html',
  styleUrl: './response-choices.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ResponseChoicesComponent), multi: true }],
})
export class ResponseChoicesComponent implements ControlValueAccessor {
  readonly choices = input.required<readonly string[]>();
  /** Radio group name - unique per form, so two answer forms on one screen never share a pick. */
  readonly name = input.required<string>();
  readonly legend = input.required<string>();

  protected readonly picked = signal<string | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.picked.set(value || null);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /** A, B, C... - how a broadcast answer strip labels its options. */
  protected letterFor(index: number): string {
    return String.fromCharCode(65 + index);
  }

  protected pick(choice: string): void {
    this.picked.set(choice);
    this.onChange(choice);
  }
}
