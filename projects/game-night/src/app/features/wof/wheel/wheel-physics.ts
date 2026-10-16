import { WheelLayout, normalizeAngle, pointerAngle, restRotationForSlot, segmentAtAngle } from './wheel-geometry';

/*
 * Spin physics.
 *
 * The server decides WHERE the wheel stops (a rim slot) and HOW LONG it turns. This module finds a
 * physically believable path that meets both exactly, so every screen lands precisely on the
 * server's result at the same moment. The path depends only on (start rotation, slot, duration,
 * seed), so the TV and every phone animate the same spin.
 *
 * ── Main phase: momentum and friction ─────────────────────────────────────────────────────────
 * The wheel starts with angular velocity ω₀ and loses it to two kinds of friction:
 *
 *     dω/dt = −μ − k·ω
 *
 * μ is dry (bearing) friction, a constant drag that makes the wheel actually stop. k is speed-
 * proportional drag that bleeds off the fast early spin, which gives the long, tense crawl at the
 * end. With B = μ/k the solution is
 *
 *     ω(t) = (ω₀ + B)·e^(−k·t) − B
 *     θ(t) = θ₀ + (ω₀ + B)·(1 − e^(−k·t))/k − B·t
 *
 * Asking for ω(T) = 0 (at rest exactly at time T) and θ(T) − θ₀ = D (total travel) gives closed
 * forms, with E = e^(kT):
 *
 *     B  = D·k / (E − 1 − kT)
 *     ω₀ = B·(E − 1)
 *
 * k comes from a fixed shape factor k·T, so a short spin and a long spin feel the same, just
 * scaled in time.
 *
 * ── Finale: pegs and the flapper ──────────────────────────────────────────────────────────────
 * A peg sits on every wedge boundary. The flapper at 12 o'clock catches each peg as it crosses
 * the pointer line and bends with it until, PEG_RELEASE_DEG later, it slips off with a click. So
 * the wheel can never come to rest while bending the flapper, and how the spin ends depends on
 * where in the wedge the landing slot is:
 *
 *   • last slot the pointer reaches in the wedge (its start edge, the next peg is just ahead):
 *       BOUNCE_BACK - the wheel drives into that peg, can't push past, and the flapper knocks it
 *       back into the slot.
 *   • first slot the pointer reaches (its end edge, a peg just behind): TICK_OVER - the wheel
 *       stalls with the flapper bent against the peg, creeps, clicks over, and rolls in.
 *   • a middle slot: GLIDE - the flapper hangs free, so the wheel simply coasts to a stop.
 */

export type WheelStatus = 'SPINNING' | 'SLOWING' | 'STOPPED';
export type SpinFinale = 'GLIDE' | 'BOUNCE_BACK' | 'TICK_OVER';

/** How far past the pointer line a peg bends the flapper before the flapper slips off it (click). */
export const PEG_RELEASE_DEG = 1.2;

/** k·T for the main phase: about 3 gives a lively start and a long crawl without dragging. */
const DRAG_SHAPE = 3;
/** Average full revolutions per second of main phase, before the seeded jitter. */
const AVERAGE_TURNS_PER_SECOND = 0.42;
/** Below this the clicks turn from a rattle into separate ticks - the start of "slowing". */
const SLOWING_BELOW_DEG_PER_SEC = 150;
/** Never plan a main phase that covers less than this, so even a short spin visibly spins. */
const MIN_TRAVEL_DEG = 45;
/** Spins shorter than this (a screen that joined at the last moment) just snap to the result. */
const MIN_ANIMATED_MS = 400;
/** The main phase keeps at least this long; if the finale doesn't fit, it's dropped. */
const MIN_MAIN_PHASE_MS = 900;

const BOUNCE_BACK_MS = 560;
/** How far into the flapper the wheel drives before rocking back, as a share of PEG_RELEASE_DEG. */
const BOUNCE_OVERSHOOT_MIN = 0.45;
const BOUNCE_OVERSHOOT_SPREAD = 0.4;

/** How short of the flapper's release point the wheel first stalls on a tick-over. */
const TICK_OVER_STALL_GAP_DEG = 0.3;
const TICK_OVER_HOLD_MIN_MS = 420;
const TICK_OVER_HOLD_SPREAD_MS = 300;
const TICK_OVER_ROLL_MS = 380;

/** Iterations of bisection used to time each peg click; far more precision than a frame needs. */
const CLICK_SOLVE_ITERATIONS = 48;

export interface PegClick {
  /** Milliseconds after the spin starts. */
  atMs: number;
  /** Wheel speed at that moment, in degrees per second. */
  speed: number;
}

export interface SpinPlanInput {
  layout: WheelLayout;
  /** Where the wheel is now (unwrapped degrees). */
  fromRotation: number;
  landingSlot: number;
  durationMs: number;
  /** Must be the same on every screen (e.g. derived from the spin id) so they all animate alike. */
  seed: number;
}

export interface SpinPlan {
  startRotation: number;
  /** Where the wheel comes to rest (unwrapped; the pointer is on the landing slot's centre). */
  endRotation: number;
  durationMs: number;
  finale: SpinFinale;
  /** Every flapper click, in order - precomputed so audio can be scheduled ahead of the frames. */
  clicks: PegClick[];
  /** @internal - sampling parameters. */
  readonly motion: MainMotion;
  readonly finaleMotion: FinaleMotion;
}

export interface SpinSample {
  rotation: number;
  /** Signed, degrees per second (negative while rocking back). */
  velocity: number;
  status: WheelStatus;
}

interface MainMotion {
  durationMs: number;
  /** Rotation at the end of the main phase (where the finale takes over). */
  endRotation: number;
  k: number;
  /** B = μ/k. */
  drift: number;
  initialSpeed: number;
  slowingAtMs: number;
}

type FinaleMotion =
  | { kind: 'GLIDE' }
  | { kind: 'BOUNCE_BACK'; durationMs: number }
  | { kind: 'TICK_OVER'; holdMs: number; rollMs: number; releaseRotation: number };

export function planSpin(input: SpinPlanInput): SpinPlan {
  const { layout, fromRotation, landingSlot, seed } = input;
  const durationMs = Math.max(0, input.durationMs);
  const random = mulberry32(seed);
  const restAngle = restRotationForSlot(layout, landingSlot);
  const nearestRest = fromRotation + normalizeAngle(restAngle - fromRotation);

  if (durationMs < MIN_ANIMATED_MS) {
    return snapPlan(fromRotation, nearestRest, durationMs);
  }

  const half = layout.degreesPerSlot / 2;
  let finale = finaleForSlot(layout, landingSlot, random);
  let finaleMotion: FinaleMotion;
  let mainEndOffset: number;
  if (finale === 'BOUNCE_BACK') {
    finaleMotion = { kind: 'BOUNCE_BACK', durationMs: BOUNCE_BACK_MS };
    const overshoot = PEG_RELEASE_DEG * (BOUNCE_OVERSHOOT_MIN + BOUNCE_OVERSHOOT_SPREAD * random());
    mainEndOffset = half + overshoot; // past the slot centre, into the next peg
  } else if (finale === 'TICK_OVER') {
    const holdMs = TICK_OVER_HOLD_MIN_MS + TICK_OVER_HOLD_SPREAD_MS * random();
    finaleMotion = { kind: 'TICK_OVER', holdMs, rollMs: TICK_OVER_ROLL_MS, releaseRotation: 0 };
    mainEndOffset = -(half - PEG_RELEASE_DEG + TICK_OVER_STALL_GAP_DEG); // stalled on the peg behind
  } else {
    finaleMotion = { kind: 'GLIDE' };
    mainEndOffset = 0;
  }

  let mainMs = durationMs - finaleDurationMs(finaleMotion);
  if (mainMs < MIN_MAIN_PHASE_MS) {
    finale = 'GLIDE';
    finaleMotion = { kind: 'GLIDE' };
    mainEndOffset = 0;
    mainMs = durationMs;
  }

  const turns = Math.max(0, Math.floor((mainMs / 1000) * AVERAGE_TURNS_PER_SECOND + random()));
  let endRotation = nearestRest + 360 * turns;
  while (endRotation + mainEndOffset - fromRotation < MIN_TRAVEL_DEG) {
    endRotation += 360;
  }
  if (finaleMotion.kind === 'TICK_OVER') {
    finaleMotion.releaseRotation = endRotation - half + PEG_RELEASE_DEG;
  }

  const motion = solveMainMotion(fromRotation, endRotation + mainEndOffset, mainMs);
  const clicks = mainPhaseClicks(layout, fromRotation, motion);
  if (finaleMotion.kind === 'TICK_OVER') {
    clicks.push({ atMs: mainMs + finaleMotion.holdMs, speed: (2 * TICK_OVER_STALL_GAP_DEG * 1000) / finaleMotion.holdMs });
  }

  return { startRotation: fromRotation, endRotation, durationMs, finale, clicks, motion, finaleMotion };
}

/** Where the wheel is `elapsedMs` into the spin. */
export function sampleSpin(plan: SpinPlan, elapsedMs: number): SpinSample {
  const { motion, finaleMotion } = plan;
  if (elapsedMs >= plan.durationMs) {
    return { rotation: plan.endRotation, velocity: 0, status: 'STOPPED' };
  }
  const t = Math.max(0, elapsedMs);
  if (t < motion.durationMs) {
    const seconds = t / 1000;
    const decay = Math.exp(-motion.k * seconds);
    const carried = motion.initialSpeed + motion.drift;
    return {
      rotation: plan.startRotation + (carried * (1 - decay)) / motion.k - motion.drift * seconds,
      velocity: carried * decay - motion.drift,
      status: t < motion.slowingAtMs ? 'SPINNING' : 'SLOWING',
    };
  }

  const intoFinale = t - motion.durationMs;
  if (finaleMotion.kind === 'BOUNCE_BACK') {
    // Knocked back by the flapper: fastest at the moment of the bounce, easing into the slot.
    const u = intoFinale / finaleMotion.durationMs;
    const span = motion.endRotation - plan.endRotation;
    return {
      rotation: motion.endRotation - span * (1 - (1 - u) ** 3),
      velocity: (-span * 3 * (1 - u) ** 2 * 1000) / finaleMotion.durationMs,
      status: 'SLOWING',
    };
  }
  if (finaleMotion.kind === 'TICK_OVER') {
    if (intoFinale < finaleMotion.holdMs) {
      // Creeping from the stall to the flapper's release point.
      const u = intoFinale / finaleMotion.holdMs;
      const gap = finaleMotion.releaseRotation - motion.endRotation;
      return {
        rotation: motion.endRotation + gap * u * u,
        velocity: (2 * gap * u * 1000) / finaleMotion.holdMs,
        status: 'SLOWING',
      };
    }
    // Freed from the flapper, it rolls on into the slot.
    const u = (intoFinale - finaleMotion.holdMs) / finaleMotion.rollMs;
    const span = plan.endRotation - finaleMotion.releaseRotation;
    return {
      rotation: finaleMotion.releaseRotation + span * (1 - (1 - u) ** 2),
      velocity: (span * 2 * (1 - u) * 1000) / finaleMotion.rollMs,
      status: 'SLOWING',
    };
  }
  return { rotation: plan.endRotation, velocity: 0, status: 'SLOWING' };
}

/**
 * How far the flapper is bent at a wheel rotation: 0 when it hangs free, rising towards 1 as the
 * peg that just crossed the pointer line pushes it to the point where it slips off.
 */
export function flapperPush(layout: WheelLayout, rotation: number): number {
  const angle = pointerAngle(rotation);
  const pastPeg = segmentAtAngle(layout, angle).endAngle - angle;
  return pastPeg < PEG_RELEASE_DEG ? pastPeg / PEG_RELEASE_DEG : 0;
}

/** Which ending a landing slot gets (see the file header). One-slot wedges pick either peg story. */
export function finaleForSlot(layout: WheelLayout, slot: number, random: () => number = Math.random): SpinFinale {
  const segment = layout.segments[layout.segmentIndexBySlot[slot]];
  const isStartEdge = slot === segment.startSlot;
  const isEndEdge = slot === segment.endSlot - 1;
  if (isStartEdge && isEndEdge) {
    return random() < 0.5 ? 'BOUNCE_BACK' : 'TICK_OVER';
  }
  if (isStartEdge) {
    return 'BOUNCE_BACK';
  }
  if (isEndEdge) {
    return 'TICK_OVER';
  }
  return 'GLIDE';
}

/** Small, fast, seedable PRNG, so every screen draws the same "random" choices for a spin. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function snapPlan(fromRotation: number, endRotation: number, durationMs: number): SpinPlan {
  return {
    startRotation: fromRotation,
    endRotation,
    durationMs,
    finale: 'GLIDE',
    clicks: [],
    motion: { durationMs: 0, endRotation, k: 1, drift: 0, initialSpeed: 0, slowingAtMs: 0 },
    finaleMotion: { kind: 'GLIDE' },
  };
}

function finaleDurationMs(finale: FinaleMotion): number {
  if (finale.kind === 'BOUNCE_BACK') {
    return finale.durationMs;
  }
  if (finale.kind === 'TICK_OVER') {
    return finale.holdMs + finale.rollMs;
  }
  return 0;
}

/** The closed-form friction solution described at the top of the file. */
function solveMainMotion(fromRotation: number, endRotation: number, durationMs: number): MainMotion {
  const seconds = durationMs / 1000;
  const distance = endRotation - fromRotation;
  const k = DRAG_SHAPE / seconds;
  const growth = Math.exp(DRAG_SHAPE); // e^(kT)
  const drift = (distance * k) / (growth - 1 - DRAG_SHAPE);
  const initialSpeed = drift * (growth - 1);
  const slowingAtMs =
    initialSpeed <= SLOWING_BELOW_DEG_PER_SEC
      ? 0
      : (Math.log((initialSpeed + drift) / (SLOWING_BELOW_DEG_PER_SEC + drift)) / k) * 1000;
  return { durationMs, endRotation, k, drift, initialSpeed, slowingAtMs };
}

/**
 * Times every flapper click in the main phase. A peg at wheel-local angle p releases the flapper
 * at rotations ≡ PEG_RELEASE_DEG − p (mod 360). The main phase only ever moves forward, so each
 * crossing is found by bisecting θ(t).
 */
function mainPhaseClicks(layout: WheelLayout, fromRotation: number, motion: MainMotion): PegClick[] {
  const probe: SpinPlan = {
    startRotation: fromRotation,
    endRotation: motion.endRotation,
    durationMs: motion.durationMs,
    finale: 'GLIDE',
    clicks: [],
    motion,
    finaleMotion: { kind: 'GLIDE' },
  };
  const clicks: PegClick[] = [];
  for (const segment of layout.segments) {
    const releaseAngle = PEG_RELEASE_DEG - segment.startAngle;
    let crossing = fromRotation + (normalizeAngle(releaseAngle - fromRotation) || 360);
    for (; crossing <= motion.endRotation; crossing += 360) {
      let lo = 0;
      let hi = motion.durationMs;
      for (let i = 0; i < CLICK_SOLVE_ITERATIONS; i++) {
        const mid = (lo + hi) / 2;
        if (sampleSpin(probe, mid).rotation < crossing) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      const atMs = (lo + hi) / 2;
      clicks.push({ atMs, speed: sampleSpin(probe, atMs).velocity });
    }
  }
  return clicks.sort((a, b) => a.atMs - b.atMs);
}
