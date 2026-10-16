import { PlayerView } from './session.models';

// Round-agnostic: which round a board/clue phase belongs to is carried by currentRound, since a
// game runs anywhere from 2 to 4 rounds.
// TIEBREAKER: ties aren't allowed and the lead is shared - only the tied contestants play, one clue
// at a time, through the same sub-phases as a board clue (plus NONE first, while only the category
// is up), until one of them gets one right.
export type JeopardyPhase =
  | 'BOARD' | 'CLUE_OPEN' | 'DAILY_DOUBLE_WAGER' | 'DAILY_DOUBLE_ANSWER'
  | 'FINAL_WAGER' | 'FINAL_ANSWER_COLLECTION' | 'FINAL_REVEAL' | 'TIEBREAKER' | 'GAME_OVER';

// REVEALED: the clue is over and nobody got it - it stays up, showing its correct response, for a
// few seconds before the board comes back. Nobody can act meanwhile.
export type ClueSubPhase = 'NONE' | 'BUZZ_OPEN' | 'ANSWERING' | 'REVEALED';
export type CellState = 'HIDDEN' | 'REVEALED_OPEN' | 'ANSWERED';

/** Why a clue's correct response is on screen. */
export type ClueRevealReason = 'TIME_EXPIRED' | 'ALL_INCORRECT' | 'DAILY_DOUBLE_INCORRECT';

export interface BoardCellView {
  cellId: string;
  category: string;
  value: number;
  state: CellState;
}

export interface ActiveCellView {
  cellId: string;
  category: string;
  value: number;
  clueText: string | null;
  isDailyDouble: boolean;
  dailyDoubleInProgress: boolean;
  // A clue whose response comes from a known list (a state, a country, a president...) is answered
  // by picking one of these instead of typing. Null for a typed answer, and hidden whenever clueText is.
  responseChoices: string[] | null;
  // How many separate responses the clue needs ("these 2 cities") - 1 for nearly every clue. All of
  // them go in the one text box. Hidden whenever clueText is.
  requiredResponseCount: number | null;
  // Both set only while clueSubPhase is REVEALED - the server never sends the response any earlier.
  correctResponse: string | null;
  revealReason: ClueRevealReason | null;
}

export interface FinalResultEntry {
  playerId: string;
  displayName: string;
  wager: number;
  answerText: string;
  correct: boolean;
  scoreDelta: number;
  finalScore: number;
}

export interface JeopardyStateSnapshot {
  type: 'JEOPARDY_STATE';
  phase: JeopardyPhase;
  currentRound: number;
  // How many regular rounds this game runs (2-4, host-chosen); Final Jeopardy is on top.
  roundCount: number;
  board: BoardCellView[];
  activeCell: ActiveCellView | null;
  clueSubPhase: ClueSubPhase;
  activeAnswererId: string | null;
  lockedOutPlayerIds: string[];
  playerIdInControl: string;
  // The current timed window (buzz-in, answer, Final Jeopardy answers) - both null whenever
  // nothing is on the clock.
  phaseStartedAt: string | null;
  phaseDeadlineAt: string | null;
  finalCategory: string | null;
  // The Final Jeopardy clue, and its options when it's answered from a list - both null until every
  // wager is in, since wagers are made knowing only the category.
  finalClueText: string | null;
  finalResponseChoices: string[] | null;
  // Like ActiveCellView.requiredResponseCount, and hidden along with finalClueText.
  finalRequiredResponseCount: number | null;
  // Who finished the last regular round with money and therefore gets to play Final Jeopardy -
  // anyone at $0 or in the red is out. Null until Final Jeopardy is reached.
  finalEligiblePlayerIds: string[] | null;
  finalWagerSubmittedPlayerIds: string[] | null;
  finalAnswerSubmittedPlayerIds: string[] | null;
  finalResults: FinalResultEntry[] | null;
  // The contestants tied for the lead when ties aren't allowed - the only ones who play the
  // tiebreaker - and which tiebreaker clue is (or was last) up: 1, then 2... Both null unless a
  // tiebreaker was needed, and kept once the game is over.
  tiebreakerPlayerIds: string[] | null;
  tiebreakerNumber: number | null;
  players: PlayerView[];
  gameWinnerPlayerIds: string[] | null;
}
