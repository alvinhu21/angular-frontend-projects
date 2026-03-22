import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'roman',
})
export class RomanNumeralPipe implements PipeTransform {
  transform(value: number): string {
    if (value <= 0 || value > 3999) {
      return value.toString(); // Roman numerals traditionally handle 1-3999
    }

    const lookup: [string, number][] = [
      ['M', 1000],
      ['CM', 900],
      ['D', 500],
      ['CD', 400],
      ['C', 100],
      ['XC', 90],
      ['L', 50],
      ['XL', 40],
      ['X', 10],
      ['IX', 9],
      ['V', 5],
      ['IV', 4],
      ['I', 1],
    ];

    let result = '';
    let remaining = value;

    for (const [roman, num] of lookup) {
      while (remaining >= num) {
        result += roman;
        remaining -= num;
      }
    }

    return result;
  }
}