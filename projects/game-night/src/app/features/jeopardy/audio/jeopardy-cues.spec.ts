import { ActiveCellView, ClueRevealReason, JeopardyStateSnapshot } from '../../../models/jeopardy.models';
import { PlayerView } from '../../../models/session.models';
import { cuesBetween } from './jeopardy-cues';

function player(playerId: string, score: number): PlayerView {
  return { playerId, displayName: playerId, score, connected: true, host: false, ai: false };
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
    players: [player('a', 0), player('b', 0)],
    gameWinnerPlayerIds: null,
    ...overrides,
  };
}

const clue = (cellId: string, isDailyDouble = false): ActiveCellView => ({
  cellId,
  category: 'Science',
  value: 200,
  clueText: 'A clue',
  isDailyDouble,
  dailyDoubleInProgress: false,
  responseChoices: null,
  requiredResponseCount: 1,
  correctResponse: null,
  revealReason: null,
});

const revealed = (cellId: string, revealReason: ClueRevealReason): ActiveCellView => ({
  ...clue(cellId),
  correctResponse: 'What is a response?',
  revealReason,
});

describe('cuesBetween', () => {
  it('stays silent on the first snapshot so a reconnect never replays history', () => {
    expect(cuesBetween(null, snapshot({ phase: 'CLUE_OPEN', activeCell: clue('r1|Science|0') }))).toEqual([]);
  });

  it('stays silent when nothing meaningful changed', () => {
    const state = snapshot();
    expect(cuesBetween(state, { ...state })).toEqual([]);
  });

  it('cues a clue selection when a new clue opens', () => {
    const next = snapshot({ phase: 'CLUE_OPEN', activeCell: clue('r1|Science|0') });
    expect(cuesBetween(snapshot(), next)).toEqual(['clueSelect']);
  });

  it('cues a Daily Double instead of a plain clue selection', () => {
    const next = snapshot({ phase: 'DAILY_DOUBLE_WAGER', activeCell: clue('r1|Science|3', true) });
    expect(cuesBetween(snapshot(), next)).toEqual(['dailyDouble']);
  });

  it('cues a buzz-in when someone takes the clue', () => {
    const prev = snapshot({ phase: 'CLUE_OPEN', activeCell: clue('r1|Science|0'), clueSubPhase: 'BUZZ_OPEN' });
    const next = { ...prev, clueSubPhase: 'ANSWERING' as const, activeAnswererId: 'b' };
    expect(cuesBetween(prev, next)).toEqual(['buzzIn']);
  });

  it('cues time running out when a clue is revealed because nobody rang in', () => {
    const prev = snapshot({ phase: 'CLUE_OPEN', activeCell: clue('r1|Science|0'), clueSubPhase: 'BUZZ_OPEN' });
    const next = { ...prev, clueSubPhase: 'REVEALED' as const, activeCell: revealed('r1|Science|0', 'TIME_EXPIRED') };

    expect(cuesBetween(prev, next)).toEqual(['timeUp']);
    expect(cuesBetween(next, { ...next })).withContext('only as the reveal starts').toEqual([]);
  });

  it('leaves a revealed miss to the incorrect cue its score drop already plays', () => {
    const prev = snapshot({
      phase: 'CLUE_OPEN',
      activeCell: clue('r1|Science|0'),
      clueSubPhase: 'ANSWERING',
      activeAnswererId: 'b',
    });
    const next = snapshot({
      phase: 'CLUE_OPEN',
      activeCell: revealed('r1|Science|0', 'ALL_INCORRECT'),
      clueSubPhase: 'REVEALED',
      players: [player('a', 0), player('b', -200)],
    });

    expect(cuesBetween(prev, next)).toEqual(['incorrect']);
  });

  it('cues correct and incorrect from score movement', () => {
    const prev = snapshot();
    expect(cuesBetween(prev, snapshot({ players: [player('a', 400), player('b', 0)] }))).toEqual(['correct']);
    expect(cuesBetween(prev, snapshot({ players: [player('a', 0), player('b', -400)] }))).toEqual(['incorrect']);
  });

  it('ignores players who were not in the previous snapshot', () => {
    const next = snapshot({ players: [player('a', 0), player('b', 0), player('c', 1000)] });
    expect(cuesBetween(snapshot(), next)).toEqual([]);
  });

  it('cues a new round, and Final Jeopardy as a round', () => {
    expect(cuesBetween(snapshot(), snapshot({ currentRound: 2 }))).toEqual(['roundStart']);
    expect(cuesBetween(snapshot({ currentRound: 2 }), snapshot({ currentRound: 2, phase: 'FINAL_WAGER' }))).toEqual([
      'roundStart',
    ]);
  });

  it('cues locked-in wagers for Daily Doubles and Final Jeopardy', () => {
    const ddPrev = snapshot({ phase: 'DAILY_DOUBLE_WAGER', activeCell: clue('r1|Science|3', true) });
    expect(cuesBetween(ddPrev, { ...ddPrev, phase: 'DAILY_DOUBLE_ANSWER' })).toEqual(['wagerLocked']);

    const finalPrev = snapshot({ phase: 'FINAL_WAGER', finalWagerSubmittedPlayerIds: [] });
    expect(cuesBetween(finalPrev, { ...finalPrev, finalWagerSubmittedPlayerIds: ['a'] })).toEqual(['wagerLocked']);
  });

  it('cues game over rather than a round change at the end', () => {
    const prev = snapshot({ phase: 'FINAL_REVEAL' });
    expect(cuesBetween(prev, { ...prev, phase: 'GAME_OVER' })).toEqual(['gameOver']);
  });

  describe('a tiebreaker', () => {
    const intro = snapshot({
      phase: 'TIEBREAKER',
      clueSubPhase: 'NONE',
      activeCell: { ...clue('tiebreaker|1'), clueText: null },
      tiebreakerPlayerIds: ['a', 'b'],
      tiebreakerNumber: 1,
    });
    const open = { ...intro, clueSubPhase: 'BUZZ_OPEN' as const, activeCell: clue('tiebreaker|1') };

    it('cues each tiebreaker like a new round, and its clue like a clue selection', () => {
      expect(cuesBetween(snapshot({ phase: 'FINAL_ANSWER_COLLECTION' }), intro)).toEqual(['roundStart']);
      expect(cuesBetween(intro, open)).toEqual(['clueSelect']);
      expect(cuesBetween(open, { ...intro, tiebreakerNumber: 2, activeCell: { ...clue('tiebreaker|2'), clueText: null } }))
        .toEqual(['roundStart']);
    });

    it('cues a miss from the lockout, since no money moves to cue it', () => {
      expect(cuesBetween(open, { ...open, lockedOutPlayerIds: ['a'] })).toEqual(['incorrect']);
    });
  });
});
