import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { SeatRequest, SeatView } from '../../../models/session.models';
import { SeatRosterComponent } from './seat-roster.component';

const open = (name = ''): SeatView => ({ name, ai: false, playerId: null, connected: false });
const ai = (name: string): SeatView => ({ name, ai: true, playerId: null, connected: false });
const taken = (name: string, playerId: string): SeatView => ({ name, ai: false, playerId, connected: true });

describe('SeatRosterComponent', () => {
  let fixture: ComponentFixture<SeatRosterComponent>;
  let emitted: SeatRequest[][];

  const el = <T extends Element>(selector: string) => fixture.nativeElement.querySelector(selector) as T;
  const all = <T extends Element>(selector: string): T[] => Array.from(fixture.nativeElement.querySelectorAll(selector));

  function render(seats: SeatView[], editable = true): void {
    fixture.componentRef.setInput('hostName', 'Alice');
    fixture.componentRef.setInput('seats', seats);
    fixture.componentRef.setInput('editable', editable);
    fixture.detectChanges();
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SeatRosterComponent], providers: [provideTranslateService()] });
    fixture = TestBed.createComponent(SeatRosterComponent);
    emitted = [];
    fixture.componentInstance.seatsChange.subscribe((seats) => emitted.push(seats));
  });

  it('shows the lineup read-only to everyone but the host', () => {
    render([taken('Sam', 'p2'), ai('Watson'), open()], false);

    expect(all('.roster__seat').length).toBe(4);
    expect(all('.roster__name').map((n) => n.textContent?.trim())).toEqual(['Alice', 'Sam', 'Watson', 'sessionLobby.openSeat']);
    expect(all('input').length).toBe(0);
    expect(el('select')).toBeNull();
  });

  it('sends the whole list with one more open seat when the host raises the count', () => {
    render([ai('Watson')]);
    const select = el<HTMLSelectElement>('#other-players');
    select.value = '3';
    select.dispatchEvent(new Event('change'));

    expect(emitted).toEqual([
      [
        { name: 'Watson', ai: true, playerId: null },
        { name: '', ai: false, playerId: null },
        { name: '', ai: false, playerId: null },
      ],
    ]);
  });

  it("won't let the count drop below the players who have joined", () => {
    render([taken('Sam', 'p2'), taken('Jo', 'p3')]);

    const options = all<HTMLOptionElement>('#other-players option');
    expect(options.filter((o) => o.disabled).map((o) => o.value)).toEqual(['1']);
    expect(all('.roster__input').length).toBe(0); // joined seats are locked
  });

  it('makes a seat an AI when its box is ticked', () => {
    render([open(), open()]);
    const box = all<HTMLInputElement>('.roster__ai input')[1];
    box.checked = true;
    box.dispatchEvent(new Event('change'));

    expect(emitted[0].map((seat) => seat.ai)).toEqual([false, true]);
  });

  it('sends a renamed seat once the field is committed, not while typing', () => {
    render([ai('Watson')]);
    const input = el<HTMLInputElement>('.roster__input');

    type(input, 'Robo');
    expect(emitted).toEqual([]);

    input.dispatchEvent(new Event('change'));
    expect(emitted).toEqual([[{ name: 'Robo', ai: true, playerId: null }]]);
  });

  it('keeps a half-typed name when someone joins another seat', () => {
    render([open(), ai('Watson')]);
    type(all<HTMLInputElement>('.roster__input')[1], 'Rob');

    render([taken('Sam', 'p2'), ai('Watson')]);

    expect(el<HTMLInputElement>('.roster__input').value).toBe('Rob');
  });

  it('turns down a rude name instead of sending it', () => {
    render([ai('Watson')]);
    const input = el<HTMLInputElement>('.roster__input');
    type(input, 'Shithead');
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(el('.roster__error')).not.toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
