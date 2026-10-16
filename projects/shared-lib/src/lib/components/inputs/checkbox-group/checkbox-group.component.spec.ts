import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CheckboxGroupComponent } from './checkbox-group.component';
import { Option } from '../../../models/options';

describe('CheckboxGroupComponent', () => {
  let fixture: ComponentFixture<CheckboxGroupComponent>;
  let form: FormGroup;

  const threeOptions: Option[] = [
    { label: 'colors.red', value: 'red' },
    { label: 'colors.green', value: 'green' },
    { label: 'colors.blue', value: 'blue' },
  ];

  function setup(options: Option[], initial: string[] = [], inputs: Record<string, unknown> = {}): void {
    form = new FormGroup({ colors: new FormControl<string[]>(initial, Validators.required) });
    const ref = fixture.componentRef;
    ref.setInput('inputFormGroup', form);
    ref.setInput('controlName', 'colors');
    ref.setInput('id', 'colors');
    ref.setInput('label', 'colors.label');
    ref.setInput('options', options);
    Object.entries(inputs).forEach(([name, value]) => ref.setInput(name, value));
    fixture.detectChanges();
  }

  function toolbarButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.checkbox-group-toolbar button'));
  }

  function checkboxes(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckboxGroupComponent],
      providers: [provideZonelessChangeDetection(), importProvidersFrom(TranslateModule.forRoot())],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckboxGroupComponent);
  });

  it('renders one checkbox per option inside a labelled group', () => {
    setup(threeOptions);

    expect(checkboxes().length).toBe(3);
    const group = fixture.nativeElement.querySelector('[role="group"]');
    expect(group.getAttribute('aria-labelledby')).toBe('colors-label');
  });

  it('shows "Select all" and "Clear all" when there are more than two options', () => {
    setup(threeOptions);

    const labels = toolbarButtons().map((b) => b.textContent?.trim());
    expect(labels).toEqual(['common.selectAll', 'common.clearAll']);
  });

  it('shows "Select both" when there are exactly two options', () => {
    setup(threeOptions.slice(0, 2));

    const labels = toolbarButtons().map((b) => b.textContent?.trim());
    expect(labels).toEqual(['common.selectBoth', 'common.clearAll']);
  });

  it('hides the bulk actions when there is only one option', () => {
    setup(threeOptions.slice(0, 1));

    expect(toolbarButtons().length).toBe(0);
  });

  it('hides the bulk actions when showBulkActions is false', () => {
    setup(threeOptions, [], { showBulkActions: false });

    expect(toolbarButtons().length).toBe(0);
  });

  it('selects every option, then clears them all', () => {
    setup(threeOptions);
    const [selectAll, clearAll] = toolbarButtons();

    selectAll.click();
    fixture.detectChanges();
    expect(form.value.colors).toEqual(['red', 'green', 'blue']);
    expect(checkboxes().every((c) => c.checked)).toBeTrue();
    expect(selectAll.disabled).toBeTrue();

    clearAll.click();
    fixture.detectChanges();
    expect(form.value.colors).toEqual([]);
    expect(checkboxes().some((c) => c.checked)).toBeFalse();
    expect(clearAll.disabled).toBeTrue();
  });

  it('toggles individual options and keeps the value in option order', () => {
    setup(threeOptions);
    const [red, , blue] = checkboxes();

    blue.click();
    red.click();
    fixture.detectChanges();
    expect(form.value.colors).toEqual(['red', 'blue']);

    blue.click();
    fixture.detectChanges();
    expect(form.value.colors).toEqual(['red']);
    expect(form.get('colors')?.dirty).toBeTrue();
  });

  it('reflects the initial form control value', () => {
    setup(threeOptions, ['green']);

    expect(checkboxes().map((c) => c.checked)).toEqual([false, true, false]);
  });

  it('refreshes when the value is set programmatically', () => {
    setup(threeOptions);

    form.get('colors')?.setValue(['red', 'blue']);
    fixture.detectChanges();

    expect(checkboxes().map((c) => c.checked)).toEqual([true, false, true]);
  });

  it('disables checkboxes and bulk actions when the control is disabled', () => {
    setup(threeOptions);
    form.get('colors')?.disable();
    fixture.detectChanges();

    expect(checkboxes().every((c) => c.disabled)).toBeTrue();
    expect(toolbarButtons().every((b) => b.disabled)).toBeTrue();
  });

  it('shows translated error messages once the control is touched', () => {
    setup(threeOptions, ['red'], { errorMessages: { required: 'colors.errors.required' } });

    checkboxes()[0].click();
    fixture.detectChanges();

    const errors = fixture.nativeElement.querySelector('#colors-errors');
    expect(errors?.textContent?.trim()).toBe('colors.errors.required');
  });
});
