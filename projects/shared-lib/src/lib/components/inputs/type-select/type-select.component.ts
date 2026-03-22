import { CommonModule } from '@angular/common';
import { Component, Input, Self, forwardRef, inject } from '@angular/core';
import { ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl   } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BaseInput } from '../baseInput';


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
  @Input() options: { label: string; value: any }[] = [];
  @Input() useTypeSelect: boolean = false;
// Inject NgControl safely
  public controlDir = inject(NgControl, { self: true, optional: true });

  displayValue: string = '';
  internalValue: any = null;
  isDisabled: boolean = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  constructor() {
    super();
    if (this.controlDir) {
      // Connect our component to the Angular Form logic
      this.controlDir.valueAccessor = this;
    }
  }

  ngOnInit(): void {
    // Logic to run on init if needed
  }

  get isInvalid(): boolean {
    return !!(this.controlDir?.invalid && this.controlDir?.touched);
  }

  // Add this method to your TypeSelectComponent
  openPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    // This triggers the native browser datalist dropdown
    input.showPicker(); 
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
  handleBlur(): void {
    // Notifies the Angular form that the user has interacted with/left the field
    this.onTouched();
  }
  writeValue(value: any): void {
    this.internalValue = value;
    const found = this.options.find(opt => opt.value === value);
    this.displayValue = found ? found.label : value || '';
  }

  get emptyOptionList(){
    return !this.options || this.options.length === 0;
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; }
}
