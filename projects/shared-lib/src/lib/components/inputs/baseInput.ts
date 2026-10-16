import { Directive, Input } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

@Directive()
export class BaseInput {
  @Input() inputFormGroup!: FormGroup;
  @Input() isHorizontal: boolean = false;
  @Input() label: string = '';
  @Input() id: string = '';
  @Input() controlName: string = '';
  @Input() faIcon: string = '';
  @Input() errorMessages: any = {};
  @Input() placeholder: any = 'common.placeholder';
  @Input() disabled: boolean = false;
  @Input() customClasses: string = '';
  @Input() helpText: string = '';
  @Input() ariaLabel: string = '';
  @Input() ariaDescribedBy: string = '';

  get formControl(): AbstractControl | null {
    return this.inputFormGroup ? this.inputFormGroup.get(this.controlName) : null;
  }

  get hasVisibleErrors(): boolean {
    return !!(this.formControl && this.formControl.errors && (this.formControl.dirty || this.formControl.touched || this.formControl.invalid));
  }

  get errorMessageList(): string[] {
    if (!this.inputFormGroup || !this.formControl || !this.hasVisibleErrors) {
      return [];
    }

    return Object.keys(this.formControl.errors || {}).map((key) => this.errorMessages[key]).filter(Boolean);
  }

  get describedByIds(): string {
    const ids: string[] = [];

    if (this.helpText) {
      ids.push(`${this.id}-help`);
    }

    if (this.errorMessageList.length) {
      ids.push(`${this.id}-errors`);
    }

    if (this.ariaDescribedBy) {
      ids.push(this.ariaDescribedBy);
    }

    return ids.join(' ');
  }

  get controlIsInvalid(): boolean {
    return !!(this.formControl && this.formControl.invalid && (this.formControl.dirty || this.formControl.touched));
  }
}