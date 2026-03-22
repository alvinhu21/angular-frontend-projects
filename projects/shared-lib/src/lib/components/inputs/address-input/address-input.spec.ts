import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddressInput } from './address-input';

describe('AddressInput', () => {
  let component: AddressInput;
  let fixture: ComponentFixture<AddressInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddressInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddressInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
