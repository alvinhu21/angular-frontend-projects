import { WEDGE_EFFECT_MILLION, WEDGE_EFFECT_WILD_CARD, WedgeView } from '../../../models/wof.models';

/*
 * Wheel geometry.
 *
 * Angles are in degrees, measured clockwise from 12 o'clock on the unrotated wheel ("wheel-local").
 * The rim is split into equal slots (72, i.e. 5° each) and every wedge covers a run of them (3, so
 * 15°). A spin lands on a slot, which also fixes which third of the wedge ends up under the pointer.
 *
 * Rotation: the wheel turns clockwise. Rotating by θ carries wheel-local angle α to screen angle
 * α + θ. The pointer sits at screen angle 0, so it reads wheel-local angle mod(−θ, 360). As θ grows,
 * the pointer moves backwards through the wedge list: it enters each wedge at its end edge and
 * leaves at its start edge.
 */

/** WILD_CARD and MILLION are the special wedges - both still play for their cash value. */
export type WheelResultType = 'CASH' | 'WILD_CARD' | 'MILLION' | 'BANKRUPT' | 'LOSE_A_TURN' | 'SPECIAL';

export interface WheelSegment {
  index: number;
  wedge: WedgeView;
  startSlot: number;
  /** Exclusive. */
  endSlot: number;
  startAngle: number;
  endAngle: number;
  centerAngle: number;
}

export interface WheelLayout {
  totalSlots: number;
  degreesPerSlot: number;
  segments: WheelSegment[];
  /** The segment index for every slot, so turning an angle into a wedge is one array read. */
  segmentIndexBySlot: number[];
}

export interface WheelResult {
  type: WheelResultType;
  label: string;
  value: number | null;
  wedgeIndex: number;
  slot: number;
  /** True once the server has applied this result. False while it's only where the wheel is headed. */
  active: boolean;
}

export const WHEEL_TOTAL_SLOTS = 72;

/**
 * Builds the angle table from the server's wedges. Throws unless the wedges tile the rim exactly -
 * in order, no gaps or overlaps, adding up to {@link WHEEL_TOTAL_SLOTS} - since any other shape
 * would make "which wedge is under the pointer" ambiguous.
 */
export function buildWheelLayout(wedges: readonly WedgeView[]): WheelLayout {
  const degreesPerSlot = 360 / WHEEL_TOTAL_SLOTS;
  const segmentIndexBySlot = new Array<number>(WHEEL_TOTAL_SLOTS);
  const segments: WheelSegment[] = [];
  let expectedStart = 0;

  wedges.forEach((wedge, index) => {
    const { startSlot, slotCount } = wedge;
    if (!Number.isInteger(startSlot) || !Number.isInteger(slotCount) || slotCount < 1) {
      throw new Error(`Wedge ${index} (${wedge.label}) has no valid slot span.`);
    }
    if (startSlot !== expectedStart) {
      throw new Error(`Wedge ${index} (${wedge.label}) starts at slot ${startSlot}, expected ${expectedStart}.`);
    }
    const endSlot = startSlot + slotCount;
    if (endSlot > WHEEL_TOTAL_SLOTS) {
      throw new Error(`Wedges run past slot ${WHEEL_TOTAL_SLOTS}.`);
    }
    for (let slot = startSlot; slot < endSlot; slot++) {
      segmentIndexBySlot[slot] = index;
    }
    segments.push({
      index,
      wedge,
      startSlot,
      endSlot,
      startAngle: startSlot * degreesPerSlot,
      endAngle: endSlot * degreesPerSlot,
      centerAngle: ((startSlot + endSlot) / 2) * degreesPerSlot,
    });
    expectedStart = endSlot;
  });

  if (expectedStart !== WHEEL_TOTAL_SLOTS) {
    throw new Error(`Wedges cover ${expectedStart} of ${WHEEL_TOTAL_SLOTS} slots.`);
  }
  return { totalSlots: WHEEL_TOTAL_SLOTS, degreesPerSlot, segments, segmentIndexBySlot };
}

export function normalizeAngle(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** The wheel-local angle under the fixed 12 o'clock pointer at a given wheel rotation. */
export function pointerAngle(rotation: number): number {
  return normalizeAngle(-rotation);
}

export function slotAtAngle(layout: WheelLayout, localAngle: number): number {
  // min() guards the float edge where an angle a hair under 360 rounds up to the last slot + 1.
  return Math.min(Math.floor(normalizeAngle(localAngle) / layout.degreesPerSlot), layout.totalSlots - 1);
}

export function segmentAtAngle(layout: WheelLayout, localAngle: number): WheelSegment {
  return layout.segments[layout.segmentIndexBySlot[slotAtAngle(layout, localAngle)]];
}

export function segmentAtRotation(layout: WheelLayout, rotation: number): WheelSegment {
  return segmentAtAngle(layout, pointerAngle(rotation));
}

export function slotCenterAngle(layout: WheelLayout, slot: number): number {
  return (slot + 0.5) * layout.degreesPerSlot;
}

/** The rotation in [0, 360) that puts the pointer on the middle of a slot. */
export function restRotationForSlot(layout: WheelLayout, slot: number): number {
  return normalizeAngle(-slotCenterAngle(layout, slot));
}

export function classifyWedge(wedge: WedgeView): WheelResultType {
  if (wedge.effect === WEDGE_EFFECT_WILD_CARD) {
    return 'WILD_CARD';
  }
  if (wedge.effect === WEDGE_EFFECT_MILLION) {
    return 'MILLION';
  }
  if (wedge.value !== null) {
    return 'CASH';
  }
  if (wedge.effect === 'BANKRUPT') {
    return 'BANKRUPT';
  }
  if (wedge.effect === 'LOSE_A_TURN') {
    return 'LOSE_A_TURN';
  }
  return 'SPECIAL';
}

export function resultForSlot(layout: WheelLayout, slot: number, active: boolean): WheelResult {
  const segment = layout.segments[layout.segmentIndexBySlot[slot]];
  return {
    type: classifyWedge(segment.wedge),
    label: segment.wedge.label,
    value: segment.wedge.value,
    wedgeIndex: segment.index,
    slot,
    active,
  };
}
