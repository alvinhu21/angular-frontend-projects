import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IdentityStorageService } from '../../../core/identity-storage.service';
import { LiveSessionService } from '../../../core/live-session.service';
import { WofPhase } from '../../../models/wof.models';
import { ScoreboardComponent } from '../../shared/scoreboard/scoreboard.component';
import { GameOverPanelComponent } from '../../shared/game-over-panel/game-over-panel.component';
import { GameSoundControl } from '../../shared/audio/game-synth';
import { SoundToggleComponent } from '../../shared/sound-toggle/sound-toggle.component';
import { PuzzleBoardComponent, PuzzleBoardFlash } from '../puzzle-board/puzzle-board.component';
import { WofWheelComponent } from '../wheel/wof-wheel.component';
import { WofAudioService } from '../audio/wof-audio.service';
import { GameTimerComponent, LocalTimerWindow, startLocalTimerWindow } from '../../shared/game-timer/game-timer.component';
import { FrenzyClockComponent } from '../frenzy-clock/frenzy-clock.component';
import { createFrenzyCountdown } from '../frenzy-clock/frenzy-countdown';

const SPEEDUP_SOLVE_WINDOW_MS = 30_000;
const BONUS_SOLVE_WINDOW_MS = 30_000;

@Component({
  selector: 'app-wof-host-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ScoreboardComponent,
    GameOverPanelComponent,
    PuzzleBoardComponent,
    WofWheelComponent,
    SoundToggleComponent,
    GameTimerComponent,
    FrenzyClockComponent,
    DecimalPipe,
    TranslateModule,
  ],
  providers: [WofAudioService, { provide: GameSoundControl, useExisting: WofAudioService }],
  templateUrl: './wof-host-board.component.html',
  styleUrl: './wof-host-board.component.scss',
})
export class WofHostBoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly identityStorage = inject(IdentityStorageService);
  private readonly audio = inject(WofAudioService);
  readonly liveSession = inject(LiveSessionService);

  readonly code = this.route.snapshot.paramMap.get('code') ?? '';

  readonly speedupSolveWindow = signal<LocalTimerWindow | null>(null);
  readonly bonusSolveWindow = signal<LocalTimerWindow | null>(null);

  readonly phase = computed<WofPhase | null>(() => this.liveSession.wofState()?.phase ?? null);
  readonly isNormalRoundPhase = computed(() =>
    ['WAITING_FOR_TURN_ACTION', 'AWAITING_LETTER_GUESS', 'AWAITING_SOLVE', 'ROUND_OVER'].includes(this.phase() ?? ''),
  );
  readonly isFrenzy = computed(() => this.phase() === 'FORTUNE_FRENZY');
  /** A Frenzy puzzle just ended - its solution is up, the frame flashing, and the clock stopped.
   *  Mid-Frenzy the next puzzle comes up on its own; once time's up a player clicks Continue on
   *  their own controller. */
  readonly isFrenzyPuzzleOver = computed(() => this.phase() === 'FRENZY_PUZZLE_OVER');
  readonly isFrenzyOver = computed(() => this.isFrenzyPuzzleOver() && (this.liveSession.wofState()?.frenzyTimeUp ?? false));
  readonly frenzyCountdown = createFrenzyCountdown(this.liveSession.wofState);
  readonly frenzyFlash = computed<PuzzleBoardFlash | null>(() => {
    const state = this.liveSession.wofState();
    if (state?.phase !== 'FRENZY_PUZZLE_OVER' || !state.frenzyOutcome) {
      return null;
    }
    return state.frenzyOutcome === 'SOLVED' ? 'correct' : 'wrong';
  });
  readonly frenzyOutcomeName = computed(() => this.playerName(this.liveSession.wofState()?.frenzyOutcomePlayerId));
  readonly frenzyStarterName = computed(() => this.playerName(this.liveSession.wofState()?.frenzyRoundOneStarterId));
  readonly isTripleTossUp = computed(() => this.phase() === 'TRIPLE_TOSS_UP');
  readonly tripleTossUpPuzzleNumber = computed(() => (this.liveSession.wofState()?.tripleTossUpIndex ?? 0) + 1);

  readonly solvingPlayerName = computed(() => this.playerName(this.liveSession.wofState()?.solvingPlayerId));
  readonly frenzySolverName = computed(() => this.playerName(this.liveSession.wofState()?.frenzySolvingPlayerId));
  readonly tripleTossUpSolverName = computed(() =>
    this.playerName(this.liveSession.wofState()?.tripleTossUpSolvingPlayerId),
  );
  readonly isFinalSpin = computed(() => this.phase() === 'FINAL_SPIN');
  /** Round 4 onward is open-ended (no fixed totalRounds) - show the game clock counting down to
   *  the Final Spin only then, since rounds 1-3 always play out regardless of it. */
  readonly showGameClock = computed(() => this.isNormalRoundPhase() && this.liveSession.wofState()?.totalRounds == null);
  readonly isSpeedupRound = computed(() => this.phase() === 'SPEEDUP_AWAITING_LETTER' || this.phase() === 'SPEEDUP_AWAITING_SOLVE');
  readonly isBonusRound = computed(() =>
    ['BONUS_PICK_CATEGORY', 'BONUS_PICK_LETTERS', 'BONUS_SOLVE'].includes(this.phase() ?? ''),
  );
  /** Also true once the game ends via a bonus round, so the final screen keeps showing the bonus
   *  puzzle/category instead of snapping back to the stale round-3 board underneath it. */
  readonly showsBonusPuzzle = computed(
    () => this.isBonusRound() || (this.phase() === 'GAME_OVER' && this.liveSession.wofState()?.bonusSolved != null),
  );

  private playerName(playerId: string | null | undefined): string | null {
    if (!playerId) {
      return null;
    }
    return this.liveSession.players().find((p) => p.playerId === playerId)?.displayName ?? null;
  }

  readonly currentPlayerName = computed(() => {
    const currentId = this.liveSession.wofState()?.currentPlayerId;
    return this.liveSession.players().find((p) => p.playerId === currentId)?.displayName ?? '';
  });
  /** The bonus contestant brought the Wild Card: a fourth consonant. */
  readonly bonusHasWildCard = computed(() => (this.liveSession.wofState()?.bonusConsonantCount ?? 0) > 3);
  readonly bonusWinnerName = computed(() => {
    const winnerId = this.liveSession.wofState()?.bonusWinnerPlayerId;
    return this.liveSession.players().find((p) => p.playerId === winnerId)?.displayName ?? 'The winner';
  });
  readonly puzzleLockedOutNames = computed(() => {
    const lockedOut = new Set(this.liveSession.wofState()?.puzzleLockedOutPlayerIds ?? []);
    return this.liveSession.players().filter((p) => lockedOut.has(p.playerId)).map((p) => p.displayName);
  });

  /** Who the scoreboard's "TURN" badge should point at - nobody during the free-for-all Fortune
   *  Frenzy or Triple Toss-Up, the bonus contestant during the bonus round (currentPlayerId is
   *  stale then), otherwise whoever's turn it actually is. */
  readonly scoreboardHighlightPlayerId = computed(() => {
    const state = this.liveSession.wofState();
    if (!state) {
      return null;
    }
    if (this.isFrenzy() || this.isFrenzyPuzzleOver() || this.isTripleTossUp()) {
      return null;
    }
    if (this.showsBonusPuzzle()) {
      return state.bonusWinnerPlayerId;
    }
    return state.currentPlayerId;
  });

  constructor() {
    let lastPhase: WofPhase | null = null;
    effect(() => {
      const phase = this.phase();
      if (phase === lastPhase) {
        return;
      }
      lastPhase = phase;
      // The two solve windows the server enforces but doesn't publish, timed from when this
      // client sees them open.
      this.speedupSolveWindow.set(phase === 'SPEEDUP_AWAITING_SOLVE' ? startLocalTimerWindow(SPEEDUP_SOLVE_WINDOW_MS) : null);
      this.bonusSolveWindow.set(phase === 'BONUS_SOLVE' ? startLocalTimerWindow(BONUS_SOLVE_WINDOW_MS) : null);
    });
  }

  ngOnInit(): void {
    const identity = this.identityStorage.load();
    if (!identity || identity.code !== this.code) {
      this.router.navigate(['/']);
      return;
    }
    this.audio.configure('host');
    this.liveSession.connect(this.code, identity.playerId, identity.gameType);
  }
}
