import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-slider',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.scss'
})
export class SliderComponent implements OnInit{
  @Input({ required: true }) controlName!: string;
  @Input() options: { label: string; value: any }[] = [];
  @Input() label = '';
  @Input() min: number = 0;
  @Input() max: number = 10;
  @Input() step: number = 0.5;
  @Input() isInline: boolean = false;
  @Input() id = 'yahoo_finance_slider';
  @Input() selectFormGroup!: FormGroup;

  currentValueDisplay$ = new BehaviorSubject<number>(0);
  valueChanges$ = new Observable<any>();
  private readonly destroy$ = new Subject<void>();
  ngOnInit(): void {
    const control = this.selectFormGroup.get(this.controlName);
    if (control) {
      this.currentValueDisplay$.next(control.value);
      this.valueChanges$ = control.valueChanges.pipe(takeUntil(this.destroy$), tap(value => this.currentValueDisplay$.next(value)));
      this.valueChanges$.subscribe();
    }
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }



  get currentValue(): number {
    return this.selectFormGroup?.get(this.controlName)?.value ?? this.min;
  }
}
