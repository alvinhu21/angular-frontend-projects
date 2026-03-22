export interface MarketSession {
  timezone: string;
  start: number;
  end: number;
  gmtoffset: number;
}

export interface TradingPeriods {
  pre: MarketSession;
  regular: MarketSession;
  post: MarketSession;
}

export interface StockMeta {
  currency: string;
  symbol: string;
  exchangeName: string;
  fullExchangeName: string;
  instrumentType: string;
  firstTradeDate: number;
  regularMarketTime: number;
  gmtoffset: number;
  timezone: string;
  exchangeTimezoneName: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  currentTradingPeriod: TradingPeriods;
  dataGranularity: string;
  range: string;
  validRanges: string[];
}