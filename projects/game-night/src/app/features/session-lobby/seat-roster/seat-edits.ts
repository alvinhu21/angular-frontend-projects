import { SeatRequest } from '../../../models/session.models';

/** How many players besides the host a game can have (the server enforces the same bounds). */
export const MIN_OTHER_SEATS = 0;
export const MAX_OTHER_SEATS = 5;

const openSeat = (): SeatRequest => ({ name: '', ai: false, playerId: null });

/** Everyone who has joined keeps a seat, so the count can't go below how many have joined. */
export function minimumSeatCount(seats: readonly SeatRequest[]): number {
  return Math.max(MIN_OTHER_SEATS, seats.filter((seat) => seat.playerId !== null).length);
}

/** Adds open seats at the end, or drops the last seats nobody has joined. */
export function withSeatCount(seats: readonly SeatRequest[], count: number): SeatRequest[] {
  const target = Math.min(MAX_OTHER_SEATS, Math.max(minimumSeatCount(seats), count));
  const next = seats.map((seat) => ({ ...seat }));
  while (next.length < target) {
    next.push(openSeat());
  }
  for (let i = next.length - 1; i >= 0 && next.length > target; i--) {
    if (next[i].playerId === null) {
      next.splice(i, 1);
    }
  }
  return next;
}

/** A seat someone has joined is theirs, so it can't become an AI. */
export function withAi(seats: readonly SeatRequest[], index: number, ai: boolean): SeatRequest[] {
  return seats.map((seat, i) => (i === index && seat.playerId === null ? { ...seat, ai } : { ...seat }));
}
