import { TestBed } from '@angular/core/testing';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  let pipe: MoneyPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MoneyPipe] });
    pipe = TestBed.inject(MoneyPipe);
  });

  it('formats dollars with grouping', () => {
    expect(pipe.transform(1200)).toBe('$1,200');
    expect(pipe.transform(0)).toBe('$0');
  });

  it('puts the minus sign before the dollar sign', () => {
    expect(pipe.transform(-400)).toBe('−$400');
  });

  it('treats a missing score as zero', () => {
    expect(pipe.transform(null)).toBe('$0');
    expect(pipe.transform(undefined)).toBe('$0');
  });
});
