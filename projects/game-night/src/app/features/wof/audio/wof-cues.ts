import { WofStateSnapshot } from '../../../models/wof.models';
import { classifyWedge } from '../wheel/wheel-geometry';

export type WofCue =
  | 'spinStart'
  | 'landedCash'
  | 'landedSpecial'
  | 'bankrupt'
  | 'loseATurn'
  | 'specialClaimed'
  | 'ringIn'
  | 'frenzySolved'
  | 'frenzyMissed'
  | 'frenzyUnsolved';

/**
 * The cues implied by moving from one snapshot to the next. Nothing plays for the first snapshot,
 * so connecting or reconnecting mid-game never replays an old spin, and a landing cue only plays
 * for a spin this screen actually watched (in motion, then settled).
 */
export function wofCuesBetween(prev: WofStateSnapshot | null, next: WofStateSnapshot): WofCue[] {
  if (!prev) {
    return [];
  }
  return [...wheelCues(prev, next), ...claimCues(prev, next), ...tossUpCues(prev, next)];
}

function wheelCues(prev: WofStateSnapshot, next: WofStateSnapshot): WofCue[] {
  const before = prev.wheelSpin;
  const after = next.wheelSpin;
  if (!after) {
    return [];
  }
  if (after.spinId !== before?.spinId) {
    return after.inMotion ? ['spinStart'] : [];
  }
  const justSettled = before.inMotion && !after.inMotion;
  if (!justSettled || !next.lastSpinResult) {
    return [];
  }
  switch (classifyWedge(next.lastSpinResult)) {
    case 'CASH':
      return ['landedCash'];
    case 'WILD_CARD':
    case 'MILLION':
      return ['landedSpecial'];
    case 'BANKRUPT':
      return ['bankrupt'];
    case 'LOSE_A_TURN':
      return ['loseATurn'];
    default:
      return [];
  }
}

/** A Wild Card or Million Dollar Wedge going from nobody's to someone's is always a claim. */
function claimCues(prev: WofStateSnapshot, next: WofStateSnapshot): WofCue[] {
  const claimed =
    (!prev.wildCardHolderId && !!next.wildCardHolderId) || (!prev.millionWedgeHolderId && !!next.millionWedgeHolderId);
  return claimed ? ['specialClaimed'] : [];
}

function tossUpCues(prev: WofStateSnapshot, next: WofStateSnapshot): WofCue[] {
  const rangIn =
    (!prev.frenzySolvingPlayerId && !!next.frenzySolvingPlayerId) ||
    (!prev.tripleTossUpSolvingPlayerId && !!next.tripleTossUpSolvingPlayerId);
  if (rangIn) {
    return ['ringIn'];
  }
  if (prev.phase !== 'FORTUNE_FRENZY' || next.phase !== 'FRENZY_PUZZLE_OVER') {
    return [];
  }
  switch (next.frenzyOutcome) {
    case 'SOLVED':
      return ['frenzySolved'];
    case 'MISSED':
      return ['frenzyMissed'];
    case 'UNSOLVED':
      return ['frenzyUnsolved'];
    default:
      return [];
  }
}
