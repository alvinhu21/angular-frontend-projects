import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RadioCard } from './radio-card';

describe('RadioCard', () => {
  let component: RadioCard;
  let fixture: ComponentFixture<RadioCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RadioCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
