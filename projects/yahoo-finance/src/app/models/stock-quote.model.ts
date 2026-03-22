export interface QuoteData {
  low: (number | null)[];
  open: (number | null)[];
  volume: (number | null)[];
  high: (number | null)[];
  close: (number | null)[];
}

export interface AdjustedClose {
  adjclose: (number | null)[];
}

export interface StockIndicators {
  quote: QuoteData[];
  adjclose?: AdjustedClose[];
}