import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { ChartResponse } from '../models/models';

export interface StockOption {
  label: string;
  value: string;
}

export interface LanguageOption {
  label: string;
  value: string;
}

export const DEFAULT_SIGMA_VALUE = 2;

@Injectable({
  providedIn: 'root',
})
export class StockService {
  /** Immutable stock symbols */
  private static readonly SYMBOLS: readonly string[] = [
    'PSQ', 'UCO', 'XLE', 'TLTW', 'ERY', 'XLK', 'XLI', 'XLY', 'XLU',
    'XLP', 'IWM', 'QQQ', 'XLRE', 'XLB', 'FXI', 'SCO', 'TLT', 'XLC',
    'SIL', 'XLF', 'SLV', 'XLV', 'GDXJ', 'GDX',
  ];

  /** Mapping of stock symbols to icon classes */
  private static readonly ICONS: Readonly<Record<string, string>> = {
    UCO: 'fa-solid fa-droplet',
    XLE: 'fa-solid fa-oil-well',
    TLTW: 'fa-solid fa-coins',
    ERY: 'fa-solid fa-fire-flame',
    XLK: 'fa-solid fa-microchip',
    XLI: 'fa-solid fa-industry',
    XLY: 'fa-solid fa-cart-shopping',
    XLU: 'fa-solid fa-bolt',
    XLP: 'fa-solid fa-utensils',
    IWM: 'fa-solid fa-chart-line',
    QQQ: 'fa-brands fa-qqq',
    XLRE: 'fa-solid fa-building',
    XLB: 'fa-solid fa-hammer',
    FXI: 'fa-solid fa-dragon',
    SCO: 'fa-solid fa-gas-pump',
    TLT: 'fa-solid fa-landmark',
    XLC: 'fa-solid fa-tower-broadcast',
    SIL: 'fa-solid fa-gem',
    XLF: 'fa-solid fa-bank',
    SLV: 'fa-regular fa-circle',
    XLV: 'fa-solid fa-heart-pulse',
    GDXJ: 'fa-solid fa-mountain',
    GDX: 'fa-solid fa-coins',
  };

  /** Consumer sector symbols for easy lookup */
  private static readonly CONSUMER_SYMBOLS = new Set(['XLP', 'XLY']);
  private static readonly INVERSE_SYMBOLS = new Set(['ERY','SCO','PSQ']);

  /** Supported languages for UI formatting */
  public languageOptions: LanguageOption[] = [
    { label: 'English', value: 'en' },
    { label: 'Español', value: 'es' },
    { label: 'Français', value: 'fr' },
    { label: 'Deutsch', value: 'de' },
    { label: 'Italiano', value: 'it' },
    { label: '中文', value: 'zh' },
    { label: '日本語', value: 'ja' },
  ];

  private readonly baseUrl = 'http://localhost:3000/api/quotes/';

  constructor(private readonly http: HttpClient) {}

  /** Fetch a single stock quote by symbol */
  getQuote(symbol: string): Observable<ChartResponse> {
    let currentDate = new Date();
    let startDate = new Date(currentDate.getFullYear()-5, currentDate.getMonth(), currentDate.getDate());
    return this.http.get<ChartResponse>(`${this.baseUrl}${symbol}`, {
      params: new HttpParams().set('period1', Math.round(startDate.valueOf()/1000))
      .set('period2', Math.round(currentDate.valueOf()/1000))
      .set('interval', '1d'),
    });
  }

  /** Fetch all stock quotes in parallel */
  getAllQuotes(): Observable<ChartResponse[]> {
    const requests = StockService.SYMBOLS.map(symbol => this.getQuote(symbol));
    return forkJoin(requests);
  }

  /** Returns stock options for dropdowns */
  get stockOptions(): StockOption[] {
    return StockService.SYMBOLS.map(symbol => ({ label: symbol, value: symbol }));
  }

  /** Returns a copy of all stock symbols */
  get stockSymbols(): string[] {
    return [...StockService.SYMBOLS];
  }

  /** Get the icon class for a stock symbol */
  getStockIcon(symbol: string): string | undefined {
    return StockService.ICONS[symbol];
  }

  /** Determine if a stock symbol is part of the consumer sector */
  isConsumer(symbol: string): boolean {
    return StockService.CONSUMER_SYMBOLS.has(symbol);
  }

  isInverse(symbol: string): boolean {
    return StockService.INVERSE_SYMBOLS.has(symbol);
  }

  /** Get date format string based on language */
  dateFormat(lang: string): string {
    switch (lang.toLowerCase()) {
      case 'en':
        return 'MMMM d, yyyy';
      case 'zh':
      case 'ja':
        return 'yyyy年MM月dd日';
      case 'es':
        return "d 'de' MMMM 'de' yyyy";
      default:
        return 'd MMMM yyyy';
    }
  }

  /** Search stocks (requires backend support) */
  searchStocks(query: string): Observable<ChartResponse> {
    const params = new HttpParams().set('search', query);
    return this.http.get<ChartResponse>(this.baseUrl, { params });
  }
}
