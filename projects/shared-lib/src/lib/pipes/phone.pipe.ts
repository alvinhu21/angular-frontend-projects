import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phone',
})
export class PhonePipe implements PipeTransform {
  transform(value: number, countryCode: string): string {
    const valueStr = `${value}`;

    
    if(countryCode.toUpperCase() === 'FR'){
      `(${valueStr.substring(0,2)}) ${valueStr.substring(2,4)} ${valueStr.substring(4,6)} ${valueStr.substring(6,8)} ${valueStr.substring(8)}`;
    }
    return `(${valueStr.substring(0,3)}) ${valueStr.substring(3,6)}-${valueStr.substring(6)}`;
    
  }
}