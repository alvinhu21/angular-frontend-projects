import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WofStateSnapshot } from '../../../models/wof.models';
import { wofSnapshot } from '../wof-state-fixtures.spec';
import { createFrenzyCountdown } from './frenzy-countdown';

@Component({ selector: 'app-countdown-host', template: '' })
class CountdownHostComponent {
  readonly state = signal<WofStateSnapshot | null>(null);
  readonly countdown = createFrenzyCountdown(this.state);
}

describe('createFrenzyCountdown', () => {
  let fixture: ComponentFixture<CountdownHostComponent>;
  let host: CountdownHostComponent;

  function show(state: WofStateSnapshot | null): void {
    host.state.set(state);
    fixture.detectChanges(); // runs the effect that anchors the clock
  }

  /** The clock running, with `remainingMs` left as of this snapshot. */
  function running(remainingMs: number): WofStateSnapshot {
    // A deliberately wrong deadline: the clock counts from what's left, not from the server's instant.
    const skewedDeadline = new Date(Date.now() + remainingMs + 60_000).toISOString();
    return wofSnapshot({ phase: 'FORTUNE_FRENZY', frenzyRemainingMs: remainingMs, frenzyDeadlineAt: skewedDeadline });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CountdownHostComponent] });
    fixture = TestBed.createComponent(CountdownHostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('is null outside the Frenzy', () => {
    show(wofSnapshot());
    expect(host.countdown.remainingMs()).toBeNull();
    expect(host.countdown.finalSeconds()).toBeFalse();
  });

  it('counts down by this device\'s clock from what each snapshot says is left', fakeAsync(() => {
    show(running(12_000));
    expect(host.countdown.remainingMs()).toBeCloseTo(12_000, -2);

    tick(1_000);
    expect(host.countdown.remainingMs()).toBeCloseTo(11_000, -2);

    show(running(10_500)); // the next snapshot re-anchors it
    expect(host.countdown.remainingMs()).toBeCloseTo(10_500, -2);
    fixture.destroy();
  }));

  it('flags the final five seconds while it runs', fakeAsync(() => {
    show(running(5_400));
    expect(host.countdown.finalSeconds()).toBeFalse();

    tick(500);
    expect(host.countdown.finalSeconds()).toBeTrue();
    fixture.destroy();
  }));

  it('holds still while a solution is up, and never alerts then', fakeAsync(() => {
    show(wofSnapshot({ phase: 'FRENZY_PUZZLE_OVER', frenzyRemainingMs: 3_000 }));

    tick(2_000);

    expect(host.countdown.remainingMs()).toBe(3_000);
    expect(host.countdown.finalSeconds()).toBeFalse();
  }));

  it('never counts below zero', fakeAsync(() => {
    show(running(300));
    tick(1_000);
    expect(host.countdown.remainingMs()).toBe(0);
    fixture.destroy();
  }));
});
