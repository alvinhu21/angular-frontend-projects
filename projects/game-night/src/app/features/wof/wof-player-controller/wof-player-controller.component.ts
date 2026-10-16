import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { formatNumber } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ModalComponent } from 'shared-lib';
import { IdentityStorageService } from '../../../core/identity-storage.service';
import { LiveSessionService } from '../../../core/live-session.service';
import { WofPhase, WofStateSnapshot } from '../../../models/wof.models';
import { ScoreboardComponent } from '../../shared/scoreboard/scoreboard.component';
import { GameOverPanelComponent } from '../../shared/game-over-panel/game-over-panel.component';
import { GameSoundControl } from '../../shared/audio/game-synth';
import { ModalFocusDirective } from '../../shared/modal-focus/modal-focus.directive';
import { SoundToggleComponent } from '../../shared/sound-toggle/sound-toggle.component';
import { PuzzleBoardComponent, PuzzleBoardFlash } from '../puzzle-board/puzzle-board.component';
import { WofWheelComponent } from '../wheel/wof-wheel.component';
import { WofAudioService } from '../audio/wof-audio.service';
import { GameTimerComponent, LocalTimerWindow, startLocalTimerWindow } from '../../shared/game-timer/game-timer.component';
import { LetterPickerComponent } from '../letter-picker/letter-picker.component';
import { FrenzyClockComponent } from '../frenzy-clock/frenzy-clock.component';
import { createFrenzyCountdown } from '../frenzy-clock/frenzy-countdown';
import { OwnTurnMessage, ownTurnMessage } from './own-turn-message';

const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
const VOWELS = 'AEIOU'.split('');
const VOWEL_COST = 250;
const RSTLNE = new Set('RSTLNE'.split(''));
/** Without the Wild Card - which adds a fourth. The snapshot says which applies. */
const BONUS_CONSONANTS_TO_PICK = 3;
const SPEEDUP_SOLVE_WINDOW_MS = 30_000;
const BONUS_SOLVE_WINDOW_MS = 30_000;

const NORMAL_ROUND_PHASES = new Set<WofPhase>([
  'WAITING_FOR_TURN_ACTION',
  'AWAITING_LETTER_GUESS',
  'AWAITING_SOLVE',
  'ROUND_OVER',
]);
const BONUS_PHASES = new Set<WofPhase>(['BONUS_PICK_CATEGORY', 'BONUS_PICK_LETTERS', 'BONUS_SOLVE']);

interface ModalText {
  key: string;
  params?: Record<string, string | number>;
}

/** The message modal's content: a headline plus supporting lines, toned for good or bad news. */
interface TurnModalMessage {
  tone: 'good' | 'bad' | 'info';
  title: ModalText;
  lines: ModalText[];
}

@Component({
  selector: 'app-wof-player-controller',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ScoreboardComponent,
    GameOverPanelComponent,
    PuzzleBoardComponent,
    WofWheelComponent,
    SoundToggleComponent,
    GameTimerComponent,
    TranslateModule,
    ModalComponent,
    ModalFocusDirective,
    LetterPickerComponent,
    FrenzyClockComponent,
  ],
  providers: [WofAudioService, { provide: GameSoundControl, useExisting: WofAudioService }],
  templateUrl: './wof-player-controller.component.html',
  styleUrl: './wof-player-controller.component.scss',
})
export class WofPlayerControllerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly identityStorage = inject(IdentityStorageService);
  private readonly audio = inject(WofAudioService);
  private readonly locale = inject(LOCALE_ID);
  readonly liveSession = inject(LiveSessionService);

  // Optional queries: the effects below can first run before the view exists.
  private readonly consonantModal = viewChild<ModalComponent>('consonantModal');
  private readonly vowelModal = viewChild<ModalComponent>('vowelModal');
  private readonly messageModal = viewChild<ModalComponent>('messageModal');
  /** Set once this player sends an answer, so a solve window that closes without one reads as
   *  "time's up" rather than "wrong". Cleared whenever a solve window closes. */
  private solveSubmitted = false;
  readonly turnMessage = signal<TurnModalMessage | null>(null);

  readonly code = this.route.snapshot.paramMap.get('code') ?? '';
  readonly myPlayerId = signal<string | null>(null);
  readonly consonants = CONSONANTS;
  readonly vowels = VOWELS;
  readonly vowelCost = VOWEL_COST;
  readonly bonusConsonantOptions = CONSONANTS.filter((c) => !RSTLNE.has(c));
  readonly frenzyCountdown = createFrenzyCountdown(this.liveSession.wofState);

  readonly speedupSolveForm = new FormGroup({
    guess: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly bonusSolveForm = new FormGroup({
    guess: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly selectedBonusConsonants = signal<Set<string>>(new Set());
  readonly selectedBonusVowel = signal<string | null>(null);
  readonly speedupSolveWindow = signal<LocalTimerWindow | null>(null);
  readonly bonusSolveWindow = signal<LocalTimerWindow | null>(null);

  readonly myScore = computed(() => this.liveSession.players().find((p) => p.playerId === this.myPlayerId())?.score ?? 0);
  /** Money won so far this round that hasn't been banked into the cumulative score yet - wiped to
   *  zero by a Bankrupt, but never touches myScore() until the round ends. */
  readonly myRoundScore = computed(() => this.liveSession.wofState()?.roundScores[this.myPlayerId() ?? ''] ?? 0);
  readonly myTotalFunds = computed(() => this.myScore() + this.myRoundScore());
  readonly phase = computed<WofPhase | null>(() => this.liveSession.wofState()?.phase ?? null);
  readonly currentPlayerName = computed(() => {
    const currentId = this.liveSession.wofState()?.currentPlayerId;
    return this.liveSession.players().find((p) => p.playerId === currentId)?.displayName ?? 'the next player';
  });
  readonly isMyTurn = computed(() => this.liveSession.wofState()?.currentPlayerId === this.myPlayerId());

  readonly isNormalRoundPhase = computed(() => NORMAL_ROUND_PHASES.has(this.phase() as WofPhase));
  /** Round 4 onward is open-ended (no fixed totalRounds) - show the game clock counting down to
   *  the Final Spin only then, since rounds 1-3 always play out regardless of it. */
  readonly showGameClock = computed(() => this.isNormalRoundPhase() && this.liveSession.wofState()?.totalRounds == null);
  /** The phase doesn't change while the wheel turns, but the server accepts no turn action until
   *  the result is in - mirror that so nothing looks clickable mid-spin. */
  readonly wheelInMotion = computed(() => this.liveSession.wofState()?.wheelSpin?.inMotion ?? false);
  readonly isMyActionTurn = computed(() => this.isMyTurn() && !this.wheelInMotion());
  readonly consonantsLeft = computed(() => this.liveSession.wofState()?.consonantsLeft ?? true);
  readonly vowelsLeft = computed(() => this.liveSession.wofState()?.vowelsLeft ?? true);
  readonly calledConsonants = computed(() => this.liveSession.wofState()?.guessedConsonants ?? []);
  readonly boughtVowels = computed(() => this.liveSession.wofState()?.guessedVowels ?? []);
  /** A spin always ends in a consonant call, so once only vowels remain nobody may spin. */
  readonly canSpin = computed(
    () => this.isMyActionTurn() && this.phase() === 'WAITING_FOR_TURN_ACTION' && this.consonantsLeft(),
  );
  /** Whether "Buy a vowel" is live. Not having $250 doesn't disable it - clicking it says why. */
  readonly canOpenVowelPicker = computed(
    () => this.isMyActionTurn() && this.phase() === 'WAITING_FOR_TURN_ACTION' && this.vowelsLeft(),
  );
  /** Matches the backend's totalFundsOf() check - a vowel can be paid for out of this round's
   *  not-yet-banked winnings, which also locks them in against a later Bankrupt. */
  readonly canBuyVowel = computed(() => this.canOpenVowelPicker() && this.myRoundScore() >= VOWEL_COST);
  /** Whether round winnings are currently tracked separately from the cumulative total and worth
   *  showing on their own (zeroed instantly by Bankrupt) - the round-scored gameplay phases. */
  readonly isRoundScoredPhase = computed(() => {
    const phase = this.phase();
    return (
      phase != null &&
      (NORMAL_ROUND_PHASES.has(phase) ||
        phase === 'FINAL_SPIN' ||
        phase === 'SPEEDUP_AWAITING_LETTER' ||
        phase === 'SPEEDUP_AWAITING_SOLVE')
    );
  });
  readonly canGuessLetter = computed(
    () => this.isMyTurn() && this.phase() === 'AWAITING_LETTER_GUESS' && this.consonantsLeft(),
  );
  /** What each consonant is worth right now: the value the wheel landed on. */
  readonly landedValue = computed(() => this.liveSession.wofState()?.lastSpinResult?.value ?? null);

  // Special wedges
  readonly iHoldWildCard = computed(() => this.liveSession.wofState()?.wildCardHolderId === this.myPlayerId());
  readonly iHoldMillionWedge = computed(() => this.liveSession.wofState()?.millionWedgeHolderId === this.myPlayerId());
  readonly millionWedgeSecured = computed(() => this.liveSession.wofState()?.millionWedgeSecured ?? false);
  /** Straight after a correct consonant on a spin - the server's own rule (see WofEngine.canPlayWildCard). */
  readonly canPlayWildCard = computed(
    () => this.isMyActionTurn() && this.iHoldWildCard() && (this.liveSession.wofState()?.wildCardUsable ?? false),
  );
  /** The consonant being called is the Wild Card's extra one. */
  readonly wildCardInPlay = computed(() => this.liveSession.wofState()?.wildCardInPlay ?? false);
  /** Whether it's currently possible to DECLARE a solve attempt (before any letter boxes appear) -
   *  distinct from actually being the one typing (see canSubmitSolve). */
  readonly canDeclareSolve = computed(
    () =>
      this.isMyActionTurn() && (this.phase() === 'WAITING_FOR_TURN_ACTION' || this.phase() === 'AWAITING_LETTER_GUESS'),
  );
  readonly isSolvingPlayer = computed(() => this.liveSession.wofState()?.solvingPlayerId === this.myPlayerId());
  readonly canSubmitSolve = computed(() => this.phase() === 'AWAITING_SOLVE' && this.isSolvingPlayer());
  /** Any connected player may click Continue once a round's outcome is on screen - matches the
   *  server's "first click wins" rule (see WofEngine.continueToNextRound). */
  readonly isRoundOver = computed(() => this.phase() === 'ROUND_OVER');

  // Fortune Frenzy (pre-round-1)
  readonly isFrenzy = computed(() => this.phase() === 'FORTUNE_FRENZY');
  /** A Frenzy puzzle just ended - its solution is up and the clock is stopped. Mid-Frenzy the next
   *  puzzle comes up on its own; once time's up, any player clicks Continue into Round 1. */
  readonly isFrenzyPuzzleOver = computed(() => this.phase() === 'FRENZY_PUZZLE_OVER');
  readonly isFrenzyOver = computed(() => this.isFrenzyPuzzleOver() && (this.liveSession.wofState()?.frenzyTimeUp ?? false));
  /** Triple Toss-Up only - in the Frenzy a single ring-in settles each puzzle. */
  readonly isLockedOutOfPuzzle = computed(() =>
    this.liveSession.wofState()?.puzzleLockedOutPlayerIds.includes(this.myPlayerId() ?? '') ?? false,
  );
  /** Buzz-in: nobody else may already be answering. */
  readonly canDeclareFrenzySolve = computed(() => this.isFrenzy() && !this.liveSession.wofState()?.frenzySolvingPlayerId);
  readonly isFrenzySolver = computed(() => this.liveSession.wofState()?.frenzySolvingPlayerId === this.myPlayerId());
  readonly canSubmitFrenzyAnswer = computed(() => this.isFrenzy() && this.isFrenzySolver());
  readonly frenzySolverName = computed(() => this.playerName(this.liveSession.wofState()?.frenzySolvingPlayerId));
  readonly frenzyOutcomeName = computed(() => this.playerName(this.liveSession.wofState()?.frenzyOutcomePlayerId));
  readonly frenzyStarterName = computed(() => this.playerName(this.liveSession.wofState()?.frenzyRoundOneStarterId));
  readonly frenzyFlash = computed<PuzzleBoardFlash | null>(() => {
    const state = this.liveSession.wofState();
    if (state?.phase !== 'FRENZY_PUZZLE_OVER' || !state.frenzyOutcome) {
      return null;
    }
    return state.frenzyOutcome === 'SOLVED' ? 'correct' : 'wrong';
  });

  // Triple Toss-Up (before round 4)
  readonly isTripleTossUp = computed(() => this.phase() === 'TRIPLE_TOSS_UP');
  readonly tripleTossUpPuzzleNumber = computed(() => (this.liveSession.wofState()?.tripleTossUpIndex ?? 0) + 1);
  readonly canDeclareTripleTossUpSolve = computed(
    () =>
      this.isTripleTossUp() && !this.isLockedOutOfPuzzle() && !this.liveSession.wofState()?.tripleTossUpSolvingPlayerId,
  );
  readonly isTripleTossUpSolver = computed(
    () => this.liveSession.wofState()?.tripleTossUpSolvingPlayerId === this.myPlayerId(),
  );
  readonly canSubmitTripleTossUpAnswer = computed(() => this.isTripleTossUp() && this.isTripleTossUpSolver());
  readonly tripleTossUpSolverName = computed(() => {
    const solverId = this.liveSession.wofState()?.tripleTossUpSolvingPlayerId;
    return solverId ? (this.liveSession.players().find((p) => p.playerId === solverId)?.displayName ?? null) : null;
  });

  // Final Spin (once the game clock runs out, from round 4 on)
  readonly isFinalSpin = computed(() => this.phase() === 'FINAL_SPIN');
  readonly canFinalSpin = computed(() => this.isMyActionTurn() && this.isFinalSpin());

  // Speed-up round
  readonly isSpeedupRound = computed(() => this.phase() === 'SPEEDUP_AWAITING_LETTER' || this.phase() === 'SPEEDUP_AWAITING_SOLVE');
  readonly speedupLetterValue = computed(() => this.liveSession.wofState()?.speedupLetterValue ?? 0);
  readonly canCallSpeedupLetter = computed(() => this.isMyTurn() && this.phase() === 'SPEEDUP_AWAITING_LETTER');
  readonly isSpeedupSolver = computed(() => this.liveSession.wofState()?.speedupSolvingPlayerId === this.myPlayerId());
  readonly canSpeedupSolve = computed(() => this.phase() === 'SPEEDUP_AWAITING_SOLVE' && this.isSpeedupSolver());

  // Bonus round
  readonly isBonusRound = computed(() => BONUS_PHASES.has(this.phase() as WofPhase));
  readonly isBonusWinner = computed(() => this.liveSession.wofState()?.bonusWinnerPlayerId === this.myPlayerId());
  readonly bonusWinnerName = computed(() => {
    const winnerId = this.liveSession.wofState()?.bonusWinnerPlayerId;
    return this.liveSession.players().find((p) => p.playerId === winnerId)?.displayName ?? 'The winner';
  });
  readonly canPickBonusCategory = computed(() => this.phase() === 'BONUS_PICK_CATEGORY' && this.isBonusWinner());
  readonly canPickBonusLetters = computed(() => this.phase() === 'BONUS_PICK_LETTERS' && this.isBonusWinner());
  /** Three, or four with the Wild Card. */
  readonly bonusConsonantsToPick = computed(
    () => this.liveSession.wofState()?.bonusConsonantCount ?? BONUS_CONSONANTS_TO_PICK,
  );
  readonly bonusHasWildCard = computed(() => this.bonusConsonantsToPick() > BONUS_CONSONANTS_TO_PICK);
  readonly canSubmitBonusLetters = computed(
    () =>
      this.canPickBonusLetters() &&
      this.selectedBonusConsonants().size === this.bonusConsonantsToPick() &&
      this.selectedBonusVowel() !== null,
  );
  readonly canBonusSolve = computed(() => this.phase() === 'BONUS_SOLVE' && this.isBonusWinner());

  /** Same "who does the TURN badge point at" logic as the host board - nobody during the
   *  free-for-all Fortune Frenzy or Triple Toss-Up, the bonus contestant during the bonus round,
   *  otherwise the real turn. */
  readonly scoreboardHighlightPlayerId = computed(() => {
    const state = this.liveSession.wofState();
    if (!state) {
      return null;
    }
    if (this.isFrenzy() || this.isFrenzyPuzzleOver() || this.isTripleTossUp()) {
      return null;
    }
    if (this.isBonusRound() || (state.phase === 'GAME_OVER' && state.bonusSolved !== null)) {
      return state.bonusWinnerPlayerId;
    }
    return state.currentPlayerId;
  });

  constructor() {
    // Times the two solve windows the server doesn't publish, and resets the bonus-letter picker
    // whenever the phase moves on - the server independently enforces the real windows via its
    // own scheduled timeouts regardless of what this client shows.
    let lastPhase: WofPhase | null = null;
    effect(() => {
      const phase = this.phase();
      if (phase === lastPhase) {
        return;
      }
      lastPhase = phase;
      this.speedupSolveWindow.set(phase === 'SPEEDUP_AWAITING_SOLVE' ? startLocalTimerWindow(SPEEDUP_SOLVE_WINDOW_MS) : null);
      this.bonusSolveWindow.set(phase === 'BONUS_SOLVE' ? startLocalTimerWindow(BONUS_SOLVE_WINDOW_MS) : null);
      if (phase !== 'BONUS_PICK_LETTERS') {
        this.selectedBonusConsonants.set(new Set());
        this.selectedBonusVowel.set(null);
      }
    });

    // Tells this player how their own letter call, vowel purchase or solve attempt went.
    let previous: WofStateSnapshot | null = null;
    effect(() => {
      const next = this.liveSession.wofState();
      const me = this.myPlayerId();
      if (!next) {
        return;
      }
      const message = me ? ownTurnMessage(previous, next, me, this.solveSubmitted) : null;
      if (previous?.phase === 'AWAITING_SOLVE' && next.phase !== 'AWAITING_SOLVE') {
        this.solveSubmitted = false;
      }
      previous = next;
      if (message) {
        untracked(() => this.showMessage(this.describe(message)));
      }
    });

    // The wheel landing on a value is the cue to call a consonant, so the picker opens itself; it
    // closes again the moment calling one stops being possible.
    effect(() => {
      const canCall = this.canGuessLetter();
      untracked(() => {
        if (canCall) {
          this.consonantModal()?.openModal();
        } else {
          this.consonantModal()?.closeModal();
        }
      });
    });
    effect(() => {
      if (!this.canOpenVowelPicker()) {
        untracked(() => this.vowelModal()?.closeModal());
      }
    });
  }

  ngOnInit(): void {
    const identity = this.identityStorage.load();
    if (!identity || identity.code !== this.code) {
      this.router.navigate(['/']);
      return;
    }
    this.myPlayerId.set(identity.playerId);
    this.audio.configure('player');
    this.liveSession.connect(this.code, identity.playerId, identity.gameType);
  }

  private playerName(playerId: string | null | undefined): string | null {
    if (!playerId) {
      return null;
    }
    return this.liveSession.players().find((p) => p.playerId === playerId)?.displayName ?? null;
  }

  isConsonantGuessed(letter: string): boolean {
    return this.liveSession.wofState()?.guessedConsonants.includes(letter) ?? false;
  }

  isVowelBought(letter: string): boolean {
    return this.liveSession.wofState()?.guessedVowels.includes(letter) ?? false;
  }

  spin(): void {
    if (!this.canSpin()) {
      return;
    }
    this.liveSession.sendWofAction('spin');
  }

  finalSpin(): void {
    if (!this.canFinalSpin()) {
      return;
    }
    this.liveSession.sendWofAction('finalSpin');
  }

  openConsonantPicker(): void {
    if (!this.canGuessLetter()) {
      return;
    }
    this.consonantModal()?.openModal();
  }

  guessLetter(letter: string): void {
    if (!this.canGuessLetter() || this.isConsonantGuessed(letter)) {
      return;
    }
    this.consonantModal()?.closeModal();
    this.liveSession.sendWofAction('guessLetter', { value: letter });
  }

  /** Opens the vowel picker - or, short of the $250 a vowel costs, says so instead. */
  openVowelPicker(): void {
    if (!this.canOpenVowelPicker()) {
      return;
    }
    if (!this.canBuyVowel()) {
      this.showMessage({
        tone: 'info',
        title: { key: 'wof.messageNeedVowelMoneyTitle' },
        lines: [
          {
            key: 'wof.messageNeedVowelMoney',
            params: { cost: this.money(VOWEL_COST), funds: this.money(this.myRoundScore()) },
          },
        ],
      });
      return;
    }
    this.vowelModal()?.openModal();
  }

  buyVowel(letter: string): void {
    if (!this.canBuyVowel() || this.isVowelBought(letter)) {
      return;
    }
    this.vowelModal()?.closeModal();
    this.liveSession.sendWofAction('buyVowel', { value: letter });
  }

  /** One more consonant at this spin's value - the consonant picker opens itself once it's on. */
  playWildCard(): void {
    if (!this.canPlayWildCard()) {
      return;
    }
    this.messageModal()?.closeModal();
    this.liveSession.sendWofAction('playWildCard');
  }

  declareSolve(): void {
    if (!this.canDeclareSolve()) {
      return;
    }
    this.liveSession.sendWofAction('beginSolve');
  }

  /** Sends the typed answer - only ever from the explicit confirm button, never on the last letter. */
  confirmSolve(guess: string): void {
    if (!this.canSubmitSolve()) {
      return;
    }
    this.solveSubmitted = true;
    this.liveSession.sendWofAction('solve', { value: guess });
  }

  closeMessage(): void {
    this.messageModal()?.closeModal();
  }

  money(amount: number): string {
    return formatNumber(amount, this.locale, '1.0-0');
  }

  private showMessage(message: TurnModalMessage): void {
    this.consonantModal()?.closeModal();
    this.vowelModal()?.closeModal();
    this.turnMessage.set(message);
    this.messageModal()?.openModal();
  }

  private describe(message: OwnTurnMessage): TurnModalMessage {
    const turnOver: ModalText = { key: 'wof.messageTurnOver' };
    switch (message.kind) {
      case 'letterFound': {
        const { letter, count, winnings, claimed, wildCardPlayable } = message;
        const title: ModalText =
          count === 1
            ? { key: 'wof.messageFoundOne', params: { letter } }
            : { key: 'wof.messageFoundMany', params: { letter, count } };
        const isVowel = VOWELS.includes(letter);
        const lines: ModalText[] = isVowel
          ? [{ key: 'wof.messageVowelPaid', params: { cost: this.money(VOWEL_COST) } }]
          : winnings
            ? [{ key: 'wof.messageWinnings', params: { amount: this.money(winnings) } }]
            : [];
        if (claimed === 'WILD_CARD') {
          lines.push({ key: 'wof.messageClaimedWildCard' });
        } else if (claimed === 'MILLION_WEDGE') {
          lines.push({ key: 'wof.messageClaimedMillionWedge' });
        }
        if (wildCardPlayable) {
          lines.push({ key: 'wof.messageWildCardPlayable', params: { amount: this.money(this.landedValue() ?? 0) } });
        }
        return { tone: 'good', title, lines };
      }
      case 'letterMissing':
        return { tone: 'bad', title: { key: 'wof.messageNoLetterTitle', params: { letter: message.letter } }, lines: [turnOver] };
      case 'solveCorrect':
        return { tone: 'good', title: { key: 'wof.messageSolveCorrectTitle' }, lines: [{ key: 'wof.messageSolveCorrect' }] };
      case 'solveWrong':
        return { tone: 'bad', title: { key: 'wof.messageSolveWrongTitle' }, lines: [turnOver] };
      case 'solveTimedOut':
        return { tone: 'bad', title: { key: 'wof.messageSolveTimedOutTitle' }, lines: [turnOver] };
    }
  }

  continueToNextRound(): void {
    if (!this.isRoundOver()) {
      return;
    }
    this.liveSession.sendWofAction('continueRound');
  }

  continueFrenzy(): void {
    if (!this.isFrenzyPuzzleOver()) {
      return;
    }
    this.liveSession.sendWofAction('continueFrenzy');
  }

  declareFrenzySolve(): void {
    if (!this.canDeclareFrenzySolve()) {
      return;
    }
    this.liveSession.sendWofAction('beginFrenzySolve');
  }

  /** Sends the typed answer - only ever from the Submit button, never on the last letter. */
  submitFrenzyGuess(guess: string): void {
    if (!this.canSubmitFrenzyAnswer()) {
      return;
    }
    this.liveSession.sendWofAction('frenzyAnswer', { value: guess });
  }

  declareTripleTossUpSolve(): void {
    if (!this.canDeclareTripleTossUpSolve()) {
      return;
    }
    this.liveSession.sendWofAction('beginTripleTossUpSolve');
  }

  /** Sends the typed answer - only ever from the Submit button, never on the last letter. */
  submitTripleTossUpGuess(guess: string): void {
    if (!this.canSubmitTripleTossUpAnswer()) {
      return;
    }
    this.liveSession.sendWofAction('tripleTossUpAnswer', { value: guess });
  }

  callSpeedupLetter(letter: string): void {
    if (!this.canCallSpeedupLetter() || this.isConsonantGuessed(letter) || this.isVowelBought(letter)) {
      return;
    }
    this.liveSession.sendWofAction('speedupGuessLetter', { value: letter });
  }

  submitSpeedupSolve(): void {
    if (!this.canSpeedupSolve() || this.speedupSolveForm.invalid) {
      return;
    }
    this.liveSession.sendWofAction('speedupSolve', { value: this.speedupSolveForm.controls.guess.value });
    this.speedupSolveForm.reset();
  }

  pickBonusCategory(category: string): void {
    if (!this.canPickBonusCategory()) {
      return;
    }
    this.liveSession.sendWofAction('bonusPickCategory', { category });
  }

  toggleBonusConsonant(letter: string): void {
    if (!this.canPickBonusLetters()) {
      return;
    }
    const next = new Set(this.selectedBonusConsonants());
    if (next.has(letter)) {
      next.delete(letter);
    } else if (next.size < this.bonusConsonantsToPick()) {
      next.add(letter);
    }
    this.selectedBonusConsonants.set(next);
  }

  selectBonusVowel(letter: string): void {
    if (!this.canPickBonusLetters()) {
      return;
    }
    this.selectedBonusVowel.set(this.selectedBonusVowel() === letter ? null : letter);
  }

  submitBonusLetters(): void {
    if (!this.canSubmitBonusLetters()) {
      return;
    }
    this.liveSession.sendWofAction('bonusSubmitLetters', {
      consonants: Array.from(this.selectedBonusConsonants()),
      vowel: this.selectedBonusVowel(),
    });
  }

  submitBonusSolve(): void {
    if (!this.canBonusSolve() || this.bonusSolveForm.invalid) {
      return;
    }
    this.liveSession.sendWofAction('bonusSolve', { value: this.bonusSolveForm.controls.guess.value });
    this.bonusSolveForm.reset();
  }
}
