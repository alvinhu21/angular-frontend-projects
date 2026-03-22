import { AbstractControl, ValidationErrors } from '@angular/forms';

export function profanityValidator(control: AbstractControl): ValidationErrors | null {
const value = control.value;

  // If the field is empty, we let the 'required' validator handle it
  if (!value) {
    return null;
  }

  // The list of restricted terms
  const forbiddenWords = [
    'Fuck', 
    'Shit', 
    'Piss', 
    'Tits', 
    'Bitch', 
    'Nigga',
    'Nigger', 
    'Cocksuck',
    'Asshole'
  ];

  // We convert the value to lowercase to catch "FREAK", "freak", or "Freak"
  const lowercaseValue = value.toString()
  .replaceAll(/\s/g,"")
  .replaceAll(/[0]/g,"O")
  .replaceAll(/[1!]/g,"I")
  .replaceAll(/[3]/g,"E")
  .replaceAll(/[@4]/g,"A")
  .replaceAll(/[5$]/g,"S")
  .replaceAll(/[6]/g,"B")
  .replaceAll(/[9]/g,"G")
  .replaceAll(/[8]/g,"B").toLowerCase();

  // Check if any forbidden word is included in the input string
  const hasProfanity = forbiddenWords.some(word => 
    lowercaseValue.includes(word.toLowerCase())
  );

  if (hasProfanity) {
    return { profanity: { message: 'common.prohibitedLanguage' } };
  }
  return null;
}