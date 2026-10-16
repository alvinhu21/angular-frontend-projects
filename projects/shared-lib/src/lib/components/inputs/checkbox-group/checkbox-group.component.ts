import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { BaseInput } from '../baseInput';
import { Option } from '../../../models/options';

@Component({
  selector: 'lib-checkbox-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './checkbox-group.component.html',
  styleUrls: ['./checkbox-group.component.scss'],
})
export class CheckboxGroupComponent extends BaseInput implements OnChanges, OnDestroy {
  @Input() options: Option[] = [];
  @Input() showBulkActions: boolean = true;
  @Input() selectAllLabel: string = 'common.selectAll';
  @Input() selectBothLabel: string = 'common.selectBoth';
  @Input() clearAllLabel: string = 'common.clearAll';

  private readonly cdr = inject(ChangeDetectorRef);
  private controlSub?: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inputFormGroup'] || changes['controlName']) {
      // Checkbox state is rendered from the control rather than written by a value accessor,
      // so programmatic setValue/disable calls need to schedule a refresh (required when zoneless).
      this.controlSub?.unsubscribe();
      this.controlSub = this.formControl?.events.subscribe(() => this.cdr.markForCheck());
    }
  }

  ngOnDestroy(): void {
    this.controlSub?.unsubscribe();
  }

  get selectedValues(): string[] {
    const value = this.formControl?.value;
    return Array.isArray(value) ? value : [];
  }

  get isDisabled(): boolean {
    return this.disabled || !!this.formControl?.disabled;
  }

  get canShowBulkActions(): boolean {
    return this.showBulkActions && this.options.length > 1;
  }

  get bulkSelectLabel(): string {
    return this.options.length === 2 ? this.selectBothLabel : this.selectAllLabel;
  }

  get allSelected(): boolean {
    const selected = this.selectedValues;
    return this.options.every((option) => selected.includes(option.value));
  }

  get noneSelected(): boolean {
    return this.selectedValues.length === 0;
  }

  isSelected(value: string): boolean {
    return this.selectedValues.includes(value);
  }

  optionId(index: number): string {
    return `${this.id}-option-${index}`;
  }

  toggleOption(value: string, checked: boolean): void {
    const selected = new Set(this.selectedValues);
    if (checked) {
      selected.add(value);
    } else {
      selected.delete(value);
    }

    // Rebuild from options so the value always follows option order.
    this.updateValue(this.options.map((option) => option.value).filter((v) => selected.has(v)));
  }

  selectAll(): void {
    this.updateValue(this.options.map((option) => option.value));
  }

  clearAll(): void {
    this.updateValue([]);
  }

  private updateValue(value: string[]): void {
    if (!this.formControl || this.isDisabled) {
      return;
    }

    this.formControl.setValue(value);
    this.formControl.markAsTouched();
    this.formControl.markAsDirty();
  }
}
