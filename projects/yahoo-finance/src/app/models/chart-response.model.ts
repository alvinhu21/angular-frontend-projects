import { StockMeta } from './stock-meta.model';
import { StockIndicators } from './stock-quote.model';

export interface ChartResult {
  readonly meta: StockMeta;
  readonly timestamp: number[];
  readonly indicators: StockIndicators;
}

export interface ChartResponse {
  readonly chart: {
    readonly result: ChartResult[] | null;
    readonly error: string | null;
  };
}