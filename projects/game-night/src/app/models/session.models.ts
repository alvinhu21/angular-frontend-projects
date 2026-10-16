export type GameType = 'WOF' | 'JEOPARDY';
export type SessionStatus = 'LOBBY' | 'IN_PROGRESS' | 'ENDED';
/** How strong the computer opponents are, chosen by the host when starting a game. */
export type AiDifficulty = 'BEGINNER'|'EASY' | 'MEDIUM' | 'HARD'|'EXPERT'|'MASTER';

/** Host-chosen settings sent when starting a game; each game type ignores the other's fields. */
export interface StartSessionOptions {
  gameDurationMinutes?: number;
  jeopardyRounds?: number;
  clueBaseIncrement?: number;
  aiDifficulty?: AiDifficulty;
  // Jeopardy only: false means contestants tied for the lead at the end play a tiebreaker.
  allowTies?: boolean;
}

export interface PlayerView {
  playerId: string;
  displayName: string;
  score: number;
  connected: boolean;
  host: boolean;
  ai: boolean;
}

export interface CreateSessionResponse {
  code: string;
  gameType: GameType;
  hostPlayerId: string;
  status: SessionStatus;
}

export interface JoinSessionResponse {
  playerId: string;
  code: string;
  gameType: GameType;
  players: PlayerView[];
}

/**
 * One place at the table besides the host's: an AI opponent, or a seat for a person that stays
 * open until someone joins (joiners take open seats first come, first served, under their own name).
 */
export interface SeatView {
  /** For a taken seat, the name of the person in it; may be blank for an open, unlabelled seat. */
  name: string;
  ai: boolean;
  /** Who plays the seat - null while a person's seat is open (and for an AI seat before the start). */
  playerId: string | null;
  connected: boolean;
}

/** One seat in the host's edit of the seat list. A taken seat is sent back with its playerId. */
export interface SeatRequest {
  name: string;
  ai: boolean;
  playerId: string | null;
}

export interface SessionSummaryResponse {
  code: string;
  gameType: GameType;
  status: SessionStatus;
  players: PlayerView[];
  seats: SeatView[];
}

export interface AnnounceMessage {
  type: 'ANNOUNCE';
  text: string;
}

export interface ErrorMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

/** Identity kept in browser storage so a refresh/reconnect doesn't lose the player's seat. */
export interface StoredIdentity {
  code: string;
  playerId: string;
  gameType: GameType;
  displayName: string;
  isHost: boolean;
}
