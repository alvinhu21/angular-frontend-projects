import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WedgeView, WheelSpinView } from '../../../models/wof.models';
import { WofAudioService } from '../audio/wof-audio.service';
import {
  WheelLayout,
  WheelResult,
  WheelResultType,
  WheelSegment,
  buildWheelLayout,
  classifyWedge,
  normalizeAngle,
  restRotationForSlot,
  resultForSlot,
} from './wheel-geometry';
import { PegClick, SpinPlan, WheelStatus, flapperPush, mulberry32, planSpin, sampleSpin } from './wheel-physics';

// Every layer shares one 1000x1000 user space centred on (500, 500).
const CENTER = 500;
const FACE_RADIUS = 445;
const PEG_RADIUS = 431;
const HUB_RADIUS = 96;
const LABEL_OUTER_RADIUS = 418;
const LABEL_INNER_RADIUS = 130;
const BULB_RADIUS = 472;
const BULB_COUNT = 48;
/** One full lap of the chasing rim lights while the wheel turns. */
const BULB_CHASE_SECONDS = 1.2;

/** Narrower than this (the Million Dollar Wedge's one-peg-wide pieces), a stack of upright glyphs
 *  won't fit near the hub, so the label runs along the radius instead. */
const RADIAL_LABEL_MAX_SWEEP = 10;
/** The Wild Card: a playing card laid over the outer part of its wedge, its $ value showing below. */
const WILD_CARD_OUTER_RADIUS = 430;
const WILD_CARD_INNER_RADIUS = 262;
const WILD_CARD_WIDTH = 60;
const WILD_CARD_VALUE_OUTER_RADIUS = 250;
const WILD_CARD_LETTER_COLORS = ['#ff4c4c', '#ffd23f', '#3ddc84', '#3fa9ff'];

/** How far (degrees) the flapper swings when a peg is about to slip past it. */
const FLAPPER_MAX_SWING = 26;
const FLAPPER_RECOIL_MS = 260;
const FLAPPER_RECOIL_DECAY_MS = 55;
const FLAPPER_RECOIL_PERIOD_MS = 120;
/** Clicks are handed to the audio clock this far ahead of the frame clock, so their timing is exact. */
const CLICK_LOOKAHEAD_MS = 120;
/** A click this late (a hidden tab, a long frame) is skipped rather than played out of time. */
const CLICK_LATE_TOLERANCE_MS = 30;

interface Glyph {
  char: string;
  y: number;
  size: number;
  /** Overrides the wedge's ink. */
  fill?: string;
}

interface WedgeFace {
  key: number;
  path: string;
  fill: string;
  ink: string;
  /** Rotates the label group so the wedge's centre line points straight up. */
  rotate: string;
  /** Glyphs stacked from the rim towards the hub, each one upright. */
  stack: Glyph[] | null;
  /** One line running along the radius - for wedges too narrow to stack. */
  radial: { text: string; y: number; size: number; transform: string } | null;
  /** The Wild Card's card, in the label group's upright frame. */
  card: { x: number; y: number; width: number; height: number; glyphs: Glyph[] } | null;
  sparkles: { x: number; y: number; r: number }[];
}

interface AriaText {
  key: string;
  params: Record<string, string>;
}

const BULBS = Array.from({ length: BULB_COUNT }, (_, i) => {
  const angle = (i / BULB_COUNT) * 2 * Math.PI;
  return {
    x: CENTER + BULB_RADIUS * Math.sin(angle),
    y: CENTER - BULB_RADIUS * Math.cos(angle),
    delay: `${(-(i / BULB_COUNT) * BULB_CHASE_SECONDS).toFixed(3)}s`,
  };
});

/**
 * The physical wheel: 72 rim slots, each wedge spanning three, with a peg on every wedge boundary
 * and a flapper at 12 o'clock.
 *
 * The server owns the outcome: each {@link WheelSpinView} says which slot lands under the pointer
 * and how long the wheel turns. This component plans a physically modelled path to that exact
 * slot (see wheel-physics), animates it, clicks the flapper on every peg, and reports progress
 * through {@link status} / {@link result} / {@link statusChange}.
 */
@Component({
  selector: 'app-wof-wheel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './wof-wheel.component.html',
  styleUrl: './wof-wheel.component.scss',
})
export class WofWheelComponent {
  readonly wedges = input.required<WedgeView[]>();
  readonly spin = input<WheelSpinView | null>(null);
  /** What the latest spin landed on, as the game recorded it. Optional: without it the callout
   *  reads the wedge under the pointer - which, once a claimed Wild Card or Million Dollar Wedge
   *  has come off the wheel, is the plain $500 beneath rather than what was won. */
  readonly landedWedge = input<WedgeView | null>(null);
  readonly statusChange = output<WheelStatus>();

  private readonly zone = inject(NgZone);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly audio = inject(WofAudioService, { optional: true });
  private readonly rotor = viewChild<ElementRef<SVGSVGElement>>('rotor');
  private readonly flapper = viewChild<ElementRef<SVGSVGElement>>('flapper');

  readonly bulbs = BULBS;
  readonly layout = computed<WheelLayout | null>(() => {
    try {
      return buildWheelLayout(this.wedges());
    } catch (error) {
      // The game still plays (spins resolve server-side); only the wheel drawing is lost.
      console.error('[wof-wheel] The server sent a wheel that does not tile the rim:', error);
      return null;
    }
  });
  readonly faces = computed(() => this.layout()?.segments.map(toFace) ?? []);
  /** One peg and one divider line on every wedge boundary. */
  readonly boundaries = computed(() =>
    (this.layout()?.segments ?? []).map((segment) => ({
      peg: polar(PEG_RADIUS, segment.startAngle),
      inner: polar(HUB_RADIUS, segment.startAngle),
      outer: polar(FACE_RADIUS, segment.startAngle),
    })),
  );

  private readonly statusState = signal<WheelStatus>('STOPPED');
  /** SPINNING → SLOWING (the clicks become countable) → STOPPED. */
  readonly status = this.statusState.asReadonly();
  /** Where the latest spin lands; `active` once the game has applied it. */
  readonly result = computed<WheelResult | null>(() => {
    const spin = this.spin();
    const layout = this.layout();
    return spin && layout ? resultForSlot(layout, spin.landingSlot, !spin.inMotion) : null;
  });
  /** Only shown once the wheel has stopped on screen AND the game has applied it. */
  readonly revealedResult = computed(() => {
    const result = this.result();
    return result?.active && this.status() === 'STOPPED' ? result : null;
  });
  readonly revealedWedge = computed(() => {
    const result = this.revealedResult();
    if (!result) {
      return null;
    }
    return this.landedWedge() ?? this.layout()?.segments[result.wedgeIndex].wedge ?? null;
  });
  readonly revealedType = computed<WheelResultType | null>(() => {
    const wedge = this.revealedWedge();
    return wedge ? classifyWedge(wedge) : null;
  });
  readonly ariaText = computed((): AriaText => {
    const wedge = this.revealedWedge();
    if (wedge) {
      return { key: 'wof.wheelLandedAria', params: { label: wedge.label } };
    }
    if (this.status() !== 'STOPPED') {
      return { key: 'wof.wheelSpinningAria', params: {} };
    }
    return { key: 'wof.wheelAriaLabel', params: {} };
  });

  /** Current wheel rotation in degrees (unwrapped while a spin runs, normalized at rest). */
  private rotation = 0;
  private hasFollowed = false;
  private followedSpinId: number | null = null;
  private plan: SpinPlan | null = null;
  private planLayout: WheelLayout | null = null;
  private startedAt = 0;
  private frame: number | null = null;
  private nextVisualClick = 0;
  private nextAudioClick = 0;
  private lastReleaseMs = Number.NEGATIVE_INFINITY;
  private reduceMotion = false;

  constructor() {
    effect(() => {
      const spin = this.spin();
      const layout = this.layout();
      untracked(() => this.follow(spin, layout));
    });
    afterNextRender(() => this.render(0));
    inject(DestroyRef).onDestroy(() => this.cancelFrame());
  }

  /** Reacts to a snapshot: starts a new spin, or places the wheel where it already rests. */
  private follow(spin: WheelSpinView | null, layout: WheelLayout | null): void {
    if (!layout) {
      return;
    }
    const firstLook = !this.hasFollowed;
    this.hasFollowed = true;
    if (!spin) {
      if (firstLook) {
        this.rotation = homeRotation(layout);
        this.render(0);
      }
      return;
    }
    if (spin.spinId === this.followedSpinId) {
      return; // Same spin - e.g. it just settled. The animation is already running or done.
    }
    this.followedSpinId = spin.spinId;

    // A spin seen from its first snapshot plays in full. One this screen joined partway through
    // plays only what's left (or snaps straight to the result if it's already over).
    const watchedFromStart = !firstLook && spin.inMotion;
    const durationMs = watchedFromStart ? spin.durationMs : remainingMs(spin);
    this.run(
      planSpin({ layout, fromRotation: this.rotation, landingSlot: spin.landingSlot, durationMs, seed: spinSeed(spin) }),
      layout,
    );
  }

  private run(plan: SpinPlan, layout: WheelLayout): void {
    this.cancelFrame();
    this.plan = plan;
    this.planLayout = layout;
    this.nextVisualClick = 0;
    this.nextAudioClick = 0;
    this.lastReleaseMs = Number.NEGATIVE_INFINITY;
    this.reduceMotion = this.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const win = this.window;
    if (plan.durationMs <= 0 || !win?.requestAnimationFrame) {
      this.settle(plan);
      return;
    }
    this.startedAt = win.performance.now();
    // Report the spin straight away rather than on the first frame: a hidden tab gets no frames,
    // and it mustn't show the result before its wheel has visibly finished turning.
    this.setStatus(sampleSpin(plan, 0).status);
    // Frames only move DOM transforms, so they stay outside Angular; only status changes re-enter.
    this.zone.runOutsideAngular(() => {
      this.frame = win.requestAnimationFrame(this.tick);
    });
  }

  private readonly tick = (now: number): void => {
    const plan = this.plan;
    const layout = this.planLayout;
    if (!plan || !layout || !this.window) {
      return;
    }
    const elapsed = now - this.startedAt;
    const sample = sampleSpin(plan, elapsed);
    if (sample.status === 'STOPPED') {
      this.settle(plan);
      return;
    }
    // Reduced motion: the wheel holds still while "spinning", then jumps to the result - the reveal
    // timing is unchanged, only the movement is removed.
    this.rotation = this.reduceMotion ? plan.startRotation : sample.rotation;
    this.scheduleClicks(plan.clicks, elapsed);
    this.render(this.reduceMotion ? 0 : this.flapperSwing(layout, elapsed));
    this.setStatus(sample.status);
    this.frame = this.window.requestAnimationFrame(this.tick);
  };

  private settle(plan: SpinPlan): void {
    this.frame = null;
    this.plan = null;
    this.planLayout = null;
    this.rotation = normalizeAngle(plan.endRotation);
    this.render(0);
    this.setStatus('STOPPED');
  }

  /**
   * Clicks were timed exactly when the spin was planned. The flapper's visual recoil follows the
   * frame clock; the sound is scheduled a little ahead on the audio clock, so the rattle is evenly
   * spaced no matter how uneven the frame rate is.
   */
  private scheduleClicks(clicks: readonly PegClick[], elapsed: number): void {
    while (this.nextVisualClick < clicks.length && clicks[this.nextVisualClick].atMs <= elapsed) {
      this.lastReleaseMs = clicks[this.nextVisualClick].atMs;
      this.nextVisualClick++;
    }
    const audio = this.audio;
    const audioNow = audio?.now() ?? null;
    while (this.nextAudioClick < clicks.length && clicks[this.nextAudioClick].atMs <= elapsed + CLICK_LOOKAHEAD_MS) {
      const click = clicks[this.nextAudioClick];
      this.nextAudioClick++;
      const leadMs = click.atMs - elapsed;
      if (audio && audioNow !== null && leadMs > -CLICK_LATE_TOLERANCE_MS) {
        audio.pegClick(audioNow + Math.max(0, leadMs) / 1000, click.speed);
      }
    }
  }

  /** Bent by the peg it's riding, or springing back (and overshooting) after one slips past. */
  private flapperSwing(layout: WheelLayout, elapsed: number): number {
    const push = flapperPush(layout, this.rotation);
    if (push > 0) {
      return push * FLAPPER_MAX_SWING;
    }
    const since = elapsed - this.lastReleaseMs;
    if (since >= FLAPPER_RECOIL_MS) {
      return 0;
    }
    const decay = Math.exp(-since / FLAPPER_RECOIL_DECAY_MS);
    return FLAPPER_MAX_SWING * decay * Math.cos((2 * Math.PI * since) / FLAPPER_RECOIL_PERIOD_MS);
  }

  private render(flapperSwingDeg: number): void {
    const rotor = this.rotor()?.nativeElement;
    if (rotor) {
      rotor.style.transform = `rotate(${this.rotation.toFixed(3)}deg)`;
    }
    const flapper = this.flapper()?.nativeElement;
    if (flapper) {
      // A peg drags the flapper tip the way the rim moves (to the right) - an anticlockwise swing.
      flapper.style.transform = `rotate(${(-flapperSwingDeg).toFixed(2)}deg)`;
    }
  }

  private setStatus(status: WheelStatus): void {
    if (status === this.statusState()) {
      return;
    }
    this.zone.run(() => {
      this.statusState.set(status);
      this.statusChange.emit(status);
    });
  }

  private cancelFrame(): void {
    if (this.frame !== null) {
      this.window?.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
}

/** Before the first spin of the game: the top wedge centred under the pointer. */
function homeRotation(layout: WheelLayout): number {
  const top = layout.segments[0];
  return restRotationForSlot(layout, top.startSlot + Math.floor((top.endSlot - top.startSlot) / 2));
}

function remainingMs(spin: WheelSpinView): number {
  if (!spin.inMotion) {
    return 0;
  }
  const left = Date.parse(spin.settlesAt) - Date.now();
  return Number.isFinite(left) ? Math.min(spin.durationMs, Math.max(0, left)) : 0;
}

/** Same on every screen, so the TV and all the phones animate the identical spin. */
function spinSeed(spin: WheelSpinView): number {
  return (spin.spinId * 7919 + spin.landingSlot) >>> 0;
}

function polar(radius: number, angleDeg: number): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(radians), y: CENTER - radius * Math.cos(radians) };
}

function toFace(segment: WheelSegment): WedgeFace {
  const { wedge } = segment;
  const sweep = segment.endAngle - segment.startAngle;
  const from = polar(FACE_RADIUS, segment.startAngle);
  const to = polar(FACE_RADIUS, segment.endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  // Sized from the wedge's width, so a narrower or wider wedge would still fit its label.
  const baseSize = Math.min(60, Math.max(28, sweep * 3.8));
  const type = classifyWedge(wedge);
  const narrow = sweep < RADIAL_LABEL_MAX_SWEEP;
  let stack: Glyph[] | null = null;
  if (type === 'WILD_CARD') {
    // The card covers the outer part of the wedge; the $ value it plays for shows below it.
    stack = stackGlyphs(`$${wedge.value}`, baseSize, WILD_CARD_VALUE_OUTER_RADIUS);
  } else if (!narrow) {
    stack = stackGlyphs(wedge.label, baseSize);
  }
  let glints: WedgeFace['sparkles'] = [];
  if (wedge.effect === 'GLITTER') {
    glints = sparkles(segment.index, sweep, 12);
  } else if (type === 'MILLION') {
    glints = sparkles(segment.index, sweep, 7);
  }
  return {
    key: segment.index,
    path: `M ${CENTER} ${CENTER} L ${from.x} ${from.y} A ${FACE_RADIUS} ${FACE_RADIUS} 0 ${largeArc} 1 ${to.x} ${to.y} Z`,
    fill: wedge.backgroundColor,
    ink: wedge.textColor,
    rotate: `rotate(${segment.centerAngle} ${CENTER} ${CENTER})`,
    stack,
    radial: narrow ? radialLabel(wedge.label, baseSize) : null,
    card: type === 'WILD_CARD' ? wildCard() : null,
    sparkles: glints,
  };
}

/** Glyphs stacked down the wedge's centre line between two radii, shrunk to fit if need be. */
function stackGlyphs(
  label: string,
  baseSize: number,
  outerRadius = LABEL_OUTER_RADIUS,
  innerRadius = LABEL_INNER_RADIUS,
): Glyph[] {
  const chars = label.toUpperCase() === 'LOSE A TURN' ? [label.slice(0, 4), ...label.slice(4)] : [...label];
  const sizes = chars.map((char) => (char === '$' ? baseSize * 0.72 : baseSize));
  const heights = sizes.map((size) => size * 0.9);
  const available = outerRadius - innerRadius;
  const needed = heights.reduce((sum, h) => sum + h, 0);
  const scale = Math.min(1, available / needed);
  let y = CENTER - outerRadius;
  return chars.map((char, i) => {
    const height = heights[i] * scale;
    const glyph = { char, y: y + height / 2, size: sizes[i] * scale };
    y += height;
    return glyph;
  });
}

function radialLabel(label: string, baseSize: number): WedgeFace['radial'] {
  const length = LABEL_OUTER_RADIUS - LABEL_INNER_RADIUS;
  // A condensed bold face runs about 0.55em per character; 0.7 of the base size keeps a capital's
  // height inside a one-peg-wide strip all the way along the text.
  const size = Math.min(baseSize * 0.7, length / (label.length * 0.55));
  const y = CENTER - (LABEL_OUTER_RADIUS + LABEL_INNER_RADIUS) / 2;
  return { text: label, y, size, transform: `rotate(90 ${CENTER} ${y})` };
}

/** "WILD" down a dark card near the rim, each letter its own colour. */
function wildCard(): NonNullable<WedgeFace['card']> {
  const height = WILD_CARD_OUTER_RADIUS - WILD_CARD_INNER_RADIUS;
  const glyphs = stackGlyphs('WILD', 36, WILD_CARD_OUTER_RADIUS - 12, WILD_CARD_INNER_RADIUS + 10).map((glyph, i) => ({
    ...glyph,
    fill: WILD_CARD_LETTER_COLORS[i % WILD_CARD_LETTER_COLORS.length],
  }));
  return { x: CENTER - WILD_CARD_WIDTH / 2, y: CENTER - WILD_CARD_OUTER_RADIUS, width: WILD_CARD_WIDTH, height, glyphs };
}

/** A fixed scatter of glints for a shiny wedge - seeded by index, so it never shimmers about. */
function sparkles(index: number, sweep: number, count: number): WedgeFace['sparkles'] {
  const random = mulberry32(index + 1);
  const halfSweep = ((sweep / 2) * Math.PI) / 180;
  return Array.from({ length: count }, () => {
    const radius = LABEL_INNER_RADIUS + 20 + random() * (FACE_RADIUS - LABEL_INNER_RADIUS - 40);
    const offset = (random() * 2 - 1) * halfSweep * 0.8;
    return {
      x: CENTER + radius * Math.sin(offset),
      y: CENTER - radius * Math.cos(offset),
      r: 1.6 + random() * 2.6,
    };
  });
}
