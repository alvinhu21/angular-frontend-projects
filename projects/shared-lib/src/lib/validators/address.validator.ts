import { AbstractControl, ValidationErrors } from '@angular/forms';

export function addressValidator(control: AbstractControl): ValidationErrors | null {
  if(/^\d{1,6}\s[A-Za-z0-9\s.'-]{3,}(?:\s(?:Apt|Suite|Ste|Unit|#)\s?\w+)?$/.test(control.value)){
    return null;
  }
  return { invalidAddress: true };
}