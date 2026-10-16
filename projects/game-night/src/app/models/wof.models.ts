import { PlayerView } from './session.models';

export type WofPhase =
  | 'FORTUNE_FRENZY'
  | 'FRENZY_PUZZLE_OVER'
  | 'WAITING_FOR_TURN_ACTION'
  | 'AWAITING_LETTER_GUESS'
  | 'AWAITING_SOLVE'
  | 'ROUND_OVER'
  | 'TRIPLE_TOSS_UP'
  | 'FINAL_SPIN'
  | 'SPEEDUP_AWAITING_LETTER'
  | 'SPEEDUP_AWAITING_SOLVE'
  | 'BONUS_PICK_CATEGORY'
  | 'BONUS_PICK_LETTERS'
  | 'BONUS_SOLVE'
  | 'GAME_OVER';

/** How a Fortune Frenzy puzzle ended: SOLVED flashes the board frame green, the others red. */
export type FrenzyOutcome = 'SOLVED' | 'MISSED' | 'UNSOLVED';

/** WedgeView.effect values with special meaning. A Wild Card or Million wedge plays for its `value`. */
export const WEDGE_EFFECT_WILD_CARD = 'WILD_CARD';
export const WEDGE_EFFECT_MILLION = 'MILLION';

export interface WedgeView {
  label: string;
  value: number | null;
  effect: string;
  backgroundColor: string;
  textColor: string;
  /** Where the wedge sits on the rim: slots [startSlot, startSlot + slotCount) of 72, clockwise from 12 o'clock. */
  startSlot: number;
  slotCount: number;
}

/** The latest physical spin - the server decides where it lands and how long it turns. */
export interface WheelSpinView {
  /** Goes up by one per spin, so back-to-back landings on the same slot still read as new spins. */
  spinId: number;
  landingSlot: number;
  durationMs: number;
  /** When the server applies the result - just after the wheel stops. */
  settlesAt: string;
  /** True until the result has been applied; no turn action is accepted meanwhile. */
  inMotion: boolean;
}

export interface WofStateSnapshot {
  type: 'WOF_STATE';
  phase: WofPhase;
  roundNumber: number;
  // Only meaningful through Round 3 (the fixed rounds before the Triple Toss-Up) - null once
  // rounds become open-ended (Round 4 onward), since there's no longer a fixed total.
  totalRounds: number | null;
  category: string;
  puzzleTemplate: string;
  guessedConsonants: string[];
  guessedVowels: string[];
  /** Whether the puzzle still hides a consonant - once it doesn't, no spin is allowed ("only
   *  vowels remain"), since a spin always ends in a consonant call. */
  consonantsLeft: boolean;
  /** Whether the puzzle still hides a vowel - once it doesn't, no vowel can be bought. */
  vowelsLeft: boolean;
  currentPlayerId: string;
  // Null while the wheel is still turning - the landed wedge is only revealed once it settles. Stays
  // as landed for the rest of the turn, even once a claimed Wild Card or Million Dollar Wedge has
  // come off the wheel - it's what the spin is worth.
  lastSpinResult: WedgeView | null;
  /** The wheel as it stands right now, special wedges included. */
  wheel: WedgeView[];
  /** Index into `wheel` of the wedge under the landing slot. */
  lastSpinIndex: number | null;
  wheelSpin: WheelSpinView | null;
  players: PlayerView[];
  // Money won this round (rounds 1-3, open-ended rounds 4+, and the final speed-up round) that
  // hasn't been folded into a player's cumulative score yet - BANKRUPT wipes only this, and it's
  // added to the cumulative total the moment the round ends. Frenzy/Triple-Toss-Up/Bonus cash
  // bypasses this and goes straight into the cumulative score.
  roundScores: Record<string, number>;
  roundWinnerPlayerId: string | null;
  gameWinnerPlayerIds: string[] | null;
  // Special wedges - one of each per game, shown on the holder's score display. Bankrupt takes
  // either one away.
  wildCardHolderId: string | null;
  /** The player whose turn it is may play their Wild Card right now: only as the very next move
   *  after a correct consonant on a spin, and never in the Speed-Up. */
  wildCardUsable: boolean;
  /** The consonant being called is the Wild Card's extra letter. */
  wildCardInPlay: boolean;
  millionWedgeHolderId: string | null;
  /** False while the holder still has to solve the round they picked it up in; true once banked. */
  millionWedgeSecured: boolean;
  // Triple Toss-Up: players who've used their one attempt on the puzzle currently on screen.
  // (Fortune Frenzy has no lockouts - a single ring-in settles each puzzle.)
  puzzleLockedOutPlayerIds: string[];
  // Every timed window below comes as a *StartedAt/*DeadlineAt (or *EndsAt) pair, so the timer bar
  // can show how much of it is left rather than only when it ends.
  //
  // Normal round: the 30s letter-box solve window, opened only by an explicit declare action.
  solvingPlayerId: string | null;
  solveStartedAt: string | null;
  solveDeadlineAt: string | null;
  // Fortune Frenzy (pre-round-1, season 44+): 30 seconds of rapid-fire $1,000 toss-ups, all from one
  // category. The clock runs while a puzzle is on the board and stops while a finished one's
  // solution is shown (FRENZY_PUZZLE_OVER). frenzyStartedAt/frenzyDeadlineAt are only set while it
  // runs; frenzyStartedAt is the deadline minus the full 30 seconds.
  frenzyStartedAt: string | null;
  frenzyDeadlineAt: string | null;
  /** True once the clock has run out. A contestant who rang in before then still gets to answer;
   *  after that the Frenzy is over and Continue begins Round 1. */
  frenzyTimeUp: boolean;
  /** What's left on the clock as of this snapshot - while it's stopped, the frozen value to show. */
  frenzyRemainingMs: number | null;
  frenzyWindowMs: number | null;
  /** 1-based count of Frenzy puzzles brought up so far. */
  frenzyPuzzleNumber: number | null;
  /** FRENZY_PUZZLE_OVER only: how the puzzle on screen ended, and who rang in on it (if anyone). */
  frenzyOutcome: FrenzyOutcome | null;
  frenzyOutcomePlayerId: string | null;
  /** Who'd start Round 1 if the Frenzy ended now: the last correct answer, else the first player. */
  frenzyRoundOneStarterId: string | null;
  // Fortune Frenzy's buzz-in answer window: only one player may hold it at a time, and their answer
  // settles the puzzle.
  frenzySolvingPlayerId: string | null;
  frenzySolveStartedAt: string | null;
  frenzySolveDeadlineAt: string | null;
  // Triple Toss-Up (before round 4): three same-category puzzles worth $2,000 each.
  tripleTossUpCategory: string | null;
  tripleTossUpIndex: number | null;
  tripleTossUpSolverIds: (string | null)[] | null;
  // Triple Toss-Up's own 30s buzz-in solve window, same rule as Frenzy's.
  tripleTossUpSolvingPlayerId: string | null;
  tripleTossUpSolveStartedAt: string | null;
  tripleTossUpSolveDeadlineAt: string | null;
  // The overall game clock - once it runs out, the next "waiting for a turn" moment (Round 4 or
  // later) goes to the Final Spin instead of another normal round.
  gameClockStartedAt: string;
  gameClockEndsAt: string;
  // Final round speed-up
  speedupLetterValue: number | null;
  speedupSolvingPlayerId: string | null;
  // Bonus round
  bonusWinnerPlayerId: string | null;
  bonusCategoryOptions: string[] | null;
  bonusCategory: string | null;
  bonusPuzzleTemplate: string | null;
  /** 3, or 4 when the bonus contestant brought the Wild Card. Null before the Bonus Round. */
  bonusConsonantCount: number | null;
  /** The bonus contestant brought a banked Million Dollar Wedge: the $100,000 envelope on the Bonus
   *  Wheel is now $1,000,000. */
  bonusMillionInPlay: boolean;
  bonusPrizeAmount: number | null;
  bonusSolved: boolean | null;
}
