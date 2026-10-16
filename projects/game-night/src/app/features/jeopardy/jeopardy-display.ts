import { ActiveCellView, BoardCellView, JeopardyPhase, JeopardyStateSnapshot } from '../../models/jeopardy.models';
import { PlayerView } from '../../models/session.models';

/** A translation key plus its interpolation params, resolved in the template. */
export interface TranslatableText {
  key: string;
  params?: Record<string, unknown>;
}

/** A clue nobody got, now showing its correct response. */
export interface ClueRevealDisplay {
  heading: TranslatableText;
  response: string;
}

const FINAL_PHASES: ReadonlySet<JeopardyPhase> = new Set(['FINAL_WAGER', 'FINAL_ANSWER_COLLECTION', 'FINAL_REVEAL']);

/** Phases where a buzz-in clue (not Final Jeopardy's) is on screen - a tiebreaker's included. */
const CLUE_PHASES: ReadonlySet<JeopardyPhase> = new Set([
  'CLUE_OPEN',
  'DAILY_DOUBLE_WAGER',
  'DAILY_DOUBLE_ANSWER',
  'TIEBREAKER',
]);

export function isFinalPhase(phase: JeopardyPhase): boolean {
  return FINAL_PHASES.has(phase);
}

export function isCluePhase(phase: JeopardyPhase): boolean {
  return CLUE_PHASES.has(phase);
}

/**
 * Title for the current stage of the game. Rounds have show names up to Triple Jeopardy; a fourth
 * just reads as "Round 4".
 */
export function roundTitle(state: JeopardyStateSnapshot): TranslatableText {
  if (state.phase === 'GAME_OVER') {
    return { key: 'gameOver.ariaLabel' };
  }
  if (state.phase === 'TIEBREAKER') {
    const number = state.tiebreakerNumber ?? 1;
    return number > 1 ? { key: 'jeopardy.tiebreakerN', params: { number } } : { key: 'jeopardy.tiebreaker' };
  }
  if (isFinalPhase(state.phase)) {
    return { key: 'jeopardy.finalRound' };
  }
  switch (state.currentRound) {
    case 1:
      return { key: 'jeopardy.round1' };
    case 2:
      return { key: 'jeopardy.round2' };
    case 3:
      return { key: 'jeopardy.round3' };
    default:
      return { key: 'jeopardy.roundN', params: { round: state.currentRound } };
  }
}

/**
 * What the window currently on the clock is for - ringing in, the answerer's turn, or Final
 * Jeopardy responses - as a translation key, or null when nothing is being timed.
 */
export function phaseTimerLabel(state: JeopardyStateSnapshot): string | null {
  if (!state.phaseStartedAt || !state.phaseDeadlineAt) {
    return null;
  }
  if (state.phase === 'FINAL_ANSWER_COLLECTION') {
    return 'jeopardy.timerFinal';
  }
  if (state.phase === 'TIEBREAKER' && state.clueSubPhase === 'NONE') {
    return 'jeopardy.timerTiebreakerIntro';
  }
  return state.clueSubPhase === 'ANSWERING' ? 'jeopardy.timerAnswer' : 'jeopardy.timerBuzz';
}

/** The strip across the top of a clue: category and value - or, on a tiebreaker, just the category. */
export function clueBanner(state: JeopardyStateSnapshot, active: ActiveCellView): TranslatableText {
  if (state.phase === 'TIEBREAKER') {
    return { key: 'jeopardy.tiebreakerBanner', params: { category: active.category } };
  }
  return { key: 'jeopardy.clueCategoryValue', params: { category: active.category, value: active.value } };
}

/** The contestants playing the tiebreaker, in seat order - empty when there isn't one. */
export function tiebreakerContestants(state: JeopardyStateSnapshot): PlayerView[] {
  const tied = state.tiebreakerPlayerIds ?? [];
  return state.players.filter((p) => tied.includes(p.playerId));
}

/**
 * The correct response to show, with a heading saying why, while a clue nobody got is still up -
 * or null whenever the clue can still be answered (the server doesn't send the response then anyway).
 */
export function clueReveal(state: JeopardyStateSnapshot): ClueRevealDisplay | null {
  const active = state.activeCell;
  if (state.clueSubPhase !== 'REVEALED' || !active?.correctResponse) {
    return null;
  }
  switch (active.revealReason) {
    case 'DAILY_DOUBLE_INCORRECT': {
      // The finder keeps control of the board after their Daily Double, right or wrong.
      const finder = state.players.find((p) => p.playerId === state.playerIdInControl);
      return {
        heading: finder
          ? { key: 'jeopardy.revealDailyDoubleMissed', params: { name: finder.displayName } }
          : { key: 'jeopardy.revealDailyDoubleMissedAnon' },
        response: active.correctResponse,
      };
    }
    case 'ALL_INCORRECT':
      return { heading: { key: 'jeopardy.revealAllIncorrect' }, response: active.correctResponse };
    default:
      return { heading: { key: 'jeopardy.revealTimeExpired' }, response: active.correctResponse };
  }
}

/** Categories in board order - the board model is flat, so column order is first-appearance order. */
export function boardCategories(board: BoardCellView[]): string[] {
  const seen: string[] = [];
  for (const cell of board) {
    if (!seen.includes(cell.category)) {
      seen.push(cell.category);
    }
  }
  return seen;
}

/** Row index (0 = cheapest clue), encoded as the last `|` segment of the cell id. */
export function boardRowOf(cellId: string): number {
  return Number(cellId.slice(cellId.lastIndexOf('|') + 1));
}
