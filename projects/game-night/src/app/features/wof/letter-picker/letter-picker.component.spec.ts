import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { LetterPickerComponent } from './letter-picker.component';

describe('LetterPickerComponent', () => {
  let fixture: ComponentFixture<LetterPickerComponent>;

  const keys = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('.key'));

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LetterPickerComponent], providers: [provideTranslateService()] });
    fixture = TestBed.createComponent(LetterPickerComponent);
    fixture.componentRef.setInput('letters', ['A', 'E', 'I', 'O', 'U']);
    fixture.componentRef.setInput('used', ['E']);
    fixture.detectChanges();
  });

  it('keeps used letters in place but disabled', () => {
    expect(keys().map((key) => key.textContent?.trim())).toEqual(['A', 'E', 'I', 'O', 'U']);
    expect(keys().map((key) => key.disabled)).toEqual([false, true, false, false, false]);
  });

  it('emits the letter that was picked', () => {
    const picked: string[] = [];
    fixture.componentInstance.pick.subscribe((letter) => picked.push(letter));

    keys()[2].click();
    keys()[1].click(); // used - disabled, so nothing

    expect(picked).toEqual(['I']);
  });
});
