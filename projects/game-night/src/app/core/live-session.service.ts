import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AnnouncerService } from 'shared-lib';
import { AnnounceMessage, ErrorMessage, GameType, PlayerView, SeatView } from '../models/session.models';
import { WofStateSnapshot } from '../models/wof.models';
import { JeopardyStateSnapshot } from '../models/jeopardy.models';
import { SessionApiService } from './session-api.service';
import { WebSocketService } from './websocket.service';

type AnyStateSnapshot = WofStateSnapshot | JeopardyStateSnapshot;

/**
 * Single signals-based store for the live session this browser tab is part of. Components read
 * these signals directly in their templates rather than holding their own copies of game state.
 */
@Injectable({ providedIn: 'root' })
export class LiveSessionService {
  private readonly ws = inject(WebSocketService);
  private readonly api = inject(SessionApiService);
  private readonly announcer = inject(AnnouncerService);

  readonly code = signal<string | null>(null);
  readonly playerId = signal<string | null>(null);
  readonly gameType = signal<GameType | null>(null);
  readonly players = signal<PlayerView[]>([]);
  /** The lobby's seats besides the host's, as the host has set them up. */
  readonly seats = signal<SeatView[]>([]);
  readonly wofState = signal<WofStateSnapshot | null>(null);
  readonly jeopardyState = signal<JeopardyStateSnapshot | null>(null);
  readonly lastError = signal<ErrorMessage | null>(null);
  readonly connected = signal(false);

  readonly myPlayer = computed(() => this.players().find((p) => p.playerId === this.playerId()) ?? null);

  async connect(code: string, playerId: string, gameType: GameType): Promise<void> {
    if (this.connected() && this.code() === code && this.playerId() === playerId) {
      return; // Already connected for this session - navigating between views shouldn't reconnect.
    }
    this.code.set(code);
    this.playerId.set(playerId);
    this.gameType.set(gameType);
    this.connected.set(false);

    await this.ws.connect(code, playerId);
    this.connected.set(true);

    this.ws.onTopic<PlayerView[]>(`/topic/session/${code}/players`, (players) => this.players.set(players));
    this.ws.onTopic<SeatView[]>(`/topic/session/${code}/seats`, (seats) => this.seats.set(seats));

    this.ws.onTopic<AnyStateSnapshot>(`/topic/session/${code}/state`, (state) => this.applyState(state));

    this.ws.onTopic<AnnounceMessage>(`/topic/session/${code}/announce`, (msg) => {
      this.announcer.announce(msg.text, 'polite');
    });

    this.ws.onTopic<ErrorMessage>('/user/queue/live/errors', (err) => {
      this.lastError.set(err);
      this.announcer.announce(err.message, 'assertive');
    });

    this.ws.onTopic<AnyStateSnapshot | { type: string }>('/user/queue/live/private', (msg) => {
      if (msg.type === 'WOF_STATE' || msg.type === 'JEOPARDY_STATE') {
        this.applyState(msg as AnyStateSnapshot);
      }
    });

    await this.rehydrate();
  }

  /** Re-fetches this player's own snapshot - used on connect and can be called again after a reconnect. */
  async rehydrate(): Promise<void> {
    const code = this.code();
    const playerId = this.playerId();
    if (!code || !playerId) {
      return;
    }
    const seed = await firstValueFrom(
      this.api.getState<AnyStateSnapshot | { players?: PlayerView[]; seats?: SeatView[] }>(code, playerId),
    );
    if (seed && 'type' in seed && (seed.type === 'WOF_STATE' || seed.type === 'JEOPARDY_STATE')) {
      this.applyState(seed as AnyStateSnapshot);
    } else if (seed && 'players' in seed && seed.players) {
      this.players.set(seed.players);
      this.seats.set(seed.seats ?? []);
    }
  }

  disconnect(): void {
    this.ws.disconnect();
    this.connected.set(false);
  }

  sendWofAction(action: string, body: unknown = {}): void {
    const code = this.code();
    if (!code) {
      return;
    }
    this.ws.send(`/app/session/${code}/wof/${action}`, body);
  }

  sendJeopardyAction(action: string, body: unknown = {}): void {
    const code = this.code();
    if (!code) {
      return;
    }
    this.ws.send(`/app/session/${code}/jeopardy/${action}`, body);
  }

  private applyState(state: AnyStateSnapshot): void {
    if (state.type === 'WOF_STATE') {
      this.wofState.set(state);
    } else {
      this.jeopardyState.set(state);
    }
    this.players.set(state.players);
  }
}
