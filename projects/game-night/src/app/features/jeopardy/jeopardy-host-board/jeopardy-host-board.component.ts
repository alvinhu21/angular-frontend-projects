import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IdentityStorageService } from '../../../core/identity-storage.service';
import { LiveSessionService } from '../../../core/live-session.service';
import { GameOverPanelComponent } from '../../shared/game-over-panel/game-over-panel.component';
import { GameTimerComponent } from '../../shared/game-timer/game-timer.component';
import { BoardGridComponent } from '../board-grid/board-grid.component';
import { JeopardyPodiumsComponent } from '../podiums/jeopardy-podiums.component';
import { GameSoundControl } from '../../shared/audio/game-synth';
import { SoundToggleComponent } from '../../shared/sound-toggle/sound-toggle.component';
import { JeopardyAudioService } from '../audio/jeopardy-audio.service';
import {
  ClueRevealDisplay,
  TranslatableText,
  boardCategories,
  boardRowOf,
  clueBanner,
  clueReveal,
  isCluePhase,
  isFinalPhase,
  phaseTimerLabel,
  roundTitle,
  tiebreakerContestants,
} from '../jeopardy-display';
import { TiebreakerMatchupComponent } from '../tiebreaker-matchup/tiebreaker-matchup.component';

/** How long the round title card holds before revealing the board. */
const ROUND_CARD_MS = 1800;

type HostScreen = 'board' | 'final' | 'over';

@Component({
  selector: 'app-jeopardy-host-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GameOverPanelComponent,
    GameTimerComponent,
    BoardGridComponent,
    JeopardyPodiumsComponent,
    RouterLink,
    SoundToggleComponent,
    TiebreakerMatchupComponent,
    TranslateModule,
  ],
  providers: [JeopardyAudioService, { provide: GameSoundControl, useExisting: JeopardyAudioService }],
  templateUrl: './jeopardy-host-board.component.html',
  styleUrl: './jeopardy-host-board.component.scss',
})
export class JeopardyHostBoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly identityStorage = inject(IdentityStorageService);
  private readonly audio = inject(JeopardyAudioService);
  readonly liveSession = inject(LiveSessionService);

  readonly code = this.route.snapshot.paramMap.get('code') ?? '';

  readonly screen = computed<HostScreen>(() => {
    const phase = this.liveSession.jeopardyState()?.phase;
    if (phase === 'GAME_OVER') {
      return 'over';
    }
    return phase && isFinalPhase(phase) ? 'final' : 'board';
  });

  readonly roundTitle = computed<TranslatableText | null>(() => {
    const state = this.liveSession.jeopardyState();
    return state ? roundTitle(state) : null;
  });

  /** The buzz-in clue on screen, if any - a tiebreaker's included; Final Jeopardy has its own screen. */
  readonly activeClue = computed(() => {
    const state = this.liveSession.jeopardyState();
    return state && isCluePhase(state.phase) ? state.activeCell : null;
  });

  /** A tiebreaker plays in the clue panel over the (spent) last board, which it covers completely. */
  readonly isTiebreaker = computed(() => this.liveSession.jeopardyState()?.phase === 'TIEBREAKER');
  readonly tiebreakerContestants = computed(() => {
    const state = this.liveSession.jeopardyState();
    return state ? tiebreakerContestants(state) : [];
  });

  readonly clueBanner = computed<TranslatableText | null>(() => {
    const state = this.liveSession.jeopardyState();
    const active = this.activeClue();
    return state && active ? clueBanner(state, active) : null;
  });

  /** The clue screen grows out of the tile that was picked, like a broadcast zoom. */
  readonly clueOrigin = computed(() => {
    const state = this.liveSession.jeopardyState();
    const active = state?.activeCell;
    if (!state || !active) {
      return '50% 50%';
    }
    const categories = boardCategories(state.board);
    const column = categories.indexOf(active.category);
    const row = boardRowOf(active.cellId);
    if (column < 0 || Number.isNaN(row)) {
      return '50% 50%';
    }
    const x = ((column + 0.5) / categories.length) * 100;
    const y = ((row + 1.5) / 6) * 100; // one header row plus five clue rows
    return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
  });

  readonly phaseTimerLabel = computed(() => {
    const state = this.liveSession.jeopardyState();
    return state ? phaseTimerLabel(state) : null;
  });

  /** The correct response, while a clue nobody got is still up. */
  readonly reveal = computed<ClueRevealDisplay | null>(() => {
    const state = this.liveSession.jeopardyState();
    return state ? clueReveal(state) : null;
  });

  /** How many contestants are actually playing Final Jeopardy - the rest failed to qualify. */
  readonly finalPlayerCount = computed(() => {
    const state = this.liveSession.jeopardyState();
    return state?.finalEligiblePlayerIds?.length ?? state?.players.length ?? 0;
  });

  /** Title card shown briefly whenever a new round (or Final Jeopardy) begins. */
  readonly roundCard = signal<TranslatableText | null>(null);
  private roundCardTimer: ReturnType<typeof setTimeout> | undefined;
  private shownRoundKey: string | null = null;

  constructor() {
    effect(() => {
      const title = this.roundTitle();
      if (!title || this.screen() === 'over') {
        return;
      }
      // Params included, so each new round - or tiebreaker - gets its card.
      const roundKey = title.key + JSON.stringify(title.params ?? {});
      if (roundKey !== this.shownRoundKey) {
        this.shownRoundKey = roundKey;
        this.showRoundCard(title);
      }
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.roundCardTimer));
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

  playerName(playerId: string | null): string {
    if (!playerId) {
      return '';
    }
    return this.liveSession.players().find((p) => p.playerId === playerId)?.displayName ?? '';
  }

  private showRoundCard(title: TranslatableText): void {
    this.roundCard.set(title);
    clearTimeout(this.roundCardTimer);
    this.roundCardTimer = setTimeout(() => this.roundCard.set(null), ROUND_CARD_MS);
  }
}
