import { Injectable } from '@angular/core';
import { BollingerBands } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class TechnicalIndicatorsService {

  constructor() {}

  /**
   * Calculate RSI (Relative Strength Index)
   * @param prices array of closing prices
   * @param period number of periods (default 14)
   * @returns array of RSI values (first period-1 are null)
   */
  calculateRSI(prices: number[], period: number = 14): (number | null)[] {
    if (prices.length < period) return [];

    const rsi: (number | null)[] = Array(period).fill(null); // first period-1 values are null
    let gains = 0;
    let losses = 0;

    // Initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const delta = prices[i] - prices[i - 1];
      if (delta > 0) gains += delta;
      else losses += Math.abs(delta);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    rsi.push(this.computeRSI(avgGain, avgLoss));

    // Subsequent RSI values
    for (let i = period + 1; i < prices.length; i++) {
      const delta = prices[i] - prices[i - 1];
      const gain = delta > 0 ? delta : 0;
      const loss = delta < 0 ? Math.abs(delta) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rsi.push(this.computeRSI(avgGain, avgLoss));
    }

    return rsi;
  }

  private computeRSI(avgGain: number, avgLoss: number): number {
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate Bollinger Bands
   * @param prices array of closing prices
   * @param period moving average period (default 20)
   * @param stdDevMultiplier standard deviation multiplier (default 2)
   * @returns array of { middle, upper, lower } objects
   */
  calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
  ): BollingerBands[] {
    const bands: BollingerBands[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        bands.push({ middle: null, upper: null, lower: null });
        continue;
      }

      const slice = prices.slice(i - period + 1, i + 1);
      const mean = this.mean(slice);
      const stdDev = this.standardDeviation(slice, mean);

      bands.push({
        middle: mean,
        upper: mean + stdDevMultiplier * stdDev,
        lower: mean - stdDevMultiplier * stdDev
      });
    }

    return bands;
  }

  private mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private standardDeviation(arr: number[], mean: number): number {
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }
}
