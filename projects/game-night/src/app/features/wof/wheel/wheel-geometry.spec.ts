import {
  WHEEL_TOTAL_SLOTS,
  buildWheelLayout,
  classifyWedge,
  pointerAngle,
  restRotationForSlot,
  resultForSlot,
  segmentAtAngle,
  segmentAtRotation,
  slotCenterAngle,
} from './wheel-geometry';
import { specialWheel, syndicatedWheel } from './wheel-fixtures.spec';

describe('wheel geometry', () => {
  const layout = buildWheelLayout(syndicatedWheel());

  it('lays the 24 wedges out as 15° runs of three 5° slots', () => {
    expect(layout.totalSlots).toBe(72);
    expect(layout.degreesPerSlot).toBe(5);
    expect(layout.segments.length).toBe(24);
    layout.segments.forEach((segment, i) => {
      expect(segment.startSlot).toBe(i * 3);
      expect(segment.endSlot).toBe(i * 3 + 3);
      expect(segment.startAngle).toBe(i * 15);
      expect(segment.endAngle).toBe(i * 15 + 15);
      expect(segment.centerAngle).toBe(i * 15 + 7.5);
    });
  });

  it('maps every slot to the wedge that covers it', () => {
    for (let slot = 0; slot < WHEEL_TOTAL_SLOTS; slot++) {
      const segment = layout.segments[layout.segmentIndexBySlot[slot]];
      expect(slot).toBeGreaterThanOrEqual(segment.startSlot);
      expect(slot).toBeLessThan(segment.endSlot);
    }
  });

  it('resolves any angle unambiguously, with each boundary belonging to the wedge it starts', () => {
    expect(segmentAtAngle(layout, 0).index).toBe(0);
    expect(segmentAtAngle(layout, 14.9999).index).toBe(0);
    expect(segmentAtAngle(layout, 15).index).toBe(1);
    expect(segmentAtAngle(layout, 359.9999).index).toBe(23);
    expect(segmentAtAngle(layout, 360).index).toBe(0);
    expect(segmentAtAngle(layout, -0.0001).index).toBe(23);
    expect(segmentAtAngle(layout, 725).index).toBe(0); // 725 ≡ 5
  });

  it('reads the pointer backwards through the wedges as the wheel turns clockwise', () => {
    expect(pointerAngle(0)).toBe(0);
    expect(pointerAngle(10)).toBe(350);
    expect(segmentAtRotation(layout, 10).index).toBe(23);
    expect(segmentAtRotation(layout, 20).index).toBe(22);
  });

  it('rests the pointer on the exact centre of the landing slot', () => {
    for (let slot = 0; slot < WHEEL_TOTAL_SLOTS; slot++) {
      const rotation = restRotationForSlot(layout, slot);
      expect(rotation).toBeGreaterThanOrEqual(0);
      expect(rotation).toBeLessThan(360);
      expect(pointerAngle(rotation)).toBeCloseTo(slotCenterAngle(layout, slot), 9);
      expect(segmentAtRotation(layout, rotation).index).toBe(Math.floor(slot / 3));
    }
  });

  it('classifies what the wheel landed on', () => {
    const wedges = syndicatedWheel();
    expect(classifyWedge(wedges[0])).toBe('CASH');
    expect(classifyWedge(wedges[1])).toBe('BANKRUPT');
    expect(classifyWedge(wedges[7])).toBe('LOSE_A_TURN');
    expect(classifyWedge({ ...wedges[1], effect: 'FREE_SPIN', label: 'FREE SPIN' })).toBe('SPECIAL');
    // The special wedges play for cash, but are told apart from an ordinary value.
    expect(classifyWedge({ ...wedges[5], label: 'WILD CARD', effect: 'WILD_CARD' })).toBe('WILD_CARD');
    expect(classifyWedge({ ...wedges[16], label: 'ONE MILLION', effect: 'MILLION' })).toBe('MILLION');

    expect(resultForSlot(layout, 22, true)).toEqual({
      type: 'LOSE_A_TURN',
      label: 'LOSE A TURN',
      value: null,
      wedgeIndex: 7,
      slot: 22,
      active: true,
    });
    expect(resultForSlot(layout, 2, false)).toEqual(jasmine.objectContaining({ type: 'CASH', value: 2500, active: false }));
  });

  it('lays out the special wedges, one-slot Million Dollar Wedge pieces included', () => {
    const special = buildWheelLayout(specialWheel());

    expect(special.segments.length).toBe(26);
    expect(classifyWedge(special.segments[5].wedge)).toBe('WILD_CARD');
    // The pink $500's three slots (48-50), one per piece.
    expect([48, 49, 50].map((slot) => resultForSlot(special, slot, true).type)).toEqual(['BANKRUPT', 'MILLION', 'BANKRUPT']);
    expect(resultForSlot(special, 49, true)).toEqual(jasmine.objectContaining({ label: 'ONE MILLION', value: 500 }));
    expect(special.segments[17].endAngle - special.segments[17].startAngle).toBe(5);
    // Everything after the split keeps its place on the rim.
    expect(resultForSlot(special, 51, true).label).toBe('$700');
  });

  it('rejects wedges that do not tile the rim exactly', () => {
    const wedges = syndicatedWheel();
    expect(() => buildWheelLayout(wedges.slice(0, 23))).toThrowError(/cover 69 of 72/);
    expect(() => buildWheelLayout([{ ...wedges[0], startSlot: 1 }, ...wedges.slice(1)])).toThrowError(/expected 0/);
    expect(() => buildWheelLayout([...wedges, { ...wedges[0], startSlot: 72 }])).toThrowError(/past slot 72/);
    const legacy = wedges.map(({ startSlot: _startSlot, slotCount: _slotCount, ...rest }) => rest);
    expect(() => buildWheelLayout(legacy as never)).toThrowError(/no valid slot span/);
  });
});
