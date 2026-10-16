/** The server's envelope for a paged collection. */
export interface PageResponse<T> {
  items: T[];
  /** Zero-based. */
  page: number;
  size: number;
  totalItems: number;
  /** Zero when there are no items at all. */
  totalPages: number;
}

/** One person's finish in one recorded Jeopardy game, with that game's details inlined. */
export interface PlayerResultView {
  resultId: number;
  displayName: string;
  finalScore: number;
  /** 1 is first; tied scores share a place. */
  place: number;
  tied: boolean;
  gameId: number;
  sessionCode: string;
  /** ISO-8601 instant. */
  completedAt: string;
  roundCount: number;
  /** Everyone in the game, AI opponents included - what place is "out of". */
  contestantCount: number;
}
