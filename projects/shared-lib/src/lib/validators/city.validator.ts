import { AbstractControl, ValidationErrors } from '@angular/forms';

export function cityValidator(control: AbstractControl): ValidationErrors | null {
  if(/^[A-Za-z]+\.?(?:[ '-][A-Za-z]+\.?)*$/.test(control.value)){
    return null;
  }
  return { invalidCity: true };
}