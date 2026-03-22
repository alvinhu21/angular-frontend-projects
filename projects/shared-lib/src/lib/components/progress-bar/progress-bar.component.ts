import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormatTimePipe } from '../../pipes/formatTime.pipe';
import { Subject, takeUntil, tap, timer } from 'rxjs';

@Component({
  selector: 'lib-progress-bar',
  imports: [CommonModule, FormatTimePipe],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent {
  @Input() remaining: number = 50;
  @Input() total: number = 100;
  @Input() barWidth: Number = 10;
  @Input() barLength: Number = 100;
  @Input() verticalMode: boolean = false;
  @Input() bgClass: string = "";

  get remainingPct(){
    const pct = this.remaining * 100 / this.total;
    if(pct >= 100){ return 100;}
    else if(pct < 0){ return 0;}
    return pct;
  }



}
