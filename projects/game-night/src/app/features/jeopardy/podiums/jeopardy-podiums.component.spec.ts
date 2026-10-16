import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { PlayerView } from '../../../models/session.models';
import { JeopardyPodiumsComponent } from './jeopardy-podiums.component';

function player(playerId: string, score: number): PlayerView {
  return { playerId, displayName: playerId, score, connected: true, host: false, ai: false };
}

describe('JeopardyPodiumsComponent', () => {
  let fixture: ComponentFixture<JeopardyPodiumsComponent>;
  let component: JeopardyPodiumsComponent;

  function setPlayers(players: PlayerView[]): void {
    fixture.componentRef.setInput('players', players);
    fixture.detectChanges();
  }

  function deltas(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.podium__delta')).map(
      (el) => (el as HTMLElement).textContent?.trim() ?? '',
    );
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [JeopardyPodiumsComponent],
      providers: [provideTranslateService()],
    });
    fixture = TestBed.createComponent(JeopardyPodiumsComponent);
    component = fixture.componentInstance;
  });

  it('does not flash scores on the first snapshot', () => {
    setPlayers([player('a', 1200), player('b', -400)]);

    expect(deltas()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.podium__score--negative')?.textContent).toContain('−$400');
  });

  it('flashes the change in a score, then clears it', fakeAsync(() => {
    setPlayers([player('a', 0), player('b', 0)]);
    setPlayers([player('a', 400), player('b', -200)]);

    expect(deltas()).toEqual(['+$400', '−$200']);
    expect(component.flashesFor('a')[0].delta).toBe(400);

    tick(1400);
    fixture.detectChanges();
    expect(deltas()).toEqual([]);
  }));

  it('restarts the flash when a score changes again mid-flash', fakeAsync(() => {
    setPlayers([player('a', 0)]);
    setPlayers([player('a', 200)]);
    const first = component.flashesFor('a')[0].seq;

    tick(1000);
    setPlayers([player('a', 600)]);
    expect(component.flashesFor('a')[0]).toEqual({ delta: 400, seq: first + 1 });

    tick(1000);
    fixture.detectChanges();
    expect(deltas()).toEqual(['+$400']);
    tick(400);
  }));

  it('marks the podium in control and the podium answering', () => {
    fixture.componentRef.setInput('inControlId', 'a');
    fixture.componentRef.setInput('answeringId', 'b');
    setPlayers([player('a', 0), player('b', 0)]);

    const podiums = fixture.nativeElement.querySelectorAll('.podium');
    expect(podiums[0].classList).toContain('podium--control');
    expect(podiums[1].classList).toContain('podium--answering');
  });
});
