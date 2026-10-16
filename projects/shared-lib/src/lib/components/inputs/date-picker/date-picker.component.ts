import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BaseInput } from '../baseInput';

@Component({
  selector: 'lib-date-picker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
})
export class DatePickerComponent extends BaseInput {
  @Input() minDate: string | null = null;
  @Input() maxDate: string | null = null;
  @Input() type: 'date' | 'datetime-local' = 'date';
}
