import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IdentityStorageService } from '../../../core/identity-storage.service';
import { LiveSessionService } from '../../../core/live-session.service';
import { GameOverPanelComponent } from '../../shared/game-over-panel/game-over-panel.component';
import { GameTimerComponent } from '../../shared/game-timer/game-timer.component';
import { BoardGridComponent } from '../board-grid/board-grid.component';
import { JeopardyPodiumsComponent } from '../podiums/jeopardy-podiums.component';
import { ResponseChoicesComponent } from '../response-choices/response-choices.component';
import { GameSoundControl } from '../../shared/audio/game-synth';
import { SoundToggleComponent } from '../../shared/sound-toggle/sound-toggle.component';
import { JeopardyAudioService } from '../audio/jeopardy-audio.service';
import {
  ClueRevealDisplay,
  TranslatableText,
  clueBanner,
  clueReveal,
  isCluePhase,
  phaseTimerLabel,
  roundTitle,
  tiebreakerContestants,
} from '../jeopardy-display';
import { MoneyPipe } from '../money.pipe';
import { TiebreakerMatchupComponent } from '../tiebreaker-matchup/tiebreaker-matchup.component';

/**
 * A clue's response count when it needs more than one ("these 2 cities"), so its answer box can
 * say so and how to give them all in one go; null for the usual single response.
 */
function severalResponses(count: number | null | undefined): number | null {
  return count && count > 1 ? count : null;
}

@Component({
  selector: 'app-jeopardy-player-controller',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    GameOverPanelComponent,
    GameTimerComponent,
    BoardGridComponent,
    JeopardyPodiumsComponent,
    ResponseChoicesComponent,
    RouterLink,
    SoundToggleComponent,
    TiebreakerMatchupComponent,
    MoneyPipe,
    TranslateModule,
  ],
  providers: [JeopardyAudioService, { provide: GameSoundControl, useExisting: JeopardyAudioService }],
  templateUrl: './jeopardy-player-controller.component.html',
  styleUrl: './jeopardy-player-controller.component.scss',
})
export class JeopardyPlayerControllerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly identityStorage = inject(IdentityStorageService);
  private readonly audio = inject(JeopardyAudioService);
  readonly liveSession = inject(LiveSessionService);

  readonly code = this.route.snapshot.paramMap.get('code') ?? '';
  readonly myPlayerId = signal<string | null>(null);

  readonly answerForm = new FormGroup({
    value: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly dailyDoubleWagerForm = new FormGroup({
    wager: new FormControl(5, { nonNullable: true, validators: [Validators.required, Validators.min(5)] }),
  });
  readonly dailyDoubleAnswerForm = new FormGroup({
    value: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly finalWagerForm = new FormGroup({
    wager: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
  });
  readonly finalAnswerForm = new FormGroup({
    value: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly myScore = computed(
    () => this.liveSession.players().find((p) => p.playerId === this.myPlayerId())?.score ?? 0,
  );

  readonly maxDailyDoubleWager = computed(() => Math.max(5, this.myScore()));
  readonly maxFinalWager = computed(() => Math.max(0, this.myScore()));

  readonly isInControl = computed(() => this.liveSession.jeopardyState()?.playerIdInControl === this.myPlayerId());
  readonly canSelectClue = computed(() => this.isInControl() && this.phase() === 'BOARD');
  readonly phase = computed(() => this.liveSession.jeopardyState()?.phase ?? null);

  readonly roundTitle = computed<TranslatableText | null>(() => {
    const state = this.liveSession.jeopardyState();
    return state ? roundTitle(state) : null;
  });

  /** The regular clue on screen, if any - Final Jeopardy has its own sections. */
  readonly activeClue = computed(() => {
    const state = this.liveSession.jeopardyState();
    return state && isCluePhase(state.phase) ? state.activeCell : null;
  });

  private readonly activeClueId = computed(() => this.activeClue()?.cellId ?? null);

  /** How many responses the clue on screen needs, when that's more than one - null otherwise. */
  readonly multiResponseCount = computed(() => severalResponses(this.activeClue()?.requiredResponseCount));
  readonly finalMultiResponseCount = computed(() =>
    severalResponses(this.liveSession.jeopardyState()?.finalRequiredResponseCount),
  );

  readonly phaseTimerLabel = computed(() => {
    const state = this.liveSession.jeopardyState();
    return state ? phaseTimerLabel(state) : null;
  });

  /** The correct response, while a clue nobody got is still up. */
  readonly reveal = computed<ClueRevealDisplay | null>(() => {
    const state = this.liveSession.jeopardyState();
    return state ? clueReveal(state) : null;
  });

  /** Someone else won the buzz - shown so a locked-out player knows why their buzzer vanished. */
  readonly otherAnswererName = computed(() => {
    const state = this.liveSession.jeopardyState();
    const answererId = state?.activeAnswererId;
    if (!state || state.clueSubPhase !== 'ANSWERING' || !answererId || answererId === this.myPlayerId()) {
      return null;
    }
    return state.players.find((p) => p.playerId === answererId)?.displayName ?? null;
  });

  readonly isTiebreaker = computed(() => this.phase() === 'TIEBREAKER');
  readonly tiebreakerContestants = computed(() => {
    const state = this.liveSession.jeopardyState();
    return state ? tiebreakerContestants(state) : [];
  });
  /** I'm one of the contestants tied for the lead - the only ones who may ring in on a tiebreaker. */
  readonly inTiebreaker = computed(() => this.tiebreakerContestants().some((p) => p.playerId === this.myPlayerId()));

  readonly clueBanner = computed<TranslatableText | null>(() => {
    const state = this.liveSession.jeopardyState();
    const active = this.activeClue();
    return state && active ? clueBanner(state, active) : null;
  });

  readonly canBuzz = computed(() => {
    const state = this.liveSession.jeopardyState();
    const myId = this.myPlayerId();
    if (!state || !myId) {
      return false;
    }
    const mayRingIn = state.phase === 'CLUE_OPEN' || (state.phase === 'TIEBREAKER' && this.inTiebreaker());
    return mayRingIn && state.clueSubPhase === 'BUZZ_OPEN' && !state.lockedOutPlayerIds.includes(myId);
  });

  readonly isActiveAnswerer = computed(() => this.liveSession.jeopardyState()?.activeAnswererId === this.myPlayerId());
  readonly canSubmitAnswer = computed(
    () => this.isActiveAnswerer() && this.liveSession.jeopardyState()?.clueSubPhase === 'ANSWERING',
  );

  readonly isDailyDoubleWagerPhase = computed(() => this.phase() === 'DAILY_DOUBLE_WAGER');
  readonly isDailyDoubleAnswerPhase = computed(() => this.phase() === 'DAILY_DOUBLE_ANSWER');
  readonly canSubmitDailyDoubleWager = computed(() => this.isActiveAnswerer() && this.isDailyDoubleWagerPhase());
  readonly canSubmitDailyDoubleAnswer = computed(
    () => this.isActiveAnswerer() && this.isDailyDoubleAnswerPhase() && !!this.liveSession.jeopardyState()?.activeCell?.clueText,
  );

  readonly inFinalWager = computed(() => this.phase() === 'FINAL_WAGER');
  readonly inFinalAnswerCollection = computed(() => this.phase() === 'FINAL_ANSWER_COLLECTION');
  /** Only players who finished the last regular round in the black play Final Jeopardy. */
  readonly isFinalEligible = computed(() => {
    const eligible = this.liveSession.jeopardyState()?.finalEligiblePlayerIds;
    return eligible === null || eligible === undefined || eligible.includes(this.myPlayerId() ?? '');
  });
  readonly myFinalWagerSubmitted = computed(
    () => this.liveSession.jeopardyState()?.finalWagerSubmittedPlayerIds?.includes(this.myPlayerId() ?? '') ?? false,
  );
  readonly myFinalAnswerSubmitted = computed(
    () => this.liveSession.jeopardyState()?.finalAnswerSubmittedPlayerIds?.includes(this.myPlayerId() ?? '') ?? false,
  );

  constructor() {
    // Every clue starts with a blank response. Otherwise an answer typed - or an option picked and
    // then left unsent - on one clue could be submitted against the next, where a picked option
    // wouldn't even be visible if this clue doesn't offer it.
    effect(() => {
      this.activeClueId();
      this.answerForm.reset({ value: '' });
      this.dailyDoubleAnswerForm.reset({ value: '' });
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

  selectClue(cellId: string): void {
    if (!this.canSelectClue()) {
      return;
    }
    this.liveSession.sendJeopardyAction('selectClue', { cellId });
  }

  buzz(): void {
    if (!this.canBuzz()) {
      return;
    }
    this.liveSession.sendJeopardyAction('buzz');
  }

  submitAnswer(): void {
    if (!this.canSubmitAnswer() || this.answerForm.invalid) {
      return;
    }
    this.liveSession.sendJeopardyAction('answer', { value: this.answerForm.controls.value.value });
    this.answerForm.reset({ value: '' });
  }

  submitDailyDoubleWager(): void {
    if (!this.canSubmitDailyDoubleWager() || this.dailyDoubleWagerForm.invalid) {
      return;
    }
    this.liveSession.sendJeopardyAction('dailyDoubleWager', { wager: this.dailyDoubleWagerForm.controls.wager.value });
  }

  submitDailyDoubleAnswer(): void {
    if (!this.canSubmitDailyDoubleAnswer() || this.dailyDoubleAnswerForm.invalid) {
      return;
    }
    this.liveSession.sendJeopardyAction('dailyDoubleAnswer', { value: this.dailyDoubleAnswerForm.controls.value.value });
    this.dailyDoubleAnswerForm.reset({ value: '' });
  }

  submitFinalWager(): void {
    if (!this.inFinalWager() || this.myFinalWagerSubmitted() || this.finalWagerForm.invalid) {
      return;
    }
    this.liveSession.sendJeopardyAction('finalWager', { wager: this.finalWagerForm.controls.wager.value });
  }

  submitFinalAnswer(): void {
    if (!this.inFinalAnswerCollection() || this.myFinalAnswerSubmitted() || this.finalAnswerForm.invalid) {
      return;
    }
    this.liveSession.sendJeopardyAction('finalAnswer', { value: this.finalAnswerForm.controls.value.value });
    this.finalAnswerForm.reset({ value: '' });
  }
}
