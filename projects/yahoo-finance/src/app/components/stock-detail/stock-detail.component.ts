import { ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import { DEFAULT_SIGMA_VALUE, StockService } from '../../services/stock.service';
import { TechnicalIndicatorsService } from '../../services/technical-indicators.service';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, timer, Subject, merge } from 'rxjs';
import {  takeUntil,  startWith, distinctUntilChanged, exhaustMap, tap } from 'rxjs/operators';
import { ChartResponse, IndicatorResult } from '../../models/models';
import { calculateIndicators, mapToStockRows, StockRow } from '../utils/stock-utils';
import { CommonModule, registerLocaleData } from '@angular/common';
import { TypeSelectComponent } from 'shared-lib';
import { AvgHighest4Pipe } from '../../pipes/avg-highest4.pipe';

// Import the locale data for each language
import localeDe from '@angular/common/locales/de';
import localeIt from '@angular/common/locales/it';
import localeJa from '@angular/common/locales/ja';
import localeZh from '@angular/common/locales/zh';
import localeEs from '@angular/common/locales/es';
import localeFr from '@angular/common/locales/fr';
import { SliderComponent } from '../shared/slider/slider.component';

// Register each locale

for(let locale of [localeDe, localeIt, localeJa, localeZh, localeEs, localeFr]){
  registerLocaleData(locale);
}
/**
 * Interface to structure data displayed in the component.
 */
interface StockDetailDisplay {
  chart: ChartResponse['chart']['result'][0];
  indicators: IndicatorResult;
  rows: StockRow[];
}

@Component({
  selector: 'app-stock-detail',
  templateUrl: './stock-detail.component.html',
  styleUrls: ['./stock-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SliderComponent, CommonModule, FormsModule, TypeSelectComponent, TranslateModule, AvgHighest4Pipe],
})
export class StockDetailComponent implements OnInit, OnDestroy {
  /** RxJS Subject to handle unsubscription on component destroy */
  private readonly destroy$ = new Subject<void>();
  getMonthNames = (locale = 'en-US', format: 'long' | 'short' | 'narrow' = 'long') => {
    const formatter = new Intl.DateTimeFormat(locale, { month: format });
    return Array.from({ length: 12 }, (_, i) => 
      formatter.format(new Date(2023, i, 1))
    );
  };
  /** Holds all stock chart data fetched from the service */
  private allStockData: ChartResponse[] = [];
  selectedSymbolForTemplate: string = '';
  /** Reactive stream for currently selected stock details */
  stockDetail$ = new BehaviorSubject<StockDetailDisplay | null>(null);

  get stockOptions(){
    if(!this.stockService){
      return [];
    }
    return this.stockService.stockOptions;
  }

  /** Reactive form to manage UI controls */
  formGroup = new FormGroup({
    selectedSymbol: new FormControl<string>(''),
    selectedYear: new FormControl<number>(new Date().getFullYear()),
    selectedMonth: new FormControl<number>(new Date().getMonth()),
    selectedSigma: new FormControl<number>(DEFAULT_SIGMA_VALUE),
    selectedLanguage: new FormControl('en'),
  });

  /** Sigma options for Bollinger Bands calculations */
  sigmaOptions = Array.from({ length: 9 }, (_, i) => ({
    label: `${i / 2 + 1}`,
    value: i / 2 + 1,
  }));

  /** Year options for filtering stock data */
  yearOptions = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { label: year.toString(), value: year };
  });

  monthOptions = Array.from({length: 12}, (_, i) => {
    const monthNames = this.getMonthNames();
    return { label: monthNames[i], value: i+1}
  })

  selectControls$ = new BehaviorSubject<any[]>([]);
  constructor(
    private readonly stockService: StockService,
    private readonly indicators: TechnicalIndicatorsService,
    private readonly translate: TranslateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    // Initialize i18n support
    this.translate.setFallbackLang('en');
    const langs = this.stockService.languageOptions.map((lang) => lang.value);
    this.translate.addLangs(langs);
  }

  /** Form value getters for convenience */
  get selectedSigma(): number {
    return Number(this.formGroup.controls.selectedSigma.value);
  }

  get selectedLanguage(): string {
    return this.formGroup.controls.selectedLanguage.value ?? 'en';
  }

  get selectedYear(): number {
    return Number(this.formGroup.controls.selectedYear.value);
  }

  get selectedMonth(): number {
    return Number(this.formGroup.controls.selectedMonth.value);
  }

  get selectedSymbol(): string {
    return this.formGroup.controls.selectedSymbol.value ?? '';
  }

  get languageOptions() {
    if(!this.stockService){
      return [];
    }
    return this.stockService.languageOptions;
  }

  /** Formatted current date string based on selected language */
  get todaysDate(): string {
    return new Intl.DateTimeFormat(this.selectedLanguage, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }

  /** Date format string for Angular date pipe */
  get dateFormat(): string {
    return this.stockService.dateFormat(this.selectedLanguage);
  }
  trackByIndex(index: number): number {
    return index;
  }
  ngOnInit(): void {
    this.formGroup.controls.selectedSymbol.valueChanges
      .pipe(takeUntil(this.destroy$), tap(value => this.selectedSymbolForTemplate = value ?? ''))
      .subscribe();
    this.formGroup.controls.selectedYear.valueChanges
      .pipe(
        startWith(this.formGroup.controls.selectedYear.value),
        takeUntil(this.destroy$), tap(value => {
        
        let currentDate = new Date();
        let numMonthsToScan = Number(value) === currentDate.getFullYear() ? currentDate.getMonth()+1 : 12;
        this.monthOptions = Array.from({length: numMonthsToScan}, (_, i) => {
          const monthNames = this.getMonthNames();
          return { label: monthNames[i], value: i+1}
        });
        this.updateSelectedControls();
      })).subscribe();
      this.updateSelectedControls();
    
    this.setupLanguageListener();
    this.setupStockDataListener();
  }

  updateSelectedControls(){
    this.selectControls$.next([
      { label: 'stock.selectMonth', options: this.monthOptions, control: 'selectedMonth' },
      { label: 'stock.selectYear', options: this.yearOptions, control: 'selectedYear' },
      { label: 'stock.selectStock', options: this.stockOptions, control: 'selectedSymbol' },
      { label: 'stock.selectLanguage', options: this.languageOptions, control: 'selectedLanguage' }
    ]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Listen for changes in language and apply translations
   */
  private setupLanguageListener(): void {
    this.formGroup.controls.selectedLanguage.valueChanges
      .pipe(takeUntil(this.destroy$), startWith(this.selectedLanguage),tap((lang) => this.translate.use(lang ?? 'en')))
      .subscribe();
  }

  private setupStockDataListener(): void {
    this.formGroup.controls.selectedSymbol.setValue(this.route.snapshot.paramMap.get('stock'));
    combineLatest([
      this.formGroup.controls.selectedSymbol.valueChanges.pipe(
        startWith(this.formGroup.controls.selectedSymbol.value)
      ),
      this.formGroup.controls.selectedSigma.valueChanges.pipe(
        startWith(this.formGroup.controls.selectedSigma.value)
      ),
      timer(0, 60_000).pipe(
        exhaustMap(_ => this.stockService.getAllQuotes())
      )
    ])
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged(
          (prev, curr) => {
            return Array(3).fill(0).every((_,i) => prev[i] === curr[i] );
          }
        ),
        tap(([symbol, sigma, data]) => {
          this.allStockData = data;
          this.updateDetail(symbol, Number(sigma));
        })
      )
      .subscribe();

  }
   

  public getFilteredRowsByYear(rows: StockRow[]){
    return rows.filter(row => {
      let d = new Date(row.timestamp*1000);
      return d.getFullYear() === this.selectedYear && d.getMonth() === this.selectedMonth-1;
    });
  }


  /**
   * Update the current stock details based on selected symbol and sigma
   */
  private updateDetail(symbol: string | null, sigma: number): void {
    if (!symbol) {
      this.stockDetail$.next(null);
      return;
    }

    const entry = this.allStockData.find(
      (e) => e.chart.result.length > 0 && e.chart.result[0].meta.symbol === symbol
    );

    if (!entry) {
      this.stockDetail$.next(null);
      return;
    }

    const chart = entry.chart.result[0];

    // Calculate indicators
    const indicators = calculateIndicators(
      chart.indicators.quote[0].close.map((price,i,a) => price ?? (a[i+1]+a[i-1])/2 ),
      chart.timestamp,
      sigma,
      this.indicators.calculateRSI.bind(this.indicators),
      this.indicators.calculateBollingerBands.bind(this.indicators)
    );

    const rows = mapToStockRows(chart, indicators);

    const newStockDetail: StockDetailDisplay = { chart, indicators, rows };
    newStockDetail.rows.sort((a,b)=>b.timestamp-a.timestamp);

    // Only emit if something actually changed
    const current = this.stockDetail$.value;
    const isDifferent =
        !current ||
        current.chart.meta.symbol !== chart.meta.symbol ||
        current.rows !== rows; // compare reference

    if (isDifferent) {
      this.stockDetail$.next(newStockDetail);
    }
  }
}
