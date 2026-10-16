import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { GameTimerComponent, startLocalTimerWindow } from './game-timer.component';

describe('GameTimerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GameTimerComponent],
      providers: [provideTranslateService()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { 'test.label': 'Answer now!', 'gameTimer.remainingSeconds': '{{seconds}}s' });
    translate.use('en');
  });

  // Created inside each fakeAsync test so the component's own clock runs on the fake one too.
  function create(startsAt: string | number | null, endsAt: string | number | null): ComponentFixture<GameTimerComponent> {
    const fixture = TestBed.createComponent(GameTimerComponent);
    fixture.componentRef.setInput('label', 'test.label');
    fixture.componentRef.setInput('startsAt', startsAt);
    fixture.componentRef.setInput('endsAt', endsAt);
    fixture.detectChanges();
    return fixture;
  }

  /** The label and the seconds, read separately: they're laid out as two flex items, so the
   *  template has no whitespace text between them for textContent to pick up. */
  function readout(fixture: ComponentFixture<GameTimerComponent>): string {
    const part = (selector: string): string =>
      fixture.nativeElement.querySelector(`[role="timer"] ${selector}`)?.textContent?.trim() ?? '';
    return `${part('.timer__label')} ${part('.timer__seconds')}`;
  }

  function timerClasses(fixture: ComponentFixture<GameTimerComponent>): DOMTokenList {
    return (fixture.nativeElement.querySelector('.timer') as HTMLElement).classList;
  }

  it('renders nothing until both ends of the window are known', fakeAsync(() => {
    const fixture = create(null, Date.now() + 5_000);

    expect(fixture.nativeElement.querySelector('.timer')).toBeNull();

    fixture.destroy();
  }));

  it('shows the label and the whole seconds left over a full bar hidden from assistive tech', fakeAsync(() => {
    const now = Date.now();
    const fixture = create(new Date(now).toISOString(), new Date(now + 30_000).toISOString());

    expect(readout(fixture)).toBe('Answer now! 30s');
    const bar: HTMLElement = fixture.nativeElement.querySelector('lib-timer-bar');
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    expect(bar.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');

    fixture.destroy();
  }));

  it('counts down, flags the last seconds as urgent, and reads expired once time is up', fakeAsync(() => {
    const window = startLocalTimerWindow(5_000);
    const fixture = create(window.startsAt, window.endsAt);
    expect(timerClasses(fixture)).not.toContain('timer--urgent');

    tick(2_500);
    fixture.detectChanges();
    expect(readout(fixture)).toBe('Answer now! 3s');
    expect(timerClasses(fixture)).toContain('timer--urgent');
    expect(fixture.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('50');

    tick(3_000);
    fixture.detectChanges();
    expect(readout(fixture)).toBe('Answer now! 0s');
    expect(timerClasses(fixture)).toContain('timer--expired');
    expect(timerClasses(fixture)).not.toContain('timer--urgent');
    expect(fixture.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('0');

    fixture.destroy();
  }));
});
