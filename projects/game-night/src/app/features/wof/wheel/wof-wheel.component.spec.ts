import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { WheelSpinView } from '../../../models/wof.models';
import { WheelStatus } from './wheel-physics';
import { WofWheelComponent } from './wof-wheel.component';
import { specialWheel, syndicatedWheel, wheelSpin } from './wheel-fixtures.spec';

describe('WofWheelComponent', () => {
  let fixture: ComponentFixture<WofWheelComponent>;
  let component: WofWheelComponent;

  function render(spin: WheelSpinView | null): void {
    fixture.componentRef.setInput('wedges', syndicatedWheel());
    fixture.componentRef.setInput('spin', spin);
    fixture.detectChanges();
  }

  function stage(): HTMLElement {
    return fixture.nativeElement.querySelector('.wheel__stage');
  }

  function callout(): string | null {
    return fixture.nativeElement.querySelector('.wheel__callout')?.textContent?.trim() ?? null;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WofWheelComponent],
      providers: [provideTranslateService()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      'wof.wheelAriaLabel': 'Prize wheel',
      'wof.wheelSpinningAria': 'The wheel is spinning',
      'wof.wheelLandedAria': 'The wheel landed on {{label}}',
    });
    translate.use('en');
    fixture = TestBed.createComponent(WofWheelComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('draws all 24 wedges with a peg on every boundary', () => {
    render(null);

    expect(fixture.nativeElement.querySelectorAll('.wheel__wedge').length).toBe(24);
    expect(fixture.nativeElement.querySelectorAll('.wheel__peg').length).toBe(24);
    expect(fixture.nativeElement.querySelector('.wheel__label text').textContent.trim()).toBe('$');
  });

  it('rests with the top wedge under the pointer before the first spin, with nothing revealed', () => {
    render(null);

    expect(component.status()).toBe('STOPPED');
    expect(component.result()).toBeNull();
    expect(callout()).toBeNull();
    expect(stage().getAttribute('aria-label')).toBe('Prize wheel');
    // Wedge 0 covers 0°-15°; its middle slot is centred at 7.5°, i.e. a rotation of -7.5° (352.5°).
    const transform: string = fixture.nativeElement.querySelector('.wheel__rotor').style.transform;
    expect(parseFloat(transform.replace('rotate(', ''))).toBeCloseTo(352.5, 3);
  });

  it('shows where the wheel stopped for a spin that was already over when the screen opened', () => {
    render(wheelSpin({ landingSlot: 4, inMotion: false })); // slot 4 is wedge 1: BANKRUPT

    expect(component.status()).toBe('STOPPED');
    expect(component.result()).toEqual(jasmine.objectContaining({ type: 'BANKRUPT', active: true }));
    expect(callout()).toBe('BANKRUPT');
    expect(stage().getAttribute('aria-label')).toBe('The wheel landed on BANKRUPT');
  });

  it('draws the Wild Card as a card on its wedge, and the Million Dollar Wedge as three one-peg pieces', () => {
    fixture.componentRef.setInput('wedges', specialWheel());
    fixture.componentRef.setInput('spin', null);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.wheel__wedge').length).toBe(26);
    expect(element.querySelectorAll('.wheel__peg').length).toBe(26);
    expect(element.querySelectorAll('.wheel__card').length).toBe(1);
    // Too narrow to stack upright glyphs, the one-peg pieces write their labels along the radius.
    const radial = Array.from(element.querySelectorAll('.wheel__label text[transform]')).map((t) => t.textContent?.trim());
    expect(radial).toEqual(['BANKRUPT', 'ONE MILLION', 'BANKRUPT']);
  });

  it("calls out what the spin won, even once a claimed wedge has come off the wheel", () => {
    const wildCard = specialWheel()[5];
    const settled = wheelSpin({ landingSlot: 16, inMotion: false }); // the Wild Card's middle slot
    fixture.componentRef.setInput('wedges', specialWheel());
    fixture.componentRef.setInput('spin', settled);
    fixture.componentRef.setInput('landedWedge', wildCard);
    fixture.detectChanges();
    expect(callout()).toBe('WILD CARD');

    // Claimed: the card comes off, leaving the plain $500 under the pointer.
    fixture.componentRef.setInput('wedges', syndicatedWheel());
    fixture.detectChanges();
    expect(callout()).toBe('WILD CARD');
    expect(stage().getAttribute('aria-label')).toBe('The wheel landed on WILD CARD');

    // Without the recorded result, it reads whatever is under the pointer.
    fixture.componentRef.setInput('landedWedge', null);
    fixture.detectChanges();
    expect(callout()).toBe('$500');
  });

  it('keeps the result hidden until the wheel stops AND the game applies it', async () => {
    const statuses: WheelStatus[] = [];
    component.statusChange.subscribe((status) => statuses.push(status));
    render(null);

    // Seen from its first snapshot, a spin plays in full - here a short one to keep the test quick.
    render(wheelSpin({ spinId: 1, landingSlot: 22, durationMs: 450 })); // slot 22 is wedge 7: LOSE A TURN
    expect(component.result()).toEqual(jasmine.objectContaining({ type: 'LOSE_A_TURN', active: false }));

    await waitFor(() => component.status() !== 'STOPPED');
    fixture.detectChanges();
    expect(callout()).toBeNull();
    expect(stage().getAttribute('aria-label')).toBe('The wheel is spinning');

    await waitFor(() => component.status() === 'STOPPED');
    fixture.detectChanges();
    expect(callout()).toBeNull(); // stopped on screen, but the server hasn't settled it yet

    render(wheelSpin({ spinId: 1, landingSlot: 22, durationMs: 450, inMotion: false }));
    expect(callout()).toBe('LOSE A TURN');
    expect(statuses[0]).toBe('SPINNING');
    expect(statuses[statuses.length - 1]).toBe('STOPPED');
  });
});

async function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for the wheel.');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
