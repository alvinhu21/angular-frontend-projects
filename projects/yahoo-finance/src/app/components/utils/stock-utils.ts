
import { ChartResponse, IndicatorResult } from '../../models/models';

export interface StockRow {
  timestamp: number;
  close: number;
  bollinger?: { lower: number; middle: number; upper: number };
}

export function calculateIndicators(
  closings: number[],
  timestamps: number[],
  sigma: number,
  calculateRSI: (data: number[]) => (number | null)[],
  calculateBollingerBands: (data: number[], period: number, sigma: number) => ({ lower: number | null; middle: number | null; upper: number | null })[]
): IndicatorResult {
  const rawRSI = calculateRSI(closings);
  const safeRSI = rawRSI.map(v => v ?? 0);

  const rawBands = calculateBollingerBands(closings, 20, sigma);
  const safeBands = rawBands.map(b => ({
    lower: b.lower ?? 0,
    middle: b.middle ?? 1, // prevent divide by zero
    upper: b.upper ?? 0
  }));

  // Last month top 4 average
  const now = new Date();
  const lastMonthTimestamps = timestamps.filter(ts =>
    new Date(ts * 1000) > new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  );
  const closingsInLastMonth = closings.slice(-lastMonthTimestamps.length).sort((a, b) => b - a);
  const avgofHighest4InLastMonth = closingsInLastMonth.slice(0, 4).reduce((a, b) => a + b, 0) / 4;


  return {
    RSI: rawRSI,                    // keep nullable for display
    bollingerBands: rawBands,       // keep nullable for display
    avgofHighest4InLastMonth       // guaranteed number[]
  };

}
// Map chart to rows for template
export function mapToStockRows(
  chart: ChartResponse['chart']['result'][0],
  indicators: IndicatorResult
): StockRow[] {
  return chart.timestamp.map((ts, i) => ({
    timestamp: ts,
    close: chart.indicators.quote[0].close[i],
    bollinger: indicators.bollingerBands?.[i] ? {
      lower: indicators.bollingerBands[i]?.lower ?? 0,
      middle: indicators.bollingerBands[i]?.middle ?? 1,
      upper: indicators.bollingerBands[i]?.upper ?? 0
    } : undefined
  }));
}