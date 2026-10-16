import { JeopardyStateSnapshot } from '../../../models/jeopardy.models';
import { PlayerView } from '../../../models/session.models';
import { isFinalPhase } from '../jeopardy-display';

export type JeopardyCue =
  | 'roundStart'
  | 'clueSelect'
  | 'dailyDouble'
  | 'buzzIn'
  | 'wagerLocked'
  | 'correct'
  | 'incorrect'
  | 'timeUp'
  | 'gameOver';

/**
 * The feedback cues implied by moving from one state snapshot to the next. Returns nothing for the
 * first snapshot, so connecting or reconnecting mid-game never replays what already happened.
 */
export function cuesBetween(prev: JeopardyStateSnapshot | null, next: JeopardyStateSnapshot): JeopardyCue[] {
  if (!prev) {
    return [];
  }
  const cues: JeopardyCue[] = [];

  const newTiebreaker = next.phase === 'TIEBREAKER' && next.tiebreakerNumber !== prev.tiebreakerNumber;
  if (next.phase === 'GAME_OVER' && prev.phase !== 'GAME_OVER') {
    cues.push('gameOver');
  } else if (next.currentRound !== prev.currentRound || (isFinalPhase(next.phase) && !isFinalPhase(prev.phase))
    || newTiebreaker) {
    cues.push('roundStart');
  }

  const tiebreakerClueUp = next.phase === 'TIEBREAKER' && prev.clueSubPhase === 'NONE' && next.clueSubPhase === 'BUZZ_OPEN';
  if (next.phase === 'DAILY_DOUBLE_WAGER' && prev.phase !== 'DAILY_DOUBLE_WAGER') {
    cues.push('dailyDouble');
  } else if ((next.phase === 'CLUE_OPEN' && next.activeCell && next.activeCell.cellId !== prev.activeCell?.cellId)
    || tiebreakerClueUp) {
    cues.push('clueSelect');
  }

  // No money changes hands on a tiebreaker, so its misses can't sound through a score drop.
  if (next.phase === 'TIEBREAKER' && prev.phase === 'TIEBREAKER'
    && next.lockedOutPlayerIds.length > prev.lockedOutPlayerIds.length) {
    cues.push('incorrect');
  }

  if (next.clueSubPhase === 'ANSWERING' && next.activeAnswererId && next.activeAnswererId !== prev.activeAnswererId) {
    cues.push('buzzIn');
  }

  // A miss already sounds through the score drop; running out the clock has no score change to cue it.
  if (next.clueSubPhase === 'REVEALED' && prev.clueSubPhase !== 'REVEALED'
    && next.activeCell?.revealReason === 'TIME_EXPIRED') {
    cues.push('timeUp');
  }

  const dailyDoubleWagered = prev.phase === 'DAILY_DOUBLE_WAGER' && next.phase === 'DAILY_DOUBLE_ANSWER';
  const finalWagerAdded =
    (next.finalWagerSubmittedPlayerIds?.length ?? 0) > (prev.finalWagerSubmittedPlayerIds?.length ?? 0);
  if (dailyDoubleWagered || finalWagerAdded) {
    cues.push('wagerLocked');
  }

  const { gained, lost } = scoreMovement(prev.players, next.players);
  if (gained) {
    cues.push('correct');
  }
  if (lost) {
    cues.push('incorrect');
  }
  return cues;
}

function scoreMovement(prev: PlayerView[], next: PlayerView[]): { gained: boolean; lost: boolean } {
  const before = new Map(prev.map((p) => [p.playerId, p.score]));
  let gained = false;
  let lost = false;
  for (const player of next) {
    const previous = before.get(player.playerId);
    if (previous === undefined) {
      continue;
    }
    if (player.score > previous) {
      gained = true;
    } else if (player.score < previous) {
      lost = true;
    }
  }
  return { gained, lost };
}
