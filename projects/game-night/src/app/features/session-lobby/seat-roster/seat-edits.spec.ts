import { SeatRequest } from '../../../models/session.models';
import { minimumSeatCount, withAi, withSeatCount } from './seat-edits';

const open = (name = ''): SeatRequest => ({ name, ai: false, playerId: null });
const ai = (name: string): SeatRequest => ({ name, ai: true, playerId: null });
const taken = (name: string, playerId: string): SeatRequest => ({ name, ai: false, playerId });

describe('seat edits', () => {
  it('adds open seats for people at the end', () => {
    expect(withSeatCount([ai('Watson')], 3)).toEqual([ai('Watson'), open(), open()]);
  });

  it('drops the last seats nobody has joined, keeping everyone who has', () => {
    const seats = [open('A'), taken('Sam', 'p2'), ai('Watson'), open('B')];

    expect(withSeatCount(seats, 2)).toEqual([open('A'), taken('Sam', 'p2')]);
    expect(withSeatCount(seats, 1)).toEqual([taken('Sam', 'p2')]);
  });

  it('never goes below one seat per joined player, or outside 1-5', () => {
    const seats = [taken('Sam', 'p2'), taken('Jo', 'p3'), ai('Watson')];

    expect(minimumSeatCount(seats)).toBe(2);
    expect(withSeatCount(seats, 1)).toEqual([taken('Sam', 'p2'), taken('Jo', 'p3')]);
    expect(minimumSeatCount([open()])).toBe(1);
    expect(withSeatCount([open()], 0).length).toBe(1);
    expect(withSeatCount([open()], 9).length).toBe(5);
  });

  it('turns an open seat into an AI and back, but never a seat someone has joined', () => {
    const seats = [open('Mom'), taken('Sam', 'p2')];

    expect(withAi(seats, 0, true)).toEqual([ai('Mom'), taken('Sam', 'p2')]);
    expect(withAi(withAi(seats, 0, true), 0, false)).toEqual(seats);
    expect(withAi(seats, 1, true)).toEqual(seats);
  });

  it('leaves the input untouched', () => {
    const seats = [open('Mom')];
    withAi(seats, 0, true);
    withSeatCount(seats, 3);

    expect(seats).toEqual([open('Mom')]);
  });
});
