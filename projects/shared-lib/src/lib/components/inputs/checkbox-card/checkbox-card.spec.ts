import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckboxCard } from './checkbox-card';

describe('CheckboxCard', () => {
  let component: CheckboxCard;
  let fixture: ComponentFixture<CheckboxCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckboxCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckboxCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
