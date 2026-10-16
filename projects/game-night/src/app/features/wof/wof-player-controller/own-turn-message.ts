import { WofStateSnapshot } from '../../../models/wof.models';

/** A special wedge a correct consonant can claim. */
export type ClaimedWedge = 'WILD_CARD' | 'MILLION_WEDGE';

/** What a player is told about their own consonant call, vowel purchase or solve attempt. */
export type OwnTurnMessage =
  | {
      kind: 'letterFound';
      letter: string;
      count: number;
      winnings: number | null;
      /** The special wedge this letter claimed, if the spin landed on one. */
      claimed: ClaimedWedge | null;
      /** They hold the Wild Card and may play it right now, for one more consonant. */
      wildCardPlayable: boolean;
    }
  | { kind: 'letterMissing'; letter: string }
  | { kind: 'solveCorrect' }
  | { kind: 'solveWrong' }
  | { kind: 'solveTimedOut' };

/**
 * The outcome of this player's own move, read off the snapshot that follows it - or null when the
 * change between the two snapshots wasn't one of their moves (another player's turn, a reconnect,
 * a duplicate snapshot).
 *
 * `solveSubmitted` tells a wrong answer from a solve window that simply ran out, which the
 * snapshots alone can't.
 */
export function ownTurnMessage(
  prev: WofStateSnapshot | null,
  next: WofStateSnapshot,
  myPlayerId: string,
  solveSubmitted: boolean,
): OwnTurnMessage | null {
  if (!prev) {
    return null;
  }
  if (prev.phase === 'AWAITING_SOLVE' && prev.solvingPlayerId === myPlayerId && next.phase !== 'AWAITING_SOLVE') {
    if (next.roundWinnerPlayerId === myPlayerId) {
      return { kind: 'solveCorrect' };
    }
    return { kind: solveSubmitted ? 'solveWrong' : 'solveTimedOut' };
  }
  if (prev.currentPlayerId !== myPlayerId) {
    return null;
  }
  if (prev.phase === 'AWAITING_LETTER_GUESS') {
    const consonant = newlyCalled(prev.guessedConsonants, next.guessedConsonants);
    // The wedge the wheel landed on sets what each one is worth.
    const result = consonant ? letterResult(consonant, next.puzzleTemplate, prev.lastSpinResult?.value ?? null) : null;
    if (result?.kind !== 'letterFound') {
      return result;
    }
    return {
      ...result,
      claimed: claimedBy(prev, next, myPlayerId),
      wildCardPlayable: next.wildCardUsable && next.currentPlayerId === myPlayerId,
    };
  }
  if (prev.phase === 'WAITING_FOR_TURN_ACTION') {
    const vowel = newlyCalled(prev.guessedVowels, next.guessedVowels);
    return vowel ? letterResult(vowel, next.puzzleTemplate, null) : null;
  }
  return null;
}

function newlyCalled(before: string[], after: string[]): string | null {
  return after.find((letter) => !before.includes(letter)) ?? null;
}

function claimedBy(prev: WofStateSnapshot, next: WofStateSnapshot, me: string): ClaimedWedge | null {
  if (next.wildCardHolderId === me && prev.wildCardHolderId !== me) {
    return 'WILD_CARD';
  }
  if (next.millionWedgeHolderId === me && prev.millionWedgeHolderId !== me) {
    return 'MILLION_WEDGE';
  }
  return null;
}

/** Counted from the template, which shows every revealed letter in place. */
function letterResult(letter: string, template: string, valuePerLetter: number | null): OwnTurnMessage {
  const count = [...template].filter((char) => char === letter).length;
  if (count === 0) {
    return { kind: 'letterMissing', letter };
  }
  return {
    kind: 'letterFound',
    letter,
    count,
    winnings: valuePerLetter ? count * valuePerLetter : null,
    claimed: null,
    wildCardPlayable: false,
  };
}
