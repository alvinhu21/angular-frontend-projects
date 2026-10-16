import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TimerBarComponent } from './timer-bar.component';

/** Never marked dirty after its first check - the bar has to keep itself up to date. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimerBarComponent],
  template: `<lib-timer-bar [startDate]="start" [endDate]="end" [tickMs]="100" barLength="100%"></lib-timer-bar>`,
})
class OnPushHostComponent {
  readonly start = new Date();
  readonly end = new Date(this.start.valueOf() + 10_000);
}

describe('TimerBarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OnPushHostComponent] }).compileComponents();
  });

  function progress(fixture: ComponentFixture<unknown>): HTMLElement {
    return fixture.nativeElement.querySelector('[role="progressbar"]');
  }

  it('drains as the window runs out, even inside an OnPush host that is never marked dirty', fakeAsync(() => {
    const fixture = TestBed.createComponent(OnPushHostComponent);
    fixture.detectChanges();
    expect(progress(fixture).getAttribute('aria-valuenow')).toBe('100');

    tick(5_000);
    fixture.detectChanges();
    expect(progress(fixture).getAttribute('aria-valuenow')).toBe('50');

    tick(4_000);
    fixture.detectChanges();
    expect(progress(fixture).getAttribute('aria-valuenow')).toBe('10');
    expect(fixture.nativeElement.querySelector('.inner-bar-h').classList).toContain('bg-danger');

    fixture.destroy();
  }));

  it('accepts a CSS length for the bar size', fakeAsync(() => {
    const fixture = TestBed.createComponent(OnPushHostComponent);
    fixture.detectChanges();

    expect(progress(fixture).style.width).toBe('100%');
    expect(progress(fixture).style.height).toBe('10px');

    fixture.destroy();
  }));
});
