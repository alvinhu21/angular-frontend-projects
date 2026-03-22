// models/chart.model.ts

import e from "express";

export interface ChartResponse {
  chart: Chart;
}

export interface Chart {
  result: ChartResult[];
  error: any;
}

export interface Option{
  label: string;
  value: string | number;
}

export interface ChartResult {
  meta: Meta;
  timestamp: number[];
  indicators: Indicators;
  technicalIndicators:  IndicatorResult;
}

export interface IndicatorResult {
  RSI: (number | null)[];
  avgofHighest4InLastMonth? : number;
  bollingerBands?: { upper: number | null; middle: number | null; lower: number | null }[];
}
export interface BollingerBands{
    middle: number|null;
    upper: number|null;
    lower: number|null;
}

export interface Meta {
  currency: string;
  symbol: string;
  exchangeName: string;
  fullExchangeName: string;
  instrumentType: string;
  firstTradeDate: number;
  regularMarketTime: number;
  hasPrePostMarketData: boolean;
  gmtoffset: number;
  timezone: string;
  exchangeTimezoneName: string;
  regularMarketPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  longName: string;
  shortName: string;
  chartPreviousClose: number;
  priceHint: number;
  currentTradingPeriod: TradingPeriod;
  dataGranularity: string;
  range: string;
  validRanges: string[];
}

export interface TradingPeriod {
  pre: TradingTime;
  regular: TradingTime;
  post: TradingTime;
}

export interface TradingTime {
  timezone: string;
  end: number;
  start: number;
  gmtoffset: number;
}

export interface Indicators {
  quote: Quote[];
  adjclose: AdjClose[];
}

export interface Quote {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface AdjClose {
  adjclose: number[];
}