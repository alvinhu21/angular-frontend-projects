import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { formatNumber } from '@angular/common';

/** Game-show dollars: `1200` -> `$1,200`, `-400` -> `−$400` (sign before the symbol, as on air). */
@Pipe({ name: 'jpMoney' })
export class MoneyPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | null | undefined): string {
    const amount = value ?? 0;
    const sign = amount < 0 ? '−' : '';
    return `${sign}$${formatNumber(Math.abs(amount), this.locale, '1.0-0')}`;
  }
}
