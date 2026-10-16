import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BaseInput } from '../baseInput';
import { Option } from '../../../models/options';

@Component({
  selector: 'lib-multi-select-dropdown',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './multi-select-dropdown.component.html',
  styleUrls: ['./multi-select-dropdown.component.scss'],
})
export class MultiSelectDropdownComponent extends BaseInput {
  @Input() options: Option[] = [];
  @Input() size: number = 6;
  @Input() showSelectAll: boolean = true;

  get selectedValues(): string[] {
    const value = this.formControl?.value;
    return Array.isArray(value) ? value : [];
  }

  toggleAll(selectAll: boolean): void {
    if (!this.formControl) {
      return;
    }

    this.formControl.setValue(selectAll ? this.options.map((option) => option.value) : []);
    this.formControl.markAsTouched();
    this.formControl.markAsDirty();
  }

  clearSelection(): void {
    if (!this.formControl) {
      return;
    }

    this.formControl.setValue([]);
    this.formControl.markAsTouched();
    this.formControl.markAsDirty();
  }
}
