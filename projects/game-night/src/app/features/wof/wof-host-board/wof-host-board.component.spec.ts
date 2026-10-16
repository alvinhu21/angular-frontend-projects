import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { IdentityStorageService } from '../../../core/identity-storage.service';
import { LiveSessionService } from '../../../core/live-session.service';
import { PlayerView, StoredIdentity } from '../../../models/session.models';
import { WofStateSnapshot } from '../../../models/wof.models';
import { GameSoundControl } from '../../shared/audio/game-synth';
import { WofAudioService } from '../audio/wof-audio.service';
import { wofSnapshot } from '../wof-state-fixtures.spec';
import { WofHostBoardComponent } from './wof-host-board.component';

const CATEGORIES = ['PHRASE', 'THING', 'FOOD & DRINK'];

function player(playerId: string, displayName: string): PlayerView {
  return { playerId, displayName, score: 5000, connected: true, host: false, ai: false };
}

/** Just enough of the live session for the board: the signals it reads. */
class FakeLiveSession {
  readonly wofState = signal<WofStateSnapshot | null>(null);
  readonly players = signal<PlayerView[]>([player('a', 'Alice'), player('b', 'Bob')]);
  readonly connect = jasmine.createSpy('connect').and.resolveTo();
}

/** Stands in for the TV's sound cues, which have nothing to do with these tests. */
class SilentAudio {
  readonly enabled = signal(false);
  configure(): void {}
  toggle(): void {}
}

describe('WofHostBoardComponent', () => {
  let fixture: ComponentFixture<WofHostBoardComponent>;
  let live: FakeLiveSession;

  const tiles = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.board__bonus-category') as NodeListOf<HTMLElement>).map(
      (tile) => tile.textContent?.trim() ?? '',
    );

  function show(overrides: Partial<WofStateSnapshot>): void {
    live.wofState.set(wofSnapshot({ bonusWinnerPlayerId: 'a', bonusCategoryOptions: CATEGORIES, ...overrides }));
    fixture.detectChanges();
  }

  beforeEach(() => {
    live = new FakeLiveSession();
    const identity: StoredIdentity = { code: 'ABC123', playerId: 'host', gameType: 'WOF', displayName: 'Host', isHost: true };
    TestBed.configureTestingModule({
      imports: [WofHostBoardComponent],
      providers: [
        provideTranslateService(),
        { provide: LiveSessionService, useValue: live },
        { provide: IdentityStorageService, useValue: { load: () => identity } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ code: 'ABC123' }) } } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
      ],
    });
    TestBed.overrideComponent(WofHostBoardComponent, {
      set: {
        providers: [
          { provide: WofAudioService, useClass: SilentAudio },
          { provide: GameSoundControl, useExisting: WofAudioService },
        ],
      },
    });
    fixture = TestBed.createComponent(WofHostBoardComponent);
    fixture.detectChanges();
  });

  it('puts the three bonus categories up on the big screen while the contestant chooses', () => {
    show({ phase: 'BONUS_PICK_CATEGORY', bonusCategory: null, bonusPuzzleTemplate: null });

    expect(tiles()).toEqual(CATEGORIES);
    expect(fixture.nativeElement.querySelector('#bonus-pick-heading')?.textContent).toContain('wof.choosingCategory');
    expect(fixture.nativeElement.querySelector('app-puzzle-board')).toBeNull();
  });

  it('swaps the choices for the bonus puzzle once one is picked', () => {
    show({ phase: 'BONUS_PICK_LETTERS', bonusCategory: 'THING', bonusPuzzleTemplate: '_R___ __N_' });

    expect(tiles()).toEqual([]);
    expect(fixture.nativeElement.querySelector('app-puzzle-board')).not.toBeNull();
  });
});
