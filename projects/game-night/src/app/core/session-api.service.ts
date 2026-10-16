import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateSessionResponse,
  GameType,
  JoinSessionResponse,
  SeatRequest,
  SeatView,
  SessionSummaryResponse,
  StartSessionOptions,
} from '../models/session.models';
import { RuntimeConfigService } from './runtime-config.service';

@Injectable({ providedIn: 'root' })
export class SessionApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfigService);

  private get baseUrl(): string {
    return `${this.runtimeConfig.apiBaseUrl}/live/sessions`;
  }

  createSession(gameType: GameType, hostDisplayName: string): Observable<CreateSessionResponse> {
    return this.http.post<CreateSessionResponse>(this.baseUrl, { gameType, hostDisplayName });
  }

  joinSession(code: string, displayName: string): Observable<JoinSessionResponse> {
    return this.http.post<JoinSessionResponse>(`${this.baseUrl}/${code}/players`, { displayName });
  }

  getSession(code: string): Observable<SessionSummaryResponse> {
    return this.http.get<SessionSummaryResponse>(`${this.baseUrl}/${code}`);
  }

  /** Replaces the seat list (host only); everyone in the lobby gets the result over the socket. */
  updateSeats(code: string, hostPlayerId: string, seats: SeatRequest[]): Observable<SeatView[]> {
    return this.http.put<SeatView[]>(`${this.baseUrl}/${code}/seats`, { hostPlayerId, seats });
  }

  startSession(code: string, hostPlayerId: string, options: StartSessionOptions = {}): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${code}/start`, { hostPlayerId, ...options });
  }

  getState<T>(code: string, playerId: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${code}/state`, { params: { playerId } });
  }
}
