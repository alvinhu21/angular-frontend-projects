import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FrenzyClockComponent } from './frenzy-clock.component';

describe('FrenzyClockComponent', () => {
  let fixture: ComponentFixture<FrenzyClockComponent>;

  function readout(remainingMs: number | null, urgent = false): string {
    fixture.componentRef.setInput('remainingMs', remainingMs);
    fixture.componentRef.setInput('urgent', urgent);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.frenzy-clock__digits').textContent.trim();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FrenzyClockComponent], providers: [provideTranslateService()] });
    fixture = TestBed.createComponent(FrenzyClockComponent);
  });

  it('counts in tenths of a second, rounding up so 0.0 only shows once time is up', () => {
    expect(readout(30_000)).toBe('30.0');
    expect(readout(29_950)).toBe('30.0');
    expect(readout(29_900)).toBe('29.9');
    expect(readout(4_321)).toBe('4.4');
    expect(readout(40)).toBe('0.1');
    expect(readout(0)).toBe('0.0');
    expect(readout(null)).toBe('0.0');
  });

  it('turns urgent for the final seconds', () => {
    readout(3_000, true);
    expect(fixture.nativeElement.querySelector('.frenzy-clock').classList).toContain('frenzy-clock--urgent');
  });
});
