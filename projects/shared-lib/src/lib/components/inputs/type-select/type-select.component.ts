import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef, inject } from '@angular/core';
import { ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BaseInput } from '../baseInput';
import { Option } from '../../../models/options';

@Component({
  selector: 'lib-type-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TypeSelectComponent),
      multi: true
    }
  ],
  templateUrl: './type-select.component.html',
  styleUrls: ['./type-select.component.scss']
})
export class TypeSelectComponent extends BaseInput {
  @Input() options: Option[] = [];
  @Input() useTypeSelect: boolean = false;
  @Input() clearable: boolean = true; // Option to enable/disable clear button

  public controlDir = inject(NgControl, { self: true, optional: true });

  displayValue: string = '';
  internalValue: any = null;
  isDisabled: boolean = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  constructor() {
    super();
    if (this.controlDir) {
      this.controlDir.valueAccessor = this;
    }
  }

  get isInvalid(): boolean {
    return !!(this.controlDir?.invalid && this.controlDir?.touched);
  }

  openPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (typeof input.showPicker === 'function' && !this.isDisabled) {
      input.showPicker();
    }
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedText = input.value;
    const foundOption = this.options.find(opt => opt.label === selectedText);

    if (foundOption) {
      this.internalValue = foundOption.value;
      this.displayValue = foundOption.label;
    } else {
      this.internalValue = selectedText;
      this.displayValue = selectedText;
    }

    this.onChange(this.internalValue);
  }

  clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    this.internalValue = null;
    this.displayValue = '';
    this.onChange(this.internalValue);
    this.onTouched();
  }

  handleBlur(): void {
    this.onTouched();
  }

  writeValue(value: any): void {
    this.internalValue = value;
    const found = this.options.find(opt => opt.value === value);
    this.displayValue = found ? found.label : value || '';
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; }
}