export class MathStats {
  /**
   * Calculates the arithmetic mean of an array of numbers.
   * @param data - The numeric dataset.
   */
  static getMean(data: number[]): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }

  /**
   * Calculates the median value.
   */
  static getMedian(data: number[]): number {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculates the standard deviation.
   * Formula: σ = sqrt(Σ(x - μ)² / N)
   */
  static getStandardDeviation(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = this.getMean(data);
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Identifies the mode(s) of the dataset.
   */
  static getMode(data: number[]): number[] {
    if (data.length === 0) return [];
    const frequency: { [key: number]: number } = {};
    let maxFreq = 0;
    const modes: number[] = [];

    data.forEach(num => {
      frequency[num] = (frequency[num] || 0) + 1;
      if (frequency[num] > maxFreq) maxFreq = frequency[num];
    });

    for (const num in frequency) {
      if (frequency[num] === maxFreq) {
        modes.push(Number(num));
      }
    }
    return modes;
  }
}