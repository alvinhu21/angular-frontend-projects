import { Component, Input } from '@angular/core';
import { CommonModule} from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseInput } from '../baseInput';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'lib-text-input',
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.scss',
})
export class TextInputComponent extends BaseInput {
  @Input() allowedRegex: RegExp = /[\s\S]*/;
  @Input() maxlength: number = 100;

  selectCharsOnly(event: KeyboardEvent): void {
    if(!this.allowedRegex){
      return;
    }
    const key = event.key;

    const allowed = this.allowedRegex;

    const controlKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab'
    ];

    if (!allowed.test(key) && !controlKeys.includes(key)) {
      event.preventDefault();
    }
  }
}
