import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AiDifficulty, SeatRequest } from '../../models/session.models';
import { SessionApiService } from '../../core/session-api.service';
import { IdentityStorageService } from '../../core/identity-storage.service';
import { LiveSessionService } from '../../core/live-session.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { SeatRosterComponent } from './seat-roster/seat-roster.component';

@Component({
  selector: 'app-session-lobby',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, ScoreboardComponent, SeatRosterComponent, TranslateModule],
  templateUrl: './session-lobby.component.html',
  styleUrl: './session-lobby.component.scss',
})
export class SessionLobbyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionApi = inject(SessionApiService);
  private readonly identityStorage = inject(IdentityStorageService);
  readonly liveSession = inject(LiveSessionService);

  readonly code = this.route.snapshot.paramMap.get('code') ?? '';
  readonly isHost = signal(false);
  readonly starting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly gameStarted = computed(() => this.liveSession.wofState() !== null || this.liveSession.jeopardyState() !== null);
  readonly hostName = computed(() => this.liveSession.players().find((player) => player.host)?.displayName ?? '');
  /** Seats for people that nobody has joined yet - the game can't start until there are none. */
  readonly openSeatCount = computed(() => this.liveSession.seats().filter((seat) => !seat.ai && !seat.playerId).length);
  readonly canStart = computed(() => this.isHost() && !this.starting() && this.openSeatCount() === 0);
  readonly isWof = computed(() => this.liveSession.gameType() === 'WOF');
  readonly gameDurationMinutes = signal(20);

  // Jeopardy setup: how many regular rounds (Final Jeopardy is on top of these), and the dollar
  // step between rows in round 1 - round N uses this x N, so the board scales the way Double and
  // Triple Jeopardy do on the show.
  readonly jeopardyRounds = signal(2);
  readonly clueBaseIncrement = signal(100);
  // On by default, as every game played before the option existed. Off, contestants tied for the
  // lead at the end play tiebreaker clues until one of them gets one right.
  readonly allowTies = signal(true);
  readonly aiDifficulty = signal<AiDifficulty>('MEDIUM');

  readonly roundOptions = [2, 3, 4];
  readonly incrementOptions = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 300, 400, 500, 1000];
  readonly difficultyOptions: AiDifficulty[] = ['BEGINNER','EASY', 'MEDIUM', 'HARD','EXPERT','MASTER'];

  /** The per-round row values the current picks produce, previewed under the increment selector. */
  readonly roundValuePreview = computed(() =>
    Array.from({ length: this.jeopardyRounds() }, (_, i) => {
      const round = i + 1;
      const step = this.clueBaseIncrement() * round;
      return { round, lowest: step, highest: step * 5 };
    }),
  );

  ngOnInit(): void {
    const identity = this.identityStorage.load();
    if (!identity || identity.code !== this.code) {
      this.router.navigate(['/']);
      return;
    }
    this.isHost.set(identity.isHost);
    this.liveSession.connect(this.code, identity.playerId, identity.gameType);
  }

  startGame(): void {
    const identity = this.identityStorage.load();
    if (!identity || this.starting()) {
      return;
    }
    this.starting.set(true);
    this.errorMessage.set(null);
    const options = this.isWof()
      ? { gameDurationMinutes: this.gameDurationMinutes(), aiDifficulty: this.aiDifficulty() }
      : {
          jeopardyRounds: this.jeopardyRounds(),
          clueBaseIncrement: this.clueBaseIncrement(),
          allowTies: this.allowTies(),
          aiDifficulty: this.aiDifficulty(),
        };
    this.sessionApi.startSession(this.code, identity.playerId, options).subscribe({
      error: (err: HttpErrorResponse) => {
        this.starting.set(false);
        this.errorMessage.set(err.error?.message ?? 'sessionLobby.errorGeneric');
      },
    });
  }

  /** The seat roster's edits. The saved list comes back over the socket (the broadcast every lobby
   *  screen gets) rather than from this response, so quick edits can't land out of order. */
  saveSeats(seats: SeatRequest[]): void {
    const identity = this.identityStorage.load();
    if (!identity?.isHost) {
      return;
    }
    this.errorMessage.set(null);
    this.sessionApi.updateSeats(this.code, identity.playerId, seats).subscribe({
      error: (err: HttpErrorResponse) => this.errorMessage.set(err.error?.message ?? 'sessionLobby.errorSeats'),
    });
  }

  boardRoute(): string[] {
    return ['/session', this.code, this.liveSession.gameType() === 'JEOPARDY' ? 'jeopardy' : 'wof', 'host'];
  }

  playRoute(): string[] {
    return ['/session', this.code, this.liveSession.gameType() === 'JEOPARDY' ? 'jeopardy' : 'wof', 'play'];
  }
}
