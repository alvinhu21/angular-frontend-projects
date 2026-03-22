import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseInput } from '../baseInput';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-checkbox-card',
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  templateUrl: './checkbox-card.component.html',
  styleUrl: './checkbox-card.component.scss',
})
export class CheckboxCardComponent extends BaseInput {
  @Input() labelOnRight: boolean = false;
  @Input() imgSrc: string = "";
  get isSelected(){
    let formControl = this.inputFormGroup.get(this.controlName);
    if(!formControl){
      return false;
    }
    if(formControl.value){
      return true;
    }
    return false;
  }
  selectValue(){
    let fg = this.inputFormGroup.get(this.controlName);
    if(!fg){
      return;
    }
    fg?.setValue(!fg.value);
  }
}
