import { WofStateSnapshot } from '../../../models/wof.models';
import { specialWheel, syndicatedWheel, wheelSpin } from '../wheel/wheel-fixtures.spec';
import { wofSnapshot as snapshot } from '../wof-state-fixtures.spec';
import { wofCuesBetween } from './wof-cues';

/** The snapshot pair around a spin settling on the wedge at `wedgeIndex`. */
function settlingOn(wedgeIndex: number, wheel = syndicatedWheel()): [WofStateSnapshot, WofStateSnapshot] {
  const spinning = snapshot({ wheelSpin: wheelSpin({ landingSlot: wedgeIndex * 3 + 1 }) });
  const settled = snapshot({
    wheelSpin: { ...spinning.wheelSpin!, inMotion: false },
    lastSpinIndex: wedgeIndex,
    lastSpinResult: wheel[wedgeIndex],
  });
  return [spinning, settled];
}

describe('wofCuesBetween', () => {
  it('stays silent on the first snapshot, even mid-spin, so a reconnect never replays history', () => {
    expect(wofCuesBetween(null, snapshot({ wheelSpin: wheelSpin() }))).toEqual([]);
  });

  it('stays silent when nothing changed', () => {
    const state = snapshot({ wheelSpin: wheelSpin() });
    expect(wofCuesBetween(state, { ...state })).toEqual([]);
  });

  it('cues the spin starting when a new spin arrives in motion', () => {
    expect(wofCuesBetween(snapshot(), snapshot({ wheelSpin: wheelSpin() }))).toEqual(['spinStart']);
  });

  it('cues what the wheel landed on once a watched spin settles', () => {
    expect(wofCuesBetween(...settlingOn(0))).toEqual(['landedCash']);
    expect(wofCuesBetween(...settlingOn(1))).toEqual(['bankrupt']);
    expect(wofCuesBetween(...settlingOn(7))).toEqual(['loseATurn']);
  });

  it('stays silent for a spin that was already over by the time this screen saw it', () => {
    const [, settled] = settlingOn(1);
    expect(wofCuesBetween(snapshot(), settled)).toEqual([]);
  });

  it('cues a landing on the Wild Card or the Million Dollar Wedge as special', () => {
    expect(wofCuesBetween(...settlingOn(5, specialWheel()))).toEqual(['landedSpecial']);
    expect(wofCuesBetween(...settlingOn(17, specialWheel()))).toEqual(['landedSpecial']);
  });

  it('cues a special wedge being claimed, but not being lost or played', () => {
    expect(wofCuesBetween(snapshot(), snapshot({ wildCardHolderId: 'a' }))).toEqual(['specialClaimed']);
    expect(wofCuesBetween(snapshot(), snapshot({ millionWedgeHolderId: 'b' }))).toEqual(['specialClaimed']);
    expect(wofCuesBetween(snapshot({ wildCardHolderId: 'a' }), snapshot())).toEqual([]);
  });

  describe('Fortune Frenzy', () => {
    const revealing = snapshot({ phase: 'FORTUNE_FRENZY' });

    it('cues a ring-in', () => {
      expect(wofCuesBetween(revealing, { ...revealing, frenzySolvingPlayerId: 'a' })).toEqual(['ringIn']);
    });

    it('rings the bell for a solve, buzzes a miss, and sounds the end of an unsolved puzzle', () => {
      const answering = { ...revealing, frenzySolvingPlayerId: 'a' };
      const over = (frenzyOutcome: 'SOLVED' | 'MISSED' | 'UNSOLVED') =>
        snapshot({ phase: 'FRENZY_PUZZLE_OVER', frenzyOutcome });

      expect(wofCuesBetween(answering, over('SOLVED'))).toEqual(['frenzySolved']);
      expect(wofCuesBetween(answering, over('MISSED'))).toEqual(['frenzyMissed']);
      expect(wofCuesBetween(revealing, over('UNSOLVED'))).toEqual(['frenzyUnsolved']);
    });

    it('stays silent when a reconnecting screen first sees a finished puzzle', () => {
      expect(wofCuesBetween(null, snapshot({ phase: 'FRENZY_PUZZLE_OVER', frenzyOutcome: 'SOLVED' }))).toEqual([]);
    });
  });
});
