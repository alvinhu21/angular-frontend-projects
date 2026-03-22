import { AbstractControl, ValidationErrors } from '@angular/forms';

export function zipCodeValidator(countryCode: string) {

  const patterns: { [key: string]: RegExp } = {
    US: /^\d{5}(-\d{4})?$/,
    MX: /^\d{5}$/,
    FR: /^\d{5}$/,
    CN: /^\d{6}$/,
    JP: /^\d{3}[-]?\d{4}$/,
    CA: /^[ABCEGHJ-NPRSTVXYabceghj-nprstvxy]\d[ABCEGHJ-NPRSTVW-Zabceghj-nprstvw-z][ -]?\d[ABCEGHJ-NPRSTVW-Zabceghj-nprstvw-z]\d$/,
    GB: /^(?:[A-PR-UWYZ](\d|[1-9]\d)|([A-PR-UWYZ][A-HK-Y]|XX|XM)(\d|[1-9]\d)|[A-PR-UWYZ]\d[A-HJKPSTUW]|([A-PR-UWYZ][A-HK-Y]|XX|XM)\d[ABEHMNPRVWXY]|[BFS]IQQ|ASCN|BBND|PCRN|STHL|TDCU|DKCA)\s\d[ABD-HJLNP-UW-Z]{2}$/
  };

  return (control: AbstractControl): ValidationErrors | null => {

    if (!control.value) {
      return null;
    }

    const regex = patterns[countryCode];

    if (!regex || regex.test(control.value)) {
      return null;
    }

    return  { invalidZip: true };
  };
}