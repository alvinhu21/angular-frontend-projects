import { WHEEL_TOTAL_SLOTS, buildWheelLayout, pointerAngle, segmentAtRotation, slotCenterAngle } from './wheel-geometry';
import { PEG_RELEASE_DEG, SpinPlan, finaleForSlot, flapperPush, planSpin, sampleSpin } from './wheel-physics';
import { syndicatedWheel } from './wheel-fixtures.spec';

describe('wheel physics', () => {
  const layout = buildWheelLayout(syndicatedWheel());

  function plan(landingSlot: number, overrides: Partial<{ fromRotation: number; durationMs: number; seed: number }> = {}): SpinPlan {
    return planSpin({ layout, fromRotation: 0, landingSlot, durationMs: 6000, seed: 42, ...overrides });
  }

  /** Samples the whole spin at a fixed step - a stand-in for animation frames. */
  function trace(spin: SpinPlan, stepMs = 4) {
    const samples = [];
    for (let t = 0; t <= spin.durationMs; t += stepMs) {
      samples.push({ t, ...sampleSpin(spin, t) });
    }
    return samples;
  }

  describe('landing', () => {
    it('stops with the pointer on the exact centre of every slot, from any start, for any seed', () => {
      for (let slot = 0; slot < WHEEL_TOTAL_SLOTS; slot++) {
        for (const [fromRotation, seed] of [[0, 1], [123.4, 99], [-47, 7], [3600.5, 2024]]) {
          const spin = plan(slot, { fromRotation, seed });
          const end = sampleSpin(spin, spin.durationMs);

          expect(end.status).toBe('STOPPED');
          expect(end.rotation).toBe(spin.endRotation);
          expect(pointerAngle(end.rotation)).toBeCloseTo(slotCenterAngle(layout, slot), 6);
          expect(segmentAtRotation(layout, end.rotation).index).toBe(Math.floor(slot / 3));
        }
      }
    });

    it('comes to rest exactly when the server said, not a frame before', () => {
      const spin = plan(10, { durationMs: 5873 });

      expect(sampleSpin(spin, 5872.9).status).not.toBe('STOPPED');
      expect(sampleSpin(spin, 5873).status).toBe('STOPPED');
    });

    it('always turns at least a couple of full revolutions on a full-length spin', () => {
      for (let seed = 0; seed < 20; seed++) {
        const spin = plan(30, { seed });
        expect(spin.endRotation - spin.startRotation).toBeGreaterThan(720);
      }
    });

    it('draws the same spin on every screen for the same inputs', () => {
      expect(plan(33, { seed: 5 })).toEqual(plan(33, { seed: 5 }));
    });

    it('snaps straight to the result when there is (almost) no time left to animate', () => {
      for (const durationMs of [0, 150, 399]) {
        const spin = plan(40, { fromRotation: 10, durationMs });
        expect(spin.clicks).toEqual([]);
        expect(spin.endRotation - 10).toBeGreaterThanOrEqual(0);
        expect(spin.endRotation - 10).toBeLessThan(360);
        expect(pointerAngle(spin.endRotation)).toBeCloseTo(slotCenterAngle(layout, 40), 6);
      }
    });

    it('drops the peg finale when a late-joining screen has too little time for it, but still lands exactly', () => {
      const spin = plan(0, { durationMs: 1000 }); // slot 0 would normally bounce back

      expect(spin.finale).toBe('GLIDE');
      expect(pointerAngle(sampleSpin(spin, 1000).rotation)).toBeCloseTo(slotCenterAngle(layout, 0), 6);
    });
  });

  describe('momentum and friction', () => {
    it('only ever decelerates through the main phase and never runs backwards', () => {
      const spin = plan(19, { seed: 3 }); // a middle slot, so it glides the whole way
      const samples = trace(spin).filter((s) => s.status !== 'STOPPED');

      for (let i = 1; i < samples.length; i++) {
        expect(samples[i].velocity).toBeLessThanOrEqual(samples[i - 1].velocity + 1e-9);
        expect(samples[i].velocity).toBeGreaterThanOrEqual(-1e-9);
        expect(samples[i].rotation).toBeGreaterThanOrEqual(samples[i - 1].rotation - 1e-9);
      }
    });

    it('moves smoothly - no jumps between frames', () => {
      for (const slot of [0, 1, 2]) {
        const samples = trace(plan(slot, { seed: 11 }), 4);
        const topSpeed = Math.max(...samples.map((s) => Math.abs(s.velocity)));
        for (let i = 1; i < samples.length; i++) {
          // At most what the fastest moment of the spin could cover in one 4ms step.
          expect(Math.abs(samples[i].rotation - samples[i - 1].rotation)).toBeLessThanOrEqual(topSpeed * 0.004 + 1e-6);
        }
      }
    });

    it('reports SPINNING, then SLOWING, then STOPPED - never going back', () => {
      const order = ['SPINNING', 'SLOWING', 'STOPPED'];
      const statuses = trace(plan(50, { seed: 8 })).map((s) => s.status);

      expect(statuses[0]).toBe('SPINNING');
      expect(statuses[statuses.length - 1]).toBe('STOPPED');
      for (let i = 1; i < statuses.length; i++) {
        expect(order.indexOf(statuses[i])).toBeGreaterThanOrEqual(order.indexOf(statuses[i - 1]));
      }
    });
  });

  describe('pegs and the flapper', () => {
    it('clicks once per peg the flapper slips past, and the clicks spread out as the wheel slows', () => {
      const spin = plan(19, { seed: 4 }); // middle slot: every click comes from the main phase
      const travelled = spin.endRotation - spin.startRotation;

      // 24 pegs per revolution, give or take the partial lap at each end.
      expect(Math.abs(spin.clicks.length - (travelled / 360) * 24)).toBeLessThanOrEqual(1);
      for (let i = 2; i < spin.clicks.length; i++) {
        const gap = spin.clicks[i].atMs - spin.clicks[i - 1].atMs;
        const previousGap = spin.clicks[i - 1].atMs - spin.clicks[i - 2].atMs;
        expect(gap).toBeGreaterThan(previousGap);
        expect(spin.clicks[i].speed).toBeLessThan(spin.clicks[i - 1].speed);
      }
    });

    it('times each click to the instant the flapper is fully bent and springs free', () => {
      const spin = plan(19, { seed: 4 });
      for (const click of spin.clicks) {
        expect(flapperPush(layout, sampleSpin(spin, click.atMs - 0.05).rotation)).toBeGreaterThan(0.9);
        expect(flapperPush(layout, sampleSpin(spin, click.atMs + 0.05).rotation)).toBe(0);
      }
    });

    it('leaves the flapper hanging free at every resting place', () => {
      for (let slot = 0; slot < WHEEL_TOTAL_SLOTS; slot++) {
        expect(flapperPush(layout, plan(slot).endRotation)).toBe(0);
      }
    });

    it('picks the ending from where the landing slot sits inside its wedge', () => {
      // The pointer enters a wedge at its end edge and would leave through its start edge.
      expect(finaleForSlot(layout, 3)).toBe('BOUNCE_BACK'); // next to the peg ahead
      expect(finaleForSlot(layout, 4)).toBe('GLIDE');
      expect(finaleForSlot(layout, 5)).toBe('TICK_OVER'); // just past the peg behind
    });

    it('bounce-back: drives into the next peg, pushes the pointer over the line, but is knocked back without a click', () => {
      const spin = plan(3, { seed: 21 });
      const samples = trace(spin, 2);
      const furthest = Math.max(...samples.map((s) => s.rotation));
      const lastClick = spin.clicks[spin.clicks.length - 1].atMs;
      const half = layout.degreesPerSlot / 2;

      expect(spin.finale).toBe('BOUNCE_BACK');
      expect(furthest - spin.endRotation).toBeGreaterThan(half); // over the boundary into the next wedge...
      expect(furthest - spin.endRotation).toBeLessThan(half + PEG_RELEASE_DEG); // ...without beating the flapper
      expect(segmentAtRotation(layout, furthest).index).toBe(0); // it showed the neighbouring wedge
      expect(segmentAtRotation(layout, spin.endRotation).index).toBe(1); // but settled back in its own
      expect(samples.some((s) => s.t > lastClick && s.velocity < 0)).toBeTrue(); // rocking back
    });

    it('tick-over: stalls against the flapper, clicks over, and rolls into the slot', () => {
      const spin = plan(5, { seed: 21 });
      const lastClick = spin.clicks[spin.clicks.length - 1];
      const beforeLast = spin.clicks[spin.clicks.length - 2];

      expect(spin.finale).toBe('TICK_OVER');
      // The final click comes after a real hesitation, well apart from the rest of the rattle...
      expect(lastClick.atMs - beforeLast.atMs).toBeGreaterThan(400);
      // ...with the flapper straining (bent most of the way) during the stall...
      const stall = sampleSpin(spin, lastClick.atMs - 200);
      expect(flapperPush(layout, stall.rotation)).toBeGreaterThan(0.6);
      expect(Math.abs(stall.velocity)).toBeLessThan(2);
      // ...and the wheel still rolling a little once it's free.
      expect(spin.endRotation - sampleSpin(spin, lastClick.atMs).rotation).toBeGreaterThan(1);
      expect(segmentAtRotation(layout, spin.endRotation).index).toBe(1);
    });
  });
});
