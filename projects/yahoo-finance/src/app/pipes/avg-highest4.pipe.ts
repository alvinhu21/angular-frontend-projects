import { Pipe, PipeTransform } from '@angular/core';
import { StockRow } from '../components/utils/stock-utils';

@Pipe({
  name: 'avgHighest4',
  pure: true, // MUST be true for OnPush
})
export class AvgHighest4Pipe implements PipeTransform {
  transform(rows: StockRow[]): number {
    if (!rows?.length) return 0;

    // Get the last month of rows
    const lastMonthRows = rows.slice(-20); // adjust based on your data
    const highest4 = [...lastMonthRows]
      .sort((a, b) => b.close - a.close)
      .slice(0, 4);

    const sum = highest4.reduce((acc, row) => acc + row.close, 0);
    return sum / highest4.length;
  }
}
