import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Subject, takeUntil, timer } from 'rxjs';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'lib-timer-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ProgressBarComponent],
  templateUrl: './timer-bar.component.html',
  styleUrl: './timer-bar.component.scss',
})
export class TimerBarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() endDate: Date = new Date();
  @Input() startDate: Date = new Date();
  /** A number is pixels; a string is any CSS length (e.g. '0.75rem'). */
  @Input() barWidth: number | string = 10;
  /** A number is pixels; a string is any CSS length (e.g. '100%'). */
  @Input() barLength: number | string = 100;
  @Input() verticalMode: boolean = false;
  @Input() increasingMode: boolean = false;
  @Input() twoWay: boolean = false;
  /** How often the bar re-measures the time left, in milliseconds. Read once, on init. */
  @Input() tickMs: number = 10;
  destroy$ = new Subject<void>();

  leftWidth = 0;

  // Signals rather than plain fields so the bar keeps moving inside OnPush hosts: a signal change
  // schedules a refresh of this view even when nothing above it has been marked dirty.
  readonly remainingTime = signal(0);
  readonly totalTime = signal(0);

  readonly bgClass = computed(() => {
    const remainingPct = this.remainingTime() * 100 / this.totalTime();
    if(remainingPct <= 20){
      return "bg-danger";
    }else if(remainingPct <= 50){
      return "bg-warning";
    }
    return "bg-success";
  });

  ngOnChanges(): void {
    // Re-measure straight away so a new window never shows a stale bar until the next tick.
    this.measure();
  }

  ngOnInit(): void {
    timer(0, this.tickMs).pipe(takeUntil(this.destroy$)).subscribe(() => this.measure());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private measure(): void {
    const now = Date.now();
    this.totalTime.set(this.endDate.valueOf() - this.startDate.valueOf());
    if(this.increasingMode){
      this.remainingTime.set(now - this.startDate.valueOf());
    }else{
      this.remainingTime.set(this.endDate.valueOf() - now);
    }
  }

}
