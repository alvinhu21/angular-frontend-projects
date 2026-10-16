import { WedgeView, WheelSpinView } from '../../../models/wof.models';

// Shared test data for the wheel specs (named *.spec.ts so it stays out of the app build).

/** The server's Round 1 wheel: 24 wedges, each spanning 3 of the 72 rim slots. */
const ROUND_ONE_LABELS = [
  '$2500', 'BANKRUPT', '$900', '$500', '$650', '$500', '$800', 'LOSE A TURN',
  '$700', '$850', '$650', 'BANKRUPT', '$600', '$500', '$550', '$600',
  '$500', '$700', '$500', '$650', '$600', '$700', '$900', '$500',
];

export function syndicatedWheel(): WedgeView[] {
  return ROUND_ONE_LABELS.map((label, i) => {
    const isCash = label.startsWith('$');
    return {
      label,
      value: isCash ? Number(label.slice(1)) : null,
      effect: isCash ? (label === '$2500' ? 'GLITTER' : '') : label.replace(/ /g, '_'),
      backgroundColor: isCash ? '#23D478' : '#2E3039',
      textColor: isCash ? '#111827' : '#FFFFFF',
      startSlot: i * 3,
      slotCount: 3,
    };
  });
}

/**
 * The server's Round 1 wheel with both special wedges on it: the Wild Card over the $500 at index
 * 5, and the Million Dollar Wedge splitting the $500 at index 16 into one-slot BANKRUPT / ONE
 * MILLION / BANKRUPT - 26 wedges in all.
 */
export function specialWheel(): WedgeView[] {
  const plain = syndicatedWheel();
  const wildCard: WedgeView = { ...plain[5], label: 'WILD CARD', effect: 'WILD_CARD' };
  const host = plain[16];
  const piece = (offset: number, overrides: Partial<WedgeView>): WedgeView => ({
    ...host,
    startSlot: host.startSlot + offset,
    slotCount: 1,
    ...overrides,
  });
  const bankrupt = { label: 'BANKRUPT', value: null, effect: 'BANKRUPT', backgroundColor: '#16171D', textColor: '#FFFFFF' };
  return [
    ...plain.slice(0, 5),
    wildCard,
    ...plain.slice(6, 16),
    piece(0, bankrupt),
    piece(1, { label: 'ONE MILLION', effect: 'MILLION', backgroundColor: '#0BA84A', textColor: '#FFFFFF' }),
    piece(2, bankrupt),
    ...plain.slice(17),
  ];
}

export function wheelSpin(overrides: Partial<WheelSpinView> = {}): WheelSpinView {
  return {
    spinId: 1,
    landingSlot: 4,
    durationMs: 6000,
    settlesAt: new Date(Date.now() + 6350).toISOString(),
    inMotion: true,
    ...overrides,
  };
}
