import { CommonModule } from '@angular/common';
import { Component, Input, model } from '@angular/core';

@Component({
  selector: 'lib-progress-bar',
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent {
  @Input() remaining: number = 50;
  @Input() total: number = 100;
  /** A number is pixels; a string is any CSS length (e.g. '0.75rem'). */
  @Input() barWidth: number | string = 10;
  /** A number is pixels; a string is any CSS length (e.g. '100%'). */
  @Input() barLength: number | string = 100;
  @Input() twoWay: boolean = false;
  verticalMode = model(false);
  @Input() bgClass: string = "";
  @Input() ariaLabel: string = 'Progress';

  get remainingPct(){
    if(this.total <= 0){ return 0;}
    const pct = this.remaining * 100 / this.total;
    if(pct >= 100){ return 100;}
    else if(pct < 0){ return 0;}
    return pct;
  }

  get progressValue(): number {
    return Math.round(this.remainingPct);
  }

  cssLength(value: number | string): string {
    return typeof value === 'number' ? value + 'px' : value;
  }
}
