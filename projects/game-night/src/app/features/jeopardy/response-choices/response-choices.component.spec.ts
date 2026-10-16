import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResponseChoicesComponent } from './response-choices.component';

@Component({
  imports: [ReactiveFormsModule, ResponseChoicesComponent],
  template: `
    <form [formGroup]="form">
      <app-response-choices formControlName="value" name="answer" [choices]="choices" legend="Your answer"></app-response-choices>
    </form>
  `,
})
class AnswerFormHostComponent {
  readonly form = new FormGroup({
    value: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly choices = ['Ohio', 'Iowa', 'Utah', 'Idaho', 'Maine'];
}

describe('ResponseChoicesComponent', () => {
  let fixture: ComponentFixture<AnswerFormHostComponent>;
  let host: AnswerFormHostComponent;

  const radios = (): HTMLInputElement[] => Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]'));
  const bars = (): HTMLLabelElement[] => Array.from(fixture.nativeElement.querySelectorAll('label.choice'));

  function pick(index: number): void {
    bars()[index].click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AnswerFormHostComponent] });
    fixture = TestBed.createComponent(AnswerFormHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('offers every option as a radio in one labelled group, none picked yet', () => {
    expect(fixture.nativeElement.querySelector('legend').textContent.trim()).toBe('Your answer');
    expect(bars().map((bar) => bar.querySelector('.choice__text')?.textContent?.trim())).toEqual(host.choices);
    expect(bars().map((bar) => bar.querySelector('.choice__letter')?.textContent?.trim())).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(radios().every((radio) => radio.name === 'answer')).toBeTrue();
    expect(radios().some((radio) => radio.checked)).toBeFalse();
    expect(host.form.invalid).toBeTrue();
  });

  it('puts the picked option into the form', () => {
    pick(2);

    expect(host.form.controls.value.value).toBe('Utah');
    expect(host.form.valid).toBeTrue();
    expect(radios()[2].checked).toBeTrue();
    expect(bars()[2].classList).toContain('choice--picked');
  });

  it('moves the pick when another option is chosen', () => {
    pick(0);
    pick(4);

    expect(host.form.controls.value.value).toBe('Maine');
    expect(bars().filter((bar) => bar.classList.contains('choice--picked')).length).toBe(1);
  });

  it('clears the pick when the form is reset', () => {
    pick(1);
    host.form.reset({ value: '' });
    fixture.detectChanges();

    expect(radios().some((radio) => radio.checked)).toBeFalse();
    expect(bars().some((bar) => bar.classList.contains('choice--picked'))).toBeFalse();
    expect(host.form.invalid).toBeTrue();
  });

  it('shows a value the form already holds as picked', () => {
    host.form.setValue({ value: 'Idaho' });
    fixture.detectChanges();

    expect(radios()[3].checked).toBeTrue();
  });

  it('locks every option while the control is disabled', () => {
    host.form.disable();
    fixture.detectChanges();
    pick(0);

    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBeTrue();
    expect(host.form.controls.value.value).toBe('');
  });
});
