import { specialWheel, syndicatedWheel } from '../wheel/wheel-fixtures.spec';
import { wofSnapshot } from '../wof-state-fixtures.spec';
import { ownTurnMessage } from './own-turn-message';

const ME = 'a';
const cashWedge = syndicatedWheel().find((wedge) => wedge.value !== null)!;

describe('ownTurnMessage', () => {
  it('says nothing for the first snapshot or when nothing changed', () => {
    const state = wofSnapshot();
    expect(ownTurnMessage(null, state, ME, false)).toBeNull();
    expect(ownTurnMessage(state, { ...state }, ME, false)).toBeNull();
  });

  it('counts a called consonant and what it earned at the landed wedge value', () => {
    const before = wofSnapshot({ phase: 'AWAITING_LETTER_GUESS', lastSpinResult: cashWedge });
    const after = wofSnapshot({ guessedConsonants: ['S'], puzzleTemplate: 'S_____ S____' });

    expect(ownTurnMessage(before, after, ME, false)).toEqual({
      kind: 'letterFound',
      letter: 'S',
      count: 2,
      winnings: 2 * cashWedge.value!,
      claimed: null,
      wildCardPlayable: false,
    });
  });

  it('says when the letter claimed the Wild Card - and that it can be played straight away', () => {
    const wildCard = specialWheel()[5];
    const before = wofSnapshot({ phase: 'AWAITING_LETTER_GUESS', lastSpinResult: wildCard });
    const after = wofSnapshot({
      guessedConsonants: ['S'],
      puzzleTemplate: 'S_____ _____',
      wildCardHolderId: ME,
      wildCardUsable: true,
    });

    expect(ownTurnMessage(before, after, ME, false)).toEqual(
      jasmine.objectContaining({ kind: 'letterFound', winnings: 500, claimed: 'WILD_CARD', wildCardPlayable: true }),
    );
  });

  it('says when the letter picked up the Million Dollar Wedge', () => {
    const million = specialWheel()[17];
    const before = wofSnapshot({ phase: 'AWAITING_LETTER_GUESS', lastSpinResult: million });
    const after = wofSnapshot({ guessedConsonants: ['S'], puzzleTemplate: 'S_____ _____', millionWedgeHolderId: ME });

    expect(ownTurnMessage(before, after, ME, false)).toEqual(
      jasmine.objectContaining({ claimed: 'MILLION_WEDGE', wildCardPlayable: false }),
    );
  });

  it('reports a consonant that is not in the puzzle', () => {
    const before = wofSnapshot({ phase: 'AWAITING_LETTER_GUESS', lastSpinResult: cashWedge });
    const after = wofSnapshot({ guessedConsonants: ['Q'], currentPlayerId: 'b' });

    expect(ownTurnMessage(before, after, ME, false)).toEqual({ kind: 'letterMissing', letter: 'Q' });
  });

  it('reports a bought vowel without any winnings', () => {
    const before = wofSnapshot();
    const after = wofSnapshot({ guessedVowels: ['A'], puzzleTemplate: '_A_A__ _____' });

    expect(ownTurnMessage(before, after, ME, false)).toEqual({
      kind: 'letterFound',
      letter: 'A',
      count: 2,
      winnings: null,
      claimed: null,
      wildCardPlayable: false,
    });
  });

  it("ignores another player's letters", () => {
    const before = wofSnapshot({ phase: 'AWAITING_LETTER_GUESS', currentPlayerId: 'b', lastSpinResult: cashWedge });
    const after = wofSnapshot({ guessedConsonants: ['S'], currentPlayerId: 'b', puzzleTemplate: 'S_____ _____' });

    expect(ownTurnMessage(before, after, ME, false)).toBeNull();
  });

  describe('a solve attempt', () => {
    const solving = wofSnapshot({ phase: 'AWAITING_SOLVE', solvingPlayerId: ME });

    it('is correct when the round goes to this player', () => {
      const after = wofSnapshot({ phase: 'ROUND_OVER', roundWinnerPlayerId: ME });
      expect(ownTurnMessage(solving, after, ME, true)).toEqual({ kind: 'solveCorrect' });
    });

    it('is wrong when an answer was sent and the turn moved on', () => {
      const after = wofSnapshot({ currentPlayerId: 'b' });
      expect(ownTurnMessage(solving, after, ME, true)).toEqual({ kind: 'solveWrong' });
    });

    it('timed out when no answer was sent', () => {
      const after = wofSnapshot({ currentPlayerId: 'b' });
      expect(ownTurnMessage(solving, after, ME, false)).toEqual({ kind: 'solveTimedOut' });
    });

    it("says nothing about another player's attempt", () => {
      const theirs = wofSnapshot({ phase: 'AWAITING_SOLVE', solvingPlayerId: 'b', currentPlayerId: 'b' });
      const after = wofSnapshot({ phase: 'ROUND_OVER', roundWinnerPlayerId: 'b' });
      expect(ownTurnMessage(theirs, after, ME, false)).toBeNull();
    });
  });
});
