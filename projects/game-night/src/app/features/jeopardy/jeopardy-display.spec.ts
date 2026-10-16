import { ActiveCellView, ClueRevealReason, JeopardyStateSnapshot } from '../../models/jeopardy.models';
import { PlayerView } from '../../models/session.models';
import { clueBanner, clueReveal, isCluePhase, phaseTimerLabel, roundTitle, tiebreakerContestants } from './jeopardy-display';

function player(playerId: string, displayName: string): PlayerView {
  return { playerId, displayName, score: 0, connected: true, host: false, ai: false };
}

function cell(correctResponse: string | null, revealReason: ClueRevealReason | null): ActiveCellView {
  return {
    cellId: 'Science|2',
    category: 'Science',
    value: 300,
    clueText: 'A clue',
    isDailyDouble: revealReason === 'DAILY_DOUBLE_INCORRECT',
    dailyDoubleInProgress: false,
    responseChoices: null,
    requiredResponseCount: 1,
    correctResponse,
    revealReason,
  };
}

function state(overrides: Partial<JeopardyStateSnapshot>): JeopardyStateSnapshot {
  return {
    type: 'JEOPARDY_STATE',
    phase: 'CLUE_OPEN',
    currentRound: 1,
    roundCount: 2,
    board: [],
    activeCell: null,
    clueSubPhase: 'REVEALED',
    activeAnswererId: null,
    lockedOutPlayerIds: [],
    playerIdInControl: 'a',
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
    players: [player('a', 'Alice'), player('b', 'Bob')],
    gameWinnerPlayerIds: null,
    ...overrides,
  };
}

describe('clueReveal', () => {
  it('heads a clue that ran out the clock with "time\'s up"', () => {
    expect(clueReveal(state({ activeCell: cell('Mars', 'TIME_EXPIRED') }))).toEqual({
      heading: { key: 'jeopardy.revealTimeExpired' },
      response: 'Mars',
    });
  });

  it('says nobody got it when everyone missed', () => {
    expect(clueReveal(state({ activeCell: cell('Mars', 'ALL_INCORRECT') }))?.heading).toEqual({
      key: 'jeopardy.revealAllIncorrect',
    });
  });

  it('names the Daily Double finder, who keeps control of the board', () => {
    const reveal = clueReveal(state({ playerIdInControl: 'b', activeCell: cell('Mars', 'DAILY_DOUBLE_INCORRECT') }));

    expect(reveal?.heading).toEqual({ key: 'jeopardy.revealDailyDoubleMissed', params: { name: 'Bob' } });
  });

  it('shows nothing until the clue is actually revealed', () => {
    expect(clueReveal(state({ clueSubPhase: 'BUZZ_OPEN', activeCell: cell(null, null) }))).toBeNull();
    expect(clueReveal(state({ clueSubPhase: 'REVEALED', activeCell: null }))).toBeNull();
  });
});

describe('a tiebreaker', () => {
  const tiebreaker = (overrides: Partial<JeopardyStateSnapshot> = {}): JeopardyStateSnapshot =>
    state({
      phase: 'TIEBREAKER',
      clueSubPhase: 'NONE',
      activeCell: cell(null, null),
      tiebreakerPlayerIds: ['b', 'a'],
      tiebreakerNumber: 1,
      phaseStartedAt: '2026-10-14T20:00:00Z',
      phaseDeadlineAt: '2026-10-14T20:00:04Z',
      ...overrides,
    });

  it('is shown as a clue, titled by which tiebreaker it is', () => {
    expect(isCluePhase('TIEBREAKER')).toBeTrue();
    expect(roundTitle(tiebreaker())).toEqual({ key: 'jeopardy.tiebreaker' });
    expect(roundTitle(tiebreaker({ tiebreakerNumber: 2 }))).toEqual({ key: 'jeopardy.tiebreakerN', params: { number: 2 } });
  });

  it('counts down to its clue first, then to buzzing in like any clue', () => {
    expect(phaseTimerLabel(tiebreaker())).toBe('jeopardy.timerTiebreakerIntro');
    expect(phaseTimerLabel(tiebreaker({ clueSubPhase: 'BUZZ_OPEN' }))).toBe('jeopardy.timerBuzz');
  });

  it('heads its clue with the category alone - there is no money on it', () => {
    const snap = tiebreaker();
    expect(clueBanner(snap, snap.activeCell!)).toEqual({ key: 'jeopardy.tiebreakerBanner', params: { category: 'Science' } });

    const boardClue = state({ phase: 'CLUE_OPEN', activeCell: cell(null, null) });
    expect(clueBanner(boardClue, boardClue.activeCell!)).toEqual({
      key: 'jeopardy.clueCategoryValue',
      params: { category: 'Science', value: 300 },
    });
  });

  it('lists the tied contestants in seat order', () => {
    expect(tiebreakerContestants(tiebreaker()).map((p) => p.displayName)).toEqual(['Alice', 'Bob']);
    expect(tiebreakerContestants(state({}))).toEqual([]);
  });
});
