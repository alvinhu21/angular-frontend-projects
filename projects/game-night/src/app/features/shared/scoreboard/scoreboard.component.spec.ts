import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { PlayerView } from '../../../models/session.models';
import { ScoreboardComponent } from './scoreboard.component';

const player = (playerId: string, displayName: string, score: number): PlayerView => ({
  playerId,
  displayName,
  score,
  connected: true,
  host: false,
  ai: false,
});

describe('ScoreboardComponent', () => {
  let fixture: ComponentFixture<ScoreboardComponent>;

  function tokens(playerIndex: number): string[] {
    const row = fixture.nativeElement.querySelectorAll('.scoreboard__row')[playerIndex];
    return Array.from(row.querySelectorAll('.scoreboard__token')).map((token) => (token as HTMLElement).className);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ScoreboardComponent], providers: [provideTranslateService()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      'scoreboard.wildCardToken': 'WILD CARD',
      'scoreboard.millionWedgeToken': '$1M WEDGE',
      'scoreboard.millionWedgePending': '(kept only by solving this round)',
    });
    translate.use('en');
    fixture = TestBed.createComponent(ScoreboardComponent);
    fixture.componentRef.setInput('players', [player('a', 'Alice', 1000), player('b', 'Bob', 0)]);
  });

  it('shows no special wedges unless someone holds one', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.scoreboard__token').length).toBe(0);
  });

  it("shows the Wild Card and the Million Dollar Wedge with their holder's score", () => {
    fixture.componentRef.setInput('wildCardHolderId', 'a');
    fixture.componentRef.setInput('millionWedgeHolderId', 'b');
    fixture.componentRef.setInput('millionWedgeSecured', true);
    fixture.detectChanges();

    expect(tokens(0)).toEqual(['scoreboard__token scoreboard__token--wild']);
    expect(tokens(1)).toEqual(['scoreboard__token scoreboard__token--million']);
  });

  it('marks a Million Dollar Wedge that still has to be banked', () => {
    fixture.componentRef.setInput('millionWedgeHolderId', 'a');
    fixture.detectChanges();

    const token: HTMLElement = fixture.nativeElement.querySelector('.scoreboard__token--million');
    expect(token.classList).toContain('scoreboard__token--pending');
    expect(token.textContent).toContain('(kept only by solving this round)');
  });
});
