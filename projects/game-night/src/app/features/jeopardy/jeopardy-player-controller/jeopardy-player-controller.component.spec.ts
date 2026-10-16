import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { IdentityStorageService } from '../../../core/identity-storage.service';
import { LiveSessionService } from '../../../core/live-session.service';
import { ActiveCellView, JeopardyStateSnapshot } from '../../../models/jeopardy.models';
import { ErrorMessage, PlayerView, StoredIdentity } from '../../../models/session.models';
import { JeopardyPlayerControllerComponent } from './jeopardy-player-controller.component';

const ME = 'me';
const THEM = 'them';
const STATES = ['Ohio', 'Arkansas', 'Iowa', 'Utah', 'Maine'];

function player(playerId: string, score = 1000): PlayerView {
  return { playerId, displayName: playerId, score, connected: true, host: false, ai: false };
}

/** Just enough of the live session for the controller: the signals it reads and the action it sends. */
class FakeLiveSession {
  readonly jeopardyState = signal<JeopardyStateSnapshot | null>(null);
  readonly players = signal<PlayerView[]>([player(ME), player(THEM)]);
  readonly lastError = signal<ErrorMessage | null>(null);
  readonly myPlayer = computed(() => this.players().find((p) => p.playerId === ME) ?? null);
  readonly connect = jasmine.createSpy('connect').and.resolveTo();
  readonly sendJeopardyAction = jasmine.createSpy('sendJeopardyAction');
}

function snapshot(overrides: Partial<JeopardyStateSnapshot> = {}): JeopardyStateSnapshot {
  return {
    type: 'JEOPARDY_STATE',
    phase: 'BOARD',
    currentRound: 1,
    roundCount: 2,
    board: [],
    activeCell: null,
    clueSubPhase: 'NONE',
    activeAnswererId: null,
    lockedOutPlayerIds: [],
    playerIdInControl: ME,
    phaseStartedAt: null,
    phaseDeadlineAt: null,
    finalCategory: null,
    finalClueText: null,
    finalResponseChoices: null,
    finalRequiredResponseCount: null,
    finalEligiblePlayerIds: null,
    finalWagerSubmittedPlayerIds: null,
    finalAnswerSubmittedPlayerIds: null,
    finalResults: null,
    tiebreakerPlayerIds: null,
    tiebreakerNumber: null,
    players: [player(ME), player(THEM)],
    gameWinnerPlayerIds: null,
    ...overrides,
  };
}

function clue(cellId: string, responseChoices: string[] | null, isDailyDouble = false): ActiveCellView {
  return {
    cellId,
    category: 'THE SOUNDS OF NON-SILENCE',
    value: 400,
    clueText: 'Here is the hog call of this university',
    isDailyDouble,
    dailyDoubleInProgress: isDailyDouble,
    responseChoices,
    requiredResponseCount: 1,
    correctResponse: null,
    revealReason: null,
  };
}

/** "In 2026 an annual 1,966-mile re-ride between these 2 cities..." - typed, and both are needed. */
function twoResponseClue(cellId: string, isDailyDouble = false): ActiveCellView {
  return { ...clue(cellId, null, isDailyDouble), requiredResponseCount: 2 };
}

/** I buzzed in on this clue and it's my turn to answer. */
function myTurnToAnswer(active: ActiveCellView): JeopardyStateSnapshot {
  return snapshot({ phase: 'CLUE_OPEN', activeCell: active, clueSubPhase: 'ANSWERING', activeAnswererId: ME });
}

describe('JeopardyPlayerControllerComponent', () => {
  let fixture: ComponentFixture<JeopardyPlayerControllerComponent>;
  let live: FakeLiveSession;

  const query = <T extends Element>(selector: string): T | null => fixture.nativeElement.querySelector(selector);
  const submitButton = (): HTMLButtonElement => query<HTMLButtonElement>('form.jp-form button[type="submit"]')!;

  function show(state: JeopardyStateSnapshot): void {
    live.jeopardyState.set(state);
    fixture.detectChanges();
  }

  function pick(option: string): void {
    const bar = Array.from(fixture.nativeElement.querySelectorAll('label.choice') as NodeListOf<HTMLLabelElement>)
      .find((label) => label.textContent?.includes(option));
    if (!bar) {
      throw new Error(`No "${option}" option on screen`);
    }
    bar.click();
    fixture.detectChanges();
  }

  function submit(): void {
    submitButton().click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    live = new FakeLiveSession();
    const identity: StoredIdentity = { code: 'ABC123', playerId: ME, gameType: 'JEOPARDY', displayName: ME, isHost: false };
    TestBed.configureTestingModule({
      imports: [JeopardyPlayerControllerComponent],
      providers: [
        provideTranslateService(),
        { provide: LiveSessionService, useValue: live },
        { provide: IdentityStorageService, useValue: { load: () => identity } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ code: 'ABC123' }) } } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
      ],
    });
    fixture = TestBed.createComponent(JeopardyPlayerControllerComponent);
    fixture.detectChanges();
  });

  it('answers a list clue by picking one of its options instead of typing', () => {
    show(myTurnToAnswer(clue('c1', STATES)));

    expect(query('#answer-input')).toBeNull();
    expect(submitButton().disabled).toBeTrue();

    pick('Arkansas');
    submit();

    expect(live.sendJeopardyAction).toHaveBeenCalledOnceWith('answer', { value: 'Arkansas' });
  });

  it('keeps the text box for a clue that is answered by typing', () => {
    show(myTurnToAnswer(clue('c1', null)));

    expect(query('app-response-choices')).toBeNull();
    expect(query('#answer-input')).not.toBeNull();
  });

  it('tells the answerer when a clue needs several responses, and sends them all as one answer', () => {
    show(myTurnToAnswer(twoResponseClue('c1')));

    const hint = query('#answer-hint');
    expect(hint?.textContent).toContain('jeopardy.multipleResponsesHint');
    expect(query('#answer-input')?.getAttribute('aria-describedby')).toBe('answer-hint');

    const input = query<HTMLInputElement>('#answer-input')!;
    input.value = 'St. Joseph and Sacramento';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    submit();

    expect(live.sendJeopardyAction).toHaveBeenCalledOnceWith('answer', { value: 'St. Joseph and Sacramento' });
  });

  it('says nothing extra for an ordinary one-response clue', () => {
    show(myTurnToAnswer(clue('c1', null)));

    expect(query('.jp-form__hint')).toBeNull();
    expect(query('#answer-input')?.hasAttribute('aria-describedby')).toBeFalse();
  });

  it('tells a Daily Double finder when it needs several responses', () => {
    show(snapshot({ phase: 'DAILY_DOUBLE_ANSWER', activeCell: twoResponseClue('dd', true), activeAnswererId: ME }));

    expect(query('#dd-answer-hint')).not.toBeNull();
    expect(query('#dd-answer-input')?.getAttribute('aria-describedby')).toBe('dd-answer-hint');
  });

  it('tells Final Jeopardy players when the clue needs several responses', () => {
    show(
      snapshot({
        phase: 'FINAL_ANSWER_COLLECTION',
        finalCategory: 'ANNUAL EVENTS',
        finalClueText: 'In 2026 an annual 1,966-mile re-ride between these 2 cities took place June 15-25',
        finalRequiredResponseCount: 2,
        finalEligiblePlayerIds: [ME, THEM],
        finalWagerSubmittedPlayerIds: [ME, THEM],
        finalAnswerSubmittedPlayerIds: [],
      }),
    );

    expect(query('#final-answer-hint')).not.toBeNull();
    expect(query('#final-answer-input')?.getAttribute('aria-describedby')).toBe('final-answer-hint');
  });

  it('never carries an unsent pick over to the next clue', () => {
    show(myTurnToAnswer(clue('c1', STATES)));
    pick('Ohio');

    // Ohio is offered again, so a stale pick would even look legitimate.
    show(myTurnToAnswer(clue('c2', ['Texas', 'Ohio', 'Kansas', 'Iowa', 'Maine'])));
    fixture.detectChanges();

    expect(fixture.componentInstance.answerForm.controls.value.value).toBe('');
    expect(submitButton().disabled).toBeTrue();
  });

  it('answers a Daily Double from its list', () => {
    show(snapshot({ phase: 'DAILY_DOUBLE_ANSWER', activeCell: clue('dd', STATES, true), activeAnswererId: ME }));

    pick('Utah');
    submit();

    expect(live.sendJeopardyAction).toHaveBeenCalledOnceWith('dailyDoubleAnswer', { value: 'Utah' });
  });

  it('shows the correct response once a clue times out, with nothing left to press', () => {
    show(
      snapshot({
        phase: 'CLUE_OPEN',
        clueSubPhase: 'REVEALED',
        activeCell: { ...clue('c1', null), correctResponse: 'What is Arkansas?', revealReason: 'TIME_EXPIRED' },
      }),
    );

    expect(query('.jp-reveal__response')?.textContent?.trim()).toBe('What is Arkansas?');
    expect(query('.jp-reveal__tag')?.textContent).toContain('jeopardy.revealTimeExpired');
    expect(query('.controller__buzzer')).toBeNull();
    expect(query('form.jp-form')).toBeNull();
  });

  it('tells the finder the correct response after a missed Daily Double', () => {
    show(
      snapshot({
        phase: 'CLUE_OPEN',
        clueSubPhase: 'REVEALED',
        playerIdInControl: ME,
        activeCell: {
          ...clue('dd', STATES, true),
          dailyDoubleInProgress: false,
          correctResponse: 'Arkansas',
          revealReason: 'DAILY_DOUBLE_INCORRECT',
        },
      }),
    );

    expect(query('.jp-reveal__response')?.textContent?.trim()).toBe('Arkansas');
    expect(query('.jp-reveal__tag')?.textContent).toContain('jeopardy.revealDailyDoubleMissed');
    expect(query('app-response-choices')).toBeNull();
  });

  it('shows no response while the clue can still be answered', () => {
    show(myTurnToAnswer(clue('c1', null)));

    expect(query('.jp-reveal')).toBeNull();
  });

  it('shows the Final Jeopardy clue once wagers are in and answers it from its list', () => {
    show(
      snapshot({
        phase: 'FINAL_ANSWER_COLLECTION',
        finalCategory: 'WORLD CAPITALS',
        finalClueText: 'This European capital is home to the Tivoli Gardens',
        finalResponseChoices: ['Oslo', 'Copenhagen', 'Helsinki', 'Stockholm', 'Reykjavík'],
        finalEligiblePlayerIds: [ME, THEM],
        finalWagerSubmittedPlayerIds: [ME, THEM],
        finalAnswerSubmittedPlayerIds: [],
      }),
    );

    expect(fixture.nativeElement.textContent).toContain('This European capital is home to the Tivoli Gardens');

    pick('Copenhagen');
    submit();

    expect(live.sendJeopardyAction).toHaveBeenCalledOnceWith('finalAnswer', { value: 'Copenhagen' });
  });

  describe('in a tiebreaker', () => {
    const OTHER = 'other';

    function tiebreaker(overrides: Partial<JeopardyStateSnapshot> = {}): JeopardyStateSnapshot {
      return snapshot({
        phase: 'TIEBREAKER',
        clueSubPhase: 'BUZZ_OPEN',
        activeCell: { ...clue('tiebreaker|1', null), value: 0 },
        tiebreakerPlayerIds: [ME, THEM],
        tiebreakerNumber: 1,
        players: [player(ME), player(THEM), player(OTHER, 400)],
        ...overrides,
      });
    }

    it('first puts up who is tied, with the clue still hidden and nothing to press', () => {
      show(tiebreaker({ clueSubPhase: 'NONE', activeCell: { ...clue('tiebreaker|1', null), clueText: null } }));

      expect(query('.jp-dd')?.textContent).toContain('jeopardy.tiebreaker');
      expect(query('app-tiebreaker-matchup')?.textContent).toContain(ME);
      expect(query('app-tiebreaker-matchup')?.textContent).toContain(THEM);
      expect(query('.controller__buzzer')).toBeNull();
    });

    it('lets a tied contestant ring in', () => {
      show(tiebreaker());

      expect(query('.jp-clue__banner')?.textContent).toContain('jeopardy.tiebreakerBanner');
      expect(query('.jp-clue__status')?.textContent).toContain('jeopardy.tiebreakerYoureIn');
      query<HTMLButtonElement>('.controller__buzzer')!.click();

      expect(live.sendJeopardyAction).toHaveBeenCalledOnceWith('buzz');
    });

    it('only lets everyone else watch', () => {
      show(tiebreaker({ tiebreakerPlayerIds: [THEM, OTHER] }));

      expect(query('.controller__buzzer')).toBeNull();
      expect(query('.jp-clue__status')?.textContent).toContain('jeopardy.tiebreakerWatching');
    });
  });
});
