import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseInput } from '../baseInput';
import { Option } from '../../../models/options';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'lib-radio-card',
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  templateUrl: './radio-card.component.html',
  styleUrl: './radio-card.component.scss',
})
export class RadioCardComponent extends BaseInput  {
  @Input() labelOnRight: boolean = false;
  @Input() valueOptions: Option[] = [];

  isSelected(option: Option){
    let formControl = this.inputFormGroup.get(this.controlName);
    if(!formControl){
      return false;
    }
    return formControl.value === option.value;
  }

  selectValue(option: Option){
    this.inputFormGroup.get(this.controlName)?.setValue(option.value);
  }
}
