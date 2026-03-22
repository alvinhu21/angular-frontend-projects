import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormatTimePipe } from '../../pipes/formatTime.pipe';
import { Subject, takeUntil, tap, timer } from 'rxjs';

@Component({
  selector: 'lib-timer',
  imports: [CommonModule, FormatTimePipe],
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss',
})
export class TimerComponent implements OnInit, OnDestroy {
  @Input() endDate: Date = new Date();
  @Input() label: string = "";
  @Input() messageToShow: string = "";

  destroy$ = new Subject<void>();
  timer$ = timer(0,10);
  timeLeft = 0;
  
  ngOnInit(){
    this.timer$.pipe(
      takeUntil(this.destroy$), 
      tap(_ => { this.timeLeft = this.endDate.valueOf() - (new Date()).valueOf(); } ))
    .subscribe();
  }
  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

    
}
