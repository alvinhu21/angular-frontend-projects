import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormatTimePipe } from '../../pipes/formatTime.pipe';
import { Subject, takeUntil, tap, timer } from 'rxjs';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'lib-timer-bar',
  imports: [CommonModule, FormatTimePipe,ProgressBarComponent],
  templateUrl: './timer-bar.component.html',
  styleUrl: './timer-bar.component.scss',
})
export class TimerBarComponent implements OnInit, OnDestroy {
  @Input() endDate: Date = new Date();
  @Input() startDate: Date = new Date();
  @Input() barWidth: Number = 10;
  @Input() barLength: Number = 100;
  @Input() verticalMode: boolean = false;
  @Input() increasingMode: boolean = false;
  destroy$ = new Subject<void>();

  leftWidth = 0;

  remainingTime: number = 0;
  totalTime: number = 0;

  timer$ = timer(0,10);

  ngOnInit(): void {
    this.timer$.pipe(takeUntil(this.destroy$), tap(_ => {
      const now = new Date();
      this.totalTime = this.endDate.valueOf() - this.startDate.valueOf();
      if(this.increasingMode){
        this.remainingTime = now.valueOf() - this.startDate.valueOf();
      }else{
        this.remainingTime = this.endDate.valueOf() - now.valueOf();
      }
    })).subscribe();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get bgClass(){
    const remainingPct = this.remainingTime * 100 / this.totalTime;
    if(remainingPct <= 20){
      return "bg-danger";
    }else if(remainingPct <= 50){
      return "bg-warning";
    }
    return "bg-success";
  }

}
