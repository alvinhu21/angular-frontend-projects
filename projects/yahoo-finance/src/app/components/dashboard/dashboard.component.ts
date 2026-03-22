import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DEFAULT_SIGMA_VALUE, StockService } from '../../services/stock.service';
import { TechnicalIndicatorsService } from '../../services/technical-indicators.service';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { timer, BehaviorSubject, combineLatest, Subject, Observable } from 'rxjs';
import { startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ChartResponse } from '../../models/models';
import { calculateIndicators,  mapToStockRows } from '../utils/stock-utils';
import { CommonModule } from '@angular/common';
import { SliderComponent } from '../shared/slider/slider.component';
import { StockDisplay } from '../interfaces/stock-display';
import { ModalComponent, TypeSelectComponent  } from 'shared-lib';

@Component({
  selector: 'app-dashboard',
  imports: [SliderComponent, ModalComponent, TypeSelectComponent, CommonModule, FormsModule, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('infoModal') infoModal!: ModalComponent;


  stockData$ = new BehaviorSubject<StockDisplay[]>([]);
  todaysDate$ = new BehaviorSubject<String>("");
  processStocks$ = new Observable<any>();
  dateIndex = 1;




  modalData = {
    'header': '',
    'body': '',
    'footer': ''
  }

  formGroup = new FormGroup({
    selectedSigma: new FormControl<number>(DEFAULT_SIGMA_VALUE),
    selectedLanguage: new FormControl('en',{ validators: [Validators.required]})
  });


  constructor(
    private stockService: StockService,
    private indicators: TechnicalIndicatorsService,
    private translate: TranslateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.translate.setFallbackLang('en');
    const langs = this.stockService.languageOptions.map(lang => lang.value);
    this.translate.addLangs(langs);
  }

  get selectedSigma() { return Number(this.formGroup.controls.selectedSigma.value); }
  get selectedLanguage() { 
    let lang = this.formGroup.controls.selectedLanguage.value;
    if(!lang){
      return 'en';
    }
    const selectedLanguageOption = this.languageOptions.find(opt => [opt.label,opt.value].includes(lang));
    if(!selectedLanguageOption){
      return 'en';
    }
    return selectedLanguageOption.value;
  }
  get languageOptions() { return this.stockService.languageOptions; }
  languageChange$ = this.formGroup.controls.selectedLanguage.valueChanges.pipe(
      // Ensure we start with the current value if needed
      startWith(this.formGroup.controls.selectedLanguage.value),
      // Use takeUntil to prevent memory leaks in the component lifecycle
      takeUntil(this.destroy$),
      // Use tap to handle the secondary side effects (translation and date update)
      tap(_ => {

          this.translate.use(this.selectedLanguage);
          this.updateTodaysDate();
      })
  );

  openModal(data: any): void {
    this.modalData.header = data;
    this.modalData.body = data;
    this.modalData.footer = data;
    if(this.infoModal){
      this.infoModal.openModal();
    }
  }

  closeModal(): void {
    this.infoModal.closeModal();
  }



  updateTodaysDate(): void {
    
    this.todaysDate$.next(new Intl.DateTimeFormat(this.selectedLanguage, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date()));
  }



  get dateFormat(): string {
    return this.stockService.dateFormat(this.selectedLanguage);
  }

  isInverse(symbol: string): boolean {
    return this.stockService.isInverse(symbol);
  }

  ngOnInit() {
    // Language reactive
    
    this.languageChange$.subscribe();
    let tmr$ = timer(0,10).pipe(takeUntil(this.destroy$),tap(_ => this.updateTodaysDate()));
    tmr$.subscribe();

    
    this.processStocks$ = combineLatest({
      sigma: this.formGroup.controls.selectedSigma.valueChanges.pipe(
        startWith(this.formGroup.controls.selectedSigma.value)
      ),
      data: timer(0, 60_000).pipe(
        switchMap(() => this.stockService.getAllQuotes())
      )
    }).pipe(
      tap(({ sigma, data }) => this.processStocks(data, Number(sigma))),
      takeUntil(this.destroy$)
    );
    
    this.processStocks$.subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private processStocks(data: ChartResponse[], sigma: number) {
    const processed: StockDisplay[] = data.map(entry => {
      const chart = entry.chart.result[0];
      const indicators = calculateIndicators(
        chart.indicators.quote[0].close.map((price,i,a) => price ?? (a[i+1]+a[i-1])/2 ),
        chart.timestamp,
        sigma,
        this.indicators.calculateRSI.bind(this.indicators),
        this.indicators.calculateBollingerBands.bind(this.indicators)
      );
      return {
        chart,
        indicators,
        rows: mapToStockRows(chart, indicators)
      };
    });

    this.stockData$.next(processed);
    this.cdr.markForCheck();
  }

  getBadgeColor(data: StockDisplay){
    let mostRecentClosing = data.rows.at(-1)?.close || 0;
    let secondMostRecentClosing = data.rows.at(-2)?.close || 0;
    if(mostRecentClosing > secondMostRecentClosing){
      return 'bg-success';
    }else if(mostRecentClosing < secondMostRecentClosing){
      return 'bg-danger';
    }
    return 'bg-secondary';
  }

  trackBySymbol(_: number, data: StockDisplay){
    return data.chart.meta.symbol;
  }

  navigateToPage(symbol: string) {
    this.router.navigate(['/stockDetails', symbol]);
  }
}

